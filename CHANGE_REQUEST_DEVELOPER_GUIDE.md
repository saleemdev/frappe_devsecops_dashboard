# Change Request Form - Developer Guide

## Quick Start

### 1. Deploy the Changes

```bash
# Navigate to bench directory
cd /home/erpuser/frappe-bench

# Migrate backend changes
bench --site desk.kns.co.ke migrate

# Clear cache
bench --site desk.kns.co.ke clear-cache

# Restart if needed
sudo supervisorctl restart all
```

### 2. Verify the Build

The frontend has already been built. Verify the files exist:

```bash
ls -la apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/public/frontend/assets/
```

You should see:
- `index-Dxa3635G.css`
- `index-D4IEzEpe.js`

### 3. Access the Form

Navigate to: `https://desk.kns.co.ke/app/devsecops-dashboard`

Click on "Change Requests" in the navigation menu.

---

## API Integration Guide

### Current State: Mock Data

The component currently uses mock data. To integrate with Frappe API:

### Step 1: Update `loadChangeRequests()` Function

**Location:** `frontend/src/components/ChangeRequests.jsx` (Line ~109)

**Replace:**
```javascript
const loadChangeRequests = async () => {
  setLoading(true)
  try {
    // TODO: Replace with actual Frappe API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setChangeRequests(mockData)
  } catch (error) {
    message.error('Failed to load change requests')
  } finally {
    setLoading(false)
  }
}
```

**With:**
```javascript
const loadChangeRequests = async () => {
  setLoading(true)
  try {
    const response = await fetch('/api/resource/Change Request', {
      headers: {
        'Accept': 'application/json',
        'X-Frappe-CSRF-Token': frappe.csrf_token
      },
      credentials: 'include'
    })
    
    if (!response.ok) throw new Error('Failed to fetch')
    
    const data = await response.json()
    setChangeRequests(data.data || [])
  } catch (error) {
    message.error('Failed to load change requests')
    console.error('Error loading change requests:', error)
  } finally {
    setLoading(false)
  }
}
```

### Step 2: Update `loadProjects()` Function

**Location:** `frontend/src/components/ChangeRequests.jsx` (Line ~127)

**Replace:**
```javascript
const loadProjects = async () => {
  try {
    // TODO: Replace with actual Frappe API call
    const mockProjects = [...]
    setProjects(mockProjects)
  } catch (error) {
    message.error('Failed to load projects')
  }
}
```

**With:**
```javascript
const loadProjects = async () => {
  try {
    const response = await fetch(
      '/api/resource/Project?fields=["name","project_name"]&limit_page_length=999',
      {
        headers: {
          'Accept': 'application/json',
          'X-Frappe-CSRF-Token': frappe.csrf_token
        },
        credentials: 'include'
      }
    )
    
    if (!response.ok) throw new Error('Failed to fetch')
    
    const data = await response.json()
    setProjects(data.data || [])
  } catch (error) {
    message.error('Failed to load projects')
    console.error('Error loading projects:', error)
  }
}
```

### Step 3: Update `handleSubmit()` Function

**Location:** `frontend/src/components/ChangeRequests.jsx` (Line ~176)

**Replace the mock API call with:**

