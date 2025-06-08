@echo off
cls
echo ================================================
echo FIXED STARTUP - WITH WORKING NEXT.JS CONFIG
echo ================================================

echo.
echo [1/5] Killing all existing processes...
taskkill /F /IM node.exe 2>nul >nul
timeout /t 3 /nobreak >nul

echo.
echo [2/5] Starting backend...
start "ExpenseFlow Backend" cmd /k "echo [BACKEND] Starting ExpenseFlow Backend... && node simple-server.js"

echo.
echo [3/5] Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo.
echo [4/5] Applying WORKING Next.js configuration...
cd frontend
if exist next.config.working.js (
    copy next.config.working.js next.config.js >nul 2>&1
    echo ✅ Working config applied (with appDir support)
) else (
    echo ❌ Working config not found
    pause
    exit
)

echo.
echo [5/5] Starting frontend with working configuration...
echo Setting environment variables...
set NEXT_TELEMETRY_DISABLED=1
set TURBO_TELEMETRY_DISABLED=1
set NODE_OPTIONS=--max-old-space-size=4096

echo.
echo ================================================
echo Starting Frontend Development Server...
echo ================================================
echo.
echo This should now detect the pages properly!
echo Watch for "compiled successfully" message.
echo.

npm run dev

echo.
echo [ERROR] Frontend exited unexpectedly
pause 