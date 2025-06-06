#!/usr/bin/env python3
"""
Simple ExpenseFlow Pro Starter
==============================
Run this script to start ExpenseFlow Pro automatically.
It will handle everything for you!
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    try:
        import requests
        print("✅ All dependencies available")
        return True
    except ImportError:
        print("📦 Installing required packages...")
        try:
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install', 'requests'
            ], stdout=subprocess.DEVNULL)
            print("✅ Dependencies installed")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install dependencies")
            print("Please run: pip install requests")
            return False

def main():
    """Main function"""
    print("🚀 ExpenseFlow Pro - Quick Starter")
    print("=" * 40)
    
    # Install dependencies
    if not install_requirements():
        return 1
        
    # Import and run the main starter
    try:
        from start_expenseflow import ExpenseFlowStarter, Colors
        
        # Enable colors on Windows
        if os.name == 'nt':
            os.system('color')
            
        starter = ExpenseFlowStarter()
        success = starter.run()
        
        if success:
            print(f"{Colors.GREEN}✅ ExpenseFlow Pro stopped successfully{Colors.ENDC}")
            return 0
        else:
            print(f"{Colors.RED}❌ ExpenseFlow Pro encountered errors{Colors.ENDC}")
            return 1
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure Node.js is installed")
        print("2. Make sure you're in the correct directory")
        print("3. Check that working-server.js exists")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 