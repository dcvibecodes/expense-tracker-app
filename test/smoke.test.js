// Smoke and regression tests for Spend Less. Run with: npm test
// Starts the real server on a throwaway port and data folder, so no live data is touched.
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const dirs = [];
const procs = new Set();

function tmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "spend-less-test-"));
  dirs.push(d);
  return d;
}

async function startServer({ dataDir, port, env = {} }) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ...env },
    stdio: "ignore",
  });
  procs.add(child);
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`);
      if (r.ok) return child;
    } catch (_) { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw new Error("server did not start");
}

async function stopServer(child) {
  if (!child || child.killed || child.exitCode !== null || child.signalCode !== null) return;
  procs.delete(child);
  await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGTERM"); });
}

// Tiny client with a cookie jar and CSRF handling.
class Client {
  constructor(port, headers = {}) { this.base = `http://127.0.0.1:${port}`; this.cookie = ""; this.csrf = ""; this.headers = headers; }
  async req(method, url, body) {
    const headers = { ...this.headers };
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (method !== "GET" && this.csrf) headers["X-CSRF-Token"] = this.csrf;
    const res = await fetch(this.base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (set.length) this.cookie = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) { /* not json */ }
    return { status: res.status, json, text };
  }
  async init() {
    const r = await this.req("GET", "/api/csrf-token");
    this.csrf = r.json.token || r.json.csrfToken;
    return this;
  }
}

let nextPort = 3200 + Math.floor(Math.random() * 400);
const port = () => nextPort++;

