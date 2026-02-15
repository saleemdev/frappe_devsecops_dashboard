# Backend Patterns - DevSecOps Dashboard

## Frappe API Endpoint Patterns

### Standard API Endpoint Structure

All API endpoints follow a consistent pattern using the `@frappe.whitelist()` decorator:

```python
# frappe_devsecops_dashboard/api/module_name.py
import frappe
from frappe import _

@frappe.whitelist()
def get_items(filters=None, page=1, page_size=10):
    """
    Get list of items with pagination and filters

    Args:
        filters (dict): Filter criteria
        page (int): Page number (1-indexed)
        page_size (int): Number of items per page

    Returns:
        dict: { success, data, total, message, error }
    """
    try:
        # Parse filters
        if isinstance(filters, str):
            import json
            filters = json.loads(filters)

        filters = filters or {}

        # Build query
        items = frappe.get_list(
            'DocType Name',
            fields=['name', 'field1', 'field2', 'modified'],
            filters=filters,
            start=(int(page) - 1) * int(page_size),
            page_length=int(page_size),
            order_by='modified desc'
        )

        # Get total count
        total = frappe.db.count('DocType Name', filters=filters)

        return {
            'success': True,
            'data': items,
            'total': total
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        return {
            'success': False,
            'error': 'Permission denied',
            'error_type': 'permission_error'
        }

    except frappe.ValidationError as ve:
        frappe.response['http_status_code'] = 400
        return {
            'success': False,
            'error': str(ve),
            'error_type': 'validation_error'
        }

    except Exception as e:
        frappe.log_error(f"Error in get_items: {str(e)}", "API Error")
        frappe.response['http_status_code'] = 500
        return {
            'success': False,
            'error': 'An unexpected error occurred',
            'error_type': 'server_error'
        }

@frappe.whitelist()
def create_item(data):
    """
    Create a new item

    Args:
        data (dict): Item data

    Returns:
        dict: { success, data, message }
    """
    try:
        # Parse JSON if string
        if isinstance(data, str):
            import json
            data = json.loads(data)

        # Validate required fields
        required_fields = ['field1', 'field2']
        for field in required_fields:
            if not data.get(field):
                frappe.throw(_(f'{field} is required'))

        # Create document
        doc = frappe.get_doc({
            'doctype': 'DocType Name',
            **data
        })
        doc.insert()

        return {
            'success': True,
            'data': doc.as_dict(),
            'message': 'Item created successfully'
        }

    except frappe.ValidationError as ve:
        frappe.response['http_status_code'] = 400
        raise

    except Exception as e:
        frappe.log_error(f"Error creating item: {str(e)}", "Create Item Error")
        frappe.response['http_status_code'] = 500
        frappe.throw(_('Failed to create item'))

@frappe.whitelist()
def update_item(name, data):
    """
    Update an existing item

    Args:
        name (str): Item name/ID
        data (dict): Updated data

    Returns:
        dict: { success, data, message }
    """
    try:
        # Parse JSON if string
        if isinstance(data, str):
            import json
            data = json.loads(data)

        # Get document
        doc = frappe.get_doc('DocType Name', name)

        # Update fields
        for key, value in data.items():
            if key != 'name' and hasattr(doc, key):
                setattr(doc, key, value)

        doc.save()

        return {
            'success': True,
            'data': doc.as_dict(),
            'message': 'Item updated successfully'
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        return {
            'success': False,
            'error': 'Item not found',
            'error_type': 'not_found'
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise

    except Exception as e:
        frappe.log_error(f"Error updating item: {str(e)}", "Update Item Error")
        frappe.response['http_status_code'] = 500
        frappe.throw(_('Failed to update item'))

@frappe.whitelist()
def delete_item(name):
    """
    Delete an item

    Args:
        name (str): Item name/ID

    Returns:
        dict: { success, message }
    """
    try:
        frappe.delete_doc('DocType Name', name)

        return {
            'success': True,
            'message': 'Item deleted successfully'
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise

    except Exception as e:
        frappe.log_error(f"Error deleting item: {str(e)}", "Delete Item Error")
        frappe.response['http_status_code'] = 500
        frappe.throw(_('Failed to delete item'))
```

## DocType Pattern

### Custom DocType Controller

