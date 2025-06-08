# ExpenseFlow Pro - PowerShell Startup Script
Write-Host "===========================================" -ForegroundColor Green
Write-Host "    EXPENSEFLOW PRO - POWERSHELL START" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

# Kill existing Node processes
Write-Host "[1/5] Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Check if ports are free
Write-Host "[2/5] Checking port availability..." -ForegroundColor Yellow
$port4001 = Get-NetTCPConnection -LocalPort 4001 -ErrorAction SilentlyContinue
$port4000 = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue

if ($port4001) {
    Write-Host "Port 4001 is in use, attempting to free it..." -ForegroundColor Red
    $process = Get-Process -Id $port4001.OwningProcess -ErrorAction SilentlyContinue
    if ($process) { $process | Stop-Process -Force }
}

if ($port4000) {
    Write-Host "Port 4000 is in use, attempting to free it..." -ForegroundColor Red
    $process = Get-Process -Id $port4000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) { $process | Stop-Process -Force }
}

# Start backend
Write-Host "[3/5] Starting backend server on port 4001..." -ForegroundColor Yellow
$env:PORT = "4001"
$env:NODE_ENV = "development"
Start-Process -FilePath "node" -ArgumentList "simple-server.js" -WindowStyle Normal

# Wait for backend to start
Write-Host "[4/5] Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Test backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4001/api/health" -TimeoutSec 5
    Write-Host "✅ Backend is running on port 4001" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend failed to start on port 4001" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    pause
    exit 1
}

# Start frontend
Write-Host "[5/5] Starting frontend server on port 4000..." -ForegroundColor Yellow
Set-Location -Path "frontend"
$env:PORT = "4000"
$env:NEXT_PUBLIC_API_URL = "http://localhost:4001"
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal

# Wait and open browser
Start-Sleep -Seconds 10
Start-Process "http://localhost:4000"

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "          STARTUP COMPLETE!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:4001/api/health" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 