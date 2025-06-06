#!/usr/bin/env python3
"""
ExpenseFlow Pro - Complete Application Startup Script
=====================================================
This script handles everything needed to start ExpenseFlow Pro:
- Port conflict resolution
- Backend server startup  
- Frontend server startup
- Health checks and monitoring
- Environment setup
- Browser opening
"""

import os
import sys
import time
import subprocess
import requests
import threading
from pathlib import Path

# Simple colored output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    ENDC = '\033[0m'

class ExpenseFlowStarter:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.base_dir = Path.cwd()
        self.frontend_dir = self.base_dir / "frontend"
        
    def print_status(self, message, status="info"):
        colors = {
            "success": f"{Colors.GREEN}✅",
            "error": f"{Colors.RED}❌",
            "warning": f"{Colors.YELLOW}⚠️",
            "progress": f"{Colors.CYAN}🔄",
            "info": f"{Colors.BLUE}ℹ️"
        }
        icon = colors.get(status, f"{Colors.BLUE}ℹ️")
        print(f"{icon} {message}{Colors.ENDC}")
        
    def kill_existing_processes(self):
        """Kill existing Node.js processes"""
        self.print_status("Cleaning up existing processes...", "progress")
        try:
            # Windows
            if os.name == 'nt':
                subprocess.run(['taskkill', '/F', '/IM', 'node.exe'], 
                             capture_output=True, check=False)
                subprocess.run(['taskkill', '/F', '/IM', 'npm.exe'], 
                             capture_output=True, check=False)
            else:
                # Unix/Linux
                subprocess.run(['pkill', '-f', 'node'], check=False)
                subprocess.run(['pkill', '-f', 'npm'], check=False)
            
            time.sleep(2)
            self.print_status("Existing processes cleaned up", "success")
        except Exception as e:
            self.print_status(f"Process cleanup warning: {e}", "warning")
            
    def check_node_installed(self):
        """Check if Node.js is installed"""
        try:
            result = subprocess.run(['node', '--version'], 
                                  capture_output=True, text=True, check=True)
            self.print_status(f"Node.js version: {result.stdout.strip()}", "success")
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.print_status("Node.js not found! Please install Node.js first", "error")
            return False
            
        # Also check npm
        try:
            result = subprocess.run(['npm', '--version'], 
                                  capture_output=True, text=True, check=True)
            self.print_status(f"npm version: {result.stdout.strip()}", "success")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.print_status("npm not found! Please install npm or restart terminal", "error")
            return False
            
    def _get_npm_command(self):
        """Get the appropriate npm command for the system"""
        if os.name == 'nt':  # Windows
            return 'npm.cmd'
        return 'npm'
        
    def _try_alternative_install(self):
        """Try alternative methods to install dependencies"""
        try:
            # Try with .cmd extension on Windows
            if os.name == 'nt':
                subprocess.run(['npm.cmd', 'install'], 
                             cwd=self.frontend_dir, check=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                subprocess.run(['npm', 'install'], 
                             cwd=self.frontend_dir, check=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.print_status("Dependencies installed with alternative method", "success")
            return True
        except Exception as e:
            self.print_status(f"Alternative install failed: {e}", "error")
            self.print_status("Please manually run 'npm install' in the frontend directory", "warning")
            return True  # Continue anyway
            
    def _try_alternative_frontend_start(self):
        """Try alternative methods to start the frontend"""
        try:
            # Try with shell=True and full path
            if os.name == 'nt':
                self.frontend_process = subprocess.Popen(
                    'npm.cmd run dev',
                    cwd=self.frontend_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    shell=True
                )
            else:
                self.frontend_process = subprocess.Popen(
                    'npm run dev',
                    cwd=self.frontend_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    shell=True
                )
            self.print_status("Frontend started with alternative method", "success")
            return True
        except Exception as e:
            self.print_status(f"Alternative frontend start failed: {e}", "error")
            self.print_status("Please manually run 'npm run dev' in the frontend directory", "warning")
            return False

    def create_env_file(self):
        """Create environment file for frontend"""
        env_file = self.frontend_dir / ".env.local"
        if not env_file.exists():
            env_content = '''NEXT_PUBLIC_APP_NAME="ExpenseFlow Pro"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3002"
NODE_ENV="development"
NEXT_PUBLIC_FEATURE_OCR="true"
NEXT_PUBLIC_FEATURE_NOTIFICATIONS="true"
NEXT_PUBLIC_FEATURE_ANALYTICS="true"
'''
            env_file.write_text(env_content)
            self.print_status("Created environment file", "success")
        else:
            self.print_status("Environment file exists", "success")
            
    def start_backend(self):
        """Start the backend server"""
        self.print_status("Starting backend server...", "progress")
        
        backend_file = self.base_dir / "working-server.js"
        if not backend_file.exists():
            self.print_status("Backend file 'working-server.js' not found!", "error")
            return False
            
        try:
            # Start backend in background
            self.backend_process = subprocess.Popen(
                ['node', str(backend_file)],
                cwd=self.base_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            self.print_status("Backend starting on http://localhost:3002", "success")
            return True
        except Exception as e:
            self.print_status(f"Failed to start backend: {e}", "error")
            return False
            
    def start_frontend(self):
        """Start the frontend server"""
        self.print_status("Starting frontend server...", "progress")
        
        if not self.frontend_dir.exists():
            self.print_status("Frontend directory not found!", "error")
            return False
            
        # Install dependencies if needed
        node_modules = self.frontend_dir / "node_modules"
        if not node_modules.exists():
            self.print_status("Installing frontend dependencies...", "progress")
            try:
                # Try different npm commands
                npm_cmd = self._get_npm_command()
                subprocess.run([npm_cmd, 'install'], 
                             cwd=self.frontend_dir, check=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                self.print_status("Dependencies installed", "success")
            except subprocess.CalledProcessError as e:
                self.print_status(f"Failed to install dependencies: {e}", "error")
                return False
            except FileNotFoundError:
                self.print_status("npm command not found - trying alternative methods", "warning")
                return self._try_alternative_install()
                
        try:
            # Start frontend
            npm_cmd = self._get_npm_command()
            self.frontend_process = subprocess.Popen(
                [npm_cmd, 'run', 'dev'],
                cwd=self.frontend_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                shell=True  # Use shell on Windows
            )
            self.print_status("Frontend starting on http://localhost:3000", "success")
            return True
        except Exception as e:
            self.print_status(f"Failed to start frontend: {e}", "error")
            self.print_status("Trying alternative startup method...", "progress")
            return self._try_alternative_frontend_start()
            
    def wait_for_service(self, url, name, timeout=60):
        """Wait for a service to respond"""
        self.print_status(f"Waiting for {name}...", "progress")
        
        for i in range(timeout):
            try:
                response = requests.get(url, timeout=3)
                if response.status_code == 200:
                    self.print_status(f"{name} is ready!", "success")
                    return True
            except requests.exceptions.RequestException:
                pass
            time.sleep(1)
            
        self.print_status(f"{name} did not start in {timeout}s", "warning")
        return False
        
    def test_endpoints(self):
        """Test some key API endpoints"""
        self.print_status("Testing API endpoints...", "progress")
        
        endpoints = {
            "http://localhost:3002/api/health": "Health Check",
            "http://localhost:3002/api/categories": "Categories API"
        }
        
        for url, name in endpoints.items():
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    self.print_status(f"{name}: Working", "success")
                else:
                    self.print_status(f"{name}: Status {response.status_code}", "warning")
            except requests.exceptions.RequestException:
                self.print_status(f"{name}: Not responding", "error")
                
    def open_browser(self):
        """Open the application in browser"""
        try:
            import webbrowser
            webbrowser.open("http://localhost:3000")
            self.print_status("Browser opened", "success")
        except Exception as e:
            self.print_status(f"Could not open browser: {e}", "warning")
            
    def monitor_processes(self):
        """Monitor the processes in background"""
        def monitor():
            while True:
                time.sleep(10)
                if self.backend_process and self.backend_process.poll() is not None:
                    self.print_status("Backend process stopped!", "error")
                if self.frontend_process and self.frontend_process.poll() is not None:
                    self.print_status("Frontend process stopped!", "error")
                    
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
        
    def cleanup(self):
        """Clean up processes"""
        self.print_status("Shutting down...", "progress")
        
        if self.backend_process:
            self.backend_process.terminate()
            try:
                self.backend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
                
        if self.frontend_process:
            self.frontend_process.terminate()
            try:
                self.frontend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
                
        self.print_status("Cleanup completed", "success")
        
    def print_summary(self):
        """Print running summary"""
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ExpenseFlow Pro is running!{Colors.ENDC}")
        print("=" * 50)
        print(f"{Colors.CYAN}📱 Frontend: {Colors.BOLD}http://localhost:3000{Colors.ENDC}")
        print(f"{Colors.CYAN}🔧 Backend:  {Colors.BOLD}http://localhost:3002{Colors.ENDC}")
        print(f"{Colors.CYAN}💚 Health:   {Colors.BOLD}http://localhost:3002/api/health{Colors.ENDC}")
        print(f"\n{Colors.YELLOW}🔑 Test Users:{Colors.ENDC}")
        print("  📧 Admin: test@expenseflow.com / password123")
        print("  📧 Employee: david.kim@techcorp.com / test123")
        print("  📧 Manager: jennifer.smith@techcorp.com / test123")
        print(f"\n{Colors.YELLOW}Press Ctrl+C to stop all servers{Colors.ENDC}")
        
    def run(self):
        """Main run method"""
        print(f"{Colors.CYAN}{Colors.BOLD}")
        print("🚀 ExpenseFlow Pro - Python Startup")
        print("=" * 40)
        print(f"{Colors.ENDC}")
        
        try:
            # Step 1: Check Node.js
            if not self.check_node_installed():
                return False
                
            # Step 2: Kill existing processes
            self.kill_existing_processes()
            
            # Step 3: Setup environment
            self.create_env_file()
            
            # Step 4: Start backend
            if not self.start_backend():
                return False
                
            # Step 5: Wait for backend
            time.sleep(5)  # Give backend time to start
            if not self.wait_for_service("http://localhost:3002/api/health", "Backend", 30):
                self.print_status("Backend may need more time", "warning")
                
            # Step 6: Test endpoints
            self.test_endpoints()
            
            # Step 7: Start frontend
            if not self.start_frontend():
                return False
                
            # Step 8: Wait for frontend
            time.sleep(8)  # Give frontend time to start
            if not self.wait_for_service("http://localhost:3000", "Frontend", 45):
                self.print_status("Frontend may need more time", "warning")
                
            # Step 9: Start monitoring
            self.monitor_processes()
            
            # Step 10: Open browser
            time.sleep(2)
            self.open_browser()
            
            # Step 11: Print summary
            self.print_summary()
            
            # Keep running until Ctrl+C
            while True:
                time.sleep(1)
                
        except KeyboardInterrupt:
            self.print_status("Shutdown requested", "warning")
            return True
        except Exception as e:
            self.print_status(f"Error: {e}", "error")
            return False
        finally:
            self.cleanup()

def main():
    """Entry point"""
    # Enable colors on Windows
    if os.name == 'nt':
        os.system('color')
        
    # Install requests if not available
    try:
        import requests
    except ImportError:
        print("Installing requests library...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'requests'])
        import requests
        
    starter = ExpenseFlowStarter()
    success = starter.run()
    
    if success:
        print(f"{Colors.GREEN}ExpenseFlow Pro stopped successfully{Colors.ENDC}")
    else:
        print(f"{Colors.RED}ExpenseFlow Pro encountered errors{Colors.ENDC}")
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main()) 