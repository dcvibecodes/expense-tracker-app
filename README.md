# Expenses+ v3.17.0

Personal expense tracking PWA with SQLite database. Part of a unified suite with Portfolio+.

## What's New in v3.17.0

### Skeleton Loading
- **Shimmer placeholders on page load** — summary cards, expense table rows, and report table show animated skeleton placeholders while data loads from the server
- **Instant perceived speed** — the page structure appears immediately instead of blank containers, reducing perceived load time on slow connections
- **Zero impact after load** — skeletons are pure HTML that gets overwritten when real data arrives; no residual code or styling
- **Works on mobile and desktop** — responsive skeleton shapes adapt to container width

## What's New in v3.16.0

### Emoji Purge — SVG Icons Everywhere
- **All action buttons now use SVG icons** — edit (pencil), delete (trash), copy (clipboard), notes (file), save (checkmark), cancel (×) are all inline SVGs that inherit `currentColor`
- **Consistent cross-platform rendering** — no more emoji differences between Windows, Mac, iOS, and Android
- **CSV buttons** — now show `↓ CSV` (Unicode down arrow) matching the Portfolio+ style
- **Forecast tab** — row delete ✕ replaced with proper SVG × icon
- **Note toggle link** — cleaned up from "📝 Add note" to plain "Add note"

### UI Fixes
- **Delete button always red** — Settings tab category/rate delete buttons are now red by default (previously only on hover), consistent with all other delete buttons
- **Tracker tab mobile** — tapping an expense card no longer shows a background highlight (removed sticky hover state); Reports tab retains the highlight for selection mode

## What's New in v3.15.0

