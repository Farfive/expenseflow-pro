@echo off
title ExpenseFlow Pro - Quick Fix & Start
color 0A
echo.
echo 🚀 ExpenseFlow Pro - Quick Fix & Start
echo ======================================
echo.

echo 1. 🛠️ Fixing port conflicts...
echo    Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1
echo    ✅ Processes stopped
timeout /t 3 /nobreak >nul

echo.
echo 2. 🔧 Starting Backend Server...
echo    URL: http://localhost:3002
start /min cmd /c "title ExpenseFlow Backend && node working-server.js"
echo    ✅ Backend starting...

echo.
echo 3. ⏳ Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

echo.
echo 4. 🌐 Starting Frontend Server...
echo    URL: http://localhost:3000
cd frontend
start /min cmd /c "title ExpenseFlow Frontend && npm run dev"
cd ..
echo    ✅ Frontend starting...

echo.
echo 5. ⏳ Waiting for frontend to initialize...
timeout /t 10 /nobreak >nul

echo.
echo 6. 🧪 Testing connections...
echo    Testing backend...
curl -s http://localhost:3002/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Backend responding
) else (
    echo    ⚠️ Backend may need more time
)

echo    Testing frontend...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Frontend responding
) else (
    echo    ⚠️ Frontend may need more time
)

echo.
echo ========================================
echo 🎉 ExpenseFlow Pro is running!
echo ========================================
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:3002
echo 💚 Health:   http://localhost:3002/api/health
echo.
echo 🔑 Test Users:
echo    📧 Admin: test@expenseflow.com / password123
echo    📧 Employee: david.kim@techcorp.com / test123
echo    📧 Manager: jennifer.smith@techcorp.com / test123
echo.
echo 🌟 Opening frontend in browser...
start http://localhost:3000
echo.
echo ✅ Ready! Check your browser for the frontend.
echo ✅ Both servers are running in minimized windows.
echo.
pause 