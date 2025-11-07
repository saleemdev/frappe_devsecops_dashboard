# Setup Guide: Project User Permissions Hook

## Overview

This guide explains how to set up the automatic User Permission creation hook for the Project DocType. The business logic is already implemented in `frappe_devsecops_dashboard/doc_hooks/project_user_permissions.py`. You just need to register the hook in `hooks.py`.

## Files Created

1. **Business Logic Module**: `frappe_devsecops_dashboard/doc_hooks/project_user_permissions.py`
   - Contains all the logic for creating/deleting User Permissions
   - Three main functions:
     - `handle_project_user_permissions(doc, method=None)` - Main hook function
     - `create_user_permission(user, project_name)` - Creates a User Permission
     - `remove_user_permission(user, project_name)` - Removes a User Permission

2. **Unit Tests**: `frappe_devsecops_dashboard/tests/test_project_user_permissions.py`
   - Comprehensive test suite with 7 test cases
   - Tests creation, deletion, and edge cases

3. **Documentation**: `PROJECT_USER_PERMISSIONS_HOOK.md`
   - Complete technical documentation

## How to Register the Hook

### Step 1: Open hooks.py

Edit `apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/hooks.py`

### Step 2: Uncomment the doc_events Section

Find the commented-out `doc_events` section (around line 119) and uncomment it:

**BEFORE:**
```python
# doc_events = {
# 	"Project": {
# 		"after_save": "frappe_devsecops_dashboard.doc_hooks.project_user_permissions.handle_project_user_permissions"
# 	}
# }
```

**AFTER:**
```python
doc_events = {
	"Project": {
		"after_save": "frappe_devsecops_dashboard.doc_hooks.project_user_permissions.handle_project_user_permissions"
	}
}
```

### Step 3: Clear Cache and Restart

```bash
cd /home/erpuser/frappe-bench
bench --site desk.kns.co.ke clear-cache
bench restart
```

## How It Works

### Automatic Operation

When a Project is saved:

1. **Hook Triggered**: The `after_save` hook calls `handle_project_user_permissions()`
2. **User Comparison**: Compares current users with previous users in the database
3. **New Users**: For each newly added user, creates a User Permission
4. **Removed Users**: For each removed user, deletes their User Permission
5. **Logging**: All operations are logged with `[Project User Permissions]` prefix

### Example Usage

```python
# Adding a user to a project
project = frappe.get_doc("Project", "PRJ-001")
project.append("users", {"user": "user@example.com"})
project.save()
# → User Permission automatically created

# Removing a user from a project
project = frappe.get_doc("Project", "PRJ-001")
project.users = []  # Remove all users
project.save()
# → User Permissions automatically deleted
```

## User Permission Details

When a User Permission is created, it has these properties:

- **user**: The user ID/email
- **allow**: "Project" (the DocType)
- **for_value**: The project name
- **apply_to_all_doctypes**: 1 (applies to all doctypes)
- **is_default**: 0
- **hide_descendants**: 0

## Testing

### Run All Tests

```bash
bench --site desk.kns.co.ke run-tests --module frappe_devsecops_dashboard.tests.test_project_user_permissions
```

### Test Cases Included

1. **test_create_user_permission_on_add_user** - Single user addition
2. **test_create_multiple_user_permissions** - Multiple users addition
3. **test_no_duplicate_user_permissions** - Duplicate prevention
4. **test_remove_user_permission_on_remove_user** - User removal
5. **test_selective_user_removal** - Partial user removal
6. **test_create_user_permission_function** - Direct function call
7. **test_remove_user_permission_function** - Direct function removal

## Error Handling

The hook includes comprehensive error handling:

- **DuplicateEntryError**: Handled gracefully when permission already exists
- **DoesNotExistError**: Handled when trying to remove non-existent permission
- **General Exceptions**: Caught and logged without preventing project save

**Key Principle**: The hook never prevents a project from being saved, even if User Permission operations fail.

## Logging

All operations are logged with the prefix `[Project User Permissions]`:

```
[Project User Permissions] Created User Permission for user: user@example.com, project: PRJ-001
[Project User Permissions] Removed User Permission for user: user@example.com, project: PRJ-001
[Project User Permissions] User Permission already exists for user: user@example.com, project: PRJ-001
```

Errors are logged to both the console and Frappe's error log.

## Troubleshooting

### Hook Not Triggering

1. Verify hook is uncommented in `hooks.py`
2. Check that the path is correct: `frappe_devsecops_dashboard.doc_hooks.project_user_permissions.handle_project_user_permissions`
3. Clear cache: `bench --site desk.kns.co.ke clear-cache`
4. Restart Frappe: `bench restart`
5. Check Frappe logs for errors

### Permissions Not Created

1. Verify User Permission DocType exists
2. Check Frappe logs for errors
3. Ensure the user being added exists in the system
4. Check if the project is being saved via API or UI

### Duplicate Permissions

The hook prevents duplicates automatically. If duplicates exist from before the hook was enabled:

```python
# Clean up duplicates via console
frappe.db.delete(
    "User Permission",
    {
        "user": "user@example.com",
        "allow": "Project",
        "for_value": "PRJ-001"
    }
)
```

## Performance Considerations

- **Efficient Comparison**: Uses set operations for O(n) complexity
- **Batch Operations**: Processes all user changes in single hook call
- **Lazy Loading**: Only fetches previous users if project is not new
- **Indexed Queries**: Uses indexed fields (user, allow, for_value)

## Manual Function Usage

You can also call the functions directly if needed:

```python
from frappe_devsecops_dashboard.doc_hooks.project_user_permissions import (
    create_user_permission,
    remove_user_permission
)

# Create permission
create_user_permission("user@example.com", "PRJ-001")

# Remove permission
remove_user_permission("user@example.com", "PRJ-001")
```

## Next Steps

1. Uncomment the `doc_events` section in `hooks.py`
2. Clear cache and restart Frappe
3. Run the test suite to verify everything works
4. Test manually by adding/removing users from a project
5. Monitor logs for any issues

## Support

For detailed technical documentation, see `PROJECT_USER_PERMISSIONS_HOOK.md`.

