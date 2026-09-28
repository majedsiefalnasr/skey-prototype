# Organization Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permission-aware Organization Center and a grouped, role-aware topbar user menu with interactive application- and database-session actions.

**Architecture:** Add a self-contained `pages/organization` page factory that consumes fixture data and an active prototype role. Keep role-to-capability decisions in a small pure access module so the page, topbar, and tests share one policy. Wire the page into the existing shell/page registry and let the prototype control drive role changes through explicit page and topbar setters.

**Tech Stack:** Vanilla ES modules, HTML templates, Tailwind utility classes and existing CSS tokens, Node test runner, Playwright.

## Global Constraints

- Preserve the established Skey ERP visual system, density, Profile-page interaction model, RTL/LTR support, and keyboard behavior.
- Administrator, Manager, and User are the only prototype roles.
- Users cannot enter Organization Center; managers have scoped business access; administrators have full access.
- Session mutations require confirmation and a non-empty reason and must create immutable simulated audit entries.
- Never expose database credentials, secrets, full SQL, exact personal location, or unrestricted IP data.
- Staff metrics must describe operational outcomes and must not create a composite employee score or leaderboard.
- Add no runtime dependency.

---

### Task 1: Role policy and prototype control

**Files:**
- Create: `concepts/app/pages/organization/access.js`
- Modify: `concepts/app/prototype/controls.html`
- Modify: `concepts/app/prototype/controls.js`
- Test: `tests/organization-center.test.mjs`

**Interfaces:**
- Produces: `ORGANIZATION_ROLES`, `organizationSectionsForRole(role)`, and `canPerformOrganizationAction(role, action, row)`.
- Produces: `createPrototypeControls(..., onRoleChange)` callback behavior and persisted `active-role` control.

- [ ] **Step 1: Write failing policy and control tests** that assert the three roles, manager-visible sections, user denial, protected session rows, the `active-role` select, and its inclusion in `CONTROL_IDS`.
- [ ] **Step 2: Run `node --test tests/organization-center.test.mjs`** and verify failure because the access module and control do not exist.
- [ ] **Step 3: Implement the pure access policy and add the role selector** with Administrator selected by default; invoke `onRoleChange(role)` on change and during state restoration.
- [ ] **Step 4: Re-run `node --test tests/organization-center.test.mjs`** and verify the policy/control tests pass.

### Task 2: Organization page structure and role-scoped content

**Files:**
- Create: `concepts/app/prototype/fixtures/organization.js`
- Create: `concepts/app/pages/organization/fields.js`
- Create: `concepts/app/pages/organization/layout.js`
- Create: `concepts/app/pages/organization/sections.js`
- Create: `concepts/app/pages/organization/templates.html`
- Create: `concepts/app/pages/organization/organization.js`
- Modify: `concepts/app/pages/invoices/templates.html`
- Modify: `concepts/app/shell/shell.js`
- Modify: `concepts/app/shell/content.js`
- Modify: `concepts/app/main.js`
- Modify: `concepts/app/pages/invoices/operations.js`
- Test: `tests/organization-center.test.mjs`

**Interfaces:**
- Consumes: `organizationSectionsForRole(role)` from Task 1.
- Produces: `createOrganization({root, role, fixtures, storage, toast, trapFocus, releaseFocus})` returning the standard page contract plus `setRole(role)` and `setSection(key)`.

- [ ] **Step 1: Add failing structural tests** for the template include, shell mount, content-host selectors, page registry entry, fixture imports, eight section definitions, and the page factory contract.
- [ ] **Step 2: Run `node --test tests/organization-center.test.mjs`** and verify the new structural assertions fail.
- [ ] **Step 3: Add realistic organization fixtures and renderers** for overview, settings, users, both session types, audit log, system performance, and staff operations, using the existing Profile page hierarchy and component vocabulary.
- [ ] **Step 4: Wire the template and page factory into the shell, content host, main composition, navigation registry, and invoice view-reset selectors.**
- [ ] **Step 5: Implement role changes** so administrator and manager section sets rerender safely, manager data is filtered to assigned scope, settings become read-only for managers, and User role navigates away through the supplied callback.
- [ ] **Step 6: Re-run `node --test tests/organization-center.test.mjs`** and verify all structural and role-rendering tests pass.

