# ERP Record-Shell Patterns — Market Notes (feeding concepts v3)

How the leading ERPs/business platforms structure the "document record" app shell. Focus: where actions live, how status is shown, how record navigation works, and how the shell stays **application-wide and configurable** (per screen, per role).

## SAP Fiori (S/4HANA) — Object Page floorplan
- **Dynamic header**: title + key facts + status; header toolbar holds *display-mode* actions.
- **Footer bar**: workflow/finalizing actions (**Save, Post, Cancel**) appear in a footer bar in edit/create mode — never in the header. "Save and Next" exists for mass-editing flows.
- Takeaway: separation of *reading* actions (top) from *committing* actions (bottom, only when relevant). Maps perfectly to our dirty-state model.

## Odoo — Form view control panel
- **Breadcrumb is navigation history**, not hierarchy; clicking walks back through views.
- **Pager top-right: "1/125" with ‹ ›** on every form opened from a list — the industry's most familiar record navigator.
- **Status bar with clickable stages** in the form header (Draft → Posted → Paid...); buttons on the left of the same header row mutate state.
- Takeaway: stages as a first-class visible strip in the shell header; pager stays top-right.

## Microsoft Dynamics 365 — Command bar
- Single flat **command bar atop the form**; labeled icon+text commands; overflow "⋯".
- **Conditional visibility rules** show/hide commands by record status, attributes, and security role — commands are declaratively registered, not hardcoded per screen.
- Takeaway: this is the strongest precedent for the requirement that our shell is **one app-wide framework** where screens/roles inject/remove actions. Model actions as a registry: `{id, label, icon, shortcut, enabledWhen(status,dirty), visibleForRoles, placement}`.

## Atlassian (user's base shell) + modern SaaS patterns
- Global top bar: centered search with **⌘K**, **Create split-button** whose menu is context-aware, notification/help/settings cluster.
- Split primary button (Update ▾) for variants of the main action; overflow "⋯" menus show keyboard shortcuts inline.
- **Command palette** for power users: context section ("current: Sales Invoice #… · Posted"), commands with shortcuts, and — per our uploaded mock — *disabled commands stay listed with the reason* ("Can't edit a posted invoice"), which teaches the state machine instead of hiding it.

## Lifecycle component (from the uploaded mock)
5-stage invoice lifecycle: **Draft → Approved → Posted → Paid → Locked**.
- Collapsed: pill "Posted · 3 of 5" + segmented progress.
- Expanded popover: vertical timeline; each done stage shows *who, when, duration*; current stage highlighted with its artifact (journal #4521); future stages show what's pending ("awaiting payment 2,000.00 · owner: Accounts", "auto after February period close"). Link to full stage history.
- This replaces the old ribbon entirely and fixes the audit's "invisible draft status" (P1-3) and "status as heading" (P2-4) findings.

## Design implications adopted in v3
1. **Action registry, not per-screen toolbars**: every action declares label/shortcut/status-rule/role-rule; the shell renders it into whichever region the concept defines. Role or status change reshapes the shell without redesign.
2. **Status-gated actions are disabled-with-reason in menus/palette** (discoverable), and hidden only in high-value surface slots (contextual buttons).
3. **Create (global) becomes context-aware**: suggests "Sales Invoice" on this screen and offers "from current invoice" generations (Receipt Voucher / Sales Return) plus other entities.
4. **⌘K palette** is shared shell infrastructure: same registry powers it.
5. Concepts A–D reinterpret regions (header/footer/command-bar/stage-strip) while all consuming the same registry — proving app-wide reuse.

Sources:
- [SAP Fiori — Object Page footer bar](https://www.sap.com/design-system/fiori-design-web/v1-96/discover/frameworks/sap-fiori-elements/object-page/object-page-footer-bar-sap-fiori-elements)
- [SAP Fiori — Action placement](https://www.sap.com/design-system/fiori-design-web/v1-145/foundations/best-practices/global-patterns/action-placement)
- [SAP — Displaying actions on the Object Page](https://help.sap.com/docs/ABAP_PLATFORM_NEW/468a97775123488ab3345a0c48cadd8f/f65e8b196335457cbfc891418ec25cfd.html)
- [Odoo — navigation overview (breadcrumb/pager)](https://hibou.io/docs/odoo-essentials-10/odoo-navigation-overview-285)
- [Odoo — pager behavior issue thread](https://github.com/odoo/odoo/issues/74126)
- [Microsoft — model-driven apps UI/UX components (command bar)](https://learn.microsoft.com/en-us/dynamics365/guidance/develop/ui-ux-component-details-model-driven-apps)
- [Dynamics 365 — command bar designer / conditional visibility](https://d365goddess.com/command-bar-designer-preview/)
