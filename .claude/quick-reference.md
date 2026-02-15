# Quick Reference - DevSecOps Dashboard

## Common File Locations

### Frontend

```
frontend/src/
├── components/           # React components
│   ├── Dashboard.jsx    # Main dashboard (IMPORTANT)
│   ├── Projects/        # Project components
│   ├── Incidents/       # Incident management
│   ├── ChangeRequests/  # Change request components
│   └── Zenhub/         # ZenHub integration
│
├── stores/              # Zustand state stores
│   ├── authStore.js    # Authentication (IMPORTANT)
│   ├── navigationStore.js
│   ├── applicationsStore.js
│   ├── incidentsStore.js
│   └── index.js        # Store exports
│
├── services/api/        # API service layer
│   ├── config.js       # API configuration (IMPORTANT)
│   ├── index.js        # Service aggregator
│   ├── applications.js
│   ├── incidents.js
│   └── mockData.js     # Mock data for development
│
├── hooks/               # Custom React hooks
│   └── useResponsive.js
│
└── utils/               # Utility functions
```

### Backend

```
frappe_devsecops_dashboard/
├── api/                        # API endpoints
│   ├── dashboard.py           # Dashboard APIs (IMPORTANT)
│   ├── zenhub.py              # ZenHub integration (IMPORTANT)
│   ├── incidents.py           # Incident management
│   ├── change_request.py      # Change requests
│   ├── password_vault.py      # Password management
│   └── api_routes.py          # API gateway
│
├── doctype/                    # Custom DocTypes
│   ├── change_request/
│   ├── devsecops_dashboard_incident/
│   ├── password_vault_entry/
│   └── .../
│
├── doc_hooks/                  # Event handlers
│   ├── software_product_zenhub.py
│   └── project_user_permissions.py
│
├── public/frontend/            # Built frontend assets
├── www/                        # Web pages
├── hooks.py                    # App configuration (IMPORTANT)
└── build.py                    # Build automation
```

## Naming Conventions

### Frontend

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProjectAppDetail.jsx` |
| Stores | camelCase + "Store" | `authStore.js` |
| Props | camelCase | `selectedAppId`, `onItemClick` |
| Event handlers | handle + PascalCase | `handleSubmit`, `handleCancel` |
| API services | camelCase | `applicationsService` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |

### Backend

| Item | Convention | Example |
|------|------------|---------|
| API functions | snake_case | `get_incidents`, `create_change_request` |
| DocTypes | PascalCase with spaces | `Change Request` |
| Python files | snake_case | `password_vault.py` |
| Python classes | PascalCase | `ChangeRequest` |
| Variables | snake_case | `user_permissions`, `workspace_id` |

## Most Used Commands

### Development

```bash
# Start development servers
bench start                                     # Backend (Terminal 1)
cd frontend && npm run dev                      # Frontend (Terminal 2)

# Build for production
cd frontend && npm run build                    # Build frontend
bench clear-cache && bench restart             # Deploy to Frappe

# Restart services
bench restart                                   # Restart all
bench clear-cache                              # Clear cache
bench clear-website-cache                      # Clear website cache
```

### Testing

```bash
# Frontend tests
npm run test:e2e                               # Cypress E2E tests
npm run playwright:test                        # Playwright tests
npm run lint                                   # ESLint

# Backend tests
bench --site devsecops.local run-tests \
  --app frappe_devsecops_dashboard            # All tests

bench --site devsecops.local run-tests \
  --doctype "Change Request"                  # Specific DocType
```

### Database

```bash
# Database migrations
bench --site devsecops.local migrate           # Run migrations

# Database console
bench --site devsecops.local mariadb           # MySQL/MariaDB console

# Backup and restore
bench --site devsecops.local backup            # Backup
bench --site devsecops.local restore backup.sql # Restore
```

### Debugging

```bash
# Python console
bench --site devsecops.local console

# View logs
tail -f logs/bench-start.log                   # All logs
tail -f logs/web.error.log                     # Error logs
```

### Git

```bash
# Feature development
git checkout -b feature/feature-name           # Create branch
git add .                                      # Stage changes
git commit -m "feat: description"              # Commit
git push origin feature/feature-name           # Push

# Update from main
git checkout main
git pull origin main
git checkout feature/feature-name
git merge main
```

## How to Add New Features

### 1. Add New API Endpoint

**Backend:**
```python
# frappe_devsecops_dashboard/api/my_module.py
import frappe

