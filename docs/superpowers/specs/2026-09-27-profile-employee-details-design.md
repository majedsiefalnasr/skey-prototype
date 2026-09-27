# Profile Employee Details — Design Spec

## Purpose

Simplify the Profile page by removing account-management, two-factor-authentication, and notification configuration paths that do not belong in this prototype, then add an Employee details tab with a clear split between HR-controlled information and employee-editable workplace details.

## Information architecture

The Profile navigator and user-menu shortcuts use this order:

1. Profile
2. Employee details
3. Account settings
4. Appearance
5. Security
6. Sessions & devices

Employee details is inserted immediately before Account settings. Notifications is removed rather than hidden, keeping the page at six sections.

## Removed behavior

### Account settings

- Remove the Danger zone card.
- Remove Deactivate account and Delete account actions.
- Remove both confirmation dialogs, their validation/state, event bindings, and prototype-only account-status mutation.
- Keep Username, Branch, and Default landing page.

### Security

- Remove the Two-factor authentication row.
- Remove enable/disable two-factor dialogs, fixture state, actions, validation, and event bindings.
- Keep Change password and Set PIN, including their existing dialogs and validation.

### Notifications

- Remove the Notifications section from section metadata, rendering, scroll navigation, and the topbar user menu.
- Remove the email and in-app notification configuration controls rather than leaving unreachable markup.
- Do not change the application-wide notifications popover or Email page; they are separate features.

## Employee details

Employee data lives in a dedicated fixture object, separate from account/profile identity data. The tab uses the existing shared Profile card and `.rec-field` primitives, so standard/floating/inline input styles, density, and standard/fieldset/simple card presentations continue to apply.

### HR-controlled fields

These values are visible but read-only:

- Employee number
- Job title
- Department
- Manager
- Branch
- Hire date
- Employment status

Employment status also supplies the Profile header status badge. Removing account deactivation therefore does not leave a dead status path.

### Employee-editable fields

These values are editable:

- Work phone
- Extension
- Office location

The editable fields appear in a separate Workplace contact card with Save and Undo actions. Save updates the in-memory fixture for the active page, writes only these three values to session storage, updates the saved baseline, and shows a success toast. Undo restores the most recently saved values without changing HR-controlled fields.

On first render, saved session values are merged only into the editable fields. Missing or malformed stored data falls back to the fixture values. This remains prototype-local; no backend or cross-browser persistence is introduced.

## Component and data changes

- `fields.js` replaces `notifications` with `employee` in the ordered metadata.
- The profile fixture exports employee details separately and removes obsolete two-factor and deactivation state.
- `sections.js` removes danger-zone, two-factor, and notification renderers and adds the Employee details renderer.
- `profile.js` removes obsolete dialog/action refresh paths and owns the small Employee details save/undo controller.
- `security-dialogs.js` retains only password and PIN behavior.
- `dialogs.html` retains only password and PIN dialogs.
- The topbar user menu replaces Notifications with Employee details before Account settings.

No new page framework, generic form abstraction, or backend service is introduced.

## Validation and feedback

- Work phone, extension, and office location remain optional prototype fields.
- Save trims surrounding whitespace before persisting.
- Save shows the existing success toast pattern.
- Undo restores the last saved baseline; if no save has occurred in the current session, that baseline is the fixture merged with any previously stored values.
- Storage parsing follows the project’s existing safe JSON-storage helper conventions.

## Accessibility and responsive behavior

- Every employee field keeps an explicit label/control association.
- Read-only values use disabled shared fields consistently with the rest of Profile.
- Save and Undo remain keyboard-accessible native buttons.
- The existing Profile navigator and responsive card/grid behavior are reused; Employee details adds no new breakpoint or navigation mechanism.

## Verification

1. Profile navigation and the user menu expose the six sections in the approved order, with Employee details before Account settings and no Notifications entry.
2. Account settings contains normal account fields but no danger zone, deactivate/delete controls, dialogs, or handlers.
3. Security contains Password and PIN but no two-factor row, state, dialogs, or handlers.
4. Employee details renders all ten approved fields with the correct read-only/editable split.
5. Save persists only editable employee fields across reloads, shows confirmation, and Undo restores the last saved values.
6. Employee fields respond to Profile card style, global card style, density, and input-style controls.
7. Existing password, PIN, sessions, devices, Appearance, and Profile behaviors remain intact.
8. Unit, focused browser, mobile, RTL, build, and diff checks pass except for any explicitly documented pre-existing failures unrelated to this change.

## Out of scope

- Real HR or account-management APIs
- Editing HR-controlled employee data
- Application notification delivery or the Notifications popover
- New authentication methods
- Cross-device or permanent persistence
