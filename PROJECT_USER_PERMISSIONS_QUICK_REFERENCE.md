# Project User Permissions Hook - Quick Reference

## What Does It Do?

Automatically creates User Permissions when users are added to a project, and removes them when users are removed.

## Files

| File | Purpose |
|------|---------|
| `doc_hooks/project_user_permissions.py` | Business logic (already implemented) |
| `tests/test_project_user_permissions.py` | Unit tests (7 test cases) |
| `PROJECT_USER_PERMISSIONS_HOOK.md` | Technical documentation |
| `SETUP_PROJECT_USER_PERMISSIONS_HOOK.md` | Setup guide |

## Setup (3 Steps)

### 1. Edit hooks.py

Open: `frappe_devsecops_dashboard/hooks.py`

Find line ~119 and uncomment:

```python
doc_events = {
	"Project": {
		"after_save": "frappe_devsecops_dashboard.doc_hooks.project_user_permissions.handle_project_user_permissions"
	}
}
```

### 2. Clear Cache

```bash
bench --site desk.kns.co.ke clear-cache
```

### 3. Restart Frappe

```bash
bench restart
```

## How It Works

```
User adds someone to Project
         ↓
Project saved
         ↓
after_save hook triggered
         ↓
handle_project_user_permissions() called
         ↓
Compare current users vs previous users
         ↓
New users → create_user_permission()
Removed users → remove_user_permission()
         ↓
User Permission created/deleted
```

## Key Functions

### handle_project_user_permissions(doc, method=None)
- **When**: Called on Project after_save
- **What**: Detects user changes and calls create/remove functions
- **Error Handling**: Catches all errors, never prevents project save

### create_user_permission(user, project_name)
- **What**: Creates a User Permission for user-project combination
- **Checks**: Prevents duplicates with `frappe.db.exists()`
- **Returns**: Created permission or None

### remove_user_permission(user, project_name)
- **What**: Removes a User Permission for user-project combination
- **Returns**: True if removed, False otherwise

## User Permission Fields

```python
user = "user@example.com"
allow = "Project"
for_value = "PRJ-001"
apply_to_all_doctypes = 1
is_default = 0
hide_descendants = 0
```

## Testing

```bash
# Run all tests
bench --site desk.kns.co.ke run-tests --module frappe_devsecops_dashboard.tests.test_project_user_permissions

# Test cases:
# 1. Single user addition
# 2. Multiple users addition
# 3. Duplicate prevention
# 4. User removal
# 5. Partial user removal
# 6. Direct function calls
```

## Logging

All operations logged with `[Project User Permissions]` prefix:

```
[Project User Permissions] Created User Permission for user: user@example.com, project: PRJ-001
[Project User Permissions] Removed User Permission for user: user@example.com, project: PRJ-001
[Project User Permissions] Error handling Project User Permissions for PRJ-001: <error>
```

## Error Handling

| Error | Handling |
|-------|----------|
| DuplicateEntryError | Logged as warning, returns None |
| DoesNotExistError | Logged as warning, returns False |
| General Exception | Logged as error, never prevents save |

## Manual Usage

```python
from frappe_devsecops_dashboard.doc_hooks.project_user_permissions import (
    create_user_permission,
    remove_user_permission
)

# Create
create_user_permission("user@example.com", "PRJ-001")

# Remove
remove_user_permission("user@example.com", "PRJ-001")
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Hook not triggering | Check hooks.py is uncommented, clear cache, restart |
| Permissions not created | Check User Permission DocType exists, check logs |
| Duplicate permissions | Hook prevents new ones, clean up old ones manually |

## Performance

- **Complexity**: O(n) using set operations
- **Batch**: All user changes processed in single hook call
- **Lazy Loading**: Only fetches previous users if not new project
- **Indexed**: Uses indexed fields (user, allow, for_value)

## Example

```python
# Add user to project
project = frappe.get_doc("Project", "PRJ-001")
project.append("users", {"user": "john@example.com"})
project.save()
# → User Permission automatically created

# Remove user from project
project = frappe.get_doc("Project", "PRJ-001")
project.users = []
project.save()
# → User Permissions automatically deleted
```

## Key Principle

**The hook never prevents a project from being saved, even if User Permission operations fail.**

## Next Steps

1. Uncomment `doc_events` in `hooks.py`
2. Clear cache and restart
3. Run tests
4. Test manually
5. Monitor logs

See `SETUP_PROJECT_USER_PERMISSIONS_HOOK.md` for detailed setup guide.

