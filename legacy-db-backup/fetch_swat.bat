@echo off
setlocal
:: Run on the LAPTOP (Windows). Pulls the shared dump with RESUME.
:: Usage:  fetch_swat.bat <SERVER_IP>
:: Safe to re-run after a WiFi drop - it skips finished files and
:: continues partial ones (/Z = restartable mode).

if "%~1"=="" ( echo Usage: fetch_swat.bat ^<SERVER_IP^> & exit /b 1 )
set "SRV=%~1"
set "DEST=%~dp0downloaded"
if not exist "%DEST%" mkdir "%DEST%"

robocopy \\%SRV%\swatbak "%DEST%" *.gz *.cab manifest.sha1 /Z /R:5 /W:5 /TEE /NP /NDL /LOG+:"%DEST%\copy.log"

echo(
echo robocopy exit code %ERRORLEVEL% ^(0-7 = success; 8+ = error^).
echo If WiFi dropped, just run this exact command again - it resumes.
echo Then verify with verify_checksums.bat inside the 'downloaded' folder.
endlocal
