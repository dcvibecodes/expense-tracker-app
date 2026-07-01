// ===== GLOBALS & CONSTANTS =====
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

let categories = []; // loaded from server
let dateFormat = "MM/DD/YYYY"; // configurable date display format
let baseCurrency = "INR"; // configurable base currency
let currencyRates = []; // loaded from server
let abroadMode = { active: false, currency: "" }; // loaded from server

// Currency symbol map (common currencies)
const CURRENCY_SYMBOLS = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥",
  VND: "₫", THB: "฿", KRW: "₩", AUD: "A$", CAD: "C$", SGD: "S$",
  MYR: "RM", PHP: "₱", IDR: "Rp", AED: "د.إ", SAR: "﷼", BDT: "৳",
  LKR: "Rs", NPR: "Rs", PKR: "Rs", CHF: "CHF", SEK: "kr", NOK: "kr",
  DKK: "kr", NZD: "NZ$", ZAR: "R", BRL: "R$", MXN: "Mex$", RUB: "₽",
  TRY: "₺", PLN: "zł", HUF: "Ft", CZK: "Kč", TWD: "NT$", HKD: "HK$"
};

const SUPPORTED_CURRENCIES = [
  { code: "INR", name: "Indian Rupee" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "KRW", name: "South Korean Won" },
  { code: "THB", name: "Thai Baht" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "TWD", name: "Taiwan Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "NPR", name: "Nepalese Rupee" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "ZAR", name: "South African Rand" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "CZK", name: "Czech Koruna" }
];

function getCurrencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || code;
}

function getCurrencyLocale(currency) {
  const locales = {
    INR: "en-IN",

    USD: "en-US",
    CAD: "en-CA",
    AUD: "en-AU",
    NZD: "en-NZ",
    SGD: "en-SG",
    HKD: "zh-HK",

    GBP: "en-GB",
    EUR: "de-DE",
    CHF: "de-CH",

    JPY: "ja-JP",
    CNY: "zh-CN",
    KRW: "ko-KR",
    TWD: "zh-TW",

    THB: "th-TH",
    VND: "vi-VN",
    MYR: "ms-MY",
    PHP: "en-PH",
    IDR: "id-ID",

    AED: "ar-AE",
    SAR: "ar-SA",

    BDT: "bn-BD",
    LKR: "en-LK",
    NPR: "ne-NP",
    PKR: "en-PK",

    BRL: "pt-BR",
    MXN: "es-MX",
    ZAR: "en-ZA",

    RUB: "ru-RU",
    TRY: "tr-TR",

    PLN: "pl-PL",
    SEK: "sv-SE",
    NOK: "nb-NO",
    DKK: "da-DK",
    HUF: "hu-HU",
    CZK: "cs-CZ"
  };

  return locales[currency] || "en-US";
}

// ===== HTML ESCAPE (XSS prevention) =====
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type, duration) {
  type = type || "info";
  duration = duration || 3000;
  const container = document.getElementById("toast-container");
  if (!container) return;
  const div = document.createElement("div");
  div.className = "toast toast-" + type;
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => { div.remove(); }, duration);
}
function showErrorToast(message, duration) {
  showToast(message, "error", duration || 4000);
}

// ===== CONFIRM MODAL (replaces native confirm()) =====
function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-modal");
    document.getElementById("confirm-modal-title").textContent = title || "Confirm";
    document.getElementById("confirm-modal-message").textContent = message || "";
    overlay.classList.add("open");
    const yesBtn = document.getElementById("confirm-modal-yes");
    const noBtn = document.getElementById("confirm-modal-no");
    function cleanup() { overlay.classList.remove("open"); yesBtn.removeEventListener("click", onYes); noBtn.removeEventListener("click", onNo); overlay.removeEventListener("click", onOverlay); }
    function onYes() { cleanup(); resolve(true); }
    function onNo() { cleanup(); resolve(false); }
    function onOverlay(e) { if (e.target === overlay) { cleanup(); resolve(false); } }
    yesBtn.addEventListener("click", onYes);
    noBtn.addEventListener("click", onNo);
    overlay.addEventListener("click", onOverlay);
  });
}

// ===== THEME (auto-detect system preference) =====
function applySystemTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
}
applySystemTheme();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applySystemTheme);
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// ===== HELPERS =====

// ---- Date-optional inputs: toggle "is-empty" class for cross-browser consistency ----
function syncDateOptionalClass(input) {
  if (input.value) {
    input.classList.remove("is-empty");
  } else {
    input.classList.add("is-empty");
  }
}
document.querySelectorAll("input.date-optional").forEach(input => {
  syncDateOptionalClass(input);
  input.addEventListener("change", () => syncDateOptionalClass(input));
  input.addEventListener("input", () => syncDateOptionalClass(input));
});

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayStr() { return localDateStr(new Date()); }
function formatDate(isoStr) {
  if (!isoStr) return "";
  const [y,m,d] = isoStr.split("-");
  if (dateFormat === "DD/MM/YYYY") return `${d}/${m}/${y}`;
  if (dateFormat === "YYYY-MM-DD") return isoStr;
  return `${m}/${d}/${y}`; // MM/DD/YYYY default
}
function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return getCurrencySymbol(baseCurrency) + " 0";

  return getCurrencySymbol(baseCurrency) + " " +
    new Intl.NumberFormat(getCurrencyLocale(baseCurrency), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
}
function formatAmountRounded(value) {
  const num = Math.round(Number(value) || 0);

  return getCurrencySymbol(baseCurrency) + " " +
    new Intl.NumberFormat(getCurrencyLocale(baseCurrency), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
}
function formatCategory(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function lastDayOfMonth(year, month) { return new Date(year, month, 0); }
function populateGenericYearPicker(sel, includeAll) {
  const cur = new Date().getFullYear();
  const start = 2020, end = Math.max(cur + 2, 2032);
  sel.innerHTML = "";
  if (includeAll) {
    const o = document.createElement("option");
    o.value = "all"; o.textContent = "All Years";
    sel.appendChild(o);
  }
  for (let y = start; y <= end; y++) {
    const o = document.createElement("option");
    o.value = y; o.textContent = y;
    if (y === cur) o.selected = true;
    sel.appendChild(o);
  }
}
function getCategoryColor(name) {
  const cat = categories.find(c => c.name === name);
  return cat ? cat.color : "#6b7280";
}
function populateCategorySelect(sel, includeAll) {
  const current = sel.value;
  sel.innerHTML = "";
  if (includeAll) {
    const o = document.createElement("option");
    o.value = "all"; o.textContent = "All";
    sel.appendChild(o);
  }
  for (const cat of categories) {
    const o = document.createElement("option");
    o.value = cat.name; o.textContent = formatCategory(cat.name);
    sel.appendChild(o);
  }
  if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
}

// ===== SAFE FETCH WRAPPER =====
async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok && res.status === 429) {
      showErrorToast("Too many attempts. Please wait a moment.");
    }
    return res;
  } catch (err) {
    showErrorToast("Network error. Check your connection.");
    throw err;
  }
}

// ===== FOCUS TRAPPING FOR MODALS =====
function trapFocus(modalEl) {
  const focusable = modalEl.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handler(e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  modalEl.addEventListener("keydown", handler);
  first.focus();
  return () => modalEl.removeEventListener("keydown", handler);
}

let activeModalTrap = null;

// ===== TAB NAVIGATION =====
const tabBtns = document.querySelectorAll(".bottom-nav-btn");
const tabContents = document.querySelectorAll(".tab-content");
const TAB_ORDER = ["tracker", "reports", "forecast", "settings"];

function switchToTab(tabId) {
  const btn = document.querySelector(`.bottom-nav-btn[data-tab="${tabId}"]`);
  if (!btn) return;
  tabBtns.forEach(b => b.classList.remove("active"));
  tabContents.forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  const tabEl = document.getElementById(`tab-${tabId}`);
  tabEl.classList.add("active");
  if (tabId === "reports") loadReports();
  if (tabId === "forecast") loadExtrapolateData();
}

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => switchToTab(btn.dataset.tab));
});



// ===== TRACKER TAB =====
const expenseForm = document.getElementById("expense-form");
const dateInput = document.getElementById("date");
const detailsInput = document.getElementById("details");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const searchInput = document.getElementById("expense-search");
window.addEventListener("load", () => {
  // Clear any browser-autofilled value in the search box
  if (searchInput) searchInput.value = "";
  document.activeElement?.blur();
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });
});
const rowsEl = document.getElementById("expense-rows");
const summaryGrid = document.getElementById("summary-grid");
const summaryHeading = document.getElementById("summary-heading");
const comparisonCtx = document.getElementById("comparison-chart");
const detailsList = document.getElementById("details-list");

const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editId = document.getElementById("edit-id");
const editDate = document.getElementById("edit-date");
const editDetails = document.getElementById("edit-details");
const editCategory = document.getElementById("edit-category");
const editAmount = document.getElementById("edit-amount");
const editCancel = document.getElementById("edit-cancel");

let currentRows = [];
let comparisonChart;
let chartView = "amounts";
let allDetails = [];

// ===== CUSTOM AUTOCOMPLETE =====
let autocompleteDropdown = null;
let autocompleteActiveIndex = -1;

