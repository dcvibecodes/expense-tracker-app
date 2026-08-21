const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const compression = require("compression");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;

// --- Rate Limiting (in-memory) ---
const rateLimitMap = new Map(); // key -> { count, resetAt }
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 attempts per window

function rateLimit(key) {
  const now = Date.now();
  let entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(key, entry);
    return true;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return false;
  }
  return true;
}

// Periodic cleanup of expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, "expenses.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6b7280',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Seed default date_format setting
  db.get("SELECT value FROM settings WHERE key = 'date_format'", (err, row) => {
    if (!err && !row) {
      db.run("INSERT INTO settings (key, value) VALUES ('date_format', 'MM/DD/YYYY')");
    }
  });

  // Seed default base_currency setting
  db.get("SELECT value FROM settings WHERE key = 'base_currency'", (err, row) => {
    if (!err && !row) {
      db.run("INSERT INTO settings (key, value) VALUES ('base_currency', 'INR')");
    }
  });

  // Seed default abroad_mode setting (JSON: { active: false, currency: "" })
  db.get("SELECT value FROM settings WHERE key = 'abroad_mode'", (err, row) => {
    if (!err && !row) {
      db.run("INSERT INTO settings (key, value) VALUES ('abroad_mode', ?)", [JSON.stringify({ active: false, currency: "" })]);
    }
  });

  // Currency rates table
  db.run(`
    CREATE TABLE IF NOT EXISTS currency_rates (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Check if expenses table has the old CHECK constraint by trying to create the new schema
  // If the table already exists, we need to migrate it to remove the CHECK constraint
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='expenses'", (err, row) => {
    if (err) return;
    if (row && row.sql && row.sql.includes("CHECK")) {
      // Migrate: remove CHECK constraint
      db.serialize(() => {
        db.run("ALTER TABLE expenses RENAME TO expenses_old");
        db.run(`
          CREATE TABLE expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            details TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `);
        db.run("INSERT INTO expenses SELECT * FROM expenses_old");
        db.run("DROP TABLE expenses_old");
      });
    } else if (!row) {
      db.run(`
        CREATE TABLE expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          details TEXT NOT NULL,
          category TEXT NOT NULL,
          amount REAL NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    }
  });

  // Migrate: add multi-currency columns to expenses if missing
  db.all("PRAGMA table_info(expenses)", (err, cols) => {
    if (err) return;
    const colNames = cols.map(c => c.name);
    if (!colNames.includes("original_amount")) {
      db.run("ALTER TABLE expenses ADD COLUMN original_amount REAL");
    }
    if (!colNames.includes("original_currency")) {
      db.run("ALTER TABLE expenses ADD COLUMN original_currency TEXT");
    }
    if (!colNames.includes("exchange_rate")) {
      db.run("ALTER TABLE expenses ADD COLUMN exchange_rate REAL");
    }
    if (!colNames.includes("note")) {
      db.run("ALTER TABLE expenses ADD COLUMN note TEXT DEFAULT ''");
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS app_lock (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      pin_hash TEXT NOT NULL,
      pin_salt TEXT NOT NULL DEFAULT '',
      recovery_hash TEXT NOT NULL,
      recovery_salt TEXT NOT NULL DEFAULT '',
      locked INTEGER NOT NULL DEFAULT 1
    )
  `);

  // Migrate: add salt columns if missing (for existing DBs)
  db.all("PRAGMA table_info(app_lock)", (err, cols) => {
    if (err) return;
    const colNames = cols.map(c => c.name);
    if (!colNames.includes("pin_salt")) {
      db.run("ALTER TABLE app_lock ADD COLUMN pin_salt TEXT NOT NULL DEFAULT ''");
    }
    if (!colNames.includes("recovery_salt")) {
      db.run("ALTER TABLE app_lock ADD COLUMN recovery_salt TEXT NOT NULL DEFAULT ''");
    }
  });
  // Seed default categories if table is empty
  db.get("SELECT COUNT(*) AS cnt FROM categories", (err, row) => {
    if (!err && row && row.cnt === 0) {
      const defaults = [
        { name: "needs", color: "#10b981", sort_order: 1 },
        { name: "wants", color: "#f59e0b", sort_order: 2 },
        { name: "other", color: "#8b5cf6", sort_order: 3 },
      ];
      const stmt = db.prepare("INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)");
      for (const c of defaults) stmt.run(c.name, c.color, c.sort_order);
      stmt.finalize();
    }
  });
});

// --- Secure PIN hashing with PBKDF2 + salt ---
function hashPinSecure(pin, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(pin, salt, 100000, 32, "sha256").toString("hex");
  return { hash, salt };
}

function verifyPin(pin, storedHash, storedSalt) {
  const { hash } = hashPinSecure(pin, storedSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

// Legacy fallback for old unsalted SHA-256 hashes (migration path)
function hashPinLegacy(pin) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

function generateRecoveryCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

app.use(express.json());

// --- Session & Auth middleware ---
// Persist session secret across restarts
const secretPath = path.join(dataDir, ".session-secret");
let SESSION_SECRET;
if (fs.existsSync(secretPath)) {
  SESSION_SECRET = fs.readFileSync(secretPath, "utf8").trim();
} else {
  SESSION_SECRET = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(secretPath, SESSION_SECRET, "utf8");
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  }
}));

// --- CSRF Protection ---
// Exempt paths that need to work before auth or before the frontend has a token
const CSRF_EXEMPT_PATHS = [
  "/api/lock/status",
  "/api/lock/unlock",
  "/api/lock/recovery",
  "/api/lock/setup",
  "/api/lock/disable",
  "/api/csrf-token"
];

// Ensure every session has a CSRF token
function csrfTokenMiddleware(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  next();
}

// Validate CSRF token on state-changing requests
function csrfProtectionMiddleware(req, res, next) {
  // Only check POST, PUT, PATCH, DELETE
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();

  // Exempt certain paths
  if (CSRF_EXEMPT_PATHS.includes(req.path)) return next();

  // For requests with Content-Type: application/json, check X-CSRF-Token header
  const token = req.headers["x-csrf-token"];
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: "Invalid CSRF token. Please refresh and try again." });
  }
  next();
}

function authMiddleware(req, res, next) {
  const openPaths = [
    "/api/lock/status",
    "/api/lock/unlock",
    "/api/lock/recovery",
    "/api/lock/setup",
    "/api/lock/disable",
    "/manifest.json",
    "/sw.js",
    "/styles.css",
    "/app.js",
    "/chart.min.js",
    "/favicon.svg",
    "/favicon-32.png",
    "/favicon-16.png",
    "/favicon-32x32.png",
    "/favicon-16x16.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png"
];

  if (openPaths.includes(req.path)) {
    return next();
  }

  // If no lock is configured, allow all access
  db.get("SELECT id FROM app_lock WHERE id = 1", (err, lockRow) => {
    if (err || !lockRow) {
      return next();
    }

    // If session is authenticated, allow through
    if (req.session && req.session.authenticated) {
      return next();
    }

    // Not authenticated — block
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "Unauthorized. Please unlock the app first." });
    }

    // For browser requests, serve the lock page
    return res.send(getLockPage());
  });
}

function getLockPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expenses+ - Locked</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fafafa; display: flex; align-items: center; justify-content: center; min-height: 100vh; -webkit-font-smoothing: antialiased; }
    @media (prefers-color-scheme: dark) { body { background: #000000; } .lock-modal { background: #000000; border-color: #181818; } h2 { color: #e4e4e4; } .subtitle { color: #6a6a6a; } input[type="password"], input[type="text"] { background: #000000; border-color: #181818; color: #e4e4e4; } input:focus { border-color: #f5f5f5; box-shadow: 0 0 0 2px rgba(255,255,255,0.14); } button { background: #f5f5f5; color: #000000; } button:hover { opacity: 0.85; background: #f5f5f5; } .error { color: #f87171; } .recovery-link a { color: #f5f5f5; } }
    .lock-modal { background: #fff; border: 1px solid #e2e2e2; border-radius: 12px; padding: 36px 32px; width: 100%; max-width: 340px; text-align: center; }
    h2 { margin-bottom: 6px; font-size: 0.92rem; font-weight: 700; color: #1a1a1a; }
    .subtitle { color: #aaa; font-size: 0.72rem; margin: 0 0 18px; }
    input[type="password"], input[type="text"] { display: block; width: 100%; text-align: center; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 1.2rem; letter-spacing: 0.3em; margin-bottom: 10px; padding: 8px; border: 1px solid #e2e2e2; border-radius: 5px; background: #fafafa; color: #1a1a1a; outline: none; transition: border-color 0.15s; }
    input:focus { border-color: #111; box-shadow: 0 0 0 2px rgba(0,0,0,0.1); }
    button { width: 100%; padding: 8px 16px; background: #111; color: #fff; border: none; border-radius: 5px; font-size: 0.76rem; font-weight: 550; cursor: pointer; margin-bottom: 8px; min-height: 34px; font-family: inherit; transition: opacity 0.15s; }
    button:hover { opacity: 0.85; }
    .error { color: #c53030; font-size: 0.72rem; display: none; margin: 6px 0; }
    .recovery-link { font-size: 0.72rem; margin-top: 6px; }
    .recovery-link a { color: #111; font-weight: 600; text-decoration: none; cursor: pointer; }
    .recovery-link a:hover { text-decoration: underline; }
    .recovery-section { display: none; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="lock-modal">
    <h2>Expenses+ Locked</h2>
    <p class="subtitle">Enter your 6-digit PIN to access the app.</p>
    <input type="password" id="pin" maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="••••••" autofocus />
    <button id="unlock-btn" type="button">Unlock</button>
    <p class="error" id="error"></p>
    <p class="recovery-link"><a id="show-recovery">Forgot PIN? Use recovery code</a></p>
    <div class="recovery-section" id="recovery-section">
      <input type="text" id="recovery-input" placeholder="Recovery code" />
      <button id="recovery-btn" type="button">Recover</button>
    </div>
  </div>
  <script>
    const errorEl = document.getElementById("error");
    document.getElementById("unlock-btn").addEventListener("click", async () => {
      const pin = document.getElementById("pin").value;
      if (!pin) return;
      const resp = await fetch("/api/lock/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      if (resp.ok) { window.location.reload(); }
      else { const d = await resp.json(); errorEl.textContent = d.error || "Incorrect PIN"; errorEl.style.display = "block"; }
    });
    document.getElementById("pin").addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("unlock-btn").click(); });
    document.getElementById("show-recovery").addEventListener("click", () => { document.getElementById("recovery-section").style.display = "block"; });
    document.getElementById("recovery-btn").addEventListener("click", async () => {
      const code = document.getElementById("recovery-input").value;
      if (!code) return;
      const resp = await fetch("/api/lock/recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (resp.ok) { window.location.reload(); }
      else { const d = await resp.json(); errorEl.textContent = d.error || "Invalid code"; errorEl.style.display = "block"; }
    });
  </script>
</body>
</html>`;
}

// CSRF token endpoint — returns the current session's CSRF token
app.get("/api/csrf-token", (req, res) => {
  return res.json({ token: req.session.csrfToken || "" });
});

app.use(csrfTokenMiddleware);
app.use(csrfProtectionMiddleware);
app.use(authMiddleware);
app.use(compression());
app.use(express.static(path.join(__dirname, "public"), {
  etag: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html") || filePath.endsWith(".js") || filePath.endsWith(".css")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }
  }
}));

function isValidDate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isValidCategory(v, callback) {
  db.get("SELECT id FROM categories WHERE name = ?", [v], (err, row) => {
    callback(!err && !!row);
  });
}

// --- Categories API ---

app.get("/api/categories", (req, res) => {
  db.all("SELECT id, name, color, sort_order FROM categories ORDER BY sort_order ASC, id ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch categories." });
    return res.json(rows);
  });
});

