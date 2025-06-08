# ExpenseFlow Pro - Final Startup Solution

## 🎯 **QUICK START (Recommended)**

### Method 1: Manual Start (Most Reliable)
Open **two separate terminal windows**:

**Terminal 1 (Backend):**
```cmd
set PORT=4001 && node simple-server.js
```

**Terminal 2 (Frontend):**
```cmd
cd frontend && set PORT=4000 && npm run dev
```

Then open: http://localhost:4000

### Method 2: Automated Scripts
Choose one of these:

```cmd
# Option A: Node.js script
node start-both.js

# Option B: Batch script
clean-start.bat

# Option C: PowerShell script
powershell -ExecutionPolicy Bypass -File start-services.ps1
```

## 🔧 **Issues Fixed**

### 1. Port Configuration Conflicts
- **Problem**: Multiple servers trying to use different ports (3000, 4000, 4001)
- **Solution**: Standardized to Backend:4001, Frontend:4000

### 2. Missing Dependencies
- **Problem**: Frontend missing `react-hotkeys-hook` and `sonner`
- **Solution**: Installed missing packages

### 3. Environment Variables
- **Problem**: Inconsistent environment configuration
- **Solution**: Created proper env files and updated configs

### 4. Process Conflicts
- **Problem**: Old Node.js processes interfering
- **Solution**: Comprehensive cleanup scripts

## 📁 **Files Created/Modified**

### New Startup Scripts
- `start-both.js` - Node.js programmatic startup
- `clean-start.bat` - Comprehensive Windows batch script
- `start-services.ps1` - PowerShell startup script
- `test-backend-port.js` - Configuration verification script

### Configuration Updates
- `frontend/next.config.js` - Updated proxy and environment handling
- `frontend/env.local` - Environment variables for frontend
- `package.json` - Verified correct server file references

## 🌐 **Port Configuration**

| Service  | Port | URL                           | Purpose                    |
|----------|------|-------------------------------|----------------------------|
| Backend  | 4001 | http://localhost:4001/api     | API server                 |
| Frontend | 4000 | http://localhost:4000         | Next.js development server |

## 🔄 **API Proxy Setup**

The frontend automatically proxies API calls:
- Frontend calls: `/api/*` 
- Proxied to: `http://localhost:4001/api/*`

## 🛠️ **Troubleshooting**

### Backend Won't Start
1. **Check port usage**: `netstat -ano | findstr :4001`
2. **Kill processes**: `taskkill /f /im node.exe`
3. **Verify file**: Ensure `simple-server.js` exists
4. **Test manually**: `set PORT=4001 && node simple-server.js`

### Frontend Won't Start
1. **Check dependencies**: `cd frontend && npm install`
2. **Check port usage**: `netstat -ano | findstr :4000`
3. **Verify Next.js**: Ensure `frontend/package.json` exists
4. **Test manually**: `cd frontend && set PORT=4000 && npm run dev`

### API Connection Issues
1. **Verify backend**: Open http://localhost:4001/api/health
2. **Check CORS**: Ensure backend allows frontend origin
3. **Check proxy**: Verify `frontend/next.config.js` proxy config
4. **Browser console**: Check for CORS or network errors

### Port Already in Use Errors
```cmd
# Find what's using the port
netstat -ano | findstr :4001

# Kill the process (replace PID with actual process ID)
taskkill /f /pid [PID]

# Or kill all Node processes
taskkill /f /im node.exe
```

## 🧪 **Testing the Setup**

### 1. Verify Backend
```cmd
curl http://localhost:4001/api/health
```
Should return: `{"status":"healthy",...}`

### 2. Verify Frontend
Open: http://localhost:4000
Should show the ExpenseFlow Pro interface

### 3. Test API Connection
1. Open browser developer tools (F12)
2. Go to Network tab
3. Try logging in with any email/password
4. Check if API calls to `/api/auth/login` succeed

## 🚀 **Production Deployment Notes**

### Environment Variables
```env
# Backend
PORT=4001
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com

# Frontend
PORT=4000
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Docker Setup
The project includes Docker configuration:
```cmd
docker-compose up -d
```

## 📝 **Development Workflow**

### Daily Development
1. Start backend: `set PORT=4001 && node simple-server.js`
2. Start frontend: `cd frontend && set PORT=4000 && npm run dev`
3. Open: http://localhost:4000

### Making Changes
- **Backend changes**: Restart backend terminal
- **Frontend changes**: Hot reload automatically
- **Config changes**: Restart both services

## 🔍 **Verification Commands**

Run these to verify your setup:

```cmd
# Test configuration
node test-backend-port.js

# Check running processes
tasklist | findstr node.exe

# Check port usage
netstat -ano | findstr :4000
netstat -ano | findstr :4001

# Test connectivity
curl http://localhost:4001/api/health
curl http://localhost:4000
```

## ✅ **Success Indicators**

You'll know everything is working when:
1. Backend terminal shows: "Server running on http://localhost:4001"
2. Frontend terminal shows: "Local: http://localhost:4000"
3. Browser opens http://localhost:4000 and shows the app
4. Login form accepts any email/password
5. No CORS errors in browser console

## 🆘 **Emergency Reset**

If nothing works:
```cmd
# Kill everything
taskkill /f /im node.exe
wmic process where "name='node.exe'" delete

# Clean install
npm run clean
npm run setup

# Manual start
set PORT=4001 && node simple-server.js
# (in new terminal)
cd frontend && set PORT=4000 && npm run dev
```

---

**Need help?** Check the terminal outputs for specific error messages and refer to the troubleshooting section above. 