@frappe.whitelist()
def my_new_endpoint(param1, param2):
    """Endpoint description"""
    try:
        # Logic here
        return {
            'success': True,
            'data': result
        }
    except Exception as e:
        frappe.log_error(str(e), "My Module Error")
        return {
            'success': False,
            'error': str(e)
        }
```

**Frontend:**
```javascript
// frontend/src/services/api/myModule.js
class MyModuleService {
  async myNewEndpoint(param1, param2) {
    const client = await createApiClient()
    const response = await client.post(
      '/my_module.my_new_endpoint',
      { param1, param2 }
    )
    return response.data
  }
}

export default new MyModuleService()
```

### 2. Add New Zustand Store

```javascript
// frontend/src/stores/myFeatureStore.js
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import apiService from '../services/api/index.js'

const useMyFeatureStore = create(
  devtools(
    persist(
      (set, get) => ({
        // State
        items: [],
        loading: false,
        error: null,

        // Actions
        fetchItems: async () => {
          set({ loading: true })
          try {
            const response = await apiService.myModule.getItems()
            set({ items: response.data, loading: false })
          } catch (error) {
            set({ error: error.message, loading: false })
          }
        },

        reset: () => set({ items: [], loading: false, error: null })
      }),
      { name: 'my-feature-store' }
    ),
    { name: 'my-feature-store' }
  )
)

export default useMyFeatureStore

// Export in stores/index.js
export { default as useMyFeatureStore } from './myFeatureStore.js'
```

### 3. Add New React Component

```javascript
// frontend/src/components/MyFeature.jsx
import React, { useEffect } from 'react'
import { useMyFeatureStore } from '../stores/index.js'
import { Card, Table, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const MyFeature = () => {
  const { items, loading, fetchItems } = useMyFeatureStore()

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' }
  ]

  return (
    <Card
      title="My Feature"
      extra={<Button type="primary" icon={<PlusOutlined />}>Add</Button>}
    >
      <Table
        columns={columns}
        dataSource={items}
        loading={loading}
        rowKey="id"
      />
    </Card>
  )
}

export default MyFeature
```

### 4. Add New DocType

1. **Create DocType JSON:**
   ```bash
   bench --site devsecops.local new-doctype "My DocType"
   ```

2. **Edit JSON file:**
   ```
   frappe_devsecops_dashboard/doctype/my_doctype/my_doctype.json
   ```

3. **Create controller:**
   ```python
   # frappe_devsecops_dashboard/doctype/my_doctype/my_doctype.py
   from frappe.model.document import Document

   class MyDoctype(Document):
       def validate(self):
           # Validation logic
           pass
   ```

4. **Migrate:**
   ```bash
   bench --site devsecops.local migrate
   ```

### 5. Add Doc Hook

**Register in hooks.py:**
```python
# frappe_devsecops_dashboard/hooks.py
doc_events = {
    "My DocType": {
        "before_save": "frappe_devsecops_dashboard.doc_hooks.my_hook.handle_my_doctype"
    }
}
```

**Create hook file:**
```python
# frappe_devsecops_dashboard/doc_hooks/my_hook.py
import frappe

def handle_my_doctype(doc, method=None):
    """Handle My DocType events"""
    # Logic here
    pass
```

## Common Patterns Quick Reference

### Fetch Data in Component

```javascript
// Use Zustand store
const { items, loading, error, fetchItems } = useMyStore()

useEffect(() => {
  fetchItems()
}, [fetchItems])

if (loading) return <Spin />
if (error) return <Alert type="error" message={error} />

return <div>{items.map(...)}</div>
```

### Create/Update Form

```javascript
const [form] = Form.useForm()
const { createItem, updateItem } = useMyStore()

const handleSubmit = async (values) => {
  try {
    if (id) {
      await updateItem(id, values)
    } else {
      await createItem(values)
    }
    message.success('Success')
    onSuccess?.()
  } catch (error) {
    message.error('Failed')
  }
}

return (
  <Form form={form} onFinish={handleSubmit}>
    {/* Form fields */}
    <Button type="primary" htmlType="submit">Submit</Button>
  </Form>
)
```

### API Call with Error Handling

```python
@frappe.whitelist()
def my_function():
    try:
        # Logic
        return {'success': True, 'data': result}

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        return {'success': False, 'error': 'Permission denied'}

    except frappe.ValidationError as ve:
        frappe.response['http_status_code'] = 400
        return {'success': False, 'error': str(ve)}

    except Exception as e:
        frappe.log_error(str(e), "Function Error")
        frappe.response['http_status_code'] = 500
        return {'success': False, 'error': 'Server error'}
