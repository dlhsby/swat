@echo off
setlocal
:: ============================================================
::  FALLBACK backup - same as backup_swat.bat but compresses
::  with makecab (built into Windows, no 7za download needed).
::  Output is per-table .cab instead of .gz.
::  Decompress on Windows with:  expand file.sql.cab file.sql
::  On Linux/Mac:  cabextract file.sql.cab
:: ============================================================

:: ----- EDIT THESE -----
set "MYSQL_BIN=C:\xampp\mysql\bin"
set "DB=dkp_swat"
set "DBUSER=AdminDKP"
:: ----------------------

set "OUT=%~dp0dump"

if not exist "%MYSQL_BIN%\mysqldump.exe" (
  echo ERROR: mysqldump.exe not found in "%MYSQL_BIN%". Edit MYSQL_BIN.
  goto :end
)

set /p "DBPASS=Enter MySQL password for %DBUSER%: "
if not exist "%OUT%" mkdir "%OUT%"
if exist "%OUT%\manifest.sha1" del "%OUT%\manifest.sha1"

echo Listing tables...
"%MYSQL_BIN%\mysql.exe" -u%DBUSER% -p%DBPASS% -N -B -e "SHOW TABLES" %DB% > "%OUT%\_tables.txt" 2>"%OUT%\_err.txt"
if errorlevel 1 ( echo ERROR connecting: & type "%OUT%\_err.txt" & goto :end )

for /f "usebackq delims=" %%T in ("%OUT%\_tables.txt") do call :dump_table "%%T"

echo(
echo === DONE ===
dir /b "%OUT%\*.cab"
echo Checksums: "%OUT%\manifest.sha1"
goto :end

:dump_table
set "T=%~1"
if "%T%"=="" goto :eof
echo   dumping %T% ...
"%MYSQL_BIN%\mysqldump.exe" -u%DBUSER% -p%DBPASS% --single-transaction --quick --hex-blob --default-character-set=utf8 %DB% "%T%" > "%OUT%\%T%.sql"
if errorlevel 1 ( echo   !! FAILED on %T% & goto :eof )
makecab "%OUT%\%T%.sql" "%OUT%\%T%.sql.cab" >nul
if errorlevel 1 ( echo   !! makecab FAILED on %T% & goto :eof )
del "%OUT%\%T%.sql"
call :hash_file "%T%.sql.cab"
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
