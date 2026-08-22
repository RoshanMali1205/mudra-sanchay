# Mudra Sanchay

## Detailed Development Plan, Low-Level Design and User Stories

**Product:** Mobile-first transport income, expense and farmer account management system  
**Business:** Radhe Krishna Transport by Dnyaneshwar Jejurkar  
**Route example:** Ugaon village to Pimpalgaon Baswant Market  
**Target stack:** React, Node.js, Supabase and Netlify  
**Languages:** English, Hindi and Marathi  
**Document version:** 1.0 - 22 August 2026

---

## 1. Executive Summary

Mudra Sanchay is a mobile-first application for a pickup-truck operator who transports tomato crates from farmers in and around Ugaon to Pimpalgaon Baswant market. The system records each farmer's date-wise and trip-wise crate quantity, calculates freight automatically, stores market receipts, tracks whether the farmer has paid, records vehicle and operating expenses, and produces farmer statements and business reports.

The application should replace notebooks, calculator-based totals, loose receipt photos and informal payment tracking with one secure, multilingual system. The first release should be fast enough to use beside the vehicle, work well on low-cost Android phones, and keep data entry short: select date and trip, select farmer, enter crates and save.

### Primary business outcomes

- Know how much freight is earned per day, week, month, quarter, half-year and year.
- Know each farmer's crate history, total charges, payments, balance and attached market receipts.
- Know total operating expenses and net profit for any selected period.
- Avoid missed or duplicated payment entries.
- Generate printable PDF and Excel statements and share a farmer statement through WhatsApp.
- Operate the product in English, Hindi or Marathi.
- Maintain a reliable audit trail for corrections and deletions.

### Recommended release strategy

Build a practical MVP first: authentication, farmers, trips, crate entries, payments, expenses, dashboard and PDF statement. Add OCR, automated WhatsApp delivery and advanced analytics after the accounting workflow is stable.

---

## 2. Scope and Assumptions

### 2.1 In scope

- Admin registration, login, password reset and profile management.
- Farmer master records with contact, village and status.
- Daily Trip 1, Trip 2, and optional additional trips.
- Farmer crate entries per trip with configurable per-crate freight rate.
- Automatic freight calculation, totals and balance calculation.
- Farmer payments: full, partial, advance and adjustment.
- Pickup expenses: diesel/oil, puncture, repair, vehicle part replacement, helper salary and other.
- Market receipt image/PDF upload and farmer association.
- Receipt payment-status tracking.
- Dashboard and period-based reports.
- PDF/Excel export, print view and WhatsApp share workflow.
- English, Hindi and Marathi UI.
- Responsive mobile, tablet and desktop UI.
- Audit log, soft deletion and backup-friendly data model.

### 2.2 Out of scope for MVP

- Farmer self-service login.
- Direct bank or UPI integration.
- Automated bookkeeping/tax filing.
- Guaranteed OCR extraction from handwritten receipts.
- GPS tracking of the pickup.
- Automatic WhatsApp Business API messages.
- Multi-company billing.

### 2.3 Key assumptions

- One business can own one or more vehicles, but MVP may begin with one pickup.
- The default freight rate is INR 25 per crate, but rates can change by farmer, date, route or trip.
- A trip can contain many farmer entries; one farmer can have entries across many trips.
- A farmer may pay partially and multiple payments can settle multiple charges.
- A receipt may represent one farmer and trip in MVP; a later version can split one receipt among farmers.
- Money is stored in paise as an integer to avoid floating-point errors.
- Dates shown to the operator use Asia/Kolkata business time.
- Deleted financial records are soft-deleted and remain visible in the audit history.

### 2.4 Product naming note

The recommended spelling is **Mudra Sanchay** (money collection/savings). The print brand remains **Radhe Krishna Transport by Dnyaneshwar Jejurkar**. Confirm the preferred Marathi spelling before production branding.

---

## 3. Users, Roles and Permissions

### 3.1 Admin / Owner

The owner manages all farmers, trips, crate entries, payments, expenses, receipts, users, settings, rates and reports. The owner can correct records, restore archived records and view the audit history.

### 3.2 Operator / Data Entry (recommended after MVP)

An operator can create and edit current-day trips, crate entries, receipts and expenses, but cannot change business settings, delete settled transactions or manage users.

### 3.3 Viewer / Accountant (future)

A viewer can open dashboards, farmer ledgers and reports but cannot modify financial data.

### Permission matrix

| Capability | Admin | Operator | Viewer |
|---|---:|---:|---:|
| Manage farmers | Yes | Create/view | View |
| Create trips and entries | Yes | Yes | View |
| Edit old/settled entries | Yes | No | No |
| Record payments | Yes | Yes | View |
| Record expenses | Yes | Yes | View |
| Delete/restore | Yes | No | No |
| Export/share reports | Yes | Yes | Yes |
| Manage rates/settings/users | Yes | No | No |
| View audit trail | Yes | No | No |

---

## 4. Core Business Rules

### 4.1 Freight calculation

For each farmer trip entry:

`freight amount = crate quantity x rate per crate`

Example: 50 crates x INR 25 = INR 1,250.

The calculated amount is stored as a snapshot. If the default rate later changes, historical entries keep the original rate and amount.

### 4.2 Rate priority

Use the first matching rate in this order:

1. Manually entered rate for the crate entry.
2. Farmer-specific active rate.
3. Route-specific active rate.
4. Business default rate.

The UI must show the applied rate before saving.

### 4.3 Trip numbering

