# ExpenseFlow Pro - PowerShell Startup Script
Write-Host "🚀 ExpenseFlow Pro - PowerShell Startup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
Write-Host "📋 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check npm installation
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found! Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Kill existing processes
Write-Host "🛑 Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✅ Process cleanup completed" -ForegroundColor Green

Write-Host ""

# Start backend
Write-Host "🔧 Starting backend server..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node working-server.js
}
Write-Host "✅ Backend starting on http://localhost:3002" -ForegroundColor Green

# Wait for backend
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Test backend
Write-Host "🧪 Testing backend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/health" -TimeoutSec 5
    Write-Host "✅ Backend health check: SUCCESS" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Backend health check: FAILED" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# Check frontend dependencies
Write-Host "📦 Checking frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend dependency installation failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Frontend dependencies already exist" -ForegroundColor Green
}

# Start frontend
Write-Host "🌐 Starting frontend server..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD/frontend
    npm run dev
}
Write-Host "✅ Frontend starting on http://localhost:3000" -ForegroundColor Green

Set-Location ..

# Wait for frontend
Write-Host "⏳ Waiting for frontend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

# Test frontend
Write-Host "🧪 Testing frontend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10 -UseBasicParsing
    Write-Host "✅ Frontend health check: SUCCESS" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Frontend health check: FAILED" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# Open browsers
Write-Host "🌐 Opening application in browser..." -ForegroundColor Yellow
Start-Process "http://localhost:3002/api/health"
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000/test-simple"

Write-Host ""
Write-Host "🎉 ExpenseFlow Pro is now running!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Application URLs:" -ForegroundColor Cyan
Write-Host "   🔧 Backend Health: http://localhost:3002/api/health" -ForegroundColor White
Write-Host "   🌐 Frontend Main:  http://localhost:3000" -ForegroundColor White
Write-Host "   🧪 Frontend Test:  http://localhost:3000/test-simple" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Test Users:" -ForegroundColor Cyan
Write-Host "   📧 Admin: test@expenseflow.com / password123" -ForegroundColor White
Write-Host "   📧 Employee: david.kim@techcorp.com / test123" -ForegroundColor White
Write-Host "   📧 Manager: jennifer.smith@techcorp.com / test123" -ForegroundColor White
Write-Host ""
Write-Host "💡 Both servers are running in background jobs" -ForegroundColor Yellow
Write-Host "🔄 Press Ctrl+C to stop this script (servers will continue running)" -ForegroundColor Yellow
Write-Host "🛑 To stop servers manually: taskkill /F /IM node.exe" -ForegroundColor Yellow
Write-Host ""

# Keep script running
Write-Host "Press any key to stop monitoring (servers will continue)..." -ForegroundColor Magenta
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "Script monitoring stopped. Servers are still running." -ForegroundColor Yellow 