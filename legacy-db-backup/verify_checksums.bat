@echo off
setlocal enabledelayedexpansion
:: Run on the LAPTOP inside the folder that holds the .gz/.cab files
:: AND manifest.sha1 (i.e. the 'downloaded' folder).

if not exist manifest.sha1 ( echo manifest.sha1 not found in this folder. & exit /b 1 )

set /a OK=0, BAD=0, MISS=0
for /f "usebackq tokens=1*" %%A in ("manifest.sha1") do (
  set "want=%%A"
  set "fn=%%B"
  set "fn=!fn:~1!"
  if not exist "!fn!" (
    echo MISSING  !fn!
    set /a MISS+=1
  ) else (
    set "got="
    for /f "skip=1 delims=" %%H in ('certutil -hashfile "!fn!" SHA1') do if not defined got set "got=%%H"
    set "got=!got: =!"
    if /i "!got!"=="!want!" ( echo OK       !fn! & set /a OK+=1 ) else ( echo BAD      !fn! & set /a BAD+=1 )
  )
)
echo(
echo Result:  !OK! OK   !BAD! BAD   !MISS! MISSING
if !BAD! gtr 0 echo Re-pull the BAD files ^(re-run fetch_swat.bat^) and verify again.
if !MISS! gtr 0 echo Re-pull the MISSING files.
endlocal