function setupAutocomplete(input, getItems) {
  // Wrap the input in a relative container
  const wrapper = document.createElement("div");
  wrapper.className = "autocomplete-wrap";
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete-dropdown";
  dropdown.setAttribute("role", "listbox");
  wrapper.appendChild(dropdown);

  function show(items, query) {
    dropdown.innerHTML = "";
    autocompleteActiveIndex = -1;
    if (!items.length) { dropdown.classList.remove("open"); return; }
    const lq = query.toLowerCase();
    for (let i = 0; i < Math.min(items.length, 8); i++) {
      const opt = document.createElement("div");
      opt.className = "autocomplete-option";
      opt.setAttribute("role", "option");
      opt.dataset.value = items[i];
      // Highlight matching text
      const idx = items[i].toLowerCase().indexOf(lq);
      if (idx >= 0 && lq.length > 0) {
        opt.innerHTML = escapeHtml(items[i].slice(0, idx)) +
          "<mark>" + escapeHtml(items[i].slice(idx, idx + lq.length)) + "</mark>" +
          escapeHtml(items[i].slice(idx + lq.length));
      } else {
        opt.textContent = items[i];
      }
      opt.addEventListener("mousedown", e => {
        e.preventDefault();
        input.value = items[i];
        hide();
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      dropdown.appendChild(opt);
    }
    dropdown.classList.add("open");
  }

  function hide() {
    dropdown.classList.remove("open");
    autocompleteActiveIndex = -1;
  }

  function navigate(dir) {
    const opts = dropdown.querySelectorAll(".autocomplete-option");
    if (!opts.length) return;
    autocompleteActiveIndex += dir;
    if (autocompleteActiveIndex < 0) autocompleteActiveIndex = opts.length - 1;
    if (autocompleteActiveIndex >= opts.length) autocompleteActiveIndex = 0;
    opts.forEach((o, i) => o.classList.toggle("active", i === autocompleteActiveIndex));
  }

  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (q.length < 2) { hide(); return; }
    const items = getItems(q);
    // Don't show if value exactly matches an item
    if (items.some(d => d.toLowerCase() === q.toLowerCase())) { hide(); return; }
    show(items, q);
  });

  input.addEventListener("keydown", e => {
    if (!dropdown.classList.contains("open")) return;
    if (e.key === "ArrowDown") { e.preventDefault(); navigate(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); navigate(-1); }
    else if (e.key === "Enter" && autocompleteActiveIndex >= 0) {
      e.preventDefault();
      const opts = dropdown.querySelectorAll(".autocomplete-option");
      if (opts[autocompleteActiveIndex]) {
        input.value = opts[autocompleteActiveIndex].dataset.value;
        hide();
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else if (e.key === "Escape") {
      hide();
    }
  });

  input.addEventListener("blur", () => {
    setTimeout(hide, 150);
  });

  return { show, hide, dropdown };
}

// Setup autocomplete on details input (replaces datalist on all platforms)
const detailsAutocomplete = setupAutocomplete(detailsInput, q => {
  const lq = q.toLowerCase();
  return allDetails.filter(d => d.toLowerCase().includes(lq)).slice(0, 8);
});

// Remove native datalist — custom dropdown handles it
if (detailsList) {
  detailsList.remove();
  detailsInput.removeAttribute("list");
}

async function fetchExpenses() {
  const search = searchInput.value.trim();
  const params = new URLSearchParams();
  if (search) {
    // Search within current filters
    params.set("search", search);
  } else {
    // Default: current month
    const now = new Date();
    params.set("year", now.getFullYear());
    params.set("month", now.getMonth() + 1);
  }
  const res = await safeFetch(`/api/expenses?${params}`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

function renderRows(rows) {
  currentRows = rows;
  rowsEl.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    let amountDisplay = formatAmount(row.amount);
    if (row.original_currency && row.original_amount) {
      amountDisplay += `<br><span class="original-amt">${getCurrencySymbol(row.original_currency)} ${new Intl.NumberFormat(getCurrencyLocale(row.original_currency), { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(row.original_amount)}</span>`;
    }
    const noteBtn = row.note
      ? `<button class="action-btn btn-note" data-id="${row.id}" title="View note" aria-label="View note">📝</button>`
      : `<button class="action-btn btn-note notes-empty" data-id="${row.id}" title="Add note" aria-label="Add note">🗒️</button>`;
    tr.innerHTML = `
      <td data-label="Date">${escapeHtml(formatDate(row.date))}</td>
      <td data-label="Details">${escapeHtml(row.details)}</td>
      <td data-label="Category"><span class="cat-badge" style="background:${getCategoryColor(row.category)}20;color:${getCategoryColor(row.category)}">${escapeHtml(formatCategory(row.category))}</span></td>
      <td data-label="Amount">${amountDisplay}</td>
      <td class="actions-cell" data-label="">
        ${noteBtn}
        <button class="action-btn btn-copy" data-id="${row.id}" title="Copy to date" aria-label="Copy expense to another date">📋</button>
        <button class="action-btn btn-edit" data-id="${row.id}" title="Edit" aria-label="Edit expense">✏️</button>
        <button class="action-btn delete btn-delete" data-id="${row.id}" title="Delete" aria-label="Delete expense">🗑️</button>
      </td>`;
    fragment.appendChild(tr);
  }
  rowsEl.appendChild(fragment);
}

function renderSummary(pieData) {
  const total = Object.values(pieData).reduce((s, v) => s + (Number(v) || 0), 0);
  summaryGrid.innerHTML = "";
  // Total item
  const totalDiv = document.createElement("div");
  totalDiv.className = "summary-item total-item";
  totalDiv.innerHTML = `<span class="summary-dot" style="background:#3b82f6"></span><div class="summary-info"><span class="summary-label">Total</span><span class="summary-amount">${formatAmountRounded(total)}</span></div>`;
  summaryGrid.appendChild(totalDiv);
  // Category items
  for (const cat of categories) {
    const val = pieData[cat.name] || 0;
    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `<span class="summary-dot" style="background:${cat.color}"></span><div class="summary-info"><span class="summary-label">${escapeHtml(formatCategory(cat.name))}</span><span class="summary-amount">${formatAmountRounded(val)}</span></div>`;
    summaryGrid.appendChild(div);
  }
}

async function refreshAll() {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [rows, summaryRes] = await Promise.all([
      fetchExpenses(),
      fetch(`/api/charts?month=${month}&year=${year}`).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    renderRows(rows);

    if (summaryRes) {
      const mn = MONTH_NAMES[month - 1];
      summaryHeading.textContent = `${mn} ${year} Summary`;
      renderSummary(summaryRes.pie);
    }
  } catch (err) {
    // Error toast already shown by safeFetch if network fails
  }
}

async function populateDetailsList() {
  try {
    const res = await fetch("/api/details");
    if (res.ok) allDetails = await res.json();
  } catch {}
}

// Details input: trigger autocomplete + suggestion lookup
let suggestionDebounce = null;
let lastSuggestionQuery = "";

detailsInput.addEventListener("input", () => {
  clearTimeout(suggestionDebounce);
  suggestionDebounce = setTimeout(fetchSuggestions, 400);
});

detailsInput.addEventListener("change", () => {
  clearTimeout(suggestionDebounce);
  fetchSuggestions();
});

// ===== SMART SUGGESTIONS (auto-fill category + amount for item) =====
async function fetchSuggestions() {
  const q = detailsInput.value.trim();

  if (!q || q.length < 2) {
    lastSuggestionQuery = "";
    return;
  }

  if (q.toLowerCase() === lastSuggestionQuery) return;
  lastSuggestionQuery = q.toLowerCase();

  try {
    const res = await fetch(`/api/suggestions?item=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = await res.json();
    applySuggestions(data);
  } catch {}
}

function applySuggestions({ category, amount }) {
  if (category && category !== categoryInput.value) {
    categoryInput.value = category;
    flashAutofill(categoryInput);
  }

  if (amount != null && !amountInput.value) {
    amountInput.value = amount;
    flashAutofill(amountInput);
  }
}

function flashAutofill(el) {
  el.classList.remove("autofilled");
  void el.offsetWidth; // Force reflow
  el.classList.add("autofilled");
}

function hideSuggestions() {
  lastSuggestionQuery = "";
}

// ===== EDIT MODAL =====
function openEditModal(row) {
  editId.value = row.id; editDate.value = row.date; editDetails.value = row.details;
  populateCategorySelect(editCategory, false);
  editCategory.value = row.category;
  editAmount.value = row.amount;
  document.getElementById("edit-note").value = row.note || "";
  editModal.classList.add("open");
  if (activeModalTrap) activeModalTrap();
  activeModalTrap = trapFocus(editModal.querySelector(".modal-content"));
}
function closeEditModal() {
  editModal.classList.remove("open");
  if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
}

// ===== COPY MODAL =====
const copyModal = document.getElementById("copy-modal");
const copyForm = document.getElementById("copy-form");
const copyInfo = document.getElementById("copy-info");
const copyDateStart = document.getElementById("copy-date-start");
const copyMonths = document.getElementById("copy-months");
const copyCancel = document.getElementById("copy-cancel");
let copyExpenseId = null;

function openCopyModal(row) {
  copyExpenseId = row.id;
  copyInfo.textContent = `${row.details} — ${formatAmount(row.amount)}`;
  copyDateStart.value = row.date;
  copyMonths.value = "1";
  copyModal.classList.add("open");
  if (activeModalTrap) activeModalTrap();
  activeModalTrap = trapFocus(copyModal.querySelector(".modal-content"));
}
function closeCopyModal() {
  copyModal.classList.remove("open");
  copyExpenseId = null;
  if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
}

copyCancel.addEventListener("click", closeCopyModal);

copyForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!copyExpenseId) return;
  const startDate = copyDateStart.value;
  const months = parseInt(copyMonths.value, 10);
  if (!startDate) { alert("Please select the current occurrence date."); return; }
  if (!months || months < 1 || months > 60) { alert("Please enter a number of months between 1 and 60."); return; }

  // Generate dates starting from the NEXT month after the occurrence
  const dates = [];
  const start = new Date(startDate + "T12:00:00"); // Use noon to avoid DST edge cases
  const targetDay = start.getDate();

  for (let i = 1; i <= months; i++) {
    // Create a fresh date at the 1st of the target month to avoid overflow
    let targetMonth = start.getMonth() + i;
    let targetYear = start.getFullYear();
    while (targetMonth > 11) { targetMonth -= 12; targetYear++; }
    while (targetMonth < 0) { targetMonth += 12; targetYear--; }

    // Get last day of target month
    const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const clampedDay = Math.min(targetDay, maxDay);
    const d = new Date(targetYear, targetMonth, clampedDay);
    dates.push(localDateStr(d));
  }

  if (dates.length === 0) { alert("No valid months to copy to."); return; }
  if (dates.length > 365) { alert("Cannot copy to more than 365 dates at once."); return; }

  if (!await showConfirm("Copy Expense", `Copy this expense to ${dates.length} month${dates.length > 1 ? "s" : ""} (${dates[0]} – ${dates[dates.length-1]})?`)) return;

  const copySaveBtn = copyForm.querySelector(".save-btn");
  copySaveBtn.disabled = true;
  copySaveBtn.textContent = "Copying...";

  try {
    const res = await safeFetch("/api/expenses/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: copyExpenseId, dates })
    });
    if (res.ok) {
      const r = await res.json();
      closeCopyModal();
      await refreshAll();
      await loadReports();
      populateDetailsList();
      let msg = `Copied to ${r.inserted} month${r.inserted > 1 ? "s" : ""}.`;
      if (r.skipped > 0) {
        msg += `\n${r.skipped} date${r.skipped > 1 ? "s were" : " was"} skipped (duplicate already exists).`;
      }
      alert(msg);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to copy expense.");
    }
  } catch {}
  copySaveBtn.disabled = false;
  copySaveBtn.textContent = "Copy";
});

// ===== TRACKER TABLE CLICK HANDLERS =====
rowsEl.addEventListener("click", async e => {
  const btn = e.target.closest("button"); if (!btn) return;
  const id = parseInt(btn.dataset.id, 10);
  const row = currentRows.find(r => r.id === id); if (!row) return;
  if (btn.classList.contains("btn-note")) { openNotesModal(row); }
  else if (btn.classList.contains("btn-edit")) { openEditModal(row); }
  else if (btn.classList.contains("btn-copy")) { openCopyModal(row); }
  else if (btn.classList.contains("btn-delete")) {
    if (!await showConfirm("Delete Expense", `${formatDate(row.date)} — ${row.details} — ${formatAmount(row.amount)}`)) return;
    btn.disabled = true;
    btn.textContent = "⏳";
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
    const siblings = btn.parentElement.querySelectorAll("button");
    siblings.forEach(s => { s.disabled = true; s.style.pointerEvents = "none"; });
    try {
      const res = await safeFetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) { await refreshAll(); populateDetailsList(); }
      else { alert("Failed to delete"); siblings.forEach(s => { s.disabled = false; s.style.pointerEvents = ""; }); btn.textContent = "🗑️"; btn.style.opacity = ""; }
    } catch {
      siblings.forEach(s => { s.disabled = false; s.style.pointerEvents = ""; }); btn.textContent = "🗑️"; btn.style.opacity = "";
    }
  }
});

editForm.addEventListener("submit", async e => {
  e.preventDefault();
  const id = parseInt(editId.value, 10);
  const amountVal = editAmount.value.trim();
  const amountNum = parseFloat(amountVal);
  if (isNaN(amountNum) || amountNum <= 0) { alert("Please enter a valid amount."); return; }
  const saveBtn = editForm.querySelector(".save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  try {
    const editNoteVal = document.getElementById("edit-note").value.trim();
    const res = await safeFetch(`/api/expenses/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: editDate.value, details: editDetails.value.trim(), category: editCategory.value, amount: amountNum, note: editNoteVal }) });
    if (res.ok) { closeEditModal(); await refreshAll(); await loadReports(); populateDetailsList(); }
    else { const err = await res.json(); alert(err.error || "Failed to update"); }
  } catch {}
  saveBtn.disabled = false;
  saveBtn.textContent = "Save";
});
editCancel.addEventListener("click", closeEditModal);

// ===== ADD EXPENSE =====
const addExpenseMsg = document.getElementById("add-expense-msg");
const addBtn = document.getElementById("add-btn");
let isSubmitting = false;

expenseForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (isSubmitting) return;

  isSubmitting = true;
  addBtn.disabled = true;
  addBtn.textContent = "Adding...";

  const date = dateInput.value;
  const details = detailsInput.value.trim();
  const category = categoryInput.value;
  const amount = amountInput.value.trim();

  if (!date || !details || !category || !amount) {
    isSubmitting = false;
    addBtn.disabled = false;
    addBtn.textContent = "+ Add";
    return;
  }
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    addExpenseMsg.textContent = "Please enter a valid amount (e.g. 10.50).";
    addExpenseMsg.className = "form-msg error";
    isSubmitting = false;
    addBtn.disabled = false;
    addBtn.textContent = "+ Add";
    return;
  }

  // Duplicate check
  try {
    // Use the final base-currency amount for duplicate check
    let dupAmount = amountNum;
    if (abroadMode.active && abroadMode.currency) {
      const rate = currencyRates.find(r => r.code === abroadMode.currency);
      if (rate) dupAmount = Math.round(amountNum * rate.rate * 100) / 100;
    }
    const dupRes = await fetch("/api/expenses/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, details, amount: dupAmount })
    });
    if (dupRes.ok) {
      const { duplicate } = await dupRes.json();
      if (duplicate) {
        if (!await showConfirm("Possible Duplicate", `A similar entry already exists:\n${formatDate(date)} — ${details} — ${amount}\n\nAdd anyway?`)) {
          isSubmitting = false;
          addBtn.disabled = false;
          addBtn.textContent = "+ Add";
          return;
        }
      }
    }
  } catch {}

  try {
    // Build request body — handle abroad mode conversion
    const body = { date, details, category, amount: amountNum };
    const noteVal = document.getElementById("note").value.trim();
    if (noteVal) body.note = noteVal;

    if (abroadMode.active && abroadMode.currency) {
      const rate = currencyRates.find(r => r.code === abroadMode.currency);
      if (rate) {
        body.original_amount = amountNum;
        body.original_currency = abroadMode.currency;
        body.exchange_rate = rate.rate;
        body.amount = Math.round(amountNum * rate.rate * 100) / 100; // Convert to base currency
      }
    }

    const res = await safeFetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      addExpenseMsg.textContent = "Expense added successfully.";
      addExpenseMsg.className = "form-msg success";
      detailsInput.value = ""; amountInput.value = "";
      document.getElementById("note").value = "";
      document.getElementById("note-field-wrap").style.display = "none";
      document.getElementById("note-toggle-link").textContent = "📝 Add note";
      hideSuggestions();
      detailsAutocomplete.hide();
      await refreshAll(); populateDetailsList();
      setTimeout(() => { addExpenseMsg.textContent = ""; addExpenseMsg.className = "form-msg"; }, 3000);
    } else {
      const err = await res.json();
      addExpenseMsg.textContent = err.error || "Failed to add expense.";
      addExpenseMsg.className = "form-msg error";
    }
  } catch {}
  isSubmitting = false;
  addBtn.disabled = false;
  addBtn.textContent = "+ Add";
});

let searchDebounce = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  const q = searchInput.value.trim();
  if (q.length === 1) return; // wait for at least 2 chars
  searchDebounce = setTimeout(refreshAll, 400);
});

document.getElementById("date-today-btn").addEventListener("click", () => {
  dateInput.value = todayStr();
});

document.getElementById("clear-form-btn").addEventListener("click", () => {
  dateInput.value = todayStr();
  detailsInput.value = "";
  amountInput.value = "";
  document.getElementById("note").value = "";
  document.getElementById("note-field-wrap").style.display = "none";
  document.getElementById("note-toggle-link").textContent = "📝 Add note";
  if (categories.length) categoryInput.value = categories[0].name;
  detailsAutocomplete.hide();
  hideSuggestions();
  addExpenseMsg.textContent = "";
  addExpenseMsg.className = "form-msg";
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeEditModal();
    closeCopyModal();
    closeNotesModal();
    if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
  }
});

// ===== NOTE TOGGLE =====
document.getElementById("note-toggle-link").addEventListener("click", e => {
  e.preventDefault();
  const wrap = document.getElementById("note-field-wrap");
  const link = document.getElementById("note-toggle-link");
  if (wrap.style.display === "none") {
    wrap.style.display = "block";
    link.textContent = "📝 Hide note";
    document.getElementById("note").focus();
  } else {
    wrap.style.display = "none";
    link.textContent = "📝 Add note";
  }
});

// ===== NOTES MODAL =====
let notesCurrentExpenseId = null;

function openNotesModal(row) {
  notesCurrentExpenseId = row.id;
  document.getElementById("notes-modal-details").textContent = `${formatDate(row.date)} — ${row.details} — ${formatAmount(row.amount)}`;
  document.getElementById("notes-modal-text").value = row.note || "";
  const modal = document.getElementById("notes-modal");
  modal.classList.add("open");
  if (activeModalTrap) activeModalTrap();
  activeModalTrap = trapFocus(modal.querySelector(".modal-content"));
  document.getElementById("notes-modal-text").focus();
}

function closeNotesModal() {
  document.getElementById("notes-modal").classList.remove("open");
  notesCurrentExpenseId = null;
  if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
}

document.getElementById("notes-cancel-btn").addEventListener("click", closeNotesModal);