### Task 3: Session mutation dialogs and audit trail

**Files:**
- Create: `concepts/app/pages/organization/dialogs.html`
- Create: `concepts/app/pages/organization/sessions.js`
- Modify: `concepts/app/pages/organization/organization.js`
- Modify: `concepts/app/pages/organization/sections.js`
- Modify: `concepts/app/shell/shell.html`
- Test: `tests/organization-center.spec.mjs`

**Interfaces:**
- Consumes: eligible session rows and `canPerformOrganizationAction` from Task 1.
- Produces: `createOrganizationSessionActions(...)` with `bind()`, `open(kind, id)`, and `dispose()`.

- [ ] **Step 1: Write failing Playwright tests** that open Organization Center as administrator, reject an empty reason, revoke an eligible application session, terminate an eligible database session, preserve protected rows, show success feedback, prepend audit events, and persist removals across reload.
- [ ] **Step 2: Run the focused Playwright file** and verify it fails because the page/actions are absent.
- [ ] **Step 3: Add one reusable confirmation dialog** whose title, warning copy, confirmation label, and target summary adapt to revoke versus terminate.
- [ ] **Step 4: Implement session action state** in session storage, enforce action eligibility again at submit time, require a trimmed reason, remove the target, prepend a sanitized audit entry, rerender affected sections, and show a toast.
- [ ] **Step 5: Re-run the focused Playwright file** and verify session mutation scenarios pass.

### Task 4: Grouped role-aware topbar menu

**Files:**
- Modify: `concepts/app/shell/shell.html`
- Modify: `concepts/app/shell/topbar.js`
- Modify: `concepts/app/main.js`
- Test: `tests/organization-center.test.mjs`
- Test: `tests/organization-center.spec.mjs`

**Interfaces:**
- Consumes: active role and `navigateToOrganizationSection(section)` callback.
- Produces: `topbar.setRole(role)` and `.organization-menu[data-organization-section]` bindings.

- [ ] **Step 1: Add failing tests** for grouped Personal, Organization, Workspace, and Session markup; administrator and manager deep links; hidden organization group for User; active role text; and working deep-link navigation.
- [ ] **Step 2: Run the unit and focused browser tests** and verify the menu assertions fail.
- [ ] **Step 3: Reorganize the user menu markup** while preserving existing Profile, customize-sidebar, favorite, branch, and logout hooks.
- [ ] **Step 4: Extend the topbar controller** to render role-specific links, update identity metadata, bind organization navigation, and keep close-on-action behavior.
- [ ] **Step 5: Wire role changes and organization navigation in `main.js`**, including launchpad dismissal and User-role fallback to Profile.
- [ ] **Step 6: Re-run the unit and focused browser tests** and verify menu behavior passes for all three roles.

### Task 5: Responsive, RTL, accessibility, and final verification

**Files:**
- Modify: `concepts/app/styles/tailwind.css` only if existing utilities cannot express a required shared state.
- Modify: `tests/organization-center.spec.mjs`

**Interfaces:**
- Consumes: completed Organization Center and topbar.
- Produces: verified keyboard, RTL, responsive, and build behavior.

- [ ] **Step 1: Add failing browser assertions** for keyboard tab navigation, focus return after dialog close, manager restrictions, User redirect, mobile horizontal section navigation, and RTL logical alignment.
- [ ] **Step 2: Run the focused browser test** and verify any unimplemented states fail for the intended reason.
- [ ] **Step 3: Apply the smallest markup/style/controller corrections** required for the accessibility and responsive assertions.
- [ ] **Step 4: Run `/Users/majedsiefalnasr/.codex/skills/impeccable/scripts/impeccable detect --json concepts/app/pages/organization concepts/app/shell/shell.html concepts/app/shell/topbar.js concepts/app/prototype/controls.html`** once and resolve applicable findings.
- [ ] **Step 5: Run `node --test tests/*.test.mjs`, `npx playwright test tests/organization-center.spec.mjs`, and `npm run build`** and require zero failures.
- [ ] **Step 6: Review the final diff against the approved spec**, confirm no unrelated user changes were overwritten, and commit all requested workspace changes with a descriptive message.

