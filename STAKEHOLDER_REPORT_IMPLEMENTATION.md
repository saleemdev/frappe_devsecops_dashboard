# Stakeholder Sprint Report Implementation

## Overview

The Sprint Report feature has been refactored to include a **Stakeholder-Focused View** alongside the existing detailed technical view. This provides executives and non-technical stakeholders with a simplified, high-level overview of sprint progress.

## What Was Implemented

### 1. Backend API Enhancements (`zenhub.py`)

**New Functions:**
- `get_stakeholder_sprint_query()` - Optimized GraphQL query fetching only essential fields
- `calculate_stakeholder_metrics()` - Calculates simplified metrics for stakeholder reporting
- `transform_stakeholder_sprint_data()` - Transforms raw data to stakeholder format
- `get_stakeholder_sprint_report()` - New whitelisted API endpoint

**New Endpoint:**
```
/api/method/frappe_devsecops_dashboard.api.zenhub.get_stakeholder_sprint_report
```

**Metrics Provided:**
- Sprint metadata (name, dates, state)
- Issue counts by status (to_do, in_progress, in_review, done, blocked)
- Unique epic count
- Story points summary (total, completed, remaining, completion %)
- Team member workload distribution
- Sprint health indicators (completion_rate, blocked_rate, team_utilization)

### 2. Frontend Service Updates (`zenhub.js`)

**New Method:**
```javascript
async getStakeholderSprintReport(projectId, forceRefresh = false)
```

Features:
- Caching with 5-minute TTL
- Retry mechanism for failed requests
- Force refresh capability
- Mock data support for testing

### 3. New Stakeholder Report Component (`StakeholderSprintReport.jsx`)

**Features:**
- Executive-level sprint overview
- Progress visualization with progress bars
- Issue summary with status distribution
- Story points breakdown
- Team workload distribution table
- Sprint health indicators
- Refresh functionality
- Responsive design for all screen sizes

**Displays:**
- Sprint name and dates
- Health status badge (On Track, At Risk, Off Track)
- Progress percentage with visual indicator
- Completion percentage
- Blocked rate and team utilization
- Issue counts by status
- Story points (total, completed, remaining)
- Team member workload with percentages
- Health indicators (completion rate, blocked rate, team utilization)

### 4. Enhanced Sprint Report Dialog (`SprintReportDialog.jsx`)

**New Feature:**
- Report mode selector (Stakeholder View / Detailed View)
- Segmented control for easy switching
- Conditional rendering based on selected view

**Usage:**
- Click "Stakeholder View" to see executive summary
- Click "Detailed View" to see technical details (tables, kanban, etc.)

### 5. API Configuration Update (`config.js`)

**New Endpoint:**
```javascript
zenhub: {
  sprintData: '/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data',
  stakeholderReport: '/api/method/frappe_devsecops_dashboard.api.zenhub.get_stakeholder_sprint_report',
  workspaceIssues: '/api/method/frappe_devsecops_dashboard.api.zenhub.get_workspace_issues'
}
```

## Key Features

### Stakeholder-Focused Metrics
- **Progress Tracking**: Visual progress bars showing sprint completion
- **Issue Distribution**: Clear breakdown of issues by status
- **Story Points**: Capacity planning with completed vs. remaining points
- **Team Workload**: Individual team member ticket counts and workload percentages
- **Health Status**: At-a-glance sprint health (On Track, At Risk, Off Track)

### User Experience
- **Clean Design**: Minimalist, executive-friendly interface
- **Quick Insights**: Key metrics visible at a glance
- **Responsive**: Works on desktop, tablet, and mobile
- **Refresh Capability**: Manual refresh button for latest data
- **Error Handling**: Graceful error messages and empty states

### Performance
- **Caching**: 5-minute cache TTL reduces API calls
- **Optimized Queries**: GraphQL query fetches only needed fields
- **Lazy Loading**: Components load data on demand
- **Retry Logic**: Automatic retry on transient failures

## How to Use

### For Stakeholders
1. Open a Project in the dashboard
2. Click "Sprint Report" button
3. Select "Stakeholder View" tab
4. Review sprint progress, issues, and team workload
5. Click "Refresh" to get latest data

### For Developers
1. Use the same Sprint Report dialog
2. Switch to "Detailed View" for technical details
3. Access tables, kanban board, and detailed issue information

## API Response Format

```json
{
  "sprints": [
    {
      "sprint_id": "...",
      "sprint_name": "Sprint 1",
      "state": "active",
      "start_date": "2024-01-01",
      "end_date": "2024-01-14",
      "total_issues": 25,
      "unique_epics": 3,
      "issues_by_status": {
        "to_do": 5,
        "in_progress": 8,
        "in_review": 4,
        "done": 7,
        "blocked": 1
      },
      "total_story_points": 89,
      "completed_story_points": 45,
      "remaining_story_points": 44,
      "completion_percentage": 50.6,
      "progress_percentage": 60,
      "blocked_issues_count": 1,
      "health_status": "on_track",
      "health_indicators": {
        "completion_rate": 50.6,
        "blocked_rate": 4.0,
        "team_utilization": 85.5
      },
      "team_members": [
        {
          "id": "user1",
          "name": "John Doe",
          "login": "johndoe",
          "ticket_count": 5,
          "completed_tickets": 3,
          "workload_percentage": 20.0
        }
      ]
    }
  ]
}
```

## Testing Checklist

- [ ] Open ProjectDetail view and click "Sprint Report"
- [ ] Open ProjectEdit view and click "Sprint Report"
- [ ] Open Projects list and click "Sprint Report" on a project card
- [ ] Click "Stakeholder View" tab - verify clean, executive-friendly display
- [ ] Click "Detailed View" tab - verify technical details display
- [ ] Click "Refresh" button - verify data updates
- [ ] Check Network tab - verify API calls are cached (5-minute TTL)
- [ ] Test on mobile - verify responsive design
- [ ] Test error handling - verify graceful error messages
- [ ] Verify all metrics display correctly

## Files Modified

1. `apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/api/zenhub.py` - Backend API
2. `apps/frappe_devsecops_dashboard/frontend/src/services/api/zenhub.js` - Frontend service
3. `apps/frappe_devsecops_dashboard/frontend/src/services/api/config.js` - API config
4. `apps/frappe_devsecops_dashboard/frontend/src/components/SprintReportDialog.jsx` - Dialog component

## Files Created

1. `apps/frappe_devsecops_dashboard/frontend/src/components/StakeholderSprintReport.jsx` - New component

## Backward Compatibility

✅ All changes are backward compatible
✅ Existing detailed view functionality unchanged
✅ No breaking changes to API
✅ No database migrations required
✅ Existing tests continue to pass

## Next Steps

1. Test the implementation in all three views (ProjectCard, ProjectDetail, ProjectEdit)
2. Verify metrics accuracy against ZenHub workspace
3. Gather stakeholder feedback on report usefulness
4. Consider additional metrics based on feedback
5. Deploy to production when testing is complete