- Trip number is unique for a business, date and vehicle.
- The UI suggests Trip 1, then Trip 2.
- Additional trips remain allowed instead of hard-coding a limit of two.
- A completed trip can be reopened only by an admin, with a reason recorded.

### 4.4 Farmer balance

`opening balance + freight charges + debit adjustments - payments - credit adjustments = closing balance`

An advance payment creates a negative/credit balance and is consumed by future charges.

### 4.5 Expense and profit

- Gross income is freight charged during the selected period.
- Cash received is payments received during the selected period.
- Expenses are approved operating expenses during the selected period.
- Accrual profit = gross income - expenses.
- Cash surplus = cash received - expenses paid.

Both figures should be displayed because they answer different business questions.

### 4.6 Receipt status

Recommended receipt lifecycle:

`Uploaded -> Linked -> Awaiting Payment -> Partially Paid -> Paid`

Other states are `Needs Review`, `Rejected` and `Archived`. Payment status should not be inferred only from image upload.

### 4.7 Corrections

- Entries can be edited while a trip is Draft.
- Editing a Completed trip requires admin authority and a reason.
- Settled charges cannot be silently changed. The system creates an adjustment or records an audit event.
- Hard deletion of financial data is prohibited from the normal UI.

---

## 5. Functional Modules

### 5.1 Authentication and onboarding

- Register the initial admin using email or mobile-linked email.
- Verify email, set password and recover password.
- Create business profile, owner name, address, phone, default language, currency and timezone.
- Add first vehicle and default route.
- Set default rate per crate.
- Prevent open public registration after the first owner is created; additional users must be invited.

### 5.2 Dashboard

The mobile dashboard shows:

- Today's crates, trips, freight, received amount, expenses and net cash.
- Outstanding farmer balance.
- Unpaid or unlinked receipts.
- Quick actions: New Trip, Add Crates, Add Payment, Add Expense, Upload Receipt.
- Recent activity and alerts.

Desktop adds trend charts, category breakdown, farmer balance table and date-range comparison.

### 5.3 Farmer management

- Add name, mobile, alternate mobile, village, address, preferred language and notes.
- Generate a human-friendly farmer code.
- Search by name, phone, village or code.
- Archive inactive farmers without losing history.
- Farmer profile tabs: Summary, Crates, Payments, Receipts, Statement and Notes.

### 5.4 Trip and crate entry

- Select date, vehicle, route, trip number, departure/arrival notes and status.
- Add multiple farmer rows.
- Each row contains farmer, crate count, applied rate, calculated freight and note.
- Support quick repeat from previous trip and recent-farmer suggestions.
- Prevent duplicate farmer rows in the same trip unless explicitly confirmed.
- Show running totals for crates and freight.
- Save Draft, Complete Trip or Cancel Trip.

### 5.5 Payment collection

- Record farmer, date/time, amount, payment mode, reference and note.
- Payment modes: cash, UPI, bank transfer, cheque and adjustment.
- Allocate a payment automatically to oldest unpaid charges or manually select charges.
- Issue a payment receipt/acknowledgement.
- Display partial payment and balance accurately.

### 5.6 Expense management

- Categories: diesel, engine oil, puncture, repair, spare part/vehicle change, helper salary, toll/parking, food/allowance and other.
- Record amount, date, vehicle, trip (optional), vendor, payment mode and note.
- Upload supporting bill.
- Support recurring helper salary without duplicating transactions automatically in MVP.
- Admin can manage categories.

### 5.7 Market receipt management

- Capture from camera or choose gallery/PDF.
- Compress large mobile images before upload while retaining readable quality.
- Store farmer, trip, market, receipt number, receipt date, gross sale value, deductions, net payable, due date and status.
- Provide a manual form next to the image.
- OCR in Phase 2 proposes values; the user must review and confirm them.
- Maintain original file and optional optimized preview.

### 5.8 Reports

- Daily trip sheet.
- Farmer statement/ledger.
- Crate summary by farmer and date.
- Freight income report.
- Payment received and outstanding report.
- Expense report by category and vehicle.
- Profit and cash-flow summary.
- Receipt pending/payment status report.
- Year summary for 2026 and any selected year.

Filters include today, week, month, custom range, 3 months, 6 months, year, farmer, vehicle, route, trip and status.

### 5.9 Settings

- Business and print header.
- Vehicles, routes and markets.
- Default and farmer-specific rates.
- Expense categories.
- User and role management.
- Language, date format, PDF language and number format.
- Financial year/calendar year preference.

---

## 6. UI/UX Low-Level Design

### 6.1 Mobile-first navigation

Use a bottom navigation with five destinations:

1. Home
2. Trips
3. Farmers
4. Reports
5. More

A prominent floating action opens a quick-entry sheet for crates, payment, expense and receipt. On desktop, the same destinations move into a collapsible left sidebar, with the current page title and date/filter controls in the top bar.

### 6.2 Suggested React routes

```text
/auth/login
/auth/register
/auth/forgot-password
/onboarding
/dashboard
/trips
/trips/new
/trips/:tripId
/farmers
/farmers/new
/farmers/:farmerId
/farmers/:farmerId/statement
/payments/new
/expenses
/expenses/new
/receipts
/receipts/new
/reports
/settings/*
```

### 6.3 Key screen details

#### Login

Business logo/name, email, password, language selector, show-password control, forgot-password link and accessible error messages. Keep the form simple; glass styling must not reduce contrast.

#### New Trip

