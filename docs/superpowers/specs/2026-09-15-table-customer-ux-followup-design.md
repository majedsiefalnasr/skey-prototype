# Table and Customer UX Follow-up — Design Spec

## Purpose

Apply the agreed follow-up refinements to the ERP prototype's table pages, Customer record, Geography list, and customer-avatar interaction while preserving the current shell, routes, inactive views, and existing uncommitted work.

## Scope

### Shared table behavior

- Keep Print list, Chart, and Kanban implementations in source, but hide their table-view choices from the UI.
- Keep the Group by trigger unchanged. Remove decorative icons only from its dropdown entries.
- Correct the Filter dropdown's control sizing, alignment, labels, focus treatment, and spacing using the current form/menu primitives.
- Show at most five saved custom filters in the quick-filter menu. When more exist, add a final `More filters…` parent item that opens an inline nested menu containing the remaining saved filters. Do not add a dialog, search, persistence, or filter-management workflow.

### Customer record

- Move the customer photo/select-photo field to the final position in the identity/classification flow.
- Make Scroll Navigator the one Customer record layout. Remove the customer-layout prototype control and the inactive tabbed/focused/compact layout switch paths only where doing so does not affect current user work.
- Apply the invoice record's repaired footer convention: footer navigation and actions resolve within the active customer record root, so customer footer clicks cannot be captured by another cached page.

### Geography and Customers lists

- Bring the Geography list header into parity with the standard list-page header structure and visual hierarchy.
- Normalize customer-row avatar dimensions in the table.
- Normalize the avatar hover/click customer-summary popover: image dimensions, anchored-panel surface, padding, type hierarchy, and keyboard-accessible trigger behavior follow existing popover conventions.

## UX decisions

The inline nested menu is the saved-filter overflow pattern. Five filters are a deliberate scan-friendly maximum; `More filters…` preserves direct selection while keeping the primary menu compact. A dialog is not warranted because the request is selection, not searching or managing filters.

Scroll Navigator becomes the Customer record's default because it retains all form sections in one continuous document, supports predictable deep-link-style navigation, and avoids the hidden-content cost of the tabbed customer layout.

## Constraints

- Do not delete hidden table view implementations; they may return in a future theme.
- Preserve existing APIs, keyboard behavior, RTL, reduced-motion behavior, and the app shell.
- Do not overwrite or stage unrelated modifications already present in the worktree.
- Do not invent a backend, persistence, or real filter management.

## Verification

1. Each table menu exposes only its supported visible view choices, while hidden-view code remains present.
2. Group-by menu entries contain no icons; its trigger still does.
3. Filter inputs are visually consistent and usable by keyboard; six or more custom filters show five plus the nested overflow menu.
4. Customer record always renders Scroll Navigator, with photo last in identity content and a customer-scoped working footer.
5. Geography header matches standard list-header geometry.
6. Customer avatar and summary popover are consistent at desktop and narrow widths, including hover, click, and keyboard access.
7. Existing focused lifecycle/unit/browser checks and relevant visual scenarios pass without new console errors.
