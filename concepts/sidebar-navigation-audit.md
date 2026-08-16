# Skey ERP — Sidebar Navigation Audit

Read live from `app.skeyerp.com` (tenant `lastchance`, English UI, admin account), 2026-08-06, by expanding every group in the left sidebar's DOM (`ul#sidebar-menu`) rather than sampling the UI — this is the full tree, not a guess. **No invented labels or groups.** Labels are copied verbatim, including the product's own typos, since this is the source of truth for the sidebar-concept mockups that come next.

## Scope

The left sidebar only — the piece every earlier concept file marked "out of scope". Two things sit outside the sidebar and are noted but not modeled here:

- **Global quick-access icons** (top of sidebar, above search): Inbox (`/hlp/email`), Calendar (`/hlp/calendar`), Schedule Activity (`/hlp/scheduleactivity`), and an "Add to Favorites" star for the current screen.
- **Tenant switcher**: the "lastchance" heading at the top of the sidebar is a link back to `/dashboard`, not part of the menu tree.

## Shape of the thing

- **20 top-level rows**, 2 of which are plain-text section dividers (`Enterprise Resource Planning`, `Others`) — not clickable, not counted as groups.
- **18 real top-level entries**: Dashboard + 16 module groups + Favorite Screens + Recent Screens (Favorite/Recent are dynamic, populated from the user's own activity — the two children shown for Favorite Screens and three for Recent Screens below are this account's current data, not fixed menu items).
- **397 `<li>` nodes total** in the tree — this is a large, deep menu, not a short list.
- **Depth is inconsistent by design**, not by mistake:
  - Some groups are flat — Vendors and Purchase Systems Management go straight from group to screen (2 levels: `Group → Screen`).
  - Most go 3 levels deep (`Group → Subgroup → Screen`) — e.g. everything under Customer Relations Management.
  - A few reach 4 levels — Inventory Systems Management → Compound Items → Reports → *Reports - Assembly orders*; Reports and System Setup nest one subgroup-of-screens inside category after category.
- **Dashboard itself is a group**, not just a link: it carries its own children, Key Performance Indicators and Favorite KPIs, exactly like a module group does.
- **Duplicate labels inside one group**: System Setup has two different subgroups both containing a screen called "General Parameters" (`Setup of Manufacturing Resource Planning` and `General Configuration`) — same label, two different destinations. Worth flagging for whatever wording pass follows.
- **Verbatim product typos** kept as-is (do not silently fix in mockups without calling it out): "Fixed **Assests** System", "Asset **locatioons**", "**Apointment** Type", "Customer Relationship Management **devenitions**", "**Reports - Assembly orders**" nested one level deeper than its siblings for no apparent reason.

## Full tree

