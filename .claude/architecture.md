# DevSecOps Dashboard - Architecture Overview

## System Architecture

The DevSecOps Dashboard is a full-stack application built on the Frappe Framework with a modern React frontend:

```
┌─────────────────────────────────────────────────────────────┐
│                    DevSecOps Dashboard                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + Vite)                                 │
│  ├── Components (76 JSX components)                         │
│  ├── State Management (Zustand Stores)                      │
│  ├── API Services (Centralized Layer)                       │
│  └── Routing (Hash-based SPA)                               │
├─────────────────────────────────────────────────────────────┤
│  Backend (Frappe Framework)                                 │
│  ├── API Endpoints (26 modules, 144+ endpoints)             │
│  ├── Custom DocTypes (23 doctypes)                          │
│  ├── Doc Hooks (Event handlers)                             │
│  ├── Scheduler Jobs (Cron jobs)                             │
│  └── ERPNext Integration                                    │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                      │
│  ├── ZenHub (GraphQL API)                                   │
│  ├── ERPNext Projects & Tasks                               │
│  └── APISIX Gateway (Optional)                              │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Stack
- **React 19.1.2** - UI framework with concurrent features
- **Vite 5.3.0** - Fast build tool with HMR
- **Zustand 5.0.8** - Lightweight state management
- **Ant Design 5.21.0** - Enterprise UI components
- **Axios 1.6.0** - HTTP client with CSRF support
- **dayjs 1.11.10** - Date manipulation
- **TypeScript** - Gradual migration in progress

### Backend Stack
- **Frappe Framework** - Python web framework with ORM
- **ERPNext** - Business application platform
- **MariaDB/PostgreSQL** - Database layer
- **Redis** - Caching and session storage
- **Python 3.10+** - Backend language

### Testing & Quality
- **Cypress 15.3.0** - E2E testing
- **Playwright** - Cross-browser testing
- **ESLint 8.57.0** - Code linting

## Directory Structure

```
frappe_devsecops_dashboard/
│
├── frontend/                          # React application (61k+ lines)
│   ├── src/
│   │   ├── components/                # 76+ React components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Projects/
│   │   │   ├── Incidents/
│   │   │   ├── ChangeRequests/
│   │   │   └── Zenhub/
│   │   ├── stores/                    # Zustand state stores
│   │   │   ├── authStore.js
│   │   │   ├── navigationStore.js
│   │   │   ├── applicationsStore.js
│   │   │   ├── incidentsStore.js
│   │   │   └── index.js
│   │   ├── services/api/              # API service layer
│   │   │   ├── config.js
│   │   │   ├── index.js
│   │   │   ├── applications.js
│   │   │   ├── incidents.js
│   │   │   └── mockData.js
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── utils/                     # Utility functions
│   │   ├── constants/                 # Constants & routes
│   │   └── styles/                    # CSS files
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── frappe_devsecops_dashboard/       # Python backend
│   ├── api/                          # API endpoints (26 modules)
│   │   ├── dashboard.py              # Dashboard metrics
│   │   ├── zenhub.py                 # ZenHub integration
│   │   ├── incidents.py              # Incident management
│   │   ├── change_request.py         # Change requests
│   │   ├── password_vault.py         # Password management
│   │   └── ...
│   ├── doctype/                      # Custom DocTypes (23 types)
│   │   ├── change_request/
│   │   ├── devsecops_dashboard_incident/
│   │   ├── password_vault_entry/
│   │   └── ...
│   ├── doc_hooks/                    # Event handlers
│   │   ├── software_product_zenhub.py
│   │   └── project_user_permissions.py
│   ├── fixtures/                     # Data migrations
│   ├── commands/                     # CLI commands
│   ├── config/                       # App configuration
│   ├── public/                       # Static assets
│   │   └── frontend/                 # Built frontend assets
│   ├── www/                          # Web pages
│   ├── hooks.py                      # App hooks configuration
│   └── build.py                      # Build automation
│
├── docs/                             # Documentation (40+ files)
├── .claude/                          # Claude Code context
├── README.md                         # Comprehensive playbook
└── pyproject.toml                    # Python project config
```

## Core Modules & Features

### 1. Dashboard & Metrics
- **Files:** [frontend/src/components/Dashboard.jsx](frontend/src/components/Dashboard.jsx), [frappe_devsecops_dashboard/api/dashboard.py](frappe_devsecops_dashboard/api/dashboard.py)
- **Purpose:** Real-time project metrics, KPIs, lifecycle phases
- **Features:** Project summary, task progression, team utilization

### 2. Project Management
- **Integration:** ERPNext Projects & Tasks
- **Features:** Project creation, task tracking, team assignments
- **Sync:** Bi-directional sync with ZenHub

### 3. Incident Management
- **Files:** [frontend/src/components/Incidents/](frontend/src/components/Incidents/), [frappe_devsecops_dashboard/api/incidents.py](frappe_devsecops_dashboard/api/incidents.py)
- **DocType:** `Devsecops Dashboard Incident`
- **Features:** Incident tracking, timeline, severity levels, SLA management

### 4. Change Request Management
- **Files:** [frappe_devsecops_dashboard/api/change_request.py](frappe_devsecops_dashboard/api/change_request.py)
- **DocType:** `Change Request`, `Change Request Approver`
- **Features:** Approval workflows, RACI assignments, notifications, reminders

### 5. Password Vault
- **Files:** [frappe_devsecops_dashboard/api/password_vault.py](frappe_devsecops_dashboard/api/password_vault.py)
- **DocTypes:** `Devsecops Password`, `Password Vault Entry`, `Password Share Link`
- **Features:** Secure password storage, one-time shareable links, encryption

### 6. ZenHub Integration
- **Files:** [frappe_devsecops_dashboard/api/zenhub.py](frappe_devsecops_dashboard/api/zenhub.py)
- **Pattern:** GraphQL API integration with caching
- **Features:** Workspace management, sprint data, epic tracking, issue sync
- **Logging:** All API calls logged to `Zenhub GraphQL API Log`

### 7. API Gateway (APISIX)
- **Files:** [frappe_devsecops_dashboard/api/api_routes.py](frappe_devsecops_dashboard/api/api_routes.py)
- **DocTypes:** `API Route`, `API Route Key`
- **Features:** Route management, API key generation, APISIX sync

### 8. Wiki & Knowledge Base
- **Files:** [frappe_devsecops_dashboard/api/wiki.py](frappe_devsecops_dashboard/api/wiki.py)
- **Features:** Wiki pages, spaces, collaborative documentation

### 9. Product KPI Tracking
- **Files:** [frappe_devsecops_dashboard/api/product_kpi.py](frappe_devsecops_dashboard/api/product_kpi.py)
- **Features:** Performance metrics, product health indicators

## Data Flow Patterns

### 1. User Authentication Flow
```
Browser → Frappe Login Page → Session Created → Frontend App
                                    ↓
                         CSRF Token Generated
                                    ↓
                         API Calls with Token
