@echo off
echo 🚀 Starting ExpenseFlow Pro with Ollama LLaVA + PostgreSQL
echo ================================================================
echo.

:: Set environment variables
set NODE_ENV=development
set PORT=8001
set OLLAMA_HOST=http://localhost:11434
set OLLAMA_MODEL=llava:latest

:: Database configuration
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=expenseflow_pro
set DB_USER=expenseflow
set DB_PASSWORD=password123
set DATABASE_URL=postgresql://expenseflow:password123@localhost:5432/expenseflow_pro

echo 🔧 ENVIRONMENT CONFIGURATION
echo    NODE_ENV: %NODE_ENV%
echo    PORT: %PORT%
echo    OLLAMA_HOST: %OLLAMA_HOST%
echo    DATABASE_URL: postgresql://expenseflow:****@localhost:5432/expenseflow_pro
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo 📋 Please install Node.js from: https://nodejs.org/
    goto :end
)

echo ✅ Node.js is available

:: Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        goto :end
    )
)

:: Check if PostgreSQL is running
echo 🗄️ Checking PostgreSQL connection...
timeout /t 2 /nobreak >nul
pg_isready -h localhost -p 5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ PostgreSQL not detected - checking Docker...
    docker ps | findstr "expenseflow-postgres" >nul 2>&1
    if %errorlevel% neq 0 (
        echo 💡 Starting PostgreSQL via Docker...
        call setup-database.bat
        if %errorlevel% neq 0 (
            echo ⚠️ PostgreSQL setup failed - server will use in-memory storage
        )
    ) else (
        echo ✅ PostgreSQL Docker container is running
    )
) else (
    echo ✅ PostgreSQL is running
)

:: Check if Ollama is running
echo 🤖 Checking Ollama LLaVA availability...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ Ollama not detected - checking if it's installed...
    where ollama >nul 2>&1
    if %errorlevel% neq 0 (
        echo 💡 Ollama not installed - setting up...
        call setup-ollama.bat
    ) else (
        echo 💡 Starting Ollama server...
        start "Ollama Server" ollama serve
        timeout /t 5 /nobreak >nul
    )
) else (
    echo ✅ Ollama is running
    
    :: Check if LLaVA model is available
    curl -s http://localhost:11434/api/tags | findstr "llava" >nul 2>&1
    if %errorlevel% neq 0 (
        echo 📦 LLaVA model not found - downloading...
        ollama pull llava:latest
        if %errorlevel% neq 0 (
            echo ⚠️ Failed to download LLaVA - OCR will use Tesseract fallback
        )
    ) else (
        echo ✅ LLaVA model is available
    )
)

echo.
echo ================================================================
echo 🚀 STARTING ENHANCED SERVER
echo ================================================================
echo.

:: Generate Prisma client if needed
if exist "prisma/schema.prisma" (
    echo 🔧 Generating Prisma client...
    npx prisma generate >nul 2>&1
)

:: Start the enhanced server
echo 🌟 Launching ExpenseFlow Pro Enhanced Server...
echo    📄 Document Processing: Ollama LLaVA + Tesseract OCR
echo    🗄️ Database: PostgreSQL with Prisma ORM
echo    🌐 Server: http://localhost:%PORT%
echo    📋 Health Check: http://localhost:%PORT%/api/health
echo.
echo ⏹️ Press Ctrl+C to stop the server
echo.

node enhanced-server-with-llava-postgres.js

:end
if %errorlevel% neq 0 (
    echo.
    echo ❌ Server startup failed!
    echo 📋 Troubleshooting tips:
    echo    1. Check if ports 8001, 5432, 11434 are available
    echo    2. Verify PostgreSQL is running: docker ps
    echo    3. Check Ollama status: ollama list
    echo    4. Review error messages above
    echo.
)

pause 