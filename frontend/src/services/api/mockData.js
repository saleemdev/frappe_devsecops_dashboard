/**
 * Mock Data Service
 * Centralized mock data that mimics real API responses
 */

// Simulate API delay
const simulateDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms))

// Mock Projects Data
export const mockProjects = [
  {
    id: 'proj-001',
    name: 'ePrescription',
    description: 'Electronic prescription management system for healthcare providers',
    status: 'Active',
    priority: 'High',
    progress: 75,
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    team: ['John Smith', 'Sarah Johnson', 'Mike Chen'],
    tasks: {
      total: 45,
      completed: 34,
      inProgress: 8,
      pending: 3
    },
    budget: {
      allocated: 250000,
      spent: 187500
    },
    healthScore: 85,
    securityScore: 92
  },
  {
    id: 'proj-002',
    name: 'Patient Management',
    description: 'Comprehensive patient data management and tracking system',
    status: 'Active',
    priority: 'High',
    progress: 60,
    startDate: '2024-02-01',
    endDate: '2024-08-31',
    team: ['Alex Rodriguez', 'Lisa Wang', 'David Kim'],
    tasks: {
      total: 38,
      completed: 23,
      inProgress: 12,
      pending: 3
    },
    budget: {
      allocated: 180000,
      spent: 108000
    },
    healthScore: 78,
    securityScore: 88
  }
]

// Mock Task Types (DevSecOps lifecycle) with custom_priority ordering
export const mockTaskTypes = [
  { name: 'Planning', custom_priority: 1 },
  { name: 'Requirements', custom_priority: 2 },
  { name: 'Design', custom_priority: 3 },
  { name: 'Development', custom_priority: 4 },
  { name: 'Security Review', custom_priority: 5 },
  { name: 'Testing', custom_priority: 6 },
  { name: 'Deployment', custom_priority: 7 },
  { name: 'Operations', custom_priority: 8 }
]

// Mock Tasks per Project keyed by project id
// Each task mirrors key fields from ERPNext Task
export const mockTasksByProject = {
  'proj-001': [
    { id: 'T-001', subject: 'Draft project plan', status: 'Completed', assigned_to: 'John Smith', due_date: '2024-01-10', priority: 'Medium', description: 'Create initial plan', task_type: 'Planning' },
    { id: 'T-002', subject: 'Stakeholder interviews', status: 'Completed', assigned_to: 'Sarah Johnson', due_date: '2024-01-12', priority: 'Low', description: 'Interview key stakeholders', task_type: 'Requirements' },
    { id: 'T-003', subject: 'Wireframes', status: 'Completed', assigned_to: 'Mike Chen', due_date: '2024-01-18', priority: 'Medium', description: 'Low-fidelity wireframes', task_type: 'Design' },
    { id: 'T-004', subject: 'API endpoints v1', status: 'In Progress', assigned_to: 'John Smith', due_date: '2024-02-05', priority: 'High', description: 'Implement core endpoints', task_type: 'Development' },
    { id: 'T-005', subject: 'Dependency audit', status: 'Pending', assigned_to: 'Sarah Johnson', due_date: '2024-02-08', priority: 'Medium', description: 'Run security audit', task_type: 'Security Review' },
    { id: 'T-006', subject: 'Unit tests core', status: 'In Progress', assigned_to: 'Mike Chen', due_date: '2024-02-12', priority: 'Medium', description: 'Write unit tests', task_type: 'Testing' },
    { id: 'T-007', subject: 'Staging deploy', status: 'Pending', assigned_to: 'John Smith', due_date: '2024-02-20', priority: 'High', description: 'Deploy to staging', task_type: 'Deployment' },
    { id: 'T-008', subject: 'Monitoring setup', status: 'Pending', assigned_to: 'Sarah Johnson', due_date: '2024-02-25', priority: 'Medium', description: 'Set up dashboards', task_type: 'Operations' }
  ],
  'proj-002': [
    { id: 'T-101', subject: 'Requirements doc', status: 'Completed', assigned_to: 'Alex Rodriguez', due_date: '2024-02-05', priority: 'Medium', description: 'Finalize requirements', task_type: 'Requirements' },
    { id: 'T-102', subject: 'UI design', status: 'Completed', assigned_to: 'Lisa Wang', due_date: '2024-02-10', priority: 'Low', description: 'Design major screens', task_type: 'Design' },
    { id: 'T-103', subject: 'Frontend scaffolding', status: 'In Progress', assigned_to: 'David Kim', due_date: '2024-02-18', priority: 'High', description: 'Set up app shell', task_type: 'Development' },
    { id: 'T-104', subject: 'SAST pipeline', status: 'Pending', assigned_to: 'Alex Rodriguez', due_date: '2024-02-21', priority: 'Medium', description: 'Configure SAST', task_type: 'Security Review' },
    { id: 'T-105', subject: 'E2E tests', status: 'Pending', assigned_to: 'Lisa Wang', due_date: '2024-02-28', priority: 'Medium', description: 'Cypress tests', task_type: 'Testing' }
  ]
}