document.getElementById("notes-save-btn").addEventListener("click", async () => {
  if (!notesCurrentExpenseId) return;
  const noteText = document.getElementById("notes-modal-text").value.trim();
  const row = currentRows.find(r => r.id === notesCurrentExpenseId) || reportRows.find(r => r.id === notesCurrentExpenseId);
  if (!row) { closeNotesModal(); return; }

  const saveBtn = document.getElementById("notes-save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  try {
    const res = await safeFetch(`/api/expenses/${notesCurrentExpenseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: row.date,
        details: row.details,
        category: row.category,
        amount: row.amount,
        original_amount: row.original_amount || null,
        original_currency: row.original_currency || null,
        exchange_rate: row.exchange_rate || null,
        note: noteText
      })
    });
    if (res.ok) {
      closeNotesModal();
      showToast("Note saved", "success");
      await refreshAll();
      await loadReports();
    } else {
      const err = await res.json();
      showErrorToast(err.error || "Failed to save note");
    }
  } catch {}
  saveBtn.disabled = false;
  saveBtn.textContent = "Save";
});

// ===== REPORTS TAB =====
const reportYear = document.getElementById("report-year");
const reportMonth = document.getElementById("report-month");
const reportCategory = document.getElementById("report-category");
const reportSearch = document.getElementById("report-search");
const reportWrap = document.getElementById("report-table-wrap");
const chartsContent = document.getElementById("charts-content");
const reportBatchBar = document.getElementById("report-batch-bar");
const reportSelectedCount = document.getElementById("report-selected-count");
const reportBatchCategory = document.getElementById("report-batch-category");
const reportBatchDetails = document.getElementById("report-batch-details");
const reportApplyCategory = document.getElementById("report-apply-category");
const reportApplyDetails = document.getElementById("report-apply-details");
const reportClearSelection = document.getElementById("report-clear-selection");
const reportDayLinks = document.getElementById("report-day-links");
let reportRows = [];
let selectedReportIds = new Set();
let selectedReportStartDay = "";
let selectedReportEndDay = "";

populateGenericYearPicker(reportYear, true);
setReportDefaults();
renderReportDayLinks();

document.addEventListener("click", e => {
  if (e.target.id === "chart-view-amounts") {
    chartView = "amounts";

    document.getElementById("chart-view-amounts")
      .classList.add("active");

    document.getElementById("chart-view-percentages")
      .classList.remove("active");

    loadReports();
  }

  if (e.target.id === "chart-view-percentages") {
    chartView = "percentages";

    document.getElementById("chart-view-percentages")
      .classList.add("active");

    document.getElementById("chart-view-amounts")
      .classList.remove("active");

    loadReports();
  }
});

async function fetchCharts() {
  try {
  let month, year;

  if (reportMonth.value) {
    month = parseInt(reportMonth.value, 10);
    year = (reportYear.value && reportYear.value !== "all") ? parseInt(reportYear.value, 10) : new Date().getFullYear();
  } else {
    month = (new Date().getMonth() + 1);
    year = (reportYear.value && reportYear.value !== "all") ? parseInt(reportYear.value, 10) : new Date().getFullYear();
  }

  const months = [];

    for (let i = 11; i >= 0; i--) {
    let m = month - i;
    let y = year;

    while (m <= 0) {
      m += 12;
      y--;
    }

    months.push({ month: m, year: y });
  }

  const responses = await Promise.all(
  months.map(({ month, year }) =>
    fetch(`/api/charts?month=${month}&year=${year}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
  )
);

return {
  months,
  data: responses.map(r => r ? r.pie : {})
};
  } catch (err) {
    console.error("fetchCharts error:", err);
    return null;
  }
}

function renderCharts(chartData) {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js not loaded yet");
    return;
  }
  if (!chartData || !chartData.months || !chartData.data) return;

  const { months, data } = chartData;

  const categoriesSet = new Set();

  data.forEach(monthData => {
    Object.keys(monthData).forEach(cat => {
      categoriesSet.add(cat);
    });
  });

  const chartCategories = categories
  .map(c => c.name)
  .filter(name => categoriesSet.has(name));

const labels = months.map(
  m => `${MONTH_NAMES[m.month - 1]} ${m.year}`
);

let datasets;

if (chartView === "amounts") {

  datasets = chartCategories.map(category => ({
    label: formatCategory(category),
    data: months.map((_, monthIndex) =>
      data[monthIndex][category] || 0
    ),
    backgroundColor: getCategoryColor(category),
    borderRadius: 0
  }));

} else {

  datasets = chartCategories.map(category => ({
    label: formatCategory(category),
    data: months.map((_, monthIndex) => {

      const monthTotal = Object.values(
        data[monthIndex]
      ).reduce((s, v) => s + v, 0);

      return monthTotal
        ? ((data[monthIndex][category] || 0) / monthTotal) * 100
        : 0;

    }),
    borderColor: getCategoryColor(category),
    backgroundColor: getCategoryColor(category),
    tension: 0.3,
    fill: false
  }));

}



  if (comparisonChart) {
    comparisonChart.destroy();
  }

  comparisonChart = new Chart(comparisonCtx, {
    type: chartView === "amounts" ? "bar" : "line",
    data: {
      labels,
      datasets
    },
    options: {
  responsive: true,
  maintainAspectRatio: false,

  elements: {
    bar: {
      borderRadius: 8
    }
  },
  plugins: {
  legend: {
    display: true
  },
  tooltip: {
  callbacks: {
    label: ctx => {
      const monthIndex = ctx.dataIndex;
      const category = ctx.dataset.label.toLowerCase();

      const actualAmount =
        data[monthIndex][category] || 0;

      if (chartView === "percentages") {
        const percentage = ctx.parsed.y || 0;

        return `${ctx.dataset.label}: ${formatAmount(actualAmount)} (${percentage.toFixed(1)}%)`;
      }

      return `${ctx.dataset.label}: ${formatAmount(actualAmount)}`;
    }
  }
}
},
scales: {
  x: {
    stacked: chartView === "amounts"
  },
  y: {
    stacked: chartView === "amounts",
    beginAtZero: true,
    max: chartView === "percentages" ? 100 : undefined,

    ticks: {
      callback: value =>
        chartView === "percentages"
          ? value + "%"
          : formatAmount(value)
    }
  }
}
}
});


}

async function loadReports() {
  const params = new URLSearchParams();
  const search = reportSearch.value.trim();

  if (search) {
    params.set("search", search);
  }

  if (search && reportSearchAll) {
    // "Search All" active — skip year/month filters
    params.set("year", "all");
  } else if (reportYear.value === "all") {
    params.set("year", "all");
    if (reportMonth.value) params.set("month", reportMonth.value);
  } else if (reportYear.value) {
    params.set("year", reportYear.value);
    if (reportMonth.value) params.set("month", reportMonth.value);
  }

  if (!search && reportYear.value !== "all" && reportYear.value && reportMonth.value) {
    applyReportDayParams(params);
  }
  if (reportCategory.value && reportCategory.value !== "all") {
    params.set("category", reportCategory.value);
  }

  try {
    const res = await safeFetch(`/api/reports?${params}`);
    if (!res.ok) { reportWrap.innerHTML = `<p class="report-empty">Failed to load reports.</p>`; return; }
    const data = await res.json();
    renderReportTable(data);

    // Don't update chart when searching — chart shows broad trends
    if (!search) {
      try {
        const charts = await fetchCharts();
        if (charts) renderCharts(charts);
      } catch (chartErr) {
        console.error("Chart loading failed:", chartErr);
      }
    }
  } catch {
    reportWrap.innerHTML = `<p class="report-empty">Failed to load reports.</p>`;
  }
}

function renderReportTotals(data) {
  const totalsBar = document.getElementById("report-totals-bar");
  if (!totalsBar) return;

  if (!data.length) {
    totalsBar.innerHTML = "";
    return;
  }

  const categoryTotals = {};
  let grandTotal = 0;

  for (const row of data) {
    const amount = Number(row.amount) || 0;

    categoryTotals[row.category] =
      (categoryTotals[row.category] || 0) + amount;

    grandTotal += amount;
  }

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  let html = `${data.length} entr${data.length === 1 ? "y" : "ies"}`;

  for (const [category, amount] of sortedCategories) {
  const percentage = grandTotal
    ? Math.round((amount / grandTotal) * 100)
    : 0;

  html += ` | ${formatCategory(category)}: ${formatAmountRounded(amount)} (${percentage}%)`;
}

html += ` | Total: ${formatAmountRounded(grandTotal)}`;

  totalsBar.innerHTML = html;
}

function renderReportTable(data) {
  reportRows = data;
  selectedReportIds = new Set([...selectedReportIds].filter(id => data.some(row => row.id === id)));
  updateReportSelectionUI();

  if (!data.length) {
  const search = reportSearch.value.trim();
  const msg = search ? "No results found." : "No data for selected period.";
  reportWrap.innerHTML = `<p class="report-empty">${msg}</p>`;

  renderReportTotals([]);

  return;
}

  let html = `<div class="rpt">`;
  html += `<div class="rpt-row rpt-header rpt-flat-row">
    <span class="rpt-select"><input type="checkbox" id="report-select-all" aria-label="Select all visible expenses"></span>
    <span class="rpt-date">Date</span>
    <span class="rpt-label">Description</span>
    <span class="rpt-cat">Category</span>
    <span class="rpt-amt">Amount</span>
    <span class="rpt-actions">Actions</span>
  </div>`;

  for (const exp of data) {
    let amountDisplay = formatAmount(exp.amount);
    if (exp.original_currency && exp.original_amount) {
      amountDisplay += `<br><span class="original-amt">${getCurrencySymbol(exp.original_currency)} ${new Intl.NumberFormat(getCurrencyLocale(exp.original_currency), { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(exp.original_amount)}</span>`;
    }
    html += `<div class="rpt-row rpt-expense rpt-flat-row" data-id="${exp.id}">`;
    html += `  <span class="rpt-select"><input type="checkbox" class="report-row-check" data-id="${exp.id}" aria-label="Select expense" ${selectedReportIds.has(exp.id) ? "checked" : ""}></span>`;
    html += `  <span class="rpt-date">${escapeHtml(formatDate(exp.date))}</span>`;
    html += `  <span class="rpt-label">${escapeHtml(exp.details)}</span>`;
    html += `  <span class="rpt-cat"><span class="cat-badge" style="background:${getCategoryColor(exp.category)}20;color:${getCategoryColor(exp.category)}">${escapeHtml(formatCategory(exp.category))}</span></span>`;
    html += `  <span class="rpt-amt">${amountDisplay}</span>`;
    html += `  <span class="rpt-actions">${exp.note ? `<button class="action-btn rpt-note-btn" data-id="${exp.id}" title="View note" aria-label="View note">📝</button>` : `<button class="action-btn rpt-note-btn notes-empty" data-id="${exp.id}" title="Add note" aria-label="Add note">🗒️</button>`}<button class="action-btn rpt-copy-btn" data-id="${exp.id}" title="Copy to date" aria-label="Copy expense">📋</button><button class="action-btn rpt-edit-btn" data-id="${exp.id}" title="Edit" aria-label="Edit expense">✏️</button><button class="action-btn delete rpt-delete-btn" data-id="${exp.id}" title="Delete" aria-label="Delete expense">🗑️</button></span>`;
    html += `</div>`;
  }
  html += `</div>`;
  reportWrap.innerHTML = html;

  renderReportTotals(data);

  updateReportSelectionUI();
  }

function updateReportSelectionUI() {
  const visibleIds = reportRows.map(row => row.id);
  const selectedVisibleCount = visibleIds.filter(id => selectedReportIds.has(id)).length;
  const hasSelection = selectedReportIds.size > 0;

  if (reportBatchBar) reportBatchBar.hidden = !hasSelection;
  if (reportSelectedCount) reportSelectedCount.textContent = `${selectedReportIds.size} selected`;

  const selectAll = document.getElementById("report-select-all");
  if (selectAll) {
    selectAll.checked = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
    selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
  }

  reportWrap.querySelectorAll(".report-row-check").forEach(input => {
    input.checked = selectedReportIds.has(parseInt(input.dataset.id, 10));
  });
}

function clearReportSelection() {
  selectedReportIds.clear();
  updateReportSelectionUI();
}

async function batchUpdateSelected(payload, confirmMessage) {
  const ids = [...selectedReportIds];
  if (!ids.length) return;
  if (!await showConfirm("Update Selected", confirmMessage)) return;

  const res = await safeFetch("/api/expenses/batch-selected", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, ...payload })
  });

  if (res.ok) {
    const result = await res.json();
    clearReportSelection();
    if (reportBatchDetails) reportBatchDetails.value = "";
    await loadReports();
    await refreshAll();
    populateDetailsList();
    showToast(`Updated ${result.updated} expense${result.updated === 1 ? "" : "s"}.`, "success");
  } else {
    const err = await res.json();
    showErrorToast(err.error || "Failed to update selected expenses.");
  }
}

// Report table click handlers (select + edit/delete/copy)
reportWrap.addEventListener("click", async e => {
  // Handle note button click in report
  const noteBtn = e.target.closest(".rpt-note-btn");
  if (noteBtn) {
    const id = parseInt(noteBtn.dataset.id, 10);
    const exp = reportRows.find(r => r.id === id);
    if (exp) openNotesModal(exp);
    return;
  }

  const selectAll = e.target.closest("#report-select-all");
  if (selectAll) {
    const checked = selectAll.checked;
    reportRows.forEach(row => {
      if (checked) selectedReportIds.add(row.id);
      else selectedReportIds.delete(row.id);
    });
    updateReportSelectionUI();
    return;
  }

  const check = e.target.closest(".report-row-check");
  if (check) {
    const id = parseInt(check.dataset.id, 10);
    if (check.checked) selectedReportIds.add(id);
    else selectedReportIds.delete(id);
    updateReportSelectionUI();
    return;
  }

  const copyBtn = e.target.closest(".rpt-copy-btn");
  if (copyBtn) {
    const id = parseInt(copyBtn.dataset.id, 10);
    try {
      const res = await safeFetch(`/api/expenses/${id}`);
      if (res.ok) { const row = await res.json(); openCopyModal(row); }
    } catch {}
    return;
  }

  const editBtn = e.target.closest(".rpt-edit-btn");
  if (editBtn) {
    const id = parseInt(editBtn.dataset.id, 10);
    try {
      const res = await safeFetch(`/api/expenses/${id}`);
      if (res.ok) { const row = await res.json(); openEditModal(row); }
    } catch {}
    return;
  }

  const delBtn = e.target.closest(".rpt-delete-btn");
  if (delBtn) {
    const id = parseInt(delBtn.dataset.id, 10);
    if (!await showConfirm("Delete Expense", "Delete this expense?")) return;
    delBtn.disabled = true;
    delBtn.textContent = "⏳";
    delBtn.style.opacity = "0.5";
    delBtn.style.pointerEvents = "none";
    const siblings = delBtn.parentElement.querySelectorAll("button");
    siblings.forEach(s => { s.disabled = true; s.style.pointerEvents = "none"; });
    try {
      const res = await safeFetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) { await loadReports(); await refreshAll(); populateDetailsList(); }
      else { alert("Failed to delete"); siblings.forEach(s => { s.disabled = false; s.style.pointerEvents = ""; }); delBtn.textContent = "🗑️"; delBtn.style.opacity = ""; }
    } catch { siblings.forEach(s => { s.disabled = false; s.style.pointerEvents = ""; }); delBtn.textContent = "🗑️"; delBtn.style.opacity = ""; }
    return;
  }
});

reportApplyCategory.addEventListener("click", () => {
  const category = reportBatchCategory.value;
  if (!category) return;
  batchUpdateSelected({ category }, `Change ${selectedReportIds.size} selected expense${selectedReportIds.size === 1 ? "" : "s"} to "${formatCategory(category)}"?`);
});

reportApplyDetails.addEventListener("click", () => {
  const details = reportBatchDetails.value.trim();
  if (!details) {
    showErrorToast("Enter new details first.");
    return;
  }
  batchUpdateSelected({ details }, `Rename ${selectedReportIds.size} selected expense${selectedReportIds.size === 1 ? "" : "s"} to "${details}"?`);
});

