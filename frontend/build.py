#!/usr/bin/env python3
"""
Build script for DevSecOps Dashboard frontend
This script is called by Frappe's build system

Features:
- Runs Vite build to generate hashed assets
- Reads Vite manifest.json to get correct asset filenames
- Updates HTML template with fallback hashes for production
- Ensures CSRF token is properly injected
"""

import os
import subprocess
import json
from pathlib import Path

def build():
    """Main build function called by Frappe"""
    try:
        print("=" * 60)
        print("Building DevSecOps Dashboard frontend...")
        print("=" * 60)

        # Get the current directory (should be frontend/)
        frontend_dir = os.path.dirname(os.path.abspath(__file__))

        # Change to frontend directory
        original_cwd = os.getcwd()
        os.chdir(frontend_dir)

        try:
            # Run npm build
            print("\n[1/3] Running npm build...")
            result = subprocess.run(["npm", "run", "build"],
                                  capture_output=True, text=True, check=True)
            print("✓ Build completed successfully")

            # Extract asset hashes from Vite manifest
            print("\n[2/3] Extracting asset hashes from Vite manifest...")
            js_file, css_file = extract_asset_hashes()

            if js_file:
                print(f"✓ Found JS file: {js_file}")
            if css_file:
                print(f"✓ Found CSS file: {css_file}")

            # Update HTML template with fallback hashes
            print("\n[3/3] Updating HTML template with fallback hashes...")
            update_html_template(js_file, css_file)
            print("✓ HTML template updated")

            print("\n" + "=" * 60)
            print("Frontend build completed successfully!")
            print("=" * 60)
            return True

        except subprocess.CalledProcessError as e:
            print(f"\n✗ Build failed: {e}")
            print(f"Error output: {e.stderr}")
            return False
        finally:
            os.chdir(original_cwd)

    except Exception as e:
        print(f"\n✗ Build error: {e}")
        import traceback
        traceback.print_exc()
        return False

def extract_asset_hashes():
    """
    Extract JS and CSS file hashes from Vite manifest.json

    Returns:
        tuple: (js_filename, css_filename) or (None, None) if not found
    """
    try:
        # Path to Vite manifest
        manifest_path = "../frappe_devsecops_dashboard/public/frontend/.vite/manifest.json"

        if not os.path.exists(manifest_path):
            print(f"Warning: Manifest not found at {manifest_path}")
            return None, None

        with open(manifest_path, 'r') as f:
            manifest = json.load(f)

        # Extract from index.html entry
        if "index.html" in manifest:
            entry = manifest["index.html"]

            # Get JS file
            js_file = entry.get("file")

            # Get CSS file (first one if multiple)
            css_file = None
            css_files = entry.get("css", [])
            if css_files:
                css_file = css_files[0]

            # Remove 'assets/' prefix if present (we'll add it in HTML)
            if js_file and js_file.startswith("assets/"):
                js_file = js_file[7:]  # Remove 'assets/' prefix
            if css_file and css_file.startswith("assets/"):
                css_file = css_file[7:]  # Remove 'assets/' prefix

            return js_file, css_file

        return None, None

    except Exception as e:
        print(f"Error reading manifest: {e}")
        return None, None

def update_html_template(js_file, css_file):
    """
    Update HTML template with fallback asset hashes

    Args:
        js_file (str): JavaScript filename with hash
        css_file (str): CSS filename with hash
    """
    try:
        dest_html = "../frappe_devsecops_dashboard/www/devsecops-ui.html"

        if not os.path.exists(dest_html):
            print(f"Warning: HTML template not found at {dest_html}")
            return

        # Read current HTML
        with open(dest_html, 'r') as f:
            html_content = f.read()

        # Update fallback hashes if we have new ones
        if js_file:
            # Replace FALLBACK_JS value
            html_content = replace_fallback_hash(html_content, 'FALLBACK_JS', js_file)

        if css_file:
            # Replace FALLBACK_CSS value
            html_content = replace_fallback_hash(html_content, 'FALLBACK_CSS', css_file)

        # Ensure CSRF token script is present
        if "window.csrf_token" not in html_content:
            csrf_script = "    <script>window.csrf_token='{{ frappe.session.csrf_token }}'</script>"
            html_content = html_content.replace('</body>', f'{csrf_script}\n  </body>')

        # Write updated HTML
        with open(dest_html, 'w') as f:
            f.write(html_content)

        print(f"Updated HTML template at {dest_html}")

    except Exception as e:
        print(f"Error updating HTML template: {e}")

def replace_fallback_hash(html_content, var_name, new_value):
    """
    Replace fallback hash value in HTML

    Args:
        html_content (str): HTML content
        var_name (str): Variable name (e.g., 'FALLBACK_JS')
        new_value (str): New value for the hash

    Returns:
        str: Updated HTML content
    """
    import re

    # Pattern to match: const FALLBACK_JS = 'index-xxxxx.js';
    pattern = rf"const {var_name} = '[^']*';"
    replacement = f"const {var_name} = '{new_value}';"

    return re.sub(pattern, replacement, html_content)

if __name__ == "__main__":
    success = build()
    exit(0 if success else 1)
