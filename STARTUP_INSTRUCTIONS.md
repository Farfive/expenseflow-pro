# 🚀 ExpenseFlow Pro - Startup Instructions

## Quick Start Options

### Option 1: Automatic Python Script (Recommended)
```bash
python run.py
```

### Option 2: Automatic Batch File (Windows)
```bash
fix-and-start.bat
```

### Option 3: Manual Setup (If automated scripts fail)

## Manual Setup Instructions

### 1. Kill Existing Processes
```bash
# Windows
taskkill /F /IM node.exe
taskkill /F /IM npm.exe

# Linux/Mac
pkill -f node
pkill -f npm
```

### 2. Start Backend Server
```bash
node working-server.js
```
- Backend will run on: http://localhost:3002
- Health check: http://localhost:3002/api/health

### 3. Start Frontend Server
Open a **new terminal/command prompt** and run:
```bash
cd frontend
npm install          # If first time or no node_modules
npm run dev
```
- Frontend will run on: http://localhost:3000

## If npm is not found:

### Check Node.js Installation
```bash
node --version
npm --version
```

### Reinstall Node.js if needed:
1. Download from: https://nodejs.org
2. Install with "Add to PATH" option checked
3. Restart your terminal/command prompt
4. Verify with `node --version` and `npm --version`

### Alternative npm locations (Windows):
If npm is installed but not in PATH, try these full paths:
- `C:\Program Files\nodejs\npm.cmd`
- `%APPDATA%\npm\npm.cmd`
- `%ProgramFiles%\nodejs\npm.cmd`

## 🌐 Application URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main application interface |
| Backend API | http://localhost:3002 | API server |
| Health Check | http://localhost:3002/api/health | Server status |

## 🔑 Test Users

| Role | Email | Password |
|------|-------|----------|
| Admin | test@expenseflow.com | password123 |
| Employee | david.kim@techcorp.com | test123 |
| Manager | jennifer.smith@techcorp.com | test123 |

## 🛠️ Troubleshooting

### Backend Issues
- **Port 3002 in use**: Kill existing Node processes or restart computer
- **working-server.js not found**: Make sure you're in the project root directory
- **Node.js not found**: Install Node.js from nodejs.org

### Frontend Issues
- **npm not found**: Check Node.js installation and PATH
- **Dependencies fail**: Try `npm cache clean --force` then `npm install`
- **Port 3000 in use**: Change port in package.json or kill existing processes

### Python Script Issues
- **Python not found**: Install Python from python.org
- **requests module missing**: Run `pip install requests`

## 📁 Project Structure
```
saas/
├── working-server.js          # Backend server
├── frontend/                  # Next.js frontend
│   ├── package.json
│   ├── next.config.js
│   └── src/
├── run.py                     # Python quick starter
├── start_expenseflow.py       # Full Python starter
├── fix-and-start.bat          # Windows batch starter
└── STARTUP_INSTRUCTIONS.md    # This file
```

## 🎯 Expected Behavior

1. **Backend starts first** on port 3002
2. **API endpoints become available** (health, auth, categories, etc.)
3. **Frontend starts** on port 3000 with proxy to backend
4. **Browser opens automatically** to http://localhost:3000
5. **You can test the application** with the provided test users

## 💡 Tips

- Keep both terminal windows open while using the application
- Backend must be running for frontend to work properly
- Use Ctrl+C to stop servers
- Refresh browser if frontend doesn't load immediately
- Check browser console for any frontend errors

## 🆘 Still Having Issues?

1. Make sure you're in the correct directory (`saas`)
2. Verify Node.js and npm are properly installed
3. Check Windows Firewall isn't blocking localhost connections
4. Try restarting your computer to clear any port conflicts
5. Run each step manually to identify where the issue occurs 