app.post("/api/categories", (req, res) => {
  const { name, color } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Category name is required." });
  }
  const cleanName = name.trim().toLowerCase();
  if (cleanName.length > 30) {
    return res.status(400).json({ error: "Category name too long (max 30 chars)." });
  }

  db.get("SELECT COUNT(*) AS cnt FROM categories", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error." });
    if (row.cnt >= 15) return res.status(400).json({ error: "Maximum 15 categories allowed." });

    const sortOrder = row.cnt + 1;
    db.run("INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)", [cleanName, color || "#6b7280", sortOrder], function(insertErr) {
      if (insertErr) {
        if (insertErr.message.includes("UNIQUE")) return res.status(400).json({ error: "Category already exists." });
        return res.status(500).json({ error: "Failed to add category." });
      }
      return res.json({ id: this.lastID, name: cleanName, color: color || "#6b7280", sort_order: sortOrder });
    });
  });
});

app.put("/api/categories/:id", (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Category name is required." });
  }
  const cleanName = name.trim().toLowerCase();

  // Get old name to update expenses
  db.get("SELECT name FROM categories WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error." });
    if (!row) return res.status(404).json({ error: "Category not found." });

    const oldName = row.name;
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      db.run("UPDATE categories SET name = ?, color = ? WHERE id = ?", [cleanName, color || "#6b7280", id], function(updateErr) {
        if (updateErr) {
          db.run("ROLLBACK");
          if (updateErr.message.includes("UNIQUE")) return res.status(400).json({ error: "Category name already exists." });
          return res.status(500).json({ error: "Failed to update category." });
        }
        // Update all expenses with old category name
        if (oldName !== cleanName) {
          db.run("UPDATE expenses SET category = ? WHERE category = ?", [cleanName, oldName], (expErr) => {
            if (expErr) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: "Failed to update expenses." });
            }
            db.run("COMMIT");
            return res.json({ success: true });
          });
        } else {
          db.run("COMMIT");
          return res.json({ success: true });
        }
      });
    });
  });
});

app.delete("/api/categories/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT name FROM categories WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error." });
    if (!row) return res.status(404).json({ error: "Category not found." });

    // Check if expenses use this category
    db.get("SELECT COUNT(*) AS cnt FROM expenses WHERE category = ?", [row.name], (cntErr, cntRow) => {
      if (cntErr) return res.status(500).json({ error: "DB error." });
      if (cntRow.cnt > 0) return res.status(400).json({ error: `Cannot delete: ${cntRow.cnt} expense(s) are using this category. Reassign them first using the "Batch Category" option under "Filters & Batch Actions" on the Tracker tab.` });

      db.run("DELETE FROM categories WHERE id = ?", [id], function(delErr) {
        if (delErr) return res.status(500).json({ error: "Failed to delete category." });
        return res.json({ success: true });
      });
    });
  });
});