Sticky trip header at the top, farmer rows in cards on mobile, table on desktop, running totals, draft autosave indicator and a sticky Complete Trip action. Use numeric keyboard for crate count and rate.

#### Farmer account

Top summary: outstanding balance, total crates, freight, paid and last activity. Below it, use tabs and a timeline/ledger. Provide Statement, Print and WhatsApp actions.

#### Expense entry

Large category buttons, amount, date, optional trip/vehicle, note and bill capture. Remember the last selected vehicle.

#### Receipt review

Image preview above/manual fields below on mobile; split view on desktop. Add zoom/rotate and Needs Review status.

### 6.4 Design system

Use CSS variables/design tokens rather than page-specific colors.

```css
:root {
  --color-primary: #0f766e;
  --color-primary-strong: #115e59;
  --color-accent: #f59e0b;
  --color-income: #15803d;
  --color-expense: #dc2626;
  --color-surface: #ffffff;
  --color-bg: #f4f7f7;
  --color-text: #17212b;
  --color-muted: #64748b;
  --radius-card: 18px;
  --shadow-card: 0 10px 30px rgba(15, 118, 110, 0.10);
}
```

Recommended visual style: soft green/teal gradients suggesting trust and agriculture, amber accent for important actions, subtle glass panels for summary cards and drawers, strong opaque surfaces behind forms and tables. Avoid applying blur to every card; glassmorphism should be decorative, not the foundation of readability.

### 6.5 Responsive breakpoints

- 0-599 px: single-column mobile, bottom navigation, full-width drawers.
- 600-1023 px: tablet, two-column summaries, wider modal sheets.
- 1024 px and above: sidebar, multi-column dashboard and data tables.

### 6.6 Accessibility and rural-use considerations

- Minimum 44 x 44 px touch targets.
- Body text at least 16 px on mobile.
- WCAG AA contrast.
- Do not communicate income/expense only by green/red color; include labels and icons.
- Support keyboard navigation and visible focus states.
- Add Marathi/Hindi font fallback using Noto Sans Devanagari.
- Use short labels, clear confirmations and undo where possible.
- Optimize for intermittent connectivity and avoid large initial bundles.
- Warn before leaving unsaved entry; preserve draft locally.

### 6.7 Frontend component plan

```text
AppShell
|- MobileBottomNav / DesktopSidebar
|- PageHeader
|- LanguageSwitcher
|- QuickEntrySheet

TripEditor
|- TripHeaderForm
|- FarmerEntryList
|  |- FarmerEntryCard (mobile)
|  `- FarmerEntryRow (desktop)
|- TripTotals
`- TripActions

FarmerProfile
|- FarmerSummaryCards
|- LedgerFilter
|- LedgerTimeline/Table
`- ExportShareActions
```

Shared components: Money, DateRangePicker, FarmerPicker, VehiclePicker, StatusChip, EmptyState, ConfirmDialog, CameraUpload, DataTable, MetricCard, Skeleton and ErrorBoundary.

### 6.8 Frontend technology

- React with TypeScript and Vite.
- React Router.
- TanStack Query for server state, caching and mutations.
- React Hook Form with Zod validation.
- i18next/react-i18next for translations.
- Zustand only for small UI/session preferences; do not duplicate server state.
- Recharts for dashboard charts.
- jsPDF/pdfmake or server-side PDF rendering for controlled statements.
- ExcelJS for Excel exports, preferably generated by the API for consistent permissions.
- Vitest and React Testing Library; Playwright for critical end-to-end flows.

---

## 7. System Architecture

### 7.1 Recommended architecture

```text
React PWA on Netlify
        |
        | HTTPS + access token
        v
Node.js API as Netlify Functions
        |
        +---- Supabase Auth
        +---- PostgreSQL database
        +---- Supabase Storage
        `---- Scheduled/background jobs (later)
```

The browser authenticates with Supabase Auth. Business operations go through the Node.js API so complex validation, audit logic, exports and multi-table transactions stay centralized. The browser may use Supabase directly only for safe auth operations and signed upload flows. The service-role key must never be shipped to React.

### 7.2 Suggested repository structure

```text
mudra-sanchay/
|- apps/
|  |- web/                  # React + Vite
|  `- api/                  # Netlify functions / Node API
|- packages/
|  |- shared/               # types, Zod schemas, constants
|  |- ui/                   # reusable UI components/tokens
|  `- i18n/                 # translation resources
|- supabase/
|  |- migrations/
|  |- seed.sql
|  `- policies.sql
|- netlify/
|  `- functions/
|- docs/
|- netlify.toml
`- package.json
```

Use a workspace tool such as pnpm workspaces. A monorepo keeps DTOs and validation schemas synchronized without copying code.

### 7.3 API layering

```text
HTTP handler -> authentication -> request validation -> service -> repository -> Supabase/Postgres
                                               |
                                               `-> audit event / export / storage
```

- Handler: HTTP status, headers and request/response mapping.
- Middleware: authentication, business membership, role and rate limiting.
- Service: business rules and transaction boundaries.
- Repository: database queries only.
- Schema: Zod input/output contracts.
- Audit: actor, action, entity, before/after and request metadata.

### 7.4 Offline strategy

MVP should cache the app shell and reference data, but financial writes should require a confirmed server response. Phase 2 can add an IndexedDB outbox with client-generated idempotency keys. The UI must clearly distinguish `Saved`, `Pending sync` and `Sync failed`; it must never show an offline write as finalized when it is not.

---

## 8. Supabase Database Low-Level Design