```python
# frappe_devsecops_dashboard/doctype/example_doctype/example_doctype.py
import frappe
from frappe.model.document import Document
from frappe import _

class ExampleDoctype(Document):
    """
    Custom DocType controller for Example
    """

    def validate(self):
        """
        Called before saving (insert or update)
        Use for validation and field transformations
        """
        # Validate required fields
        if not self.field1:
            frappe.throw(_('Field 1 is required'))

        # Auto-generate field
        if not self.auto_field:
            self.auto_field = self.generate_auto_field()

        # Validate business logic
        self.validate_business_rules()

    def before_save(self):
        """
        Called right before saving to database
        Use for final transformations
        """
        # Update timestamps
        if self.is_new():
            self.created_by_user = frappe.session.user

        self.modified_by_user = frappe.session.user

    def after_insert(self):
        """
        Called after document is inserted (created)
        Use for post-creation actions
        """
        # Create related documents
        self.create_related_documents()

        # Send notifications
        self.send_creation_notification()

    def on_update(self):
        """
        Called after document is updated
        Use for post-update actions
        """
        # Check if status changed
        if self.has_value_changed('status'):
            self.handle_status_change()

    def before_submit(self):
        """
        Called before document is submitted (if submittable)
        """
        self.validate_for_submission()

    def on_submit(self):
        """
        Called after document is submitted
        """
        self.create_submission_records()

    def on_cancel(self):
        """
        Called when document is cancelled
        """
        self.reverse_submission_records()

    def on_trash(self):
        """
        Called before document is deleted
        Use for cleanup and cascade deletes
        """
        # Delete related documents
        frappe.db.delete('Related DocType', {
            'parent_doc': self.name
        })

    # Custom methods
    def validate_business_rules(self):
        """Custom validation logic"""
        if self.field1 == self.field2:
            frappe.throw(_('Field 1 and Field 2 cannot be the same'))

    def generate_auto_field(self):
        """Generate auto field value"""
        return f"AUTO-{frappe.generate_hash(length=8)}"

    def create_related_documents(self):
        """Create related documents"""
        related_doc = frappe.get_doc({
            'doctype': 'Related DocType',
            'parent_doc': self.name,
            'field': 'value'
        })
        related_doc.insert()

    def send_creation_notification(self):
        """Send email notification"""
        frappe.sendmail(
            recipients=['user@example.com'],
            subject=f'New {self.doctype} Created',
            message=f'{self.doctype} {self.name} has been created'
        )

    def handle_status_change(self):
        """Handle status change logic"""
        if self.status == 'Approved':
            self.approved_by = frappe.session.user
            self.approved_on = frappe.utils.now()
```

### DocType JSON Structure

```json
{
 "name": "Example DocType",
 "doctype": "DocType",
 "module": "Frappe Devsecops Dashboard",
 "is_submittable": 1,
 "track_changes": 1,
 "autoname": "naming_series:",
 "fields": [
  {
   "fieldname": "field1",
   "fieldtype": "Data",
   "label": "Field 1",
   "reqd": 1
  },
  {
   "fieldname": "status",
   "fieldtype": "Select",
   "label": "Status",
   "options": "Draft\nActive\nInactive",
   "default": "Draft"
  },
  {
   "fieldname": "created_by_user",
   "fieldtype": "Link",
   "label": "Created By",
   "options": "User",
   "read_only": 1
  }
 ],
 "permissions": [
  {
   "role": "System Manager",
   "read": 1,
   "write": 1,
   "create": 1,
   "delete": 1
  }
 ]
}
```

## Doc Hooks Pattern

### Registering Doc Hooks in hooks.py

```python
# frappe_devsecops_dashboard/hooks.py

doc_events = {
    "Software Product": {
        "before_save": "frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.handle_software_product_zenhub_workspace"
    },
    "Project": {
        "after_save": "frappe_devsecops_dashboard.doc_hooks.project_user_permissions.handle_project_user_permissions",
        "before_save": "frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.project_extension.project_extension.on_project_before_save"
    },
    "Task": {
        "before_save": "frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.task_extension.task_extension.on_task_before_save"
    }
}
```

### Doc Hook Implementation

