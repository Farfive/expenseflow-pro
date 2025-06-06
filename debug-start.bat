@echo off
title ExpenseFlow Pro - Debug Startup
color 0F

echo 🔍 ExpenseFlow Pro - Debug Mode Startup
echo =======================================
echo.

echo 📋 STEP 1: Environment Check
echo ============================
echo Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    goto error
)

echo Checking npm availability...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm not found!
    goto error
)

echo ✅ Node.js and npm are available
echo.

echo 📋 STEP 2: Process Cleanup
echo ==========================
echo Killing existing Node.js processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
echo ✅ Process cleanup completed
timeout /t 3 /nobreak >nul

echo.
echo 📋 STEP 3: Backend Startup
echo =========================
echo Starting backend server with detailed output...
echo Backend URL: http://localhost:3002
echo.

start "ExpenseFlow Backend Debug" cmd /c "title ExpenseFlow Backend (Debug) && echo 🔧 Backend Server Debug Mode && echo ========================= && echo URL: http://localhost:3002/api/health && echo Timestamp: %date% %time% && echo. && node working-server.js"

echo ⏳ Waiting 8 seconds for backend initialization...
timeout /t 8 /nobreak >nul

echo.
echo 📋 STEP 4: Backend Health Check
echo ==============================
echo Testing backend connectivity...

powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:3002/api/health' -TimeoutSec 5; Write-Host '✅ Backend Health Check: SUCCESS' -ForegroundColor Green; Write-Host 'Response:' $response.status } catch { Write-Host '❌ Backend Health Check: FAILED' -ForegroundColor Red; Write-Host 'Error:' $_.Exception.Message }"

echo.
echo 📋 STEP 5: Frontend Dependency Check
echo ==================================
cd frontend

if not exist "node_modules\" (
    echo 📦 Installing frontend dependencies...
    echo This may take several minutes...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Frontend dependency installation failed!
        goto error
    )
    echo ✅ Frontend dependencies installed
) else (
    echo ✅ Frontend dependencies already exist
)

echo.
echo 📋 STEP 6: Frontend Startup (Debug Mode)
echo ========================================
echo Starting frontend with detailed output...
echo Frontend URL: http://localhost:3000
echo.

start "ExpenseFlow Frontend Debug" cmd /c "title ExpenseFlow Frontend (Debug) && echo 🌐 Frontend Server Debug Mode && echo ========================== && echo URL: http://localhost:3000 && echo Test Page: http://localhost:3000/test-simple && echo Timestamp: %date% %time% && echo. && npm run dev"

cd ..

echo ⏳ Waiting 12 seconds for frontend initialization...
timeout /t 12 /nobreak >nul

echo.
echo 📋 STEP 7: Frontend Health Check
echo ===============================
echo Testing frontend connectivity...

powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 10 -UseBasicParsing; Write-Host '✅ Frontend Health Check: SUCCESS' -ForegroundColor Green; Write-Host 'Status Code:' $response.StatusCode } catch { Write-Host '❌ Frontend Health Check: FAILED' -ForegroundColor Red; Write-Host 'Error:' $_.Exception.Message }"

echo.
echo 📋 STEP 8: Opening Test Pages
echo ============================
echo Opening test pages in browser...

start http://localhost:3002/api/health
timeout /t 2 /nobreak >nul
start http://localhost:3000
timeout /t 2 /nobreak >nul
start http://localhost:3000/test-simple

echo.
echo 🎉 Debug Startup Complete!
echo =========================
echo.
echo 📍 Server URLs:
echo    🔧 Backend Health: http://localhost:3002/api/health
echo    🌐 Frontend Main: http://localhost:3000
echo    🧪 Frontend Test: http://localhost:3000/test-simple
echo.
echo 🔑 Test Users:
echo    📧 Admin: test@expenseflow.com / password123
echo    📧 Employee: david.kim@techcorp.com / test123
echo    📧 Manager: jennifer.smith@techcorp.com / test123
echo.
echo 💡 Debug Information:
echo    - Both servers are running in separate debug windows
echo    - Check those windows for detailed error messages
echo    - Frontend should show content, not a blank page
echo    - Test page (/test-simple) shows system diagnostics
echo.
echo 🔄 To stop servers: Close the debug windows or press Ctrl+C in them
echo.
goto end

:error
echo.
echo ❌ Debug startup failed!
echo Please check the error messages above and ensure:
echo 1. Node.js is properly installed
echo 2. You're in the correct project directory
echo 3. No antivirus is blocking the processes
echo.

:end
pause 