reportClearSelection.addEventListener("click", clearReportSelection);

reportBatchDetails.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    reportApplyDetails.click();
  }
  });

// Dynamic filter listeners (no Apply button — filters trigger immediately)
let reportFilterDebounce = null;
function debouncedLoadReports() {
  clearTimeout(reportFilterDebounce);
  reportFilterDebounce = setTimeout(loadReports, 300);
}

function clearReportDaySelection() {
  selectedReportStartDay = "";
  selectedReportEndDay = "";
}

function getReportDayRange() {
  const start = parseInt(selectedReportStartDay, 10);
  const end = parseInt(selectedReportEndDay || selectedReportStartDay, 10);
  if (!start || !end) return null;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end)
  };
}

function applyReportDayParams(params) {
  const range = getReportDayRange();
  if (!range) return;

  if (range.start === range.end) {
    params.set("day", range.start);
  } else {
    params.set("startDay", range.start);
    params.set("endDay", range.end);
  }
}

function renderReportDayLinks() {
  if (!reportDayLinks) return;

  const search = reportSearch.value.trim();
  const year = parseInt(reportYear.value, 10);
  const month = parseInt(reportMonth.value, 10);

  if (search || reportYear.value === "all" || !year || !month) {
    reportDayLinks.innerHTML = "";
    return;
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (Number(selectedReportStartDay) > daysInMonth || Number(selectedReportEndDay) > daysInMonth) {
    clearReportDaySelection();
  }
  const selectedRange = getReportDayRange();

  const links = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const isInRange = selectedRange && day >= selectedRange.start && day <= selectedRange.end;
    const isEndpoint = selectedRange && (day === selectedRange.start || day === selectedRange.end);
    const classes = [
      "report-day-link",
      isInRange ? "in-range" : "",
      isEndpoint ? "active" : ""
    ].filter(Boolean).join(" ");
    links.push(`<button type="button" class="${classes}" data-day="${day}" aria-pressed="${isInRange ? "true" : "false"}">${day}</button>`);
  }

  reportDayLinks.innerHTML = links.join("");
}

function selectReportDay(day, extendRange) {
  if (!selectedReportStartDay) {
    selectedReportStartDay = day;
    selectedReportEndDay = "";
    return;
  }

  const isSingleDay = !selectedReportEndDay || selectedReportStartDay === selectedReportEndDay;

  if (isSingleDay && selectedReportStartDay === day && !extendRange) {
    clearReportDaySelection();
    return;
  }

  if (isSingleDay && (extendRange || selectedReportStartDay !== day)) {
    selectedReportEndDay = day;
    return;
  }

  selectedReportStartDay = day;
  selectedReportEndDay = "";
}

// When user changes year/month/category, reload with current filters (including search)
function onReportFilterChange(e) {
  if (e && (e.currentTarget === reportYear || e.currentTarget === reportMonth)) {
    clearReportDaySelection();
  }
  updateReportFilterState();
  renderReportDayLinks();
  debouncedLoadReports();
}

reportYear.addEventListener("change", onReportFilterChange);
reportMonth.addEventListener("change", onReportFilterChange);
reportCategory.addEventListener("change", onReportFilterChange);

reportDayLinks.addEventListener("click", e => {
  const btn = e.target.closest(".report-day-link");
  if (!btn) return;

  reportSearch.value = "";
  selectReportDay(btn.dataset.day, e.shiftKey);
  updateReportFilterState();
  renderReportDayLinks();
  loadReports();
});

// Report search — as-you-type, respects current year/month selection, min 2 chars
reportSearch.addEventListener("input", () => {
  clearReportDaySelection();
  updateReportFilterState();
  renderReportDayLinks();
  clearTimeout(reportFilterDebounce);
  const q = reportSearch.value.trim();
  if (q.length === 1) return; // wait for at least 2 chars
  reportFilterDebounce = setTimeout(loadReports, 400);
});

// "Search All" toggle — when active, search ignores year/month filters
const reportSearchAllToggle = document.getElementById("report-search-all-toggle");
let reportSearchAll = false;

reportSearchAllToggle.addEventListener("click", () => {
  reportSearchAll = !reportSearchAll;
  reportSearchAllToggle.classList.toggle("active", reportSearchAll);
  updateReportFilterState();
  if (reportSearch.value.trim().length >= 2) {
    debouncedLoadReports();
  }
});

// Visual feedback: dim year/month when "Search All" is active and there's a search term
function updateReportFilterState() {
  const dimFilters = reportSearchAll && reportSearch.value.trim().length >= 2;
  reportYear.style.opacity = dimFilters ? "0.5" : "";
  reportMonth.style.opacity = dimFilters ? "0.5" : "";
  reportYear.closest("label").style.opacity = dimFilters ? "0.5" : "";
  reportMonth.closest("label").style.opacity = dimFilters ? "0.5" : "";
}

document.getElementById("report-reset").addEventListener("click", () => {
  reportSearch.value = "";
  reportCategory.value = "all";
  reportSearchAll = false;
  reportSearchAllToggle.classList.remove("active");
  clearReportDaySelection();
  setReportDefaults();
  updateReportFilterState();
  renderReportDayLinks();
  loadReports();
});

function setReportDefaults() {
  const now = new Date();
  reportYear.value = now.getFullYear();
  reportMonth.value = String(now.getMonth() + 1);
  reportSearch.value = "";
  clearReportDaySelection();
}

// ===== CSV DOWNLOAD (uses report filters) =====
document.getElementById("report-csv-btn").addEventListener("click", async () => {
  const params = new URLSearchParams();
  const search = reportSearch.value.trim();

  if (search) {
    params.set("search", search);
  }

  if (search && reportSearchAll) {
    params.set("year", "all");
  } else if (reportYear.value === "all") {
    params.set("year", "all");
    if (reportMonth.value) params.set("month", reportMonth.value);
  } else if (reportYear.value) {
    params.set("year", reportYear.value);
    if (reportMonth.value) params.set("month", reportMonth.value);
  }
  if (!search && reportYear.value !== "all" && reportYear.value && reportMonth.value) {
    applyReportDayParams(params);
  }
  if (reportCategory.value && reportCategory.value !== "all") {
    params.set("category", reportCategory.value);
  }

  try {
    const res = await safeFetch(`/api/export/csv?${params}`);
    if (!res.ok) { alert("Failed to download CSV"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "expenses.csv"; a.click();
    URL.revokeObjectURL(url);
  } catch {}
});

// ===== SETTINGS TAB =====

// Categories management
const categoriesList = document.getElementById("categories-list");
const newCategoryName = document.getElementById("new-category-name");
const newCategoryColor = document.getElementById("new-category-color");
const addCategoryBtn = document.getElementById("add-category-btn");
const categoryMessage = document.getElementById("category-message");

// Show/hide the add category form
const showAddCategoryBtn = document.getElementById("show-add-category-btn");
const categoryAddRow = document.getElementById("category-add-row");
const cancelAddCategoryBtn = document.getElementById("cancel-add-category-btn");

showAddCategoryBtn.addEventListener("click", () => {
  categoryAddRow.style.display = "flex";
  showAddCategoryBtn.style.display = "none";
  newCategoryName.focus();
});

cancelAddCategoryBtn.addEventListener("click", () => {
  categoryAddRow.style.display = "none";
  showAddCategoryBtn.style.display = "";
  newCategoryName.value = "";
  categoryMessage.textContent = "";
  categoryMessage.className = "form-msg";
});

async function loadCategories() {
  try {
    const res = await fetch("/api/categories");
    if (res.ok) categories = await res.json();
  } catch {}
  renderCategoriesList();
  populateCategorySelect(categoryInput, false);
  populateCategorySelect(reportCategory, true);
  populateCategorySelect(reportBatchCategory, false);
  if (reportCategory.options[0]) reportCategory.options[0].textContent = "All Categories";
  if (newCategoryColor && categories[0]) newCategoryColor.value = categories[0].color;
}

function renderCategoriesList() {
  categoriesList.innerHTML = "";
  categories.forEach((cat, index) => {
    const div = document.createElement("div");
    div.className = "category-item";
    div.dataset.id = cat.id;
    div.innerHTML = `
      <div class="category-reorder-controls" aria-label="Reorder ${escapeHtml(formatCategory(cat.name))}">
        <button class="cat-move-btn cat-move-up" data-id="${cat.id}" ${index === 0 ? "disabled" : ""} title="Move up" aria-label="Move ${escapeHtml(formatCategory(cat.name))} up">↑</button>
        <button class="cat-move-btn cat-move-down" data-id="${cat.id}" ${index === categories.length - 1 ? "disabled" : ""} title="Move down" aria-label="Move ${escapeHtml(formatCategory(cat.name))} down">↓</button>
      </div>
      <span class="category-color-dot" style="background:${cat.color}" data-id="${cat.id}" title="Change color" role="button" tabindex="0" aria-label="Change color for ${escapeHtml(formatCategory(cat.name))}"></span>
      <span class="category-name">${escapeHtml(formatCategory(cat.name))}</span>
      <button class="cat-rename-btn" data-id="${cat.id}" title="Rename category" aria-label="Rename ${escapeHtml(formatCategory(cat.name))}">✏️</button>
      <button class="cat-delete-btn" data-id="${cat.id}" title="Delete category" aria-label="Delete ${escapeHtml(formatCategory(cat.name))}">🗑️</button>
    `;
    categoriesList.appendChild(div);
  });
}

addCategoryBtn.addEventListener("click", async () => {
  const name = newCategoryName.value.trim();
  if (!name) { categoryMessage.textContent = "Enter a name."; categoryMessage.className = "form-msg error"; return; }

  try {
    const res = await safeFetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color: newCategoryColor.value }) });
    const data = await res.json();
    if (res.ok) {
      categoryMessage.textContent = `Added "${formatCategory(data.name)}".`;
      categoryMessage.className = "form-msg success";
      newCategoryName.value = "";
      categoryAddRow.style.display = "none";
      showAddCategoryBtn.style.display = "";
      await loadCategories();
    } else {
      categoryMessage.textContent = data.error || "Failed to add.";
      categoryMessage.className = "form-msg error";
    }
  } catch {}
});

async function saveCategoryOrder() {
  const order = categories.map(cat => cat.id);
  const res = await safeFetch("/api/categories/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order })
  });

  if (res.ok) {
    await loadCategories();
    await refreshAll();
    await loadReports();
    categoryMessage.textContent = "Category order saved.";
    categoryMessage.className = "form-msg success";
    setTimeout(() => { categoryMessage.textContent = ""; categoryMessage.className = "form-msg"; }, 2000);
  } else {
    categoryMessage.textContent = "Failed to save category order.";
    categoryMessage.className = "form-msg error";
  }
}

async function moveCategory(id, direction) {
  const index = categories.findIndex(cat => cat.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= categories.length) return;
  [categories[index], categories[nextIndex]] = [categories[nextIndex], categories[index]];
  renderCategoriesList();
  await saveCategoryOrder();
}

categoriesList.addEventListener("click", async e => {
  const moveUpBtn = e.target.closest(".cat-move-up");
  if (moveUpBtn) {
    await moveCategory(parseInt(moveUpBtn.dataset.id, 10), -1);
    return;
  }

  const moveDownBtn = e.target.closest(".cat-move-down");
  if (moveDownBtn) {
    await moveCategory(parseInt(moveDownBtn.dataset.id, 10), 1);
    return;
  }

  // Color change
  const colorDot = e.target.closest(".category-color-dot");
  if (colorDot) {
    const id = parseInt(colorDot.dataset.id, 10);
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    const picker = document.createElement("input");
    picker.type = "color";
    picker.value = cat.color;
    picker.className = "category-color-input";
    picker.setAttribute("aria-label", `Choose color for ${formatCategory(cat.name)}`);
    colorDot.insertAdjacentElement("afterend", picker);
    picker.addEventListener("input", () => {
      colorDot.style.background = picker.value;
    });
    picker.addEventListener("change", async () => {
      const color = picker.value;
      picker.remove();
      if (color === cat.color) return;
      try {
        const res = await safeFetch(`/api/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: cat.name, color }) });
        if (res.ok) {
          categoryMessage.textContent = `Color updated for "${formatCategory(cat.name)}".`;
          categoryMessage.className = "form-msg success";
          await loadCategories();
          await refreshAll();
          await loadReports();
        } else {
          const data = await res.json();
          categoryMessage.textContent = data.error || "Failed to update color.";
          categoryMessage.className = "form-msg error";
        }
      } catch {}
    });
    picker.click();
    return;
  }

  // Rename
  const renameBtn = e.target.closest(".cat-rename-btn");
  if (renameBtn) {
    const id = parseInt(renameBtn.dataset.id, 10);
    const cat = categories.find(c => c.id === id);
    const item = renameBtn.closest(".category-item");
    const nameSpan = item.querySelector(".category-name");
    const deleteBtn = item.querySelector(".cat-delete-btn");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "category-name-input";
    input.value = formatCategory(cat.name);
    input.maxLength = 30;

    const saveBtn = document.createElement("button");
    saveBtn.className = "cat-save-btn";
    saveBtn.title = "Save";
    saveBtn.textContent = "✓";
    saveBtn.setAttribute("aria-label", "Save rename");

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cat-cancel-btn";
    cancelBtn.title = "Cancel";
    cancelBtn.textContent = "✕";
    cancelBtn.setAttribute("aria-label", "Cancel rename");

    nameSpan.replaceWith(input);
    renameBtn.style.display = "none";
    deleteBtn.style.display = "none";
    item.insertBefore(saveBtn, item.querySelector(".cat-rename-btn") || null);
    item.insertBefore(cancelBtn, saveBtn.nextSibling);

    input.focus();
    input.select();

    let resolved = false;

    const revert = () => {
      if (resolved) return;
      resolved = true;
      const span = document.createElement("span");
      span.className = "category-name";
      span.textContent = formatCategory(cat.name);
      input.replaceWith(span);
      saveBtn.remove();
      cancelBtn.remove();
      renameBtn.style.display = "";
      deleteBtn.style.display = "";
    };

    const doRename = async () => {
      if (resolved) return;
      resolved = true;
      const newName = input.value.trim();
      if (!newName || newName.toLowerCase() === cat.name) {
        revert();
        return;
      }
      try {
        const res = await safeFetch(`/api/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, color: cat.color }) });
        const data = await res.json();
        if (res.ok) {
          categoryMessage.textContent = `Renamed "${formatCategory(cat.name)}" → "${formatCategory(newName)}".`;
          categoryMessage.className = "form-msg success";
          await loadCategories();
          await refreshAll();
        } else {
          categoryMessage.textContent = data.error || "Failed to rename.";
          categoryMessage.className = "form-msg error";
          revert();
        }
      } catch { revert(); }
    };

    saveBtn.addEventListener("click", e => { e.stopPropagation(); doRename(); });
    cancelBtn.addEventListener("click", e => { e.stopPropagation(); revert(); });
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doRename(); } if (e.key === "Escape") { revert(); } });
    return;
  }

  // Delete
  const delBtn = e.target.closest(".cat-delete-btn");
  if (!delBtn) return;
  const id = parseInt(delBtn.dataset.id, 10);
  const cat = categories.find(c => c.id === id);
  if (!await showConfirm("Delete Category", `Delete category "${formatCategory(cat.name)}"?\n\nThis will permanently remove the category. Any historical expenses using it will lose their category assignment.\n\nConsider renaming instead.`)) return;
  try {
    const res = await safeFetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      categoryMessage.textContent = "Deleted.";
      categoryMessage.className = "form-msg success";
      await loadCategories();
    } else {
      categoryMessage.textContent = data.error || "Failed to delete.";
      categoryMessage.className = "form-msg error";
    }
  } catch {}
});

