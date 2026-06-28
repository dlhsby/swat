@echo off
setlocal
:: ============================================================
::  Restore SWAT legacy dump produced by backup_swat.bat.
::  Handles both plain .sql and gzipped .sql.gz files.
::
::  Full restore (structure, then every data file):
::      restore_swat.bat
::
::  Restore ONE file only (e.g. just this year - REPLACE INTO, so it
::  overwrites matching rows without touching other years):
::      restore_swat.bat dump\trayek.2026.sql
::      restore_swat.bat dump\trayek.2026.sql.gz
:: ============================================================

:: ----- EDIT IF NEEDED -----
set "MYSQL_BIN=C:\xampp\mysql\bin"
set "DB=dkp_swat"
set "SEVENZIP=C:\Program Files\7-Zip\7z.exe"
:: --------------------------
set "OUT=%~dp0dump"
set "MYSQL=%MYSQL_BIN%\mysql.exe"

if not exist "%MYSQL%" ( echo ERROR: mysql.exe not found in "%MYSQL_BIN%". & goto :end )

set "DBUSER=root"
set /p "DBUSER=MySQL user [root]: "
if "%DBUSER%"=="" set "DBUSER=root"
set /p "DBPASS=Password for %DBUSER% (blank - press Enter): "
set "CREDS=-u%DBUSER%"
if defined DBPASS set "CREDS=-u%DBUSER% -p%DBPASS%"

:: ---- single-file mode ----
if not "%~1"=="" (
  call :loadfile "%~1" "%DB%"
  echo Done.
  goto :end
)

:: ---- full restore ----
echo(
echo This DROPs and recreates every table from _structure.sql, then
echo loads all data files. Existing data in %DB% will be replaced.
set /p "OK=Type YES to continue: "
if /i not "%OK%"=="YES" ( echo Aborted. & goto :end )

echo === Restoring structure ===
if exist "%OUT%\_structure.sql"    call :loadfile "%OUT%\_structure.sql" ""
if exist "%OUT%\_structure.sql.gz" call :loadfile "%OUT%\_structure.sql.gz" ""

echo === Restoring data ===
for %%F in ("%OUT%\*.sql" "%OUT%\*.sql.gz") do (
  echo %%~nxF | find /i "_structure." >nul
  if errorlevel 1 call :loadfile "%%F" "%DB%"
)

echo(
echo === DONE ===
goto :end

:: ---------- load one file (plain or .gz) ----------
:loadfile
set "F=%~1"
set "TARGET=%~2"
echo   loading %~nx1 ...
echo %F% | find /i ".gz" >nul
if errorlevel 1 (
  "%MYSQL%" %CREDS% %TARGET% < "%F%"
) else (
  "%SEVENZIP%" e -so "%F%" 2>nul | "%MYSQL%" %CREDS% %TARGET%
)
if errorlevel 1 echo   !! FAILED %~nx1
goto :eof

:end
echo(
pause
endlocal
