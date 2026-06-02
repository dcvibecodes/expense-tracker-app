# Expense Tracker App — Complete Rewrite Prompt

You are a senior front-end developer. Below is a complete expense tracker application with a working backend. Your task is to **rewrite the frontend** (`public/index.html`, `public/app.js`, `public/styles.css`) to add three major features while keeping the existing tracker functionality intact.

## Architecture Overview

- **Backend**: Express.js + SQLite (`server.js`) — DO NOT MODIFY
- **Frontend**: Vanilla HTML/CSS/JS in `public/`
- **Important**: The backend (server.js) already has ALL APIs needed. You only need to update frontend files.

## What the App Currently Does (Tracker Tab — Keep This)

The main "Tracker" tab is a functional expense manager with:
- Add expense form (date, details, category dropdown, amount)
- Month/year period selector that filters the data
- Chart.js pie chart (by category) and bar chart (monthly overview) for selected month
- Summary cards (Total, Needs, Wants, Other amounts)
- Expenses table with Date, Details, Category, Amount columns and Edit/Delete buttons
- Filters: Start date, End date, Category filter, Search text
- Reset button, Export to Excel button, Batch Rename button
- Edit modal and Batch Rename modal

Keep ALL of this working. The DOM IDs and class names are listed below.

## Features to ADD (Three New Tabs)

The app needs a tab navigation system with 4 tabs: **Tracker**, **Reports**, **Downloads**, **Settings**.

### Tab Navigation
- 4 buttons at the top: Tracker | Reports | Downloads | Settings
- **Centered horizontally**, pill/tag style buttons
- Sticky at top of viewport
- Active tab has white background, blue text, subtle border/shadow
- Inactive tabs are transparent with muted text
- Smooth transitions on hover
- Clicking a tab shows only that tab's content, hides others

---

### 📊 Feature 1: Reports Tab — Hierarchical Pivot Table

#### Range Selector
A card at the top with: Year dropdown, Month dropdown (with "All Months" option), From date, To date, Apply button, Reset button.

Selection priority (in `loadReports()`):
1. If From date is set → use `startDate` and `endDate` params
2. Else if Year is set → use `year` param; if month also set → add `month` param
3. Else → default to current month (calculate first/last day of current month)

Button click handlers:
- **Apply** → calls `loadReports()`
- **Reset** → clears date fields, defaults to current year+month, calls `loadReports()`

Call this on tab init too.

#### API Endpoint
```
GET /api/reports?year=2026&month=5
GET /api/reports?startDate=2026-01-01&endDate=2026-01-31
```

Response format:
```json
[
  {
    "year": "2026",
    "total": 335465,
    "months": [
      {
        "month": "05",
        "total": 60184,
        "days": [
          {
            "day": "01",
            "total": 26428,
            "expenses": [
              { "id": 2, "date": "2026-05-01", "details": "Missy's pocket", "category": "needs", "amount": 1020 },
              { "id": 8, "date": "2026-05-01", "details": "Umsohsun rent", "category": "needs", "amount": 11000 }
            ]
          }
        ]
      }
    ]
  }
]
```

#### Pivot Table Requirements

**Column Structure (4 columns, use `<colgroup>` with `table-layout: fixed`)**:
| Column | Width | Alignment |
|--------|-------|-----------|
| Expand button | 44px | Center |
| Period / Details | Auto (fills rest) | Left |
| Category | 110px | Left |
| Amount | 130px | Right, ₹ format |

**Row Hierarchy (4 levels with expand/collapse)**:

