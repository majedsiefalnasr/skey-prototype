// Profile-page scroll-nav section metadata — same shape/role as
// prototype/fixtures/customers.js's CUSTOMER_SECTIONS, but section bodies
// live in pages/profile/sections.js rather than being field-driven, so only
// title/icon are needed here.

export const PROFILE_SECTION_ORDER = ['profile', 'account', 'appearance', 'security', 'sessions', 'notifications']

export const PROFILE_SECTIONS = {
  profile: {title: 'Profile', icon: 'i-user'},
  account: {title: 'Account settings', icon: 'i-gear'},
  appearance: {title: 'Appearance', icon: 'i-sun'},
  security: {title: 'Security', icon: 'i-lock'},
  sessions: {title: 'Sessions & devices', icon: 'i-clock'},
  notifications: {title: 'Notifications', icon: 'i-bell'},
}
