@echo off
echo ================================================
echo KILLING ALL NODE.JS PROCESSES
echo ================================================

echo.
echo Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul  
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq ExpenseFlow*" 2>nul

echo.
echo Waiting 3 seconds for processes to close...
timeout /t 3 /nobreak >nul

echo.
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Killing process on port 3000: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Checking port 3002...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002') do (
    echo Killing process on port 3002: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo ================================================
echo ALL PROCESSES KILLED - PORTS SHOULD BE FREE
echo ================================================
pause 