# Task: Add a scoped personal access token API to Spend Less (expense-tracker-app)

You are working on the repository `dcvibecodes/expense-tracker-app` ("Spend Less"), a single-user Express 4 + SQLite (`sqlite3`, callback style) expense tracker.

## Goal

Add **personal access token authentication** (Bearer tokens) with **two simple predefined profiles** (read-only by default, write-enabled only when explicitly chosen) and **atomic, idempotent expense creation**, so an external agent (Instinct) can run budget queries and log or maintain single expenses on the owner's instruction without driving the browser UI through PIN unlock, session cookies and CSRF tokens.

Do NOT rebuild the existing JSON API. The routes already work. This task adds an auth layer and a hardened idempotency model on top of them, plus a small token-management UI in Settings.

## Reference point (not a template to copy blindly)

The sibling repo `dcvibecodes/remember` implements a similar token API in its `server.js` (`hashToken`, `bearerToken`, `tokenAuth`, `denyToken`, scope middleware, `/api/tokens` management endpoints). Use it as a design reference for naming and structure, but this task deliberately diverges from it where its design is weaker:

- Remember handles idempotency races with insert-then-delete-the-loser. Do NOT do that here. This task requires a single atomic transaction (see Work item 4).
- Remember has one fixed scope for all tokens. This task requires per-token profiles with read-only as the default.
- Remember allows keyless creates. This task requires an idempotency key on every token-authenticated create.

## Current architecture (source inventory, not a security audit)

The following was read from current `server.js` source to ground this task. Treat it as a map of what exists, not as a reviewed or audited surface.

- Middleware order today: `express.json()` -> `express-session` (7-day cookie) -> `csrfTokenMiddleware` -> `GET /api/csrf-token` route -> `csrfProtectionMiddleware` -> `authMiddleware` -> `compression()` -> static files.
- `authMiddleware` allows a fixed list of open paths (lock endpoints, static assets), **allows everything when no `app_lock` row exists** (fail-open unlocked mode), passes when `req.session.authenticated`, returns `401` JSON for blocked `/api/*` requests, and serves the lock page otherwise. Your changes must not let the fail-open mode weaken token rules (Work item 2).
- Tables are created with `CREATE TABLE IF NOT EXISTS` in the `db.serialize(...)` init block.
- Existing expense routes (keep byte-for-byte compatible for browser session clients):
  - `POST /api/expenses` - body `{ date, details, category, amount, original_amount?, original_currency?, exchange_rate?, note? }`; validates date (`YYYY-MM-DD`), non-empty details, category must exist; `amount` is in base currency (default INR); the `original_*` fields record foreign-currency spends. Responds `200 { id }`.
  - `GET /api/expenses` (query `year`|`all`, `month`, `category`, `search`, `through`; defaults to current month), `GET /api/expenses/:id`, `PUT /api/expenses/:id`, `DELETE /api/expenses/:id`.
  - `POST /api/expenses/check-duplicate` - advisory `{ date, details, amount }` check. Read-only semantics; keep as-is.
  - Reads: `GET /api/reports` (`year`, `month`, `day` or `startDay`+`endDay`, `category`, `search`), `GET /api/reports/cumulative`, `GET /api/categories`, `GET /api/suggestions`, `GET /api/details`, `GET /api/settings` (includes `base_currency` and `abroad_mode`), `GET /api/currency-rates`, `GET /api/charts`, `GET /api/charts/average`, `GET /api/export/csv`.
  - Session-only writes tokens must never reach: all `PATCH /api/expenses/batch*`, category create/update/delete/reorder, `PUT /api/settings`, `POST/DELETE /api/currency-rates*`, `POST /api/import/csv`, all `/api/extrapolate/*`, `PUT /api/scratchpad`, all `/api/lock/*`, and the token management routes you are adding.
- Every expense row returned by the read routes includes `amount`, `original_amount`, `original_currency`, `exchange_rate`, `category` and `note`. Callers rely on this to compute filtered totals (for example summing only rows with `original_currency = "VND"` while excluding a category such as Medical from a trip budget). Preserve these fields and their meanings exactly; Work item 8 tests this.

## Work items

### 1. Database tables

In the existing `db.serialize(...)` init block, add:

```sql
CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  profile TEXT NOT NULL DEFAULT 'read' CHECK (profile IN ('read','write')),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS idempotency_keys (
  token_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  method TEXT NOT NULL,
  route TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  expense_id INTEGER,
  created_at TEXT NOT NULL,
  PRIMARY KEY (token_id, key)
);
```

### 2. Token authentication middleware and ordering (fail-safe)