All business tables include `id uuid primary key`, `business_id uuid`, `created_at timestamptz`, `created_by uuid`, `updated_at timestamptz`, `updated_by uuid` and optional `deleted_at timestamptz` where applicable.

### 8.1 Identity and configuration

#### businesses

- name, print_name, owner_name, phone, email
- address, default_language, timezone, currency
- default_rate_paise, financial_year_start_month

#### profiles

- id references auth.users
- full_name, phone, preferred_language, status

#### business_members

- business_id, user_id, role, status, invited_at, joined_at
- unique(business_id, user_id)

#### vehicles

- registration_number, display_name, vehicle_type, active
- unique(business_id, registration_number)

#### routes

- origin_name, destination_name, default_rate_paise, active

#### markets

- name, location, contact, active

### 8.2 Farmer and freight accounting

#### farmers

- farmer_code, full_name, mobile, alternate_mobile
- village, address, preferred_language, opening_balance_paise
- active, notes
- unique(business_id, farmer_code)

#### freight_rates

- farmer_id nullable, route_id nullable
- rate_paise, effective_from, effective_to, active
- check(rate_paise >= 0)

#### trips

- trip_date date, trip_number smallint, vehicle_id, route_id
- market_id nullable, status (draft/completed/cancelled)
- departure_at, arrival_at, notes, completed_at
- unique(business_id, trip_date, vehicle_id, trip_number)

#### crate_entries

- trip_id, farmer_id, crate_count integer
- rate_paise integer, freight_amount_paise integer
- rate_source, notes, version integer
- check(crate_count > 0)
- check(freight_amount_paise = crate_count * rate_paise)
- unique(trip_id, farmer_id) for MVP

### 8.3 Payments and ledger

#### payments

- farmer_id, payment_date, amount_paise
- mode, reference_number, notes, status
- idempotency_key
- check(amount_paise > 0)

#### payment_allocations

- payment_id, crate_entry_id nullable, adjustment_id nullable
- allocated_amount_paise
- unique(payment_id, crate_entry_id)

#### adjustments

- farmer_id, adjustment_date, direction (debit/credit)
- amount_paise, reason, approved_by

A database view `farmer_ledger_view` should union freight charges, payments and adjustments into a chronological ledger. A materialized summary can be added only if scale requires it.

### 8.4 Expenses

#### expense_categories

- code, name_key, active, sort_order

#### expenses

- expense_date, category_id, vehicle_id nullable, trip_id nullable
- amount_paise, vendor_name, payment_mode, reference_number
- notes, attachment_path nullable, status
- check(amount_paise > 0)

### 8.5 Market receipts

#### market_receipts

- farmer_id, trip_id nullable, market_id nullable
- receipt_number, receipt_date, due_date
- gross_amount_paise, deduction_amount_paise, net_amount_paise
- paid_amount_paise, payment_status, review_status
- original_storage_path, preview_storage_path, mime_type, file_size
- ocr_payload jsonb nullable, ocr_confidence numeric nullable
- notes

#### receipt_payment_events

- receipt_id, event_date, amount_paise, mode, reference_number, notes

### 8.6 Audit and export

#### audit_logs

- actor_user_id, action, entity_type, entity_id
- before_data jsonb, after_data jsonb
- request_id, ip_hash, created_at

#### export_jobs (optional for large reports)

- requested_by, report_type, filters jsonb, format
- status, storage_path, expires_at, error_message

### 8.7 Important indexes

- farmers(business_id, active, full_name)
- trips(business_id, trip_date desc)
- crate_entries(farmer_id, trip_id)
- payments(farmer_id, payment_date desc)
- expenses(business_id, expense_date desc, category_id)
- market_receipts(farmer_id, payment_status, receipt_date desc)
- audit_logs(business_id, entity_type, entity_id, created_at desc)

### 8.8 Row-level security

Enable RLS on every business table. A user can access a row only when an active `business_members` record exists for the row's `business_id`. Writes additionally check the role. Storage objects should use a path such as:

`businesses/{businessId}/receipts/{year}/{receiptId}/{filename}`

Storage policies must validate business membership. Use private buckets and short-lived signed URLs for viewing/downloading. Never make financial receipts public.

### 8.9 Database transactions and concurrency

- Complete Trip validates every entry and updates status in one database transaction.
- Record Payment and allocations in one transaction; allocation total cannot exceed payment amount.
- Use optimistic concurrency with `updated_at` or `version` on frequently edited records.
- Send an `Idempotency-Key` for create-payment, create-expense and receipt-upload operations to prevent duplicates after retries.

---

## 9. API Low-Level Design

Base path: `/api/v1`. Responses use `{ data, meta }`; errors use `{ error: { code, message, fieldErrors, requestId } }`.

### 9.1 Authentication and profile

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/bootstrap` | Create initial business/profile after verified signup |
| GET | `/me` | Current user, membership, role and business settings |
| PATCH | `/me/preferences` | Language and UI preferences |

Supabase handles signup, login, refresh and password reset. The API verifies the JWT for protected endpoints.

### 9.2 Farmers

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/farmers` | Paginated search/filter |
| POST | `/farmers` | Create farmer |
| GET | `/farmers/:id` | Farmer summary |
| PATCH | `/farmers/:id` | Update farmer |
| DELETE | `/farmers/:id` | Soft archive |
| GET | `/farmers/:id/ledger` | Ledger with date filters |
| GET | `/farmers/:id/statement` | PDF/XLSX export |