// ===== DATE FORMAT SETTINGS =====
async function loadDateFormatSetting() {
  populateBaseCurrencySelect(); // Ensure dropdown is populated even before API responds
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      if (data.date_format) {
        dateFormat = data.date_format;
        const sel = document.getElementById("settings-date-format");
        if (sel) sel.value = data.date_format;
      }
      if (data.base_currency) {
        baseCurrency = data.base_currency;
        populateBaseCurrencySelect();
      }
      if (data.abroad_mode) {
        try { abroadMode = JSON.parse(data.abroad_mode); } catch { abroadMode = { active: false, currency: "" }; }
        updateAbroadUI();
      }
    }
  } catch {}
}

document.getElementById("settings-date-format-save").addEventListener("click", async function() {
  const btn = this;
  const sel = document.getElementById("settings-date-format");
  const msg = document.getElementById("date-format-message");
  const selectedFormat = sel.value;
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const res = await safeFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date_format: selectedFormat })
    });
    if (res.ok) {
      dateFormat = selectedFormat;
      msg.textContent = "Date format saved.";
      msg.className = "form-msg success";
      renderRows(currentRows);
      await loadReports();
    } else {
      const err = await res.json();
      msg.textContent = err.error || "Failed to save.";
      msg.className = "form-msg error";
    }
  } catch {
    msg.textContent = "Failed to save.";
    msg.className = "form-msg error";
  }
  btn.disabled = false;
  btn.textContent = "Save";
  setTimeout(() => { msg.textContent = ""; msg.className = "form-msg"; }, 3000);
});

// ===== BASE CURRENCY SETTINGS =====
function populateBaseCurrencySelect() {
  const sel = document.getElementById("settings-base-currency");
  if (!sel) return;
  sel.innerHTML = "";
  for (const curr of SUPPORTED_CURRENCIES) {
    const o = document.createElement("option");
    o.value = curr.code;
    o.textContent = `${getCurrencySymbol(curr.code)} ${curr.code} — ${curr.name}`;
    sel.appendChild(o);
  }
  sel.value = baseCurrency;
}

document.getElementById("settings-base-currency-save").addEventListener("click", async function() {
  const btn = this;
  const sel = document.getElementById("settings-base-currency");
  const msg = document.getElementById("base-currency-message");
  const val = sel.value;
  if (!val) { msg.textContent = "Select a currency."; msg.className = "form-msg error"; return; }
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const res = await safeFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_currency: val })
    });
    if (res.ok) {
      baseCurrency = val;
      msg.textContent = "Base currency saved.";
      msg.className = "form-msg success";
      renderRows(currentRows);
      await refreshAll();
      await loadReports();
      updateAbroadModeInfo();
    } else {
      const err = await res.json();
      msg.textContent = err.error || "Failed to save.";
      msg.className = "form-msg error";
    }
  } catch {
    msg.textContent = "Failed to save.";
    msg.className = "form-msg error";
  }
  btn.disabled = false;
  btn.textContent = "Save";
  setTimeout(() => { msg.textContent = ""; msg.className = "form-msg"; }, 3000);
});

// ===== CURRENCY RATES SETTINGS =====
async function loadCurrencyRates() {
  try {
    const res = await fetch("/api/currency-rates");
    if (res.ok) currencyRates = await res.json();
  } catch {}
  renderCurrencyRatesList();
  populateAbroadCurrencySelect();
}

function renderCurrencyRatesList() {
  const list = document.getElementById("currency-rates-list");
  list.innerHTML = "";
  if (currencyRates.length === 0) {
    list.innerHTML = '<p style="font-size:0.8rem;color:var(--text-secondary);">No currency rates defined yet.</p>';
    return;
  }
  for (const rate of currencyRates) {
    const div = document.createElement("div");
    div.className = "currency-rate-item";
    div.dataset.code = rate.code;
    div.innerHTML = `
      <span class="rate-code">${escapeHtml(rate.code)}</span>
      <span class="rate-name">${escapeHtml(rate.name)}</span>
      <span class="rate-value">${rate.rate}</span>
      <button class="cat-rename-btn rate-edit-btn" data-code="${escapeHtml(rate.code)}" title="Edit rate" aria-label="Edit ${escapeHtml(rate.code)} rate">✏️</button>
      <button class="cat-delete-btn rate-delete-btn" data-code="${escapeHtml(rate.code)}" title="Delete rate" aria-label="Delete ${escapeHtml(rate.code)} rate">🗑️</button>
    `;
    list.appendChild(div);
  }
}

function populateAbroadCurrencySelect() {
  const sel = document.getElementById("abroad-currency-select");
  if (!sel) return;
  sel.innerHTML = "";
  if (currencyRates.length === 0) {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "No currencies defined";
    sel.appendChild(o);
  } else {
    for (const rate of currencyRates) {
      const o = document.createElement("option");
      o.value = rate.code;
      o.textContent = `${rate.code} — ${rate.name}`;
      sel.appendChild(o);
    }
  }
  // Set current abroad currency if active
  if (abroadMode.currency && [...sel.options].some(o => o.value === abroadMode.currency)) {
    sel.value = abroadMode.currency;
  }
}

document.getElementById("show-add-rate-btn").addEventListener("click", () => {
  document.getElementById("rate-add-row").style.display = "flex";
  document.getElementById("show-add-rate-btn").style.display = "none";
  document.getElementById("new-rate-code").focus();
});

document.getElementById("cancel-add-rate-btn").addEventListener("click", () => {
  document.getElementById("rate-add-row").style.display = "none";
  document.getElementById("show-add-rate-btn").style.display = "";
  document.getElementById("new-rate-code").value = "";
  document.getElementById("new-rate-name").value = "";
  document.getElementById("new-rate-value").value = "";
});

document.getElementById("add-rate-btn").addEventListener("click", async () => {
  const code = document.getElementById("new-rate-code").value.trim().toUpperCase();
  const name = document.getElementById("new-rate-name").value.trim();
  const rate = document.getElementById("new-rate-value").value.trim();
  const msg = document.getElementById("rate-message");

  if (!code) { msg.textContent = "Enter a currency code."; msg.className = "form-msg error"; return; }
  if (!name) { msg.textContent = "Enter a currency name."; msg.className = "form-msg error"; return; }
  if (!rate || isNaN(parseFloat(rate)) || parseFloat(rate) <= 0) { msg.textContent = "Enter a valid rate."; msg.className = "form-msg error"; return; }

  try {
    const res = await safeFetch("/api/currency-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, rate: parseFloat(rate) })
    });
    if (res.ok) {
      msg.textContent = `Added ${code}.`;
      msg.className = "form-msg success";
      document.getElementById("new-rate-code").value = "";
      document.getElementById("new-rate-name").value = "";
      document.getElementById("new-rate-value").value = "";
      document.getElementById("rate-add-row").style.display = "none";
      document.getElementById("show-add-rate-btn").style.display = "";
      await loadCurrencyRates();
      updateAbroadModeInfo();
    } else {
      const err = await res.json();
      msg.textContent = err.error || "Failed to add.";
      msg.className = "form-msg error";
    }
  } catch {}
  setTimeout(() => { msg.textContent = ""; msg.className = "form-msg"; }, 3000);
});

document.getElementById("currency-rates-list").addEventListener("click", async e => {
  // Edit
  const editBtn = e.target.closest(".rate-edit-btn");
  if (editBtn) {
    const code = editBtn.dataset.code;
    const rate = currencyRates.find(r => r.code === code);
    if (!rate) return;
    const item = editBtn.closest(".currency-rate-item");

    // Prevent double edit
    if (item.querySelector(".rate-name-input")) return;

    const codeSpan = item.querySelector(".rate-code");
    const nameSpan = item.querySelector(".rate-name");
    const valueSpan = item.querySelector(".rate-value");
    const deleteBtn = item.querySelector(".rate-delete-btn");

    // Replace with inputs
    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.className = "category-name-input";
    codeInput.value = rate.code;
    codeInput.maxLength = 5;
    codeInput.style.cssText = "max-width:70px; text-transform:uppercase;";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "category-name-input rate-name-input";
    nameInput.value = rate.name;
    nameInput.style.cssText = "flex:1;";

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.className = "category-name-input";
    valueInput.value = rate.rate;
    valueInput.inputMode = "decimal";
    valueInput.style.cssText = "max-width:100px;";

    const saveBtn = document.createElement("button");
    saveBtn.className = "cat-save-btn";
    saveBtn.title = "Save";
    saveBtn.textContent = "✓";
    saveBtn.setAttribute("aria-label", "Save changes");

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cat-cancel-btn";
    cancelBtn.title = "Cancel";
    cancelBtn.textContent = "✕";
    cancelBtn.setAttribute("aria-label", "Cancel edit");

    codeSpan.replaceWith(codeInput);
    nameSpan.replaceWith(nameInput);
    valueSpan.replaceWith(valueInput);
    editBtn.style.display = "none";
    deleteBtn.style.display = "none";
    item.appendChild(saveBtn);
    item.appendChild(cancelBtn);

    nameInput.focus();
    nameInput.select();

    let resolved = false;

    const revert = () => {
      if (resolved) return;
      resolved = true;
      renderCurrencyRatesList();
    };

    const doSave = async () => {
      if (resolved) return;
      resolved = true;
      const newCode = codeInput.value.trim().toUpperCase();
      const newName = nameInput.value.trim();
      const newRate = parseFloat(valueInput.value.trim());
      const msg = document.getElementById("rate-message");

      if (!newCode || !newName || isNaN(newRate) || newRate <= 0) {
        msg.textContent = "All fields are required with a valid rate.";
        msg.className = "form-msg error";
        setTimeout(() => { msg.textContent = ""; msg.className = "form-msg"; }, 3000);
        revert();
        return;
      }

      try {
        // If code changed, delete old and create new
        if (newCode !== rate.code) {
          await safeFetch(`/api/currency-rates/${rate.code}`, { method: "DELETE" });
        }
        const res = await safeFetch("/api/currency-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: newCode, name: newName, rate: newRate })
        });
        if (res.ok) {
          msg.textContent = `Updated ${newCode}.`;
          msg.className = "form-msg success";
          await loadCurrencyRates();
          updateAbroadModeInfo();
        } else {
          const err = await res.json();
          msg.textContent = err.error || "Failed to update.";
          msg.className = "form-msg error";
          renderCurrencyRatesList();
        }
      } catch { renderCurrencyRatesList(); }
      setTimeout(() => { const msg2 = document.getElementById("rate-message"); msg2.textContent = ""; msg2.className = "form-msg"; }, 3000);
    };

    saveBtn.addEventListener("click", e2 => { e2.stopPropagation(); doSave(); });
    cancelBtn.addEventListener("click", e2 => { e2.stopPropagation(); revert(); });
    nameInput.addEventListener("keydown", e2 => { if (e2.key === "Enter") { e2.preventDefault(); doSave(); } if (e2.key === "Escape") revert(); });
    valueInput.addEventListener("keydown", e2 => { if (e2.key === "Enter") { e2.preventDefault(); doSave(); } if (e2.key === "Escape") revert(); });
    codeInput.addEventListener("keydown", e2 => { if (e2.key === "Enter") { e2.preventDefault(); doSave(); } if (e2.key === "Escape") revert(); });
    return;
  }

  // Delete
  const btn = e.target.closest(".rate-delete-btn");
  if (!btn) return;
  const code = btn.dataset.code;
  if (!await showConfirm("Delete Currency Rate", `Remove exchange rate for ${code}?`)) return;
  try {
    const res = await safeFetch(`/api/currency-rates/${code}`, { method: "DELETE" });
    if (res.ok) {
      await loadCurrencyRates();
      // If abroad mode was using this currency, deactivate abroad mode
      if (abroadMode.active && abroadMode.currency === code) {
        abroadMode = { active: false, currency: "" };
        await safeFetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ abroad_mode: abroadMode })
        });
        updateAbroadUI();
        updateAbroadModeInfo();
      }
    }
  } catch {}
});

// ===== ABROAD MODE SETTINGS =====
function updateAbroadUI() {
  const toggle = document.getElementById("abroad-toggle");
  const currLabel = document.getElementById("abroad-currency-label");
  const currSel = document.getElementById("abroad-currency-select");
  if (toggle) toggle.checked = abroadMode.active;
  if (currLabel) currLabel.style.display = abroadMode.active ? "" : "none";
  if (currSel && abroadMode.currency) currSel.value = abroadMode.currency;
  updateAbroadModeInfo();
}

function updateAbroadModeInfo() {
  const infoEl = document.getElementById("abroad-mode-info");
  const amountLabel = document.getElementById("amount-label-text");
  if (!infoEl) return;
  if (abroadMode.active && abroadMode.currency) {
    const rate = currencyRates.find(r => r.code === abroadMode.currency);
    if (rate) {
      infoEl.textContent = `Abroad mode is on. Amounts entered in ${abroadMode.currency} will be converted to ${baseCurrency} at the rate of ${rate.rate} set in your currency settings.`;
      infoEl.style.display = "block";
      if (amountLabel) amountLabel.textContent = `Amount (${getCurrencySymbol(abroadMode.currency)})`;
    } else {
      infoEl.textContent = `Abroad mode is on but no rate found for ${abroadMode.currency}. Please set a rate in Settings.`;
      infoEl.style.display = "block";
      if (amountLabel) amountLabel.textContent = "Amount";
    }
  } else {
    infoEl.style.display = "none";
    if (amountLabel) amountLabel.textContent = `Amount (${getCurrencySymbol(baseCurrency)})`;
  }
}

document.getElementById("abroad-toggle").addEventListener("change", function() {
  const currLabel = document.getElementById("abroad-currency-label");
  currLabel.style.display = this.checked ? "" : "none";
});

