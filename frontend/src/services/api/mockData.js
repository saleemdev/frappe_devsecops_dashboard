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

// Export simulateDelay function
export { simulateDelay }

// Default export
export default {
  mockProjects,
  mockApplications,
  mockIncidents,
  mockChangeRequests,
  mockDashboardMetrics,
  simulateDelay
}