Add `hashToken` (SHA-256 hex), `bearerToken`, `tokenAuth`, `denyToken` (403 `{ error: 'This token is not allowed to use this endpoint' }`), and the token scope gate from Work item 3. Required middleware order: `express.json()` -> `express-session` -> `tokenAuth` -> token rate limiting (Work item 2 bullets) -> **token scope gate** -> `csrfTokenMiddleware` -> `GET /api/csrf-token` route -> `csrfProtectionMiddleware` -> `authMiddleware` -> everything else. The scope gate MUST run before any route handler that can terminate a request, including the early `GET /api/csrf-token` handler and every `/api/lock/*` handler: those are registered BEFORE `authMiddleware` today, so a gate placed after `authMiddleware` would let a token request be answered by them directly. Enforce these rules:

- If the `Authorization` header is absent, call `next()`; session flow proceeds exactly as today.
- If an `Authorization` header IS present but malformed, or the Bearer token is unknown or revoked, return `401 { error: 'Invalid or revoked token' }` immediately. A bad Bearer token must NEVER fall through to cookie auth or to the fail-open unlocked mode, on any route including `/api/csrf-token` and the lock routes.
- Rate-limit invalid-token failures per client IP (reuse the existing in-memory `rateLimit` helper with a `tokenfail:<ip>` key, 60 per hour) to blunt token guessing. Valid tokens get their own per-token bucket: `token:<tokenHash>`, 300 per hour, returning `429 { error: "Token rate limit reached. Slow down and try again later." }`.
- On success, set `req.token` (id, name, profile) and `req.tokenHash`; update `last_used_at` fire-and-forget.
- In `csrfProtectionMiddleware`: if `req.token` is set, call `next()` (a token client has no session CSRF token; the bearer secret is the credential). Session requests are unchanged.
- In `authMiddleware`: if `req.token` is set and the path starts with `/api/`, call `next()` (the scope middleware in Work item 3 decides). If `req.token` is set and the path is NOT under `/api/`, `denyToken(res)`; never serve app HTML or the lock page to a token. This applies regardless of whether an `app_lock` row exists.

### 3. Token profiles and scope enforcement (default-deny)

The scope gate (registered per Work item 2, before all route handlers) applies only when `req.token` is set. Anything not explicitly allowed for the token's profile gets `denyToken(res)`, including `/api/csrf-token`, all `/api/lock/*`, and all `/api/tokens*`. Path matching: mount the gate at the app root and match against the full original pathname (`req.path` when mounted at root). If you mount it on `/api` instead, `req.path` becomes mount-relative and every whitelist pattern must be written against that - pick exactly one convention, apply it uniformly, and rely on acceptance test 15 (`GET /api/csrf-token` with a token -> `403`) to catch any prefix mismatch.

Profile `read` (the default for every new token) allows exactly:

| Method | Path pattern |
| --- | --- |
| GET | `/api/expenses`, `/api/expenses/:id` (numeric id only), `/api/reports`, `/api/reports/cumulative`, `/api/categories`, `/api/suggestions`, `/api/details`, `/api/settings`, `/api/currency-rates`, `/api/charts`, `/api/charts/average`, `/api/export/csv` |
| POST | `/api/expenses/check-duplicate` |

Profile `write` allows everything in `read` plus:

| Method | Path pattern |
| --- | --- |
| POST | `/api/expenses` (idempotency key required, Work item 4) |
| PUT | `/api/expenses/:id` (numeric id only) |
| DELETE | `/api/expenses/:id` (numeric id only) |

`:id` must match digits only; `/api/expenses/batch`, `/api/expenses/batch-category`, `/api/expenses/batch-selected` and any future named sub-route are always denied. Keep the profiles to these two; do not build a custom per-route ACL system.

### 4. Atomic idempotent expense creation (tokens only)

For token-authenticated `POST /api/expenses` only (browser session behavior unchanged, keyless allowed there):