```

### Database Queries

```python
# Get list
items = frappe.get_list(
    'DocType Name',
    fields=['name', 'field1', 'field2'],
    filters={'status': 'Active'},
    order_by='modified desc',
    start=0,
    page_length=10
)

# Get single document
doc = frappe.get_doc('DocType Name', 'DOC-001')

# Get value
value = frappe.db.get_value('DocType Name', 'DOC-001', 'field_name')

# Check exists
exists = frappe.db.exists('DocType Name', 'DOC-001')

# Count
count = frappe.db.count('DocType Name', {'status': 'Active'})
```

### Caching

```python
# Cache data
cache_key = f'my_cache_{id}'
cached = frappe.cache().get_value(cache_key)

if not cached:
    cached = expensive_function()
    frappe.cache().set_value(cache_key, cached, expires_in_sec=3600)

return cached

# Invalidate cache
frappe.cache().delete_value(cache_key)
```

## Important Configuration Files

### Frontend

- **[frontend/package.json](../frontend/package.json)** - Dependencies and scripts
- **[frontend/vite.config.js](../frontend/vite.config.js)** - Vite build configuration
- **[frontend/src/services/api/config.js](../frontend/src/services/api/config.js)** - API configuration
- **[frontend/.env](../frontend/.env)** - Environment variables

### Backend

- **[frappe_devsecops_dashboard/hooks.py](../frappe_devsecops_dashboard/hooks.py)** - App configuration
- **[pyproject.toml](../pyproject.toml)** - Python project metadata

## Troubleshooting Quick Fixes

### Issue: Changes not reflecting

```bash
# Frontend
npm run dev  # Restart Vite

# Backend
bench restart

# DocType
bench migrate
bench clear-cache
bench restart
```

### Issue: CSRF token error

```javascript
// Check if token is set
console.log(window.csrf_token)

// Login first
window.location.href = '/login'
```

### Issue: Permission denied

```python
# Check permissions
frappe.has_permission('DocType', 'read')

# Check user roles
frappe.get_roles()
```

### Issue: Module not found

```bash
# Python
bench restart

# JavaScript
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Key Directories for Development

### Most Frequently Edited

1. **[frontend/src/components/](../frontend/src/components/)** - React components
2. **[frontend/src/stores/](../frontend/src/stores/)** - Zustand stores
3. **[frappe_devsecops_dashboard/api/](../frappe_devsecops_dashboard/api/)** - API endpoints
4. **[frappe_devsecops_dashboard/doctype/](../frappe_devsecops_dashboard/doctype/)** - Custom DocTypes

### Configuration

1. **[frappe_devsecops_dashboard/hooks.py](../frappe_devsecops_dashboard/hooks.py)** - App hooks
2. **[frontend/vite.config.js](../frontend/vite.config.js)** - Build config
3. **[frontend/src/services/api/config.js](../frontend/src/services/api/config.js)** - API config

### Documentation

1. **[README.md](../README.md)** - Main developer playbook
2. **[docs/](../docs/)** - Detailed documentation
3. **[.claude/](./)** - Claude Code context files

## Starting Points for Learning

### Understanding the Codebase

1. Read **[README.md](../README.md)** - Comprehensive overview
2. Review **[architecture.md](architecture.md)** - System architecture
3. Study **[frontend/src/components/Dashboard.jsx](../frontend/src/components/Dashboard.jsx)** - Example component
4. Study **[frontend/src/stores/authStore.js](../frontend/src/stores/authStore.js)** - Example store
5. Study **[frappe_devsecops_dashboard/api/dashboard.py](../frappe_devsecops_dashboard/api/dashboard.py)** - Example API

### For Bug Fixes

1. Identify component or API affected
2. Check related Zustand store
3. Test with mock data to isolate frontend/backend
4. Check error logs in browser console or Frappe

### For New Features

1. Design data model (if DocType needed)
2. Create API endpoints
3. Create Zustand store
4. Create React components
5. Wire up with navigation
6. Test and debug

## Related Documentation

- **[Architecture Overview](architecture.md)** - System design and structure
- **[Frontend Patterns](frontend-patterns.md)** - React, Zustand, component patterns
- **[Backend Patterns](backend-patterns.md)** - Frappe API, DocType patterns
- **[API Conventions](api-conventions.md)** - Endpoint structure, response formats
- **[Development Guide](development.md)** - Setup, build, test workflows
- **[Main README](../README.md)** - Comprehensive developer playbook
