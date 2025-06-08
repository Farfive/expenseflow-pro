@echo off
echo 🚀 Pushing Ollama LLaVA + PostgreSQL Integration to GitHub
echo ============================================================

echo 📁 Adding all new files...
git add .

echo 💾 Committing changes...
git commit -m "🚀 Implement Ollama LLaVA + PostgreSQL Integration - Added AI-powered OCR service, enhanced hybrid processing, PostgreSQL database service, comprehensive API endpoints, testing suite, and complete setup scripts"

echo 📤 Pushing to GitHub...
git push origin main

echo ✅ Integration changes pushed to GitHub successfully!
echo.
echo 📋 New files added:
echo    • ollama-llava-ocr-service.js - AI-powered OCR service
echo    • enhanced-ocr-service.js - Hybrid OCR processing
echo    • database-service.js - PostgreSQL integration
echo    • enhanced-server-with-llava-postgres.js - Enhanced API server
echo    • test-llava-postgres-integration.js - Comprehensive testing
echo    • setup-complete-integration.bat - Complete setup automation
echo    • start-enhanced-with-llava.bat - Enhanced startup script
echo.
pause 