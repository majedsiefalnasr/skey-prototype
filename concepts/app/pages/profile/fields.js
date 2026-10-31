// Profile-page scroll-nav section metadata — same shape/role as
// prototype/fixtures/customers.js's CUSTOMER_SECTIONS, but section bodies
// live in pages/profile/sections.js rather than being field-driven, so only
// title/icon are needed here.

export const PROFILE_SECTION_ORDER = ['profile', 'employee', 'contact', 'appearance', 'security', 'sessions']

export const PROFILE_SECTIONS = {
  profile: {title: 'Profile', icon: 'i-user', description: 'Your personal details, language, and profile photo.'},
  employee: {title: 'Employee details', icon: 'i-id', description: 'Employment information and workplace contact details.'},
  contact: {title: 'Contact details', icon: 'i-location', description: 'Your address and personal contact information.'},
  appearance: {title: 'Appearance', icon: 'i-sun', description: 'Theme, accent color, interface scale, typography, layout, density, card style, and input style.'},
  security: {title: 'Security', icon: 'i-lock', description: 'Password and PIN settings for signing in.'},
  sessions: {title: 'Sessions & devices', icon: 'i-clock', description: 'Recent account activity, sign-ins, and the current session.'},
}