app.patch("/api/categories/reorder", (req, res) => {
  const { order } = req.body; // array of category ids in desired order
  if (!Array.isArray(order)) return res.status(400).json({ error: "order must be an array of ids." });

  db.serialize(() => {
    const stmt = db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?");
    for (let i = 0; i < order.length; i++) {
      stmt.run(i + 1, order[i]);
    }
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: "Failed to reorder categories." });
      return res.json({ success: true });
    });
  });
});
// --- Suggestions API (dominant category + amount for a given item) ---
app.get("/api/suggestions", (req, res) => {
  const { item } = req.query;

  if (!item || typeof item !== "string" || !item.trim()) {
    return res.json({ category: null, amount: null });
  }

  const q = item.trim().toLowerCase();
  const likeTerm = `%${q}%`;

  // Category: fuzzy match (LIKE) since items stay in the same category
  const catSql = `
    SELECT category, COUNT(*) AS freq
    FROM expenses
    WHERE LOWER(details) LIKE ?
    GROUP BY category
    ORDER BY freq DESC
    LIMIT 1
  `;

  // Amount: exact match only
  const amtSql = `
    SELECT amount, COUNT(*) AS freq
    FROM expenses
    WHERE LOWER(details) = ?
    GROUP BY amount
    ORDER BY freq DESC
    LIMIT 1
  `;

  db.get(catSql, [likeTerm], (catErr, catRow) => {
    if (catErr) {
      return res.json({ category: null, amount: null });
    }

    db.get(amtSql, [q], (amtErr, amtRow) => {
      if (amtErr) {
        return res.json({
          category: catRow ? catRow.category : null,
          amount: null
        });
      }

      return res.json({
        category: catRow ? catRow.category : null,
        amount: amtRow ? amtRow.amount : null
      });
    });
  });
});

app.post("/api/expenses", (req, res) => {
  const { date, details, category, amount, original_amount, original_currency, exchange_rate, note } = req.body;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }
  if (typeof details !== "string" || !details.trim()) {
    return res.status(400).json({ error: "Details are required." });
  }
  if (!category || typeof category !== "string") {
    return res.status(400).json({ error: "Category is required." });
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt)) {
    return res.status(400).json({ error: "Amount must be a valid number." });
  }

  // Validate optional currency fields
  const origAmt = original_amount != null ? Number(original_amount) : null;
  const origCurr = original_currency || null;
  const exRate = exchange_rate != null ? Number(exchange_rate) : null;
  const cleanNote = (typeof note === "string" ? note.trim() : "") || "";

  isValidCategory(category, (valid) => {
    if (!valid) return res.status(400).json({ error: "Invalid category." });
    const sql = "INSERT INTO expenses (date, details, category, amount, original_amount, original_currency, exchange_rate, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    db.run(sql, [date, details.trim(), category, amt, origAmt, origCurr, exRate, cleanNote], function onInsert(err) {
      if (err) return res.status(500).json({ error: "Failed to save expense." });
      return res.json({ id: this.lastID });
    });
  });
});

