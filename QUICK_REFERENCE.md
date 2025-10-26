# Quick Reference - New Project Navigation Fix

## 🚀 Quick Start

### Test the Feature
```bash
# 1. Open browser DevTools (F12)
# 2. Go to Console tab
# 3. Navigate to Projects page
# 4. Click "New Project" button
# 5. Watch console for debug messages
```

### Expected Result
- ✅ Console shows navigation debug logs
- ✅ URL changes to `#project/create`
- ✅ ProjectCreateForm renders
- ✅ Form has all fields visible

## 🔧 Build & Deploy

### Standard Build Process
```bash
# 1. Build frontend
cd /home/erpuser/frappe-bench
bench migrate

# 2. Clear cache
bench --site desk.kns.co.ke clear-cache

# 3. Test in browser
# Open https://desk.kns.co.ke/app/devsecops-dashboard
```

### Never Use
```bash
# ❌ DON'T use npm run build directly
npm run build  # Wrong approach

# ✅ Always use bench migrate
bench migrate  # Correct approach
```

## 📊 Console Debug Messages

### When "New Project" is clicked, you should see:

```javascript
[Navigation] navigateToRoute called with: {route: 'project-create', projectId: null, appId: null}
[Navigation] Setting route to project-create
[Navigation] Hash set to project/create
[Navigation] handleHashChange called with hash: project/create
[Navigation] Detected project/create hash, setting currentRoute to project-create
```

### If you see errors instead:
- Check browser console for error messages
- Follow DEBUG_NEW_PROJECT_NAVIGATION.md guide
- Verify user has write:projects permission

## 🎯 Troubleshooting

| Issue | Solution |
|-------|----------|
| No console messages | Button click not working - check onClick handler |
| Hash changes but form doesn't render | Check if currentRoute state updates |
| Form renders but shows permission error | User needs write:projects permission |
| Form renders but fields are empty | Project Types/Departments API failing |
| Old assets still loading | Clear browser cache (Ctrl+Shift+Delete) |

## 📁 Key Files

| File | Purpose |
|------|---------|
| `navigationStore.js` | Navigation state management |
| `App.jsx` | Route rendering |
| `Projects.jsx` | Projects list component |
| `ProjectCreateForm.jsx` | Project creation form |
| `projects.js` | API service |

## 🔍 Debug Checklist

- [ ] Browser console open
- [ ] "New Project" button clicked
- [ ] All 5 console messages appear
- [ ] URL hash is `#project/create`
- [ ] ProjectCreateForm visible
- [ ] Form fields populated
- [ ] No console errors

## 📝 Files Modified

```
apps/frappe_devsecops_dashboard/frontend/src/stores/navigationStore.js
  - Added console.log to navigateToRoute
  - Added console.log to project-create case
  - Added console.log to handleHashChange
  - Added console.log to project/create hash handler
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| DEBUG_NEW_PROJECT_NAVIGATION.md | Detailed debugging guide |
| BUILD_PROCESS_STANDARD.md | Build process documentation |
| NAVIGATION_FIX_SUMMARY.md | Summary of changes |
| QUICK_REFERENCE.md | This file |

## ✨ Next Steps

1. **Test the feature** - Click "New Project" button
2. **Check console** - Verify debug messages appear
3. **If working** - Remove debug logs and rebuild
4. **If not working** - Follow DEBUG_NEW_PROJECT_NAVIGATION.md

## 💡 Remember

- Always use `bench migrate` for building
- Always clear cache after building
- Always check browser console for errors
- Always hard refresh (Ctrl+F5) after changes

## 🎉 Success Criteria

✅ Clicking "New Project" navigates to form
✅ Form renders with all fields
✅ Form can be submitted
✅ Project is created successfully
✅ Redirected to project detail page

---

**Last Updated:** After implementing debug logging and updating build process
**Status:** Ready for testing

