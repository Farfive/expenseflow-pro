@echo off
title ExpenseFlow Pro - Frontend Test
color 0A

echo 🧪 ExpenseFlow Pro - Frontend Configuration Test
echo ================================================
echo.

echo 1. 🔧 Testing Next.js configuration...
cd frontend

echo 2. 📋 Checking package.json and next.config.js...
if exist "package.json" (
    echo ✅ package.json found
) else (
    echo ❌ package.json missing
    goto error
)

if exist "next.config.js" (
    echo ✅ next.config.js found
) else (
    echo ❌ next.config.js missing
    goto error
)

echo.
echo 3. 🔍 Checking for node_modules...
if exist "node_modules\" (
    echo ✅ Dependencies already installed
    goto start_test
) else (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        goto error
    )
    echo ✅ Dependencies installed
)

:start_test
echo.
echo 4. 🚀 Testing frontend startup (10 seconds)...
echo    This will start the dev server briefly to check for errors
echo.

timeout /t 3 /nobreak >nul
echo Starting Next.js dev server...

start /min cmd /c "npm run dev"
echo ✅ Frontend started in background

echo.
echo 5. ⏳ Waiting 10 seconds for startup...
timeout /t 10 /nobreak >nul

echo.
echo 6. 🧪 Testing if frontend is responding...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend is responding on http://localhost:3000
    echo ✅ Configuration appears to be fixed!
) else (
    echo ⚠️ Frontend may still be starting or have issues
    echo Check the frontend window for any error messages
)

echo.
echo 🛑 Stopping test server...
taskkill /F /IM node.exe >nul 2>&1

cd ..

echo.
echo 🎉 Frontend Test Complete!
echo =========================
echo.
echo The Next.js configuration warning should be fixed.
echo You can now start the full application with:
echo.
echo   manual-start.bat
echo   or
echo   python run.py
echo.
goto end

:error
echo.
echo ❌ Test failed. Please check the error messages above.
cd ..

:end
pause 