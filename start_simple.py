#!/usr/bin/env python3
"""
ExpenseFlow Pro - Simple Starter
================================
This script starts the application with better error handling for npm issues.
"""

import os
import sys
import time
import subprocess
import webbrowser
from pathlib import Path

# Colors for output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    ENDC = '\033[0m'

def print_status(message, status="info"):
    """Print colored status message"""
    colors = {
        "success": f"{Colors.GREEN}✅",
        "error": f"{Colors.RED}❌",
        "warning": f"{Colors.YELLOW}⚠️",
        "progress": f"{Colors.CYAN}🔄",
        "info": f"{Colors.BLUE}ℹ️"
    }
    icon = colors.get(status, f"{Colors.BLUE}ℹ️")
    print(f"{icon} {message}{Colors.ENDC}")

def install_requests():
    """Install requests if needed"""
    try:
        import requests
        return True
    except ImportError:
        print_status("Installing requests library...", "progress")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'requests'])
            return True
        except subprocess.CalledProcessError:
            print_status("Failed to install requests", "error")
            return False

def kill_existing_processes():
    """Kill existing Node.js processes"""
    print_status("Cleaning up existing processes...", "progress")
    try:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/F', '/IM', 'node.exe'], 
                         capture_output=True, check=False)
            subprocess.run(['taskkill', '/F', '/IM', 'npm.exe'], 
                         capture_output=True, check=False)
        else:
            subprocess.run(['pkill', '-f', 'node'], check=False)
        time.sleep(2)
        print_status("Cleaned up existing processes", "success")
    except Exception as e:
        print_status(f"Process cleanup warning: {e}", "warning")

