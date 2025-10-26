import os
import subprocess
import shutil
import re
import sys
import frappe

def before_build():
    """Build frontend assets before Frappe build process"""
    try:
        call_frontend_build_script()
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

def call_frontend_build_script():
    """Call the frontend/build.py script to build and update assets"""
    # Get the app path - frappe.get_app_path returns the app directory
    # which is the frappe_devsecops_dashboard subdirectory, so we need to go up one level
    try:
        app_path = frappe.get_app_path("frappe_devsecops_dashboard")
        # Go up one level to get the actual app root
        app_path = os.path.dirname(app_path)
    except:
        # Fallback: use the parent directory of this file
        app_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    build_script = os.path.join(app_path, "frontend", "build.py")

    if not os.path.exists(build_script):
        print(f"Frontend build script not found at {build_script}")
        print(f"App path: {app_path}")
        print(f"Available files: {os.listdir(app_path) if os.path.exists(app_path) else 'N/A'}")
        return

    print("=" * 60)
    print("Executing frontend build script...")
    print("=" * 60)

    try:
        # Execute the build.py script using the current Python interpreter
        result = subprocess.run(
            [sys.executable, build_script],
            capture_output=True,
            text=True,
            check=False
        )

        # Print the output
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr)

        # Check if build was successful
        if result.returncode != 0:
            raise Exception(f"Frontend build script failed with return code {result.returncode}")

        print("=" * 60)
        print("Frontend build script completed successfully")
        print("=" * 60)

    except Exception as e:
        raise Exception(f"Failed to execute frontend build script: {e}")

def build_frontend_assets():
    """Build the React frontend using Vite (legacy method)"""
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

        # Build the frontend using npm run build
        print("Building frontend with npm run build...")
        subprocess.run(["npm", "run", "build"], check=True)

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

def run_frontend_build():
    """
    Run frontend build after migration.
    This ensures the frontend assets are always up-to-date after database migrations.
    Errors are logged but don't fail the migration.

    This function is called as a Frappe after_migrate hook and directly invokes
    the existing call_frontend_build_script() function.
    """
    try:
        frappe.logger().info("Starting DevSecOps Dashboard frontend build after migration...")

        # Call the existing frontend build script function
        # This function handles all the build logic and error reporting
        call_frontend_build_script()

        frappe.logger().info("DevSecOps Dashboard frontend build completed successfully after migration")

    except Exception as e:
        # Log the error but don't fail the migration
        frappe.log_error(
            f"Frontend build failed after migration: {str(e)}",
            "DevSecOps Dashboard Post-Migration Build Error"
        )
