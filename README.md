# Expenses+

A personal expense tracking app built with **Node.js**, **Express**, and **SQLite**. Deploy it on a VPS or run locally — your data stays on your server.

**Version 2.6.0**

---

## Features

### ➕ Add Expenses
Quickly add expenses with date, details, category, and amount. Success confirmation shown after each entry. Supports backdating — pick any past date and the entry sits in its correct chronological position.

- **Duplicate detection** — If you try to add an expense with the same date, details, and amount as an existing entry, the app warns you and asks for confirmation before proceeding.
- **Double-click prevention** — The Add button disables while the request is in flight, preventing accidental duplicate submissions on slow networks.
- **Today button** — Quick reset to today's date next to the date picker.

### 📋 Copy Expenses (Monthly Recurring)
Copy any expense to the same day-of-month across multiple months — ideal for recurring bills.
- Click the 📋 icon on any expense row (tracker or reports)
- The current occurrence date is pre-filled; enter the number of months to copy forward
- Copies start from the next month after the current occurrence
- Duplicate detection — skips target months that already have the expense
- Smart month overflow handling — Jan 31 + 1 month = Feb 28

### 🔔 Recurring End Notification
When a recurring series is approaching its end, you get notified.
- Bell icon in the header with badge count
- Notification panel slides in showing which series is ending
- Auto-deletes after 7 days

### 📊 Reports & Charts
- **2 Pie Charts** — Category breakdown for the selected month and the previous month, side by side
- **Bar Chart** — Yearly overview with monthly totals
- **Drill-down Report Table** — Year → Month → Day → Individual expenses, fully expandable/collapsible
- **Copy, Edit & Delete from Reports** — Manage any expense directly from the report view
- **Category Filter** — Filter reports by category alongside year, month, and date range selectors
- **Default View** — Reset button to restore the default hierarchy
- **Auto-refresh** — Switching to the Reports tab automatically loads the latest data

### 📋 Monthly Summary
Shows a **Total** plus a breakdown by all configured categories for the current month.

### 🏷 Configurable Categories
- Add up to **15 custom categories** from Settings
- Each category has a **color** (chosen from a preset palette of 15 distinct colors — no repeats)
- **Rename** categories inline — propagates to all historical expenses
- **Change color** — click the color dot to pick a new one
- **Delete** categories (protected if expenses reference them)
- **Batch Category Reassignment** — Move all expenses from one category to another before deleting

### 📅 Date Format
Choose how dates are displayed throughout the app:
- **MM/DD/YYYY** (default)
- **DD/MM/YYYY**
- **YYYY-MM-DD**

Configured in Settings. Applies to the tracker table, reports, and all date displays.

### 🌙 Dark Mode
Toggle between light and dark themes via the header icon. Preference saved in localStorage.
- OLED-friendly pitch black background in dark mode
- All components themed — cards, tables, forms, modals, charts, reports

### 🔒 App Lock (Server-Side)
- Set a **6-digit numeric PIN** to lock the app
- **Recovery code** shown once on setup — save it securely
- Server-side session-based authentication — when locked, the server serves a standalone lock page
- Once authenticated via PIN, a session cookie grants access for 24 hours
- Recovery code unlocks and removes the lock if you forget your PIN
- Can be enabled/disabled from the Settings tab

### 🗥 CSV Download
Export expenses as CSV with flexible date selection:
- By year and month
- By custom date range (From/To)
- **All Years** option for complete data export

### 🔍 Filters & Search
Filter the expense table by:
- **Date range** — Start and End date
- **Category** — Any configured category or All
- **Search** — Text search across expense details
- **Collapsible** — Filters are hidden by default behind a toggle button

### ✨ Autocomplete Details
Start typing in the Details field and it suggests previously used entries.
- Smart splitting — comma-separated entries are split into individual phrases
- Recency-based — most recently used phrases appear first
- Debounced — waits 250ms after typing stops, shows max 8 suggestions

### 🧠 Smart Expense Suggestions
As you type an expense detail, the app can automatically suggest the most likely category and amount based on your past entries.

- Category suggestions use fuzzy matching against previous expense details
- Amount suggestions use exact matching for maximum accuracy
- Auto-fills category and amount fields when a match is found
- Visual highlight animation indicates when values were auto-filled
- Debounced lookups prevent unnecessary API calls while typing

Example:
- Enter "Netflix" once with category "Entertainment" and amount "499"
- The next time you type "Netflix", the app automatically suggests those values

### 🔄 Batch Operations
- **Batch Rename** — Rename all entries with the same detail string in one go
- **Batch Category Reassignment** — Move all expenses from one category to another

### 📱 Mobile-Responsive Design
Fully responsive from desktop down to 400px screens:
- Slide between tabs — Touch and slide to page-turn between tabs (native scroll-snap)
- Pull-to-refresh on iPhone PWA
- Touch-friendly targets — 44px minimum tap areas
- Card-style table on mobile
- Stacked form fields on phones
- Charts stack vertically on small screens
- No iOS zoom on focus — 16px font inputs

