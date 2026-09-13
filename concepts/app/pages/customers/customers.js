// Customers page — CONFIGURATION ONLY for Task 5. Full customer page
// extraction (record rendering, validation, lookup pickers, etc. — still in
// concepts/app/legacy-app.js) is Task 7, per the plan; this file exists
// early only because the task-5 brief's empty-filter test needs
// `customerConfig`, "the existing customer entry in DATA_LIST_CONFIG,
// exported from pages/customers/customers.js as configuration only during
// this task."

import {DATA_LIST_CONFIG} from '../../components/data-list/columns.js'

export const customerConfig = DATA_LIST_CONFIG.customer