// Mock Applications Data
export const mockApplications = [
  {
    id: 'app-001',
    name: 'ePrescription API',
    description: 'RESTful API for electronic prescription management',
    project: 'ePrescription',
    repositoryUrl: 'https://github.com/company/eprescription-api',
    deploymentUrl: 'https://api.eprescription.dod.mil',
    technology: 'Node.js',
    framework: 'Express.js',
    database: 'PostgreSQL',
    status: 'Active',
    version: 'v2.1.3',
    lastDeployment: '2024-01-20 14:30:00',
    environment: 'Production',
    healthScore: 95,
    securityScore: 98,
    complianceStatus: 'Compliant',
    team: [
      { name: 'John Smith', role: 'Lead Developer', avatar: 'JS' },
      { name: 'Sarah Johnson', role: 'DevOps Engineer', avatar: 'SJ' }
    ],
    environmentVariables: [
      { key: 'NODE_ENV', value: 'production', sensitive: false },
      { key: 'DATABASE_URL', value: '***REDACTED***', sensitive: true },
      { key: 'JWT_SECRET', value: '***REDACTED***', sensitive: true }
    ],
    deploymentHistory: [
      { version: 'v2.1.3', date: '2024-01-20', status: 'Success', deployedBy: 'John Smith' },
      { version: 'v2.1.2', date: '2024-01-18', status: 'Success', deployedBy: 'Sarah Johnson' },
      { version: 'v2.1.1', date: '2024-01-15', status: 'Failed', deployedBy: 'John Smith' }
    ],
    securityScans: [
      { type: 'SAST', status: 'Passed', score: 98, lastRun: '2024-01-20', issues: 0, severity: 'None' },
      { type: 'DAST', status: 'Passed', score: 96, lastRun: '2024-01-19', issues: 1, severity: 'Low' },
      { type: 'Dependency Scan', status: 'Passed', score: 94, lastRun: '2024-01-18', issues: 2, severity: 'Medium' }
    ],
    metrics: {
      uptime: 99.9,
      responseTime: 145,
      errorRate: 0.02,
      throughput: 1250
    }
  },
  {
    id: 'app-002',
    name: 'Patient Portal',
    description: 'Patient-facing web portal for appointment booking and medical records',
    project: 'Patient Management',
    repositoryUrl: 'https://github.com/company/patient-portal',
    deploymentUrl: 'https://portal.patients.dod.mil',
    technology: 'React',
    framework: 'Next.js',
    database: 'MongoDB',
    status: 'Active',
    version: 'v1.5.2',
    lastDeployment: '2024-01-18 10:15:00',
    environment: 'Staging',
    healthScore: 87,
    securityScore: 92,
    complianceStatus: 'Compliant',
    team: [
      { name: 'Sarah Johnson', role: 'Frontend Lead', avatar: 'SJ' },
      { name: 'Mike Chen', role: 'UX Designer', avatar: 'MC' }
    ],
    environmentVariables: [
      { key: 'REACT_APP_API_URL', value: 'https://api.staging.dod.mil', sensitive: false },
      { key: 'REACT_APP_AUTH_TOKEN', value: '***REDACTED***', sensitive: true }
    ],
    deploymentHistory: [
      { version: 'v1.5.2', date: '2024-01-18', status: 'Success', deployedBy: 'Sarah Johnson' },
      { version: 'v1.5.1', date: '2024-01-15', status: 'Success', deployedBy: 'Mike Chen' }
    ],
    securityScans: [
      { type: 'SAST', status: 'Passed', score: 94, lastRun: '2024-01-18', issues: 1, severity: 'Low' },
      { type: 'DAST', status: 'Passed', score: 89, lastRun: '2024-01-17', issues: 2, severity: 'Medium' }
    ],
    metrics: {
      uptime: 98.5,
      responseTime: 230,
      errorRate: 0.05,
      throughput: 850
    }
  }
]

