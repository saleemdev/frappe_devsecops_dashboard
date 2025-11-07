# Project User Permissions - Visual Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frappe Framework                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Project DocType                         │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  users (Child Table)                           │  │  │
│  │  │  ├─ user: john@example.com                     │  │  │
│  │  │  ├─ user: jane@example.com                     │  │  │
│  │  │  └─ user: bob@example.com                      │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│                    after_save Hook                          │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  handle_project_user_permissions()                  │  │
│  │  ├─ Get current users                              │  │
│  │  ├─ Get previous users from DB                     │  │
│  │  ├─ Calculate new users (current - previous)       │  │
│  │  ├─ Calculate removed users (previous - current)   │  │
│  │  ├─ For each new user: create_user_permission()   │  │
│  │  └─ For each removed user: remove_user_permission()│  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           User Permission DocType                   │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ user: john@example.com                         │  │  │
│  │  │ allow: Project                                 │  │  │
│  │  │ for_value: PRJ-001                             │  │  │
│  │  │ apply_to_all_doctypes: 1                       │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ user: jane@example.com                         │  │  │
│  │  │ allow: Project                                 │  │  │
│  │  │ for_value: PRJ-001                             │  │  │
│  │  │ apply_to_all_doctypes: 1                       │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   User Action                               │
│              Add/Remove Users from Project                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
            ┌────────────────────────┐
            │  Project.save()        │
            └────────────┬───────────┘
                         │
                         ↓
            ┌────────────────────────────────────┐
            │  after_save Hook Triggered         │
            │  handle_project_user_permissions() │
            └────────────┬───────────────────────┘
                         │
                ┌────────┴────────┐
                │                 │
                ↓                 ↓
        ┌──────────────┐  ┌──────────────┐
        │ New Users?   │  │ Removed      │
        │              │  │ Users?       │
        └──────┬───────┘  └──────┬───────┘
               │                 │
               ↓                 ↓
        ┌──────────────┐  ┌──────────────┐
        │ create_user_ │  │ remove_user_ │
        │ permission() │  │ permission() │
        └──────┬───────┘  └──────┬───────┘
               │                 │
               ↓                 ↓
        ┌──────────────┐  ┌──────────────┐
        │ Check if     │  │ Find         │
        │ exists       │  │ permission   │
        └──────┬───────┘  └──────┬───────┘
               │                 │
        ┌──────┴──────┐   ┌──────┴──────┐
        │             │   │             │
        ↓             ↓   ↓             ↓
    Exists?      Not Exists?  Exists?  Not Exists?
        │             │       │         │
        ↓             ↓       ↓         ↓
      Skip         Create    Delete    Skip
        │             │       │         │
        └─────┬───────┘       └────┬────┘
              │                    │
              ↓                    ↓
        ┌──────────────────────────────┐
        │  Log Operation               │
        │  [Project User Permissions]  │
        └──────────────┬───────────────┘
                       │
                       ↓
            ┌──────────────────────┐
            │  Project Save        │
            │  Completes           │
            └──────────────────────┘
```

## Function Call Hierarchy

```
handle_project_user_permissions(doc, method)
│
├─ Get current users from doc.users
│
├─ Get previous users from database
│
├─ Calculate new_users = current - previous
│
├─ Calculate removed_users = previous - current
│
├─ For each user in new_users:
│  └─ create_user_permission(user, project_name)
│     ├─ Check if permission exists
│     ├─ If not exists:
│     │  ├─ Create new User Permission doc
│     │  ├─ Set fields (user, allow, for_value, etc.)
│     │  ├─ Insert with ignore_permissions=True
│     │  └─ Log success
│     ├─ If exists:
│     │  └─ Log info (already exists)
│     └─ Handle exceptions
│
├─ For each user in removed_users:
│  └─ remove_user_permission(user, project_name)
│     ├─ Find permission in database
│     ├─ If found:
│     │  ├─ Delete permission
│     │  └─ Log success
│     ├─ If not found:
│     │  └─ Log info (not found)
│     └─ Handle exceptions
│
└─ Log overall operation
```

## State Transition Diagram

```
                    ┌─────────────────┐
                    │  Project Saved  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Compare Users   │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ↓                ↓                ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ New Users    │ │ Same Users   │ │ Removed      │
    │ Detected     │ │ (No Change)  │ │ Users        │
    │              │ │              │ │ Detected     │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
           ↓                ↓                ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Create User  │ │ Skip         │ │ Remove User  │
    │ Permissions  │ │ (No Action)  │ │ Permissions  │
    │              │ │              │ │              │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                    ┌───────▼────────┐
                    │ Log Operation  │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ Project Saved  │
                    │ Successfully   │
                    └────────────────┘
