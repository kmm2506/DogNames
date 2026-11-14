@echo off
ECHO Set working directory
cd /d %~dp0
ECHO Deleting existing combined file
del dogs.csv
setlocal
for %%i in (partial/*.csv) do set /P "header=" < "partial/%%i" & goto continue
:continue

(
   echo %header%
   for %%i in (partial/*.csv) do (
      for /f "usebackq skip=1 delims=" %%j in ("partial/%%i") do echo %%j
   )
) > dogs.csv
