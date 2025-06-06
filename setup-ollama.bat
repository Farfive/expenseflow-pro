@echo off
echo 🤖 Setting up Ollama LLaVA for ExpenseFlow Pro OCR...
echo.

:: Check if Ollama is already installed
where ollama >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Ollama is already installed
    goto :check_model
)

echo 📥 Downloading and installing Ollama...
echo.
echo Please download Ollama from: https://ollama.ai/download/windows
echo After installation, press any key to continue...
pause >nul

:check_model
echo 🔍 Checking if LLaVA model is installed...
ollama list | findstr "llava" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ LLaVA model is already installed
    goto :start_server
)

echo 📦 Installing LLaVA model (this may take several minutes)...
ollama pull llava:latest
if %errorlevel% == 0 (
    echo ✅ LLaVA model installed successfully
) else (
    echo ❌ Failed to install LLaVA model
    goto :error
)

:start_server
echo 🚀 Starting Ollama server...
start "Ollama Server" ollama serve

echo ⏳ Waiting for Ollama server to start...
timeout /t 5 /nobreak >nul

echo 🧪 Testing Ollama connection...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Ollama server is running successfully!
    echo.
    echo 🎯 Available models:
    ollama list
) else (
    echo ❌ Ollama server failed to start
    goto :error
)

echo.
echo 🎉 Ollama LLaVA setup complete!
echo 📋 Next steps:
echo    1. Make sure Ollama server stays running
echo    2. Your ExpenseFlow Pro can now use real OCR
echo    3. Access Ollama at: http://localhost:11434
echo.
goto :end

:error
echo ❌ Setup failed. Please check the installation manually.
echo 📋 Manual steps:
echo    1. Download Ollama from https://ollama.ai
echo    2. Run: ollama pull llava:latest
echo    3. Run: ollama serve
echo.

:end
pause 