def start_backend():
    """Start the backend server"""
    print_status("Starting backend server...", "progress")
    
    backend_file = Path("working-server.js")
    if not backend_file.exists():
        print_status("Backend file 'working-server.js' not found!", "error")
        return None
        
    try:
        process = subprocess.Popen(
            ['node', str(backend_file)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print_status("Backend starting on http://localhost:3002", "success")
        return process
    except Exception as e:
        print_status(f"Failed to start backend: {e}", "error")
        return None

def wait_for_backend():
    """Wait for backend to be ready"""
    print_status("Waiting for backend...", "progress")
    
    # Install requests if needed
    if not install_requests():
        return False
        
    import requests
    
    for i in range(30):
        try:
            response = requests.get("http://localhost:3002/api/health", timeout=3)
            if response.status_code == 200:
                print_status("Backend is ready!", "success")
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
        
    print_status("Backend did not start in time", "warning")
    return False

def find_npm_paths():
    """Find possible npm locations"""
    possible_paths = []
    
    if os.name == 'nt':
        # Common npm locations on Windows
        common_locations = [
            os.path.expandvars(r"%APPDATA%\npm\npm.cmd"),
            os.path.expandvars(r"%ProgramFiles%\nodejs\npm.cmd"),
            os.path.expandvars(r"%ProgramFiles(x86)%\nodejs\npm.cmd"),
            r"C:\Program Files\nodejs\npm.cmd",
            r"C:\Program Files (x86)\nodejs\npm.cmd",
        ]
        
        for path in common_locations:
            if os.path.exists(path):
                possible_paths.append(path)
    
    return possible_paths

def start_frontend_manual():
    """Provide manual instructions for starting frontend"""
    print()
    print(f"{Colors.YELLOW}{Colors.BOLD}🛠️ Frontend Manual Setup Required{Colors.ENDC}")
    print("=" * 50)
    print()
    print("The Python script couldn't automatically start the frontend.")
    print("Please follow these steps manually:")
    print()
    print(f"{Colors.CYAN}1. Open a new Command Prompt or Terminal{Colors.ENDC}")
    print(f"{Colors.CYAN}2. Navigate to the frontend directory:{Colors.ENDC}")
    print(f"   cd \"{Path.cwd() / 'frontend'}\"")
    print()
    print(f"{Colors.CYAN}3. Install dependencies (if needed):{Colors.ENDC}")
    print("   npm install")
    print()
    print(f"{Colors.CYAN}4. Start the development server:{Colors.ENDC}")
    print("   npm run dev")
    print()
    print(f"{Colors.CYAN}5. The frontend will be available at:{Colors.ENDC}")
    print("   http://localhost:3000")
    print()
    
    # Try to find npm paths
    npm_paths = find_npm_paths()
    if npm_paths:
        print(f"{Colors.YELLOW}💡 Found npm at these locations:{Colors.ENDC}")
        for path in npm_paths:
            print(f"   {path}")
        print()
    
    return False

def open_urls():
    """Open the application URLs"""
    print_status("Opening application URLs...", "progress")
    
    urls = [
        "http://localhost:3002/api/health",  # Backend health check
        "http://localhost:3000"  # Frontend (may not work if not started)
    ]
    
    for url in urls:
        try:
            webbrowser.open(url)
            time.sleep(1)  # Small delay between opens
        except Exception as e:
            print_status(f"Could not open {url}: {e}", "warning")

def print_summary():
    """Print final summary"""
    print()
    print(f"{Colors.GREEN}{Colors.BOLD}🎉 ExpenseFlow Pro Status{Colors.ENDC}")
    print("=" * 40)
    print()
    print(f"{Colors.GREEN}✅ Backend: {Colors.BOLD}http://localhost:3002{Colors.ENDC}")
    print(f"{Colors.CYAN}🔧 API: {Colors.BOLD}http://localhost:3002/api/health{Colors.ENDC}")
    print(f"{Colors.YELLOW}🌐 Frontend: {Colors.BOLD}http://localhost:3000{Colors.ENDC} (manual setup required)")
    print()
    print(f"{Colors.YELLOW}🔑 Test Users:{Colors.ENDC}")
    print("  📧 Admin: test@expenseflow.com / password123")
    print("  📧 Employee: david.kim@techcorp.com / test123")
    print("  📧 Manager: jennifer.smith@techcorp.com / test123")
    print()
    print(f"{Colors.BLUE}💡 Tip: The backend is running. Complete the frontend setup manually as shown above.{Colors.ENDC}")
    print()
    print(f"{Colors.YELLOW}Press Ctrl+C to stop the backend server{Colors.ENDC}")

def main():
    """Main function"""
    # Enable colors on Windows
    if os.name == 'nt':
        os.system('color')
    
    print(f"{Colors.CYAN}{Colors.BOLD}")
    print("🚀 ExpenseFlow Pro - Simple Starter")
    print("=" * 40)
    print(f"{Colors.ENDC}")
    
    backend_process = None
    
    try:
        # Step 1: Kill existing processes
        kill_existing_processes()
        
        # Step 2: Start backend
        backend_process = start_backend()
        if not backend_process:
            print_status("Cannot continue without backend", "error")
            return 1
            
        # Step 3: Wait for backend
        time.sleep(5)
        backend_ready = wait_for_backend()
        
        if backend_ready:
            print_status("Testing API endpoints...", "progress")
            # Test a few endpoints
            try:
                import requests
                response = requests.get("http://localhost:3002/api/categories", timeout=5)
                if response.status_code == 200:
                    print_status("Categories API: Working", "success")
                else:
                    print_status(f"Categories API: Status {response.status_code}", "warning")
            except:
                print_status("Categories API: Not responding", "warning")
        
        # Step 4: Frontend setup (manual instructions)
        start_frontend_manual()
        
        # Step 5: Open browser
        time.sleep(2)
        open_urls()
        
        # Step 6: Print summary and keep running
        print_summary()
        
        # Keep backend running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print_status("Shutdown requested", "warning")
        return 0
    except Exception as e:
        print_status(f"Error: {e}", "error")
        return 1
    finally:
        if backend_process:
            print_status("Stopping backend...", "progress")
            backend_process.terminate()
            try:
                backend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                backend_process.kill()
            print_status("Backend stopped", "success")

if __name__ == "__main__":
    sys.exit(main()) 