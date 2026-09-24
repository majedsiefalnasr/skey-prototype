// Profile-page scroll-nav section metadata — same shape/role as
// prototype/fixtures/customers.js's CUSTOMER_SECTIONS, but section bodies
// live in pages/profile/sections.js rather than being field-driven, so only
// title/icon are needed here.

export const PROFILE_SECTION_ORDER = ['profile', 'account', 'appearance', 'security', 'sessions', 'notifications']

export const PROFILE_SECTIONS = {
  profile: {title: 'Profile', icon: 'i-user', description: 'Your personal details and profile photo.'},
  account: {title: 'Account settings', icon: 'i-gear', description: 'Username, branch, default landing page, and account deactivation/deletion.'},
  appearance: {title: 'Appearance', icon: 'i-sun', description: 'Accent color, interface scale, typography, theme, layout, and density.'},
  security: {title: 'Security', icon: 'i-lock', description: 'Password, PIN, and two-factor authentication for signing in.'},
  sessions: {title: 'Sessions & devices', icon: 'i-clock', description: 'Recent account activity, sign-ins, and the devices currently signed in.'},
  notifications: {title: 'Notifications', icon: 'i-bell', description: 'Choose what you get notified about by email and in-app.'},
}