app.get("/api/expenses", (req, res) => {
  const { year, month, category, search, through } = req.query;

  const where = [];
  const params = [];
  const trimmedSearch = typeof search === "string" ? search.trim() : "";
  const useGlobalSearch = Boolean(trimmedSearch);

  if (!useGlobalSearch) {
  if (year && year !== "all") {
    where.push("substr(date, 1, 4) = ?");
    params.push(String(year));

    if (month) {
      where.push("substr(date, 6, 2) = ?");
      params.push(String(month).padStart(2, "0"));

      // Hide future dates on the Tracker tab
      if (through) {
        where.push("date <= ?");
        params.push(through);
      }
    }
  } else if (!year) {
    // No year specified — default to current month
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");

    where.push("substr(date, 1, 7) = ?");
    params.push(`${y}-${m}`);

    if (through) {
      where.push("date <= ?");
      params.push(through);
    }
  }

  // year === "all" — no date filter
}

  if (category && category !== "all") {
    where.push("category = ?");
    params.push(category);
  }

  if (trimmedSearch) {
    where.push("lower(details) LIKE ?");
    params.push(`%${trimmedSearch.toLowerCase()}%`);
  }

  const sql = `
    SELECT id, date, details, category, amount, original_amount, original_currency, exchange_rate, COALESCE(note, '') as note
    FROM expenses
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY date DESC, id DESC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch expenses." });
    return res.json(rows);
  });
});

app.get("/api/details", (req, res) => {
  // Order by most recent first so the latest casing/form of a phrase wins
  const sql = "SELECT details FROM expenses ORDER BY date DESC, id DESC";
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch details." });
    // Split comma-separated entries into individual phrases
    // Deduplicate case-insensitively, keeping the most recent form (first seen)
    const seen = new Map(); // lowercase -> original form
    for (const row of rows) {
      const parts = row.details.split(",");
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (!seen.has(key)) seen.set(key, trimmed);
      }
    }
    // Return in recency order (Map preserves insertion order = most recent first)
    return res.json([...seen.values()]);
  });
});

app.put("/api/expenses/:id", (req, res) => {
  const { id } = req.params;
  const { date, details, category, amount, original_amount, original_currency, exchange_rate, note } = req.body;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }
  if (typeof details !== "string" || !details.trim()) {
    return res.status(400).json({ error: "Details are required." });
  }
  if (!category || typeof category !== "string") {
    return res.status(400).json({ error: "Category is required." });
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt)) {
    return res.status(400).json({ error: "Amount must be a valid number." });
  }

  const origAmt = original_amount != null ? Number(original_amount) : null;
  const origCurr = original_currency || null;
  const exRate = exchange_rate != null ? Number(exchange_rate) : null;
  const cleanNote = (typeof note === "string" ? note.trim() : "") || "";

  isValidCategory(category, (valid) => {
    if (!valid) return res.status(400).json({ error: "Invalid category." });
    const sql = "UPDATE expenses SET date = ?, details = ?, category = ?, amount = ?, original_amount = ?, original_currency = ?, exchange_rate = ?, note = ? WHERE id = ?";
    db.run(sql, [date, details.trim(), category, amt, origAmt, origCurr, exRate, cleanNote, id], function onUpdate(err) {
      if (err) return res.status(500).json({ error: "Failed to update expense." });
      if (this.changes === 0) return res.status(404).json({ error: "Expense not found." });
      return res.json({ success: true });
    });
  });
});

app.get("/api/expenses/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT id, date, details, category, amount, original_amount, original_currency, exchange_rate, COALESCE(note, '') as note FROM expenses WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Failed to fetch expense." });
    if (!row) return res.status(404).json({ error: "Expense not found." });
    return res.json(row);
  });
});

app.delete("/api/expenses/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM expenses WHERE id = ?";
  db.run(sql, [id], function onDelete(err) {
    if (err) return res.status(500).json({ error: "Failed to delete expense." });
    if (this.changes === 0) return res.status(404).json({ error: "Expense not found." });
    return res.json({ success: true });
  });
});

app.patch("/api/expenses/batch", (req, res) => {
  const { oldDetails, newDetails } = req.body;
  if (typeof oldDetails !== "string" || !oldDetails.trim()) {
    return res.status(400).json({ error: "oldDetails is required." });
  }
  if (typeof newDetails !== "string" || !newDetails.trim()) {
    return res.status(400).json({ error: "newDetails is required." });
  }

  const sql = "UPDATE expenses SET details = ? WHERE details = ?";
  db.run(sql, [newDetails.trim(), oldDetails.trim()], function onBatch(err) {
    if (err) return res.status(500).json({ error: "Failed to batch update." });
    return res.json({ updated: this.changes });
  });
});

// --- Batch Category Reassignment ---
app.patch("/api/expenses/batch-category", (req, res) => {
  const { oldCategory, newCategory } = req.body;
  if (typeof oldCategory !== "string" || !oldCategory.trim()) {
    return res.status(400).json({ error: "oldCategory is required." });
  }
  if (typeof newCategory !== "string" || !newCategory.trim()) {
    return res.status(400).json({ error: "newCategory is required." });
  }

  isValidCategory(newCategory.trim(), (valid) => {
    if (!valid) return res.status(400).json({ error: "Target category does not exist." });
    const sql = "UPDATE expenses SET category = ? WHERE category = ?";
    db.run(sql, [newCategory.trim(), oldCategory.trim()], function(err) {
      if (err) return res.status(500).json({ error: "Failed to batch reassign." });
      return res.json({ updated: this.changes });
    });
  });
});

// --- Batch update selected report rows ---
app.patch("/api/expenses/batch-selected", (req, res) => {
  const { ids, category, details } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Select at least one expense." });
  }

  const cleanIds = [...new Set(ids.map(id => Number(id)).filter(Number.isInteger))];
  if (cleanIds.length === 0 || cleanIds.length > 500) {
    return res.status(400).json({ error: "Invalid selection." });
  }

  const updates = [];
  const params = [];

  if (typeof category === "string" && category.trim()) {
    updates.push("category = ?");
    params.push(category.trim());
  }

  if (typeof details === "string" && details.trim()) {
    updates.push("details = ?");
    params.push(details.trim());
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "Choose a batch action." });
  }

  const runUpdate = () => {
    const placeholders = cleanIds.map(() => "?").join(",");
    const sql = `UPDATE expenses SET ${updates.join(", ")} WHERE id IN (${placeholders})`;
    db.run(sql, [...params, ...cleanIds], function(err) {
      if (err) return res.status(500).json({ error: "Failed to update selected expenses." });
      return res.json({ updated: this.changes });
    });
  };

  if (updates.includes("category = ?")) {
    isValidCategory(category.trim(), (valid) => {
      if (!valid) return res.status(400).json({ error: "Target category does not exist." });
      runUpdate();
    });
  } else {
    runUpdate();
  }
});

// --- Duplicate Check ---
app.post("/api/expenses/check-duplicate", (req, res) => {
  const { date, details, amount } = req.body;
  if (!date || !details) return res.json({ duplicate: false });
  const sql = "SELECT COUNT(*) AS cnt FROM expenses WHERE date = ? AND lower(details) = ? AND amount = ?";
  db.get(sql, [date, details.trim().toLowerCase(), Number(amount)], (err, row) => {
    if (err) return res.json({ duplicate: false });
    return res.json({ duplicate: row.cnt > 0 });
  });
});

app.get("/api/charts", (req, res) => {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  const through = req.query.through;
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "Invalid month." });
  }
  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    return res.status(400).json({ error: "Invalid year." });
  }
  if (through && !isValidDate(through)) {
    return res.status(400).json({ error: "Invalid through date." });
  }

  const monthStr = String(month).padStart(2, "0");
  const ym = `${year}-${monthStr}`;

  const pieSql = `
    SELECT category, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE substr(date, 1, 7) = ?
    ${through ? "AND date <= ?" : ""}
    GROUP BY category
  `;
  const pieParams = through ? [ym, through] : [ym];

  const barSql = `
    SELECT substr(date, 1, 7) AS year_month, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE substr(date, 1, 4) = ?
    GROUP BY year_month
    ORDER BY year_month ASC
  `;

  db.all(pieSql, pieParams, (pieErr, pieRows) => {
    if (pieErr) return res.status(500).json({ error: "Failed to fetch pie data." });
    db.all(barSql, [String(year)], (barErr, barRows) => {
      if (barErr) return res.status(500).json({ error: "Failed to fetch bar data." });

      // Build pie data dynamically from actual categories in data
      const pie = {};
      for (const row of pieRows) {
        pie[row.category] = Number(row.total) || 0;
      }

      const barMap = {};
      for (let i = 1; i <= 12; i += 1) {
        const k = `${year}-${String(i).padStart(2, "0")}`;
        barMap[k] = 0;
      }
      for (const row of barRows) {
        barMap[row.year_month] = Number(row.total) || 0;
      }

      return res.json({
        pie,
        bar: barMap
      });
    });
  });
});

// Returns per-category baseline pies for the summary comparison:
// lastMonth (1mo), avg3 (average of last 3 months), avg6 (average of last 6 months)
app.get("/api/charts/average", (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  const through = req.query.through;
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "Invalid month." });
  }
  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    return res.status(400).json({ error: "Invalid year." });
  }

  // Day-of-month of "today", used for a fair same-day cutoff on past months
  // (e.g. today is the 20th → each past month only counts up to the 20th)
  let day = 28;
  if (through && isValidDate(through)) {
    day = Number(through.split("-")[2]);
  }

  // Build the 6 months immediately before the current month
  const months = [];
  for (let i = 1; i <= 6; i += 1) {
    const d = new Date(year, month - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    const lastDay = new Date(y, m, 0).getDate();
    const cutoff = `${ym}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
    months.push({ ym, cutoff, pie: null, grandTotal: 0 });
  }

  const pieSql = `
    SELECT category, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE substr(date, 1, 7) = ?
    AND date <= ?
    GROUP BY category
  `;

  let pending = months.length;
  let sent = false;

  for (const mm of months) {
    db.all(pieSql, [mm.ym, mm.cutoff], (err, rows) => {
      if (err) {
        if (!sent) {
          sent = true;
          return res.status(500).json({ error: "Failed to fetch chart data." });
        }
        return;
      }
      const pie = {};
      for (const row of rows) pie[row.category] = Number(row.total) || 0;
      mm.pie = pie;
      mm.grandTotal = Object.values(pie).reduce((s, v) => s + v, 0);

      pending -= 1;
      if (pending === 0 && !sent) {
        sent = true;

        // Only months that actually had any spending count toward the average,
        // so a brand-new account averages over what truly exists.
        const valid = new Set(months.filter((m) => m.grandTotal > 0));

        const averagePie = (count) => {
          const included = months.slice(0, count).filter((m) => valid.has(m));
          if (!included.length) return {};
          const sum = {};
          for (const m of included) {
            for (const [cat, val] of Object.entries(m.pie)) {
              sum[cat] = (sum[cat] || 0) + val;
            }
          }
          const avg = {};
          for (const [cat, val] of Object.entries(sum)) avg[cat] = val / included.length;
          return avg;
        };

        return res.json({
          lastMonth: months[0] ? months[0].pie : {},
          avg3: averagePie(3),
          avg6: averagePie(6)
        });
      }
    });
  }
});

// --- Reports API ---

