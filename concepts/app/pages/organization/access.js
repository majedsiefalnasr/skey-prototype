import {ORGANIZATION_SECTION_ORDER} from './fields.js'

export const ORGANIZATION_ROLES = ['administrator', 'manager', 'user']

// Derived from the same visible-tab list the nav renders (fields.js), so
// the role policy and the navigation can never disagree about which
// sections exist.
const ADMIN_SECTIONS = [...ORGANIZATION_SECTION_ORDER]

const MANAGER_SECTIONS = ADMIN_SECTIONS.filter(key => key !== 'database-sessions')

export function normalizeOrganizationRole(role) {
  return ORGANIZATION_ROLES.includes(role) ? role : 'administrator'
}

export function organizationSectionsForRole(role) {
  const normalizedRole = normalizeOrganizationRole(role)
  if (normalizedRole === 'administrator') return [...ADMIN_SECTIONS]
  if (normalizedRole === 'manager') return [...MANAGER_SECTIONS]
  return []
}

export function canPerformOrganizationAction(role, action, row = {}) {
  const normalizedRole = normalizeOrganizationRole(role)
  if (normalizedRole === 'user' || row.current || row.protected) return false

  if (action === 'terminate-database-session') return normalizedRole === 'administrator'
  if (action !== 'revoke-session') return false
  if (normalizedRole === 'administrator') return true
  return normalizedRole === 'manager' && row.inManagerScope === true
}