```

## Error Handling Flow

```
┌──────────────────────────────────┐
│ Operation (Create/Remove)        │
└────────────┬─────────────────────┘
             │
             ↓
    ┌────────────────┐
    │ Try Operation  │
    └────────┬───────┘
             │
    ┌────────┴────────────────────────┐
    │                                 │
    ↓                                 ↓
┌─────────────┐              ┌──────────────────┐
│ Success     │              │ Exception        │
└────┬────────┘              └────────┬─────────┘
     │                                │
     ↓                                ↓
┌─────────────┐              ┌──────────────────┐
│ Log Info    │              │ Catch Exception  │
│ Return      │              └────────┬─────────┘
│ Result      │                       │
└────┬────────┘              ┌────────▼─────────┐
     │                       │ Log Error        │
     │                       │ (Console + DB)   │
     │                       └────────┬─────────┘
     │                                │
     │                       ┌────────▼─────────┐
     │                       │ Return None/False│
     │                       └────────┬─────────┘
     │                                │
     └────────────┬────────────────────┘
                  │
          ┌───────▼────────┐
          │ Project Save   │
          │ Continues      │
          │ (Never Blocked)│
          └────────────────┘
```

## Setup Checklist

```
┌─────────────────────────────────────────────────────────┐
│  Project User Permissions Setup Checklist              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ☐ Step 1: Review Implementation                       │
│    └─ File: doc_hooks/project_user_permissions.py      │
│                                                         │
│  ☐ Step 2: Edit hooks.py                              │
│    └─ Uncomment doc_events (line ~119)                │
│    └─ Path: frappe_devsecops_dashboard/hooks.py       │
│                                                         │
│  ☐ Step 3: Clear Cache                                │
│    └─ Command: bench --site desk.kns.co.ke clear-cache│
│                                                         │
│  ☐ Step 4: Restart Frappe                             │
│    └─ Command: bench restart                          │
│                                                         │
│  ☐ Step 5: Run Tests                                  │
│    └─ Command: bench --site desk.kns.co.ke run-tests  │
│    └─ Module: frappe_devsecops_dashboard.tests.test_  │
│       project_user_permissions                         │
│                                                         │
│  ☐ Step 6: Manual Testing                             │
│    └─ Add user to project                             │
│    └─ Verify User Permission created                  │
│    └─ Remove user from project                        │
│    └─ Verify User Permission deleted                  │
│                                                         │
│  ☐ Step 7: Monitor Logs                               │
│    └─ Check for [Project User Permissions] prefix     │
│    └─ Verify no errors                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
frappe_devsecops_dashboard/
├── frappe_devsecops_dashboard/
│   ├── doc_hooks/
│   │   ├── __init__.py
│   │   └── project_user_permissions.py  ← Business Logic
│   ├── tests/
│   │   └── test_project_user_permissions.py  ← Unit Tests
│   └── hooks.py  ← Register hook here
│
├── PROJECT_USER_PERMISSIONS_HOOK.md  ← Technical Docs
├── SETUP_PROJECT_USER_PERMISSIONS_HOOK.md  ← Setup Guide
├── PROJECT_USER_PERMISSIONS_QUICK_REFERENCE.md  ← Quick Ref
├── PROJECT_USER_PERMISSIONS_IMPLEMENTATION_SUMMARY.md  ← Summary
└── PROJECT_USER_PERMISSIONS_VISUAL_GUIDE.md  ← This File
```

