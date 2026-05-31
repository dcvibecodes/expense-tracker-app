# Expense Tracker

A personal expense tracking app built with **Node.js**, **Express**, and **SQLite**. Deploy it on a VPS or run locally — your data stays on your server.

**Version 2.1**

## Features

### ➕ Add Expenses
Quickly add expenses with date, details, category, and amount. Success confirmation shown after each entry. Supports backdating — pick any past date and the entry sits in its correct chronological position.

### 📊 Reports & Charts
- **2 Pie Charts** — Category breakdown for the selected month and the previous month, side by side
- **Bar Chart** — Yearly overview with monthly totals (double-width for better readability)
- **Drill-down Report Table** — Year → Month → Day → Individual expenses, fully expandable/collapsible
- **Edit & Delete from Reports** — Edit or delete any expense across any time period directly from the report view
- **Category Filter** — Filter reports by category alongside year, month, and date range selectors
- **Default View** — Reset button to restore the default hierarchy (year/month expanded, days collapsed)

### 📋 Monthly Summary
Shows a **Total** plus a breakdown by all configured categories for the current month.

### 🏷️ Configurable Categories
- Add up to **15 custom categories** from Settings
- Each category has a **color** (chosen from a preset palette of 15 distinct colors — no repeats)
- **Rename** categories inline — propagates to all historical expenses in the database
- **Change color** — click the color dot to pick a new one
- **Delete** categories (with warning about historical impact)

### 🌙 Dark Mode
Toggle between light and dark themes via the header icon. Preference saved in localStorage.

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

### ✨ Autocomplete Details
Start typing in the Details field and it suggests previously used entries.
- **Smart splitting** — comma-separated entries are split into individual phrases for better suggestions
- **Recency-based** — most recently used phrases appear first
- **Debounced** — waits 250ms after typing stops, shows max 8 suggestions (optimized for mobile)

### 🔄 Batch Rename
Rename all entries with the same detail string in one go.

### 📱 Mobile-Responsive Design
Fully responsive from desktop down to 400px screens:
- **Scrollable tabs** on narrow screens
- **Touch-friendly targets** — 44px minimum tap areas
- **Card-style table on mobile** — Expense rows become stacked cards
- **Stacked form fields** — Single column on phones
- **Charts stack vertically** on small screens
- **Scroll-to-top button** — Appears on scroll, disappears at top

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

### Upgrading from v2.0

Deploy the updated files (`server.js`, `public/app.js`, `public/styles.css`, `public/index.html`, `package.json`, `README.md`) and restart the server. No database changes — fully backward compatible.

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
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| PATCH | `/api/expenses/batch` | Batch rename details |
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
