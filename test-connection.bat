@echo off
title 🧪 ExpenseFlow Pro Connection Test
cls

echo.
echo 🧪 Testing ExpenseFlow Pro Connections
echo =======================================
echo.

echo 🔍 Testing Backend (Port 8000)...
curl -s http://localhost:8000/api/health
if %errorlevel% equ 0 (
    echo ✅ Backend is responding!
) else (
    echo ❌ Backend is not responding!
)

echo.
echo 🔍 Testing Frontend (Port 3000)...
curl -s http://localhost:3000 >nul
if %errorlevel% equ 0 (
    echo ✅ Frontend is responding!
) else (
    echo ❌ Frontend is not responding!
)

echo.
echo 🔍 Testing Demo Login...
curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"demo@expenseflow.com\",\"password\":\"demo123\"}" http://localhost:8000/api/auth/login
echo.

echo.
echo 🎯 Opening Dashboard...
start "" "http://localhost:3000/dashboard"

echo.
echo ========================================
echo Test completed! Check your browser.
echo ========================================
pause 