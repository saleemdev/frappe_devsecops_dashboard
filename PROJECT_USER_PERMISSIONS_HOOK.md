# Project User Permissions Hook Implementation

## Overview

This document describes the automatic User Permission creation hook for the Project DocType. When users are added to a project's team members, User Permissions are automatically created to grant them access to that specific project. When users are removed, their permissions are automatically deleted.

## Architecture

### Files Involved

1. **Hook Module**: `frappe_devsecops_dashboard/hooks/project_user_permissions.py`
   - Contains the main hook logic
   - Handles User Permission creation and deletion
   - Includes error handling and logging

2. **Hooks Configuration**: `frappe_devsecops_dashboard/hooks.py`
   - Registers the `after_save` hook for the Project DocType
   - Points to the hook module function

3. **Unit Tests**: `frappe_devsecops_dashboard/tests/test_project_user_permissions.py`
   - Comprehensive test suite for the hook functionality
   - Tests creation, deletion, and edge cases

## How It Works

### Hook Flow

```
Project Document Saved
    ↓
after_save Hook Triggered
    ↓
handle_project_user_permissions() Called
    ↓
Compare Current Users vs Previous Users
    ↓
├─ New Users Detected → create_user_permission()
│   ├─ Check if permission already exists
│   ├─ Create User Permission document
│   └─ Log operation
│
└─ Removed Users Detected → remove_user_permission()
    ├─ Find User Permission
    ├─ Delete User Permission
    └─ Log operation
```

### Key Functions

#### `handle_project_user_permissions(doc, method=None)`

**Purpose**: Main hook function called on Project after_save

**Parameters**:
- `doc`: The Project document being saved
- `method`: Hook method name (after_save)

**Logic**:
1. Extracts current users from `doc.users` table
2. Fetches previous users from database (if not new project)
3. Calculates newly added users (current - previous)
4. Calculates removed users (previous - current)
5. Creates permissions for new users
6. Removes permissions for deleted users
7. Logs all operations

**Error Handling**: Catches all exceptions and logs them without preventing project save

#### `create_user_permission(user, project_name)`

**Purpose**: Creates a User Permission for a user-project combination

**Parameters**:
- `user`: User ID/email
- `project_name`: Project name

**Returns**: Created User Permission document or None

**Validation**:
- Checks if permission already exists using `frappe.db.exists()`
- Prevents duplicate permissions
- Handles race conditions with DuplicateEntryError

**User Permission Fields Set**:
- `user`: The user ID
- `allow`: "Project" (DocType)
- `for_value`: Project name
- `apply_to_all_doctypes`: 1 (applies to all doctypes)
- `is_default`: 0
- `hide_descendants`: 0

#### `remove_user_permission(user, project_name)`

**Purpose**: Removes a User Permission for a user-project combination

**Parameters**:
- `user`: User ID/email
- `project_name`: Project name

**Returns**: True if removed, False otherwise

**Logic**:
1. Finds User Permission with matching criteria
2. Deletes the permission if found
3. Returns status

## Usage

### Automatic Operation

The hook operates automatically when:

1. **Adding Users to Project**:
   ```python
   project = frappe.get_doc("Project", "PRJ-001")
   project.append("users", {"user": "user@example.com"})
   project.save()
   # User Permission automatically created
   ```

2. **Removing Users from Project**:
   ```python
   project = frappe.get_doc("Project", "PRJ-001")
   project.users = []  # Remove all users
   project.save()
   # User Permissions automatically deleted
   ```

3. **Updating Project with User Changes**:
   ```python
   project = frappe.get_doc("Project", "PRJ-001")
   # Modify users table
   project.save()
   # Hook detects changes and updates permissions
   ```

### Manual Function Usage

You can also call the functions directly:

```python
from frappe_devsecops_dashboard.hooks.project_user_permissions import (
    create_user_permission,
    remove_user_permission
)

# Create permission
create_user_permission("user@example.com", "PRJ-001")

# Remove permission
remove_user_permission("user@example.com", "PRJ-001")
```

## Testing

### Running Tests

```bash
# Run all tests
bench --site desk.kns.co.ke run-tests frappe_devsecops_dashboard.tests.test_project_user_permissions

# Run specific test
bench --site desk.kns.co.ke run-tests frappe_devsecops_dashboard.tests.test_project_user_permissions::TestProjectUserPermissions::test_create_user_permission_on_add_user
```

### Test Coverage

The test suite covers:

1. **Creation Tests**:
   - Single user permission creation
   - Multiple user permissions creation
   - Duplicate prevention

2. **Deletion Tests**:
   - User permission removal on user deletion
   - Selective user removal (only affected users)

3. **Function Tests**:
   - Direct function calls
   - Return value validation

4. **Edge Cases**:
   - Non-existent users
   - Already existing permissions
   - Project updates without user changes

## Logging

All operations are logged with the prefix `[Project User Permissions]`:

```
[Project User Permissions] Created User Permission for user: user@example.com, project: PRJ-001
[Project User Permissions] Removed User Permission for user: user@example.com, project: PRJ-001
[Project User Permissions] User Permission already exists for user: user@example.com, project: PRJ-001
```

Errors are logged to both the console and Frappe's error log:

```
[Project User Permissions] Error handling Project User Permissions for PRJ-001: <error details>
```

## Error Handling

The hook includes comprehensive error handling:

1. **DuplicateEntryError**: Handled gracefully when permission already exists
2. **DoesNotExistError**: Handled when trying to remove non-existent permission
3. **General Exceptions**: Caught and logged without preventing project save

**Key Principle**: The hook never prevents a project from being saved, even if User Permission operations fail.

## Database Queries

### Check for Existing Permission

```python
frappe.db.exists(
    "User Permission",
    {
        "user": user,
        "allow": "Project",
        "for_value": project_name
    }
)
```

### Find Permission to Delete

```python
perm_name = frappe.db.exists(
    "User Permission",
    {
        "user": user,
        "allow": "Project",
        "for_value": project_name
    }
)
```

## Performance Considerations

1. **Efficient Comparison**: Uses set operations for O(n) complexity
2. **Batch Operations**: Processes all user changes in single hook call
3. **Lazy Loading**: Only fetches previous users if project is not new
4. **Indexed Queries**: Uses indexed fields (user, allow, for_value)

## Troubleshooting

### Permissions Not Created

1. Check if hook is registered in `hooks.py`
2. Verify User Permission DocType exists
3. Check Frappe logs for errors
4. Ensure user has System Manager role for permission creation

### Duplicate Permissions

The hook prevents duplicates automatically. If duplicates exist:

```python
# Clean up duplicates
frappe.db.delete(
    "User Permission",
    {
        "user": "user@example.com",
        "allow": "Project",
        "for_value": "PRJ-001"
    }
)
```

### Hook Not Triggering

1. Verify hook is enabled: Check `hooks.py` doc_events
2. Clear cache: `bench --site desk.kns.co.ke clear-cache`
3. Restart Frappe: `bench restart`
4. Check if Project is being saved via API or UI

## Future Enhancements

1. **Configurable Behavior**: Add setting to enable/disable hook
2. **Selective DocType Application**: Allow specifying which doctypes permission applies to
3. **Bulk Operations**: Optimize for bulk user additions
4. **Audit Trail**: Track permission creation/deletion history
5. **Notifications**: Notify users when added to projects

## Related Documentation

- [Frappe User Permissions](https://frappeframework.com/docs/user/en/guide/basics/users-and-permissions)
- [Frappe DocType Hooks](https://frappeframework.com/docs/user/en/guide/customization/hooks)
- [Project DocType](https://erpnext.com/docs/user/manual/en/projects/project)

