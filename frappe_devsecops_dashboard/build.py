import os
import subprocess
import shutil
import re
from pathlib import Path
import frappe

def before_build():
    """Build frontend assets before Frappe build process"""
    try:
        build_frontend_assets()
    except Exception as e:
        frappe.log_error(f"Frontend build failed: {str(e)}", "DevSecOps Dashboard Build Error")
        print(f"Warning: Frontend build failed: {str(e)}")

def after_build():
    """Post-build cleanup and verification"""
    try:
        verify_build_assets()
    except Exception as e:
        frappe.log_error(f"Build verification failed: {str(e)}", "DevSecOps Dashboard Build Verification")
        print(f"Warning: Build verification failed: {str(e)}")

def build_frontend_assets():
    """Build the React frontend using Vite"""
    app_path = frappe.get_app_path("frappe_devsecops_dashboard")
    frontend_path = os.path.join(app_path, "frontend")
    
    if not os.path.exists(frontend_path):
        print("Frontend directory not found, skipping frontend build")
        return
    
    print("Building DevSecOps Dashboard frontend assets...")
    
    # Change to frontend directory
    original_cwd = os.getcwd()
    os.chdir(frontend_path)
    
    try:
        # Check if node_modules exists
        if not os.path.exists("node_modules"):
            print("Installing frontend dependencies...")
            subprocess.run(["npm", "install"], check=True)
        
        # Build the frontend
        print("Building frontend with Vite...")
        subprocess.run([
            "npx", "vite", "build", 
            "--base=/assets/frappe_devsecops_dashboard/frontend/"
        ], check=True)
        
        # Copy the built index.html to www directory
        copy_html_to_www()
        
        print("Frontend build completed successfully")
        
    except subprocess.CalledProcessError as e:
        raise Exception(f"Frontend build command failed: {e}")
    except Exception as e:
        raise Exception(f"Frontend build error: {e}")
    finally:
        os.chdir(original_cwd)

def copy_html_to_www():
    """Copy the built HTML file to www directory and update asset references"""
    app_path = frappe.get_app_path("frappe_devsecops_dashboard")
    
    # Source: built HTML file
    source_html = os.path.join(app_path, "frappe_devsecops_dashboard", "public", "frontend", "index.html")
    
    # Destination: www directory
    dest_html = os.path.join(app_path, "frappe_devsecops_dashboard", "www", "devsecops-ui.html")
    
    if os.path.exists(source_html):
        # Read the source HTML
        with open(source_html, 'r') as f:
            html_content = f.read()
        
        # Add Frappe-specific template variables
        html_content = add_frappe_template_vars(html_content)
        
        # Write to destination
        with open(dest_html, 'w') as f:
            f.write(html_content)
        
        print(f"Copied HTML from {source_html} to {dest_html}")
    else:
        print(f"Warning: Source HTML file not found at {source_html}")

def add_frappe_template_vars(html_content):
    """Add Frappe template variables to HTML content"""
    # Add CSRF token script before closing body tag
    csrf_script = """    <script>window.csrf_token='{{ frappe.session.csrf_token }}'</script>"""
    
    # Replace the closing body tag with CSRF script + closing body tag
    html_content = html_content.replace('</body>', f'{csrf_script}\n  </body>')
    
    return html_content

def verify_build_assets():
    """Verify that build assets exist and are properly referenced"""
    app_path = frappe.get_app_path("frappe_devsecops_dashboard")
    
    # Check if assets directory exists
    assets_dir = os.path.join(app_path, "frappe_devsecops_dashboard", "public", "frontend", "assets")
    if not os.path.exists(assets_dir):
        raise Exception("Assets directory not found after build")
    
    # Check if HTML file exists
    html_file = os.path.join(app_path, "frappe_devsecops_dashboard", "www", "devsecops-ui.html")
    if not os.path.exists(html_file):
        raise Exception("HTML file not found in www directory")
    
    # Verify asset references in HTML
    with open(html_file, 'r') as f:
        html_content = f.read()
    
    # Extract asset references
    js_matches = re.findall(r'src="[^"]*assets/([^"]*\.js)"', html_content)
    css_matches = re.findall(r'href="[^"]*assets/([^"]*\.css)"', html_content)
    
    # Check if referenced assets exist
    for js_file in js_matches:
        js_path = os.path.join(assets_dir, js_file)
        if not os.path.exists(js_path):
            raise Exception(f"Referenced JS file not found: {js_file}")
    
    for css_file in css_matches:
        css_path = os.path.join(assets_dir, css_file)
        if not os.path.exists(css_path):
            raise Exception(f"Referenced CSS file not found: {css_file}")
    
    print("Build verification completed successfully")

def get_frontend_build_command():
    """Get the appropriate build command for the frontend"""
    app_path = frappe.get_app_path("frappe_devsecops_dashboard")
    frontend_path = os.path.join(app_path, "frontend")
    package_json = os.path.join(frontend_path, "package.json")
    
    if os.path.exists(package_json):
        # Check if yarn.lock exists (prefer yarn over npm)
        if os.path.exists(os.path.join(frontend_path, "yarn.lock")):
            return ["yarn", "build"]
        else:
            return ["npm", "run", "build"]
    
    # Fallback to direct vite command
    return ["npx", "vite", "build", "--base=/assets/frappe_devsecops_dashboard/frontend/"]

def clean_build_artifacts():
    """Clean up build artifacts"""
    app_path = frappe.get_app_path("frappe_devsecops_dashboard")
    
    # Clean up any temporary build files
    temp_dirs = [
        os.path.join(app_path, "frontend", "dist"),
        os.path.join(app_path, "frontend", ".vite"),
    ]
    
    for temp_dir in temp_dirs:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"Cleaned up {temp_dir}")
