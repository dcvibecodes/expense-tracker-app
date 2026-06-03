# Expense Tracker

A personal expense tracking app built with **Node.js**, **Express**, and **SQLite**. Deploy it on a VPS or run locally — your data stays on your server.

**Version 2.5.0**

## Features

### ➕ Add Expenses
Quickly add expenses with date, details, category, and amount. Success confirmation shown after each entry. Supports backdating — pick any past date and the entry sits in its correct chronological position.

- **Duplicate detection** — If you try to add an expense with the same date, details, and amount as an existing entry, the app warns you and asks for confirmation before proceeding.
- **Double-click prevention** — The Add button disables while the request is in flight, preventing accidental duplicate submissions on slow networks.

### 📋 Copy Expenses (Monthly Recurring)
Copy any expense to the same day-of-month across multiple months — ideal for recurring bills.
- Click the 📋 icon on any expense row (tracker or reports)
- The **current occurrence date** is pre-filled; enter the **number of months** to copy forward
- Copies start from the **next month** after the current occurrence (never duplicates in the same month)
- **Duplicate detection** — If a target month already has this expense (same date, details, amount), it's skipped and you're told how many were skipped
- Smart **month overflow handling** — Jan 31 + 1 month = Feb 28 (last valid day)

### 🔔 Recurring End Notification
When a recurring series is approaching its end, you get notified.
- **Bell icon** in the header with badge count
- **Notification panel** slides in showing which series is ending and on what date
- Badge appears on the **last occurrence date** and stays for **7 days**
- Auto-deletes after 7 days — no stale notifications
- Mark as read (badge disappears) or dismiss permanently

### 📊 Reports & Charts
- **2 Pie Charts** — Category breakdown for the selected month and the previous month, side by side
- **Bar Chart** — Yearly overview with monthly totals (double-width for better readability)
- **Drill-down Report Table** — Year → Month → Day → Individual expenses, fully expandable/collapsible
- **Mobile stacked layout** — On phones, the report table converts to a vertical card layout — no horizontal scrolling needed
- **Copy, Edit & Delete from Reports** — Copy, edit, or delete any expense across any time period directly from the report view
- **Category Filter** — Filter reports by category alongside year, month, and date range selectors
- **Default View** — Reset button to restore the default hierarchy (year/month expanded, days collapsed)
- **Auto-refresh** — Switching to the Reports tab automatically loads the latest data

### 📋 Monthly Summary
Shows a **Total** plus a breakdown by all configured categories for the current month.

### 🏷️ Configurable Categories
- Add up to **15 custom categories** from Settings
- Each category has a **color** (chosen from a preset palette of 15 distinct colors — no repeats)
- **Rename** categories inline — propagates to all historical expenses in the database
- **Change color** — click the color dot to pick a new one
- **Delete** categories (with warning about historical impact)
- **Batch Category Reassignment** — Move all expenses from one category to another before deleting

### 🌙 Dark Mode
Toggle between light and dark themes via the header icon. Preference saved in localStorage.
- **Premium SaaS-style dark theme** — Softer borders, layered surfaces, reduced visual noise
- **Consistent design system** — CSS variables for backgrounds, borders, text colors
- **All components themed** — Cards, tables, forms, modals, settings, charts, reports

### 🔒 App Lock
- Set a **6-digit numeric PIN** to lock the app
- **Recovery code** shown once on setup — save it securely
- Unlock via PIN or recovery code
- **Remember for today** — check the option to skip the PIN for the rest of the day (same browser)
- Enter key works on all PIN inputs

### 📥 CSV Download
Export expenses as CSV with flexible date selection:
- By year and month
- By custom date range (From/To)
- **All Years** option for complete data export

### 🔍 Filters & Search
Filter the expense table by:
- **Date range** — Start and End date
- **Category** — Any configured category or All
- **Search** — Text search across expense details
- **Collapsible** — Filters are hidden by default behind a toggle button so the table is immediately visible

### ✨ Autocomplete Details
Start typing in the Details field and it suggests previously used entries.
- **Smart splitting** — comma-separated entries are split into individual phrases for better suggestions
- **Recency-based** — most recently used phrases appear first
- **Debounced** — waits 250ms after typing stops, shows max 8 suggestions (optimized for mobile)

### 🔄 Batch Operations
- **Batch Rename** — Rename all entries with the same detail string in one go (suggestions capped at 8, same as tracker)
- **Batch Category Reassignment** — Move all expenses from one category to another (useful before deleting a category)

### 📱 Mobile-Responsive Design
Fully responsive from desktop down to 400px screens:
- **Scrollable tabs** on narrow screens
- **Slide between tabs** — Touch and slide anywhere on screen to page-turn between Tracker, Reports, Downloads, Settings (native scroll-snap)
- **Pull-to-refresh** — Pull down on iPhone PWA (Add to Home Screen) to refresh all data — only triggers when already at the top of the screen
- **Touch-friendly targets** — 44px minimum tap areas
- **Card-style table on mobile** — Expense rows become stacked cards
- **Stacked form fields** — Single column on phones
- **Charts stack vertically** on small screens
- **Reports stacked layout** — No horizontal scroll on the report table
- **No iOS zoom on focus** — Input font-size set to 16px to prevent Safari auto-zoom

