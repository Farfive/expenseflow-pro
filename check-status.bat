@echo off
title ExpenseFlow Pro - Status Check
color 0B

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - STATUS CHECK
echo ==========================================
echo.

echo [1/4] Checking Node.js processes...
tasklist | findstr node.exe
if %errorlevel% neq 0 (
    echo No Node.js processes running
) else (
    echo Node.js processes found
)
echo.

echo [2/4] Checking port usage...
echo Port 3000:
netstat -ano | findstr :3000
echo Port 4000:
netstat -ano | findstr :4000
echo Port 4001:
netstat -ano | findstr :4001
echo.

echo [3/4] Testing backend connectivity...
curl -s http://localhost:4001/api/health
if %errorlevel% equ 0 (
    echo ✅ Backend is responding on port 4001
) else (
    echo ❌ Backend is not responding on port 4001
)
echo.

echo [4/4] Testing frontend connectivity...
curl -s http://localhost:4000 >nul
if %errorlevel% equ 0 (
    echo ✅ Frontend is responding on port 4000
) else (
    echo ❌ Frontend is not responding on port 4000
)
echo.

echo ==========================================
echo           STATUS CHECK COMPLETE
echo ==========================================
echo.
pause 