const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;

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

  db.run(`
    CREATE TABLE IF NOT EXISTS app_lock (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      pin_hash TEXT NOT NULL,
      recovery_hash TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 1
    )
  `);
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

function hashPin(pin) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

function generateRecoveryCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
    db.run("UPDATE categories SET name = ?, color = ? WHERE id = ?", [cleanName, color || "#6b7280", id], function(updateErr) {
      if (updateErr) {
        if (updateErr.message.includes("UNIQUE")) return res.status(400).json({ error: "Category name already exists." });
        return res.status(500).json({ error: "Failed to update category." });
      }
      // Update all expenses with old category name
      if (oldName !== cleanName) {
        db.run("UPDATE expenses SET category = ? WHERE category = ?", [cleanName, oldName]);
      }
      return res.json({ success: true });
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
      if (cntRow.cnt > 0) return res.status(400).json({ error: `Cannot delete: ${cntRow.cnt} expense(s) use this category. Reassign them first.` });

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

  const stmt = db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?");
  for (let i = 0; i < order.length; i++) {
    stmt.run(i + 1, order[i]);
  }
  stmt.finalize();
  return res.json({ success: true });
});

app.post("/api/expenses", (req, res) => {
  const { date, details, category, amount } = req.body;
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

  isValidCategory(category, (valid) => {
    if (!valid) return res.status(400).json({ error: "Invalid category." });
    const sql = "INSERT INTO expenses (date, details, category, amount) VALUES (?, ?, ?, ?)";
    db.run(sql, [date, details.trim(), category, amt], function onInsert(err) {
      if (err) return res.status(500).json({ error: "Failed to save expense." });
      return res.json({ id: this.lastID });
    });
  });
});

app.get("/api/expenses", (req, res) => {
  const { startDate, endDate, category, search } = req.query;

  const where = [];
  const params = [];
  const trimmedSearch = typeof search === "string" ? search.trim() : "";
  const useGlobalSearch = Boolean(trimmedSearch);

  if (!useGlobalSearch) {
    if (startDate && isValidDate(startDate)) {
      where.push("date >= ?");
      params.push(startDate);
    }
    if (endDate && isValidDate(endDate)) {
      where.push("date <= ?");
      params.push(endDate);
    }
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
    SELECT id, date, details, category, amount
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
  const sql = "SELECT DISTINCT details FROM expenses ORDER BY details ASC";
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch details." });
    return res.json(rows.map((r) => r.details));
  });
});

