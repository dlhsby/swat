@echo off
setlocal
:: ============================================================
::  SWAT legacy DB backup - per-table dump + gzip + checksum
::  Target server: Windows Server 2008 SP2 / PowerShell 2.0
::  Run from an ELEVATED cmd.exe (you are Administrator).
::  Place this .bat (and 7za.exe) in any folder with free disk.
:: ============================================================

:: ----- EDIT THESE FOUR LINES TO MATCH YOUR SERVER -----
set "MYSQL_BIN=C:\xampp\mysql\bin"
set "SEVENZIP=%~dp07za.exe"
set "DB=dkp_swat"
set "DBUSER=AdminDKP"
:: ------------------------------------------------------

set "OUT=%~dp0dump"

echo(
echo === SWAT legacy backup ===
echo MySQL bin : %MYSQL_BIN%
echo 7za       : %SEVENZIP%
echo Database  : %DB%
echo Output    : %OUT%
echo(

if not exist "%MYSQL_BIN%\mysqldump.exe" (
  echo ERROR: mysqldump.exe not found in "%MYSQL_BIN%".
  echo Find it, then edit MYSQL_BIN at the top of this script:
  echo    dir /s /b C:\*mysqldump.exe
  goto :end
)
if not exist "%SEVENZIP%" (
  echo ERROR: 7za.exe not found at "%SEVENZIP%".
  echo Download "7-Zip Extra" and drop 7za.exe next to this script,
  echo OR use backup_swat_makecab.bat ^(no download needed^).
  goto :end
)

set /p "DBPASS=Enter MySQL password for %DBUSER%: "

if not exist "%OUT%" mkdir "%OUT%"
if exist "%OUT%\manifest.sha1" del "%OUT%\manifest.sha1"

echo Listing tables...
"%MYSQL_BIN%\mysql.exe" -u%DBUSER% -p%DBPASS% -N -B -e "SHOW TABLES" %DB% > "%OUT%\_tables.txt" 2>"%OUT%\_err.txt"
if errorlevel 1 (
  echo ERROR: could not connect / list tables. Details:
  type "%OUT%\_err.txt"
  goto :end
)

for /f "usebackq delims=" %%T in ("%OUT%\_tables.txt") do call :dump_table "%%T"

echo(
echo Dumping routines / triggers / events (schema-level objects)...
"%MYSQL_BIN%\mysqldump.exe" -u%DBUSER% -p%DBPASS% --no-create-info --no-data --routines --events --triggers --skip-opt %DB% > "%OUT%\_routines.sql"
"%SEVENZIP%" a -tgzip -mx=6 "%OUT%\_routines.sql.gz" "%OUT%\_routines.sql" >nul
del "%OUT%\_routines.sql"
call :hash_file "_routines.sql.gz"

echo(
echo === DONE ===
dir /b "%OUT%\*.gz"
echo(
echo Checksums written to: "%OUT%\manifest.sha1"
echo Next: run share_swat.bat here, then pull from the laptop with fetch_swat.bat.
goto :end

:dump_table
set "T=%~1"
if "%T%"=="" goto :eof
echo   dumping %T% ...
"%MYSQL_BIN%\mysqldump.exe" -u%DBUSER% -p%DBPASS% --single-transaction --quick --hex-blob --default-character-set=utf8 %DB% "%T%" > "%OUT%\%T%.sql"
if errorlevel 1 ( echo   !! mysqldump FAILED on %T% & goto :eof )
"%SEVENZIP%" a -tgzip -mx=6 "%OUT%\%T%.sql.gz" "%OUT%\%T%.sql" >nul
if errorlevel 1 ( echo   !! gzip FAILED on %T% & goto :eof )
del "%OUT%\%T%.sql"
call :hash_file "%T%.sql.gz"
goto :eof

:hash_file
set "F=%~1"
set "HH="
for /f "skip=1 delims=" %%H in ('certutil -hashfile "%OUT%\%F%" SHA1') do if not defined HH set "HH=%%H"
set "HH=%HH: =%"
>> "%OUT%\manifest.sha1" echo %HH% *%F%
goto :eof

:end
echo(
pause
endlocal