- Require an idempotency key from the `Idempotency-Key` header (fall back to `req.body.idempotency_key`). Missing -> `400 { error: "Idempotency-Key header is required for API creates" }`. Validate: string, trimmed length 1-200, else `400 { error: "Invalid idempotency key" }`.
- Compute a payload fingerprint over a canonical form of the create payload: object keys sorted; the declared numeric fields (`amount`, `original_amount`, `exchange_rate`) normalized as numbers ONLY after strict validation - each, when present, must be a finite number, so reject `NaN`, `Infinity` and non-numeric strings with `400` before fingerprinting (garbage and `null` must never collapse into the same fingerprint); string fields (`date`, `details`, `category`, `original_currency`, `note`) kept exact, no case folding or extra trimming beyond what the route already does. Exclude the `idempotency_key` body field itself. SHA-256 of the canonical JSON. Stable across key ordering and `250000` vs `"250000"` for the numeric fields only.
- Run the claim + validation + insert as ONE atomic transaction (`BEGIN IMMEDIATE` ... `COMMIT`, `ROLLBACK` on any failure). WARNING - connection ownership: this app shares one `sqlite3` connection across all requests, and `db.serialize()` only sequences this handler's own statements; it does NOT stop another request's handler from running statements on the same connection between your `BEGIN IMMEDIATE` and `COMMIT`. Do one of: (a) open a dedicated `sqlite3` connection used only by this transactional create path, or (b) put a module-level mutex (a promise queue) around the entire transaction AND around every other write path that uses the shared connection, so no foreign statement can interleave. Add bounded `SQLITE_BUSY` handling (a few retries with short backoff, then `503 { error: "Database busy, retry" }`). Never send the HTTP response until the transaction has committed or fully rolled back - no `res.*` call may run while the transaction outcome is still pending:
  1. `SELECT` the `(token_id, key)` row. If found:
     - `method`/`route`/`payload_hash` differ from this request -> `409 { error: "Idempotency key reused with a different payload" }` (roll back).
     - Match: if `expense_id` is set, load that expense. If it still exists -> `200 { id, deduplicated: true }`. If it was deleted since -> `200 { id, deduplicated: true, deleted: true }` and do NOT recreate it (document this in the README API section).
  2. Not found: `INSERT` the claim row (with `expense_id` NULL), run the existing validation, `INSERT` the expense, `UPDATE` the claim row with the new `expense_id`, `COMMIT`, respond `201 { id }`.
- Only with the connection-ownership rule above in place does `BEGIN IMMEDIATE` serialize writers so two concurrent replays with the same key produce exactly one committed expense; the second transaction observes the committed claim row and returns the deduplicated response. Verify this in acceptance test 10 instead of assuming it.
- Any failure between claim and commit (validation error, DB error, process restart) must leave NO claim row and NO expense row, so the same key can be safely retried. Test this explicitly (Work item 8).
- Keyless token create attempts are rejected as above; session (browser) creates keep today's exact `200 { id }` behavior with no key.

### 5. Token management endpoints + Settings UI

Session-only, and stricter than "session-only" elsewhere: these routes must require `req.session.authenticated === true` explicitly, so they stay reachable only to the unlocked owner. When no `app_lock` row exists (fail-open mode), they must still refuse: return `403 { error: "Set up the app lock before managing API tokens." }`. A token can never manage tokens (scope middleware already denies).

- `GET /api/tokens` -> `{ tokens: [{ id, name, profile, created_at, last_used_at, revoked_at }] }` (never `token_hash`).
- `POST /api/tokens` - body `{ name?, profile? }`: name max 80 chars, default "agent"; `profile` defaults to `read`; any value other than `read`/`write` -> `400`. Generate `crypto.randomBytes(48).toString("base64url")`, store only its SHA-256 hash, respond `201 { id, name, profile, token: <raw>, created_at }`. The raw token is shown exactly once, in this response only. Never log it, never return it again, never include it in any other endpoint.
- `POST /api/tokens/:id/revoke` (numeric id) -> set `revoked_at`; `404` if not found or already revoked.

Settings UI: an "API tokens" section: name input + profile selector (default "Read only"; "Read + write" requires an explicit choice and shows a one-line warning that it can add, edit and delete expenses); after creation show the raw token once in a copyable field with a "shown once, store it now" note; a table listing name, profile, created, last used, and a Revoke button per active token. Match existing Settings styling.

### 6. Caching, logging and transport hygiene

- Every response to a token-authenticated request, and every `/api/tokens*` response, must carry `Cache-Control: no-store`. Existing API routes reportedly already send no-cache headers; verify and extend to all new routes.
- `public/sw.js` currently caches API GET responses for offline use. It must NEVER cache a request carrying an `Authorization` header or any `/api/tokens*` response. Check the `fetch` handler and add that exclusion. Do not otherwise change offline behavior for the browser UI.
- Never `console.log` the raw token, the `Authorization` header, or token hashes. Use `$TEST_TOKEN` style placeholders in docs and tests; never commit a real-looking token.
- The app must be served over HTTPS for tokens to be used safely (they are bearer secrets). Note this in the README; do not assert or change the deployment config.

### 7. Export hygiene

`GET /api/export/csv` exports expenses only - leave it. Never add `personal_access_tokens` or `idempotency_keys` contents to any export or backup response.

### 8. Version and README

- Check `package.json` for the current version at implementation time and bump per the repo's convention; do not assume a specific number from this prompt.
- Add a "What's New" section at the top of `README.md` in the established style, plus an API section documenting: `Authorization: Bearer` auth, the two profiles and their exact allowlists, the required `Idempotency-Key` on token creates with the replay/`409`/`deleted:true` semantics, the per-token and invalid-token rate limits, and the HTTPS note.