app.put("/api/expenses/:id", (req, res) => {
  const { id } = req.params;
  const { date, details, category, amount } = req.body;
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

  isValidCategory(category, (valid) => {
    if (!valid) return res.status(400).json({ error: "Invalid category." });
    const sql = "UPDATE expenses SET date = ?, details = ?, category = ?, amount = ? WHERE id = ?";
    db.run(sql, [date, details.trim(), category, amt, id], function onUpdate(err) {
      if (err) return res.status(500).json({ error: "Failed to update expense." });
      if (this.changes === 0) return res.status(404).json({ error: "Expense not found." });
      return res.json({ success: true });
    });
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

app.get("/api/charts", (req, res) => {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "Invalid month." });
  }
  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    return res.status(400).json({ error: "Invalid year." });
  }

  const monthStr = String(month).padStart(2, "0");
  const ym = `${year}-${monthStr}`;

  const pieSql = `
    SELECT category, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE substr(date, 1, 7) = ?
    GROUP BY category
  `;

  const barSql = `
    SELECT substr(date, 1, 7) AS year_month, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE substr(date, 1, 4) = ?
    GROUP BY year_month
    ORDER BY year_month ASC
  `;

  db.all(pieSql, [ym], (pieErr, pieRows) => {
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

// --- Reports API ---

app.get("/api/reports", (req, res) => {
  const { year, month, startDate, endDate, category } = req.query;
  const where = [];
  const params = [];

  if (startDate && isValidDate(startDate)) {
    where.push("date >= ?");
    params.push(startDate);
    if (endDate && isValidDate(endDate)) {
      where.push("date <= ?");
      params.push(endDate);
    }
  } else if (year) {
    where.push("substr(date, 1, 4) = ?");
    params.push(String(year));
    if (month) {
      where.push("substr(date, 6, 2) = ?");
      params.push(String(month).padStart(2, "0"));
    }
  } else {
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

  const sql = `SELECT id, date, details, category, amount FROM expenses ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY date ASC, id ASC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch report data." });

    const yearMap = {};
    for (const row of rows) {
      const [y, m, d] = row.date.split("-");
      if (!yearMap[y]) yearMap[y] = {};
      if (!yearMap[y][m]) yearMap[y][m] = {};
      if (!yearMap[y][m][d]) yearMap[y][m][d] = [];
      yearMap[y][m][d].push(row);
    }

    const result = [];
    for (const [yr, months] of Object.entries(yearMap)) {
      const yearObj = { year: yr, total: 0, months: [] };
      for (const [mo, days] of Object.entries(months)) {
        const monthObj = { month: mo, total: 0, days: [] };
        for (const [dy, expenses] of Object.entries(days)) {
          const dayTotal = expenses.reduce((s, e) => s + e.amount, 0);
          monthObj.days.push({ day: dy, total: dayTotal, expenses });
          monthObj.total += dayTotal;
        }
        yearObj.months.push(monthObj);
        yearObj.total += monthObj.total;
      }
      result.push(yearObj);
    }

    return res.json(result);
  });
});

// --- CSV Export API ---

app.get("/api/export/csv", (req, res) => {
  const { year, month, startDate, endDate, all } = req.query;
  const where = [];
  const params = [];

  if (all === "true") {
    // no filter
  } else if (startDate && isValidDate(startDate)) {
    where.push("date >= ?");
    params.push(startDate);
    if (endDate && isValidDate(endDate)) {
      where.push("date <= ?");
      params.push(endDate);
    }
  } else if (year) {
    where.push("substr(date, 1, 4) = ?");
    params.push(String(year));
    if (month) {
      where.push("substr(date, 6, 2) = ?");
      params.push(String(month).padStart(2, "0"));
    }
  } else {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    where.push("substr(date, 1, 7) = ?");
    params.push(`${y}-${m}`);
  }

  const sql = `SELECT date, details, category, amount FROM expenses ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY date ASC, id ASC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to export." });

    let csv = "Date,Details,Category,Amount\n";
    for (const r of rows) {
      const details = r.details.includes(",") ? `"${r.details}"` : r.details;
      csv += `${r.date},${details},${r.category.charAt(0).toUpperCase() + r.category.slice(1)},${r.amount}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
    return res.send(csv);
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
  const pinHash = hashPin(pin);
  const recoveryHash = hashPin(recoveryCode);

  db.run(
    "INSERT OR REPLACE INTO app_lock (id, pin_hash, recovery_hash, locked) VALUES (1, ?, ?, 1)",
    [pinHash, recoveryHash],
    (err) => {
      if (err) return res.status(500).json({ error: "Failed to setup lock." });
      return res.json({ success: true, recoveryCode });
    }
  );
});

app.post("/api/lock/unlock", (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: "PIN required." });

  db.get("SELECT pin_hash FROM app_lock WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "No lock configured." });
    if (hashPin(pin) !== row.pin_hash) {
      return res.status(401).json({ error: "Incorrect PIN." });
    }
    return res.json({ success: true });
  });
});

app.post("/api/lock/disable", (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: "PIN required." });

  db.get("SELECT pin_hash FROM app_lock WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "No lock configured." });
    if (hashPin(pin) !== row.pin_hash) {
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

  db.get("SELECT recovery_hash FROM app_lock WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "No lock configured." });
    if (hashPin(code.toUpperCase()) !== row.recovery_hash) {
      return res.status(401).json({ error: "Invalid recovery code." });
    }
    db.run("DELETE FROM app_lock WHERE id = 1", (delErr) => {
      if (delErr) return res.status(500).json({ error: "Failed to recover." });
      return res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Expense tracker running at http://localhost:${PORT}`);
  console.log(`Database path: ${dbPath}`);
});
