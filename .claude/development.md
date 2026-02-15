# Development Guide - DevSecOps Dashboard

## Prerequisites

### Required Software

- **Python:** 3.10 or higher
- **Node.js:** 18.x or higher
- **npm:** 9.x or higher (or yarn 3.x)
- **MariaDB:** 10.6+ or PostgreSQL 12+
- **Redis:** Latest stable version
- **Frappe Bench:** Latest version

### Recommended Tools

- **Git:** For version control
- **VS Code:** With Python, ESLint, and Prettier extensions
- **Postman/Insomnia:** For API testing
- **Redis Commander:** For cache inspection
- **DBeaver/MySQL Workbench:** For database management

## Initial Setup

### 1. Frappe Bench Setup

If you don't have Frappe bench installed:

```bash
# Install bench
pip3 install frappe-bench

# Create new bench (development mode)
bench init --frappe-branch version-15 my-bench
cd my-bench

# Create new site
bench new-site devsecops.local

# Set site as default
bench use devsecops.local

# Install ERPNext (optional but recommended)
bench get-app erpnext --branch version-15
bench install-app erpnext
```

### 2. Install DevSecOps Dashboard App

```bash
# If from git repository
bench get-app https://github.com/your-org/frappe_devsecops_dashboard

# Or if developing locally
bench get-app /path/to/frappe_devsecops_dashboard

# Install on site
bench --site devsecops.local install-app frappe_devsecops_dashboard

# Run migrations
bench --site devsecops.local migrate
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd apps/frappe_devsecops_dashboard/frontend

# Install dependencies
npm install

# Verify installation
npm run dev
```

### 4. Environment Configuration

Create `.env` file in frontend directory:

```bash
# frontend/.env
VITE_API_BASE_URL=/api/method/frappe_devsecops_dashboard.api
VITE_MOCK_MODE=true  # Set to false for production
VITE_DEBUG=true
```

## Development Workflow

### Starting Development Servers

**Terminal 1: Frappe Backend**
```bash
cd /path/to/bench
bench start
```

This starts:
- Frappe web server (port 8000)
- Socketio server (port 9000)
- Redis cache
- Redis queue workers
- Scheduler

**Terminal 2: Frontend Dev Server**
```bash
cd apps/frappe_devsecops_dashboard/frontend
npm run dev
```

This starts Vite dev server on port 8080 with:
- Hot Module Replacement (HMR)
- Proxy to Frappe backend (port 8000)
- Source maps for debugging

### Accessing the Application

- **Frontend Dev:** http://localhost:8080
- **Frappe Backend:** http://localhost:8000
- **Frappe Desk:** http://localhost:8000/app

**Default Credentials:**
- Username: `Administrator`
- Password: (set during bench setup)

## Development Patterns

### Making Frontend Changes

1. **Edit component:** Make changes in `frontend/src/components/`
2. **Save file:** Vite HMR will auto-reload
3. **Test in browser:** Changes appear immediately
4. **Check console:** For any errors

```bash
# If HMR stops working, restart dev server
npm run dev
```

### Making Backend Changes

1. **Edit Python file:** Make changes in `frappe_devsecops_dashboard/api/` or `doctype/`
2. **Save file:** Frappe auto-reloads in development mode
3. **Test API:** Use Postman or frontend
4. **Check logs:** `bench --site devsecops.local console` or view in terminal

```bash
# If auto-reload doesn't work, restart manually
bench restart

# Or restart specific process
bench restart
```

### Making DocType Changes

1. **Edit JSON file:** Modify `doctype/*/doctype_name.json`
2. **Run migration:**
   ```bash
   bench --site devsecops.local migrate
   ```
3. **Clear cache:**
   ```bash
   bench --site devsecops.local clear-cache
   ```
4. **Restart:**
   ```bash
   bench restart
   ```

### Adding New API Endpoint

1. **Create or edit API file:**
   ```python
   # frappe_devsecops_dashboard/api/my_module.py
   import frappe

   @frappe.whitelist()
   def my_new_endpoint(param1, param2):
       return {'success': True, 'data': 'result'}
   ```

2. **Test endpoint:**
   ```bash
   # Using curl
   curl -X POST http://localhost:8000/api/method/frappe_devsecops_dashboard.api.my_module.my_new_endpoint \
     -H "Content-Type: application/json" \
     -d '{"param1": "value1", "param2": "value2"}'
   ```

3. **Add to frontend API service:**
   ```javascript
   // frontend/src/services/api/myModule.js
   async myNewEndpoint(param1, param2) {
     const client = await createApiClient()
     const response = await client.post(
       '/my_module.my_new_endpoint',
       { param1, param2 }
     )
     return response.data
   }
   ```

### Adding New Zustand Store

