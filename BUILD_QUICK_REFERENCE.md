# Build Quick Reference Guide

## Standard Build Commands

### Production Build
```bash
# Build the app (automatic asset hash injection)
bench build --app frappe_devsecops_dashboard

# Clear cache
bench --site desk.kns.co.ke clear-cache

# Restart Frappe
bench restart
```

### Development Build
```bash
# Start development server with hot reload
cd apps/frappe_devsecops_dashboard/frontend
npm run dev
```

### Manual Build (if needed)
```bash
# Run build script directly
cd apps/frappe_devsecops_dashboard/frontend
python build.py
```

## Verification Commands

### Check Build Output
```bash
# View generated assets
ls -lh apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/public/frontend/assets/

# View Vite manifest
cat apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/public/frontend/.vite/manifest.json

# View HTML fallback hashes
grep "FALLBACK_" apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/www/devsecops-ui.html
```

### Verify Hash Synchronization
```bash
# Extract JS hash from manifest
MANIFEST_JS=$(cat apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/public/frontend/.vite/manifest.json | grep '"file"' | grep -o 'index-[^"]*\.js')

# Extract JS hash from HTML
HTML_JS=$(grep "FALLBACK_JS" apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/www/devsecops-ui.html | grep -o "index-[^']*\.js")

# Compare
echo "Manifest: $MANIFEST_JS"
echo "HTML: $HTML_JS"
```

### Check API Endpoint
```bash
# Test get_frontend_assets endpoint
curl -s "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.dashboard.get_frontend_assets" | python -m json.tool
```

## Troubleshooting Commands

### Clear All Caches
```bash
# Clear Frappe cache
bench --site desk.kns.co.ke clear-cache

# Clear Redis cache
redis-cli FLUSHALL

# Clear browser cache (manual)
# Ctrl+Shift+Delete in browser
```

### Check Build Logs
```bash
# View full build output
bench build --app frappe_devsecops_dashboard 2>&1 | tee build.log

# View Frappe logs
bench logs -f

# View specific app logs
tail -f ~/.local/share/frappe/logs/frappe.log
```

### Verify Assets Load
```bash
# Check if assets are accessible
curl -I "http://localhost:8000/assets/frappe_devsecops_dashboard/frontend/assets/index-Co09ymLZ.js"

# Check if CSS loads
curl -I "http://localhost:8000/assets/frappe_devsecops_dashboard/frontend/assets/index-ey4ZYeUq.css"
```

### Rebuild from Scratch
```bash
# Clean build
cd apps/frappe_devsecops_dashboard/frontend
rm -rf dist node_modules
npm install
npm run build

# Or use the build script
python build.py
```

## File Locations

### Source Files
```
apps/frappe_devsecops_dashboard/
├── frontend/
│   ├── src/                    # React source code
│   ├── package.json            # Dependencies
│   ├── vite.config.js          # Vite configuration
│   └── build.py                # Build script
└── frappe_devsecops_dashboard/
    ├── www/
    │   └── devsecops-ui.html   # HTML template
    ├── api/
    │   └── dashboard.py        # API endpoints
    └── public/
        └── frontend/           # Built assets
```

### Generated Files
```
frappe_devsecops_dashboard/public/frontend/
├── .vite/
│   └── manifest.json           # Vite manifest with hashes
├── assets/
│   ├── index-Co09ymLZ.js       # Hashed JS bundle
│   └── index-ey4ZYeUq.css      # Hashed CSS bundle
├── index.html                  # Built HTML (not used)
└── [static assets]             # Favicons, SVG, etc.
```

## Build Process Overview

```
bench build --app frappe_devsecops_dashboard
    ↓
Frappe reads build.json
    ↓
Executes: cd frontend && python build.py
    ↓
[1/3] npm run build
    ├─ Vite generates hashed assets
    ├─ Creates .vite/manifest.json
    └─ Outputs to public/frontend/
    ↓
[2/3] Extract asset hashes
    ├─ Reads .vite/manifest.json
    ├─ Extracts JS: index-Co09ymLZ.js
    └─ Extracts CSS: index-ey4ZYeUq.css
    ↓
[3/3] Update HTML template
    ├─ Reads www/devsecops-ui.html
    ├─ Updates FALLBACK_JS
    ├─ Updates FALLBACK_CSS
    └─ Writes updated HTML
    ↓
✓ Build Complete
```

## Asset Loading Flow

```
Browser loads /devsecops-ui
    ↓
HTML loads with fallback hashes
    ↓
JavaScript runs loadAssets()
    ↓
Try: Fetch /api/method/.../get_frontend_assets
    ├─ Success: Use API hashes
    └─ Failure: Use fallback hashes
    ↓
Load CSS: /assets/frappe_devsecops_dashboard/frontend/assets/index-ey4ZYeUq.css
    ↓
Load JS: /assets/frappe_devsecops_dashboard/frontend/assets/index-Co09ymLZ.js
    ↓
React app initializes
    ↓
✓ App Ready
```

## Common Issues & Solutions

### Issue: Assets not loading
```bash
# Solution 1: Clear cache
bench --site desk.kns.co.ke clear-cache

# Solution 2: Rebuild
bench build --app frappe_devsecops_dashboard

# Solution 3: Check manifest
cat public/frontend/.vite/manifest.json
```

### Issue: Old assets still loading
```bash
# Solution 1: Hard refresh browser
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)

# Solution 2: Clear browser cache
# Ctrl+Shift+Delete

# Solution 3: Clear Frappe cache
bench --site desk.kns.co.ke clear-cache
```

### Issue: Build fails
```bash
# Solution 1: Check dependencies
cd frontend && npm install

# Solution 2: Check Node version
node --version  # Should be 16+

# Solution 3: View full error
bench build --app frappe_devsecops_dashboard 2>&1 | tail -100
```

### Issue: Hashes not updating
```bash
# Solution 1: Check manifest
cat public/frontend/.vite/manifest.json

# Solution 2: Check HTML
grep FALLBACK_ www/devsecops-ui.html

# Solution 3: Rebuild
cd frontend && python build.py
```

## Performance Tips

1. **Cache busting**: Hashes change on every build, forcing browser to fetch new assets
2. **Lazy loading**: CSS and JS loaded after DOM ready
3. **Fallback mechanism**: App loads even if API fails
4. **Manifest caching**: Small manifest.json cached by browser

## Security Notes

- CSRF token injected: `window.csrf_token='{{ frappe.session.csrf_token }}'`
- Assets served from Frappe's asset directory with proper permissions
- API endpoint protected with Frappe's permission system
- No sensitive data in asset filenames

## Documentation

- **BUILD_PROCESS_DOCUMENTATION.md** - Comprehensive guide
- **BUILD_AUTOMATION_SUMMARY.md** - Implementation details
- **BUILD_VERIFICATION_CHECKLIST.md** - Verification items
- **BUILD_QUICK_REFERENCE.md** - This file

## Support

For detailed information, see:
- `BUILD_PROCESS_DOCUMENTATION.md` - Full documentation
- `BUILD_AUTOMATION_SUMMARY.md` - Implementation details
- Frappe logs: `bench logs -f`

