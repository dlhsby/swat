@echo off
setlocal enabledelayedexpansion
:: ============================================================
::  Exact row count per table from the LIVE DB (ground truth).
::  Run on the server. Writes dump\_counts_live.txt as: table<TAB>count
::  Compare these to your dump (the big tables will be MUCH higher
::  than phpMyAdmin's estimate - that's expected; estimates lie).
:: ============================================================

:: ----- EDIT IF NEEDED -----
set "MYSQL_BIN=C:\xampp\mysql\bin"
set "DB=dkp_swat"
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

if not exist "%OUT%" mkdir "%OUT%"

"%MYSQL%" %CREDS% -N -B -e "SHOW TABLES" %DB% > "%OUT%\_tables.txt" 2>"%OUT%\_err.txt"
if errorlevel 1 ( echo CONNECTION FAILED: & type "%OUT%\_err.txt" & goto :end )

if exist "%OUT%\_counts_live.txt" del "%OUT%\_counts_live.txt"
echo Counting (exact COUNT(*) - big tables take a moment each) ...
for /f "usebackq delims=" %%T in ("%OUT%\_tables.txt") do call :count "%%T"

echo(
echo === Exact live counts -^> %OUT%\_counts_live.txt ===
type "%OUT%\_counts_live.txt"
goto :end

:count
set "T=%~1"
for /f "usebackq delims=" %%N in (`"%MYSQL%" %CREDS% -N -B -e "SELECT COUNT(*) FROM %T%" %DB%`) do (
  echo %%T	%%N
  >> "%OUT%\_counts_live.txt" echo %T%	%%N
)
goto :eof

:end
echo(
pause
endlocal
