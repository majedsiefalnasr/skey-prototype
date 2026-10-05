// Guided-tour registry — one short tour per surface. Every tour obeys
// the Atlassian rule (max 3 steps, one screen, sequenced, Back + step
// count); steps reference copy keys resolved through the shared locale
// `t()` (EN text is the key, AR in the dictionary), so EN/AR + RTL come
// from the existing locale facility.
//
// A step may name several `targets` (first visible wins): the record
// action cluster shows Modify while reading and Save while writing, and
// section-bound targets (profile language, org content actions) are only
// visible on their own section. The engine skips hidden targets, so a
// tour degrades to its visible steps instead of pointing at nothing.

export const SHELL_TOUR_ID = 'invoice-shell-onboarding'

const TOURS = {
  // Single invoice (record view): pager, status, save cluster.
  record: [
    {
      id: 'pager',
      target: '.pager',
      headline: 'Move between records',
      body: 'Jump to any invoice without losing your place.',
      // The pager is bottom-anchored: 'top' keeps the card clear of it
      // (bottom would clamp back over the target).
      placement: 'top',
      primary: 'Next',
    },
    {
      id: 'status',
      target: 'button.stpill',
      headline: 'Track document status',
      body: 'Status is always named here, including Draft.',
      placement: 'bottom',
      primary: 'Next',
    },
    {
      id: 'save',
      // Exactly one primary at a time: Modify while reading, Save while
      // writing (see pages/invoices/operations.js applyState).
      targets: ['.phead [data-act="Save"]', '.phead [data-act="Modify"]'],
      headline: 'Modify, then save',
      body: 'Modify to edit, then Save or Undo your changes.',
      placement: 'bottom',
      primary: 'Done',
    },
  ],
  // Invoice list: search, open, page.
  list: [
    {
      id: 'search',
      target: '.data-list-toolbar input',
      headline: 'Search this list',
      body: 'Filter these invoices as you type.',
      placement: 'bottom',
      primary: 'Next',
    },
    {
      id: 'open',
      // The whole row is too wide for a clean highlight (full table
      // width, often scrolled) — point at its Doc No. button instead.
      target: '#list-canvas tbody tr td button',
      headline: 'Open a record',
      body: 'Double-click a row — or its number — to open it.',
      placement: 'top',
      primary: 'Next',
    },
    {
      id: 'pages',
      target: '#list-fnav',
      headline: 'Page through results',
      body: 'Move across pages without losing filters.',
      placement: 'top',
      primary: 'Done',
    },
  ],
  // Profile (settings): sections, fields, language.
  profile: [
    {
      id: 'sections',
      target: '#profile-scroll-nav-mount button',
      headline: 'Jump between sections',
      body: 'Profile, security, and sessions live here.',
      placement: 'right',
      primary: 'Next',
    },
    {
      id: 'fields',
      target: '#profile-name',
      headline: 'Your details',
      body: 'Keep your name and contact current.',
      placement: 'bottom',
      primary: 'Next',
    },
    {
      id: 'language',
      // Account-settings section only; skipped elsewhere.
      target: '#profile-language',
      headline: 'Prefer Arabic?',
      body: 'Switch the whole app to العربية here.',
      placement: 'bottom',
      primary: 'Done',
    },
  ],
  // Organization Center: areas, role, actions.
  organization: [
    {
      id: 'areas',
      target: '#organization-nav-mount button',
      headline: 'Switch admin areas',
      body: 'Users, sessions, and audits live here.',
      placement: 'right',
      primary: 'Next',
    },
    {
      id: 'role',
      target: '#organization-role-badge',
      headline: 'Your access level',
      body: 'Menus follow this role.',
      placement: 'bottom',
      primary: 'Next',
    },
    {
      id: 'actions',
      // Overview section content; skipped on other sections.
      target: '#organization-content button',
      headline: 'Take action here',
      body: 'Open users, sessions, and health.',
      placement: 'bottom',
      primary: 'Done',
    },
  ],
  // Launchpad (app launcher overlay): search, tiles, quick lists.
  launchpad: [
    {
      id: 'find',
      target: '.lp-search',
      headline: 'Find anything',
      body: 'Apps and screens are one search away.',
      placement: 'bottom',
      primary: 'Next',
    },
    {
      id: 'open',
      target: '.lp-tile',
      headline: 'Open an app',
      body: 'Pick up where you left off.',
      placement: 'bottom',
      primary: 'Next',
    },
    {
      id: 'quick',
      target: '[data-lp-quick-tab]',
      headline: 'Starred and recent',
      body: 'Pin favorites for one-click return.',
      placement: 'bottom',
      primary: 'Done',
    },
  ],
}

export const TOUR_SURFACES = Object.keys(TOURS)

/**
 * Fresh copy of a surface's steps (the engine never mutates the
 * registry). Returns null for unknown surfaces — callers treat that as
 * "no tour here" (e.g. Help shows a toast instead of starting).
 * @param {string} surface
 */
export function tourStepsFor(surface) {
  const steps = TOURS[surface]
  if (!steps) return null
  return steps.map(step => ({
    ...step,
    targets: Array.isArray(step.targets) ? [...step.targets] : step.targets,
  }))
}

/** Fresh copy of the T1 invoice-shell onboarding (record) tour. */
export function shellTourSteps() {
  return tourStepsFor('record')
}
