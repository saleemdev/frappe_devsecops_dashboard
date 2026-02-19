# Glassmorphism Design System - Rollback Plan

## Overview

This document provides step-by-step instructions for rolling back the glassmorphism design system implementation if needed. The rollback can be done at different levels depending on the severity of issues encountered.

---

## Rollback Scenarios

### Scenario 1: Complete Rollback (Remove Entire System)
**When to use**: Critical issues affecting core functionality or severe performance problems

### Scenario 2: Partial Rollback (Disable Global CSS)
**When to use**: Visual issues or conflicts with specific components

### Scenario 3: Component-Level Rollback
**When to use**: Issues with specific migrated components only

---

## Scenario 1: Complete Rollback

### Step 1: Remove Design System Import

**File**: `frontend/src/index.css`

**Change**:
```css
/* REMOVE THIS LINE */
@import './styles/design-system.css';

/* KEEP EVERYTHING ELSE */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    ...
}
```

**Action**: Comment out or remove line 4:
```css
/* @import './styles/design-system.css'; */
```

---

### Step 2: Revert Migrated Components

#### 2.1 Dashboard Component

**File**: `frontend/src/components/Dashboard.jsx`

**Change**:
```jsx
// REMOVE THIS IMPORT
import { GlassCard } from './design-system'

// REPLACE GlassCard with Card
// Change all instances of:
<GlassCard variant="default" elevation={2} ...>
// To:
<Card ...>
```

**Quick Find/Replace**:
- Find: `<GlassCard`
- Replace: `<Card`
- Find: `</GlassCard>`
- Replace: `</Card>`
- Remove: `import { GlassCard } from './design-system'`

---

#### 2.2 ProjectCard Component

**File**: `frontend/src/components/ProjectCard.jsx`

**Change**:
```jsx
// REMOVE THIS IMPORT
import { GlassCard } from './design-system'

// REPLACE GlassCard with Card
// Change:
<GlassCard variant="default" elevation={2} className="project-card-enhanced" ...>
// To:
<Card className="project-card-enhanced" ...>
```

**Quick Find/Replace**:
- Find: `import { GlassCard } from './design-system'`
- Replace: (remove line)
- Find: `<GlassCard`
- Replace: `<Card`
- Find: `</GlassCard>`
- Replace: `</Card>`

---

#### 2.3 ChangeRequestForm Component

**File**: `frontend/src/components/ChangeRequestForm.jsx`

**Change**:
```jsx
// REMOVE THIS IMPORT
import { GlassForm, GlassContainer, GlassCard } from './design-system'

// REPLACE:
<GlassContainer variant="subtle" className="cr-form-container">
// To:
<div className="cr-form-container">

// REPLACE:
<GlassCard variant="prominent" elevation={3} ...>
// To:
<Card ...>

// REPLACE:
<GlassForm variant="default" form={form} ...>
// To:
<Form form={form} ...>

// REPLACE:
</GlassContainer>
// To:
</div>
```

**Quick Find/Replace**:
- Find: `import { GlassForm, GlassContainer, GlassCard } from './design-system'`
- Replace: (remove line)
- Find: `<GlassContainer`
- Replace: `<div`
- Find: `variant="subtle"`
- Replace: (remove)
- Find: `</GlassContainer>`
- Replace: `</div>`
- Find: `<GlassCard`
- Replace: `<Card`
- Find: `variant="prominent" elevation={3}`
- Replace: (remove)
- Find: `</GlassCard>`
- Replace: `</Card>`
- Find: `<GlassForm`
- Replace: `<Form`
- Find: `variant="default"`
- Replace: (remove)
- Find: `</GlassForm>`
- Replace: `</Form>`

---

#### 2.4 App.jsx Header

**File**: `frontend/src/App.jsx`

**Change**:
```jsx
// REMOVE glass classes from Header
<Header
  className="glass-header glass-header-sticky"  // REMOVE THIS
  style={{
    ...
  }}
>
```

**Quick Find/Replace**:
- Find: `className="glass-header glass-header-sticky"`
- Replace: (remove or set to empty string `className=""`)

