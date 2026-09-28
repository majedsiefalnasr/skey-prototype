# Organization Center Design

## Job and audience

Skey ERP needs a single administration surface where organization administrators can configure the tenant and investigate security, operational, and performance conditions without mixing those concerns into personal Profile settings. Managers use the same surface with a restricted scope for their teams and branches. Ordinary users retain personal Profile access and do not see organization-administration navigation.

## Outcome and proof

An administrator can understand organization health, inspect active application and database sessions, revoke or terminate eligible sessions, review immutable audit events, and edit organization defaults. A manager can inspect business-impact and team workflow metrics without seeing infrastructure-only data. The prototype proves these flows through role switching, scoped fixtures, confirmation dialogs, persistent simulated actions, visible feedback, and audit entries.

The operational model follows established ERP patterns: SAP separates health, real-user, and business-process monitoring; Dynamics 365 separates telemetry, user logs, and database audit logging; Oracle and NetSuite use permission-gated searchable audit histories. Staff reporting therefore measures workflow outcomes rather than assigning an opaque employee score.

## Selected direction

Create an **Organization Center** inside the established Skey ERP visual system. It reuses the Profile page's compact header, two-column section navigator, cards, tables, form controls, responsive behavior, and bilingual layout conventions. The left navigator exposes eight sections:

1. Overview
2. Organization settings
3. Users & access
4. Application sessions
5. Database sessions
6. Audit log
7. System performance
8. Staff operations

The overview is an operational launch point, not a decorative dashboard: status summaries and exception counts deep-link to the relevant section. Detailed sections use dense tables, explicit filters, status labels, and contextual actions.

## Roles and permissions

The prototype controls gain an `Active role` selector with `Administrator`, `Manager`, and `User` values. The selection persists in prototype state and immediately updates the topbar identity, user menu, Organization Center sections, record scope, actions, and restricted states.

- **Administrator:** all sections; may edit organization settings, revoke eligible application sessions, and terminate eligible database sessions.
- **Manager:** Overview, Users & access, Application sessions, Audit log, System performance, and Staff operations, restricted to assigned teams and branches. Organization settings are a read-only summary. Database sessions are hidden. Managers may revoke eligible managed-staff application sessions.
- **User:** Organization Center links are hidden. If the role changes to User while the page is open, navigation moves to Profile. Personal session management remains in Profile.

Authorization is represented in the client prototype but documented as a server-side responsibility in production. Hidden navigation is not treated as authorization.

## Interaction and content

### Overview

Show organization identity and environment, active-user and session counts, response time, error rate, background-job health, approval backlog, workflow exceptions, and recent alerts. Every summary links to a permitted detailed section.

### Organization settings

Show legal/display name, registration number, locale, timezone, base currency, fiscal-year start, and default branch. Administrators receive the existing Save/Undo pattern and persisted changes. Managers receive the same information read-only.

### Users & access

Show name, role, branch, status, last activity, and MFA state with search and status filters. Managers see only assigned staff. Administrator-only role-management actions are outside this proposal.

### Application sessions

Show user, role, branch, device, coarse location/IP, started time, last activity, and current state. Revoke is unavailable for the administrator's current session, system sessions, and rows outside the active role's scope. Revocation requires confirmation and a reason, removes the session from the active list, adds an audit event, persists for the browser session, and produces success feedback.

### Database sessions

Administrator-only. Show session ID, service account, workload, state, duration, query summary, and blocking state without credentials or query parameters. Termination is unavailable for the current/system/maintenance sessions. Termination requires explicit confirmation and a reason, removes the session, adds an audit event, persists for the browser session, and produces success feedback.

### Audit log

Show timestamp, actor, action, object, source, result, and scope. Support filtering by text, action type, result, and date range. Simulated session actions prepend immutable audit entries. Audit records have no edit or delete action.

### System performance

Show availability, response-time and error trends, slow operations, integrations, background jobs, queue depth, and resource-pressure summaries. Administrators see technical detail; managers see business-impact summaries without database identifiers.

### Staff operations

Show documents completed, pending workload and age, approval turnaround, SLA breaches, returns/rework, exception rate, and workflow bottlenecks. Managers may drill into named staff only inside their assigned scope. No composite employee score, leaderboard, or decontextualized ranking is included.

## Topbar user menu

Replace the flat list with a clear identity card and grouped actions:

- **Personal:** My profile, Account preferences, Appearance, Security, Sessions & devices.
- **Organization:** role-specific deep links into Organization Center. Administrators see Overview, Users & access, Audit log, and System performance. Managers see Overview, Staff operations, and System performance. Users do not see this group.
- **Workspace:** current organization/branch, Customize sidebar, Add page to Favorites.
- **Session:** Log out.

The identity card shows the active role and current organization/branch. Existing keyboard menu behavior, focus handling, icons, RTL order, and close-on-action behavior remain intact.

## States, constraints, and anti-goals

- Include normal, filtered-empty, permission-restricted, confirmation, validation-error, and successful-action states.
- Maintain WCAG 2.1 AA intent, keyboard operability, visible focus, semantic tables/forms/dialogs, and logical properties for RTL.
- Use existing tokens and components; do not create a new visual language or add dependencies.
- Use realistic fixture data only; do not imply live infrastructure monitoring.
- Session actions are reversible only by resetting prototype session storage; dialogs must clearly identify them as prototype simulations where appropriate.
- Do not expose database credentials, full SQL text, secrets, exact personal location, or unrestricted IP data.
- Do not add employee scoring, surveillance-style rankings, or manager access outside assigned scope.

