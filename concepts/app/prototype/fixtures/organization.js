export const ORGANIZATION_DETAILS = {
  displayName: 'lastchance',
  legalName: 'Last Chance Trading LLC',
  registrationNumber: 'EG-CR-104928',
  environment: 'Production',
  locale: 'en-EG',
  timezone: 'Africa/Cairo',
  currency: 'EGP',
  fiscalYearStart: 'January',
  defaultBranch: 'Cairo HQ',
}

export const ORGANIZATION_USERS = [
  {id: 'usr-1', name: 'Majed Sief Alnasr', role: 'Administrator', branch: 'Cairo HQ', team: 'IT Operations', status: 'Active', lastActive: 'Now', mfa: 'Enabled', inManagerScope: false},
  {id: 'usr-2', name: 'Mariam Adel', role: 'Sales Manager', branch: 'Cairo HQ', team: 'Sales', status: 'Active', lastActive: '3 min ago', mfa: 'Enabled', inManagerScope: true},
  {id: 'usr-3', name: 'Omar Hassan', role: 'Sales Clerk', branch: 'Cairo HQ', team: 'Sales', status: 'Active', lastActive: '8 min ago', mfa: 'Enabled', inManagerScope: true},
  {id: 'usr-4', name: 'Nour Khaled', role: 'Accountant', branch: 'Cairo HQ', team: 'Finance', status: 'Active', lastActive: '18 min ago', mfa: 'Not enrolled', inManagerScope: true},
  {id: 'usr-5', name: 'Youssef Ali', role: 'Warehouse Clerk', branch: 'Alexandria', team: 'Warehouse', status: 'Locked', lastActive: '2 days ago', mfa: 'Enabled', inManagerScope: false},
  {id: 'usr-6', name: 'Salma Emad', role: 'Purchasing Clerk', branch: 'Giza', team: 'Procurement', status: 'Dormant', lastActive: '41 days ago', mfa: 'Enabled', inManagerScope: false},
]

export const APPLICATION_SESSIONS = [
  {id: 'app-1', user: 'Majed Sief Alnasr', role: 'Administrator', branch: 'Cairo HQ', device: 'Chrome on macOS', location: 'Cairo, EG · 41.66.xxx.24', started: '08:12', lastActive: 'Now', current: true, protected: false, inManagerScope: false},
  {id: 'app-2', user: 'Mariam Adel', role: 'Sales Manager', branch: 'Cairo HQ', device: 'Edge on Windows', location: 'Cairo, EG · 41.68.xxx.18', started: '08:27', lastActive: '3 min ago', current: false, protected: false, inManagerScope: true},
  {id: 'app-3', user: 'Omar Hassan', role: 'Sales Clerk', branch: 'Cairo HQ', device: 'Chrome on Windows', location: 'Cairo, EG · 156.203.xxx.11', started: '09:04', lastActive: '8 min ago', current: false, protected: false, inManagerScope: true},
  {id: 'app-4', user: 'Nour Khaled', role: 'Accountant', branch: 'Cairo HQ', device: 'Firefox on Windows', location: 'Cairo, EG · 196.221.xxx.90', started: '09:31', lastActive: '18 min ago', current: false, protected: false, inManagerScope: true},
  {id: 'app-5', user: 'Integration service', role: 'System', branch: 'All branches', device: 'API client', location: 'Private network', started: '00:00', lastActive: '1 min ago', current: false, protected: true, inManagerScope: false},
]

export const DATABASE_SESSIONS = [
  {id: 'db-2184', account: 'skey_app', workload: 'Interactive', state: 'Running', duration: '00:01:42', query: 'Load sales invoice lines', blocking: 'No', current: true, protected: false},
  {id: 'db-2191', account: 'skey_app', workload: 'Reporting', state: 'Waiting', duration: '00:07:18', query: 'Aggregate inventory valuation', blocking: 'Blocked by db-2203', current: false, protected: false},
  {id: 'db-2203', account: 'skey_batch', workload: 'Month-end job', state: 'Running', duration: '00:18:06', query: 'Post general ledger batch', blocking: 'Blocks 1 session', current: false, protected: false},
  {id: 'db-0012', account: 'system', workload: 'Maintenance', state: 'Sleeping', duration: '11:42:10', query: 'Health and backup coordinator', blocking: 'No', current: false, protected: true},
]

