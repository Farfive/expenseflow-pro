# 🚀 ExpenseFlow Pro - Quick Start Guide

## ⚡ FASTEST WAY TO RUN THE APP

### Option 1: Windows Batch Files (Recommended)
1. **Double-click** `debug-start.bat`
2. **Wait** for both servers to start
3. **Browser** will open automatically

### Option 2: PowerShell Script  
1. **Right-click** PowerShell as Administrator
2. **Navigate** to project folder: `cd "C:\Users\nlaszanowski\OneDrive - DXC Production\Desktop\saas"`
3. **Run**: `powershell -ExecutionPolicy Bypass -File start-app.ps1`

### Option 3: Manual Steps (If scripts fail)

#### Step 1: Start Backend
```bash
# Open Command Prompt in project root
node working-server.js
```
**Expected**: Backend runs on http://localhost:3002

#### Step 2: Start Frontend (New Terminal Window)
```bash
# Open second Command Prompt
cd frontend
npm install     # Only needed first time
npm run dev
```
**Expected**: Frontend runs on http://localhost:3000

## 🌐 Test URLs to Open

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | **Main App** (Should show content, not blank!) |
| http://localhost:3000/test-simple | **Diagnostics Page** |
| http://localhost:3002/api/health | **Backend Health Check** |

## ✅ What You Should See

### 1. Backend Health (http://localhost:3002/api/health)
```json
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "uptime": "X seconds"
}
```

### 2. Frontend Main Page (http://localhost:3000)
- ✅ **ExpenseFlow Pro** header
- ✅ **Blue gradient background**
- ✅ **"Modern Expense Management"** title
- ✅ **Get started** button
- ✅ **System Status** section at bottom
- ✅ **NO BLANK PAGE!**

### 3. Test Page (http://localhost:3000/test-simple)
- ✅ System diagnostics
- ✅ Backend connection status
- ✅ Environment information

## 🔧 Troubleshooting

### Problem: Blank Page on Frontend
**Solution**: The simplified page should fix this. If still blank:
1. Open browser **Developer Tools** (F12)
2. Check **Console** tab for errors
3. Try http://localhost:3000/test-simple instead

### Problem: Backend Not Starting
**Solution**:
1. Check if Node.js is installed: `node --version`
2. Kill existing processes: `taskkill /F /IM node.exe`
3. Restart backend: `node working-server.js`

### Problem: Frontend Not Starting  
**Solution**:
1. Check npm is available: `npm --version`
2. Install dependencies: `cd frontend && npm install`
3. Start dev server: `npm run dev`

### Problem: Port Already in Use
**Solution**:
```bash
# Kill all Node processes
taskkill /F /IM node.exe
taskkill /F /IM npm.exe
# Then restart servers
```

## 🎯 Expected Workflow After Startup

1. **Backend starts** on port 3002 ✅
2. **Frontend starts** on port 3000 ✅
3. **Browser opens** automatically ✅
4. **Homepage loads** with content (not blank!) ✅
5. **System status** shows backend connected ✅

## 🔑 Test the Application

Once both servers are running:

1. **Visit**: http://localhost:3000
2. **See**: Beautiful landing page with ExpenseFlow Pro content
3. **Click**: "View test page" link
4. **Test**: Backend connectivity in status section
5. **Try**: Navigation and login links

## 📞 If Nothing Works

1. **Check Node.js**: Download from https://nodejs.org
2. **Restart Computer**: Sometimes helps with port conflicts
3. **Check Antivirus**: May be blocking localhost connections
4. **Manual Browser**: Open http://localhost:3000 manually
5. **Check Firewall**: Allow Node.js through Windows Firewall

## 🎉 Success Indicators

- ✅ No error messages in terminals
- ✅ Both URLs respond (3000 and 3002)
- ✅ Frontend shows actual content
- ✅ Backend health check returns JSON
- ✅ System status shows "Backend connected"

**You should now see a fully functional ExpenseFlow Pro application!** 🚀 