document.getElementById("abroad-save-btn").addEventListener("click", async function() {
  const btn = this;
  const toggle = document.getElementById("abroad-toggle");
  const currSel = document.getElementById("abroad-currency-select");
  const msg = document.getElementById("abroad-message");
  const active = toggle.checked;
  const currency = active ? currSel.value : "";

  if (active && !currency) {
    msg.textContent = "Please select a foreign currency.";
    msg.className = "form-msg error";
    return;
  }
  if (active && !currencyRates.find(r => r.code === currency)) {
    msg.textContent = "Selected currency has no rate defined.";
    msg.className = "form-msg error";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const res = await safeFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abroad_mode: { active, currency } })
    });
    if (res.ok) {
      abroadMode = { active, currency };
      msg.textContent = active ? `Abroad mode ON (${currency}).` : "Abroad mode OFF.";
      msg.className = "form-msg success";
      updateAbroadUI();
    } else {
      const err = await res.json();
      msg.textContent = err.error || "Failed to save.";
      msg.className = "form-msg error";
    }
  } catch {
    msg.textContent = "Failed to save.";
    msg.className = "form-msg error";
  }
  btn.disabled = false;
  btn.textContent = "Save";
  setTimeout(() => { msg.textContent = ""; msg.className = "form-msg"; }, 3000);
});

// ===== LOCK SETTINGS =====
const lockSetupSection = document.getElementById("lock-setup-section");
const lockDisableSection = document.getElementById("lock-disable-section");

async function loadLockSettings() {
  try {
    const res = await fetch("/api/lock/status");
    const { locked } = await res.json();
    lockSetupSection.style.display = locked ? "none" : "block";
    lockDisableSection.style.display = locked ? "block" : "none";
    document.getElementById("lock-recovery-alert-section").style.display = "none";
    document.getElementById("settings-pin").value = "";
    document.getElementById("settings-pin-confirm").value = "";
    document.getElementById("settings-lock-message").textContent = "";
    document.getElementById("settings-lock-message").className = "form-msg";
  } catch {}
}

document.getElementById("settings-lock-enable").addEventListener("click", async () => {
  const pin = document.getElementById("settings-pin").value;
  const confirmPin = document.getElementById("settings-pin-confirm").value;
  const msg = document.getElementById("settings-lock-message");
  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) { msg.textContent = "PIN must be exactly 6 digits."; msg.className = "form-msg error"; return; }
  if (pin !== confirmPin) { msg.textContent = "PINs do not match."; msg.className = "form-msg error"; return; }

  try {
    const res = await safeFetch("/api/lock/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    const data = await res.json();
    if (data.success) {
      lockSetupSection.style.display = "none";
      const alertSection = document.getElementById("lock-recovery-alert-section");
      alertSection.innerHTML = `<div class="recovery-alert"><div class="recovery-alert-header">✓ Lock enabled successfully</div><div class="recovery-alert-body">
<p>Your recovery code:</p><code class="recovery-code">${escapeHtml(data.recoveryCode)}</code>
<p class="recovery-warning">⚠ Save this code now. This is the only time it will be shown. If you forget your PIN and don't have this code, you will permanently lose access to the app.</p><p class="recovery-tips">Tips: Save it in your notes app, email it to yourself, or store it in your password manager.</p></div></div>`;
      alertSection.style.display = "block";
      lockDisableSection.style.display = "block";
      document.getElementById("settings-disable-pin").value = "";
      document.getElementById("settings-disable-message").textContent = "";
      document.getElementById("settings-disable-message").className = "form-msg";
    } else { msg.textContent = data.error || "Failed"; msg.className = "form-msg error"; }
  } catch {}
});

document.getElementById("settings-lock-disable").addEventListener("click", async () => {
  const pin = document.getElementById("settings-disable-pin").value;
  const msg = document.getElementById("settings-disable-message");
  try {
    const res = await safeFetch("/api/lock/disable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    const data = await res.json();
    if (data.success) { msg.textContent = "Lock disabled."; msg.className = "form-msg success"; document.getElementById("settings-disable-pin").value = ""; loadLockSettings(); }
    else { msg.textContent = data.error || "Incorrect PIN"; msg.className = "form-msg error"; }
  } catch {}
});

document.getElementById("settings-pin-confirm").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("settings-lock-enable").click(); }
});

document.getElementById("settings-disable-pin").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("settings-lock-disable").click(); }
});

// PIN input filtering
document.querySelectorAll('#settings-pin, #settings-pin-confirm, #settings-disable-pin').forEach(input => {
  input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, ""); });
});

// ===== APP INIT =====
async function initApp() {
  dateInput.value = todayStr();

  // Load independent data in parallel
  await Promise.all([
    loadCategories(),
    loadDateFormatSetting(),
    loadCurrencyRates(),
    populateDetailsList()
  ]);

  // These depend on categories/settings being loaded
  await refreshAll();

  loadLockSettings();
  updateAbroadModeInfo();

  window.scrollTo(0, 0);
}

initApp();

// ===== NOTIFICATION SYSTEM (Server-side persistent) =====
let cachedNotifications = [];

async function fetchNotifications() {
  try {
    const res = await fetch("/api/notifications");
    if (!res.ok) return [];
    cachedNotifications = await res.json();
    return cachedNotifications;
  } catch { return cachedNotifications; }
}

async function createNotification(title, desc, { dates, details, amount, type = "ending" }) {
  try {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, desc, details, amount, dates })
    });
    await refreshNotifications();
  } catch {}
}

async function refreshNotifications() {
  const notifs = await fetchNotifications();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let unreadCount = 0;

  for (const n of notifs) {
    if (n.dismissed) continue;

    if (n.type === "today" || n.type === "ending-today") {
      unreadCount++;
      continue;
    }

    const lastDateStr = n.dates[n.dates.length - 1];
    if (!lastDateStr) continue;

    const lastDate = new Date(lastDateStr + "T00:00:00");
    const expiresAt = new Date(lastDate);
    expiresAt.setDate(expiresAt.getDate() + 7);

    if (now >= lastDate && now <= expiresAt) {
      unreadCount++;
    }
  }

  const badge = document.getElementById("notification-badge");
  const bell = document.getElementById("notification-bell");
  if (badge && bell) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = "flex";
      bell.setAttribute("aria-label", `${unreadCount} notification${unreadCount > 1 ? "s" : ""}`);
    } else {
      badge.style.display = "none";
      bell.setAttribute("aria-label", "Notifications");
    }
  }
  renderNotificationPanel(notifs);
}

function renderNotificationPanel(notifs) {
  const list = document.getElementById("notification-list");
  if (!list) return;
  if (!notifs) notifs = cachedNotifications;

  if (!notifs.length) {
    list.innerHTML = `<div class="notification-item" style="color:var(--text-muted);text-align:center;padding:24px;">
      <div style="margin-bottom:8px;display:flex;justify-content:center;">
        <svg class="header-icon" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 01-3.46 0"></path>
        </svg>
      </div>
      <div style="font-weight:600;margin-bottom:6px;">No notifications</div>
      <div style="font-size:12px;line-height:1.5;">Recurring expense reminders will appear here when a copied series is approaching its last occurrence.</div>
    </div>`;
    return;
  }

  list.innerHTML = "";
  for (const n of notifs) {
    const isDismissed = n.dismissed;
    const div = document.createElement("div");
    div.className = `notification-item ${isDismissed ? "read" : "unread"}`;
    const lastDate = n.dates[n.dates.length - 1] || "";
    const formattedLast = lastDate ? formatDate(lastDate) : "";

    div.innerHTML = `
      <div class="notification-item-title">${escapeHtml(n.title)}</div>
      <div class="notification-item-desc">${escapeHtml(n.desc)}${formattedLast ? ` (ends ${escapeHtml(formattedLast)})` : ""}</div>
      <button class="dismiss-btn" data-nid="${n.id}">${isDismissed ? "Remove" : "Dismiss"}</button>
    `;
    list.appendChild(div);
  }
}

const notifOverlay = document.createElement("div");
notifOverlay.className = "notif-overlay";
document.body.appendChild(notifOverlay);

document.getElementById("notification-bell")?.addEventListener("click", async () => {
  const panel = document.getElementById("notification-panel");
  if (!panel) return;
  // Close scratchpad if open
  document.getElementById("scratchpad-panel")?.classList.remove("open");
  // Mark all unread as dismissed on the server
  const notifs = cachedNotifications;
  const unread = notifs.filter(n => !n.dismissed);
  for (const n of unread) {
    try {
      await fetch(`/api/notifications/${n.id}/dismiss`, { method: "PATCH" });
    } catch {}
  }
  if (unread.length) {
    await refreshNotifications();
  }
  panel.classList.add("open");
  notifOverlay.classList.add("open");
});

document.getElementById("notification-close")?.addEventListener("click", () => {
  document.getElementById("notification-panel")?.classList.remove("open");
  notifOverlay.classList.remove("open");
});

notifOverlay.addEventListener("click", () => {
  document.getElementById("notification-panel")?.classList.remove("open");
  document.getElementById("scratchpad-panel")?.classList.remove("open");
  notifOverlay.classList.remove("open");
});

document.addEventListener("click", async e => {
  const dismissBtn = e.target.closest(".dismiss-btn");
  if (!dismissBtn) return;
  const nid = parseInt(dismissBtn.dataset.nid, 10);
  if (!nid) return;
  const n = cachedNotifications.find(x => x.id === nid);
  if (!n) return;
  try {
    if (n.dismissed) {
      // Already dismissed — remove it entirely
      await fetch(`/api/notifications/${nid}`, { method: "DELETE" });
    } else {
      // Mark as dismissed
      await fetch(`/api/notifications/${nid}/dismiss`, { method: "PATCH" });
    }
    await refreshNotifications();
  } catch {}
});

// Hook into copy success to create notification on server
const _origFetch = window.fetch;
window.fetch = function(...args) {
  return _origFetch.apply(this, args).then(async response => {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
    const method = typeof args[1] === "object" && args[1]?.method ? args[1].method : "GET";

    if (url?.includes("/api/expenses/copy") && method === "POST" && response.ok) {
      const cloned = response.clone();
      try {
        const body = await cloned.json();
        if (body.inserted && body.inserted > 0) {
          try {
            const reqBody = typeof args[1]?.body === "string" ? JSON.parse(args[1].body) : args[1]?.body;
            if (reqBody?.dates?.length) {
              const dates = reqBody.dates;
              const months = dates.length;
              const copyInfoEl = document.getElementById("copy-info");
              const infoText = copyInfoEl?.textContent || "";
              const [details = "Expense", amount = ""] = infoText.split(" — ");
              await createNotification(
                "Recurring Expense Created",
                `${details} — Recurring for ${months} month${months > 1 ? "s" : ""}`,
                { dates, details, amount: amount.trim() }
              );
            }
          } catch {}
        }
      } catch {}
      return response;
    }
    return response;
  }).catch(err => { throw err; });
};

refreshNotifications();

document.querySelectorAll(".bottom-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "tracker") {
      refreshNotifications();
    }
  });
});

// ===== SERVICE WORKER REGISTRATION =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(reg => {
    // Listen for new SW waiting to activate
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New version available — show update banner
          showUpdateBanner();
        }
      });
    });
  }).catch(() => {});

  // Handle controller change (new SW activated)
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

function showUpdateBanner() {
  let banner = document.querySelector(".sw-update-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "sw-update-banner";
    banner.innerHTML = "🔄 Update available — tap to refresh";
    banner.addEventListener("click", () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        });
      }
      banner.classList.remove("visible");
    });
    document.body.appendChild(banner);
  }
  banner.classList.add("visible");
}

// ===== FORECAST TAB =====
let extrapSettings = { start_month: "", num_months: 6, starting_balance: 0 };
let extrapIncome = [];
let extrapOneoff = [];

function getExtrapMonths() {
  const [y, m] = extrapSettings.start_month.split("-").map(Number);
  const months = [];
  for (let i = 0; i < extrapSettings.num_months; i++) {
    let month = m + i;
    let year = y;
    while (month > 12) { month -= 12; year++; }
    months.push(`${year}-${String(month).padStart(2, "0")}`);
  }
  return months;
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}

function populateStartMonthDropdown() {
  const sel = document.getElementById("extrap-start-month");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = "";
  const now = new Date();
  const startYear = now.getFullYear();
  // From Jan of current year to Dec of next year (24 months)
  for (let i = 0; i < 24; i++) {
    let month = 1 + i;
    let year = startYear;
    while (month > 12) { month -= 12; year++; }
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    const o = document.createElement("option");
    o.value = ym;
    o.textContent = formatMonthLabel(ym);
    sel.appendChild(o);
  }
  if (current && [...sel.options].some(o => o.value === current)) {
    sel.value = current;
  } else {
    // Default to current month
    const def = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if ([...sel.options].some(o => o.value === def)) sel.value = def;
  }
}

function formatExtrapAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";

  const sym = getCurrencySymbol(baseCurrency);

  const formatted = new Intl.NumberFormat(
    getCurrencyLocale(baseCurrency),
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }
  ).format(Math.abs(num));

  if (num < 0) return `-${sym} ${formatted}`;
  return `${sym} ${formatted}`;
}