// Mock Incidents Data
export const mockIncidents = [
  {
    id: 'INC-001',
    title: 'Database Connection Timeout',
    description: 'Multiple users reporting slow response times and connection timeouts when accessing the patient database.',
    severity: 'High',
    status: 'In Progress',
    priority: 'High',
    assignedTo: 'John Smith',
    reportedBy: 'Sarah Johnson',
    reportedDate: '2024-01-20',
    updatedDate: '2024-01-21',
    category: 'Infrastructure',
    affectedSystems: ['Patient Database', 'ePrescription API'],
    timeline: [
      {
        date: '2024-01-20 09:15',
        action: 'Incident reported',
        user: 'Sarah Johnson',
        description: 'Initial report of database connection issues'
      },
      {
        date: '2024-01-20 09:30',
        action: 'Incident assigned',
        user: 'System',
        description: 'Assigned to John Smith for investigation'
      },
      {
        date: '2024-01-20 10:45',
        action: 'Investigation started',
        user: 'John Smith',
        description: 'Began analysis of database connection logs'
      },
      {
        date: '2024-01-21 08:30',
        action: 'Root cause identified',
        user: 'John Smith',
        description: 'Found connection pool exhaustion due to increased load'
      }
    ]
  },
  {
    id: 'INC-002',
    title: 'Authentication Service Outage',
    description: 'Complete outage of the authentication service affecting all user logins.',
    severity: 'Critical',
    status: 'Closed',
    priority: 'Critical',
    assignedTo: 'Mike Chen',
    reportedBy: 'Alex Rodriguez',
    reportedDate: '2024-01-19',
    updatedDate: '2024-01-19',
    category: 'Security',
    affectedSystems: ['Authentication Service', 'Patient Portal', 'Mobile App'],
    timeline: [
      {
        date: '2024-01-19 14:20',
        action: 'Incident reported',
        user: 'Alex Rodriguez',
        description: 'Authentication service completely down'
      },
      {
        date: '2024-01-19 14:25',
        action: 'Incident escalated',
        user: 'System',
        description: 'Auto-escalated due to critical severity'
      },
      {
        date: '2024-01-19 15:45',
        action: 'Service restored',
        user: 'Mike Chen',
        description: 'Restarted authentication service cluster'
      },
      {
        date: '2024-01-19 16:00',
        action: 'Incident closed',
        user: 'Mike Chen',
        description: 'Service fully operational, monitoring continues'
      }
    ]
  }
]

// Mock Change Requests Data
export const mockChangeRequests = [
  {
    id: 'CR-001',
    title: 'Upgrade Database to PostgreSQL 15',
    description: 'Upgrade production database from PostgreSQL 13 to PostgreSQL 15 for improved performance and security features.',
    type: 'Infrastructure',
    priority: 'Medium',
    status: 'Approved',
    requestedBy: 'John Smith',
    approvedBy: 'Sarah Johnson',
    requestDate: '2024-01-15',
    approvalDate: '2024-01-18',
    scheduledDate: '2024-01-25',
    affectedSystems: ['ePrescription API', 'Patient Database'],
    riskLevel: 'Medium',
    rollbackPlan: 'Database snapshot and rollback scripts prepared',
    testingCompleted: true
  },
  {
    id: 'CR-002',
    title: 'Deploy New Patient Portal Features',
    description: 'Deploy new appointment scheduling and medical records viewing features to production.',
    type: 'Feature',
    priority: 'High',
    status: 'In Progress',
    requestedBy: 'Mike Chen',
    approvedBy: 'Alex Rodriguez',
    requestDate: '2024-01-20',
    approvalDate: '2024-01-21',
    scheduledDate: '2024-01-23',
    affectedSystems: ['Patient Portal', 'API Gateway'],
    riskLevel: 'Low',
    rollbackPlan: 'Feature flags enabled for quick rollback',
    testingCompleted: true
  }
]