```python
# frappe_devsecops_dashboard/doc_hooks/example_hook.py
import frappe
from frappe import _

def handle_document_event(doc, method=None):
    """
    Handle document event

    Args:
        doc: Document instance
        method: Event method name (before_save, after_save, etc.)
    """
    try:
        # Access document fields
        field_value = doc.get('field_name')

        # Modify document (only in before_save)
        if method == 'before_save':
            doc.auto_field = generate_value()

        # Create related documents (after_save)
        if method == 'after_save':
            create_related_doc(doc.name)

        # Log activity
        frappe.log_error(
            f"Event {method} for {doc.doctype} {doc.name}",
            "Doc Hook Log"
        )

    except Exception as e:
        frappe.log_error(
            f"Error in doc hook: {str(e)}",
            "Doc Hook Error"
        )
        # Don't raise - allow document save to continue
```

### Real Example: Software Product ZenHub Hook

```python
# frappe_devsecops_dashboard/doc_hooks/software_product_zenhub.py
import frappe
from frappe import _

def handle_software_product_zenhub_workspace(doc, method=None):
    """
    Auto-create ZenHub workspace when Software Product is saved
    """
    try:
        # Skip if workspace already exists
        if doc.zenhub_workspace_id:
            return

        # Generate workspace name
        workspace_name = f"DSO-{doc.product_name}"

        # Check if workspace exists
        existing = search_workspace_by_name(workspace_name)
        if existing:
            doc.zenhub_workspace_id = existing['id']
            return

        # Create new workspace
        workspace = create_zenhub_workspace(workspace_name, doc.description)

        # Update document
        doc.zenhub_workspace_id = workspace['id']
        frappe.msgprint(_(f'ZenHub workspace created: {workspace_name}'))

    except Exception as e:
        frappe.log_error(
            f"Error creating ZenHub workspace: {str(e)}",
            "ZenHub Workspace Creation Error"
        )
        # Don't fail the save

def search_workspace_by_name(name):
    """Search for existing workspace"""
    from frappe_devsecops_dashboard.api.zenhub import execute_graphql_query

    query = """
    query SearchWorkspace($name: String!) {
        searchWorkspaces(query: $name) {
            nodes {
                id
                name
            }
        }
    }
    """

    result = execute_graphql_query(query, {'name': name})
    nodes = result.get('data', {}).get('searchWorkspaces', {}).get('nodes', [])

    return nodes[0] if nodes else None

def create_zenhub_workspace(name, description):
    """Create new ZenHub workspace"""
    from frappe_devsecops_dashboard.api.zenhub import execute_graphql_query

    mutation = """
    mutation CreateWorkspace($name: String!, $description: String) {
        createWorkspace(input: {name: $name, description: $description}) {
            workspace {
                id
                name
            }
        }
    }
    """

    result = execute_graphql_query(mutation, {
        'name': name,
        'description': description
    })

    return result['data']['createWorkspace']['workspace']
```

## Async Job Pattern

### Enqueueing Background Jobs

```python
import frappe

@frappe.whitelist()
def trigger_long_running_task(param1, param2):
    """
    Trigger a long-running background task
    """
    frappe.enqueue(
        'frappe_devsecops_dashboard.api.module.long_running_function',
        queue='default',          # Queue: default, short, long
        timeout=300,              # Timeout in seconds
        is_async=True,            # Run asynchronously
        job_name=f'job_{param1}', # Unique job name
        param1=param1,
        param2=param2
    )

    return {
        'success': True,
        'message': 'Task queued successfully'
    }

def long_running_function(param1, param2):
    """
    Long-running function executed in background
    """
    try:
        # Perform long operation
        for i in range(100):
            # Process item
            process_item(i)

            # Update progress
            frappe.publish_progress(
                percent=i,
                title='Processing',
                description=f'Processing item {i}'
            )

        # Log completion
        frappe.log_error(
            f"Job completed: {param1}, {param2}",
            "Job Completion"
        )

    except Exception as e:
        frappe.log_error(f"Job failed: {str(e)}", "Job Error")
```

## Caching Pattern

### Using Frappe Cache