### 9.3 Trips and crates

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/trips` | Filter by date/status/vehicle |
| POST | `/trips` | Create draft trip |
| GET | `/trips/:id` | Trip with entries and totals |
| PATCH | `/trips/:id` | Update trip header |
| POST | `/trips/:id/entries` | Add farmer crate entry |
| PATCH | `/trips/:id/entries/:entryId` | Edit entry |
| DELETE | `/trips/:id/entries/:entryId` | Remove draft entry |
| POST | `/trips/:id/complete` | Validate and complete |
| POST | `/trips/:id/reopen` | Admin reopen with reason |

Example create entry:

```json
{
  "farmerId": "uuid",
  "crateCount": 50,
  "ratePaise": 2500,
  "notes": "Trip 1"
}
```

Example response:

```json
{
  "data": {
    "crateCount": 50,
    "ratePaise": 2500,
    "freightAmountPaise": 125000,
    "freightAmountFormatted": "INR 1,250.00"
  }
}
```

### 9.4 Payments, expenses and receipts

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/payments` | Create and allocate payment |
| GET | `/payments` | Search payments |
| POST | `/expenses` | Create expense |
| GET | `/expenses` | Expense report/list |
| PATCH | `/expenses/:id` | Correct expense |
| POST | `/receipts/upload-url` | Get signed upload instruction |
| POST | `/receipts` | Save receipt metadata after upload |
| PATCH | `/receipts/:id` | Review/link/update status |
| POST | `/receipts/:id/payment-events` | Record receipt payment event |

### 9.5 Dashboard and reports

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/dashboard/summary` | Totals and alerts for a range |
| GET | `/reports/income` | Freight income breakdown |
| GET | `/reports/expenses` | Expense breakdown |
| GET | `/reports/profit` | Accrual/cash profitability |
| GET | `/reports/outstanding` | Farmer balances |
| GET | `/reports/receipts` | Receipt/payment status |
| POST | `/exports` | Generate PDF/XLSX for selected report |

### 9.6 Validation examples

- Date cannot be more than a configured number of days in the future.
- Crate count must be a positive integer and below a reasonable maximum.
- Rate and money values must be positive integers in paise.
- Completed/cancelled trips reject ordinary entry writes.
- A farmer must belong to the same business as the trip.
- File types: JPEG, PNG or PDF; enforce size and content sniffing.
- Report ranges are capped for synchronous generation.

### 9.7 HTTP and operational controls

- 200/201 success, 400 validation, 401 unauthenticated, 403 unauthorized, 404 missing, 409 version/idempotency conflict, 422 business rule, 429 rate limit and 500 unexpected error.
- Structured logs with request ID; redact financial details and tokens.
- Rate limit authentication, uploads and exports.
- CORS allow only production/staging/local approved origins.

---

## 10. Reporting, Printing and WhatsApp

### 10.1 Farmer statement content

Header:

**Radhe Krishna Transport by Dnyaneshwar Jejurkar**

Then business contact, farmer name/code/mobile/village, statement range and generated date. The ledger includes date, trip, crates, rate, charge, payment, adjustment and running balance. The footer includes:

**All Rights Reserved. Developed by Roshan Mali © 2026**

Add page number, language and a short note that the statement is system generated.

### 10.2 Daily trip sheet

Include date, trip, vehicle, route, farmer rows, total crates, total freight and signatures for driver/helper if required.

### 10.3 Excel format

- One summary sheet and one detailed-data sheet.
- Human-readable column names, freeze header, filters, currency/date formatting and totals.
- Do not export internal UUIDs by default.
- Include selected filters and generation timestamp.

### 10.4 WhatsApp sharing

MVP flow:

1. Generate/download a PDF statement.
2. Open WhatsApp using a prefilled text link for the farmer's phone.
3. The user manually attaches the generated PDF because browser deep links cannot reliably attach a local file.

On supported mobile browsers, use the Web Share API with the PDF file. A later WhatsApp Business integration can send documents automatically after explicit consent and approved templates.

Example localized message:

`Namaskar {farmerName}, {fromDate} to {toDate} cha Radhe Krishna Transport statement sobat pathavla aahe. Baki rakkam: {balance}.`

### 10.5 PDF language/font

Embed a font supporting Devanagari, such as Noto Sans Devanagari. Test line wrapping and numbers in all three languages. The user may choose UI language and report language independently.

---

## 11. Internationalization

### 11.1 Translation structure

```text
locales/
|- en/common.json
|- hi/common.json
`- mr/common.json
```

Use translation keys such as `trip.new`, `farmer.outstandingBalance` and `expense.category.diesel`; never store English sentences as keys.

### 11.2 Example labels

| Key | English | Hindi | Marathi |
|---|---|---|---|
| dashboard.todayIncome | Today's income | आज की आय | आजचे उत्पन्न |
| trip.crates | Crates | क्रेट | क्रेट्स |
| payment.balance | Balance | बाकी राशि | बाकी रक्कम |
| action.save | Save | सहेजें | जतन करा |

Translations must be reviewed by a fluent user before launch; literal machine translation can confuse financial actions.

### 11.3 Formatting