1. **Create store file:**
   ```javascript
   // frontend/src/stores/myFeatureStore.js
   import { create } from 'zustand'
   import { devtools } from 'zustand/middleware'

   const useMyFeatureStore = create(
     devtools(
       (set, get) => ({
         items: [],
         loading: false,
         fetchItems: async () => {
           set({ loading: true })
           // Fetch logic
           set({ loading: false })
         }
       }),
       { name: 'my-feature-store' }
     )
   )

   export default useMyFeatureStore
   ```

2. **Export from index:**
   ```javascript
   // frontend/src/stores/index.js
   export { default as useMyFeatureStore } from './myFeatureStore.js'
   ```

3. **Use in component:**
   ```javascript
   import { useMyFeatureStore } from '../stores/index.js'

   const MyComponent = () => {
     const { items, loading, fetchItems } = useMyFeatureStore()
     // Component logic
   }
   ```

### Adding New React Component

1. **Create component file:**
   ```bash
   touch frontend/src/components/MyNewComponent.jsx
   ```

2. **Implement component:**
   ```javascript
   import React, { useEffect } from 'react'
   import { Card, Button } from 'antd'

   const MyNewComponent = () => {
     return (
       <Card title="My New Feature">
         <p>Component content</p>
       </Card>
     )
   }

   export default MyNewComponent
   ```

3. **Add to navigation:**
   ```javascript
   // Update navigationStore or routing logic
   ```

## Building and Deployment

### Development Build

```bash
# Navigate to frontend
cd apps/frappe_devsecops_dashboard/frontend

# Build frontend assets
npm run build

# Output location: ../frappe_devsecops_dashboard/public/frontend/
```

### Production Build Process

```bash
# 1. Build frontend
cd apps/frappe_devsecops_dashboard/frontend
npm run build

# 2. Copy HTML template to www folder
cp ../frappe_devsecops_dashboard/public/frontend/index.html \
   ../frappe_devsecops_dashboard/www/devsecops-ui.html

# 3. Clear Frappe cache
cd ../../../..  # Back to bench directory
bench --site devsecops.local clear-cache
bench --site devsecops.local clear-website-cache

# 4. Restart services
bench restart

# 5. Verify deployment
curl -I http://localhost:8000/devsecops-ui
```

### Build Script

Create a build script for convenience:

```bash
# scripts/build-and-deploy.sh
#!/bin/bash

echo "Building frontend..."
cd apps/frappe_devsecops_dashboard/frontend
npm run build

echo "Copying HTML template..."
cp ../frappe_devsecops_dashboard/public/frontend/index.html \
   ../frappe_devsecops_dashboard/www/devsecops-ui.html

echo "Clearing cache..."
cd ../../../..
bench --site devsecops.local clear-cache
bench --site devsecops.local clear-website-cache

echo "Restarting services..."
bench restart

echo "Build and deployment complete!"
```

Make executable:
```bash
chmod +x scripts/build-and-deploy.sh
./scripts/build-and-deploy.sh
```

## Testing

### Frontend Testing

#### Unit Tests (if configured)
```bash
cd frontend
npm run test
```

#### E2E Tests with Cypress
```bash
# Open Cypress UI
npm run test:e2e

# Run headless
npm run test:e2e:headless
```

#### E2E Tests with Playwright
```bash
# Run Playwright tests
npm run playwright:test

# Run with UI
npm run playwright:ui

# Run specific browser
npm run playwright:test -- --project=chromium
```

#### Accessibility Tests
```bash
npm run test:accessibility
```

### Backend Testing

#### Run All Tests
```bash
bench --site devsecops.local run-tests --app frappe_devsecops_dashboard
```

#### Run Specific Test File
```bash
bench --site devsecops.local run-tests \
  --app frappe_devsecops_dashboard \
  --module frappe_devsecops_dashboard.api.test_dashboard
```

#### Run DocType Tests
```bash
bench --site devsecops.local run-tests \
  --doctype "Change Request"
```

#### Test Pattern
```python
# frappe_devsecops_dashboard/api/test_module.py
import frappe
from frappe.tests.utils import FrappeTestCase

class TestMyModule(FrappeTestCase):
    def setUp(self):
        frappe.set_user("Administrator")

    def test_my_function(self):
        result = my_function()
        self.assertEqual(result, expected_value)

    def tearDown(self):
        # Cleanup
        pass
```

## Debugging

### Frontend Debugging

#### Browser DevTools
- **React DevTools:** Inspect component hierarchy
- **Redux DevTools:** Inspect Zustand stores
- **Network Tab:** Monitor API calls
- **Console:** Check for errors and logs

#### VS Code Debugging
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:8080",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

#### Console Logging
```javascript
// Temporary debug logs
console.log('Debug data:', data)
console.table(items)
console.dir(object)

// Remove before committing
```