```python
import frappe

def get_cached_data(key):
    """
    Get data from cache or compute
    """
    cache_key = f'custom_cache_{key}'

    # Try to get from cache
    cached_value = frappe.cache().get_value(cache_key)
    if cached_value:
        return cached_value

    # Compute value
    value = compute_expensive_operation(key)

    # Cache for 1 hour (3600 seconds)
    frappe.cache().set_value(cache_key, value, expires_in_sec=3600)

    return value

def invalidate_cache(key):
    """
    Invalidate cache entry
    """
    cache_key = f'custom_cache_{key}'
    frappe.cache().delete_value(cache_key)

# Example: ZenHub token caching
def get_zenhub_token():
    """
    Get ZenHub token from cache or database
    """
    CACHE_KEY = 'zenhub_token'
    CACHE_TTL = 3600  # 1 hour

    # Check cache
    cached_token = frappe.cache().get_value(CACHE_KEY)
    if cached_token:
        return cached_token

    # Get from database
    token = frappe.db.get_single_value('Zenhub Settings', 'zenhub_token')

    if not token:
        frappe.throw(_('ZenHub token not configured'))

    # Decrypt if encrypted
    from frappe.utils.password import get_decrypted_password
    token = get_decrypted_password('Zenhub Settings', 'Zenhub Settings', 'zenhub_token')

    # Cache token
    frappe.cache().set_value(CACHE_KEY, token, expires_in_sec=CACHE_TTL)

    return token
```

## Permission Pattern

### Checking Permissions

```python
import frappe

def check_permission_example():
    """
    Examples of permission checking
    """
    # Check if user has permission
    if not frappe.has_permission('DocType Name', 'read'):
        frappe.throw(_('You do not have permission to read this document'))

    # Check specific document permission
    doc = frappe.get_doc('DocType Name', 'DOC-001')
    if not doc.has_permission('write'):
        frappe.throw(_('You do not have permission to edit this document'))

    # Check role
    if 'System Manager' not in frappe.get_roles():
        frappe.throw(_('Only System Managers can perform this action'))

@frappe.whitelist()
def get_items_with_permission():
    """
    Get items respecting user permissions
    """
    # frappe.get_list automatically respects permissions
    items = frappe.get_list(
        'DocType Name',
        fields=['name', 'field1', 'field2'],
        filters={'status': 'Active'}
    )

    return items

def grant_user_permission(user, doctype, docname):
    """
    Grant user permission to specific document
    """
    # Check if permission already exists
    exists = frappe.db.exists('User Permission', {
        'user': user,
        'allow': doctype,
        'for_value': docname
    })

    if exists:
        return

    # Create user permission
    user_perm = frappe.get_doc({
        'doctype': 'User Permission',
        'user': user,
        'allow': doctype,
        'for_value': docname,
        'apply_to_all_doctypes': 1
    })
    user_perm.insert()

def remove_user_permission(user, doctype, docname):
    """
    Remove user permission
    """
    perms = frappe.get_all('User Permission', {
        'user': user,
        'allow': doctype,
        'for_value': docname
    })

    for perm in perms:
        frappe.delete_doc('User Permission', perm.name)
```

## Scheduler Jobs Pattern

### Registering Scheduled Jobs

```python
# frappe_devsecops_dashboard/hooks.py

scheduler_events = {
    # Cron format: "0 */4 * * *" = Every 4 hours
    "cron": {
        "0 */4 * * *": [
            "frappe_devsecops_dashboard.api.change_request_reminders.send_approval_reminders"
        ]
    },

    # Daily jobs
    "daily": [
        "frappe_devsecops_dashboard.api.maintenance.cleanup_old_logs"
    ],

    # Hourly jobs
    "hourly": [
        "frappe_devsecops_dashboard.api.sync.sync_zenhub_data"
    ],

    # Every 5 minutes
    "all": [
        "frappe_devsecops_dashboard.api.monitoring.check_system_health"
    ]
}
```

### Scheduler Job Implementation

```python
# frappe_devsecops_dashboard/api/scheduled_tasks.py
import frappe
from frappe.utils import now_datetime, add_days

def send_approval_reminders():
    """
    Send reminders to approvers (runs every 4 hours)
    """
    try:
        # Get pending change requests
        pending_crs = frappe.get_all(
            'Change Request',
            filters={
                'approval_status': 'Pending',
                'status': ['!=', 'Cancelled']
            },
            fields=['name', 'cr_number', 'title']
        )

        for cr in pending_crs:
            send_reminder_for_cr(cr.name)

        frappe.log_error(
            f"Sent reminders for {len(pending_crs)} change requests",
            "Approval Reminders"
        )

    except Exception as e:
        frappe.log_error(f"Error sending reminders: {str(e)}", "Reminder Error")

def cleanup_old_logs():
    """
    Cleanup logs older than 30 days
    """
    try:
        cutoff_date = add_days(now_datetime(), -30)

        # Delete old logs
        frappe.db.delete('Zenhub GraphQL API Log', {
            'creation': ['<', cutoff_date]
        })

        frappe.db.commit()

    except Exception as e:
        frappe.log_error(f"Error cleaning up logs: {str(e)}", "Cleanup Error")
```

