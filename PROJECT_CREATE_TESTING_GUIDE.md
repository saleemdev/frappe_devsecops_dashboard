# Create New Project - Testing Guide

## Quick Start

### Access the Feature
1. Navigate to the DevSecOps Dashboard
2. Click on "Projects" in the main menu
3. Click the "Create Project" button (top right)
4. Fill in the form and submit

### Test Scenarios

## ✅ Happy Path Tests

### Test 1: Create Project with Minimum Fields
**Steps:**
1. Click "Create Project"
2. Enter Project Name: "Test Project 1"
3. Select Project Type: "Internal"
4. Select Start Date: Today
5. Select End Date: 30 days from today
6. Click "Create Project"

**Expected Result:**
- Success notification appears
- Redirected to project detail page
- Project appears in projects list

### Test 2: Create Project with All Fields
**Steps:**
1. Click "Create Project"
2. Enter Project Name: "Complete Test Project"
3. Select Project Type: "External"
4. Select Start Date: 2024-01-15
5. Select End Date: 2024-06-30
6. Select Priority: "High"
7. Select Department: "Engineering"
8. Enter Notes: "This is a test project"
9. Search and add 2 team members
10. Click "Create Project"

**Expected Result:**
- Success notification
- Project created with all details
- Team members assigned
- Redirected to project detail

### Test 3: Add Multiple Team Members
**Steps:**
1. Click "Create Project"
2. Fill basic fields
3. In Team Members section:
   - Search for "user1" (min 2 chars)
   - Click on result
   - Click "Add Member"
   - Repeat for "user2", "user3"
4. Verify all members appear in list
5. Submit form

**Expected Result:**
- All team members added successfully
- Members display with avatar, name, email
- Can remove members with delete button

## ❌ Validation Tests

### Test 4: Missing Required Fields
**Steps:**
1. Click "Create Project"
2. Leave Project Name empty
3. Try to submit

**Expected Result:**
- Error message: "Project name is required"
- Form not submitted

### Test 5: Invalid Project Name
**Steps:**
1. Click "Create Project"
2. Enter Project Name: "AB" (less than 3 chars)
3. Try to submit

**Expected Result:**
- Error message: "Project name must be at least 3 characters"

### Test 6: Invalid Date Range
**Steps:**
1. Click "Create Project"
2. Enter Project Name: "Date Test"
3. Select Project Type
4. Start Date: 2024-06-30
5. End Date: 2024-01-15 (before start date)
6. Try to submit

**Expected Result:**
- Error message: "End date must be after start date"

### Test 7: Duplicate Project Name
**Steps:**
1. Create a project named "Unique Project"
2. Try to create another project with same name

**Expected Result:**
- Error message: "Project 'Unique Project' already exists"

### Test 8: Duplicate Team Member
**Steps:**
1. Click "Create Project"
2. Fill basic fields
3. Search for a user and add them
4. Try to add the same user again

**Expected Result:**
- Warning message: "User is already added to the team"
- User not added twice

## 🔐 Permission Tests

### Test 9: Permission Denied
**Steps:**
1. Login as user without project creation permission
2. Navigate to Projects
3. Try to click "Create Project"

**Expected Result:**
- Error message: "You do not have permission to create projects"
- Redirected to dashboard

## 📱 Responsive Design Tests

### Test 10: Mobile View
**Steps:**
1. Open DevSecOps Dashboard on mobile device (or use browser dev tools)
2. Navigate to Create Project
3. Verify form layout

**Expected Result:**
- Form fields stack vertically
- Buttons are full width
- Team members sidebar appears below form
- All inputs are easily accessible

### Test 11: Tablet View
**Steps:**
1. Open on tablet (or resize browser to 768px)
2. Navigate to Create Project

**Expected Result:**
- Form and team members display side-by-side
- Responsive layout adjusts properly

## 🔍 Edge Cases

### Test 12: Special Characters in Project Name
**Steps:**
1. Create project with name: "Project @#$% 2024"
2. Submit

**Expected Result:**
- Project created successfully
- Special characters preserved

### Test 13: Long Project Name
**Steps:**
1. Create project with very long name (100+ chars)
2. Submit

**Expected Result:**
- Project created successfully
- Name truncated appropriately in UI

### Test 14: User Search with No Results
**Steps:**
1. Click "Create Project"
2. In Team Members, search for "nonexistentuser123"
3. Wait for search to complete

**Expected Result:**
- "Type to search for users..." message appears
- No results shown
- Add button remains disabled

### Test 15: Rapid Form Submission
**Steps:**
1. Click "Create Project"
2. Fill form quickly
3. Click "Create Project" button twice rapidly

**Expected Result:**
- Only one project created
- Button shows loading state
- Prevents duplicate submission

## 📊 Data Verification

### Test 16: Verify Project in Database
**Steps:**
1. Create a project via UI
2. Check Frappe database

**Expected Result:**
- Project document exists with correct fields
- Team members linked correctly
- Status is "Open"
- is_active is "Yes"

### Test 17: Verify Project in List
**Steps:**
1. Create a project
2. Navigate to Projects list
3. Search for the new project

**Expected Result:**
- Project appears in list
- All details display correctly
- Can click to view details

## 🐛 Error Recovery

### Test 18: Network Error Recovery
**Steps:**
1. Start creating a project
2. Disconnect network
3. Try to submit

**Expected Result:**
- Error message appears
- Form data preserved
- Can retry after reconnecting

### Test 19: Invalid User in Team Members
**Steps:**
1. Create project with valid user
2. Manually modify request to include invalid user
3. Submit

**Expected Result:**
- Project created successfully
- Invalid user skipped with log entry
- Valid users added

## ✨ UI/UX Tests

### Test 20: Form Responsiveness
**Steps:**
1. Open Create Project form
2. Type in Project Name field
3. Verify real-time validation

**Expected Result:**
- Form responds immediately
- No lag or delays
- Validation messages appear/disappear appropriately

### Test 21: Loading States
**Steps:**
1. Create project with team members
2. Watch button during submission

**Expected Result:**
- Button shows loading spinner
- Button is disabled during submission
- Prevents multiple submissions

## 📋 Checklist

- [ ] All happy path tests pass
- [ ] All validation tests pass
- [ ] Permission tests pass
- [ ] Responsive design works
- [ ] Edge cases handled
- [ ] Data verified in database
- [ ] Error recovery works
- [ ] UI/UX is smooth
- [ ] No console errors
- [ ] Performance is acceptable

## 🚀 Ready for Production

Once all tests pass, the feature is ready for production deployment!