// Mock Dashboard Metrics
export const mockDashboardMetrics = {
  projects: {
    total: 6,
    active: 4,
    completed: 2,
    onHold: 0
  },
  tasks: {
    total: 187,
    completed: 142,
    inProgress: 32,
    overdue: 13
  },
  incidents: {
    total: 15,
    open: 3,
    inProgress: 5,
    closed: 7
  },
  applications: {
    total: 12,
    active: 10,
    maintenance: 1,
    inactive: 1
  },
  security: {
    vulnerabilities: 8,
    critical: 1,
    high: 2,
    medium: 3,
    low: 2
  },
  compliance: {
    score: 94,
    policies: 45,
    compliant: 42,
    nonCompliant: 3
  }
}

// Mock Swagger Collections Data
export const mockSwaggerCollections = [
  {
    id: 'swagger-001',
    name: 'ePrescription API',
    description: 'Complete API documentation for the ePrescription system including patient management, prescription handling, and pharmacy integration.',
    version: '2.1.0',
    project: 'ePrescription',
    status: 'Active',
    createdDate: '2024-01-15',
    updatedDate: '2024-03-20',
    author: 'John Smith',
    baseUrl: 'https://api.eprescription.com/v2',
    endpoints: [
      {
        method: 'GET',
        path: '/patients',
        summary: 'Get all patients',
        tags: ['Patients']
      },
      {
        method: 'POST',
        path: '/patients',
        summary: 'Create new patient',
        tags: ['Patients']
      },
      {
        method: 'GET',
        path: '/prescriptions',
        summary: 'Get prescriptions',
        tags: ['Prescriptions']
      },
      {
        method: 'POST',
        path: '/prescriptions',
        summary: 'Create prescription',
        tags: ['Prescriptions']
      },
      {
        method: 'GET',
        path: '/medications',
        summary: 'Search medications',
        tags: ['Medications']
      }
    ],
    tags: ['Healthcare', 'API', 'Production'],
    documentation: 'https://docs.eprescription.com/api',
    testingUrl: 'https://test.eprescription.com/swagger-ui',
    lastTested: '2024-03-18',
    testStatus: 'Passed'
  },
  {
    id: 'swagger-002',
    name: 'Patient Portal API',
    description: 'Patient-facing API for appointment scheduling, medical records access, and communication with healthcare providers.',
    version: '1.8.3',
    project: 'Patient Portal',
    status: 'Active',
    createdDate: '2024-02-01',
    updatedDate: '2024-03-15',
    author: 'Sarah Johnson',
    baseUrl: 'https://portal.healthsystem.com/api/v1',
    endpoints: [
      {
        method: 'GET',
        path: '/appointments',
        summary: 'Get patient appointments',
        tags: ['Appointments']
      },
      {
        method: 'POST',
        path: '/appointments',
        summary: 'Schedule appointment',
        tags: ['Appointments']
      },
      {
        method: 'GET',
        path: '/medical-records',
        summary: 'Get medical records',
        tags: ['Records']
      },
      {
        method: 'GET',
        path: '/messages',
        summary: 'Get patient messages',
        tags: ['Communication']
      },
      {
        method: 'POST',
        path: '/messages',
        summary: 'Send message to provider',
        tags: ['Communication']
      }
    ],
    tags: ['Patient Portal', 'API', 'Production'],
    documentation: 'https://docs.portal.healthsystem.com',
    testingUrl: 'https://test-portal.healthsystem.com/swagger',
    lastTested: '2024-03-14',
    testStatus: 'Passed'
  },
  {
    id: 'swagger-003',
    name: 'Mobile Health API',
    description: 'RESTful API for mobile health application supporting fitness tracking, health monitoring, and telemedicine features.',
    version: '3.0.0-beta',
    project: 'Mobile Health App',
    status: 'Development',
    createdDate: '2024-02-20',
    updatedDate: '2024-03-22',
    author: 'Mike Chen',
    baseUrl: 'https://api.mobilehealth.com/v3',
    endpoints: [
      {
        method: 'GET',
        path: '/health-metrics',
        summary: 'Get health metrics',
        tags: ['Health Data']
      },
      {
        method: 'POST',
        path: '/health-metrics',
        summary: 'Record health data',
        tags: ['Health Data']
      },
      {
        method: 'GET',
        path: '/fitness-activities',
        summary: 'Get fitness activities',
        tags: ['Fitness']
      },
      {
        method: 'POST',
        path: '/telemedicine/sessions',
        summary: 'Start telemedicine session',
        tags: ['Telemedicine']
      }
    ],
    tags: ['Mobile', 'Health', 'Beta'],
    documentation: 'https://docs.mobilehealth.com/api/v3',
    testingUrl: 'https://beta-api.mobilehealth.com/docs',
    lastTested: '2024-03-21',
    testStatus: 'Failed'
  },
  {
    id: 'swagger-004',
    name: 'Analytics Dashboard API',
    description: 'Data analytics and reporting API providing insights into healthcare operations, patient outcomes, and system performance.',
    version: '1.5.2',
    project: 'Analytics Dashboard',
    status: 'Active',
    createdDate: '2024-01-10',
    updatedDate: '2024-03-10',
    author: 'Lisa Wang',
    baseUrl: 'https://analytics.healthsystem.com/api/v1',
    endpoints: [
      {
        method: 'GET',
        path: '/reports',
        summary: 'Get available reports',
        tags: ['Reports']
      },
      {
        method: 'POST',
        path: '/reports/generate',
        summary: 'Generate custom report',
        tags: ['Reports']
      },
      {
        method: 'GET',
        path: '/metrics/dashboard',
        summary: 'Get dashboard metrics',
        tags: ['Metrics']
      },
      {
        method: 'GET',
        path: '/analytics/trends',
        summary: 'Get trend analysis',
        tags: ['Analytics']
      }
    ],
    tags: ['Analytics', 'Reporting', 'Production'],
    documentation: 'https://docs.analytics.healthsystem.com',
    testingUrl: 'https://test-analytics.healthsystem.com/swagger',
    lastTested: '2024-03-09',
    testStatus: 'Passed'
  }
]

