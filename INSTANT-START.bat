@echo off
title ⚡ INSTANT ExpenseFlow Pro
cls

echo.
echo ⚡⚡⚡ INSTANT STARTUP - ExpenseFlow Pro ⚡⚡⚡
echo ================================================
echo.

:: Clean processes super fast
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1

:: Start backend immediately
start /B cmd /c "node working-server.js"

:: Open the INSTANT temporary interface immediately (no waiting!)
echo 🚀 Opening INSTANT interface...
start "" "%~dp0simple-frontend.html"

:: Start Next.js in background (for later)
echo ⚡ Starting optimized Next.js in background...
if exist frontend\.next rmdir /S /Q frontend\.next >nul 2>&1
start /MIN cmd /c "cd frontend && set NODE_OPTIONS=--max-old-space-size=4096 && npm run dev"

echo.
echo ✅ INSTANT ACCESS READY!
echo.
echo 📱 Your temporary interface is already open!
echo 🔄 Next.js will be ready in ~30 seconds
echo 🎯 The temp interface auto-detects when Next.js is ready
echo.
echo Press any key to exit...
pause >nul 