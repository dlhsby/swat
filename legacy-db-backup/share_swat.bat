@echo off
setlocal
:: Run on the SERVER (elevated) after the backup completes.
:: Publishes the dump folder read-only as \\<server>\swatbak
set "OUT=%~dp0dump"

if not exist "%OUT%" ( echo No dump folder at "%OUT%". Run the backup first. & goto :end )

net share swatbak >nul 2>&1 && net share swatbak /delete >nul 2>&1
net share swatbak="%OUT%" /grant:Everyone,READ /remark:"SWAT legacy DB backup (read-only)"

echo(
echo Shared. From the laptop, pull with:
echo    fetch_swat.bat ^<this-server-IP^>
echo(
echo This server's IPv4 address:
ipconfig | findstr /I "IPv4"
echo(
echo When the transfer is verified, REMOVE the share with:
echo    net share swatbak /delete
:end
echo(
pause
endlocal