## Database Query Patterns

### Using Frappe ORM

```python
import frappe

# Get single document
doc = frappe.get_doc('DocType Name', 'DOC-001')

# Get value from single doctype
value = frappe.db.get_single_value('Settings DocType', 'field_name')

# Get list with filters
items = frappe.get_list(
    'DocType Name',
    fields=['name', 'field1', 'field2', 'modified'],
    filters={
        'status': 'Active',
        'field1': ['like', '%search%'],
        'created': ['>', '2024-01-01']
    },
    order_by='modified desc',
    start=0,
    page_length=20
)

# Get value from specific document
value = frappe.db.get_value('DocType Name', 'DOC-001', 'field_name')

# Get multiple values
values = frappe.db.get_value(
    'DocType Name',
    'DOC-001',
    ['field1', 'field2', 'field3'],
    as_dict=True
)

# Check if exists
exists = frappe.db.exists('DocType Name', 'DOC-001')
# Or with filters
exists = frappe.db.exists('DocType Name', {'field': 'value'})

# Count records
count = frappe.db.count('DocType Name', filters={'status': 'Active'})

# Raw SQL (use sparingly)
results = frappe.db.sql("""
    SELECT name, field1, field2
    FROM `tabDocType Name`
    WHERE status = %s
    ORDER BY modified DESC
    LIMIT 20
""", ('Active',), as_dict=True)

# Insert/Update/Delete
frappe.db.set_value('DocType Name', 'DOC-001', 'field_name', 'new_value')
frappe.db.delete('DocType Name', {'status': 'Archived'})

# Commit (use carefully, usually automatic)
frappe.db.commit()
```

## Error Handling and Logging

### Standard Error Handling

```python
import frappe
from frappe import _

@frappe.whitelist()
def api_with_error_handling():
    """
    API endpoint with comprehensive error handling
    """
    try:
        # Main logic
        result = perform_operation()

        return {
            'success': True,
            'data': result
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        return {
            'success': False,
            'error': 'Permission denied',
            'error_type': 'permission_error'
        }

    except frappe.ValidationError as ve:
        frappe.response['http_status_code'] = 400
        return {
            'success': False,
            'error': str(ve),
            'error_type': 'validation_error'
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        return {
            'success': False,
            'error': 'Resource not found',
            'error_type': 'not_found'
        }

    except Exception as e:
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Error in api_with_error_handling"
        )
        frappe.response['http_status_code'] = 500
        return {
            'success': False,
            'error': 'An unexpected error occurred',
            'error_type': 'server_error'
        }

### Logging Patterns

```python
# Error logging
frappe.log_error(
    message="Detailed error message with traceback",
    title="Error Title"
)

# Info logging
frappe.logger().info(f"Operation completed successfully: {data}")

# Debug logging
frappe.logger().debug(f"Debug info: {debug_data}")

# Warning logging
frappe.logger().warning(f"Warning: {warning_message}")
```

## Key Files Reference

- **Main API Modules:** [frappe_devsecops_dashboard/api/](frappe_devsecops_dashboard/api/)
  - [dashboard.py](frappe_devsecops_dashboard/api/dashboard.py) - Dashboard metrics API
  - [zenhub.py](frappe_devsecops_dashboard/api/zenhub.py) - ZenHub integration
  - [incidents.py](frappe_devsecops_dashboard/api/incidents.py) - Incident management
  - [change_request.py](frappe_devsecops_dashboard/api/change_request.py) - Change requests

- **Doc Hooks:** [frappe_devsecops_dashboard/doc_hooks/](frappe_devsecops_dashboard/doc_hooks/)
  - [software_product_zenhub.py](frappe_devsecops_dashboard/doc_hooks/software_product_zenhub.py) - Auto-create workspaces
  - [project_user_permissions.py](frappe_devsecops_dashboard/doc_hooks/project_user_permissions.py) - Permission management

- **App Configuration:** [frappe_devsecops_dashboard/hooks.py](frappe_devsecops_dashboard/hooks.py)