```javascript
const handleSubmit = async (values) => {
  try {
    setLoading(true)
    
    // Format dates and times for Frappe
    const formattedValues = {
      ...values,
      submission_date: values.submission_date?.format('YYYY-MM-DD'),
      implementation_date: values.implementation_date?.format('YYYY-MM-DD'),
      implementation_time: values.implementation_time?.format('HH:mm:ss'),
      downtime_expected: values.downtime_expected ? 1 : 0
    }
    
    if (editingRecord) {
      // Update existing record
      const response = await fetch(`/api/resource/Change Request/${editingRecord.name}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': frappe.csrf_token
        },
        credentials: 'include',
        body: JSON.stringify(formattedValues)
      })
      
      if (!response.ok) throw new Error('Failed to update')
      
      message.success('Change request updated successfully')
    } else {
      // Create new record
      const response = await fetch('/api/resource/Change Request', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': frappe.csrf_token
        },
        credentials: 'include',
        body: JSON.stringify(formattedValues)
      })
      
      if (!response.ok) throw new Error('Failed to create')
      
      message.success('Change request created successfully')
    }
    
    setIsModalVisible(false)
    form.resetFields()
    loadChangeRequests() // Reload the list
  } catch (error) {
    message.error('Failed to save change request')
    console.error('Error saving:', error)
  } finally {
    setLoading(false)
  }
}
```

### Step 4: Update `handleDelete()` Function

**Location:** `frontend/src/components/ChangeRequests.jsx` (Line ~165)

**Replace with:**

```javascript
const handleDelete = async (name) => {
  try {
    const response = await fetch(`/api/resource/Change Request/${name}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-Frappe-CSRF-Token': frappe.csrf_token
      },
      credentials: 'include'
    })
    
    if (!response.ok) throw new Error('Failed to delete')
    
    message.success('Change request deleted successfully')
    loadChangeRequests() // Reload the list
  } catch (error) {
    message.error('Failed to delete change request')
    console.error('Error deleting:', error)
  }
}
```

---

## Field Validation Rules

### Required Fields

The following fields are marked as required in the form:

1. **Basic Information Tab:**
   - Change Request Title (`title`)
   - Date Submitted (`submission_date`)
   - Project (`project`)
   - System/Application Affected (`system_affected`)
   - Originator Name (`originator_name`)

2. **Change Details Tab:**
   - Change Request Category (`change_category`)
   - Detailed Description (`detailed_description`)

3. **Approval Tab:**
   - Change Request Acceptance (`approval_status`)

### Optional Fields

All other fields are optional but recommended for complete documentation.

---

## Rich Text Editor Configuration

### ReactQuill Setup

The form uses ReactQuill for rich text editing. Configuration:

```javascript
<ReactQuill
  theme="snow"
  placeholder="Enter description..."
  style={{ height: 200, marginBottom: 50 }}
/>
```

### Supported Formatting

- **Text Formatting:** Bold, Italic, Underline, Strike-through
- **Headers:** H1, H2, H3
- **Lists:** Ordered, Unordered
- **Links:** Hyperlinks
- **Code Blocks:** Inline code and code blocks
- **Quotes:** Blockquotes
- **Alignment:** Left, Center, Right, Justify

### Saving HTML Content

The editor automatically saves HTML content. No additional processing needed.

---

## Color Coding Reference

### Approval Status Colors

```javascript
const getApprovalStatusColor = (status) => {
  const colors = {
    'Pending Review': 'orange',
    'Approved for Implementation': 'green',
    'Rework': 'blue',
    'Not Accepted': 'red',
    'Withdrawn': 'gray',
    'Deferred': 'purple'
  }
  return colors[status] || 'default'
}
```

### Workflow State Colors

```javascript
const getWorkflowStateColor = (state) => {
  const colors = {
    'Draft': 'default',
    'Pending Approval': 'orange',
    'Approved': 'green',
    'Rejected': 'red',
    'Implemented': 'blue',
    'Closed': 'purple'
  }
  return colors[state] || 'default'
}
```

### Change Category Colors

```javascript
const getCategoryColor = (category) => {
  const colors = {
    'Major Change': 'red',
    'Minor Change': 'orange',
    'Standard Change': 'blue',
    'Emergency Change': 'magenta'
  }
  return colors[category] || 'default'
}
```

---

## Troubleshooting

### Issue: ReactQuill Not Displaying

**Symptom:** Rich text editor shows as blank or doesn't load

**Solution:**
1. Verify react-quill is installed:
   ```bash
   cd frontend
   npm list react-quill
   ```

2. Check CSS import in component:
   ```javascript
   import 'react-quill/dist/quill.snow.css'
   ```

3. Rebuild frontend:
   ```bash
   npm run build
   ```

### Issue: Project Dropdown Empty

**Symptom:** Project dropdown shows no options

**Solution:**
1. Check if projects exist in database:
   ```bash
   bench --site desk.kns.co.ke console
   >>> frappe.get_all('Project', fields=['name', 'project_name'])
   ```

2. Verify API endpoint:
   ```bash
   curl -X GET "https://desk.kns.co.ke/api/resource/Project" \
     -H "Cookie: sid=your-session-id"
   ```

3. Check browser console for errors

### Issue: Form Submission Fails

**Symptom:** Error message when creating/updating change request

**Solution:**
1. Check browser console for detailed error
2. Verify CSRF token is being sent
3. Check Frappe error logs:
   ```bash
   tail -f sites/desk.kns.co.ke/logs/web.error.log
   ```

4. Verify field names match backend exactly

### Issue: Build Warnings About Chunk Size

**Symptom:** Warning about chunks larger than 500 kB

**Solution:** This is expected due to ReactQuill and Ant Design. To optimize:

```javascript
// In vite.config.js, add:
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'editor-vendor': ['react-quill']
        }
      }
    }
  }
})
```

---

## Testing Checklist

### Manual Testing Steps

1. **Create New Change Request**
   - [ ] Click "New Change Request" button
   - [ ] Fill all required fields in Basic Information tab
   - [ ] Select a project from dropdown
   - [ ] Navigate to Change Details tab
   - [ ] Use rich text editor for description
   - [ ] Navigate to Implementation tab
   - [ ] Set implementation date and time
   - [ ] Navigate to Approval tab
   - [ ] Set approval status
   - [ ] Click "Create" button
   - [ ] Verify success message
   - [ ] Verify new record appears in table

2. **Edit Existing Change Request**
   - [ ] Click edit icon on a record
   - [ ] Modify fields in different tabs
   - [ ] Click "Update" button
   - [ ] Verify success message
   - [ ] Verify changes reflected in table

3. **View Change Request Details**
   - [ ] Click view icon on a record
   - [ ] Verify all tabs display correctly
   - [ ] Verify HTML content renders properly
   - [ ] Verify color-coded tags display

4. **Filter and Search**
   - [ ] Enter search text
   - [ ] Select approval status filter
   - [ ] Select category filter
   - [ ] Verify filtered results

5. **Delete Change Request**
   - [ ] Click delete icon
   - [ ] Confirm deletion
   - [ ] Verify success message
   - [ ] Verify record removed from table

---

## Performance Considerations

### Lazy Loading

Consider implementing lazy loading for large datasets:

```javascript
const [pagination, setPagination] = useState({
  current: 1,
  pageSize: 20,
  total: 0
})

// Update API call to include pagination
const response = await fetch(
  `/api/resource/Change Request?limit_start=${(pagination.current - 1) * pagination.pageSize}&limit_page_length=${pagination.pageSize}`
)
```

### Debounced Search

Implement debounced search for better performance:

```javascript
import { debounce } from 'lodash'

const debouncedSearch = debounce((value) => {
  setSearchText(value)
}, 300)
```

---

## Next Steps

1. ✅ Backend changes deployed
2. ✅ Frontend built successfully
3. ⏳ Replace mock data with API calls
4. ⏳ Test end-to-end workflow
5. ⏳ Configure permissions
6. ⏳ Set up approval workflow
7. ⏳ Train users

---

## Support

For issues or questions:
1. Check Frappe error logs
2. Check browser console
3. Review this guide
4. Contact DevSecOps team

