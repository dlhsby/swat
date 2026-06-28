@echo off
setlocal enabledelayedexpansion
:: ============================================================
::  SWAT legacy DB backup (dkp_swat) - run on the SERVER via RDP.
::
::  USAGE:
::    backup_swat.bat            FULL backup, NO year split (each table
::                               one file) - the simple default
::    backup_swat.bat split      FULL backup, big tables split per year
::    backup_swat.bat 2026       master tables + only the 2026 slice of
::                               the big tables (no structure)
::    backup_swat.bat current    same, for the current year
::
::  Year/split bucketing uses the REALISASI date fields (see config
::  below). Rows whose date is NULL/0000/orphan go to <table>.others.sql
::  so nothing is ever dropped.
::
::  Output (dump\ folder):
::    _structure.sql      DROP+CREATE all tables + procedures/functions/
::                        triggers/events  (not written in a year run)
::    <table>.sql         data per table (whole table unless split)
::    <table>.<year>.sql  data per year for big tables (split/year modes)
::    <table>.others.sql  rows with no/zero/orphan date
::    _rowcounts.txt      per-table row + size reference
:: ============================================================

:: ----- EDIT IF NEEDED -----
set "MYSQL_BIN=C:\xampp\mysql\bin"
set "DB=dkp_swat"
set "COMPRESS=1"
set "SEVENZIP=C:\Program Files\7-Zip\7z.exe"
:: COMPRESS=1 gzips each file (needs 7-Zip) -> smaller FileZilla transfer.
:: Set COMPRESS=0 for plain .sql you can open/inspect directly.
:: --------------------------

:: Big tables that get split per year (only in split/year modes):
set "SPLIT_TABLES= trayek detailtransaksiangkutsampah jatahkitir transaksiangkutsampah dokumentasitrayek "

set "OUT=%~dp0dump"
set "DUMP=%MYSQL_BIN%\mysqldump.exe"
set "MYSQL=%MYSQL_BIN%\mysql.exe"
set "DOPTS=--no-create-info --skip-triggers --single-transaction --quick --hex-blob --replace --no-tablespaces --default-character-set=latin1"

if not exist "%DUMP%" (
  echo ERROR: mysqldump.exe not found in "%MYSQL_BIN%".
  echo Locate it with:  dir /s /b C:\*mysqldump.exe
  goto :end
)
if "%COMPRESS%"=="1" if not exist "%SEVENZIP%" echo NOTE: 7-Zip not found at "%SEVENZIP%" - output stays plain .sql.

:: ---- classify argument ----
set "ARG=%~1"
if /i "%ARG%"=="full" set "ARG="
set "SPLIT=0"
set "ONLYYEAR="
set "WANTCURRENT="
if /i "%ARG%"=="split"   set "SPLIT=1"
if /i "%ARG%"=="current" ( set "SPLIT=1" & set "WANTCURRENT=1" )
if not "%ARG%"=="" if /i not "%ARG%"=="split" if /i not "%ARG%"=="current" ( set "SPLIT=1" & set "ONLYYEAR=%ARG%" )

set "DBUSER=root"
set /p "DBUSER=MySQL user [root]: "
if "%DBUSER%"=="" set "DBUSER=root"
set /p "DBPASS=Password for %DBUSER% (XAMPP root is blank - press Enter): "
set "CREDS=-u%DBUSER%"
if defined DBPASS set "CREDS=-u%DBUSER% -p%DBPASS%"

if defined WANTCURRENT for /f "usebackq delims=" %%Y in (`"%MYSQL%" %CREDS% -N -B -e "SELECT YEAR(CURDATE())"`) do set "ONLYYEAR=%%Y"

