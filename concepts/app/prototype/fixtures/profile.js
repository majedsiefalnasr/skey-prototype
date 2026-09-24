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

export const LOGIN_LOG_ROWS = [
  {id: 'log-1', timestamp: '2026-09-23 08:12', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
  {id: 'log-2', timestamp: '2026-09-22 18:47', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
  {id: 'log-3', timestamp: '2026-09-22 09:03', ip: '156.203.5.11', device: 'Safari on iPhone', status: 'success'},
  {id: 'log-4', timestamp: '2026-09-21 21:55', ip: '196.221.4.90', device: 'Firefox on Windows', status: 'failed'},
  {id: 'log-5', timestamp: '2026-09-21 09:30', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
  {id: 'log-6', timestamp: '2026-09-20 14:02', ip: '102.45.9.180', device: 'Edge on Windows', status: 'success'},
  {id: 'log-7', timestamp: '2026-09-19 11:18', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
]

export const DEVICE_ROWS = [
  {id: 'dev-1', name: 'Chrome on macOS', location: 'Cairo, EG', lastActive: 'Active now', current: true},
  {id: 'dev-2', name: 'Safari on iPhone', location: 'Cairo, EG', lastActive: '1 day ago', current: false},
  {id: 'dev-3', name: 'Firefox on Windows', location: 'Alexandria, EG', lastActive: '3 days ago', current: false},
  {id: 'dev-4', name: 'Edge on Windows', location: 'Giza, EG', lastActive: '6 days ago', current: false},
]