- Use `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Keep database dates/times canonical; localize only at the UI/export boundary.
- Allow Marathi/Hindi labels while retaining Arabic numerals initially for ease of entry.

---

## 12. Security, Privacy and Reliability

### 12.1 Security requirements

- Supabase Auth with verified email and strong password policy.
- Short-lived access tokens and secure refresh handling.
- Server-side JWT verification and role checks.
- RLS on every table and private storage buckets.
- Service-role key only in server environment variables.
- Zod validation at API boundary; parameterized queries.
- File MIME/content validation, size limit and safe generated filenames.
- Signed URLs with short expiration.
- Audit all sensitive creates, edits, status changes, exports and restores.
- Do not log access tokens, passwords, receipt images or full phone numbers.
- Add security headers: CSP, HSTS, X-Content-Type-Options and frame restrictions.

### 12.2 Privacy

Farmer phone numbers, receipts and balances are personal/business-sensitive. Provide data retention and archive rules, export on request and controlled deletion. Obtain consent before automated WhatsApp messaging.

### 12.3 Backup and recovery

- Enable Supabase database backups appropriate to the selected plan.
- Keep schema migrations in source control.
- Test restore procedure before production use.
- Maintain an export option for critical farmer ledgers.
- Retain original receipt files and metadata consistently.

### 12.4 Observability

- Frontend error tracking and API error monitoring.
- Request IDs from browser through API logs.
- Health endpoint and uptime check.
- Alerts for repeated function failures, upload errors and database capacity.
- Track business metrics separately from technical logs.

---

## 13. Netlify and Supabase Deployment Plan

### 13.1 Environments

- Local: local React/API and Supabase project or local Supabase CLI.
- Staging: separate Supabase project and Netlify deploy context.
- Production: separate production Supabase project and protected main branch.

Never reuse the production database for development.

### 13.2 Environment variables

Frontend variables contain only public values, for example Supabase URL and anon key. Server variables contain service credentials and must not use a frontend-exposed prefix.

Typical variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_BASE_URL
ALLOWED_ORIGINS
```

### 13.3 Netlify configuration

- Build React with Vite.
- Publish `apps/web/dist`.
- Route `/api/*` to functions.
- Add SPA fallback to `/index.html` after API/static rules.
- Configure Node runtime and function timeout appropriate to exports.
- Large or slow exports should move to an asynchronous job rather than exceed function limits.

### 13.4 CI/CD gates

1. Install with lockfile.
2. Lint and type-check.
3. Unit tests.
4. Build frontend and functions.
5. Validate migrations.
6. Run dependency/security checks.
7. Deploy preview for pull request.
8. Run smoke test.
9. Promote/merge to production.

### 13.5 Database migration process

- Create numbered SQL migrations.
- Review RLS and destructive changes separately.
- Apply to staging, run integration tests, then production.
- Use backward-compatible changes during rolling deployments.
- Seed only reference categories; never seed production farmer data.

---

## 14. Development Roadmap

### Phase 0 - Discovery and setup (3-5 days)

- Confirm Marathi product spelling, print header and owner name spelling.
- Observe the current notebook/receipt workflow.
- Finalize rate, payment and receipt rules.
- Create wireframes and design tokens.
- Set up monorepo, CI, environments and Supabase migrations.

### Phase 1 - Foundation (1 week)

- Authentication and onboarding.
- App shell, navigation, responsive layout and i18n framework.
- Business, profile, vehicle, route and category tables.
- RLS baseline and API middleware.

### Phase 2 - Farmer and trip MVP (1.5-2 weeks)

- Farmer CRUD/search.
- Trip CRUD and crate entry.
- Rate resolution and totals.
- Draft/complete workflow and audit log.
- Mobile usability and validation tests.

### Phase 3 - Payments and expenses (1.5 weeks)

- Farmer ledger and balance.
- Payment allocation and acknowledgement.
- Expense entry, categories and attachments.
- Dashboard income/expense/outstanding totals.

### Phase 4 - Receipts and reports (1.5-2 weeks)

- Receipt capture/upload/review/status.
- Farmer statement, daily sheet and business reports.
- PDF/Excel export, print and Web Share/WhatsApp flow.
- Marathi/Hindi report validation.

### Phase 5 - Hardening and launch (1 week)

- End-to-end tests, security/RLS tests and performance checks.
- Backup/restore rehearsal.
- Accessibility and device testing.
- Data import/template, user training and production launch.

**Indicative MVP duration:** 6-8 weeks for one experienced full-stack developer working consistently. Part-time development will require a longer calendar schedule.

### Phase 6 - Enhancements

- Receipt OCR with human confirmation.
- Offline outbox and sync conflict UI.
- Farmer portal/OTP access.
- WhatsApp Business integration.
- Multiple businesses/vehicles and advanced route profitability.
- Predictive expense and outstanding-payment alerts.

---

## 15. Testing Strategy

### 15.1 Unit tests

- Freight/rate resolution.
- Farmer balance and payment allocation.
- Income, cash received, expense and profit formulas.
- Date-range helpers and translations.
- Validation schemas and authorization decisions.

### 15.2 Integration tests

- API with Supabase test database.
- RLS: member can access own business only.
- Complete trip transaction.
- Concurrent payment allocation.
- Signed receipt upload and metadata creation.
- PDF/XLSX content for known fixture data.

### 15.3 End-to-end tests

1. Admin signs up and completes onboarding.
2. Admin adds Farmer A.
3. Admin creates Monday Trip 1 with 50 crates at INR 25.
4. System shows INR 1,250 freight.
5. Admin records INR 1,000 partial payment.
6. Farmer balance shows INR 250.
7. Admin records diesel expense.
8. Dashboard and period report update correctly.
9. Admin uploads and links a market receipt.
10. Admin generates and shares the farmer statement.

### 15.4 Acceptance devices

Test at minimum on a common Android phone width, iPhone-sized viewport, tablet and 1366 px desktop. Test slow network, camera upload, browser back navigation, long Marathi names and a multi-page statement.