```
Dashboard
  Key Performance Indicators
  Favorite KPIs
Enterprise Resource Planning          (section divider, not a link)
Customers
  Drivers Data
  Customers
  Sales Representatives
  Collectors
  Marketers
  Sub Customers
Vendors
  Vendors
  Pur. Representatives
Inventory Systems Management
  Item Details
  Opening Stock
  Inv. Incoming
  Inv. Outgoing
  Stock Transfer Order
  Receiving Stock Transfer
  Return Stock Transfer
  Items Movement
  Show Items
  Compound Items
    Components of the compound item
    Assembly orders
    Disassembly orders
    Reports
      Reports - Assembly orders
  Stocktaking System
    Stocktaking Auto
    Stocktaking
    Reports - Stocktaking
Sales Systems Management
  Quotations
  Sales Order
  Sales Invoice
  Sales Return
  Bill Outgoing Order
  Item pricing
  Return Incoming Order
  Online Store
    Store data
    Store Items
    Order synchronization
    Order management
    Store item movement
  Customer loyalty
    Loyalty points system
      Points Programs
      Point Movement
Purchase Systems Management
  Purchase Order
  Purchase Invoice
  Purchase Return
POS System Management
  Point of Sale
  POS Invoice
  POS Return
  Cash Receipt Pos
  Cash Payment Pos
  Cash payment for returns
  POS Sales Clearance
  restaurants operations
    follow delivery orders
    chef display
    waiter display
    customer display
  Document Sync
    Issue Documents
    Sync Logs
Finance and Accounting
  Chart of account and subleders
    Chart of Accounts
    Cost Centers
    Sub Ledger2
    Sub Ledger 3
    Opening Balances
    Financial Statement Report Designer
    Accounts Movement
    Financial statistics
  Entires and Vouchers
    Debit Notes
    Credit Notes
    Journal Entry
    Receipt Voucher
    Payment Voucher
    Cash Count
    Posting Docs
    Unposting Docs
  Cash and banks
    Cash Data
    Banks Data
    Credit Card Types
    Cheques Portfolio
    Cheques Signature
    Cheques Cancelation
  Cheques Management
    Cheques Receivable Management
    Cheques Payable Management
    Queries
Fixed Assests System
  Assets Groups
  Asset locatioons
  Asset data
  Assets Increas
  Asset Disposal
  Asset Depreciation
Manufacturing Resource Planning
  Dashbord Production Management
  Setup of Production System
    Definition of Production Shop Floor
    Definition of OverHead Cost Articles
    Definition of Work Centers
    Creation of Bill Of Materials and Connecting to Production Stages
  Production Management
    Issue Work Orders
    Actual operating data
    Adoption of production processes
  Queries
    Monitoring production orders
Customer Relations Management
  CRM Dashboard
  My Workspace
    My Day
    My Goals
    Notification Builder
  Sales & Marketing
    Leads
    Campaigns
    Deals
    Activities
    Goals Management
  Approvals
    Deal Approvals
  Customer Relations Management Settings
    Sales Pipeline
    Customer Relationship Management parameters
    Customer Relationship Management devenitions
Hospital Management
  Configuration
    Departments
    Specialization
    Service Define
    Doctors
    Insurance Company
    Patient Group
  Reception
    Patients
    Invoice Medical Services
    Reports - Patients
  Appointments
    Apointment Type
    Monthly scheduling
    Appointments
  CLinic
    Waiting list
    Consultation
    Vital Signs
  Reports
    Reports - Key Performance Indicators
    Reports - Departments
    Reports - Specialization
    Reports - Service Define
    Reports - Patients
    Reports - Doctors
    Reports - appointment schedule
    Reports - Appointments
    Reports - Invoice Medical Services
Reports
  Accounting and financial reports
    Reports - Account Statement
    Reports - General Journal
    Reports - Trial Balance
    Reports - Balance Sheet
    Reports - Income Statement
    Reports - Posted and Unposted Docs
    Reports - Cash Data
    Reports - Opening Balances
    Reports - DR/CR Notes
    Reports - Journal Entry
    Reports - Receipt Voucher
    Reports - Payment Voucher
    Reports - Cash Count
    Dynamic Reports
    Reports - Chart of Accounts
    Reports - Cost Centers
    Reports - Sub Ledger2
    Reports - Sub Ledger 3
    Reports - Employees Data
  Cheque reports
    Reports - Banks Data
    Reports - Cheques Portfolio
    Reports - Cheques Management
  Vendors accounts reports
    Reports - Pur. Representatives
    Reports - Vendors
  Customers accounts reports
    Reports - Sales Representatives
    Reports - Collectors
    Reports - Marketers
    Reports - Customers
    Reports - Sub Customers
    Reports - Debts Age
    Reports - Customer Indebtedness
  Inventory reports
    Reports - Warehouses Data
    Reports - Item Details
    Reports - Opening Stock
    Reports - Inventory movement
    Reports - Inv. Incoming
    Reports - Turnover rate
    Reports - Inv. Outgoing
    Reports - Stock Transfer Order
    Reports - Receiving Stock Transfer
    Reports - Return Stock Transfer
  Purchase reports
    Reports - Purchase Order
    Reports - Purchase Invoice
    Reports - Purchase Return
    Reports - Net Purchase
  Sales reports
    Reports - Item pricing
    Reports - Quotations
    Reports - Sales Order
    Reports - Sales Invoice
    Reports - Sales Return
    Reports - Net Sales
    Reports - Profit Margin
    Reports - Bill Outgoing Order
    Reports - Return Incoming Order
  POS reports
    Reports - Point of Sale
  Fixed assests reports
    Reports - Assets Groups
    Reports - Asset locatioons
    Reports - Asset data
    Reports - Asset opening balances
    Reports - Asset movements
  Industrial Facilities Management Reports
    Reports - Production Halls
    Reports - Definition of OverHead Cost Articles
    Reports - Operations centers
    Reports - Product Tree
    Reports - Standard Cost
    Reports - Production Order
    Reports - Actual operating data
    Reports - Production quantities
    Reports - Production Cost
    Reports - Raw Materials Consumption
    Reports - Indirect Expenses Cost
System Administration
  Privileges Management
    Users Groups
    Users Data
    Transactions Privileges
    Screens Privilges
    Inputs Privilges
    Show Privileges
    Monitoring
    Dynamic Reports
  Reports Management
    Reports Styles
    Reports Data
    Reports Dictionary
    Signatures Setup
    Reports Signatures
    Printing Forms
  Closings and Deactivation
    Deactivating Periods
    Periods Closing
    Unclosing Periods
  Settings and Control
    System Documents Types
    System Screens
    System Dictionary
    Types of Sequence docs
    Transactions Sequences
    System Alerts
    Default data for Transactions
  System Upgrade
    Backup
System Setup
  Setup of Manufacturing Resource Planning
    General Parameters
    Definition of shifts
    Definition of production classifications
  General Configuration
    General Parameters
    Fiscal Periods
    Currencies
    General Definitions
    Types of Transaction Docs
    Organizational Structure
    Defining Subledgers
    Online gateway
    Payment Methods
  Master Data
    Geographical Structure
    Financial Units
    Employees Data
    Devices Data
    Guarantors
    Committee Members
    News
    Email and Messages Settings
    Email Templates
  Accounts and finance settings
    Account Management Parameters
    General Definitions of Acc Manag.
  Inventory Settings
    Inventory Management Parameters
    Inv. Manag. General Definitions
    Units of Measurement
    Warehouses Group
    Warehouses Data
    Item Groups
    General Items Definitions
    Inventory Accounts
    Barcode generation
    Barcode of weights
    Inventory Expenses
    Electronic scales
  Purchase settings
    Purchase Management Parameters
    General Definitions - Purchase Mgmt.
    Purchase Expenses
    Vendor Price List
  Sales settings
    Sales Management Parameters
    General Definitions - Sales Mgmt.
    Sales Charges
    Sales Outlets
    Pricing Levels
  Tax Configuration
    Tax Slices
    Tax Definition
    Tax Rates
    Category of Taxes
    Types of Taxes
    Electronic Conn. settings
    Electronic document synchronization
    Tax Transactions
    Tax Declaration
  Points of Sale Setting
    POS Management Parameters
    Pos Item Categories
    Types of payment and receipt accounts
    Report Designer
    Sales Outlets
    Points of Sale Setting
  Restaurant Settings
    Order types
    Halls
    Delivery Zone
    Printers
    Preparation Stations
    Modifires groups
    Item notes / cancel reasons
    Restaurant Staff
  Queries
    Contact Details
    Countries
    Dynamic Reports
  Asset System Settings
    General Variables for Asset System
    General Coding for Asset System
  Document approval settings
    Approval policy
    Doc Approval Define
    Approval of device registration requests
Help Screens
  Internal Mail
  Calendar
  Schedule Activity
  Notes
  People Data
  Smart Query Engine
  AI Dashboard
  Sales Forecast
Others                                (section divider, not a link)
Favorite Screens                      (dynamic — this account's favorites)
  Sales Invoice
  Purchase Invoice
  Internal Mail
Recent Screens                        (dynamic — this account's history)
  Sales Invoice
  Sales Charges
  Order types
  Sales Order
  Warehouses Group
  Inv. Incoming
  Modifires groups
  Point of Sale
  Preparation Stations
  Printers
```

## What this means for the sidebar concepts

- A flat accordion (one level of collapse) covers barely half the tree — Finance and Accounting, Reports, System Setup and Hospital Management all need **two** levels of disclosure before reaching a screen, and Inventory reaches a third in one branch.
- Whatever concepts get built need to handle 16 module groups of wildly different sizes without the small ones (Vendors: 2 screens) looking lost next to the large ones (System Setup: 77 screens across 13 subgroups).
- Search matters more than usual here — with 397 nodes, browsing alone is not a realistic primary path for most users.
- Favorite Screens and Recent Screens are per-user and change constantly; any concept has to treat them as live data, not fixed menu content.
