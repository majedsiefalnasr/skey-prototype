// Section keys the Organization Center nav deliberately does not show in
// this iteration — their renderers/metadata stay in place (sections.js,
// ORGANIZATION_SECTIONS) so a tab can be brought back by dropping its key
// from this list, but nothing in the page renders an entry point to them
// (nav, overview cards, topbar quick links).
export const ORGANIZATION_HIDDEN_SECTIONS = ['audit', 'performance', 'staff']

export const ORGANIZATION_SECTION_ORDER = [
  'overview',
  'settings',
  'users',
  'application-sessions',
  'database-sessions',
]

export const ORGANIZATION_SECTIONS = {
  overview: {title: 'Overview', description: 'Organization health, workload, and issues requiring attention.'},
  settings: {title: 'Organization settings', description: 'Legal identity, regional defaults, and fiscal configuration.'},
  users: {title: 'Users & access', description: 'Account status, access posture, and recent activity.'},
  'application-sessions': {title: 'Application sessions', description: 'People and devices currently connected to Skey ERP.'},
  'database-sessions': {title: 'Database sessions', description: 'Privileged operational view of database workload and blocking.'},
  audit: {title: 'Audit log', description: 'Immutable security, configuration, and business activity history.'},
  performance: {title: 'System performance', description: 'Availability, response time, jobs, integrations, and exceptions.'},
  staff: {title: 'Staff operations', description: 'Workflow outcomes, workload, turnaround, and rework by team.'},
}
