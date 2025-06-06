@echo off
echo Opening ExpenseFlow Pro temporary interface...
echo.
echo Backend should be running on: http://localhost:3002
echo Next.js frontend starting on: http://localhost:3000
echo Temporary interface opening now...
echo.

:: Open the temporary HTML file
start "" "%~dp0simple-frontend.html"

echo.
echo ✅ Temporary interface opened!
echo This will automatically detect when Next.js is ready.
echo.
pause 