---

## 16. User Stories and Acceptance Criteria

### Epic A - Authentication and setup

#### US-01 Register initial admin

As the business owner, I want to create an admin account so that only authorized people can manage transactions.

**Acceptance criteria**

- A new user can register with name, email and password and must verify the email.
- The first verified user can create the business profile.
- Duplicate email registration is handled without exposing sensitive account details.
- After onboarding, public owner creation is no longer available.

#### US-02 Login and recovery

As an admin, I want secure login and password recovery so that I can regain access safely.

**Acceptance criteria**

- Valid credentials open the dashboard.
- Invalid credentials show a localized, non-technical message.
- Password reset uses a time-limited link.
- Logout invalidates the local session and returns to login.

#### US-03 Configure business

As an admin, I want to configure the print name, route, vehicle and default crate rate so that entries and reports use correct defaults.

**Acceptance criteria**

- Default rate accepts INR 25 and stores 2500 paise.
- The print preview shows Radhe Krishna Transport by Dnyaneshwar Jejurkar.
- A vehicle and Ugaon-to-Pimpalgaon route can be activated/deactivated.

### Epic B - Farmers

#### US-04 Add a farmer

As an admin, I want to add a farmer so that I can track that farmer's crates and balance.

**Acceptance criteria**

- Name and village are required; mobile is validated if provided.
- A unique farmer code is generated.
- Possible duplicates by name/mobile are warned before save.
- The new farmer is available immediately in trip entry.

#### US-05 Search and view farmer

As an admin, I want to search farmers and see their account summary so that I can answer balance questions quickly.

**Acceptance criteria**

- Search matches code, name, mobile and village.
- Profile shows total crates, freight, paid and outstanding for the selected range.
- Ledger is ordered and shows a running balance.

#### US-06 Archive farmer

As an admin, I want to archive an inactive farmer without deleting history.

**Acceptance criteria**

- Archived farmers do not appear in the default trip picker.
- Historical entries and reports remain accessible.
- Admin can restore the farmer.

### Epic C - Trips and freight

#### US-07 Create daily trip

As an admin, I want to create Trip 1 or Trip 2 for a date so that each pickup run is tracked separately.

**Acceptance criteria**

- The system suggests the next available trip number.
- Date, vehicle and route are required.
- Duplicate trip number for the same date/vehicle is rejected.
- A new trip begins in Draft.

#### US-08 Add farmer crates

As an admin, I want to add a farmer's crate count so that freight is calculated automatically.

**Acceptance criteria**

- Farmer and positive whole-number crate count are required.
- For 50 crates at INR 25, the amount is INR 1,250.
- The applied rate and source are visible before save.
- Trip totals update after save.

#### US-09 Edit draft entry

As an admin, I want to correct a crate count before completing the trip.

**Acceptance criteria**

- A draft entry can be edited or removed.
- New totals are recalculated.
- The audit history records changes.

#### US-10 Complete trip

As an admin, I want to complete a trip so that its entries become official charges.

**Acceptance criteria**

- Completion requires at least one valid crate entry.
- The user sees total farmers, crates and freight for confirmation.
- Completed trips reject normal edits.
- Reopening requires admin reason and is audited.

#### US-11 Copy recent farmers

As an operator, I want to reuse farmer names from a previous trip so that daily entry is faster.

**Acceptance criteria**

- User can copy selected farmers from a prior trip.
- Crate counts are blank by default to prevent accidental duplication.
- Rates resolve for the new trip date.

### Epic D - Payments and balances

#### US-12 Record full payment

As an admin, I want to record a farmer payment so that outstanding balance is reduced.

**Acceptance criteria**

- Amount, farmer, date and mode are required.
- Payment is allocated to oldest unpaid charges by default.
- Ledger and balance update atomically.
- Duplicate retry with the same idempotency key does not create a second payment.

#### US-13 Record partial payment

As an admin, I want to record partial payment so that the remaining balance is accurate.

**Acceptance criteria**

- If charge is INR 1,250 and payment is INR 1,000, balance is INR 250.
- The ledger labels the charge as partially paid.
- Statement includes both charge and payment.

#### US-14 Record advance

As an admin, I want to record an advance so that it can offset future freight.

**Acceptance criteria**

- Payment greater than current balance is accepted with confirmation.
- The remaining value appears as credit.
- Future allocation can consume the credit without changing the original payment.

#### US-15 Correct payment

As an admin, I want controlled payment correction so that mistakes do not silently corrupt history.

**Acceptance criteria**

- Correction requires a reason.
- Settled allocations are reversed/reallocated transactionally.
- Before/after values appear in the audit log.

### Epic E - Expenses

#### US-16 Add expense

As an admin, I want to record diesel, puncture, repair, oil, helper salary or another expense so that true profit is visible.

**Acceptance criteria**

- Date, category and positive amount are required.
- Vehicle and trip are optional where appropriate.
- The user can attach a bill image.
- Dashboard expense total updates after save.

#### US-17 Filter expenses

As an admin, I want to filter expenses by date/category/vehicle so that I can review spending.

**Acceptance criteria**

- Presets include day, week, month, 3 months, 6 months and year.
- Category totals equal detailed rows.
- Export uses the active filters.

#### US-18 View net result

As the owner, I want both accrual profit and cash surplus so that I understand earned and received money.

**Acceptance criteria**

- Gross income, cash received, expenses, accrual profit and cash surplus are labeled separately.
- Calculations use the selected date range.
- A tooltip explains the difference.

### Epic F - Market receipts

