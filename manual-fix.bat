@echo off
echo 🔧 ExpenseFlow Pro - Manual Fix Script
echo ======================================
echo.

echo 🛑 Step 1: Killing existing Node.js processes...
taskkill /f /im node.exe /t >nul 2>&1
if %errorlevel%==0 (
    echo ✅ Killed existing Node.js processes
) else (
    echo ℹ️  No Node.js processes to kill
)
echo.

echo 🧹 Step 2: Cleaning frontend build cache...
if exist "frontend\.next" (
    rmdir /s /q "frontend\.next"
    echo ✅ Removed .next directory
) else (
    echo ℹ️  .next directory not found
)

if exist "frontend\.turbo" (
    rmdir /s /q "frontend\.turbo"
    echo ✅ Removed .turbo directory
) else (
    echo ℹ️  .turbo directory not found
)

if exist "frontend\out" (
    rmdir /s /q "frontend\out"
    echo ✅ Removed out directory
) else (
    echo ℹ️  out directory not found
)
echo.

echo ⚙️  Step 3: Creating environment file...
(
echo # ExpenseFlow Pro - Safe Environment
echo NEXT_PUBLIC_API_URL=http://localhost:3002
echo NEXT_PUBLIC_APP_URL=http://localhost:3000
echo NODE_ENV=development
echo.
echo # Disable telemetry for faster startup
echo NEXT_TELEMETRY_DISABLED=1
echo ANALYZE=false
) > "frontend\.env.local"
echo ✅ Created .env.local
echo.

echo 🎉 Manual fix complete!
echo ======================
echo Now you can start the application:
echo.
echo 1. Start backend:  node simple-server.js
echo 2. Start frontend: cd frontend ^&^& npm run dev
echo.
echo This should resolve the turbopack runtime error!
pause 