---

### Step 3: Delete Design System Files (Optional)

If you want to completely remove the design system files:

```bash
# Delete design system CSS files
rm -rf frontend/src/styles/design-system/

# Delete design system component files
rm -rf frontend/src/components/design-system/

# Delete design system entry file
rm frontend/src/styles/design-system.css
```

**Note**: You may want to keep these files for future reference. Consider commenting them out instead of deleting.

---

## Scenario 2: Partial Rollback (Disable Global CSS)

### Quick Fix: Comment Out Global Overrides

**File**: `frontend/src/styles/design-system/glassmorphism-overrides.css`

**Change**: Comment out the global Card override:

```css
/* ============================================
   ANT DESIGN CARD OVERRIDES
   ============================================ */

/* DISABLE GLOBAL GLASS EFFECT - Comment out this section */
/*
.ant-card {
  background: var(--glass-bg-default);
  backdrop-filter: blur(var(--glass-blur-default));
  -webkit-backdrop-filter: blur(var(--glass-blur-default));
  border-color: var(--glass-border-default);
  box-shadow: var(--glass-shadow-md);
  transition: all var(--glass-transition-normal);
}
*/

/* Keep explicit classes working */
.ant-card.glass-card,
.ant-card.glass-card-subtle,
.ant-card.glass-card-default,
.ant-card.glass-card-prominent {
  background: var(--glass-bg-default);
  backdrop-filter: blur(var(--glass-blur-default));
  -webkit-backdrop-filter: blur(var(--glass-blur-default));
  border-color: var(--glass-border-default);
  box-shadow: var(--glass-shadow-md);
}
```

**Result**: 
- Global glass effect disabled
- Explicitly marked components (with `glass-card` class) still work
- Migrated components (Dashboard, ProjectCard, etc.) still work

---

## Scenario 3: Component-Level Rollback

### Rollback Specific Component

If only one component has issues, revert just that component:

#### Example: Rollback Dashboard Only

**File**: `frontend/src/components/Dashboard.jsx`

1. Remove import:
```jsx
// REMOVE
import { GlassCard } from './design-system'
```

2. Replace GlassCard with Card:
```jsx
// CHANGE FROM:
<GlassCard variant="default" elevation={2} hoverable>
// TO:
<Card hoverable>
```

3. Remove closing tag:
```jsx
// CHANGE FROM:
</GlassCard>
// TO:
</Card>
```

---

## Quick Rollback Script

Create a rollback script for faster execution:

**File**: `rollback-glassmorphism.sh`

```bash
#!/bin/bash

echo "Rolling back glassmorphism design system..."

# Step 1: Comment out design system import
sed -i.bak "s|@import './styles/design-system.css';|/* @import './styles/design-system.css'; */|g" frontend/src/index.css

# Step 2: Revert Dashboard
sed -i.bak 's/<GlassCard/<Card/g' frontend/src/components/Dashboard.jsx
sed -i.bak 's/<\/GlassCard>/<\/Card>/g' frontend/src/components/Dashboard.jsx
sed -i.bak '/import { GlassCard } from/d' frontend/src/components/Dashboard.jsx

# Step 3: Revert ProjectCard
sed -i.bak 's/<GlassCard/<Card/g' frontend/src/components/ProjectCard.jsx
sed -i.bak 's/<\/GlassCard>/<\/Card>/g' frontend/src/components/ProjectCard.jsx
sed -i.bak '/import { GlassCard } from/d' frontend/src/components/ProjectCard.jsx

# Step 4: Revert ChangeRequestForm
sed -i.bak 's/<GlassContainer/<div/g' frontend/src/components/ChangeRequestForm.jsx
sed -i.bak 's/<\/GlassContainer>/<\/div>/g' frontend/src/components/ChangeRequestForm.jsx
sed -i.bak 's/<GlassCard/<Card/g' frontend/src/components/ChangeRequestForm.jsx
sed -i.bak 's/<\/GlassCard>/<\/Card>/g' frontend/src/components/ChangeRequestForm.jsx
sed -i.bak 's/<GlassForm/<Form/g' frontend/src/components/ChangeRequestForm.jsx
sed -i.bak 's/<\/GlassForm>/<\/Form>/g' frontend/src/components/ChangeRequestForm.jsx
sed -i.bak '/import { GlassForm, GlassContainer, GlassCard } from/d' frontend/src/components/ChangeRequestForm.jsx

# Step 5: Revert Header
sed -i.bak 's/className="glass-header glass-header-sticky"/className=""/g' frontend/src/App.jsx

echo "Rollback complete! Backup files created with .bak extension."
echo "Review changes and remove .bak files when satisfied."
```

