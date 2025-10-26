#!/usr/bin/env python3
"""
Build script for frappe_devsecops_dashboard app
This script is called by Frappe's build system via build.json
"""

import os
import subprocess
import sys
from datetime import datetime

def main():
    """Main build function"""
    try:
        # Get the directory where this script is located
        app_root = os.path.dirname(os.path.abspath(__file__))

        # Path to the frontend build script
        frontend_build_script = os.path.join(app_root, "frontend", "build.py")

        if not os.path.exists(frontend_build_script):
            print(f"Error: Frontend build script not found at {frontend_build_script}")
            return 1

        print("=" * 60)
        print(f"Building frappe_devsecops_dashboard at {datetime.now().isoformat()}")
        print("=" * 60)
        sys.stdout.flush()

        # Execute the frontend build script
        # Use sys.executable to ensure we use the same Python interpreter
        result = subprocess.run(
            [sys.executable, frontend_build_script],
            cwd=app_root,
            capture_output=False,
            text=True,
            env={**os.environ, 'PYTHONUNBUFFERED': '1'}
        )

        if result.returncode != 0:
            print(f"Error: Frontend build script failed with return code {result.returncode}")
            return 1

        print("=" * 60)
        print(f"Build completed successfully at {datetime.now().isoformat()}")
        print("=" * 60)
        sys.stdout.flush()
        return 0

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

