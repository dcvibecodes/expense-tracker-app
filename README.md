# Expenses+ v3.2.0

Personal expense tracking PWA with SQLite database. Part of a unified suite with Portfolio+.

## What's New in v3.2.0

### Server-side Notifications
- **Persistent notifications** — notification data now stored in SQLite instead of browser localStorage; notifications persist across browsers, devices, and cleared browser data
- **Server-side recurring checks** — the server generates daily "Recurring Expense Appeared" and "Recurring Series Ended" notifications automatically (hourly check), even if the app isn't open
- **Automatic cleanup** — expired notifications (7 days past last date) are pruned server-side every 6 hours
- **New API endpoints** — `GET /api/notifications`, `POST /api/notifications`, `PATCH /api/notifications/:id/dismiss`, `DELETE /api/notifications/:id`
- **Zero impact on existing data** — new `notifications` table is created alongside existing tables with no schema changes to `expenses`, `categories`, `settings`, or `app_lock`

### Note
Recurring series set up before this update will not automatically generate notifications. Only new copies made after deploying v3.2.0 will be tracked by the notification system.

## What's New in v3.1.0

### Mobile Compatibility
- **Fixed bottom tab bar** — navigation pinned to screen bottom on phones (icon + label, native app feel)
- **No zoom on input focus** — viewport locked with `maximum-scale=1.0`, all inputs at 16px font
- **Single-column layouts** — forms, filters, charts, and settings reflow to one column on mobile
- **Card layout for expenses table** — rows become stacked cards with labeled fields on mobile (no side scroll)
- **Report pivot side-scrolls** — reports table scrolls internally with full descriptions visible
- **Summary cards: 2-per-row** — category totals always show in a 2-column grid on mobile
- **Safe area support** — bottom nav respects iPhone home indicator via `env(safe-area-inset-bottom)`
- **Bottom-sheet modals** — modals slide up from bottom on small screens

### Design Unification (with Portfolio+)
- **Toast system** — replaced single error toast with stacking toast notifications (success/error/info, bottom-right)
- **Custom confirm modal** — all native `confirm()` dialogs replaced with styled modal (consistent cross-platform)
- **Badge radius** — standardized to `border-radius: 12px`
- **Summary gap** — unified to 16px
- **Chart.js** — pinned to v4.4.7, loaded at end of body (was unpinned in head)
- **Autocomplete** — dropdown restyled: 6px border-radius, accent-bg hover, matching z-index
- **Focus-visible** — already present (Portfolio+ added to match)

## Features

- **Add expenses** — date, details (with smart autocomplete + auto-category), category, amount
- **Monthly summary** — color-coded category totals with total at a glance
- **Reports** — yearly/monthly pivot table with expand/collapse, pie charts, bar chart, CSV export
- **Batch operations** — rename details across entries, reassign categories in bulk
- **Copy expense** — duplicate an expense across multiple months
- **Categories** — up to 15, custom colors, rename propagates everywhere
- **Date format** — configurable (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- **App Lock** — 6-digit PIN with PBKDF2 hashing, recovery code, rate limiting
- **Dark mode** — full dark theme toggle
- **PWA** — installable, service worker for offline shell
- **Notifications** — server-side persistent notification system for recurring expense reminders (survives browser/device switches)

## Setup

```bash
npm install
npm start
```

Runs at http://localhost:3000

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Database | SQLite3 |
| Frontend | Vanilla JS (no framework, no build step) |
| Charts | Chart.js 4.4.7 (CDN) |
| Security | PBKDF2 PIN hashing, express-session, rate limiting |
| PWA | Service worker, Web App Manifest |

## Data

All data stored in `data/expenses.db` (SQLite). Back up this file to preserve your expenses.