export const ORGANIZATION_AUDIT_ROWS = [
  {id: 'audit-1', timestamp: '2026-09-28 10:14', actor: 'Mariam Adel', action: 'Approved', object: 'Sales Invoice 126', source: 'Sales', result: 'Success', inManagerScope: true},
  {id: 'audit-2', timestamp: '2026-09-28 09:42', actor: 'Majed Sief Alnasr', action: 'Changed setting', object: 'Session timeout', source: 'Organization', result: 'Success', inManagerScope: false},
  {id: 'audit-3', timestamp: '2026-09-28 09:17', actor: 'Omar Hassan', action: 'Updated', object: 'Customer CAI-0043', source: 'CRM', result: 'Success', inManagerScope: true},
  {id: 'audit-4', timestamp: '2026-09-28 08:51', actor: 'Nour Khaled', action: 'Posted', object: 'Journal JV-20419', source: 'Finance', result: 'Success', inManagerScope: true},
  {id: 'audit-5', timestamp: '2026-09-28 08:32', actor: 'Youssef Ali', action: 'Sign-in', object: 'User session', source: 'Security', result: 'Denied', inManagerScope: false},
  {id: 'audit-6', timestamp: '2026-09-27 16:04', actor: 'Integration service', action: 'Imported', object: '184 inventory records', source: 'API', result: 'Partial', inManagerScope: false},
]

export const STAFF_OPERATION_ROWS = [
  {id: 'staff-1', name: 'Mariam Adel', team: 'Sales', completed: 42, pending: 6, oldest: '4h', turnaround: '38m', rework: '2.4%', slaBreaches: 0, inManagerScope: true},
  {id: 'staff-2', name: 'Omar Hassan', team: 'Sales', completed: 57, pending: 11, oldest: '7h', turnaround: '24m', rework: '5.3%', slaBreaches: 2, inManagerScope: true},
  {id: 'staff-3', name: 'Nour Khaled', team: 'Finance', completed: 31, pending: 4, oldest: '1d', turnaround: '1h 12m', rework: '3.2%', slaBreaches: 1, inManagerScope: true},
  {id: 'staff-4', name: 'Youssef Ali', team: 'Warehouse', completed: 64, pending: 18, oldest: '2d', turnaround: '46m', rework: '7.8%', slaBreaches: 5, inManagerScope: false},
  {id: 'staff-5', name: 'Salma Emad', team: 'Procurement', completed: 23, pending: 9, oldest: '3d', turnaround: '2h 08m', rework: '4.3%', slaBreaches: 3, inManagerScope: false},
]

export const SYSTEM_HEALTH = {
  availability: '99.97%',
  responseTime: '286 ms',
  errorRate: '0.18%',
  queueDepth: 14,
  backgroundJobs: '47 of 48 healthy',
  integrations: '8 of 9 healthy',
  slowOperations: 3,
  openAlerts: 4,
  // 7-day trend series (oldest to newest, ending at today's value above) —
  // feeds the overview stat cards' per-metric sparkline/bar visuals
  // (renderOverview in sections.js), same trend-array convention as
  // customers/statistics.js's analytical cards.
  responseTimeTrend: [312, 298, 305, 291, 279, 294, 286],
  exceptionsTrend: [7, 9, 6, 8, 13, 9, 11],
  openAlertsTrend: [2, 3, 1, 5, 3, 6, 4],
  operationalHealthTrend: [96, 97, 94, 98, 95, 97, 98],
  lastDeploy: '2026-09-11 14:20',
  lastBackup: '2026-09-13 03:00',
  nextMaintenance: '2026-09-20 01:00',
}

function dayHistory(pattern) {
  return Array.from({length: 90}, (_, index) => pattern[index] ?? 'up')
}

export const SYSTEM_SERVICES = [
  {id: 'app', name: 'Application', detail: 'Web app and record views', uptime: '100%', status: 'up', history: dayHistory({})},
  {id: 'api', name: 'API', detail: 'Sync, integrations, and imports', uptime: '99.98%', status: 'up', history: dayHistory({52: 'degraded'})},
  {id: 'db', name: 'Database', detail: 'Primary and reporting workloads', uptime: '99.91%', status: 'degraded', history: dayHistory({71: 'down', 72: 'down', 84: 'degraded'})},
  {id: 'jobs', name: 'Background jobs', detail: 'Posting, valuation, and month-end batches', uptime: '99.95%', status: 'up', history: dayHistory({63: 'degraded'})},
]