// Export simulateDelay function

// Mock Zenhub Sprint Report (sample payload)
export const mockZenhubSprintReport = (projectId = 'PROJ-0001') => ({
  success: true,
  workspace_id: '68d3a2e3b671ce000f7b301b',
  workspace_name: 'Eprescription / Healthpro Pharma',
  sprints: [
    {
      sprint_id: 'sprint_001',
      sprint_name: 'Sprint 23',
      state: 'active',
      start_date: '2025-09-16',
      end_date: '2025-09-30',
      total_story_points: 34,
      completed_story_points: 21,
      remaining_story_points: 13,
      utilization_percentage: 61.76,
      team_members: [
        { id: 'user_1', name: 'John Doe', username: 'jdoe' },
        { id: 'user_2', name: 'Jane Smith', username: 'jsmith' }
      ],
      team_member_story_points: [
        { id: 'user_1', name: 'John Doe', username: 'jdoe', total_story_points: 15, completed_story_points: 10, utilization_percentage: 66.67 },
        { id: 'user_2', name: 'Jane Smith', username: 'jsmith', total_story_points: 19, completed_story_points: 11, utilization_percentage: 57.89 }
      ],
      // Backward-compat summary
      issues_summary: { total: 5, completed: 2, in_progress: 2, blocked: 1 },
      // New detailed issues array
      issues: [
        {
          issue_id: 'Z-101',
          title: 'User authentication API',
          status: 'Done',
          state: 'closed',
          story_points: 5,
          assignees: [{ id: 'user_1', name: 'John Doe' }],
          blocked_by: []
        },
        {
          issue_id: 'Z-102',
          title: 'API rate limit issues',
          status: 'Blocked',
          state: 'open',
          story_points: 3,
          assignees: [{ id: 'user_2', name: 'Jane Smith' }],
          blocked_by: ['Z-087']
        },
        {
          issue_id: 'Z-103',
          title: 'Implement audit logs',
          status: 'In Progress',
          state: 'in_progress',
          story_points: 8,
          assignees: [{ id: 'user_1', name: 'John Doe' }],
          blocked_by: []
        },
        {
          issue_id: 'Z-104',
          title: 'Build dashboard widgets',
          status: 'To Do',
          state: 'open',
          story_points: 8,
          assignees: [],
          blocked_by: []
        },
        {
          issue_id: 'Z-105',
          title: 'Integration tests',
          status: 'In Review',
          state: 'open',
          story_points: 10,
          assignees: [{ id: 'user_2', name: 'Jane Smith' }],
          blocked_by: []
        }
      ],
      blockers: [
        { issue_id: 'Z-102', title: 'API rate limit issues', blocked_by: ['Z-087'] }
      ]
    }
  ]
})

export { simulateDelay }

// Default export
export default {
  mockProjects,
  mockApplications,
  mockIncidents,
  mockChangeRequests,
  mockDashboardMetrics,
  mockSwaggerCollections,
  simulateDelay
}