---

## Getting Started

### Prerequisites
- **Node.js** (v18 or later)
- **npm** (comes with Node.js)

### Install & Run

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The app will be available at http://localhost:3000.
The database file is created automatically at data/expenses.db on first run.

### Upgrading from v2.5.x
Deploy the updated files (server.js, public/app.js, public/styles.css, public/index.html, public/manifest.json, public/generate-icons.html, package.json) and run `npm install`. Restart the server.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, express-session |
| Database | SQLite (via sqlite3) |
| Frontend | Vanilla JavaScript |
| Charts | Chart.js |
| Styling | Custom CSS with CSS variables, dark mode, responsive |

## Project Structure

```text
expenses-plus/
├── server.js                ← Express server, API routes, session auth, DB schema
├── package.json             ← Project dependencies
├── data/
│   └── expenses.db          ← SQLite database (auto-created)
├── public/
│   ├── index.html           ← Single-page HTML
│   ├── app.js               ← Frontend JavaScript
│   ├── styles.css           ← Styles (light + dark themes, responsive)
│   ├── manifest.json        ← PWA manifest
│   ├── generate-icons.html  ← Icon generation utility
│   ├── favicon-16.png
│   ├── favicon-32.png
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   └── icon-512.png
└── README.md                ← This file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/expenses | List expenses (with filters) |
| GET | /api/expenses/:id | Get single expense |
| POST | /api/expenses | Add expense |
| POST | /api/expenses/copy | Copy expense to date(s) |
| POST | /api/expenses/check-duplicate | Check for duplicate entry |
| PUT | /api/expenses/:id | Update expense |
| DELETE | /api/expenses/:id | Delete expense |
| PATCH | /api/expenses/batch | Batch rename details |
| PATCH | /api/expenses/batch-category | Batch reassign category |
| GET | /api/categories | List categories |
| POST | /api/categories | Add category |
| PUT | /api/categories/:id | Update category (rename/recolor) |
| DELETE | /api/categories/:id | Delete category |
| PATCH | /api/categories/reorder | Reorder categories |
| GET | /api/charts | Pie + bar chart data |
| GET | /api/reports | Hierarchical report data |
| GET | /api/export/csv | Download CSV |
| GET | /api/details | Autocomplete suggestions |
| GET | /api/suggestions | Smart category and amount suggestions |
| GET | /api/settings | Get app settings (date format) |
| PUT | /api/settings | Update app settings |
| GET | /api/lock/status | Lock status |
| POST | /api/lock/setup | Enable lock (returns recovery code) |
| POST | /api/lock/unlock | Unlock with PIN (sets session) |
| POST | /api/lock/disable | Disable lock |
| POST | /api/lock/recovery | Unlock with recovery code (sets session) |

## Changelog

### v2.6.0 (June 2026)
- App renamed from Expense Tracker+ to Expenses+
- Mobile swipe-tab improvements with scroll synchronization
- Improved iPhone/PWA safe-area handling
- Enhanced pull-to-refresh behavior
- Improved recurring expense notifications
- Mobile chart tooltip dismissal improvements
- UI polish and responsiveness updates

### v2.5.1 (June 2026)
- Smart Expense Suggestions
- Automatic category suggestions based on historical entries
- Automatic amount suggestions for previously used expense details
- Visual autofill animation when suggestions are applied
- New `/api/suggestions` endpoint
- Debounced suggestion lookups for improved performance

### v2.5.0 (June 2026)
- App renamed to Expense Tracker+
- Server-side lock — Session-based authentication via express-session. When locked, server serves a standalone lock page (no client-side overlay). PIN unlock sets a 24-hour session cookie. Same mechanism as Portfolio Tracker+.
- Date format setting — Configurable date display (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD) in Settings, stored in a new settings table
- Color scheme matched to Portfolio Tracker+ — Blue accent (#3b82f6), white header with border, matching dark mode (pitch black bg, #111 surfaces), consistent tab and button colors
- Button/input height alignment — All form controls use fixed height: 42px for pixel-perfect alignment (Today button, Add button, filter buttons all match adjacent fields)
- About section removed from Settings
- Client-side lock overlay removed — replaced entirely by server-side lock page

### v2.4.0 (June 2026)
- Dark mode button fix, pull-to-refresh mobile fix, copy expense duplicate prevention, today button, dark calendar icon, service worker

### v2.3.x (June 2026)
- Dark theme audit, monthly recurring copy, recurring end notifications, pull-to-refresh, swipe tabs, reports mobile redesign, Safari fixes

### v2.2 (June 2026)
- Copy expense, batch category reassignment, duplicate detection, collapsible filters, reports auto-refresh

### v2.1 (May 2026)
- Pie charts, bar chart, drill-down report table, CSV export, mobile card-style table

### v2.0 (May 2026)
- Configurable categories with color palette, batch rename, dark mode, app lock with recovery, autocomplete
