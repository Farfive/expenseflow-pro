@echo off
echo ================================================
echo TESTING FRONTEND ONLY - DIAGNOSTIC MODE
echo ================================================

cd frontend

echo.
echo Current directory: %cd%
echo.

echo Checking package.json...
if exist package.json (
    echo ✅ package.json found
) else (
    echo ❌ package.json NOT found
    pause
    exit
)

echo.
echo Checking node_modules...
if exist node_modules (
    echo ✅ node_modules found
) else (
    echo ❌ node_modules NOT found - running npm install...
    npm install
)

echo.
echo Using simple Next.js config...
if exist next.config.simple.js (
    copy next.config.simple.js next.config.js >nul
    echo ✅ Simple config applied
) else (
    echo ❌ Simple config not found
)

echo.
echo Setting environment variables...
set NEXT_TELEMETRY_DISABLED=1
set TURBO_TELEMETRY_DISABLED=1
set NODE_OPTIONS=--max-old-space-size=4096

echo.
echo ================================================
echo STARTING FRONTEND IN DIAGNOSTIC MODE
echo ================================================
echo.

npm run dev 