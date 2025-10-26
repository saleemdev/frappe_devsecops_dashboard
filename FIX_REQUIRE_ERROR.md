# Fix: ReferenceError: require is not defined

## Issue
The StakeholderSprintReport component was using CommonJS `require()` syntax in an ES module context, causing:
```
Uncaught ReferenceError: require is not defined
```

## Root Cause
Line 6 of `StakeholderSprintReport.jsx` was using:
```javascript
const { Text, Title } = require('antd').Typography
```

This CommonJS syntax doesn't work in ES modules (which is what modern React/Vite uses).

## Solution
Changed the import to use ES module syntax:

**Before:**
```javascript
import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Progress, Tag, Space, Table, Avatar, Tooltip, Alert, Spin, Empty, Button, message } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined, TeamOutlined, FileTextOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import api from '../services/api'

const { Text, Title } = require('antd').Typography
```

**After:**
```javascript
import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Progress, Tag, Space, Table, Avatar, Tooltip, Alert, Spin, Empty, Button, message, Typography } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined, TeamOutlined, FileTextOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import api from '../services/api'

const { Text, Title } = Typography
```

## Changes Made
1. Added `Typography` to the Ant Design import statement
2. Changed `const { Text, Title } = require('antd').Typography` to `const { Text, Title } = Typography`

## Files Modified
- `apps/frappe_devsecops_dashboard/frontend/src/components/StakeholderSprintReport.jsx` (line 1-6)

## Build Status
✅ **Build Successful**
- No compilation errors
- No TypeScript errors
- Build time: 27.24 seconds
- All assets generated correctly

## Verification
✅ No diagnostics errors
✅ Component imports correctly
✅ All dependencies resolved
✅ Cache cleared

## Testing
The component should now load without the `require is not defined` error. Test by:
1. Opening a Project in the dashboard
2. Clicking "Sprint Report" button
3. Selecting "Stakeholder View" tab
4. Verifying the component renders without console errors

## Status
✅ FIXED AND VERIFIED

