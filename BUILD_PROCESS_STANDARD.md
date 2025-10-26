# Frontend Build Process - Standard Approach

## 📋 Overview

The standard build process for the DevSecOps Dashboard frontend has been updated to use `bench migrate` instead of `npm run build` directly.

## ✅ Why Use `bench migrate`?

1. **Comprehensive Build:** Handles both frontend asset building and database migrations
2. **Consistency:** Ensures all Frappe apps are built together
3. **Asset Management:** Properly manages asset hashing and manifest files
4. **Database Sync:** Keeps database schema in sync with DocType definitions
5. **Official Frappe Method:** This is the recommended approach in Frappe framework

## 🚀 Standard Build Process

### Step 1: Build Frontend Assets
```bash
cd /home/erpuser/frappe-bench
bench migrate
```

**What this does:**
- Runs frontend build scripts for all apps
- Generates hashed asset files
- Updates manifest.json
- Runs database migrations
- Rebuilds search index

**Expected Output:**
```
Frontend build script completed successfully
============================================================
Queued rebuilding of search index for desk.kns.co.ke
```

### Step 2: Clear Cache
```bash
bench --site desk.kns.co.ke clear-cache
```

**What this does:**
- Clears Redis cache
- Clears browser cache headers
- Ensures new assets are loaded

### Step 3: Verify Build
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page (Ctrl+F5 for hard refresh)
4. Check that assets are loading (should see .js and .css files)
5. Check console for any errors

## 📝 Complete Build Workflow

```bash
# 1. Navigate to bench directory
cd /home/erpuser/frappe-bench

# 2. Run migrations (includes frontend build)
bench migrate

# 3. Clear cache
bench --site desk.kns.co.ke clear-cache

# 4. Verify in browser
# Open https://desk.kns.co.ke/app/devsecops-dashboard
# Check browser console for errors
```

## ⚠️ When to Use `bench migrate`

Use `bench migrate` when:
- ✅ Making frontend changes (React components, CSS, JavaScript)
- ✅ Making backend changes (Python API endpoints)
- ✅ Adding new DocTypes or modifying existing ones
- ✅ Deploying to production
- ✅ After pulling code changes from git

## ⚠️ When NOT to Use `npm run build`

**Don't use** `npm run build` directly because:
- ❌ It doesn't update the Frappe manifest
- ❌ It doesn't handle asset hashing properly
- ❌ It doesn't run database migrations
- ❌ It may cause asset loading issues
- ❌ It's not the official Frappe approach

## 🔄 Development Workflow

### For Quick Frontend Changes
```bash
# 1. Make your changes to React components
# 2. Run bench migrate
bench migrate

# 3. Clear cache
bench --site desk.kns.co.ke clear-cache

# 4. Hard refresh browser (Ctrl+F5)
```

### For Backend Changes
```bash
# 1. Make your changes to Python API
# 2. Run bench migrate
bench migrate

# 3. Clear cache
bench --site desk.kns.co.ke clear-cache

# 4. Test the API endpoint
```

### For DocType Changes
```bash
# 1. Modify the DocType JSON file
# 2. Run bench migrate
bench migrate

# 3. Clear cache
bench --site desk.kns.co.ke clear-cache

# 4. Verify in Frappe UI
```

## 📊 Build Output Interpretation

### Successful Build
```
Frontend build script completed successfully
============================================================
Queued rebuilding of search index for desk.kns.co.ke
```
✅ All good! Assets are built and ready.

### Build with Warnings
```
(!) Some chunks are larger than 500 kB after minification
```
⚠️ Performance warning - code splitting may be needed, but build is successful.

### Build Failure
```
error: ...
```
❌ Build failed - check error message and fix the issue.

## 🔍 Troubleshooting

### Issue: Assets not loading after build
**Solution:**
1. Run `bench --site desk.kns.co.ke clear-cache`
2. Hard refresh browser (Ctrl+F5)
3. Check Network tab for 404 errors

### Issue: Old assets still loading
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Clear Redis cache: `bench --site desk.kns.co.ke clear-cache`
3. Hard refresh (Ctrl+F5)

### Issue: Build takes too long
**Solution:**
- This is normal for first build
- Subsequent builds are faster
- Check system resources (CPU, RAM, disk space)

### Issue: "Frontend build script completed successfully" but assets not updated
**Solution:**
1. Verify manifest.json was updated: `ls -la apps/frappe_devsecops_dashboard/public/frontend/.vite/manifest.json`
2. Check asset files exist: `ls -la apps/frappe_devsecops_dashboard/public/frontend/assets/`
3. Run cache clear again

## 📚 Related Files

- **Frontend Config:** `apps/frappe_devsecops_dashboard/frontend/vite.config.js`
- **Build Script:** `apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/build.py`
- **Assets Location:** `apps/frappe_devsecops_dashboard/public/frontend/`
- **Manifest:** `apps/frappe_devsecops_dashboard/public/frontend/.vite/manifest.json`

## ✨ Summary

**Always use:** `bench migrate` for building frontend assets
**Never use:** `npm run build` directly
**Always follow with:** `bench --site desk.kns.co.ke clear-cache`
**Always verify:** Check browser console for errors

This ensures consistent, reliable builds that work properly with Frappe framework.

