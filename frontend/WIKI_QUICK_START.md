# Wiki Feature - Quick Start Guide

## Overview

The Wiki feature allows users to create and manage documentation organized by Wiki Spaces, with support for markdown content and project linking.

## Feature Flow

```
WikiHome (List Spaces)
    ↓
WikiSpaceDetail (List Pages in Space)
    ↓
WikiPageView (View/Edit Page Content)
```

## Key Components

### WikiHome
- **Location**: `src/components/WikiHome.jsx`
- **Purpose**: List all wiki spaces
- **Features**: Create space, search, empty state
- **Route**: `#wiki`

### WikiSpaceDetail
- **Location**: `src/components/WikiSpaceDetail.jsx`
- **Purpose**: List pages in a space
- **Features**: Create page, delete page, page count
- **Route**: `#wiki/space/{spaceSlug}`

### WikiPageView
- **Location**: `src/components/WikiPageView.jsx`
- **Purpose**: View and edit page content
- **Features**: Edit, save, delete, markdown rendering
- **Route**: `#wiki/space/{spaceSlug}/page/{pageSlug}`

## API Functions

### Space Operations
```javascript
import { 
  getWikiSpaces,
  getWikiSpace,
  createWikiSpace,
  updateWikiSpace,
  deleteWikiSpace
} from '../api/wiki'
```

### Page Operations
```javascript
import {
  getWikiPage,
  getWikiPagesForSpace,
  getWikiPagesForProject,
  createWikiPage,
  updateWikiPage,
  deleteWikiPage
} from '../api/wiki'
```

## Backend Methods

All methods are in `frappe_devsecops_dashboard/api/wiki.py`

### Space Methods
- `get_wiki_spaces()` - List spaces
- `get_wiki_space(space_name)` - Get space details
- `create_wiki_space(name, route, description)` - Create space
- `update_wiki_space(name, updates)` - Update space
- `delete_wiki_space(name)` - Delete space

### Page Methods
- `get_wiki_page(page_name)` - Get page with HTML
- `get_wiki_pages_for_space(space_name)` - List space pages
- `get_wiki_pages_for_project(project_name)` - List project pages
- `create_wiki_page(title, content, route, wiki_space, project_name, published)` - Create page
- `update_wiki_page(page_name, updates)` - Update page
- `delete_wiki_page(page_name)` - Delete page

## Running Tests

```bash
# Run all wiki tests
npm run playwright:test:wiki

# Run with browser visible
npm run playwright:test:wiki:headed

# Debug mode
npm run playwright:debug

# Interactive UI
npm run playwright:ui
```

## Common Tasks

### Create a Wiki Space
```javascript
const spaceData = {
  name: 'API Documentation',
  route: 'api-docs',
  description: 'API documentation and guides'
}
await createWikiSpace(spaceData)
```

### Create a Wiki Page
```javascript
const pageData = {
  title: 'Getting Started',
  content: '# Getting Started\n\nWelcome...',
  route: 'getting-started',
  wikiSpace: 'API Documentation',
  published: 1
}
await createWikiPage(pageData)
```

### Update a Page
```javascript
await updateWikiPage('page-name', {
  title: 'New Title',
  content: 'New content'
})
```

### Delete a Page
```javascript
await deleteWikiPage('page-name')
```

## Styling

All components use Ant Design:
- `Typography` for headings and text
- `Button` for actions
- `Modal` for forms
- `Table` for lists
- `Card` for containers
- `Empty` for empty states
- `Popconfirm` for confirmations

## Navigation

Use the `navigateToRoute` prop:
```javascript
// Navigate to wiki home
navigateToRoute('wiki')

// Navigate to space
navigateToRoute('wiki-space', spaceName)

// Navigate to page
navigateToRoute('wiki-page', spaceName, pageName)
```

## State Management

Uses Zustand store (`navigationStore.js`):
```javascript
import useNavigationStore from '../stores/navigationStore'

const selectedWikiSpaceSlug = useNavigationStore(
  state => state.selectedWikiSpaceSlug
)
```

## Markdown Support

- Content is stored as markdown
- Backend converts to HTML using `md_to_html()`
- Frontend displays HTML safely
- Edit mode shows raw markdown

## Error Handling

All API calls include:
- Try/catch blocks
- Ant Design message feedback
- Console error logging
- User-friendly error messages

## Permissions

All backend operations check:
- User has permission to create/read/write/delete
- Throws `PermissionError` if denied
- Frontend handles errors gracefully

## Troubleshooting

### Tests Fail
- Check if Frappe server is running
- Verify BASE_URL is correct
- Check browser console for errors

### Pages Not Loading
- Verify wiki_space parameter is set
- Check database for pages
- Check browser console

### Markdown Not Rendering
- Verify content is valid markdown
- Check html_content field in response
- Check browser console for errors

## Documentation

- `WIKI_IMPLEMENTATION_SUMMARY.md` - Complete overview
- `WIKI_E2E_TEST_GUIDE.md` - Testing guide
- `WIKI_IMPLEMENTATION_CHECKLIST.md` - Detailed checklist

## Support

For issues or questions, refer to the implementation documentation or check the test suite for examples.