async function saveExtrapCell(type, month, label, amount) {
  const res = await safeFetch(`/api/extrapolate/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month, label, amount })
  });
  return res.ok;
}

async function deleteExtrapEntry(type, id) {
  const res = await safeFetch(`/api/extrapolate/${type}/${id}`, { method: "DELETE" });
  return res.ok;
}

async function deleteExtrapRow(type, label) {
  const list = type === "income" ? extrapIncome : extrapOneoff;
  const entries = list.filter(e => e.label === label);
  for (const entry of entries) {
    await safeFetch(`/api/extrapolate/${type}/${entry.id}`, { method: "DELETE" });
  }
}

function startInlineEdit(cell, currentValue, onSave) {
  if (cell.querySelector("input")) return;
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.className = "extrap-inline-input";
  input.value = currentValue || "";
  cell.textContent = "";
  cell.appendChild(input);
  input.focus();
  input.select();

  const finish = async () => {
    const val = input.value.trim();
    input.remove();
    await onSave(val);
  };

  input.addEventListener("blur", finish);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.value = currentValue || ""; input.blur(); }
  });
}

function startLabelEdit(cell, currentLabel, type, onSave) {
  if (cell.querySelector("input")) return;
  const deleteBtn = cell.querySelector(".extrap-row-delete-btn");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "extrap-inline-input extrap-inline-label";
  input.value = currentLabel;
  cell.textContent = "";
  cell.appendChild(input);
  input.focus();
  input.select();

  const finish = async () => {
    const val = input.value.trim();
    input.remove();
    await onSave(val);
  };

  input.addEventListener("blur", finish);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.value = currentLabel; input.blur(); }
  });
}

function computeMonthlyBalances(months) {
  // Compute the starting balance for each month (balance at the end of the previous month)
  // For the first month, it's the manually set starting_balance
  const balances = [];
  let running = extrapSettings.starting_balance || 0;
  for (let i = 0; i < months.length; i++) {
    balances.push(running);
    const ym = months[i];
    const incomeTotal = extrapIncome.filter(item => item.month === ym).reduce((s, item) => s + item.amount, 0);
    const expenseTotal = extrapOneoff.filter(item => item.month === ym).reduce((s, item) => s + item.amount, 0);
    running += incomeTotal - expenseTotal;
  }
  return balances;
}

function renderExtrapGrid() {
  const grid = document.getElementById("extrap-grid");
  if (!grid) return;

  const months = getExtrapMonths();
  if (months.length === 0) {
    grid.innerHTML = '<div class="extrap-empty">Configure start month and apply to see forecast.</div>';
    return;
  }

  grid.style.gridTemplateColumns = `40px 150px repeat(${months.length}, minmax(100px, 1fr))`;
  grid.style.minWidth = "";
  grid.innerHTML = "";

  // Header row
  const headerDel = document.createElement("div");
  headerDel.className = "extrap-cell extrap-cell-header";
  grid.appendChild(headerDel);
  const headerLabel = document.createElement("div");
  headerLabel.className = "extrap-cell extrap-cell-label extrap-cell-header";
  grid.appendChild(headerLabel);
  for (const ym of months) {
    const h = document.createElement("div");
    h.className = "extrap-cell extrap-cell-header extrap-cell-amount";
    h.textContent = formatMonthLabel(ym);
    grid.appendChild(h);
  }

  // Starting Balance row (shows computed starting balance for each month)
  renderStartingBalanceRow(grid, months);

  // Income section
  renderSectionHeader(grid, "Income", months.length);
  const incomeLabels = getOrderedLabels(extrapIncome);
  for (let i = 0; i < incomeLabels.length; i++) {
    renderDataRow(grid, "income", incomeLabels[i], months, i, incomeLabels.length);
  }
  renderAddRowButton(grid, "income", months.length);

  // Expenses section
  renderSectionHeader(grid, "Expenses", months.length);
  const oneoffLabels = getOrderedLabels(extrapOneoff);
  for (let i = 0; i < oneoffLabels.length; i++) {
    renderDataRow(grid, "oneoff", oneoffLabels[i], months, i, oneoffLabels.length);
  }
  renderAddRowButton(grid, "oneoff", months.length);

  // Balance row
  renderBalanceRow(grid, months);
}

function renderStartingBalanceRow(grid, months) {
  const balances = computeMonthlyBalances(months);

  // Empty del col
  const delCell = document.createElement("div");
  delCell.className = "extrap-cell";
  grid.appendChild(delCell);

  // Label
  const labelCell = document.createElement("div");
  labelCell.className = "extrap-cell extrap-cell-label";
  labelCell.style.fontWeight = "600";
  labelCell.textContent = "Starting Balance";
  grid.appendChild(labelCell);

  // First month: editable starting balance
  const firstCell = document.createElement("div");
  firstCell.className = "extrap-cell extrap-cell-amount";
  firstCell.style.fontWeight = "600";
  firstCell.style.cursor = "pointer";
  firstCell.title = "Click to set starting balance";
  const bal = extrapSettings.starting_balance;
  firstCell.textContent = bal !== 0 ? formatExtrapAmount(bal) : "Click to set";
  if (bal === 0) firstCell.style.color = "var(--text-secondary)";
  firstCell.addEventListener("click", () => {
    startInlineEdit(firstCell, String(extrapSettings.starting_balance || ""), async (val) => {
      const num = parseFloat(val);
      const newBal = Number.isFinite(num) ? num : 0;
      extrapSettings.starting_balance = newBal;
      await safeFetch("/api/extrapolate/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extrapSettings)
      });
      await loadExtrapolateData();
    });
  });
  grid.appendChild(firstCell);

  // Remaining months: show computed starting balance (read-only)
  for (let i = 1; i < months.length; i++) {
    const cell = document.createElement("div");
    cell.className = "extrap-cell extrap-cell-amount";
    cell.style.fontWeight = "600";
    cell.style.color = "var(--text-secondary)";
    cell.textContent = formatExtrapAmount(balances[i]);
    cell.title = "Computed from previous month's balance";
    grid.appendChild(cell);
  }
}

function renderSectionHeader(grid, title, numMonths) {
  const header = document.createElement("div");
  header.className = "extrap-cell extrap-section-header";
  header.style.gridColumn = "1 / -1";
  header.textContent = title;
  grid.appendChild(header);
}

// Get labels ordered by sort_order (use min sort_order per label)
function getOrderedLabels(list) {
  const labelMap = new Map();
  for (const item of list) {
    if (!labelMap.has(item.label) || item.sort_order < labelMap.get(item.label)) {
      labelMap.set(item.label, item.sort_order);
    }
  }
  return [...labelMap.entries()].sort((a, b) => a[1] - b[1]).map(e => e[0]);
}

async function reorderRows(type, labels) {
  await safeFetch("/api/extrapolate/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, labels })
  });
}

function renderDataRow(grid, type, label, months, index, total) {
  const list = type === "income" ? extrapIncome : extrapOneoff;
  const entries = list.filter(e => e.label === label);

  // Delete row button (first column) — drag handle via the label cell
  const delCell = document.createElement("div");
  delCell.className = "extrap-cell extrap-cell-del";

  const delBtn = document.createElement("button");
  delBtn.className = "extrap-row-delete-btn";
  delBtn.textContent = "✕";
  delBtn.title = "Remove row";
  delBtn.addEventListener("click", async () => {
    if (!await showConfirm("Remove Row", `Remove "${label}" from all months?`)) return;
    await deleteExtrapRow(type, label);
    await loadExtrapolateData();
  });
  delCell.appendChild(delBtn);
  grid.appendChild(delCell);

  // Label cell (drag handle)
  const labelCell = document.createElement("div");
  labelCell.className = "extrap-cell extrap-cell-label extrap-draggable-row";
  labelCell.setAttribute("draggable", "true");
  labelCell.dataset.rowType = type;
  labelCell.dataset.rowIndex = index;
  labelCell.dataset.rowLabel = label;
  labelCell.innerHTML = `<span class="extrap-drag-handle" title="Drag to reorder">⠿</span><span class="extrap-label-text">${escapeHtml(label)}</span>`;
  labelCell.style.cursor = "grab";
  labelCell.title = "Drag to reorder, or click label to rename";

  // Drag events
  labelCell.addEventListener("dragstart", (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ type, index, label }));
    labelCell.classList.add("extrap-dragging");
    // Store drag source info globally for drop target identification
    grid.dataset.dragType = type;
    grid.dataset.dragIndex = index;
  });
  labelCell.addEventListener("dragend", () => {
    labelCell.classList.remove("extrap-dragging");
    delete grid.dataset.dragType;
    delete grid.dataset.dragIndex;
    // Remove all drop indicators
    grid.querySelectorAll(".extrap-drop-above, .extrap-drop-below").forEach(el => {
      el.classList.remove("extrap-drop-above", "extrap-drop-below");
    });
  });
  labelCell.addEventListener("dragover", (e) => {
    if (grid.dataset.dragType !== type) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = labelCell.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      labelCell.classList.add("extrap-drop-above");
      labelCell.classList.remove("extrap-drop-below");
    } else {
      labelCell.classList.add("extrap-drop-below");
      labelCell.classList.remove("extrap-drop-above");
    }
  });
  labelCell.addEventListener("dragleave", () => {
    labelCell.classList.remove("extrap-drop-above", "extrap-drop-below");
  });
  labelCell.addEventListener("drop", async (e) => {
    e.preventDefault();
    labelCell.classList.remove("extrap-drop-above", "extrap-drop-below");
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.type !== type) return;
      const fromIndex = data.index;
      const toIndex = index;
      if (fromIndex === toIndex) return;

      const labels = getOrderedLabels(type === "income" ? extrapIncome : extrapOneoff);
      const [moved] = labels.splice(fromIndex, 1);
      labels.splice(toIndex, 0, moved);
      await reorderRows(type, labels);
      await loadExtrapolateData();
    } catch {}
  });

  // Click on label text to rename
  const labelText = labelCell.querySelector(".extrap-label-text");
  labelText.addEventListener("click", (e) => {
    e.stopPropagation();
    startLabelEdit(labelCell, label, type, async (newLabel) => {
      if (!newLabel || newLabel === label) {
        await loadExtrapolateData();
        return;
      }
      for (const entry of entries) {
        await safeFetch(`/api/extrapolate/${type}/${entry.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: entry.month, label: newLabel, amount: entry.amount })
        });
      }
      await loadExtrapolateData();
    });
  });
  grid.appendChild(labelCell);

  // Amount cells
  for (const ym of months) {
    const entry = entries.find(e => e.month === ym);
    const cell = document.createElement("div");
    cell.className = "extrap-cell extrap-cell-amount";
    cell.classList.add(type === "income" ? "extrap-cell-income" : "extrap-cell-expense");
    cell.style.cursor = "pointer";
    cell.style.position = "relative";

    if (entry && entry.amount !== 0) {
      cell.textContent = type === "income" ? formatExtrapAmount(entry.amount) : `-${formatExtrapAmount(entry.amount)}`;
    } else {
      cell.textContent = "—";
      cell.classList.remove("extrap-cell-income", "extrap-cell-expense");
    }

    // Note indicator
    if (entry && entry.note) {
      const indicator = document.createElement("span");
      indicator.className = "extrap-note-indicator";
      cell.appendChild(indicator);
    }

    cell.title = entry && entry.note ? entry.note : "Click to edit, right-click for note";

    // Click to edit amount
    cell.addEventListener("click", () => {
      const currentVal = entry && entry.amount !== 0 ? String(entry.amount) : "";
      startInlineEdit(cell, currentVal, async (newVal) => {
        const num = parseFloat(newVal);
        if (!newVal || newVal === "0") {
          // Set amount to 0 but keep the entry (preserves note and row)
          await saveExtrapCell(type, ym, label, 0);
        } else if (Number.isFinite(num) && num !== 0) {
          await saveExtrapCell(type, ym, label, Math.abs(num));
        }
        await loadExtrapolateData();
      });
    });

    // Right-click / long-press to edit note
    cell.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (!entry || !entry.id) {
        showErrorToast("Set an amount first before adding a note.");
        return;
      }
      openNotePopover(cell, entry, type);
    });

    // Long-press for mobile
    let longPressTimer = null;
    cell.addEventListener("touchstart", (e) => {
      longPressTimer = setTimeout(() => {
        e.preventDefault();
        if (!entry || !entry.id) {
          showErrorToast("Set an amount first before adding a note.");
          return;
        }
        openNotePopover(cell, entry, type);
      }, 600);
    }, { passive: false });
    cell.addEventListener("touchend", () => clearTimeout(longPressTimer));
    cell.addEventListener("touchmove", () => clearTimeout(longPressTimer));

    grid.appendChild(cell);
  }
}

// ===== NOTE POPOVER =====
function openNotePopover(anchorCell, entry, type) {
  // Close any existing popover
  closeNotePopover();

  const popover = document.createElement("div");
  popover.className = "extrap-note-popover";
  popover.id = "extrap-note-popover";

  const textarea = document.createElement("textarea");
  textarea.className = "extrap-note-textarea";
  textarea.placeholder = "Add a note...";
  textarea.value = entry.note || "";
  textarea.rows = 3;

  const btnRow = document.createElement("div");
  btnRow.className = "extrap-note-btn-row";

  const saveBtn = document.createElement("button");
  saveBtn.className = "add-btn";
  saveBtn.textContent = "Save";
  saveBtn.style.fontSize = "0.75rem";
  saveBtn.style.padding = "5px 12px";
  saveBtn.style.minHeight = "auto";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cancel-btn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.fontSize = "0.75rem";
  cancelBtn.style.padding = "5px 12px";
  cancelBtn.style.minHeight = "auto";

  const clearBtn = document.createElement("button");
  clearBtn.className = "btn-secondary";
  clearBtn.textContent = "Clear";
  clearBtn.style.fontSize = "0.75rem";
  clearBtn.style.padding = "5px 12px";
  clearBtn.style.minHeight = "auto";

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(clearBtn);
  btnRow.appendChild(cancelBtn);
  popover.appendChild(textarea);
  popover.appendChild(btnRow);

  document.body.appendChild(popover);

  // Position popover near the cell
  const rect = anchorCell.getBoundingClientRect();
  const popW = 220;
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 4;
  if (left + popW > window.innerWidth) left = window.innerWidth - popW - 10;
  if (left < 5) left = 5;
  popover.style.left = left + "px";
  popover.style.top = top + "px";

  textarea.focus();

  saveBtn.addEventListener("click", async () => {
    const note = textarea.value.trim();
    await safeFetch(`/api/extrapolate/note/${type}/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note })
    });
    closeNotePopover();
    await loadExtrapolateData();
  });

  clearBtn.addEventListener("click", async () => {
    await safeFetch(`/api/extrapolate/note/${type}/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "" })
    });
    closeNotePopover();
    await loadExtrapolateData();
  });

  cancelBtn.addEventListener("click", () => {
    closeNotePopover();
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("mousedown", notePopoverOutsideClick);
  }, 50);
}

function notePopoverOutsideClick(e) {
  const popover = document.getElementById("extrap-note-popover");
  if (popover && !popover.contains(e.target)) {
    closeNotePopover();
  }
}

function closeNotePopover() {
  const popover = document.getElementById("extrap-note-popover");
  if (popover) popover.remove();
  document.removeEventListener("mousedown", notePopoverOutsideClick);
}

function renderAddRowButton(grid, type, numMonths) {
  const addCell = document.createElement("div");
  addCell.className = "extrap-cell";
  addCell.style.gridColumn = "1 / 3";
  addCell.style.borderBottom = "none";
  const addBtn = document.createElement("button");
  addBtn.className = "extrap-add-row-btn";
  addBtn.textContent = `+ Add ${type === "income" ? "income" : "expense"}`;
  addBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "extrap-inline-input extrap-inline-label";
    input.placeholder = type === "income" ? "e.g. Salary" : "e.g. Rent";
    addCell.textContent = "";
    addCell.appendChild(input);
    input.focus();

    const finish = async () => {
      const label = input.value.trim();
      input.remove();
      addCell.appendChild(addBtn);
      if (!label) return;
      const list = type === "income" ? extrapIncome : extrapOneoff;
      if (list.some(e => e.label.toLowerCase() === label.toLowerCase())) {
        showErrorToast(`"${label}" already exists.`);
        return;
      }
      const months = getExtrapMonths();
      if (months.length === 0) return;
      await saveExtrapCell(type, months[0], label, 0);
      await loadExtrapolateData();
      showToast(`"${label}" added. Click cells to set amounts.`, "info");
    };

    input.addEventListener("blur", finish);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      if (e.key === "Escape") { input.value = ""; input.blur(); }
    });
  });
  addCell.appendChild(addBtn);
  grid.appendChild(addCell);

  // Fill remaining columns with empty cells to maintain grid
  const filler = document.createElement("div");
  filler.className = "extrap-cell";
  filler.style.gridColumn = `3 / -1`;
  filler.style.borderBottom = "none";
  grid.appendChild(filler);
}