#### US-19 Upload receipt

As an admin, I want to photograph a market receipt so that proof is stored with the transaction.

**Acceptance criteria**

- Camera/gallery supports JPEG, PNG and PDF within the configured limit.
- Upload progress and failure retry are visible.
- File is private and linked to the business.
- User can select farmer and trip before or after upload.

#### US-20 Review receipt details

As an admin, I want to enter or verify receipt data so that due and paid status can be tracked.

**Acceptance criteria**

- Receipt number/date, farmer, net payable and status can be stored.
- OCR suggestions, when enabled, are never saved as confirmed without user review.
- Image remains viewable with zoom/rotate.

#### US-21 Track receipt payment

As an admin, I want to mark receipt payments so that pending market money is visible.

**Acceptance criteria**

- Payment events support partial and full amounts.
- Status becomes Partially Paid or Paid according to totals.
- Overpayment requires confirmation and note.

### Epic G - Reports and sharing

#### US-22 View period totals

As the owner, I want totals for day, week, month, 3 months, 6 months and year so that I can measure the business.

**Acceptance criteria**

- Date presets resolve correctly in Asia/Kolkata timezone.
- Cards and detailed report use the same totals.
- Filters can include farmer, vehicle and route.

#### US-23 Generate farmer PDF

As an admin, I want a farmer statement PDF so that I can print or share the account.

**Acceptance criteria**

- Header and developer footer match approved text.
- PDF includes selected range, ledger and running balance.
- Multi-page output has repeated column headings and page numbers.
- English, Hindi and Marathi text renders without missing glyphs.

#### US-24 Export Excel

As an admin, I want an Excel export so that I can analyze and preserve records.

**Acceptance criteria**

- Workbook contains summary and detailed sheets.
- Headers, dates and currency are formatted.
- Filters and totals match the on-screen report.

#### US-25 Share through WhatsApp

As an admin, I want to share a statement with the farmer so that the farmer receives account details quickly.

**Acceptance criteria**

- On supported mobile devices, Share opens with PDF and localized message.
- Otherwise, the app downloads the PDF and opens a prefilled WhatsApp message.
- The user confirms the recipient before leaving the app.

### Epic H - Language, audit and quality

#### US-26 Change language

As a user, I want English, Hindi or Marathi so that I can use the system comfortably.

**Acceptance criteria**

- Language can be changed without logout.
- Preference persists across sessions.
- Forms, validation, navigation and reports use the selected language where supported.

#### US-27 Audit changes

As an admin, I want to know who changed financial records so that corrections are accountable.

**Acceptance criteria**

- Audit records actor, time, entity, action and before/after values.
- Ordinary users cannot edit audit logs.
- Sensitive tokens/files are not copied into audit payloads.

#### US-28 Handle poor network

As a mobile user, I want clear save status on a weak network so that I do not enter duplicates.

**Acceptance criteria**

- Loading, retry and error states are visible.
- The save button is protected from accidental double submission.
- A failed write is never shown as successfully finalized.
- Draft form values remain available after a recoverable failure.

---

## 17. MVP Definition of Done

- Owner can register, log in and configure business, vehicle, route and INR 25 default rate.
- Owner can create farmers, two or more daily trips and crate entries.
- System correctly calculates 50 x INR 25 = INR 1,250 and period totals.
- Owner can record full/partial payments and see a correct farmer ledger/balance.
- Owner can record categorized expenses and see gross income, cash received, expenses and both net measures.
- Owner can upload and link a private market receipt and track its status.
- Farmer PDF and Excel reports work for a custom range and can be printed/shared.
- Core UI and validation are available in English, Hindi and Marathi.
- Mobile layout is validated on real Android hardware and desktop layout is usable.
- RLS/security tests prove one business cannot access another business's data.
- Audit history, backups, error monitoring and deployment runbook are in place.

---

## 18. Open Decisions Before Coding

1. Confirm product spelling: Mudra Sanchay and its Marathi title.
2. Confirm print spelling: Dnyaneshwar or Dynaneshwar Jejurkar.
3. Is freight always charged to the farmer, or can market/buyer pay it?
4. Can rates differ by farmer, route, trip or season?
5. Does one market receipt ever contain crates from multiple farmers?
6. Should market sale amounts affect transport income, or remain a separate receivable record?
7. Is farmer opening balance needed when migrating from a notebook?
8. Are helper salaries daily, weekly or monthly?
9. Should PDF show the owner's mobile/UPI details?
10. Is a second user/operator needed at launch?
11. Does the business need financial-year reports (April-March) in addition to calendar-year 2026?
12. What is the expected daily volume of farmers, trips, images and years of retention?

---

## 19. Recommended First Sprint Backlog

1. Approve terminology, spelling and rate/payment rules.
2. Build low-fidelity mobile wireframes for Dashboard, New Trip, Farmer Account, Payment, Expense and Receipt.
3. Initialize monorepo, TypeScript standards, CI and environment validation.
4. Create Supabase migrations for business, profiles, members, vehicles, routes and farmers.
5. Implement RLS tests before adding financial tables.
6. Build authentication, onboarding and responsive app shell.
7. Add farmer CRUD/search with duplicate warning.
8. Add translation skeleton and validate Devanagari fonts.
9. Demonstrate the first vertical slice: login -> add farmer -> show farmer profile.

This keeps the first sprint demonstrable while establishing the security and architecture needed for later accounting features.

---

**Document footer text for generated application reports:**  
All Rights Reserved. Developed by Roshan Mali © 2026
