@echo off
title 🚀 Fresh ExpenseFlow Pro Startup
cls

echo.
echo 🚀🚀🚀 FRESH STARTUP - ExpenseFlow Pro 🚀🚀🚀
echo ================================================
echo.

:: Clean up any existing processes
echo 🧹 Cleaning up existing processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1

:: Wait a moment
timeout /t 2 >nul

echo.
echo 🚀 Starting Fresh Backend Server (Port 8000)...
start "ExpenseFlow Backend" cmd /k "node fresh-server.js"

:: Wait for backend to start
echo ⏳ Waiting for backend to initialize...
timeout /t 5 >nul

echo.
echo 🚀 Starting Frontend Server (Port 3000)...
cd frontend
start "ExpenseFlow Frontend" cmd /k "set NEXT_PUBLIC_API_URL=http://localhost:8000 && npm run dev"

echo.
echo 🎯 Opening Dashboard in Browser...
timeout /t 8 >nul
start "" "http://localhost:3000/dashboard"

echo.
echo ✅ ============================================
echo ✅ ExpenseFlow Pro is Starting!
echo ✅ ============================================
echo ✅ Backend:   http://localhost:8000
echo ✅ Frontend:  http://localhost:3000  
echo ✅ Dashboard: http://localhost:3000/dashboard
echo ✅ 
echo ✅ Demo Login: demo@expenseflow.com / demo123
echo ✅ ============================================
echo.
echo Press any key to exit this startup script...
pause >nul 