#!/usr/bin/env python3
"""
Build script for DevSecOps Dashboard frontend
This script is called by Frappe's build system
"""

import os
import subprocess
import shutil
import re
from pathlib import Path

def build():
    """Main build function called by Frappe"""
    try:
        print("Building DevSecOps Dashboard frontend...")
        
        # Get the current directory (should be frontend/)
        frontend_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Change to frontend directory
        original_cwd = os.getcwd()
        os.chdir(frontend_dir)
        
        try:
            # Run npm build
            print("Running npm build...")
            result = subprocess.run(["npm", "run", "build"], 
                                  capture_output=True, text=True, check=True)
            print("Build output:", result.stdout)
            
            # Copy HTML file to www directory
            copy_html_to_www()
            
            print("Frontend build completed successfully!")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"Build failed: {e}")
            print(f"Error output: {e.stderr}")
            return False
        finally:
            os.chdir(original_cwd)
            
    except Exception as e:
        print(f"Build error: {e}")
        return False

def copy_html_to_www():
    """Copy built HTML to www directory with proper template variables"""
    # Source: built HTML file
    source_html = "../frappe_devsecops_dashboard/public/frontend/index.html"
    
    # Destination: www directory  
    dest_html = "../frappe_devsecops_dashboard/www/devsecops-ui.html"
    
    if os.path.exists(source_html):
        # Read source HTML
        with open(source_html, 'r') as f:
            html_content = f.read()
        
        # Ensure CSRF token script is present
        if "window.csrf_token" not in html_content:
            # Add CSRF token script before closing body tag
            csrf_script = "    <script>window.csrf_token='{{ frappe.session.csrf_token }}'</script>"
            html_content = html_content.replace('</body>', f'{csrf_script}\n  </body>')
        
        # Write to destination
        with open(dest_html, 'w') as f:
            f.write(html_content)
        
        print(f"Copied HTML from {source_html} to {dest_html}")
    else:
        print(f"Warning: Source HTML not found at {source_html}")

if __name__ == "__main__":
    success = build()
    exit(0 if success else 1)