## Getting Started

### Prerequisites
- **Node.js** (v18 or later)
- **npm** (comes with Node.js)

### Install & Run

```bash
# 1. Clone the repository
git clone https://github.com/dcvibecodes/expense-tracker-app.git

# 2. Go to the project folder
cd expense-tracker-app

# 3. Install dependencies
npm install

# 4. Start the server
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

The database file is created automatically at `data/expenses.db` on first run.

### Upgrading from v2.4.0

Deploy the updated files (`public/styles.css`, `public/index.html`, `package.json`, `README.md`) and restart the server. No database changes — fully backward compatible.

### Upgrading from v2.3.1

Deploy the updated files (`server.js`, `public/app.js`, `public/styles.css`, `public/index.html`, `public/sw.js`, `package.json`, `README.md`) and restart the server. No database changes — fully backward compatible.

### Upgrading from v2.3.0

Deploy the updated files (`public/app.js`, `public/styles.css`, `public/index.html`, `public/sw.js`, `package.json`, `README.md`) and restart the server. No database changes — fully backward compatible.

### Upgrading from v2.2

Deploy the updated files (`server.js`, `public/app.js`, `public/styles.css`, `public/index.html`, `package.json`, `README.md`) and restart the server. No database changes — fully backward compatible.

### Upgrading from v2.1

Deploy the updated files and restart the server. No database changes — fully backward compatible.

### Upgrading from v2.0

Deploy the updated files and restart the server. No database changes — fully backward compatible.

### Upgrading from v1

If you have an existing database from v1:
1. Back up your database: `cp data/expenses.db data/expenses.db.backup`
2. Deploy the new code files (`server.js`, `public/app.js`, `public/styles.css`, `public/index.html`)
3. Restart the server

The server automatically migrates the schema on startup:
- Creates the `categories` table and seeds defaults (Needs, Wants, Other)
- Removes the old CHECK constraint from the expenses table
- All existing data is preserved

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Database | SQLite (via `sqlite3`) |
| Frontend | Vanilla JavaScript |
| Charts | Chart.js |
| Styling | Custom CSS, dark mode support, responsive breakpoints |

## Project Structure

```
expense-tracker-app/
├── server.js          ← Express server, API routes, DB migration
├── package.json       ← Project dependencies
├── .gitignore         ← Files excluded from Git
├── data/
│   └── expenses.db    ← SQLite database (auto-created, not tracked)
├── public/
│   ├── index.html     ← Main HTML page
│   ├── app.js         ← Frontend JavaScript
│   └── styles.css     ← Styles (light/dark themes, responsive)
└── README.md          ← This file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | List expenses (with filters) |
| GET | `/api/expenses/:id` | Get single expense |
| POST | `/api/expenses` | Add expense |
| POST | `/api/expenses/copy` | Copy expense to date(s) |
| POST | `/api/expenses/check-duplicate` | Check for duplicate entry |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| PATCH | `/api/expenses/batch` | Batch rename details |
| PATCH | `/api/expenses/batch-category` | Batch reassign category |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Add category |
| PUT | `/api/categories/:id` | Update category (rename/recolor) |
| DELETE | `/api/categories/:id` | Delete category |
| GET | `/api/charts` | Pie + bar chart data |
| GET | `/api/reports` | Hierarchical report data |
| GET | `/api/export/csv` | Download CSV |
| GET | `/api/details` | Autocomplete suggestions (split, deduplicated, recency-ordered) |
| GET | `/api/lock/status` | Lock status |
| POST | `/api/lock/setup` | Enable lock |
| POST | `/api/lock/unlock` | Unlock with PIN |
| POST | `/api/lock/disable` | Disable lock |
| POST | `/api/lock/recovery` | Unlock with recovery code |

## Changelog

### v2.5.0 (June 2026)
- **🔒 Server-side authentication gate** — the app lock is now enforced on the server before any code is served
- Previous client-side-only lock was unsecured (bypassable); now all requests require a valid session cookie
- Server returns a minimal inline lock page for unauthenticated browser requests (no app code leaked)
- API requests without authentication return HTTP 401
- Session middleware with cryptographically random secret, httpOnly cookies, 24-hour expiry
- Uses a `lockConfigured` memory cache since the app uses callback-based `sqlite3` (async DB driver)
- New `/api/lock/config` endpoint returns real lock state (used by Settings)
- `/api/lock/status` returns `{ locked: false }` when session is valid (prevents double lock screen)
- `/api/lock/logout` endpoint to destroy session and re-lock the app
- Lock page uses the app's theme colors: `#0f3460` navy buttons, `#e94560` error text
- Server restart invalidates all sessions — must re-enter PIN

