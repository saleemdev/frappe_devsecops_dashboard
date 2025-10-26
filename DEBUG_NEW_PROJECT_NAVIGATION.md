# Debug Guide: New Project Navigation Issue

## 🔍 Debugging Steps

### Step 1: Open Browser Developer Console
1. Open the DevSecOps Dashboard in your browser
2. Press `F12` or right-click → "Inspect" to open Developer Tools
3. Go to the **Console** tab
4. Keep the console open while testing

### Step 2: Click "New Project" Button
1. Navigate to the Projects page
2. Click the "New Project" button
3. Watch the console for debug messages

### Step 3: Check Console Output
You should see these console logs in order:

```
[Navigation] navigateToRoute called with: {route: 'project-create', projectId: null, appId: null}
[Navigation] Setting route to project-create
[Navigation] Hash set to project/create
[Navigation] handleHashChange called with hash: project/create
[Navigation] Detected project/create hash, setting currentRoute to project-create
```

### Step 4: Verify URL Hash
After clicking "New Project", check the URL in the address bar:
- **Expected:** `https://desk.kns.co.ke/app/devsecops-dashboard#project/create`
- **Current:** (note what you see)

### Step 5: Check Network Tab
1. Go to the **Network** tab in Developer Tools
2. Click "New Project" button
3. Look for any failed requests (red entries)
4. Check if there are any 404 or 500 errors

### Step 6: Check Application Tab
1. Go to the **Application** tab
2. Expand "Local Storage"
3. Look for any Zustand store data
4. Check if `currentRoute` is set to `'project-create'`

## 🐛 Common Issues and Solutions

### Issue 1: Console shows no debug messages
**Possible Cause:** The button click handler is not being called
**Solution:**
1. Check if `navigateToRoute` prop is being passed to Projects component
2. Verify the button's `onClick` handler is correct
3. Check for JavaScript errors in the console

### Issue 2: Hash changes but form doesn't render
**Possible Cause:** The `currentRoute` state is not being updated
**Solution:**
1. Check if `handleHashChange` is being called
2. Verify the Zustand store is updating correctly
3. Check if App.jsx renderContent function has the 'project-create' case

### Issue 3: Form renders but shows permission error
**Possible Cause:** User doesn't have write permission for projects
**Solution:**
1. Check if user has 'write:projects' permission
2. Verify permission checking in ProjectCreateForm component
3. Check user roles in Frappe

### Issue 4: Form renders but fields are empty
**Possible Cause:** Project Types or Departments API calls are failing
**Solution:**
1. Check Network tab for failed API calls
2. Verify `/api/resource/Project Type` endpoint is accessible
3. Verify `/api/resource/Department` endpoint is accessible

## 📊 Expected Behavior

### When "New Project" button is clicked:
1. ✅ Console shows navigation debug logs
2. ✅ URL hash changes to `#project/create`
3. ✅ `handleHashChange` is triggered
4. ✅ `currentRoute` state changes to `'project-create'`
5. ✅ ProjectCreateForm component renders
6. ✅ Form fields are populated with Project Types and Departments
7. ✅ User can fill in the form and submit

## 🔧 Manual Testing Checklist

- [ ] Browser console shows all debug messages
- [ ] URL hash is `#project/create`
- [ ] ProjectCreateForm component is visible
- [ ] Form has all required fields:
  - [ ] Project Name input
  - [ ] Project Type dropdown
  - [ ] Expected Start Date picker
  - [ ] Expected End Date picker
  - [ ] Priority dropdown
  - [ ] Department dropdown
  - [ ] Notes textarea
  - [ ] Team Members section
- [ ] Project Types dropdown has options
- [ ] Departments dropdown has options
- [ ] Can add team members
- [ ] Can submit the form
- [ ] Success notification appears
- [ ] Redirected to project detail page

## 📝 Console Log Reference

### Navigation Store Logs
```javascript
// When navigateToRoute is called
[Navigation] navigateToRoute called with: {route, projectId, appId}

// When project-create case is hit
[Navigation] Setting route to project-create
[Navigation] Hash set to project/create

// When hash changes
[Navigation] handleHashChange called with hash: project/create
[Navigation] Detected project/create hash, setting currentRoute to project-create
```

## 🚀 Next Steps

1. **If all console logs appear:**
   - The navigation is working correctly
   - Check if the form is rendering
   - If form is not visible, check CSS or rendering issues

2. **If some console logs are missing:**
   - Identify which step is failing
   - Check the corresponding code section
   - Look for JavaScript errors in console

3. **If no console logs appear:**
   - The button click handler is not being called
   - Check if `navigateToRoute` prop is passed correctly
   - Verify button onClick handler is correct

## 💡 Tips

- **Refresh the page** after making changes to ensure new code is loaded
- **Clear browser cache** if changes don't appear (Ctrl+Shift+Delete)
- **Check for typos** in route names (case-sensitive)
- **Verify Zustand store** is properly initialized
- **Check for conflicting routes** that might override the project-create route

## 📞 Support

If the issue persists after following these steps:
1. Share the console output
2. Share the URL hash
3. Share any error messages
4. Describe what you see on the screen