function renderBalanceRow(grid, months) {
  const sep = document.createElement("div");
  sep.className = "extrap-cell extrap-section-header";
  sep.style.gridColumn = "1 / -1";
  grid.appendChild(sep);

  // Empty delete col
  const delCell = document.createElement("div");
  delCell.className = "extrap-cell extrap-cell-balance";
  grid.appendChild(delCell);

  // Label
  const labelCell = document.createElement("div");
  labelCell.className = "extrap-cell extrap-cell-label extrap-cell-balance";
  labelCell.textContent = "Balance";
  grid.appendChild(labelCell);

  // Running balance (starts from starting_balance)
  let runningBalance = extrapSettings.starting_balance || 0;
  for (const ym of months) {
    const incomeTotal = extrapIncome.filter(i => i.month === ym).reduce((s, i) => s + i.amount, 0);
    const oneoffTotal = extrapOneoff.filter(o => o.month === ym).reduce((s, o) => s + o.amount, 0);
    runningBalance += incomeTotal - oneoffTotal;

    const cell = document.createElement("div");
    cell.className = "extrap-cell extrap-cell-amount extrap-cell-balance";
    cell.textContent = formatExtrapAmount(runningBalance);
    grid.appendChild(cell);
  }
}

// ===== FORECAST CSV DOWNLOAD =====
function downloadForecastCSV() {
  const months = getExtrapMonths();
  if (months.length === 0) {
    showErrorToast("No forecast data to download.");
    return;
  }

  const balances = computeMonthlyBalances(months);
  const incomeLabels = getOrderedLabels(extrapIncome);
  const oneoffLabels = getOrderedLabels(extrapOneoff);

  // Build CSV rows
  const csvRows = [];

  // Header row
  const header = ["", "Type", ...months.map(ym => formatMonthLabel(ym))];
  csvRows.push(header);

  // Starting Balance row
  const startBalRow = ["Starting Balance", ""];
  for (let i = 0; i < months.length; i++) {
    startBalRow.push(balances[i]);
  }
  csvRows.push(startBalRow);

  // Income rows
  for (const label of incomeLabels) {
    const row = [label, "Income"];
    for (const ym of months) {
      const entry = extrapIncome.find(e => e.label === label && e.month === ym);
      row.push(entry && entry.amount !== 0 ? entry.amount : 0);
    }
    csvRows.push(row);
  }

  // Expense rows (negative amounts)
  for (const label of oneoffLabels) {
    const row = [label, "Expense"];
    for (const ym of months) {
      const entry = extrapOneoff.find(e => e.label === label && e.month === ym);
      row.push(entry && entry.amount !== 0 ? -entry.amount : 0);
    }
    csvRows.push(row);
  }

  // Balance row
  const balanceRow = ["Balance", ""];
  let running = extrapSettings.starting_balance || 0;
  for (const ym of months) {
    const incomeTotal = extrapIncome.filter(i => i.month === ym).reduce((s, i) => s + i.amount, 0);
    const expenseTotal = extrapOneoff.filter(o => o.month === ym).reduce((s, o) => s + o.amount, 0);
    running += incomeTotal - expenseTotal;
    balanceRow.push(running);
  }
  csvRows.push(balanceRow);

  // Notes section — collect all notes
  const allNotes = [];
  for (const label of incomeLabels) {
    for (const ym of months) {
      const entry = extrapIncome.find(e => e.label === label && e.month === ym);
      if (entry && entry.note) {
        allNotes.push([label, formatMonthLabel(ym), entry.note]);
      }
    }
  }
  for (const label of oneoffLabels) {
    for (const ym of months) {
      const entry = extrapOneoff.find(e => e.label === label && e.month === ym);
      if (entry && entry.note) {
        allNotes.push([label, formatMonthLabel(ym), entry.note]);
      }
    }
  }
  if (allNotes.length > 0) {
    csvRows.push([]); // blank row separator
    csvRows.push(["Notes", "Month", "Note"]);
    for (const [lbl, mo, note] of allNotes) {
      csvRows.push([lbl, mo, note]);
    }
  }

  // Convert to CSV string
  const csvContent = csvRows.map(row =>
    row.map(cell => {
      const str = String(cell);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(",")
  ).join("\n");

  // Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `forecast_${extrapSettings.start_month || "export"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Forecast CSV downloaded.", "success");
}

async function loadExtrapolateData() {
  populateStartMonthDropdown();
  try {
    const [settingsRes, incomeRes, oneoffRes] = await Promise.all([
      fetch("/api/extrapolate/settings"),
      fetch("/api/extrapolate/income"),
      fetch("/api/extrapolate/oneoff")
    ]);

    if (settingsRes.ok) {
      extrapSettings = await settingsRes.json();
      const startInput = document.getElementById("extrap-start-month");
      const numInput = document.getElementById("extrap-num-months");
      if (startInput) startInput.value = extrapSettings.start_month;
      if (numInput) numInput.value = extrapSettings.num_months;
    }
    if (incomeRes.ok) extrapIncome = await incomeRes.json();
    if (oneoffRes.ok) extrapOneoff = await oneoffRes.json();
  } catch {}

  renderExtrapGrid();
}

// Apply button
document.getElementById("extrap-apply-btn")?.addEventListener("click", async () => {
  const startMonth = document.getElementById("extrap-start-month").value;
  const numMonths = parseInt(document.getElementById("extrap-num-months").value, 10);

  if (!startMonth) {
    showErrorToast("Please select a start month.");
    return;
  }
  if (!numMonths || numMonths < 1 || numMonths > 24) {
    showErrorToast("Months must be between 1 and 24.");
    return;
  }

  const oldStartMonth = extrapSettings.start_month;

  // If sliding forward, warn about purge
  if (oldStartMonth && startMonth > oldStartMonth) {
    // Check if there's data in months that would be purged
    const hasPurgeData = extrapIncome.some(i => i.month < startMonth) || extrapOneoff.some(o => o.month < startMonth);
    if (hasPurgeData) {
      const confirmed = await showConfirm(
        "Slide Forecast Window",
        `Moving the start to ${formatMonthLabel(startMonth)} will delete all income and expense data before that month. You will need to manually set the Starting Balance for the new first month. Continue?`
      );
      if (!confirmed) return;
      // Purge old data
      await safeFetch("/api/extrapolate/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before_month: startMonth })
      });
    }
  }

  try {
    const res = await safeFetch("/api/extrapolate/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_month: startMonth, num_months: numMonths, starting_balance: extrapSettings.starting_balance || 0 })
    });
    if (res.ok) {
      extrapSettings = { start_month: startMonth, num_months: numMonths, starting_balance: extrapSettings.starting_balance || 0 };
      await loadExtrapolateData();
      showToast("Forecast updated.", "success");
    }
  } catch {}
});

// Load forecast tab when switching to it
document.querySelectorAll(".bottom-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "forecast") {
      loadExtrapolateData();
    }
  });
});

// Reset forecast
document.getElementById("extrap-reset-btn")?.addEventListener("click", async () => {
  if (!await showConfirm("Reset Forecast", "This will delete all income and expense rows, reset the starting balance, and clear the forecast completely. This cannot be undone. Continue?")) return;
  try {
    const res = await safeFetch("/api/extrapolate/reset", { method: "POST" });
    if (res.ok) {
      extrapIncome = [];
      extrapOneoff = [];
      extrapSettings = { start_month: "", num_months: 6, starting_balance: 0 };
      await loadExtrapolateData();
      showToast("Forecast reset.", "success");
    }
  } catch {}
});

// CSV download
document.getElementById("extrap-csv-btn")?.addEventListener("click", downloadForecastCSV);

// ===== SCRATCHPAD (Quick Notes) =====
(function() {
  const scratchpadBtn = document.getElementById("scratchpad-btn");
  const scratchpadPanel = document.getElementById("scratchpad-panel");
  const scratchpadClose = document.getElementById("scratchpad-close");
  const scratchpadText = document.getElementById("scratchpad-text");
  const scratchpadSave = document.getElementById("scratchpad-save");
  const scratchpadStatus = document.getElementById("scratchpad-status");
  if (!scratchpadBtn || !scratchpadPanel) return;

  let scratchpadSaveTimer = null;
  let scratchpadLastSaved = "";

  async function openScratchpad() {
    document.getElementById("notification-panel")?.classList.remove("open");

    scratchpadPanel.classList.add("open");
    notifOverlay.classList.add("open");

    await loadScratchpad();

    scratchpadText.focus();
}

  async function closeScratchpad() {
  clearTimeout(scratchpadSaveTimer);

  await saveScratchpad();

  scratchpadPanel.classList.remove("open");
  notifOverlay.classList.remove("open");
}

  async function loadScratchpad() {
    try {
      const res = await fetch("/api/scratchpad");
      if (res.ok) {
        const data = await res.json();
        scratchpadText.value = data.text || "";
        scratchpadLastSaved = scratchpadText.value;
       
      }
    } catch {}
  }

  async function saveScratchpad() {
    const text = scratchpadText.value;

    if (text === scratchpadLastSaved) {
      return;
    }
    scratchpadSave.disabled = true;
    scratchpadSave.textContent = "Saving...";
    scratchpadStatus.textContent = "Saving...";
    scratchpadStatus.className = "scratchpad-status";
    try {
      const res = await fetch("/api/scratchpad", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
      scratchpadLastSaved = text;

      scratchpadStatus.textContent = "Saved ✓";
      scratchpadStatus.className = "scratchpad-status saved";
      setTimeout(() => {
        scratchpadStatus.textContent = "";
        scratchpadStatus.className = "scratchpad-status";
      }, 2000);
    } else {
        scratchpadStatus.textContent = "Failed to save";
        scratchpadStatus.className = "scratchpad-status";
      }
    } catch {
      scratchpadStatus.textContent = "Network error";
      scratchpadStatus.className = "scratchpad-status";
    }
    scratchpadSave.disabled = false;
    scratchpadSave.textContent = "Save";
  }

  scratchpadBtn.addEventListener("click", openScratchpad);
  scratchpadClose.addEventListener("click", closeScratchpad);
  scratchpadSave.addEventListener("click", saveScratchpad);

// Auto-save 1 second after typing stops
scratchpadText.addEventListener("input", () => {
  
  clearTimeout(scratchpadSaveTimer);

  scratchpadSaveTimer = setTimeout(() => {
    saveScratchpad();
  }, 2000);
});

// Ctrl+Enter saves immediately
scratchpadText.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    clearTimeout(scratchpadSaveTimer);
    saveScratchpad();
  }
});
})();

// ===== MOBILE FORM (Bottom Sheet) =====
(function() {
  const fab = document.getElementById("mobile-add-fab");
  const overlay = document.getElementById("mobile-form-overlay");
  const sheet = document.getElementById("mobile-form-sheet");
  const closeBtn = document.getElementById("mobile-form-close");
  const sidebar = document.getElementById("tracker-sidebar");

  if (!fab || !overlay || !sheet || !sidebar) return;

  const sidebarInner = sidebar.querySelector(".sidebar-inner");

  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  let scrollY = 0;

  function openMobileForm() {
    // Lock background scroll
    scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    // Move the sidebar content into the bottom sheet
    sheet.appendChild(sidebarInner);
    overlay.classList.add("open");
    fab.style.display = "none";
  }

  function closeMobileForm() {
    overlay.classList.remove("open");
    // Restore background scroll
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.overflow = "";
    window.scrollTo(0, scrollY);
    // Move sidebar content back
    sidebar.appendChild(sidebarInner);
    if (isMobile()) fab.style.display = "flex";
  }

  fab.addEventListener("click", openMobileForm);
  closeBtn.addEventListener("click", closeMobileForm);
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) closeMobileForm();
  });

  // Close bottom sheet after successful form submit
  const form = document.getElementById("expense-form");
  if (form) {
    const origSubmitHandler = form.onsubmit;
    form.addEventListener("submit", function() {
      // Give time for the submit to process, then close
      setTimeout(() => {
        if (isMobile() && overlay.classList.contains("open")) {
          closeMobileForm();
        }
      }, 300);
    });
  }

  // Handle resize: if goes desktop while sheet is open, close it
  window.addEventListener("resize", function() {
    if (!isMobile() && overlay.classList.contains("open")) {
      closeMobileForm();
    }
    // Toggle FAB visibility based on screen and active tab
    const trackerActive = document.getElementById("tab-tracker").classList.contains("active");
    if (isMobile() && trackerActive && !overlay.classList.contains("open")) {
      fab.style.display = "flex";
    } else if (!isMobile()) {
      fab.style.display = "none";
    }
  });

  // Only show FAB when on Tracker tab
  const tabBtnsAll = document.querySelectorAll(".bottom-nav-btn");
  tabBtnsAll.forEach(btn => {
    btn.addEventListener("click", () => {
      if (isMobile()) {
        fab.style.display = btn.dataset.tab === "tracker" ? "flex" : "none";
      }
    });
  });
})();


// ===== MOBILE REPORT FILTER (Inline Search + Filter Chip → Bottom Sheet) =====
(function() {
  const filterOverlay = document.getElementById("mobile-report-filter-overlay");
  const filterBody = document.getElementById("mobile-report-filter-body");
  const filterCloseBtn = document.getElementById("mobile-report-filter-close");
  const filtersDiv = document.getElementById("report-filters-content");
  const filterChip = document.getElementById("mobile-report-filter-chip");
  const mobileSearch = document.getElementById("mobile-report-search");
  const desktopSearch = document.getElementById("report-search");

  if (!filterOverlay || !filterBody || !filtersDiv || !filterChip) return;

  let scrollY = 0;
  const filtersParent = filtersDiv.parentElement;
  const filtersNextSibling = filtersDiv.nextSibling;

  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  // Sync mobile search input with the desktop search input
  if (mobileSearch && desktopSearch) {
    mobileSearch.addEventListener("input", function() {
      desktopSearch.value = mobileSearch.value;
      desktopSearch.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function openFilterSheet() {
    scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    // Move filters into the sheet
    filterBody.appendChild(filtersDiv);
    filtersDiv.style.display = "block";

    filterOverlay.classList.add("open");
  }

  function closeFilterSheet() {
    filterOverlay.classList.remove("open");

    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.overflow = "";
    window.scrollTo(0, scrollY);

    // Move filters back to original position
    if (filtersNextSibling) {
      filtersParent.insertBefore(filtersDiv, filtersNextSibling);
    } else {
      filtersParent.appendChild(filtersDiv);
    }
    filtersDiv.style.display = "";
  }

  filterChip.addEventListener("click", openFilterSheet);
  filterCloseBtn.addEventListener("click", closeFilterSheet);
  filterOverlay.addEventListener("click", function(e) {
    if (e.target === filterOverlay) closeFilterSheet();
  });

  // Handle resize
  window.addEventListener("resize", function() {
    if (!isMobile() && filterOverlay.classList.contains("open")) {
      closeFilterSheet();
    }
  });
})();