### v2.4.1 (June 2026)
- **Button height alignment** — All buttons now render at 46px to match the ~45.4px computed height of adjacent `<input>`/`<select>` elements, fixing visual misalignment in the Add Expense form, Filters, Reports selector, Downloads selector, and Settings category row
- **Version bump** — Updated to v2.4.1 across `index.html`, `package.json`, and `README`

### v2.4.0 (June 2026)
- **Dark mode button fix** — Copy, edit, and delete buttons on tracker, reports, and settings pages no longer have blue background in dark mode; now transparent like light mode
- **Pull-to-refresh mobile fix** — Only triggers when at the actual top of the screen; scrolling up from the middle no longer causes a refresh
- **Scroll-to-top button removed** — Removed entirely (not needed with current UX)
- **Copy expense rewrite** — "Current Occurrence" label with date pre-filled; copies start from next month only; server checks for duplicates and skips existing entries (reports how many were skipped)
- **Today button** — Small "Today" button next to the date picker on Add Expense to quickly reset to today's date
- **Dark mode calendar icon** — Date picker calendar icon now visible in dark mode (was invisible on dark backgrounds)
- **Settings pencil icon** — Category rename button now uses ✏️ (consistent with tracker/reports); transparent background in dark mode
- **Service worker** — Added `sw.js` for offline support and cache busting (v5)

### v2.3.1 (June 2026)
- **Safari date field fix** — From/To date inputs no longer show Safari's ghost placeholder date; consistent blank appearance across Chrome, Safari desktop, Safari mobile, and Chromium browsers (Edge, Comet)
- **Add button instant disable** — Button grays out and shows "Adding..." immediately on click (before duplicate check network call), eliminating false duplicate popups on slow networks
- **Delete loading indicator** — Delete buttons show ⏳ and disable all row actions while the request is in flight, preventing accidental double-deletes
- **Modal button loading states** — Save, Copy, Rename, and Reassign buttons show progress text while submitting
- **Global disabled button style** — All disabled buttons are visually grayed out (opacity 0.5)
- **Notification empty state** — Panel now explains that recurring expense reminders will appear here, so users understand its purpose
- **Theme toggle visual fix** — Removed persistent background highlight; matched icon size and brightness to the notification bell; reduced gap between header icons
- **Mobile sliding panels** — Replaced swipe-to-switch with native CSS scroll-snap; touch-and-slide works from anywhere on screen (including inputs and table rows); smooth page-turn feel
- **Mobile panel height fix** — Shorter tabs (Reports, Downloads, Settings) no longer inherit empty space from the tallest tab

### v2.3.0 (June 2026)
- **Dark theme complete audit** — Fixed select dropdown patterned overlay bug (background shorthand resetting background-repeat); refactored all borders to CSS variables; softened border colors; added focus rings; card surfaces use subtle box-shadows instead of outlines; premium SaaS-style dark theme
- **Monthly recurring copy** — Copy expenses to the same day-of-month for N consecutive months (e.g., bill on the 2nd for 14 months); handles month overflow (Jan 31 → Feb 28)
- **Recurring end notifications** — Bell icon with badge count; notification panel slides in; badge appears on last recurrence date for 7 days then auto-deletes; mark as read or dismiss permanently
- **Pull-to-refresh** — Pull down gesture refreshes all data on iPhone PWA (Add to Home Screen)
- **Swipe to change tabs** — Swipe left/right to navigate between Tracker, Reports, Downloads, Settings on mobile
- **Reports mobile redesign** — Stacked card layout replaces horizontal-scroll table; all actions (copy/edit/delete) retained
- **Report defaults** — From/To date fields left empty by default; year + month selectors drive the query directly
- **Settings version** — Version number displayed in the Settings About card

### v2.2.1 (June 2026)
- **Night mode fixes** — Chart panels and mobile table cards now respect dark theme; reports text contrast improved for dark backgrounds
- **Safari dropdown alignment** — Unified select/input height via custom styling; added custom dropdown arrow for consistent cross-browser appearance
- **Amount field** — Removed up/down spinner arrows; switched to plain text input with decimal keyboard on mobile; added client-side validation
- **Date defaults** — Reports From/To fields now pre-filled with current month range for consistent behavior across Chrome, Safari desktop, and iOS Safari
- **Category delete message** — Error now directs users to the "Batch Category" option under Filters & Batch Actions for reassignment

### v2.2 (June 2026)
- **Copy expense** — Copy any expense to one or more dates (recurring expense support)
- **Batch category reassignment** — Move all expenses between categories
- **Duplicate detection** — Warns before adding identical entries
- **Double-click prevention** — Add button disables during submission
- **Collapsible filters** — Filters hidden by default, table immediately visible
- **Reports auto-refresh** — No manual refresh needed after adding expenses
- **Batch rename suggestions capped** — Now shows max 8 like the tracker field