## Acceptance tests (run all, against a DISPOSABLE local database - a temp copy or fresh data dir, never the real data)

Use a locally running instance with the lock configured. Create tokens via the session endpoint or UI. Synthetic data only; do not hardcode real trips, dates, or categories - use the placeholders shown.

1. No auth: `curl -i http://localhost:<port>/api/expenses` -> `401`.
2. Malformed header: `curl -i -H "Authorization: garbage" .../api/expenses` -> `401`, and the same against `/api/csrf-token` and `/api/lock/status` -> `401` (no fall-through).
3. Unknown/revoked token on any route -> `401`.
4. Read profile: `GET /api/expenses?year=all`, `/api/reports`, `/api/categories`, `/api/settings` -> `200`. `POST /api/expenses` with read profile -> `403`.
5. Write profile: keyless create -> `400` (key required). Malformed key (empty / 201 chars) -> `400`.
6. Create with key, synthetic INR entry:
   `POST /api/expenses` with `Idempotency-Key: k-inr-1`, body `{"date":"2026-01-15","details":"API TEST coffee","category":"<existing category>","amount":100,"note":"api test"}` -> `201 {"id":N}`.
7. VND entry with foreign-currency fields:
   `Idempotency-Key: k-vnd-1`, body `{"date":"2026-01-15","details":"API TEST banh mi","category":"<existing category>","amount":750,"original_amount":250000,"original_currency":"VND","exchange_rate":0.003,"note":"api test"}` -> `201`. Then `GET /api/expenses?year=2026&month=01` and confirm the row carries `original_amount: 250000`, `original_currency: "VND"`, `exchange_rate: 0.003`, `amount: 750`, so a caller can sum VND rows separately from INR-only rows and exclude any category (add a third synthetic row in a Medical-type category and confirm it is distinguishable by `category` for exclusion from a trip total).
8. Replay: repeat the `k-vnd-1` request -> `200` same id, `deduplicated: true`; exactly one such row exists.
9. Payload mismatch: same key `k-vnd-1`, different amount -> `409`.
10. Concurrency: fire two identical keyed creates at once (e.g., `xargs -P2` or `&`+`wait`) -> exactly one row committed, both responses return the same id.
11. Rollback: with a temporary fault injected after the claim insert (for example a temporary `throw` before the expense insert in a local-only edit, reverted after), confirm: no expense row, no claim row, and the same key then succeeds cleanly.
12. Restart durability: replay a previously committed key after a server restart -> `200`, `deduplicated: true`.
13. Deleted-resource replay: create with key, `DELETE` the expense with the write token, replay the same key + same payload -> `200` with the original id and `deleted: true`, and no new row is created.
14. Edit/delete with write token: `PUT` then `DELETE` on a synthetic row -> `200`; `GET` -> `404`. Cleanup all synthetic rows this way.
15. Scope denies with a write token (each `403`): `PATCH /api/expenses/batch`, `POST /api/categories`, `PUT /api/settings`, `POST /api/import/csv`, `GET /api/tokens`, `POST /api/lock/disable`, `GET /api/csrf-token`.
16. Token management auth: with no session cookie, `POST /api/tokens` -> `401` (locked) or `403` (if lock not configured). With a valid session, create a read-profile token, verify `GET /api/expenses` works and `POST /api/expenses` -> `403`. Revoke it -> subsequent use `401`.
17. Rate limits: temporarily lower the invalid-token limit locally, confirm repeated bad tokens -> eventual `429`; revert.
18. Cache headers: `curl -i` any token-authenticated GET and `POST /api/tokens` -> `Cache-Control: no-store` present. Inspect `sw.js` and confirm the Authorization/`/api/tokens` exclusion.
19. Session flow unchanged: PIN unlock, normal UI add/edit/delete, `GET /api/csrf-token` open, lock page for unauthenticated browsers, keyless browser create still `200 {id}`.

## Constraints and non-goals

- No new npm dependencies. Built-in `crypto` and the existing `rateLimit` helper only.
- Do not change the PIN/lock flow, session configuration, CSRF behavior for browser sessions, or any existing route's response shape for session clients.
- Additive migrations only (the two `CREATE TABLE IF NOT EXISTS` statements); no changes to existing data.
- Two predefined profiles only; no custom ACLs, per-token route pickers, expiry, or IP allowlists.
- No webhooks or change-notification machinery. API access only.
- A token profile is technical capability, not permission: document in the README API section that the calling agent must only create, edit, or delete entries the owner has explicitly instructed, and must never invent operations on its own.
- Work and test locally against a disposable database. Do NOT deploy to the production instance and do NOT touch production data as part of this task; deployment, with a database backup first, is a separate step the owner approves explicitly.
- Keep secrets out of git: tokens hashed at rest, raw token only in the creation response, placeholder tokens in docs and tests.