after(async () => {
  for (const p of procs) p.kill();
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

test("app page has no title bar or scratchpad, and the scratchpad API is gone", async () => {
  const p = port();
  const srv = await startServer({ dataDir: tmpDir(), port: p });
  try {
    const c = await new Client(p).init();
    const page = await c.req("GET", "/");
    assert.equal(page.status, 200);
    assert.ok(!/<header/.test(page.text), "no header bar");
    assert.ok(!/scratchpad/i.test(page.text), "no scratchpad markup");
    assert.ok(page.text.includes('id="refresh-btn"'), "refresh button present");
    assert.equal((await c.req("GET", "/api/scratchpad")).status, 404);
    assert.equal((await c.req("PUT", "/api/scratchpad", { text: "x" })).status, 404);
  } finally { await stopServer(srv); }
});

test("create, list and delete expenses; unknown category is rejected", async () => {
  const p = port();
  const srv = await startServer({ dataDir: tmpDir(), port: p });
  try {
    const c = await new Client(p).init();
    const cats = (await c.req("GET", "/api/categories")).json;
    assert.ok(cats.length > 0);
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const ids = [];
    for (const [details, amount] of [["Tea", 50], ["Lunch", 320.5], ["Metro", 40]]) {
      const r = await c.req("POST", "/api/expenses", { date, details, category: cats[0].name, amount });
      assert.equal(r.status, 200, r.text);
      ids.push(r.json.id);
    }
    const bad = await c.req("POST", "/api/expenses", { date, details: "x", category: "no-such-category", amount: 1 });
    assert.equal(bad.status, 400);

    let list = (await c.req("GET", "/api/expenses")).json;
    assert.equal(list.length, 3);
    const total = list.reduce((s, e) => s + e.amount, 0);
    assert.ok(Math.abs(total - 410.5) < 1e-9, `total was ${total}`);

    assert.equal((await c.req("DELETE", `/api/expenses/${ids[0]}`)).status, 200);
    list = (await c.req("GET", "/api/expenses")).json;
    assert.equal(list.length, 2);
  } finally { await stopServer(srv); }
});

test("CSV export lists the saved expenses", async () => {
  const p = port();
  const srv = await startServer({ dataDir: tmpDir(), port: p });
  try {
    const c = await new Client(p).init();
    const cats = (await c.req("GET", "/api/categories")).json;
    await c.req("POST", "/api/expenses", { date: "2026-03-05", details: "Export check", category: cats[0].name, amount: 123 });
    const csv = await c.req("GET", "/api/export/csv?year=2026&month=3");
    assert.equal(csv.status, 200);
    assert.ok(csv.text.includes("Export check"), "row is in the export");
  } finally { await stopServer(srv); }
});

test("PIN login survives a server restart", async () => {
  const dataDir = tmpDir();
  const p = port();
  let srv = await startServer({ dataDir, port: p });
  const c = new Client(p);
  try {
    await c.init();
    assert.equal((await c.req("POST", "/api/lock/setup", { pin: "123456" })).status, 200);
    assert.equal((await c.req("POST", "/api/lock/unlock", { pin: "123456" })).status, 200);
    assert.equal((await c.req("GET", "/api/expenses")).status, 200);
    await stopServer(srv);
    srv = await startServer({ dataDir, port: p });
    assert.equal((await c.req("GET", "/api/expenses")).status, 200, "still signed in after restart");
    const stranger = new Client(p);
    assert.equal((await stranger.req("GET", "/api/expenses")).status, 401, "other visitors stay locked out");
  } finally { await stopServer(srv); }
});

test("session ids are not stored in the database in plain text", async () => {
  const dataDir = tmpDir();
  const p = port();
  const srv = await startServer({ dataDir, port: p });
  const c = new Client(p);
  try {
    await c.init();
    await c.req("POST", "/api/lock/setup", { pin: "123456" });
    const sid = decodeURIComponent(c.cookie.split("=")[1] || "").replace(/^s:/, "").split(".")[0];
    assert.ok(sid.length > 10, "found a session id");
    await stopServer(srv);
    const raw = fs.readFileSync(path.join(dataDir, "expenses.db")).toString("latin1");
    assert.ok(!raw.includes(sid), "raw session id is absent from the database file");
  } finally { await stopServer(srv); }
});

test("failed PIN attempts are counted per client when TRUST_PROXY=1", async () => {
  const dataDir = tmpDir();
  const p = port();
  const srv = await startServer({ dataDir, port: p, env: { TRUST_PROXY: "1" } });
  try {
    const setup = await new Client(p).init();
    await setup.req("POST", "/api/lock/setup", { pin: "123456" });
    const attacker = new Client(p, { "X-Forwarded-For": "203.0.113.9" });
    let blocked = false;
    for (let i = 0; i < 15; i++) {
      const r = await attacker.req("POST", "/api/lock/unlock", { pin: "000000" });
      if (r.status === 429) { blocked = true; break; }
    }
    assert.ok(blocked, "repeated wrong PINs get rate limited");
    const owner = new Client(p, { "X-Forwarded-For": "198.51.100.7" });
    assert.equal((await owner.req("POST", "/api/lock/unlock", { pin: "123456" })).status, 200, "a different client is not locked out");
  } finally { await stopServer(srv); }
});

test("session cookie is Secure only when asked, and only over HTTPS with COOKIE_SECURE=auto", async () => {
  const cookieFor = async (env, headers) => {
    const p = port();
    const srv = await startServer({ dataDir: tmpDir(), port: p, env });
    try {
      const res = await fetch(`http://127.0.0.1:${p}/api/csrf-token`, { headers });
      return (res.headers.getSetCookie() || []).join(";");
    } finally { await stopServer(srv); }
  };
  const plain = await cookieFor({}, {});
  assert.ok(plain.includes("connect.sid") && !/;\s*Secure/i.test(plain), "default: cookie works over plain HTTP");
  const auto = { TRUST_PROXY: "1", COOKIE_SECURE: "auto" };
  assert.ok(/;\s*Secure/i.test(await cookieFor(auto, { "X-Forwarded-Proto": "https" })), "auto: Secure behind an HTTPS proxy");
  const autoPlain = await cookieFor(auto, {});
  assert.ok(autoPlain.includes("connect.sid") && !/;\s*Secure/i.test(autoPlain), "auto: not Secure over plain HTTP (local use keeps working)");
});
