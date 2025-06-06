@echo off
title ExpenseFlow Pro - Python Launcher
color 0A

echo 🚀 ExpenseFlow Pro - Python Launcher
echo =====================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found! Please install Python first.
    echo    Download from: https://python.org
    pause
    exit /b 1
)

echo ✅ Python is available

REM Try to run the Python script
echo.
echo 🔄 Starting ExpenseFlow Pro...
echo.

python run.py

REM If that fails, try the direct script
if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Trying alternative startup method...
    echo.
    python start_expenseflow.py
)

echo.
echo 👋 ExpenseFlow Pro Python launcher finished
pause 