1. **Year** (Level 1) — e.g. "2026"
   - Expanded by default (▼ button visible)
   - Shows total for the year in Amount column
   - Bold text, gray background (#f8fafc)
   - Thicker bottom border (2px solid #d1d5db)

2. **Month** (Level 2) — e.g. "May 2026"
   - Expanded by default (▼ button visible)
   - Indented with left border accent (3px solid #bfdbfe)
   - Light blue tint background (#fafbff)
   - Shows total for the month

3. **Day** (Level 3) — e.g. "01 May"
   - **COLLAPSED by default** (▶ button, body hidden)
   - Left border accent (2px solid #c7d2fe)
   - **When collapsed**: Show day label + comma-separated list of expenses in muted gray, truncated with ellipsis, e.g.: `01 May — Missy's pocket, Umsohsun rent, Mumbai home...`
   - **When expanded**: Hide the comma list, show individual expense rows below
   - Shows total for the day

4. **Individual expense** (Level 4) — leaf level, no expand button
   - Shows: (empty expand cell) | expense details | category badge | amount
   - Category uses `cat-badge needs/wants/other` class

**Visual Requirements**:
- Container has border (1px solid #e2e8f0) and border-radius (12px)
- Every row has a bottom border (1px solid #e2e8f0)
- Last row in each section has no bottom border
- Hover highlight on all rows (#f8fafc)
- Expand/collapse buttons are small (24x24px), gray background, subtle border, with ▼/▶ arrows
- All sub-tables use `table-layout: fixed` with matching colgroups so columns align perfectly
- The "Category" column for aggregate rows (year/month/day) is empty; for expense rows it shows the badge
- The "Amount" column is right-aligned with `font-variant-numeric: tabular-nums`
- Use `formatAmount()` for ₹ display (Indian number format)
- On mobile (≤640px), the report table should scroll horizontally — do NOT use the card-style layout from the tracker table

**Expand/Collapse Behavior**:
- Clicking ▶ on a collapsed day → show individual expenses, hide comma-separated text
- Clicking ▼ on an expanded day → hide individual expenses, show comma-separated text
- Year and month toggles show/hide their entire child content
- The expand buttons toggle class `expanded` and change textContent between "▼" and "▶"

**Implementation Note**: Use nested `<table>` elements inside a `<tr><td colspan="4">` approach. The body `<tr>` has class `report-group-body` and its display is toggled between `""` (visible) and `"none"` (hidden). The body contains a sub-table with matching colgroups.

---

### 📥 Feature 2: Downloads Tab — CSV Export

A simple page with:
- Same range selector layout as Reports (Year, Month, From/To dates, "All Data" checkbox, Download CSV button)
- When "All Data" is checked → disable year/month/from/to fields
- Clicking "Download CSV" → calls `/api/export/csv?params`
- Downloads a CSV file with columns: `Date, Details, Category, Amount`
- Default when nothing selected: current month

API: `GET /api/export/csv?year=2026&month=5` or `GET /api/export/csv?all=true` or `GET /api/export/csv?startDate=...&endDate=...`

The response is a CSV blob — use `fetch` → `response.blob()` → create download link.

---

### 🔒 Feature 3: App Lock (Settings Tab + Lock Overlay)

The backend provides these lock APIs:
- `GET /api/lock/status` → `{ locked: true/false }`
- `POST /api/lock/setup` with `{ pin: "123456" }` → `{ success: true, recoveryCode: "..." }`
- `POST /api/lock/unlock` with `{ pin: "123456" }` → `{ success: true }` or 401
- `POST /api/lock/disable` with `{ pin: "123456" }` → `{ success: true }` or 401
- `POST /api/lock/recovery` with `{ code: "..." }` → `{ success: true }` or 401

#### Lock Overlay (full-screen, shown on page load if locked)
- Fixed position, covers entire viewport
- Dark semi-transparent background with backdrop blur
- Centered white modal card
- Title: "Expense Tracker Locked"
- Subtitle: "Enter your 6-digit PIN to access the app."
- PIN input (type="password", maxlength=6, centered text, monospace font, letter-spacing for visual spacing)
- "Unlock" button
- Error message area (red, hidden by default)
- "Forgot PIN? Use recovery code" link → shows recovery code input + "Recover" button
- On successful unlock → hide overlay, proceed to load app data
- DOM IDs: `lock-overlay`, `lock-pin-input`, `lock-unlock-btn`, `lock-error`, `lock-recovery-link`, `show-recovery-btn`, `lock-recovery-section`, `lock-recovery-input`, `lock-recovery-submit`

#### Settings Page
- "App Lock" card
- **Enable section** (shown when lock is NOT active):
  - "Set a 6-digit PIN" label
  - Two PIN inputs side by side (PIN, Confirm PIN)
  - "Enable Lock" button
  - Message area
  - On success: show green success message with the recovery code in monospace (user-select: all so they can copy it)
- **Disable section** (shown when lock IS active):
  - "🔒 App is currently locked" badge
  - One PIN input + "Disable Lock" button
  - Message area
- DOM IDs: `settings-pin`, `settings-pin-confirm`, `settings-lock-enable`, `settings-lock-message`, `settings-disable-pin`, `settings-lock-disable`, `settings-disable-message`, `lock-setup-section`, `lock-disable-section`

#### On App Init (`initApp()`)
1. First, check lock status via `GET /api/lock/status`
2. If locked → show lock overlay, STOP — don't load any data
3. If unlocked → proceed with normal init (tracker data, reports, settings UI)

---

## Existing CSS Variables (Use These)
```css
:root {
  --bg: #f8fafc;
  --surface: rgba(255, 255, 255, 0.72);
  --surface-border: rgba(226, 232, 240, 0.8);
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --needs: #10b981;
  --needs-bg: #ecfdf5;
  --wants: #f59e0b;
  --wants-bg: #fffbeb;
  --other: #8b5cf6;
  --other-bg: #f5f3ff;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.07);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.08);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --font: "Inter","Manrope","Segoe UI",system-ui,sans-serif;
  --transition: 0.2s ease;
}
```

## Existing Helper Functions (Keep These)
- `localDateStr(d)` — Date object → "YYYY-MM-DD"
- `todayStr()` — new Date() → "YYYY-MM-DD"
- `formatDate(isoStr)` — "2026-05-01" → "01-05-2026"
- `formatAmount(value)` — number → Indian format with ₹ (use Intl.NumberFormat en-IN)
- `formatCategory(value)` — "needs" → "Needs"
- `lastDayOfMonth(year, month)` — returns Date object for last day
- `populateGenericYearPicker(selectElement)` — fills with year options (2026-2032)

## Global Constants
- `MONTH_NAMES` = ["January","February",...,"December"]
- Category badge classes: `cat-badge needs`, `cat-badge wants`, `cat-badge other`

## Important Rules
1. **DO NOT modify `server.js`** — it already has all the APIs
2. The background is a gradient: `radial-gradient(...)` + `linear-gradient(180deg, #f0f9ff, #f8fafc)`
3. Cards use: `background: var(--surface)`, `backdrop-filter: blur(12px)`, `border: 1px solid var(--surface-border)`, `border-radius: var(--radius-lg)`, `padding: 20px`, `margin-bottom: 16px`
4. The report table should NOT use the card-style mobile layout (data-label approach) — use horizontal scroll instead
5. On mobile (≤640px), the main tracker table can use card-style layout (hide thead, show data-label)
6. All buttons should have `min-height: 44px` for touch targets
7. Inputs/selects should have `min-height: 44px`
8. Month names: use from MONTH_NAMES array
9. Report day label format: `"01 May"` (day number + month name, no year)
10. Report month label format: `"May 2026"` (month name + year)
11. The category column in aggregate rows should be empty `<td></td>`, not completely omitted
12. The expand button column should have one button per aggregate row, not empty cell for the toggle itself

---

## Base Code Files

The complete project is at this path: `/Users/dc/Documents/DC-Workspace/expense-tracker-app/`

All 4 files (server.js, index.html, app.js, styles.css) are already in their CURRENT state. The backend (server.js) is complete with all APIs. You need to REWRITE the 3 frontend files:

1. **public/index.html** — Full HTML with all 4 tabs, lock overlay, modals
2. **public/app.js** — Full JavaScript with all features
3. **public/styles.css** — Full CSS with all styles

Keep the existing `server.js` untouched.