### Backend Debugging

#### Console Logging
```python
import frappe

# Print to console
print(f"Debug: {variable}")

# Frappe logger
frappe.logger().debug(f"Debug info: {data}")
```

#### Frappe Console
```bash
# Interactive Python console
bench --site devsecops.local console

# In console:
>>> frappe.get_doc('DocType Name', 'DOC-001')
>>> frappe.db.get_all('DocType Name', filters={'status': 'Active'})
```

#### Error Logs
```bash
# View error logs in browser
# Go to: http://localhost:8000/app/error-log

# Or in database
bench --site devsecops.local mariadb

SELECT * FROM `tabError Log` ORDER BY creation DESC LIMIT 10;
```

#### VS Code Python Debugging
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Frappe",
      "type": "python",
      "request": "attach",
      "connect": {
        "host": "localhost",
        "port": 5678
      },
      "pathMappings": [
        {
          "localRoot": "${workspaceFolder}",
          "remoteRoot": "."
        }
      ]
    }
  ]
}
```

Add to code:
```python
import debugpy
debugpy.listen(5678)
debugpy.wait_for_client()
```

## Common Issues and Solutions

### Issue: Frontend not connecting to backend

**Solution:**
```bash
# Check if Frappe is running
curl http://localhost:8000/api/method/ping

# Check Vite proxy configuration
# Verify vite.config.js has correct proxy settings

# Restart both servers
```

### Issue: CSRF token errors

**Solution:**
```javascript
// Ensure CSRF token is set in API config
if (window.csrf_token) {
  client.defaults.headers.common['X-Frappe-CSRF-Token'] = window.csrf_token
}

// Login first to get session and CSRF token
```

### Issue: Changes not reflecting

**Solution:**
```bash
# Frontend changes
npm run dev  # Restart Vite

# Backend changes
bench restart

# DocType changes
bench migrate
bench clear-cache
bench restart

# Full reset
bench restart
bench clear-cache
bench clear-website-cache
```

### Issue: Module import errors

**Solution:**
```bash
# Python
bench restart

# JavaScript
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue: Database locked

**Solution:**
```bash
# Check for hanging processes
ps aux | grep bench

# Kill hanging processes
pkill -f "bench"

# Restart
bench start
```

## Performance Optimization

### Frontend

#### Bundle Size
```bash
# Analyze bundle
npm run build -- --analyze

# Check for large dependencies
npx webpack-bundle-analyzer dist/stats.json
```

#### Code Splitting
```javascript
// Lazy load components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'))

// Use Suspense
<Suspense fallback={<Spin />}>
  <HeavyComponent />
</Suspense>
```

### Backend

#### Query Optimization
```python
# Use get_list instead of get_all for permissions
items = frappe.get_list('DocType', fields=['name', 'field1'])

# Use select_as_dict for raw queries
results = frappe.db.sql("""
    SELECT name, field1
    FROM `tabDocType`
    WHERE condition
""", as_dict=True)

# Add database indexes
frappe.db.add_index('DocType', ['field1', 'field2'])
```

#### Caching
```python
# Cache expensive operations
cached = frappe.cache().get_value('key')
if not cached:
    cached = expensive_operation()
    frappe.cache().set_value('key', cached, expires_in_sec=3600)
```

## Version Control

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/my-feature

# Create pull request
# Use GitHub/GitLab UI
```

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test updates
- `chore`: Build/config changes

**Examples:**
```bash
feat(api): add ZenHub workspace creation endpoint
fix(ui): resolve mobile menu toggle issue
docs(readme): update development setup instructions
refactor(stores): simplify authentication store logic
```

## Helpful Commands Reference

```bash
# Frappe Commands
bench start                                    # Start development servers
bench restart                                  # Restart all services
bench migrate                                  # Run database migrations
bench clear-cache                              # Clear server cache
bench clear-website-cache                      # Clear website cache
bench console                                  # Python console
bench mariadb                                  # MySQL console

# Site-specific
bench --site devsecops.local migrate
bench --site devsecops.local console
bench --site devsecops.local run-tests

# Frontend Commands
npm run dev                                    # Start dev server
npm run build                                  # Production build
npm run lint                                   # Run ESLint
npm run test:e2e                              # Run Cypress tests

# Git Commands
git status                                     # Check status
git add .                                      # Stage changes
git commit -m "message"                        # Commit changes
git push origin branch-name                    # Push to remote
```

## Related Documentation

- [Architecture Overview](architecture.md)
- [Frontend Patterns](frontend-patterns.md)
- [Backend Patterns](backend-patterns.md)
- [API Conventions](api-conventions.md)
- [Quick Reference](quick-reference.md)
- [Main README](../README.md)
