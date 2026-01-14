# ZenHub Dashboard - Quick Start Guide

## 3-Minute Setup

### Step 1: Configure ZenHub Settings (1 minute)
```
1. Go to: Awesome Bar → ZenHub Settings
2. Click: New
3. Paste your ZenHub API token in "Zenhub Token" field
4. Save
```

**Get API Token:**
- Visit: https://zenhub.com/settings/tokens
- Create new token with workspace read access
- Copy token and paste in step 3 above

### Step 2: Add Workspace ID to a Project (1 minute)
```
1. Go to: Projects → [Your Project]
2. Scroll down to "ZenHub Workspace ID"
3. Paste your workspace ID
4. Save
```

**Get Workspace ID:**
- In ZenHub, go to workspace settings
- URL format: `https://app.zenhub.com/w/[workspace-id]/`
- Copy the workspace ID part

### Step 3: Access Dashboard (1 minute)
```
1. Go to: Projects menu → ZenHub Dashboard
2. Dashboard loads automatically
3. View 4 tabs: Overview, Projects, Team, Sprints
```

---

## What Each Tab Shows

| Tab | Shows |
|-----|-------|
| **Overview** | Key metrics, story points, completion rate |
| **Projects** | All projects in workspace, task counts |
| **Team** | Team members, task assignments, utilization |
| **Sprints** | Sprint details, issue breakdown by status |

---

## Common Tasks

### Add Multiple Projects to Dashboard
```
1. Go to each Project in Frappe
2. Add the SAME Zenhub Workspace ID to each
3. They'll all appear in the dashboard
```

### Change Displayed Project
```
1. Use "Project" dropdown in dashboard
2. Select different project
3. View that project's sprints
```

### Refresh Data
```
1. Click "Refresh" button in dashboard
2. Data will fetch latest from ZenHub
3. Takes 2-5 seconds
```

### Export Metrics
```
1. (Coming Soon) - For now, screenshot the dashboard
2. Or use browser's Print function (Ctrl+P)
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "No ZenHub workspace configured" | Add custom_zenhub_workspace_id to a Project |
| 403 Forbidden | Clear cache: Ctrl+Shift+Del, then refresh page |
| Data not loading | Check ZenHub Settings token is valid |
| Wrong workspace shown | Verify custom_zenhub_workspace_id value |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+/` | Open awesome bar, type "ZenHub" |
| `Ctrl+K` | Quick search projects |
| `F5` | Refresh page |

---

## API Reference (Developers)

All ZenHub endpoints are automatically whitelisted:

- `get_workspace_summary` - Get full workspace structure
- `get_workspace_by_project` - Filter by project
- `get_workspace_by_epic` - Filter by epic
- `get_team_utilization` - Team metrics
- `get_sprint_data` - Sprint details
- `get_stakeholder_sprint_report` - Executive summary

---

## Field Location in Project

When editing a Project, look for:
```
Field Label: "ZenHub Workspace ID"
Section: Below project name and description
Type: Text field
Required: No (but recommended)
```

---

## Still Need Help?

1. Check full documentation: `ZENHUB_INTEGRATION_FIX.md`
2. View error details in Frappe: Setup → Error Log
3. Contact: Mention ZenHub Dashboard in Frappe error report

---

**Last Updated:** January 14, 2026
**Status:** Ready for Production ✅
