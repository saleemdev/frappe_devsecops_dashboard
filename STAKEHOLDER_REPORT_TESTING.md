# Stakeholder Sprint Report - Testing Guide

## Quick Start Test (5 minutes)

### Test 1: Verify Component Loads
1. Open browser DevTools (F12)
2. Navigate to a Project in the dashboard
3. Click "Sprint Report" button
4. Verify dialog opens without errors
5. Check Console tab - no errors should appear

### Test 2: Switch Between Views
1. In Sprint Report dialog, locate the "Report View" selector
2. Click "Stakeholder View" - verify clean, simplified display
3. Click "Detailed View" - verify technical details display
4. Switch back to "Stakeholder View" - verify smooth transition

### Test 3: Verify Data Display
1. In Stakeholder View, verify these sections appear:
   - Sprint name and dates
   - Health status badge
   - Sprint Progress card (with progress bar)
   - Issue Summary card (with issue counts)
   - Story Points card
   - Team Workload table
   - Sprint Health Indicators

## Comprehensive Testing (30 minutes)

### Test 4: Sprint Progress Metrics
1. Open Stakeholder View
2. Verify "Sprint Progress" card shows:
   - Progress percentage (0-100%)
   - Progress bar with color indicator
   - Completion percentage
   - Blocked rate
   - Team utilization percentage
3. Verify colors are appropriate:
   - Green for high completion (>75%)
   - Yellow for medium (50-75%)
   - Red for low (<25%)

### Test 5: Issue Summary
1. Verify "Issue Summary" card displays:
   - Total Issues count
   - Done count (with checkmark icon)
   - In Progress count
   - In Review count
   - To Do count
   - Blocked count (with warning icon)
2. Verify counts match ZenHub workspace
3. Verify color coding:
   - Green for Done
   - Blue for In Progress
   - Yellow for In Review
   - Gray for To Do
   - Red for Blocked

### Test 6: Story Points
1. Verify "Story Points" card shows:
   - Total Planned points
   - Completed points
   - Remaining points
   - Unique Epics count
2. Verify math: Completed + Remaining = Total Planned
3. Verify colors are distinct for each metric

### Test 7: Team Workload
1. Verify "Team Workload Distribution" table displays:
   - Team member names with avatars
   - Login handles
   - Ticket count (blue tag)
   - Completed tickets (green tag)
   - Workload percentage with progress bar
2. Verify workload percentages sum to ~100%
3. Verify table is sortable (click column headers)
4. Verify table is responsive on mobile

### Test 8: Health Indicators
1. Verify "Sprint Health Indicators" section shows:
   - Completion Rate percentage
   - Blocked Rate percentage
   - Team Utilization percentage
2. Verify blocked rate color changes:
   - Red if > 20%
   - Blue if <= 20%
3. Verify indicators match calculated metrics

### Test 9: Refresh Functionality
1. Click "Refresh" button
2. Verify loading spinner appears
3. Verify success message appears: "Sprint report refreshed successfully"
4. Verify data updates (if changes were made in ZenHub)
5. Check Network tab - verify API call to `/api/method/frappe_devsecops_dashboard.api.zenhub.get_stakeholder_sprint_report`

### Test 10: Caching
1. Open Stakeholder View
2. Note the data displayed
3. Close dialog
4. Reopen Sprint Report within 5 minutes
5. Verify data loads instantly (from cache)
6. Check Network tab - no new API call should be made
7. Wait 5+ minutes and reopen
8. Verify new API call is made (cache expired)

### Test 11: Error Handling
1. Disable network (DevTools > Network > Offline)
2. Click "Refresh" button
3. Verify error message appears: "Failed to load sprint report"
4. Verify error details are shown
5. Re-enable network
6. Click "Refresh" again
7. Verify data loads successfully

### Test 12: Empty State
1. Find a project with no sprints
2. Click "Sprint Report"
3. Verify "No sprints found for this project" message appears
4. Verify dialog doesn't crash

### Test 13: Responsive Design
1. Open Sprint Report in Stakeholder View
2. Test on different screen sizes:
   - Desktop (1920x1080) - verify 4-column layout
   - Tablet (768x1024) - verify 2-column layout
   - Mobile (375x667) - verify 1-column layout
3. Verify all content is readable
4. Verify no horizontal scrolling needed
5. Verify tables are scrollable on mobile

### Test 14: Cross-View Consistency
1. Open ProjectCard Sprint Report - click "Sprint Report"
2. Verify Stakeholder View displays correctly
3. Open ProjectDetail Sprint Report
4. Verify same data and layout
5. Open ProjectEdit Sprint Report
6. Verify same data and layout
7. Verify all three views show identical information

### Test 15: Performance
1. Open DevTools > Performance tab
2. Click "Sprint Report" and switch to Stakeholder View
3. Record performance profile
4. Verify:
   - Initial load < 2 seconds
   - View switch < 500ms
   - Refresh < 1 second
5. Check Memory tab - verify no memory leaks
6. Open/close dialog multiple times - verify memory stable

## Browser Compatibility

Test on:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Accessibility Testing

1. Test keyboard navigation:
   - Tab through all interactive elements
   - Verify focus indicators visible
   - Verify buttons clickable with Enter/Space

2. Test screen reader (NVDA/JAWS):
   - Verify all text is readable
   - Verify icons have alt text
   - Verify table headers are announced

3. Test color contrast:
   - Verify text readable on all backgrounds
   - Verify color-blind friendly (use Chrome DevTools)

## Success Criteria

✅ All 15 tests pass
✅ No console errors
✅ Data matches ZenHub workspace
✅ Responsive on all screen sizes
✅ Performance acceptable
✅ Accessible to all users
✅ Backward compatible with existing views

## Reporting Issues

If you find any issues:
1. Note the exact steps to reproduce
2. Include browser and OS information
3. Attach screenshots or video
4. Check browser console for errors
5. Report in the project issue tracker