echo(
if "%SPLIT%"=="0"      echo MODE: FULL - no per-year split
if defined ONLYYEAR    echo MODE: YEAR !ONLYYEAR! - structure NOT dumped
if "%SPLIT%"=="1" if not defined ONLYYEAR echo MODE: SPLIT - all years

if not exist "%OUT%" mkdir "%OUT%"

echo(
echo === Listing tables / testing connection ===
"%MYSQL%" %CREDS% -N -B -e "SHOW TABLES" %DB% > "%OUT%\_tables.txt" 2>"%OUT%\_err.txt"
if errorlevel 1 ( echo CONNECTION FAILED: & type "%OUT%\_err.txt" & goto :end )
for /f %%C in ('type "%OUT%\_tables.txt" ^| find /c /v ""') do echo Found %%C tables.

echo === Row/size reference -^> _rowcounts.txt ===
"%MYSQL%" %CREDS% -N -B -e "SELECT TABLE_NAME, TABLE_ROWS, ROUND(DATA_LENGTH/1048576,1) AS data_mb FROM information_schema.tables WHERE table_schema='%DB%' ORDER BY DATA_LENGTH DESC" %DB% > "%OUT%\_rowcounts.txt"

:: ---- structure (skip in year mode) ----
if defined ONLYYEAR goto :skip_structure
echo(
echo === 1. STRUCTURE ===
"%DUMP%" %CREDS% --no-data --routines --events --triggers --no-tablespaces --default-character-set=latin1 --databases %DB% > "%OUT%\_structure.sql"
if errorlevel 1 ( echo STRUCTURE dump FAILED & goto :end )
call :compress "_structure.sql"
:skip_structure

echo(
echo === 2. DATA per table ===
for /f "usebackq delims=" %%T in ("%OUT%\_tables.txt") do call :route_table "%%T"

if not "%SPLIT%"=="1" goto :done
echo(
echo === 3. DATA per year for big tables ===
::  table  ->  REALISASI date field
call :split_self trayek                      TRAYEK_WAKTUREALISASI
call :split_self detailtransaksiangkutsampah DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG
call :split_self jatahkitir                  JATAHKITIR_WAKTUDITERBITKAN
::  child -> via parent's REALISASI/date field
call :split_parent transaksiangkutsampah HARITRANSAKSI_ID haritransaksi HARITRANSAKSI_ID HARITRANSAKSI_TANGGAL
call :split_parent dokumentasitrayek     TRAYEK_ID        trayek        TRAYEK_ID        TRAYEK_WAKTUREALISASI

:done
echo(
echo === DONE ===  Files in: %OUT%
goto :end


:: ---------- decide whole-table vs split ----------
:route_table
set "T=%~1"
if not "%SPLIT%"=="1" ( call :dump_full "%T%" & goto :eof )
echo %SPLIT_TABLES%| find /i " %T% " >nul
if errorlevel 1 ( call :dump_full "%T%" ) else ( echo   [%T%] -^> yearly split, see step 3 )
goto :eof

:: ---------- dump a whole table ----------
:dump_full
set "T=%~1"
echo   data %T% ...
"%DUMP%" %CREDS% %DOPTS% %DB% %T% > "%OUT%\%T%.sql"
if errorlevel 1 ( echo   !! FAILED %T% & goto :eof )
call :compress "%T%.sql"
goto :eof

:: ---------- split a self-dated table by year ----------
:split_self
set "T=%~1"
set "C=%~2"
if defined ONLYYEAR (
  echo   %T% year !ONLYYEAR! ...
  call :dump_where "%T%" "%T%.!ONLYYEAR!" "YEAR(%C%)=!ONLYYEAR!"
  goto :eof
)
echo   %T% by year of %C% ...
for /f "usebackq delims=" %%Y in (`"%MYSQL%" %CREDS% -N -B -e "SELECT DISTINCT YEAR(%C%) FROM %T% WHERE %C% IS NOT NULL AND YEAR(%C%) NOT IN (0) ORDER BY 1" %DB%`) do call :dump_where "%T%" "%T%.%%Y" "YEAR(%C%)=%%Y"
call :dump_where "%T%" "%T%.others" "%C% IS NULL OR YEAR(%C%) IN (0)"
goto :eof

:: ---------- split a child table by its parent's year ----------
:split_parent
set "T=%~1"
set "FK=%~2"
set "P=%~3"
set "PK=%~4"
set "PD=%~5"
if defined ONLYYEAR (
  echo   %T% year !ONLYYEAR! via %P% ...
  call :dump_where "%T%" "%T%.!ONLYYEAR!" "%FK% IN (SELECT %PK% FROM %P% WHERE YEAR(%PD%)=!ONLYYEAR!)"
  goto :eof
)
echo   %T% by year of %P%.%PD% ...
for /f "usebackq delims=" %%Y in (`"%MYSQL%" %CREDS% -N -B -e "SELECT DISTINCT YEAR(p.%PD%) FROM %T% c JOIN %P% p ON c.%FK%=p.%PK% WHERE p.%PD% IS NOT NULL AND YEAR(p.%PD%) NOT IN (0) ORDER BY 1" %DB%`) do call :dump_where "%T%" "%T%.%%Y" "%FK% IN (SELECT %PK% FROM %P% WHERE YEAR(%PD%)=%%Y)"
call :dump_where "%T%" "%T%.others" "%FK% NOT IN (SELECT %PK% FROM %P% WHERE %PD% IS NOT NULL AND YEAR(%PD%) NOT IN (0))"
goto :eof

:: ---------- dump rows matching a WHERE into a named file ----------
:dump_where
set "T=%~1"
set "NAME=%~2"
set "W=%~3"
echo     - %NAME%.sql
"%DUMP%" %CREDS% %DOPTS% --where="%W%" %DB% %T% > "%OUT%\%NAME%.sql"
if errorlevel 1 ( echo     !! FAILED %NAME% & goto :eof )
call :compress "%NAME%.sql"
goto :eof

:: ---------- optional gzip ----------
:compress
if not "%COMPRESS%"=="1" goto :eof
if not exist "%SEVENZIP%" goto :eof
"%SEVENZIP%" a -tgzip -mx=6 "%OUT%\%~1.gz" "%OUT%\%~1" >nul && del "%OUT%\%~1"
goto :eof

:end
echo(
pause
endlocal
