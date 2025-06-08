# 🚨 ExpenseFlow Pro - Startup Troubleshooting Guide

## 🔥 QUICK FIX - Try These First

### Option 1: Emergency Startup (Recommended)
```bash
# Double-click this file:
emergency-start.bat
```

### Option 2: Enhanced Startup
```bash
# Double-click this file:
fix-startup.bat
```

### Option 3: Diagnostic First
```bash
# Run diagnostic to identify issues:
diagnose-issues.bat
```

---

## 🔍 Common Issues & Solutions

### 1. ❌ "Node.js not found" or "Command not found"

**Problem**: Node.js not installed or not in PATH

**Solutions**:
1. **Install Node.js**: Download from https://nodejs.org (use LTS version)
2. **Restart computer** after installation
3. **Add to PATH manually**:
   - Windows: Add `C:\Program Files\nodejs` to PATH
   - Verify: Open new command prompt, type `node --version`

### 2. 🌐 "Port already in use" or "EADDRINUSE"

**Problem**: Ports 3000 or 3002 are occupied

**Solutions**:
```bash
# Kill all Node.js processes
taskkill /F /IM node.exe
taskkill /F /IM npm.exe

# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :3002

# Kill specific process (replace PID)
taskkill /F /PID [process_id]
```

### 3. 📱 Blank Page on http://localhost:3000

**Problem**: Frontend compiled but showing blank page

**Solutions**:
1. **Wait 30-60 seconds** for Next.js compilation
2. **Check browser console** (F12 → Console tab)
3. **Hard refresh**: Ctrl+F5 or Ctrl+Shift+R
4. **Try test page**: http://localhost:3000/test-simple
5. **Clear browser cache**

### 4. 🔌 "Backend not responding" or API errors

**Problem**: Backend server not starting or crashing

**Solutions**:
1. **Check backend window** for error messages
2. **Test health endpoint**: http://localhost:3002/api/health
3. **Check dependencies**:
   ```bash
   npm install
   ```
4. **Run backend directly**:
   ```bash
   node simple-server.js
   ```

### 5. 📦 "Module not found" or NPM errors

**Problem**: Missing dependencies

**Solutions**:
```bash
# Clean install backend
rm -rf node_modules
npm install

# Clean install frontend
cd frontend
rm -rf node_modules
npm install
cd ..

# Or use emergency cleanup
npm run clean
npm run setup
```

### 6. 🔒 Permission or Administrator Issues

**Problem**: Windows blocking Node.js execution

**Solutions**:
1. **Run as Administrator**: Right-click batch file → "Run as administrator"
2. **Windows Firewall**: Allow Node.js through firewall
3. **Antivirus**: Add project folder to antivirus exceptions

---

## 🛠️ Manual Startup Steps

If all scripts fail, use these manual steps:

### Step 1: Start Backend Manually
```bash
# Open Command Prompt in project root
cd "C:\Users\nlaszanowski\OneDrive - DXC Production\Desktop\saas"
node simple-server.js
```
**Expected**: "Server running on http://localhost:3002"

### Step 2: Start Frontend Manually (New Window)
```bash
# Open new Command Prompt
cd "C:\Users\nlaszanowski\OneDrive - DXC Production\Desktop\saas\frontend"
npm run dev
```
**Expected**: "Local: http://localhost:3000"

### Step 3: Test Both Services
- Backend Health: http://localhost:3002/api/health
- Frontend App: http://localhost:3000

---

## 🧪 Verification Checklist

✅ **System Requirements**:
- [ ] Node.js 18+ installed
- [ ] NPM 9+ available
- [ ] Windows Firewall allows Node.js
- [ ] Antivirus not blocking localhost

✅ **Files Present**:
- [ ] `package.json` (backend)
- [ ] `simple-server.js` (backend)
- [ ] `frontend/package.json`
- [ ] `node_modules/` (backend)
- [ ] `frontend/node_modules/`

✅ **Ports Available**:
- [ ] Port 3000 free (or frontend process running)
- [ ] Port 3002 free (or backend process running)

✅ **Services Responding**:
- [ ] http://localhost:3002/api/health returns JSON
- [ ] http://localhost:3000 shows content (not blank)

---

## 🚀 Alternative Startup Methods

### Method 1: Docker (if available)
```bash
docker-compose up
```

### Method 2: NPM Scripts
```bash
# Start both services
npm run dev:full

# Or individually
npm run dev:backend  # Terminal 1
npm run dev:frontend # Terminal 2
```

### Method 3: PowerShell
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\start-both-services.ps1
```

---

## 🆘 Last Resort Solutions

### Solution 1: Complete Reset
```bash
# Delete everything and reinstall
npm run clean
npm run setup
```

### Solution 2: Restart Computer
Sometimes Windows needs a restart to clear port locks and process conflicts.

### Solution 3: Alternative Node.js Installation
- Try Node.js version manager (nvm-windows)
- Install different Node.js version
- Use portable Node.js

### Solution 4: Different Browser
- Try Chrome, Firefox, Edge
- Disable browser extensions
- Use incognito/private mode

---

## 📞 Getting Help

1. **Run diagnostic**: `diagnose-issues.bat`
2. **Copy console output** from terminal windows
3. **Check browser console** (F12 → Console)
4. **Note exact error messages**

## 🎯 Success Indicators

When everything works correctly:
- ✅ Backend terminal shows "Server running on http://localhost:3002"
- ✅ Frontend terminal shows "Local: http://localhost:3000"
- ✅ http://localhost:3002/api/health returns `{"status":"ok"}`
- ✅ http://localhost:3000 shows ExpenseFlow Pro homepage
- ✅ No error messages in terminals
- ✅ Browser console shows no errors

---

**Remember**: If one method doesn't work, try the next one. The emergency startup script (`emergency-start.bat`) has the highest success rate for most common issues. 