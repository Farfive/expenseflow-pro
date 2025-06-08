@echo off
echo ================================================
echo QUICK DIAGNOSTIC - REAL TIME LOGGING
echo ================================================

echo.
echo [DIAGNOSTIC] Checking environment...
echo Current Directory: %cd%
echo Node Version:
node --version

echo.
echo [DIAGNOSTIC] Checking required files...
if exist simple-server.js (
    echo ✅ simple-server.js found
) else (
    echo ❌ simple-server.js missing
)

if exist frontend\package.json (
    echo ✅ frontend\package.json found
) else (
    echo ❌ frontend\package.json missing
)

echo.
echo [DIAGNOSTIC] Killing existing processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [DIAGNOSTIC] Starting backend with logging...
echo ================================================
start "Backend Diagnostic" cmd /k "echo [BACKEND] Starting... && node simple-server.js"

echo.
echo [DIAGNOSTIC] Waiting 5 seconds for backend...
timeout /t 5 /nobreak

echo.
echo [DIAGNOSTIC] Testing backend connection...
curl -s http://localhost:3002 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is responding
) else (
    echo ❌ Backend not responding
)

echo.
echo [DIAGNOSTIC] Applying simple frontend config...
cd frontend
if exist next.config.simple.js (
    copy next.config.simple.js next.config.js >nul 2>&1
    echo ✅ Simple config applied
) else (
    echo ❌ Simple config not found
)

echo.
echo [DIAGNOSTIC] Starting frontend with maximum logging...
echo ================================================
echo Setting environment variables...
set NEXT_TELEMETRY_DISABLED=1
set TURBO_TELEMETRY_DISABLED=1
set DEBUG=next:*
set NODE_OPTIONS=--max-old-space-size=4096

echo.
echo Starting npm run dev...
npm run dev

echo.
echo [DIAGNOSTIC] If you see this, frontend exited
pause 