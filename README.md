# Expenses+ v3.0.0

Personal expense tracking PWA with SQLite database.

## What's New in v3.0.0

### Security
- PIN hashing upgraded to PBKDF2 with random salt (100,000 iterations). Legacy hashes auto-migrate on next unlock.
- Rate limiting (10 attempts/minute) on unlock, disable, and recovery endpoints.
- Session secret persisted across server restarts.
- CSV export properly escapes special characters and prevents CSV injection.
- All user-generated content HTML-escaped to prevent XSS.

### UI Overhaul
- Bottom navigation bar (SVG icons + labels) — sticky top on desktop, fixed bottom on mobile.
- Downloads tab removed — CSV export integrated into Reports tab.
- Category add workflow collapsed behind a button (cleaner settings screen).
- Custom autocomplete dropdown replaces native datalist (consistent cross-browser).
- Action buttons (edit, copy, delete) restyled to match portfolio tracker.
- Theme toggle icon and sizing matched to portfolio tracker.
- Header slides up on mobile scroll — content now reclaims the space.
- Pull-to-refresh works on all tabs.
- Error toast for network failures.
- Service worker update prompt (no more silent hot-swaps).

### Accessibility
- Focus trapping in all modals.
- `aria-label` on all icon buttons.
- `aria-modal`, `aria-labelledby`, `aria-expanded` on interactive elements.
- `:focus-visible` outlines globally.
- Keyboard navigation for report expand/collapse rows.

### Bug Fixes
- Category reorder waits for DB writes before responding.
- Category rename wrapped in SQLite transaction.
- Copy expense date calculation rewritten (no more month overflow bugs).
- Report charts respect custom date range filters.
- Lock setup now authenticates the session immediately (no refresh needed to disable).

### Developer
- No new npm dependencies.
- All fixes use built-in Node.js crypto module.

## Setup

```bash
npm install
npm start
```

Runs at http://localhost:3000

## Tech Stack
- Node.js + Express
- SQLite3
- Vanilla JS frontend (PWA)
- Chart.js (CDN)
