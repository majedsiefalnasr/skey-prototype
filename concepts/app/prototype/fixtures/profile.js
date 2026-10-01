// Profile-page sample data — same read-only fixture convention as
// prototype/fixtures/customers.js. No backend; CURRENT_USER mirrors the
// name/branch already hardcoded in shell/shell.html's user-pop card.

export const CURRENT_USER = {
  name: 'Majed Sief Alnasr',
  email: 'admin@lastchance',
  phone: '+20 100 123 4567',
  jobTitle: 'ERP Administrator',
  username: 'msiefalnasr',
  branch: 'lastchance',
  locale: 'en',
  timezone: 'Africa/Cairo',
  photo: '',
}

export const EMPLOYEE_DETAILS = {
  employeeNumber: 'EMP-00142',
  jobTitle: 'ERP Administrator',
  department: 'Information Technology',
  manager: 'Ahmed Hassan',
  branch: 'lastchance',
  hireDate: '2021-03-15',
  employmentStatus: 'Active',
  workPhone: '+20 2 2345 6789',
  extension: '214',
  officeLocation: 'Cairo HQ · Floor 4',
}

export const CONTACT_DETAILS = {
  address: '14 Al Nasr Street',
  addressDetails: 'Building 3, Floor 2, Apartment 5',
  city: 'Cairo',
  state: 'Cairo',
  country: 'EG - Egypt',
  postalCode: '11511',
  phone: '+20 2 2345 6789',
  email: 'admin@lastchance',
  mobile: '+20 100 123 4567',
  website: '',
}

export const RECENT_ACTIVITY_ROWS = [
  {id: 'act-1', action: 'Modified', target: 'Sales Invoice 126', timestamp: '2 hours ago'},
  {id: 'act-2', action: 'Created', target: 'Customer CAI-0043', timestamp: 'Yesterday'},
  {id: 'act-3', action: 'Posted', target: 'Sales Invoice 119', timestamp: '2 days ago'},
  {id: 'act-4', action: 'Modified', target: 'Location EG - Cairo Governorate', timestamp: '3 days ago'},
  {id: 'act-5', action: 'Deleted', target: 'Draft Invoice 108', timestamp: '5 days ago'},
]

export const LOGIN_LOG_ROWS = [
  {id: 'log-1', timestamp: '2026-09-23 08:12', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
  {id: 'log-2', timestamp: '2026-09-22 18:47', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
  {id: 'log-3', timestamp: '2026-09-22 09:03', ip: '156.203.5.11', device: 'Safari on iPhone', status: 'success'},
  {id: 'log-4', timestamp: '2026-09-21 21:55', ip: '196.221.4.90', device: 'Firefox on Windows', status: 'failed'},
  {id: 'log-5', timestamp: '2026-09-21 09:30', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
  {id: 'log-6', timestamp: '2026-09-20 14:02', ip: '102.45.9.180', device: 'Edge on Windows', status: 'success'},
  {id: 'log-7', timestamp: '2026-09-19 11:18', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
]
