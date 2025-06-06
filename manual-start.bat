@echo off
title ExpenseFlow Pro - Manual Startup Guide
color 0E

echo.
echo 🚀 ExpenseFlow Pro - Manual Startup Guide
echo =========================================
echo.
echo This guide will help you start the application manually.
echo Follow these steps in order:
echo.

echo 📋 STEP 1: Kill existing processes
echo ===================================
echo Run these commands to stop any existing servers:
echo.
echo   taskkill /F /IM node.exe
echo   taskkill /F /IM npm.exe
echo.
echo Press any key to run these commands...
pause >nul

taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
echo ✅ Processes killed
timeout /t 2 /nobreak >nul

echo.
echo 📋 STEP 2: Start Backend Server
echo ===============================
echo Opening a new window to start the backend...
echo The backend will run on: http://localhost:3002
echo.

start "ExpenseFlow Backend" cmd /c "title ExpenseFlow Backend && echo 🔧 Starting Backend Server... && echo ========================== && echo Backend URL: http://localhost:3002 && echo Health Check: http://localhost:3002/api/health && echo. && node working-server.js && echo. && echo Backend stopped. Press any key to close... && pause"

echo ✅ Backend window opened
echo.
echo 📋 STEP 3: Wait for Backend (30 seconds)
echo ========================================
echo Waiting for backend to initialize...

timeout /t 10 /nobreak >nul
echo ⏳ 20 seconds remaining...
timeout /t 10 /nobreak >nul
echo ⏳ 10 seconds remaining...
timeout /t 10 /nobreak >nul
echo ✅ Backend should be ready now

echo.
echo 📋 STEP 4: Start Frontend Server
echo ================================
echo Opening a new window to start the frontend...
echo The frontend will run on: http://localhost:3000
echo.

if exist "frontend\" (
    cd frontend
    echo ✅ Frontend directory found
    
    if not exist "node_modules\" (
        echo 📦 Installing dependencies first...
        echo This may take a few minutes...
        start "ExpenseFlow Frontend Setup" cmd /c "title ExpenseFlow Frontend Setup && echo 📦 Installing Frontend Dependencies... && echo ================================= && npm install && echo. && echo ✅ Dependencies installed! && echo Starting development server... && echo. && npm run dev && echo. && echo Frontend stopped. Press any key to close... && pause"
    ) else (
        echo ✅ Dependencies already installed
        start "ExpenseFlow Frontend" cmd /c "title ExpenseFlow Frontend && echo 🌐 Starting Frontend Server... && echo ========================== && echo Frontend URL: http://localhost:3000 && echo. && npm run dev && echo. && echo Frontend stopped. Press any key to close... && pause"
    )
    
    cd ..
) else (
    echo ❌ Frontend directory not found!
    echo Make sure you're running this from the correct directory.
)

echo.
echo 📋 STEP 5: Open Application
echo ===========================
echo Waiting for frontend to start...
timeout /t 15 /nobreak >nul

echo ✅ Opening application in browser...
start http://localhost:3002/api/health
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo 🎉 ExpenseFlow Pro Setup Complete!
echo ==================================
echo.
echo 📍 Application URLs:
echo    🌐 Frontend: http://localhost:3000
echo    🔧 Backend:  http://localhost:3002
echo    💚 Health:   http://localhost:3002/api/health
echo.
echo 🔑 Test Users:
echo    📧 Admin: test@expenseflow.com / password123
echo    📧 Employee: david.kim@techcorp.com / test123
echo    📧 Manager: jennifer.smith@techcorp.com / test123
echo.
echo 💡 Keep both server windows open while using the application
echo 🔄 To stop: Close the server windows or press Ctrl+C in them
echo.
echo 🆘 If you have issues:
echo    1. Check that Node.js is installed (node --version)
echo    2. Make sure npm is available (npm --version)
echo    3. Restart your computer if ports are stuck
echo    4. Check STARTUP_INSTRUCTIONS.md for detailed help
echo.

pause 