app.get("/api/reports", (req, res) => {
  const { year, month, day, startDay, endDay, category, search } = req.query;
  const where = [];
  const params = [];
  const trimmedSearch = typeof search === "string" ? search.trim() : "";
  const dayNumber = Number.parseInt(day, 10);
  const startDayNumber = Number.parseInt(startDay, 10);
  const endDayNumber = Number.parseInt(endDay, 10);

  if (trimmedSearch) {
    // Search text filter (combinable with year/month)
    where.push("lower(details) LIKE ?");
    params.push(`%${trimmedSearch.toLowerCase()}%`);
  }

  if (year && year !== "all") {
    where.push("substr(date, 1, 4) = ?");
    params.push(String(year));
    if (month) {
      where.push("substr(date, 6, 2) = ?");
      params.push(String(month).padStart(2, "0"));
      if (dayNumber >= 1 && dayNumber <= 31) {
        where.push("substr(date, 9, 2) = ?");
        params.push(String(dayNumber).padStart(2, "0"));
      } else if (startDayNumber >= 1 && startDayNumber <= 31 && endDayNumber >= 1 && endDayNumber <= 31) {
        const rangeStart = Math.min(startDayNumber, endDayNumber);
        const rangeEnd = Math.max(startDayNumber, endDayNumber);
        where.push("substr(date, 9, 2) BETWEEN ? AND ?");
        params.push(String(rangeStart).padStart(2, "0"), String(rangeEnd).padStart(2, "0"));
      }
    }
  } else if (year === "all" && month) {
    // All years but specific month selected
    where.push("substr(date, 6, 2) = ?");
    params.push(String(month).padStart(2, "0"));
  } else if (!year && !trimmedSearch) {
    // No year specified at all and no search — default to current month
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    where.push("substr(date, 1, 7) = ?");
    params.push(`${y}-${m}`);
  }
  // year === "all" with no month — no date filter, return everything

  if (category && category !== "all") {
    where.push("category = ?");
    params.push(category);
  }

  const sql = `SELECT id, date, details, category, amount, original_amount, original_currency, exchange_rate, COALESCE(note, '') as note FROM expenses
${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY date DESC, id DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch report data." });
    return res.json(rows);
  });
});

// --- CSV Export API ---

app.get("/api/export/csv", (req, res) => {
  const { year, month, day, startDay, endDay, category, all, search } = req.query;
  const where = [];
  const params = [];
  const trimmedSearch = typeof search === "string" ? search.trim() : "";
  const dayNumber = Number.parseInt(day, 10);
  const startDayNumber = Number.parseInt(startDay, 10);
  const endDayNumber = Number.parseInt(endDay, 10);

  if (trimmedSearch) {
    where.push("lower(details) LIKE ?");
    params.push(`%${trimmedSearch.toLowerCase()}%`);
  }

  if (year && year !== "all") {
    where.push("substr(date, 1, 4) = ?");
    params.push(String(year));
    if (month) {
      where.push("substr(date, 6, 2) = ?");
      params.push(String(month).padStart(2, "0"));
      if (dayNumber >= 1 && dayNumber <= 31) {
        where.push("substr(date, 9, 2) = ?");
        params.push(String(dayNumber).padStart(2, "0"));
      } else if (startDayNumber >= 1 && startDayNumber <= 31 && endDayNumber >= 1 && endDayNumber <= 31) {
        const rangeStart = Math.min(startDayNumber, endDayNumber);
        const rangeEnd = Math.max(startDayNumber, endDayNumber);
        where.push("substr(date, 9, 2) BETWEEN ? AND ?");
        params.push(String(rangeStart).padStart(2, "0"), String(rangeEnd).padStart(2, "0"));
      }
    }
  } else if ((all === "true" || year === "all") && month) {
    // All years but specific month
    where.push("substr(date, 6, 2) = ?");
    params.push(String(month).padStart(2, "0"));
  } else if (!year && !trimmedSearch) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    where.push("substr(date, 1, 7) = ?");
    params.push(`${y}-${m}`);
  }

  if (category && category !== "all") {
    where.push("category = ?");
    params.push(category);
  }

  const sql = `SELECT date, details, category, amount, COALESCE(note, '') as note FROM expenses ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY date ASC, id ASC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to export." });

    let csv = "Date,Details,Category,Amount,Note\n";
    for (const r of rows) {
      // Proper CSV escaping: wrap in quotes if contains comma, quote, or newline
      // Escape double quotes by doubling them
      // Prefix with single quote to prevent CSV injection (formulas starting with =, +, -, @)
      let details = r.details;
      if (/[,"\r\n]/.test(details) || /^[=+\-@\t\r]/.test(details)) {
        details = '"' + details.replace(/"/g, '""') + '"';
      }
      let catName = r.category.charAt(0).toUpperCase() + r.category.slice(1);
      let noteVal = r.note || "";
      if (/[,"\r\n]/.test(noteVal) || /^[=+\-@\t\r]/.test(noteVal)) {
        noteVal = '"' + noteVal.replace(/"/g, '""') + '"';
      }
      csv += `${r.date},${details},${catName},${r.amount},${noteVal}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
    return res.send(csv);
  });
});

// --- CSV Import API ---

// Simple CSV parser that handles quoted fields, commas inside quotes,
// escaped quotes (doubled ""), and newlines inside quoted fields.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote (doubled "")
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        // Handle \r\n and \n line endings
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        // Skip empty rows (e.g. trailing newline)
        if (row.length > 1 || row[0].trim() !== "") {
          rows.push(row);
        }
        row = [];
      } else {
        field += ch;
      }
    }
  }

  // Last field/row (no trailing newline)
  row.push(field);
  if (row.length > 1 || row[0].trim() !== "") {
    rows.push(row);
  }

  return rows;
}

// Strip CSV injection protection prefix (leading single quote) added by export
function stripInjectionPrefix(value) {
  if (typeof value !== "string") return value;
  return value.replace(/^'/, "");
}

app.post("/api/import/csv", (req, res) => {
  const { csv } = req.body;
  if (typeof csv !== "string" || !csv.trim()) {
    return res.status(400).json({ error: "CSV content is required." });
  }
  if (csv.length > 1024 * 1024) {
    return res.status(400).json({ error: "CSV file too large (max 1MB)." });
  }

  const rows = parseCSV(csv);
  if (rows.length === 0) {
    return res.status(400).json({ error: "No data found in CSV." });
  }

  // Check for header row
  let startIndex = 0;
  const firstRow = rows[0].map(c => c.trim().toLowerCase());
  if (firstRow.includes("date") && firstRow.includes("details") && firstRow.includes("amount")) {
    startIndex = 1;
  }

  const dataRows = rows.slice(startIndex);
  if (dataRows.length === 0) {
    return res.status(400).json({ error: "No data rows found in CSV." });
  }
  if (dataRows.length > 5000) {
    return res.status(400).json({ error: "Too many rows (max 5,000)." });
  }

  // Load existing categories for case-insensitive matching
  db.all("SELECT name FROM categories", (catErr, catRows) => {
    if (catErr) return res.status(500).json({ error: "DB error." });

    const existingCategories = new Set(catRows.map(r => r.name.toLowerCase()));
    const categoriesToCreate = new Map(); // lowercase name -> original name

    // First pass: validate all rows and collect categories to create
    const validRows = [];
    const errors = [];
    let skippedDuplicates = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const raw = dataRows[i];
      const rowNum = i + 1 + startIndex;

      // Skip completely empty rows
      if (raw.every(c => !c || !c.trim())) continue;

      // Pad short rows
      while (raw.length < 4) raw.push("");

      const date = (raw[0] || "").trim();
      const details = stripInjectionPrefix((raw[1] || "").trim());
      const categoryRaw = stripInjectionPrefix((raw[2] || "").trim());
      const amountRaw = stripInjectionPrefix((raw[3] || "").trim());
      const note = raw.length > 4 ? stripInjectionPrefix((raw[4] || "").trim()) : "";

      // Validate date
      if (!isValidDate(date)) {
        errors.push(`Row ${rowNum}: invalid date "${date}" (use YYYY-MM-DD).`);
        continue;
      }

      // Validate details
      if (!details) {
        errors.push(`Row ${rowNum}: details are required.`);
        continue;
      }

      // Validate amount
      const amount = Number(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push(`Row ${rowNum}: invalid amount "${amountRaw}".`);
        continue;
      }

      // Validate category
      if (!categoryRaw) {
        errors.push(`Row ${rowNum}: category is required.`);
        continue;
      }
      const catLower = categoryRaw.toLowerCase();
      if (!existingCategories.has(catLower)) {
        categoriesToCreate.set(catLower, categoryRaw);
      }

      validRows.push({ date, details, category: catLower, amount, note, rowNum });
    }

    // Check category limit
    const totalCategoriesAfter = existingCategories.size + categoriesToCreate.size;
    if (totalCategoriesAfter > 15) {
      const overflow = totalCategoriesAfter - 15;
      return res.status(400).json({
        error: `Import would create ${categoriesToCreate.size} new categor${categoriesToCreate.size === 1 ? "y" : "ies"}, exceeding the 15-category limit by ${overflow}. Please merge or rename categories first.`
      });
    }

    // Create missing categories
    const createCategory = (name, callback) => {
      db.run("INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)", [name, "#6b7280", 0], callback);
    };

    const createAllCategories = (names, callback) => {
      if (names.length === 0) return callback();
      const [first, ...rest] = names;
      createCategory(first, (err) => {
        if (err) return callback(err);
        createAllCategories(rest, callback);
      });
    };

    createAllCategories([...categoriesToCreate.keys()], (createErr) => {
      if (createErr) return res.status(500).json({ error: "Failed to create categories." });

      // Insert valid rows, skipping exact duplicates
      const insertRow = (row, callback) => {
        db.get(
          "SELECT COUNT(*) AS cnt FROM expenses WHERE date = ? AND lower(details) = ? AND amount = ?",
          [row.date, row.details.toLowerCase(), row.amount],
          (dupErr, dupRow) => {
            if (dupErr) return callback(dupErr);
            if (dupRow.cnt > 0) {
              skippedDuplicates++;
              return callback();
            }
            db.run(
              "INSERT INTO expenses (date, details, category, amount, note) VALUES (?, ?, ?, ?, ?)",
              [row.date, row.details, row.category, row.amount, row.note],
              (insErr) => callback(insErr)
            );
          }
        );
      };

      const insertAll = (rows, callback) => {
        if (rows.length === 0) return callback();
        const [first, ...rest] = rows;
        insertRow(first, (err) => {
          if (err) return callback(err);
          insertAll(rest, callback);
        });
      };

      insertAll(validRows, (insErr) => {
        if (insErr) return res.status(500).json({ error: "Failed to import expenses." });

        const imported = validRows.length - skippedDuplicates;
        return res.json({
          imported,
          skipped: skippedDuplicates,
          errors,
          createdCategories: categoriesToCreate.size
        });
      });
    });
  });
});

// --- Lock APIs ---

app.get("/api/lock/status", (req, res) => {
  db.get("SELECT locked FROM app_lock WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    return res.json({ locked: row ? Boolean(row.locked) : false });
  });
});

app.post("/api/lock/setup", (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: "PIN must be exactly 6 digits." });
  }

  const recoveryCode = generateRecoveryCode();
  const pinResult = hashPinSecure(pin);
  const recoveryResult = hashPinSecure(recoveryCode);

  db.run(
    "INSERT OR REPLACE INTO app_lock (id, pin_hash, pin_salt, recovery_hash, recovery_salt, locked) VALUES (1, ?, ?, ?, ?, 1)",
    [pinResult.hash, pinResult.salt, recoveryResult.hash, recoveryResult.salt],
    (err) => {
      if (err) return res.status(500).json({ error: "Failed to setup lock." });
      req.session.authenticated = true;
      return res.json({ success: true, recoveryCode });
    }
  );
});

app.post("/api/lock/unlock", (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: "PIN required." });

  // Rate limiting
  const clientKey = `unlock:${req.ip}`;
  if (!rateLimit(clientKey)) {
    return res.status(429).json({ error: "Too many attempts. Please wait a minute." });
  }

  db.get("SELECT pin_hash, pin_salt FROM app_lock WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "No lock configured." });

    let valid = false;
    if (row.pin_salt) {
      // New secure hash
      valid = verifyPin(pin, row.pin_hash, row.pin_salt);
    } else {
      // Legacy unsalted hash — verify and migrate
      valid = (hashPinLegacy(pin) === row.pin_hash);
      if (valid) {
        // Migrate to secure hash on successful unlock
        const newResult = hashPinSecure(pin);
        db.run("UPDATE app_lock SET pin_hash = ?, pin_salt = ? WHERE id = 1", [newResult.hash, newResult.salt]);
      }
    }

    if (!valid) {
      return res.status(401).json({ error: "Incorrect PIN." });
    }
    req.session.authenticated = true;
    return res.json({ success: true });
  });
});

app.post("/api/lock/disable", (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: "PIN required." });

  // Rate limiting
  const clientKey = `disable:${req.ip}`;
  if (!rateLimit(clientKey)) {
    return res.status(429).json({ error: "Too many attempts. Please wait a minute." });
  }

  db.get("SELECT pin_hash, pin_salt FROM app_lock WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "No lock configured." });

    let valid = false;
    if (row.pin_salt) {
      valid = verifyPin(pin, row.pin_hash, row.pin_salt);
    } else {
      valid = (hashPinLegacy(pin) === row.pin_hash);
    }

    if (!valid) {
      return res.status(401).json({ error: "Incorrect PIN." });
    }
    db.run("DELETE FROM app_lock WHERE id = 1", (delErr) => {
      if (delErr) return res.status(500).json({ error: "Failed to disable lock." });
      return res.json({ success: true });
    });
  });
});

app.post("/api/lock/recovery", (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Recovery code required." });

  // Rate limiting
  const clientKey = `recovery:${req.ip}`;
  if (!rateLimit(clientKey)) {
    return res.status(429).json({ error: "Too many attempts. Please wait a minute." });
  }

  db.get("SELECT recovery_hash, recovery_salt FROM app_lock WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "No lock configured." });

    const codeUpper = code.toUpperCase();
    let valid = false;
    if (row.recovery_salt) {
      valid = verifyPin(codeUpper, row.recovery_hash, row.recovery_salt);
    } else {
      valid = (hashPinLegacy(codeUpper) === row.recovery_hash);
    }

    if (!valid) {
      return res.status(401).json({ error: "Invalid recovery code." });
    }
    req.session.authenticated = true;
    db.run("DELETE FROM app_lock WHERE id = 1", (delErr) => {
      if (delErr) return res.status(500).json({ error: "Failed to recover." });
      return res.json({ success: true });
    });
  });
});

// --- Settings APIs ---

app.get("/api/settings", (req, res) => {
  db.all("SELECT key, value FROM settings", (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    // Defaults
    if (!result.date_format) result.date_format = "MM/DD/YYYY";
    if (!result.base_currency) result.base_currency = "INR";
    if (!result.abroad_mode) result.abroad_mode = JSON.stringify({ active: false, currency: "" });
    res.json(result);
  });
});

app.put("/api/settings", (req, res) => {
  const { date_format, base_currency, abroad_mode } = req.body;
  const updates = [];

  if (date_format !== undefined) {
    const allowed = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];
    if (!allowed.includes(date_format)) {
      return res.status(400).json({ error: "Invalid date format." });
    }
    updates.push(["date_format", date_format]);
  }

  if (base_currency !== undefined) {
    if (typeof base_currency !== "string" || !base_currency.trim()) {
      return res.status(400).json({ error: "Invalid base currency." });
    }
    const ALLOWED_CURRENCIES = [
      "INR","USD","EUR","GBP","JPY","CNY","AUD","CAD","CHF","SGD","HKD","NZD",
      "KRW","THB","VND","MYR","PHP","IDR","TWD","AED","SAR","BDT","LKR","NPR",
      "PKR","BRL","MXN","ZAR","RUB","TRY","PLN","SEK","NOK","DKK","HUF","CZK"
    ];
    const code = base_currency.trim().toUpperCase();
    if (!ALLOWED_CURRENCIES.includes(code)) {
      return res.status(400).json({ error: "Unsupported currency." });
    }
    updates.push(["base_currency", code]);
  }

  if (abroad_mode !== undefined) {
    // Validate it's a proper object with active and currency
    if (typeof abroad_mode !== "object" || abroad_mode === null) {
      return res.status(400).json({ error: "Invalid abroad_mode." });
    }
    updates.push(["abroad_mode", JSON.stringify(abroad_mode)]);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No settings provided." });
  }

  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of updates) {
    stmt.run(key, value);
  }
  stmt.finalize((err) => {
    if (err) return res.status(500).json({ error: "Failed to save settings." });
    res.json({ success: true });
  });
});

// --- Currency Rates API ---

// --- Scratchpad API (single persistent note) ---
app.get("/api/scratchpad", (req, res) => {
  db.get("SELECT value FROM settings WHERE key = 'scratchpad'", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    return res.json({ text: row ? row.value : "" });
  });
});

app.put("/api/scratchpad", (req, res) => {
  const { text } = req.body;
  if (typeof text !== "string") {
    return res.status(400).json({ error: "Text is required." });
  }
  if (text.length > 10000) {
    return res.status(400).json({ error: "Note too long (max 10,000 characters)." });
  }
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('scratchpad', ?)", [text], (err) => {
    if (err) return res.status(500).json({ error: "Failed to save." });
    return res.json({ success: true });
  });
});

app.get("/api/currency-rates", (req, res) => {
  db.all("SELECT code, name, rate, updated_at FROM currency_rates ORDER BY code ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch currency rates." });
    return res.json(rows);
  });
});

app.post("/api/currency-rates", (req, res) => {
  const { code, name, rate } = req.body;
  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "Currency code is required." });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Currency name is required." });
  }
  const rateNum = Number(rate);
  if (!Number.isFinite(rateNum) || rateNum <= 0) {
    return res.status(400).json({ error: "Rate must be a positive number." });
  }
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length > 5) {
    return res.status(400).json({ error: "Currency code too long (max 5 chars)." });
  }

  db.run(
    "INSERT OR REPLACE INTO currency_rates (code, name, rate, updated_at) VALUES (?, ?, ?, datetime('now'))",
    [cleanCode, name.trim(), rateNum],
    function(err) {
      if (err) return res.status(500).json({ error: "Failed to save currency rate." });
      return res.json({ success: true, code: cleanCode, name: name.trim(), rate: rateNum });
    }
  );
});

app.delete("/api/currency-rates/:code", (req, res) => {
  const { code } = req.params;
  db.run("DELETE FROM currency_rates WHERE code = ?", [code.toUpperCase()], function(err) {
    if (err) return res.status(500).json({ error: "Failed to delete currency rate." });
    if (this.changes === 0) return res.status(404).json({ error: "Currency not found." });
    return res.json({ success: true });
  });
});

// --- Extrapolate Tables ---
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS extrap_income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(month, label)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS extrap_oneoff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(month, label)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS extrap_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      start_month TEXT NOT NULL,
      num_months INTEGER NOT NULL DEFAULT 6,
      starting_balance REAL NOT NULL DEFAULT 0
    )
  `);

  // Migrate: add starting_balance if missing
  db.all("PRAGMA table_info(extrap_settings)", (err, cols) => {
    if (err || !cols) return;
    const colNames = cols.map(c => c.name);
    if (!colNames.includes("starting_balance")) {
      db.run("ALTER TABLE extrap_settings ADD COLUMN starting_balance REAL NOT NULL DEFAULT 0");
    }
  });

  // Migrate: add sort_order if missing
  db.all("PRAGMA table_info(extrap_income)", (err, cols) => {
    if (err || !cols) return;
    const colNames = cols.map(c => c.name);
    if (!colNames.includes("sort_order")) {
      db.run("ALTER TABLE extrap_income ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
    }
    if (!colNames.includes("note")) {
      db.run("ALTER TABLE extrap_income ADD COLUMN note TEXT DEFAULT ''");
    }
  });
  db.all("PRAGMA table_info(extrap_oneoff)", (err, cols) => {
    if (err || !cols) return;
    const colNames = cols.map(c => c.name);
    if (!colNames.includes("sort_order")) {
      db.run("ALTER TABLE extrap_oneoff ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
    }
    if (!colNames.includes("note")) {
      db.run("ALTER TABLE extrap_oneoff ADD COLUMN note TEXT DEFAULT ''");
    }
  });

  // Migrate existing tables to add UNIQUE constraint if missing
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='extrap_income'", (err, row) => {
    if (err) return;
    if (row && row.sql && !row.sql.includes("UNIQUE")) {
      db.serialize(() => {
        db.run("ALTER TABLE extrap_income RENAME TO extrap_income_old");
        db.run(`CREATE TABLE extrap_income (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          month TEXT NOT NULL,
          label TEXT NOT NULL,
          amount REAL NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          UNIQUE(month, label)
        )`);
        db.run("INSERT OR IGNORE INTO extrap_income (id, month, label, amount, sort_order) SELECT id, month, label, amount, COALESCE(sort_order, 0) FROM extrap_income_old");
        db.run("DROP TABLE extrap_income_old");
      });
    }
  });
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='extrap_oneoff'", (err, row) => {
    if (err) return;
    if (row && row.sql && !row.sql.includes("UNIQUE")) {
      db.serialize(() => {
        db.run("ALTER TABLE extrap_oneoff RENAME TO extrap_oneoff_old");
        db.run(`CREATE TABLE extrap_oneoff (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          month TEXT NOT NULL,
          label TEXT NOT NULL,
          amount REAL NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          UNIQUE(month, label)
        )`);
        db.run("INSERT OR IGNORE INTO extrap_oneoff (id, month, label, amount, sort_order) SELECT id, month, label, amount, COALESCE(sort_order, 0) FROM extrap_oneoff_old");
        db.run("DROP TABLE extrap_oneoff_old");
      });
    }
  });
});

// --- Extrapolate API ---

// Get extrapolation settings
app.get("/api/extrapolate/settings", (req, res) => {
  db.get("SELECT start_month, num_months, starting_balance FROM extrap_settings WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) {
      // Default: current month, 6 months, 0 starting balance
      const now = new Date();
      const def = { start_month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`, num_months: 6, starting_balance: 0 };
      return res.json(def);
    }
    return res.json(row);
  });
});

// Save extrapolation settings
app.put("/api/extrapolate/settings", (req, res) => {
  const { start_month, num_months, starting_balance } = req.body;
  if (!start_month || !/^\d{4}-\d{2}$/.test(start_month)) {
    return res.status(400).json({ error: "Invalid start_month (use YYYY-MM)." });
  }
  const n = Number(num_months);
  if (!Number.isInteger(n) || n < 1 || n > 24) {
    return res.status(400).json({ error: "num_months must be 1-24." });
  }
  const bal = Number.isFinite(Number(starting_balance)) ? Number(starting_balance) : 0;
  db.run("INSERT OR REPLACE INTO extrap_settings (id, start_month, num_months, starting_balance) VALUES (1, ?, ?, ?)", [start_month, n, bal], (err) => {
    if (err) return res.status(500).json({ error: "Failed to save settings." });
    return res.json({ success: true });
  });
});

// Purge forecast data for months before a given month
app.post("/api/extrapolate/purge", (req, res) => {
  const { before_month } = req.body;
  if (!before_month || !/^\d{4}-\d{2}$/.test(before_month)) {
    return res.status(400).json({ error: "Invalid before_month." });
  }
  db.serialize(() => {
    db.run("DELETE FROM extrap_income WHERE month < ?", [before_month]);
    db.run("DELETE FROM extrap_oneoff WHERE month < ?", [before_month], function(err) {
      if (err) return res.status(500).json({ error: "Failed to purge." });
      return res.json({ success: true });
    });
  });
});

// Get all income entries
app.get("/api/extrapolate/income", (req, res) => {
  db.all("SELECT id, month, label, amount, sort_order, COALESCE(note, '') as note FROM extrap_income ORDER BY sort_order ASC, id ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    return res.json(rows);
  });
});

// Add income entry (upsert: same label+month replaces)
app.post("/api/extrapolate/income", (req, res) => {
  const { month, label, amount } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "Invalid month." });
  if (!label || typeof label !== "string" || !label.trim()) return res.status(400).json({ error: "Label required." });
  const amt = Number(amount);
  if (!Number.isFinite(amt)) return res.status(400).json({ error: "Valid amount required." });
  // Get sort_order and note: use existing row's values if updating, otherwise next available
  db.get("SELECT sort_order, COALESCE(note, '') as note FROM extrap_income WHERE month = ? AND label = ?", [month, label.trim()], (err, existing) => {
    if (existing) {
      db.run("INSERT OR REPLACE INTO extrap_income (month, label, amount, sort_order, note) VALUES (?, ?, ?, ?, ?)", [month, label.trim(), amt, existing.sort_order, existing.note], function(err2) {
        if (err2) return res.status(500).json({ error: "Failed to add income." });
        return res.json({ id: this.lastID });
      });
    } else {
      db.get("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM extrap_income", (err2, row) => {
        const order = row ? row.next_order : 1;
        db.run("INSERT OR REPLACE INTO extrap_income (month, label, amount, sort_order, note) VALUES (?, ?, ?, ?, '')", [month, label.trim(), amt, order], function(err3) {
          if (err3) return res.status(500).json({ error: "Failed to add income." });
          return res.json({ id: this.lastID });
        });
      });
    }
  });
});

// Update income entry
app.put("/api/extrapolate/income/:id", (req, res) => {
  const { id } = req.params;
  const { month, label, amount, note } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "Invalid month." });
  if (!label || typeof label !== "string" || !label.trim()) return res.status(400).json({ error: "Label required." });
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt === 0) return res.status(400).json({ error: "Valid amount required." });
  const noteVal = typeof note === "string" ? note.trim() : "";
  db.run("UPDATE extrap_income SET month = ?, label = ?, amount = ?, note = ? WHERE id = ?", [month, label.trim(), amt, noteVal, id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to update." });
    if (this.changes === 0) return res.status(404).json({ error: "Not found." });
    return res.json({ success: true });
  });
});

// Delete income entry
app.delete("/api/extrapolate/income/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM extrap_income WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to delete." });
    if (this.changes === 0) return res.status(404).json({ error: "Not found." });
    return res.json({ success: true });
  });
});

// Update note on an income or oneoff entry
app.patch("/api/extrapolate/note/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const { note } = req.body;
  if (!["income", "oneoff"].includes(type)) return res.status(400).json({ error: "Invalid type." });
  const table = type === "income" ? "extrap_income" : "extrap_oneoff";
  const noteVal = typeof note === "string" ? note.trim() : "";
  db.run(`UPDATE ${table} SET note = ? WHERE id = ?`, [noteVal, id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to update note." });
    if (this.changes === 0) return res.status(404).json({ error: "Not found." });
    return res.json({ success: true });
  });
});

// Get all one-off entries
app.get("/api/extrapolate/oneoff", (req, res) => {
  db.all("SELECT id, month, label, amount, sort_order, COALESCE(note, '') as note FROM extrap_oneoff ORDER BY sort_order ASC, id ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    return res.json(rows);
  });
});

// Add one-off entry (upsert: same label+month replaces)
app.post("/api/extrapolate/oneoff", (req, res) => {
  const { month, label, amount } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "Invalid month." });
  if (!label || typeof label !== "string" || !label.trim()) return res.status(400).json({ error: "Label required." });
  const amt = Number(amount);
  if (!Number.isFinite(amt)) return res.status(400).json({ error: "Valid amount required." });
  db.get("SELECT sort_order, COALESCE(note, '') as note FROM extrap_oneoff WHERE month = ? AND label = ?", [month, label.trim()], (err, existing) => {
    if (existing) {
      db.run("INSERT OR REPLACE INTO extrap_oneoff (month, label, amount, sort_order, note) VALUES (?, ?, ?, ?, ?)", [month, label.trim(), amt, existing.sort_order, existing.note], function(err2) {
        if (err2) return res.status(500).json({ error: "Failed to add one-off." });
        return res.json({ id: this.lastID });
      });
    } else {
      db.get("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM extrap_oneoff", (err2, row) => {
        const order = row ? row.next_order : 1;
        db.run("INSERT OR REPLACE INTO extrap_oneoff (month, label, amount, sort_order, note) VALUES (?, ?, ?, ?, '')", [month, label.trim(), amt, order], function(err3) {
          if (err3) return res.status(500).json({ error: "Failed to add one-off." });
          return res.json({ id: this.lastID });
        });
      });
    }
  });
});

// Update one-off entry
app.put("/api/extrapolate/oneoff/:id", (req, res) => {
  const { id } = req.params;
  const { month, label, amount, note } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "Invalid month." });
  if (!label || typeof label !== "string" || !label.trim()) return res.status(400).json({ error: "Label required." });
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt === 0) return res.status(400).json({ error: "Valid amount required." });
  const noteVal = typeof note === "string" ? note.trim() : "";
  db.run("UPDATE extrap_oneoff SET month = ?, label = ?, amount = ?, note = ? WHERE id = ?", [month, label.trim(), amt, noteVal, id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to update." });
    if (this.changes === 0) return res.status(404).json({ error: "Not found." });
    return res.json({ success: true });
  });
});

// Delete one-off entry
app.delete("/api/extrapolate/oneoff/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM extrap_oneoff WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to delete." });
    if (this.changes === 0) return res.status(404).json({ error: "Not found." });
    return res.json({ success: true });
  });
});

// Get recurring expenses — disabled, tab is fully self-contained
app.get("/api/extrapolate/recurring", (req, res) => {
  return res.json([]);
});

// Reset all forecast data
app.post("/api/extrapolate/reset", (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM extrap_income");
    db.run("DELETE FROM extrap_oneoff");
    db.run("DELETE FROM extrap_settings WHERE id = 1", (err) => {
      if (err) return res.status(500).json({ error: "Failed to reset." });
      return res.json({ success: true });
    });
  });
});

// Reorder rows
app.patch("/api/extrapolate/reorder", (req, res) => {
  const { type, labels } = req.body;
  if (!type || !["income", "oneoff"].includes(type)) return res.status(400).json({ error: "Invalid type." });
  if (!Array.isArray(labels) || labels.length === 0) return res.status(400).json({ error: "labels required." });
  const table = type === "income" ? "extrap_income" : "extrap_oneoff";
  db.serialize(() => {
    const stmt = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE label = ?`);
    for (let i = 0; i < labels.length; i++) {
      stmt.run(i + 1, labels[i]);
    }
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: "Failed to reorder." });
      return res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Expenses+ running at http://localhost:${PORT}`);
  console.log(`Database path: ${dbPath}`);
});
