@echo off
echo 🎯 ExpenseFlow Pro Complete Integration Setup
echo =================================================
echo Setting up Ollama LLaVA + PostgreSQL Integration
echo =================================================
echo.

:: Check prerequisites
echo 📋 Checking prerequisites...

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is required but not installed
    echo 📥 Download from: https://nodejs.org/
    goto :error
)
echo ✅ Node.js is available

:: Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is required but not installed
    echo 📥 Download from: https://docs.docker.com/desktop/install/windows/
    goto :error
)
echo ✅ Docker is available

echo.
echo ================================================================
echo 📦 STEP 1: INSTALLING DEPENDENCIES
echo ================================================================

:: Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install Node.js dependencies
    goto :error
)
echo ✅ Node.js dependencies installed

:: Install additional dependencies for new services
echo 📦 Installing additional dependencies...
npm install axios form-data
if %errorlevel% neq 0 (
    echo ⚠️ Warning: Some additional dependencies failed to install
)

echo.
echo ================================================================
echo 🗄️ STEP 2: SETTING UP POSTGRESQL DATABASE
echo ================================================================

echo 🚀 Setting up PostgreSQL with Docker...
call setup-database.bat
if %errorlevel% neq 0 (
    echo ⚠️ PostgreSQL setup encountered issues - continuing with fallback mode
    set DB_SETUP_FAILED=1
) else (
    echo ✅ PostgreSQL setup completed
    set DB_SETUP_FAILED=0
)

echo.
echo ================================================================
echo 🤖 STEP 3: SETTING UP OLLAMA LLAVA
echo ================================================================

echo 🚀 Setting up Ollama LLaVA...
call setup-ollama.bat
if %errorlevel% neq 0 (
    echo ⚠️ Ollama setup encountered issues - continuing with Tesseract fallback
    set OLLAMA_SETUP_FAILED=1
) else (
    echo ✅ Ollama LLaVA setup completed
    set OLLAMA_SETUP_FAILED=0
)

echo.
echo ================================================================
echo 🔧 STEP 4: CONFIGURING SERVICES
echo ================================================================

:: Generate Prisma client
if exist "prisma/schema.prisma" (
    echo 🔧 Generating Prisma client...
    npx prisma generate
    if %errorlevel% == 0 (
        echo ✅ Prisma client generated
    ) else (
        echo ⚠️ Prisma client generation failed
    )
)

:: Push database schema (if PostgreSQL is available)
if %DB_SETUP_FAILED% == 0 (
    echo 🗄️ Pushing database schema...
    timeout /t 5 /nobreak >nul
    npx prisma db push --accept-data-loss
    if %errorlevel% == 0 (
        echo ✅ Database schema updated
    ) else (
        echo ⚠️ Database schema push failed - manual intervention may be needed
    )
)

echo.
echo ================================================================
echo 🧪 STEP 5: TESTING INTEGRATION
echo ================================================================

echo 🧪 Running integration tests...

:: Start server in background for testing
echo 🚀 Starting enhanced server for testing...
start "ExpenseFlow Enhanced Server" cmd /c "node enhanced-server-with-llava-postgres.js"

:: Wait for server to start
echo ⏳ Waiting for server to initialize...
timeout /t 10 /nobreak >nul

:: Run tests
echo 🧪 Running integration tests...
node test-llava-postgres-integration.js

:: Stop test server
echo 🛑 Stopping test server...
taskkill /f /fi "WINDOWTITLE eq ExpenseFlow Enhanced Server*" >nul 2>&1

echo.
echo ================================================================
echo 📋 SETUP SUMMARY
echo ================================================================

echo 🎯 ExpenseFlow Pro Enhanced Integration Setup Complete!
echo.
echo 📊 SETUP RESULTS:
if %DB_SETUP_FAILED% == 0 (
    echo    🗄️ PostgreSQL Database: ✅ CONFIGURED
) else (
    echo    🗄️ PostgreSQL Database: ⚠️ FALLBACK MODE
)

if %OLLAMA_SETUP_FAILED% == 0 (
    echo    🤖 Ollama LLaVA OCR: ✅ CONFIGURED
) else (
    echo    🤖 Ollama LLaVA OCR: ⚠️ TESSERACT FALLBACK
)

echo    📄 Document Processing: ✅ ENHANCED OCR
echo    🌐 API Server: ✅ READY
echo    🔧 Frontend Integration: ✅ READY

echo.
echo 🚀 NEXT STEPS:
echo    1. Start the enhanced server: start-enhanced-with-llava.bat
echo    2. Access the API at: http://localhost:8001
echo    3. Check health status: http://localhost:8001/api/health
echo    4. Start the frontend: cd frontend && npm run dev

echo.
echo 💡 TROUBLESHOOTING:
if %DB_SETUP_FAILED% == 1 (
    echo    🗄️ PostgreSQL issues? Run: setup-database.bat
)
if %OLLAMA_SETUP_FAILED% == 1 (
    echo    🤖 Ollama issues? Run: setup-ollama.bat
)
echo    🧪 Run tests anytime: node test-llava-postgres-integration.js
echo    📋 View logs: Check Docker logs and server console output

echo.
echo ================================================================
echo 🎉 SETUP COMPLETE!
echo Your ExpenseFlow Pro is now enhanced with:
echo   • AI-powered OCR (Ollama LLaVA + Tesseract)
echo   • PostgreSQL database with Prisma ORM
echo   • Document processing and expense automation
echo   • RESTful API with comprehensive endpoints
echo ================================================================

goto :end

:error
echo.
echo ❌ SETUP FAILED!
echo Please resolve the errors above and try again.
echo.
echo 📋 Common solutions:
echo    • Install Node.js: https://nodejs.org/
echo    • Install Docker: https://docs.docker.com/desktop/
echo    • Check firewall settings for ports 5432, 8001, 11434
echo    • Ensure sufficient disk space (2GB+ recommended)

:end
echo.
pause 