### Design Overhaul — Monochrome Design Language
- **Complete visual redesign** — unified design language shared with Portfolio+ and other suite apps (Dictation Tool, DocuChat AI)
- **Inter font** — switched from system fonts to Inter via Google Fonts for a tighter, more editorial feel
- **Monochrome accent** — replaced blue (#3b82f6) with near-black (#111) in light mode, near-white (#f5f5f5) in dark mode; buttons, active states, and focus rings all use this neutral accent
- **No shadows** — cards and surfaces rely on border hierarchy (--border-subtle / --border) instead of box-shadow
- **Compact spacing** — reduced button heights (34px), card padding (16px), font sizes across the board
- **Segmented navigation** — tab bar converted from colored pills to a glassmorphic segmented control with backdrop-blur (desktop) / bottom tab bar (mobile)
- **Dark mode updated** — dark theme now uses #0a0a0a background, #141414 surfaces (matching the suite)
- **Lock screen redesigned** — standalone lock page uses the same monochrome design with dark mode support via prefers-color-scheme

### Theme Toggle
- **Settings → Theme** — new segmented control (Auto / Light / Dark) at the top of the Settings tab
- **Auto** follows device theme (default); Light/Dark force a specific mode
- **Persisted in localStorage** — survives sessions without a server round-trip

### Abroad Mode UX Redesign
- **Segmented control** — replaced the toggle switch + Save button with a "Home / Abroad" segmented control (same style as the theme toggle)
- **Auto-save** — selecting "Home" saves immediately; selecting "Abroad" shows currency dropdown, and selecting a currency auto-saves
- **No manual save button** — one fewer click to activate/deactivate

### FAQ Updates
- Added theme toggle FAQ
- Updated Abroad Mode FAQ to reflect new segmented control UX

## What's New in v3.13.0

### Layout — Form Restored to Main Flow
- **Add Expense form back inline** — on desktop, the form is now a standard card between the Summary and Expenses cards (no longer a sidebar); cleaner single-column flow
- **Mobile unchanged** — FAB + bottom sheet still handles the form on mobile

### Mobile Card Alignment
- **Consistent padding** — tracker tab and reports tab card content now aligned identically (same margins from card border to content)
- **Totals bar aligned** — "X entries | ..." line matches content indent

### Scroll Fix (Chromium)
- **`overflow-x: clip` replaces `overflow-x: hidden`** — fixes an issue where vertical scrolling was blocked on Chrome/Edge when combined with `overscroll-behavior`
- **Pull-to-refresh disabled** — `overscroll-behavior-y: contain` on body prevents browser pull-to-refresh globally; eliminates conflict with swipe-to-dismiss on bottom sheets

## What's New in v3.12.0

### Reports Tab — Mobile Card Layout
- **Card layout on mobile** — report entries now display as stacked cards (matching the Tracker tab) instead of a side-scrolling table; each card shows labeled fields (DATE, DETAILS, CATEGORY, AMOUNT) with actions at the bottom
- **Long-press to select** — on mobile, long-press any expense row to enter selection mode; subsequent taps toggle selection; replaces checkbox column
- **Select All / Deselect All** — button in the batch bar for quick bulk selection on mobile
- **Selected state styling** — selected rows highlighted with blue left border

### Reports Tab — Mobile Filters
- **Inline search + filter chip** — full filter panel replaced by a compact search bar with "Filters" pill on mobile; tapping the pill opens year/month/category/reset/CSV in a bottom sheet
- **Day links after Month** — in the mobile filter sheet, day-of-month links appear right after the Month dropdown (logical grouping); desktop layout unchanged
- **Day links full-width** — horizontally scrollable row stretches to screen edges on mobile

### Naming Consistency
- **"Description" → "Details"** — Reports tab column header and search placeholder now say "Details" to match the Tracker tab and form field naming

### Swipe to Dismiss
- **All bottom sheets** — swipe down from the header or when scrolled to top to dismiss; drag handle (gray bar) shown at the top as affordance
- **Instant dismiss** — no snap-back flash; sheet disappears immediately when threshold is crossed

### Font & Style Consistency (with Portfolio+)
- **Summary card values** — PT matched to ET at `1.1rem`
- **Chart headings (h3)** — PT matched to ET: `0.75rem`, uppercase, letter-spacing
- **Toast weight** — PT toasts now `font-weight: 600` matching ET
- **`.btn-secondary`** — added to PT with same sizing as ET

### FAB Position Fix
- **PWA safe area** — FAB positioned at `bottom: 110px` to clear the nav bar in both Safari and PWA standalone mode

## What's New in v3.11.0

### Tracker Tab — Sidebar Layout (Desktop)
- **Add Expense in sidebar** — on desktop (≥768px), the Add Expense form now lives in a fixed sidebar on the left, always visible while you browse and search expenses in the main content area on the right
- **Better use of horizontal space** — eliminates the stacked form-then-table layout; form and table are side-by-side
- **Sticky sidebar** — the form stays visible as you scroll through expenses

### Tracker Tab — Mobile FAB + Bottom Sheet
- **Floating action button** — on mobile, a blue "+" FAB in the bottom-right opens the Add Expense form
- **Bottom sheet form** — tapping the FAB slides up the form as a bottom sheet overlay (no duplicate heading)
- **Scroll lock** — background page is locked while the bottom sheet is open; no more accidental scrolling behind the overlay
- **Auto-close on submit** — form sheet closes automatically after adding an expense

### UI Consistency
- **Card-based design restored** — all sections use consistent card styling (border, background, shadow, radius) across all tabs
- **Button styling unified** — Add/Cancel buttons in Settings (Categories, Currency Rates) now use consistent styling throughout
- **Mobile card spacing** — proper margins between cards and screen edges on all screen sizes

### Reports Tab — Mobile Filters
- **Inline search + filter chip** — on mobile, the full filter panel is replaced by a compact search bar with a "Filters" pill; tapping the pill opens year/month/category/reset/CSV in a bottom sheet
- **Table-first view** — report data visible immediately without scrolling past filter dropdowns

### App Lock
- **Auto-focus PIN field** — cursor is now in the PIN input with keyboard open when the lock screen appears

## What's New in v3.10.0

### Reports Search + Filter Combination
- **Search within filters** — search now respects the currently selected year/month instead of overriding them; results are filtered by both text match and date range
- **"All" toggle button** — small button next to the search input; click to search across all data regardless of year/month selection (equivalent to setting "All Years" + "All Months" manually)
- **Month filter with All Years** — selecting "All Years" + a specific month now correctly filters to that month across all years (previously ignored the month)
- **Dropdowns stay interactive** — year/month/category dropdowns are no longer cleared or disabled when searching; change them anytime to narrow or broaden results
- **CSV export matches** — CSV download respects the same combined search + filter state
- **Updated placeholder** — search input now reads "Search by description" to accurately reflect scoped behavior

### App Lock
- **Session extended to 1 week** — authenticated session now lasts 7 days instead of 24 hours; fewer re-entries of the PIN

## What's New in v3.9.0

### Per-Expense Notes
- **Note on any expense** — add an optional note to any expense via the Add form, Edit modal, or the dedicated Notes modal
- **Notes button in Actions column** — each expense row shows 📝 (has note) or 🗒️ (no note) in the actions column; clicking opens a focused note editor modal
- **Works everywhere** — notes available on both Tracker and Reports tabs with the same modal
- **Carried on copy/repeat** — notes are preserved when copying expenses to other months or repeating last month
- **CSV export** — notes included as a "Note" column in exported CSV files
- **Non-destructive migration** — adds a `note` column to the expenses table; existing data is untouched

### Quick Notes (Scratchpad)
- **Header icon** — document icon in the app header opens a slide-out scratchpad panel (same pattern as notifications)
- **Single persistent textarea** — one scratchpad for jotting down reminders, budget goals, or anything to remember later
- **Saved in the database** — persists across sessions, browsers, and devices (stored in the settings table)
- **Ctrl+Enter to save** — keyboard shortcut for quick saves; "Saved ✓" confirmation shown
- **10,000 character limit** — plenty of room for free-form notes
- **Mutually exclusive panels** — opening scratchpad closes notifications and vice versa

## What's New in v3.8.0

### Forecast Tab — Cell Notes
- **Notes on any cell** — right-click (desktop) or long-press (mobile) any amount cell to add a note, similar to comments in Excel/Google Sheets
- **Blue triangle indicator** — cells with notes show a small blue triangle in the top-right corner at all times
- **"Show notes" toggle** — flip the toggle above the grid to reveal all notes as floating bubbles above their cells without distorting row heights
- **Hover tooltip** — hovering over a cell with a note shows its content as a native tooltip (even with toggle off)
- **Notes in CSV export** — notes are included as a separate "Notes" section at the bottom of the CSV, keeping numeric data clean for SUM formulas
- **Notes survive edits** — changing or clearing an amount never removes the note; notes are only removed explicitly via the Clear button in the note popover

### Forecast Tab — Bug Fixes
- **Clearing an amount no longer deletes the row** — setting an amount to empty or 0 now keeps the row and note intact; rows can only be removed via the × button or full reset
- **Rows no longer vanish on click** — fixed an issue where clicking a cell and blurring without changes could delete the underlying DB entry

## What's New in v3.7.0

### Forecast Tab Enhancements
- **Starting balance per month** — the top row now shows the computed starting balance for every month (not just the first); each month's starting balance equals the previous month's ending balance, giving immediate visibility into carry-forward amounts
- **CSV download** — new "⬇ CSV" button exports the entire forecast table as a CSV file including starting balance row, all income rows, all expense rows (as negative numbers), and the balance row; columns include a "Type" indicator (Income/Expense); spreadsheet SUM on any month column produces the correct balance figure
- **Drag-and-drop reordering** — replaced ▲/▼ arrow buttons with HTML5 drag-and-drop; grab the ⠿ handle on any row to reorder within its section; visual drop indicator shows placement

### What's New in v3.6.0

### Forecast Tab
- **Cash flow projection** — new "Forecast" tab lets you project your monthly balance forward, replacing the need for a separate spreadsheet
- **Inline editable grid** — spreadsheet-style grid with months as columns; click any cell to edit amounts directly, no separate forms needed
- **Income rows** — add multiple income sources (salary, freelance, etc.) with per-month amounts
- **Expense rows** — add expenses with per-month amounts; different amounts per month supported (e.g. varying CC bills)
- **Running balance** — bottom row shows cumulative balance (each month = previous balance + income − expenses)
- **Add rows inline** — click "+ Add income" or "+ Add expense", type a label, then fill in amounts per month
- **Remove rows** — × button on each row removes it from all months
- **Rename inline** — click a label to rename it across all months
- **Duplicate prevention** — same label can only exist once per month (upsert behavior)
- **Configurable range** — set start month and number of months (1–24)
- **Self-contained** — no dependency on other tabs; uses its own DB tables (`extrap_income`, `extrap_oneoff`, `extrap_settings`)
- **Non-destructive** — existing expense data is never touched; forecast tables are created alongside existing ones

## What's New in v3.5.0

### Reports Tab Cleanup
- **Filters always visible** — removed the toggle button; filters are permanently shown for immediate access
- **CSV button moved** — download button now sits next to Reset, eliminating the separate toolbar row
- **Summary line above table** — entry count and category totals ("12 entries | Needs: ₹ 23,551 | Total: ₹ 24,694") moved above the table in a smaller, subtler style
- **Removed hierarchical report view** — cleaned out unused year/month/day collapsible tree CSS and logic; only the flat table view remains
- **Consistent table borders** — report table header border now matches the Tracker tab's 1px style

### Reliability
- **Chart.js bundled locally** — no longer depends on CDN (`cdn.jsdelivr.net`); charts load regardless of VPN, firewall, or network conditions
- **Error isolation** — chart loading failures no longer overwrite the data table with "Failed to load reports"; table and charts have independent error handling
- **Service worker cache bumped** (v9) — forces stale caches to purge after update
- **No-cache headers** — server sets `Cache-Control: no-cache` on HTML/JS/CSS to prevent stale file issues during development

### Mobile Fixes
- **Foreign currency alignment** — original amount (e.g. ₫ 30,000) now aligns under the base currency amount on mobile card layout
- **Report table actions column** — widened and removed overflow clipping so delete button is fully visible on scroll
- **Reset + CSV buttons side-by-side** — on mobile, both buttons share a row at half-width instead of stacking

### Code Cleanup
- Removed dead CSS: `.filters-toggle-btn`, `.report-toolbar`, `.report-toolbar-btn`, `.rpt-year`, `.rpt-month`, `.rpt-day`, `.rpt-chevron`, `.rpt-children`, `.rpt-preview`, `.rpt-day-text`
- Removed duplicate `.chart-toggle-btn.active` rule
- Removed unused `reportFiltersContent` JS variable

## What's New in v3.4.0

### Multi-Currency & Expenses Abroad
- **Base currency setting** — dropdown to select your home currency from 36 supported currencies (INR, USD, EUR, GBP, VND, THB, etc.); all amounts display with the correct symbol
- **Currency rates table** — define exchange rates for any foreign currency relative to your base currency; rates are editable at any time
- **Expenses Abroad toggle** — flip a switch when traveling; expenses are entered in the foreign currency and auto-converted to base currency using the rate from settings
- **Rate snapshot on save** — each expense stores the exchange rate used at the time of entry; updating rates in settings never retroactively changes past expenses
- **Original amount display** — expenses entered abroad show the base-currency amount with the original foreign amount below in smaller text
- **Abroad mode info line** — when abroad mode is on, the add-expense form shows: "Abroad mode is on. Amounts entered in VND will be converted to INR at the rate of 0.00356 set in your currency settings."
- **Currency symbols everywhere** — amounts throughout the app (summary, table, reports, charts) now show the base currency symbol with proper spacing

### UI Improvements
- **Toggle switch** — abroad mode uses a clean iOS-style toggle instead of a raw checkbox
- **Summary cards rounded** — monthly summary amounts are rounded to whole numbers for a cleaner look on mobile
- **Summary card mobile fit** — reduced font size and padding on mobile to prevent overflow
- **Amount column widened** — table amount column accommodates symbol + number without clipping

### Database Migration (non-destructive)
- New columns on `expenses`: `original_amount`, `original_currency`, `exchange_rate` (nullable, existing rows unaffected)
- New table: `currency_rates` (code, name, rate, updated_at)
- New settings keys: `base_currency`, `abroad_mode`

## What's New in v3.3.0

### Reports Tab Redesign
- **Spending Trends moved to top** — chart is now the first thing you see on the Reports tab
- **Filters integrated into report table** — eliminated the separate filters card; filters now live inside the report table container alongside Expand All / Collapse All / Default View buttons
- **Dynamic filtering** — all filters apply instantly as you change them (no Apply button)
- **Search on Reports** — full-text search across all expense data, returns results as you type; overrides year/month filters when active
- **All Years option** — year dropdown now includes "All Years" for viewing data across all time
- **Visual feedback** — year/month labels dim when search is active to indicate they're overridden
- **Smart search UX** — changing a filter auto-clears search; minimum 2 characters before search fires
- **Better empty states** — "No results found" for search vs "No data for selected period" for filters

### Tracker Tab Simplified
- **Removed full filter panel** — no more Year, Month, Category dropdowns on the Tracker tab
- **Inline search bar** — clean search input directly above the expenses table; shows current month by default, search overrides to all data
- **Batch operations moved to Settings** — Batch Rename and Batch Category are now in Settings under a new "Batch Operations" section

### Date Range Selectors Removed
- **Year + Month replaces From/To** — date range pickers removed from both tabs; Year and Month dropdowns provide the same functionality more simply
- **Server endpoints updated** — `/api/expenses`, `/api/reports`, `/api/export/csv` all use year/month parameters instead of startDate/endDate

### UI Polish
- **Consistent button sizing** — Filters toggle button now matches the size of toolbar buttons across both tabs
- **Mobile layout** — toolbar buttons span full width and align properly on small screens

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

- **Add expenses** — date, details (with smart autocomplete + auto-category), category, amount, optional note
- **Per-expense notes** — attach a note to any expense; view/edit via the 📝 button in the actions column
- **Quick Notes scratchpad** — persistent scratchpad accessible from the header for general reminders and budget goals
- **Forecast** — project monthly cash flow with income and expense rows in a spreadsheet-style inline-editable grid; running cumulative balance
- **Multi-currency** — set base currency, define exchange rates, toggle abroad mode when traveling; amounts auto-convert and display with correct currency symbol
- **Monthly summary** — color-coded category totals with rounded amounts at a glance
- **Inline search** — search expenses as you type from the Tracker tab; searches across all data
- **Reports** — spending trends chart, yearly/monthly pivot table with expand/collapse, CSV export
- **Report filters** — year, month, category, and full-text search with dynamic instant filtering; search works within selected date range or across all data via "All" toggle
- **Batch operations** — rename details across entries, reassign categories in bulk (in Settings)
- **Copy expense** — duplicate an expense across multiple months
- **Categories** — up to 15, custom colors, rename propagates everywhere
- **Date format** — configurable (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- **App Lock** — 6-digit PIN with PBKDF2 hashing, recovery code, rate limiting
- **Dark mode** — theme toggle in Settings (Auto / Light / Dark); Auto follows device preference
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
| Charts | Chart.js 4.4.7 (bundled locally) |
| Security | PBKDF2 PIN hashing, express-session, rate limiting |
| PWA | Service worker, Web App Manifest |

## Data

All data stored in `data/expenses.db` (SQLite). Back up this file to preserve your expenses.