```

### 2. API Request Flow
```
React Component → Zustand Store Action → API Service Layer
                                              ↓
                                    Axios Client (with CSRF)
                                              ↓
                                    /api/method/{path}
                                              ↓
                                    @frappe.whitelist()
                                              ↓
                                    Backend Logic
                                              ↓
                                    JSON Response
                                              ↓
                                    Store Updates State
                                              ↓
                                    Component Re-renders
```

### 3. ZenHub Integration Flow
```
User Action → API Call → Python Backend
                              ↓
                    Get ZenHub Token (cached)
                              ↓
                    Execute GraphQL Query
                              ↓
                    Log to Database
                              ↓
                    Return Response
                              ↓
                    Frontend Updates
```

### 4. Doc Hook Flow (Example: Software Product)
```
User Saves Software Product
        ↓
    before_save event
        ↓
    handle_software_product_zenhub_workspace()
        ↓
    Search for existing workspace
        ↓
    If not exists → Create ZenHub workspace
        ↓
    Update product with workspace_id
        ↓
    Save completes
```

## Key Design Principles

### Frontend
1. **Component-Based:** Modular, reusable React components
2. **State Management:** Centralized Zustand stores with clear patterns
3. **API Abstraction:** Dedicated service layer with mock support
4. **Responsive Design:** Mobile-first with Ant Design grid system
5. **Type Safety:** Gradual TypeScript adoption

### Backend
1. **API-First:** RESTful endpoints with consistent response format
2. **Permission-Based:** Frappe's built-in permission system
3. **Event-Driven:** Doc hooks for automated workflows
4. **Async Processing:** Long-running tasks via job queue
5. **Caching:** Strategic caching for performance

### Integration
1. **Loose Coupling:** Frontend and backend can evolve independently
2. **Error Resilience:** Retry mechanisms, fallback mock data
3. **Logging:** Comprehensive logging of external API calls
4. **Security:** CSRF protection, encrypted passwords, permission checks

## Performance Considerations

### Frontend Optimizations
- **Code Splitting:** Lazy loading of heavy components
- **Bundle Analysis:** Vendor chunks (React, Ant Design, utilities)
- **Caching:** API response caching in service layer
- **Debouncing:** Search and filter inputs

### Backend Optimizations
- **Query Optimization:** Efficient Frappe ORM queries
- **Redis Caching:** Token caching, session management
- **Async Jobs:** Long-running operations in background
- **Database Indexing:** Proper indexing on DocTypes

## Security Architecture

### Authentication & Authorization
- **Session-Based Auth:** Frappe's built-in session management
- **CSRF Protection:** Token validation on all API calls
- **Permission System:** DocType-level and field-level permissions
- **User Permissions:** Project-based access control

### Data Security
- **Password Encryption:** Frappe's encryption utilities
- **Secure Sharing:** One-time links with expiration
- **API Key Management:** Encrypted API keys in database
- **Audit Logging:** Track all sensitive operations

## Deployment Architecture

### Development
```
Frappe Dev Server (port 8000) ← Frontend Dev Server (port 8080)
                                        ↓
                                    Vite Proxy
```

### Production
```
Frappe Backend → Built Frontend Assets (public/frontend/)
                        ↓
                Web Page (www/devsecops-ui.html)
                        ↓
                Nginx/Apache
```

## Related Documentation

- [Frontend Patterns](frontend-patterns.md) - React, Zustand, component patterns
- [Backend Patterns](backend-patterns.md) - Frappe API, DocType patterns
- [API Conventions](api-conventions.md) - Endpoint structure, response formats
- [Development Guide](development.md) - Setup, build, test workflows
- [Quick Reference](quick-reference.md) - Common commands and locations
- [Main README](../README.md) - Comprehensive developer playbook
