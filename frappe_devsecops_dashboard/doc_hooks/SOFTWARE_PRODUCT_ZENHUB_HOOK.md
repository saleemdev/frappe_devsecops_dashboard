# Software Product Zenhub Workspace Hook

## Overview

This hook automatically creates a Zenhub workspace when a Software Product is saved (created or updated) if the `zenhub_workspace_id` field is empty.

## Behavior

1. **Trigger**: When a Software Product document is saved via the `after_save` hook
2. **Condition**: Only runs if `zenhub_workspace_id` is empty/null
3. **Workspace Name**: Creates workspace with name format: `DSO-T{docname}`
   - Example: If Software Product name is `PROD-001`, workspace will be `DSO-TPROD-001`
4. **Workspace Description**: Includes product name and description (if available)
5. **ID Update**: Automatically updates the `zenhub_workspace_id` field with the created workspace ID

## Features

- ✅ **Duplicate Prevention**: Checks if a workspace with the same name already exists before creating
- ✅ **Error Handling**: Errors are logged but don't prevent document save
- ✅ **User Feedback**: Shows success/error messages to the user
- ✅ **Non-blocking**: Document save completes even if workspace creation fails

## Files

- **Hook Implementation**: `frappe_devsecops_dashboard/doc_hooks/software_product_zenhub.py`
- **Hook Registration**: `frappe_devsecops_dashboard/hooks.py` (in `doc_events`)

## Usage

### Automatic (Default Behavior)

Simply create or save a Software Product without a `zenhub_workspace_id`:

1. Create a new Software Product
2. Fill in required fields (Product Name, etc.)
3. Save the document
4. The hook will automatically:
   - Create a Zenhub workspace named `DSO-T{product_name}`
   - Update the `zenhub_workspace_id` field
   - Show a success message

### Manual Override

If you want to use an existing workspace or create one manually:

1. Create the workspace in Zenhub UI first
2. Copy the workspace ID
3. Paste it into the `zenhub_workspace_id` field before saving
4. The hook will skip workspace creation if the field is already populated

## Prerequisites

1. **Zenhub Settings**: Must be configured with a valid API token
   - Go to: Desk → Zenhub Settings
   - Enter your Zenhub API token

2. **Zenhub API Access**: Your API token must have permissions to:
   - Create workspaces
   - Search workspaces

## Error Handling

### If Workspace Creation Fails

- The error is logged in Frappe Error Log
- A user-friendly error message is displayed
- **The Software Product document is still saved** (non-blocking)

### Common Errors

1. **"Zenhub API authentication failed"**
   - Solution: Check Zenhub Settings and verify API token

2. **"Failed to create Zenhub workspace: [error message]"**
   - Solution: Check Error Log for details
   - Note: Zenhub API might not support workspace creation via API (may need to create via UI)

3. **"Workspace already exists"**
   - The hook will find and use the existing workspace
   - No error - this is expected behavior

## Testing

### Test Workspace Creation

1. Create a new Software Product:
   ```python
   import frappe
   
   doc = frappe.get_doc({
       "doctype": "Software Product",
       "product_name": "Test Product",
       "description": "Test description"
   })
   doc.insert()
   frappe.db.commit()
   
   # Check if workspace was created
   print(f"Workspace ID: {doc.zenhub_workspace_id}")
   ```

2. Verify in Zenhub:
   - Go to Zenhub: https://app.zenhub.com
   - Look for workspace named `DSO-TTest Product`

### Test Existing Workspace

1. Create a Software Product with existing workspace ID:
   ```python
   import frappe
   
   doc = frappe.get_doc({
       "doctype": "Software Product",
       "product_name": "Test Product 2",
       "zenhub_workspace_id": "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xMjM0NTY="
   })
   doc.insert()
   frappe.db.commit()
   
   # Hook should skip creation
   ```

## Troubleshooting

### Hook Not Running

1. **Check Hook Registration**:
   ```python
   # In hooks.py, verify:
   doc_events = {
       "Software Product": {
           "after_save": "frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.handle_software_product_zenhub_workspace"
       }
   }
   ```

2. **Clear Cache and Restart**:
   ```bash
   bench --site <site> clear-cache
   bench restart
   ```

3. **Check Error Log**: Desk → Error Log

### Workspace Not Created

1. **Check Zenhub API Token**: Verify token in Zenhub Settings
2. **Check API Permissions**: Ensure token has workspace creation permissions
3. **Check Error Log**: Look for detailed error messages
4. **Note**: Zenhub API might not support workspace creation - may need to create via UI

### Workspace Created But ID Not Updated

1. Check if there were any database errors
2. Verify the hook completed successfully (check logs)
3. Manually update the field if needed:
   ```python
   import frappe
   doc = frappe.get_doc("Software Product", "PRODUCT-NAME")
   doc.zenhub_workspace_id = "WORKSPACE_ID"
   doc.save()
   frappe.db.commit()
   ```

## Implementation Details

### Hook Function

```python
def handle_software_product_zenhub_workspace(doc, method=None):
    """
    Hook for Software Product after_save event.
    
    Creates Zenhub workspace if zenhub_workspace_id is empty.
    """
    # Implementation in software_product_zenhub.py
```

### Workspace Creation Flow

1. Check if `zenhub_workspace_id` is empty
2. Generate workspace name: `DSO-T{docname}`
3. Search for existing workspace with same name
4. If not found, create new workspace via GraphQL mutation
5. Update document with workspace ID
6. Show success message to user

## Notes

- **API Limitation**: Zenhub's GraphQL API may not support workspace creation. If the mutation fails, you may need to:
  1. Create workspaces manually in Zenhub UI
  2. Manually enter the workspace ID in the Software Product form
  
- **Non-Blocking**: The hook is designed to not prevent document save even if workspace creation fails

- **Idempotent**: The hook checks for existing workspaces to avoid duplicates

---

**Last Updated**: 2025-01-14  
**Version**: 1.0.0

