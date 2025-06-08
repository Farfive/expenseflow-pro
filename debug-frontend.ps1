Write-Host "🔧 POWERSHELL FRONTEND DIAGNOSTIC" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Function to log with timestamps
function Log-Message {
    param($Message, $Type = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch($Type) {
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "Cyan" }
    }
    Write-Host "[$timestamp] $Type: $Message" -ForegroundColor $color
}

Log-Message "Starting PowerShell frontend diagnostic"
Log-Message "Current directory: $(Get-Location)"
Log-Message "PowerShell version: $($PSVersionTable.PSVersion)"

# Check Node.js
try {
    $nodeVersion = node --version
    Log-Message "Node.js version: $nodeVersion" "SUCCESS"
} catch {
    Log-Message "Node.js not found or not working" "ERROR"
    exit 1
}

# Check required files
Log-Message "Checking required files..."
$requiredFiles = @(
    "simple-server.js",
    "frontend\package.json",
    "frontend\next.config.simple.js"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Log-Message "✅ Found: $file" "SUCCESS"
    } else {
        Log-Message "❌ Missing: $file" "ERROR"
    }
}

# Kill existing processes
Log-Message "Killing existing Node.js processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Change to frontend directory
Set-Location "frontend"
Log-Message "Changed to frontend directory: $(Get-Location)"

# Apply simple config
if (Test-Path "next.config.simple.js") {
    Copy-Item "next.config.simple.js" "next.config.js" -Force
    Log-Message "Applied simple Next.js configuration" "SUCCESS"
} else {
    Log-Message "Simple config not found" "WARNING"
}

# Set environment variables
$env:NODE_ENV = "development"
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:TURBO_TELEMETRY_DISABLED = "1"
$env:NODE_OPTIONS = "--max-old-space-size=4096"

Log-Message "Environment variables set" "SUCCESS"

# Start Next.js with detailed monitoring
Log-Message "Starting Next.js development server..." "INFO"
Log-Message "Command: npm run dev" "INFO"

$startTime = Get-Date
$lastOutput = Get-Date

try {
    $process = Start-Process npm -ArgumentList "run", "dev" -PassThru -NoNewWindow -RedirectStandardOutput "output.log" -RedirectStandardError "error.log"
    
    Log-Message "Process started with PID: $($process.Id)" "SUCCESS"
    
    # Monitor the process
    $timeout = 60 # seconds
    $hangThreshold = 15 # seconds without output
    
    for ($i = 0; $i -lt $timeout; $i++) {
        Start-Sleep 1
        
        # Check if process is still running
        if ($process.HasExited) {
            Log-Message "Process exited with code: $($process.ExitCode)" "ERROR"
            break
        }
        
        # Check for output
        if (Test-Path "output.log") {
            $newOutput = Get-Content "output.log" -Tail 10 -ErrorAction SilentlyContinue
            if ($newOutput) {
                $lastOutput = Get-Date
                foreach ($line in $newOutput) {
                    if ($line.Trim()) {
                        Log-Message "OUTPUT: $line" "INFO"
                        
                        if ($line -match "ready|Local:|compiled") {
                            Log-Message "SUCCESS DETECTED: Frontend is ready!" "SUCCESS"
                            break
                        }
                    }
                }
            }
        }
        
        # Check for errors
        if (Test-Path "error.log") {
            $errors = Get-Content "error.log" -Tail 5 -ErrorAction SilentlyContinue
            if ($errors) {
                foreach ($error in $errors) {
                    if ($error.Trim()) {
                        Log-Message "ERROR: $error" "ERROR"
                    }
                }
            }
        }
        
        # Check for hang
        $timeSinceOutput = (Get-Date) - $lastOutput
        if ($timeSinceOutput.TotalSeconds -gt $hangThreshold) {
            Log-Message "HANG DETECTED: No output for $($timeSinceOutput.TotalSeconds) seconds" "ERROR"
            Log-Message "Killing process..." "WARNING"
            $process | Stop-Process -Force
            break
        }
        
        # Progress indicator
        if ($i % 10 -eq 0) {
            Log-Message "Monitoring... ($i/$timeout seconds)" "INFO"
        }
    }
    
} catch {
    Log-Message "Failed to start process: $($_.Exception.Message)" "ERROR"
} finally {
    # Cleanup
    if (Test-Path "output.log") { Remove-Item "output.log" -ErrorAction SilentlyContinue }
    if (Test-Path "error.log") { Remove-Item "error.log" -ErrorAction SilentlyContinue }
}

Log-Message "Diagnostic complete" "INFO" 