# DevSecOps Dashboard Build Process Documentation

## Overview

The DevSecOps Dashboard frontend uses **Vite** for bundling and **Frappe's build system** for integration. The build process is fully automated and requires **zero manual intervention**.

## Build Architecture

### Components

1. **Vite Configuration** (`frontend/vite.config.js`)
   - Generates hashed asset filenames for cache busting
   - Outputs to `frappe_devsecops_dashboard/public/frontend/`
   - Generates manifest.json for asset tracking

2. **Build Script** (`frontend/build.py`)
   - Called by Frappe's build system
   - Runs `npm run build` to generate hashed assets
   - Extracts asset hashes from Vite manifest
   - Updates HTML template with fallback hashes

3. **HTML Template** (`frappe_devsecops_dashboard/www/devsecops-ui.html`)
   - Contains fallback hashes for production deployments
   - Dynamically loads assets via API endpoint
   - Includes CSRF token injection for Frappe integration

4. **API Endpoint** (`frappe_devsecops_dashboard/api/dashboard.py`)
   - `get_frontend_assets()` - Returns current asset hashes from manifest
   - Allows dynamic asset loading without page refresh

## Build Process Flow

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
    ├─ Extracts JS filename (e.g., index-Co09ymLZ.js)
    └─ Extracts CSS filename (e.g., index-ey4ZYeUq.css)
    ↓
[3/3] Update HTML template
    ├─ Reads www/devsecops-ui.html
    ├─ Updates FALLBACK_JS constant
    ├─ Updates FALLBACK_CSS constant
    └─ Writes updated HTML
    ↓
Build Complete ✓
```

## Asset Loading Strategy

The HTML template uses a **two-tier asset loading strategy**:

### Tier 1: API-Based Loading (Preferred)
```javascript
// Fetch current asset hashes from API
GET /api/method/frappe_devsecops_dashboard.api.dashboard.get_frontend_assets
```
- Reads from `.vite/manifest.json` on server
- Always gets latest asset hashes
- Works in production with cache busting

### Tier 2: Fallback Loading (Backup)
```javascript
// Use hardcoded fallback hashes
const FALLBACK_JS = 'index-Co09ymLZ.js';
const FALLBACK_CSS = 'index-ey4ZYeUq.css';
```
- Used if API call fails
- Automatically updated during build
- Ensures app loads even if API is unavailable

## Running the Build

### Automatic Build (Recommended)
```bash
# Build all apps
bench build

# Build specific app
bench build --app frappe_devsecops_dashboard
```

### Manual Build (Development)
```bash
cd apps/frappe_devsecops_dashboard/frontend
python build.py
```

### Development Mode
```bash
cd apps/frappe_devsecops_dashboard/frontend
npm run dev
```

## Build Output

### Generated Files

```
frappe_devsecops_dashboard/
├── public/frontend/
│   ├── .vite/
│   │   └── manifest.json          # Vite manifest with asset hashes
│   ├── assets/
│   │   ├── index-Co09ymLZ.js      # Hashed JavaScript bundle
│   │   └── index-ey4ZYeUq.css     # Hashed CSS bundle
│   ├── index.html                 # Built HTML (not used directly)
│   └── [other static assets]
│
└── www/
    └── devsecops-ui.html          # Updated with fallback hashes
```

### Manifest Structure

```json
{
  "index.html": {
    "file": "assets/index-Co09ymLZ.js",
    "name": "index",
    "src": "index.html",
    "isEntry": true,
    "css": ["assets/index-ey4ZYeUq.css"]
  }
}
```

## Configuration Files

### build.json
```json
{
  "build_command": "cd frontend && python build.py",
  "watch": [
    "frontend/src/**/*.js",
    "frontend/src/**/*.jsx",
    "frontend/src/**/*.css",
    "frontend/public/**/*"
  ]
}
```

### vite.config.js
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/assets/frappe_devsecops_dashboard/frontend/',
  build: {
    outDir: '../frappe_devsecops_dashboard/public/frontend',
    emptyOutDir: true,
    manifest: true,  // Generate manifest.json
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
```

## Troubleshooting

### Issue: Assets not loading
**Solution:**
1. Check if build completed successfully: `bench build --app frappe_devsecops_dashboard`
2. Verify manifest exists: `ls -la public/frontend/.vite/manifest.json`
3. Clear cache: `bench --site desk.kns.co.ke clear-cache`
4. Check browser console for errors

### Issue: Old assets still loading
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Clear Frappe cache: `bench --site desk.kns.co.ke clear-cache`

### Issue: Build fails
**Solution:**
1. Check npm dependencies: `cd frontend && npm install`
2. Check Node.js version: `node --version` (should be 16+)
3. Check build logs: `bench build --app frappe_devsecops_dashboard 2>&1 | tail -100`

## Production Deployment

### Deployment Steps

1. **Build the frontend**
   ```bash
   bench build --app frappe_devsecops_dashboard
   ```

2. **Verify assets**
   ```bash
   ls -la public/frontend/assets/
   cat public/frontend/.vite/manifest.json
   ```

3. **Clear cache**
   ```bash
   bench --site desk.kns.co.ke clear-cache
   ```

4. **Restart Frappe**
   ```bash
   bench restart
   ```

### Zero Manual Intervention

✓ No manual copying of bundle hashes  
✓ No manual editing of HTML files  
✓ No manual asset path updates  
✓ Fully automated via `bench build` command  

## Performance Considerations

- **Hash-based cache busting**: Assets are cached indefinitely with unique hashes
- **Lazy loading**: CSS and JS loaded dynamically after DOM ready
- **Fallback mechanism**: App loads even if API endpoint fails
- **Manifest caching**: Manifest.json is small and cached by browser

## Security

- CSRF token injected into page: `window.csrf_token='{{ frappe.session.csrf_token }}'`
- Assets served from Frappe's asset directory with proper permissions
- API endpoint protected with Frappe's permission system
- No sensitive data in asset filenames

## Future Enhancements

- [ ] Implement service worker for offline support
- [ ] Add asset compression (gzip/brotli)
- [ ] Implement code splitting for faster initial load
- [ ] Add build time metrics and reporting
- [ ] Implement CDN integration for asset delivery