**Usage**:
```bash
chmod +x rollback-glassmorphism.sh
./rollback-glassmorphism.sh
```

---

## Git-Based Rollback

If using Git, the easiest rollback method:

### Option 1: Revert Specific Commits

```bash
# Find the commit hash for glassmorphism implementation
git log --oneline --grep="glassmorphism" --all

# Revert the commit
git revert <commit-hash>

# Or revert multiple commits
git revert <commit-hash-1> <commit-hash-2>
```

### Option 2: Reset to Previous State

```bash
# Find commit before glassmorphism
git log --oneline

# Reset to that commit (CAREFUL: This discards changes)
git reset --hard <commit-hash-before-glassmorphism>

# Or create a new branch from previous state
git checkout -b rollback-before-glassmorphism <commit-hash-before-glassmorphism>
```

### Option 3: Checkout Specific Files

```bash
# Revert specific files only
git checkout HEAD~1 -- frontend/src/index.css
git checkout HEAD~1 -- frontend/src/components/Dashboard.jsx
git checkout HEAD~1 -- frontend/src/components/ProjectCard.jsx
git checkout HEAD~1 -- frontend/src/components/ChangeRequestForm.jsx
git checkout HEAD~1 -- frontend/src/App.jsx
```

---

## Verification Steps

After rollback, verify:

1. **Visual Check**:
   - [ ] Cards no longer have glass effect
   - [ ] Forms look normal
   - [ ] Header looks normal
   - [ ] No visual glitches

2. **Functional Check**:
   - [ ] Dashboard loads correctly
   - [ ] Forms submit correctly
   - [ ] Navigation works
   - [ ] All interactions work

3. **Console Check**:
   - [ ] No CSS errors
   - [ ] No import errors
   - [ ] No component errors

4. **Performance Check**:
   - [ ] Page load time normal
   - [ ] No performance degradation
   - [ ] Smooth interactions

---

## Rollback Checklist

### Complete Rollback:
- [ ] Comment out design system import in `index.css`
- [ ] Revert Dashboard component
- [ ] Revert ProjectCard component
- [ ] Revert ChangeRequestForm component
- [ ] Revert App.jsx Header
- [ ] Test all pages
- [ ] Verify no errors
- [ ] (Optional) Delete design system files

### Partial Rollback:
- [ ] Comment out global Card override in `glassmorphism-overrides.css`
- [ ] Test affected components
- [ ] Verify explicit glass classes still work

### Component-Level Rollback:
- [ ] Identify problematic component
- [ ] Revert that component only
- [ ] Test that component
- [ ] Verify other components still work

---

## Prevention for Future

To prevent issues:

1. **Feature Flags**: Consider adding feature flags for gradual rollout
2. **A/B Testing**: Test with subset of users first
3. **Monitoring**: Monitor performance metrics
4. **Staged Rollout**: Roll out to specific pages first

---

## Emergency Contacts

If rollback is needed urgently:

1. **Quick Fix**: Comment out `@import './styles/design-system.css'` in `index.css`
2. **Medium Fix**: Disable global Card override in `glassmorphism-overrides.css`
3. **Full Fix**: Follow complete rollback steps above

---

## Notes

- **Backup Files**: The rollback script creates `.bak` files - review before deleting
- **Git History**: All changes are in Git history - can be restored if needed
- **Design System Files**: Consider keeping files for future use rather than deleting
- **Testing**: Always test after rollback to ensure everything works

---

**Last Updated**: 2026-02-19  
**Version**: 1.0
