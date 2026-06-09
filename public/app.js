// ===== GLOBALS & CONSTANTS =====
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

let categories = []; // loaded from server
let dateFormat = "MM/DD/YYYY"; // configurable date display format

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

// ===== THEME =====
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  const btn = document.getElementById("theme-toggle");

  if (btn) {
    btn.innerHTML = theme === "dark"
      ? `
        <svg class="theme-icon" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `
      : `
        <svg class="theme-icon" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3a7 7 0 1 0 9 9a9 9 0 1 1-9-9z"></path>
      </svg>
      `;

    btn.setAttribute(
      "aria-label",
      theme === "dark"
        ? "Switch to light mode"
        : "Switch to dark mode"
    );
  }
}
// Apply saved theme immediately
applyTheme(localStorage.getItem("theme") || "light");

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
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
}
function formatCategory(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function lastDayOfMonth(year, month) { return new Date(year, month, 0); }
function populateGenericYearPicker(sel, includeAll) {
  const cur = new Date().getFullYear();
  const start = 2026, end = Math.max(cur + 2, 2032);
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
const TAB_ORDER = ["tracker", "reports", "settings"];

function switchToTab(tabId) {
  const btn = document.querySelector(`.bottom-nav-btn[data-tab="${tabId}"]`);
  if (!btn) return;
  tabBtns.forEach(b => b.classList.remove("active"));
  tabContents.forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  const tabEl = document.getElementById(`tab-${tabId}`);
  tabEl.classList.add("active");
  if (tabId === "reports") loadReports();
}

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => switchToTab(btn.dataset.tab));
});

// Theme toggle
document.getElementById("theme-toggle").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

// ===== TRACKER TAB =====
const expenseForm = document.getElementById("expense-form");
const dateInput = document.getElementById("date");
const detailsInput = document.getElementById("details");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const categoryFilterInput = document.getElementById("category-filter");
const searchInput = document.getElementById("search");
const clearRangeButton = document.getElementById("clear-range");
const rowsEl = document.getElementById("expense-rows");
const summaryGrid = document.getElementById("summary-grid");
const summaryHeading = document.getElementById("summary-heading");
const barCtx = document.getElementById("bar-chart");
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
let pieCharts = [null, null];
let barChart;
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

// ===== COLLAPSIBLE FILTERS =====
const filtersToggle = document.getElementById("filters-toggle");
const filtersContent = document.getElementById("filters-content");

filtersToggle.addEventListener("click", () => {
  const isExpanded = filtersContent.style.display !== "none";
  filtersContent.style.display = isExpanded ? "none" : "block";
  filtersToggle.setAttribute("aria-expanded", String(!isExpanded));
  filtersToggle.textContent = isExpanded ? "🔍 Filters & Batch Actions" : "🔍 Hide Filters";
});

function setDateRangeToCurrentMonth() {
  const now = new Date();
  const month = now.getMonth() + 1, year = now.getFullYear();
  const start = new Date(year, month - 1, 1);
  const end = lastDayOfMonth(year, month);
  const effectiveEnd = end > now ? now : end;
  startDateInput.value = localDateStr(start);
  endDateInput.value = localDateStr(effectiveEnd);
}

// ===== DEBOUNCED REFRESH =====
let refreshDebounce = null;
function debouncedRefresh() {
  clearTimeout(refreshDebounce);
  refreshDebounce = setTimeout(refreshAll, 150);
}

async function fetchExpenses() {
  const search = searchInput.value.trim();
  const params = new URLSearchParams();
  if (!search) {
    if (startDateInput.value) params.set("startDate", startDateInput.value);
    if (endDateInput.value) params.set("endDate", endDateInput.value);
  }
  if (categoryFilterInput.value !== "all") params.set("category", categoryFilterInput.value);
  if (search) params.set("search", search);
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
    tr.innerHTML = `
      <td data-label="Date">${escapeHtml(formatDate(row.date))}</td>
      <td data-label="Details">${escapeHtml(row.details)}</td>
      <td data-label="Category"><span class="cat-badge" style="background:${getCategoryColor(row.category)}20;color:${getCategoryColor(row.category)}">${escapeHtml(formatCategory(row.category))}</span></td>
      <td data-label="Amount">${formatAmount(row.amount)}</td>
      <td class="actions-cell" data-label="">
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
  totalDiv.innerHTML = `<span class="summary-dot" style="background:#3b82f6"></span><div class="summary-info"><span class="summary-label">Total</span><span class="summary-amount">${formatAmount(total)}</span></div>`;
  summaryGrid.appendChild(totalDiv);
  // Category items
  for (const cat of categories) {
    const val = pieData[cat.name] || 0;
    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `<span class="summary-dot" style="background:${cat.color}"></span><div class="summary-info"><span class="summary-label">${escapeHtml(formatCategory(cat.name))}</span><span class="summary-amount">${formatAmount(val)}</span></div>`;
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
copyModal.addEventListener("click", e => { if (e.target === copyModal) closeCopyModal(); });

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
  if (btn.classList.contains("btn-edit")) { openEditModal(row); }
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
    const res = await safeFetch(`/api/expenses/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: editDate.value, details: editDetails.value.trim(), category: editCategory.value, amount: amountNum }) });
    if (res.ok) { closeEditModal(); await refreshAll(); await loadReports(); populateDetailsList(); }
    else { const err = await res.json(); alert(err.error || "Failed to update"); }
  } catch {}
  saveBtn.disabled = false;
  saveBtn.textContent = "Save";
});
editCancel.addEventListener("click", closeEditModal);
editModal.addEventListener("click", e => { if (e.target === editModal) closeEditModal(); });

// ===== BATCH RENAME MODAL =====
const batchModal = document.getElementById("batch-modal");
const batchForm = document.getElementById("batch-form");
const batchOld = document.getElementById("batch-old");
const batchNew = document.getElementById("batch-new");
const batchList = document.getElementById("batch-list");

let batchDebounce = null;
function filterBatchList() {
  const q = batchOld.value.trim().toLowerCase();
  batchList.innerHTML = "";
  if (!q || q.length < 2) return;
  const fragment = document.createDocumentFragment();
  let count = 0;
  for (const d of allDetails) {
    if (d.toLowerCase().includes(q)) {
      const o = document.createElement("option");
      o.value = d;
      fragment.appendChild(o);
      if (++count >= 8) break;
    }
  }
  batchList.appendChild(fragment);
}
batchOld.addEventListener("input", () => {
  clearTimeout(batchDebounce);
  batchDebounce = setTimeout(filterBatchList, 250);
});

document.getElementById("batch-edit-btn").addEventListener("click", () => {
  batchList.innerHTML = "";
  batchOld.value = ""; batchNew.value = "";
  batchModal.classList.add("open");
  if (activeModalTrap) activeModalTrap();
  activeModalTrap = trapFocus(batchModal.querySelector(".modal-content"));
});
document.getElementById("batch-cancel").addEventListener("click", () => {
  batchModal.classList.remove("open");
  if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
});
batchModal.addEventListener("click", e => {
  if (e.target === batchModal) {
    batchModal.classList.remove("open");
    if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
  }
});

batchForm.addEventListener("submit", async e => {
  e.preventDefault();
  const oldVal = batchOld.value.trim(), newVal = batchNew.value.trim();
  if (!oldVal || !newVal) return;
  if (!await showConfirm("Batch Rename", `Rename all "${oldVal}" entries to "${newVal}"?`)) return;
  const batchSaveBtn = batchForm.querySelector(".save-btn");
  batchSaveBtn.disabled = true;
  batchSaveBtn.textContent = "Renaming...";
  try {
    const res = await safeFetch("/api/expenses/batch", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldDetails: oldVal, newDetails: newVal }) });
    batchSaveBtn.disabled = false;
    batchSaveBtn.textContent = "Rename All";
    if (res.ok) { const r = await res.json(); batchModal.classList.remove("open"); if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; } await refreshAll(); await loadReports(); populateDetailsList(); alert(`Renamed ${r.updated} entr${r.updated===1?"y":"ies"}.`); }
    else { alert("Failed to batch rename"); }
  } catch { batchSaveBtn.disabled = false; batchSaveBtn.textContent = "Rename All"; }
});

// ===== BATCH CATEGORY REASSIGNMENT MODAL =====
const batchCatModal = document.getElementById("batch-cat-modal");
const batchCatForm = document.getElementById("batch-cat-form");
const batchCatOld = document.getElementById("batch-cat-old");
const batchCatNew = document.getElementById("batch-cat-new");
const batchCatCancel = document.getElementById("batch-cat-cancel");

document.getElementById("batch-cat-btn").addEventListener("click", () => {
  populateCategorySelect(batchCatOld, false);
  populateCategorySelect(batchCatNew, false);
  batchCatModal.classList.add("open");
  if (activeModalTrap) activeModalTrap();
  activeModalTrap = trapFocus(batchCatModal.querySelector(".modal-content"));
});
batchCatCancel.addEventListener("click", () => {
  batchCatModal.classList.remove("open");
  if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
});
batchCatModal.addEventListener("click", e => {
  if (e.target === batchCatModal) {
    batchCatModal.classList.remove("open");
    if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
  }
});

batchCatForm.addEventListener("submit", async e => {
  e.preventDefault();
  const oldCat = batchCatOld.value, newCat = batchCatNew.value;
  if (!oldCat || !newCat) return;
  if (oldCat === newCat) { alert("Source and target categories must be different."); return; }
  if (!await showConfirm("Batch Reassign", `Reassign all "${formatCategory(oldCat)}" expenses to "${formatCategory(newCat)}"?`)) return;
  const batchCatSaveBtn = batchCatForm.querySelector(".save-btn");
  batchCatSaveBtn.disabled = true;
  batchCatSaveBtn.textContent = "Reassigning...";
  try {
    const res = await safeFetch("/api/expenses/batch-category", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldCategory: oldCat, newCategory: newCat }) });
    batchCatSaveBtn.disabled = false;
    batchCatSaveBtn.textContent = "Reassign All";
    if (res.ok) {
      const r = await res.json();
      batchCatModal.classList.remove("open");
      if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
      await refreshAll();
      await loadReports();
      alert(`Reassigned ${r.updated} expense${r.updated===1?"":"s"}.`);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to reassign.");
    }
  } catch { batchCatSaveBtn.disabled = false; batchCatSaveBtn.textContent = "Reassign All"; }
});

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
    const dupRes = await fetch("/api/expenses/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, details, amount })
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
    const res = await safeFetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, details, category, amount: amountNum }) });
    if (res.ok) {
      addExpenseMsg.textContent = "Expense added successfully.";
      addExpenseMsg.className = "form-msg success";
      detailsInput.value = ""; amountInput.value = "";
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

startDateInput.addEventListener("change", debouncedRefresh);
endDateInput.addEventListener("change", debouncedRefresh);
categoryFilterInput.addEventListener("change", debouncedRefresh);
let searchDebounce = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(refreshAll, 300);
});
clearRangeButton.addEventListener("click", () => { categoryFilterInput.value = "all"; searchInput.value = ""; setDateRangeToCurrentMonth(); refreshAll(); });

document.getElementById("date-today-btn").addEventListener("click", () => {
  dateInput.value = todayStr();
});

document.getElementById("clear-form-btn").addEventListener("click", () => {
  dateInput.value = todayStr();
  detailsInput.value = "";
  amountInput.value = "";
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
    batchModal.classList.remove("open");
    batchCatModal.classList.remove("open");
    if (activeModalTrap) { activeModalTrap(); activeModalTrap = null; }
  }
});

// ===== REPORTS TAB =====
const reportYear = document.getElementById("report-year");
const reportMonth = document.getElementById("report-month");
const reportCategory = document.getElementById("report-category");
const reportFrom = document.getElementById("report-from");
const reportTo = document.getElementById("report-to");
const reportWrap = document.getElementById("report-table-wrap");
const chartsContent = document.getElementById("charts-content");

// Report filters toggle
const reportFiltersToggle = document.getElementById("report-filters-toggle");
const reportFiltersContent = document.getElementById("report-filters-content");
reportFiltersToggle.addEventListener("click", () => {
  const isExpanded = reportFiltersContent.style.display !== "none";
  reportFiltersContent.style.display = isExpanded ? "none" : "block";
  reportFiltersToggle.setAttribute("aria-expanded", String(!isExpanded));
  reportFiltersToggle.textContent = isExpanded ? "🔍 Filters & Options" : "🔍 Hide Filters";
});

populateGenericYearPicker(reportYear);
setReportDefaults();

async function fetchCharts() {
  // If custom date range is set, derive month/year from it for charts
  let month, year;
  if (reportFrom.value) {
    const parts = reportFrom.value.split("-");
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  } else {
    month = reportMonth.value ? parseInt(reportMonth.value, 10) : (new Date().getMonth() + 1);
    year = parseInt(reportYear.value, 10) || new Date().getFullYear();
  }

  // Calculate selected month + 1 previous month
  const months = [];
  for (let i = 1; i >= 0; i--) {
    let m = month - i;
    let y = year;
    while (m <= 0) { m += 12; y--; }
    months.push({ month: m, year: y });
  }

  const [pie0, pie1] = await Promise.all(
    months.map(({ month: m, year: y }) =>
      fetch(`/api/charts?month=${m}&year=${y}`).then(r => r.ok ? r.json() : null)
    )
  );

  return {
    months,
    pies: [pie0 ? pie0.pie : {}, pie1 ? pie1.pie : {}],
    bar: pie1 ? pie1.bar : {}
  };
}

function renderCharts(chartData) {
  const { months, pies, bar: barData } = chartData;

  // Render 2 pie charts
  for (let i = 0; i < 2; i++) {
    const canvas = document.getElementById(`pie-chart-${i}`);
    const heading = document.getElementById(`pie-heading-${i}`);
    if (!canvas || !heading) continue;

    heading.textContent = `${MONTH_NAMES[months[i].month - 1]} ${months[i].year}`;

    if (pieCharts[i]) pieCharts[i].destroy();
    const pieData = pies[i];
    const labels = Object.keys(pieData).map(formatCategory);
    const values = Object.values(pieData);
    const colors = Object.keys(pieData).map(getCategoryColor);

    pieCharts[i] = new Chart(canvas, {
      type: "pie",
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderColor: ["#fff"], borderWidth: 3 }]
      },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); return ` ${ctx.label}: ${formatAmount(ctx.parsed)} (${t > 0 ? ((ctx.parsed / t) * 100).toFixed(1) : 0}%)`; } } } } }
    });
  }

  // Render bar chart
  const labels = Object.keys(barData).map(ym => MONTH_NAMES[parseInt(ym.slice(5), 10) - 1].slice(0, 3));
  if (barChart) barChart.destroy();
  barChart = new Chart(barCtx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Total", data: Object.values(barData), backgroundColor: "#3b82f6", borderRadius: 6, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatAmount(ctx.parsed?.y ?? ctx.parsed)}` } } }, scales: { y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" }, ticks: { callback: v => formatAmount(v) } }, x: { grid: { display: false } } } }
  });
}

async function loadReports() {
  const params = new URLSearchParams();
  if (reportFrom.value) {
    params.set("startDate", reportFrom.value);
    if (reportTo.value) params.set("endDate", reportTo.value);
  } else if (reportYear.value) {
    params.set("year", reportYear.value);
    if (reportMonth.value) params.set("month", reportMonth.value);
  }
  if (reportCategory.value && reportCategory.value !== "all") {
    params.set("category", reportCategory.value);
  }

  try {
    const res = await safeFetch(`/api/reports?${params}`);
    if (!res.ok) { reportWrap.innerHTML = `<p class="report-empty">Failed to load reports.</p>`; return; }
    const data = await res.json();
    renderReportTable(data);

    const charts = await fetchCharts();
    renderCharts(charts);
  } catch {
    reportWrap.innerHTML = `<p class="report-empty">Failed to load reports.</p>`;
  }
}

let reportUid = 0;

function renderReportTable(data) {
  if (!data.length) { reportWrap.innerHTML = `<p class="report-empty">No data for selected range.</p>`; return; }

  reportUid = 0;
  let html = `<div class="rpt">`;
  html += `<div class="rpt-row rpt-header"><span></span><span class="rpt-label">Description</span><span class="rpt-cat">Category</span><span class="rpt-amt">Amount</span><span class="rpt-actions">Actions</span></div>`;

  for (const yr of data) {
    const yId = `rg-${reportUid++}`;
    html += `<div class="rpt-row rpt-year" data-toggle="${yId}" tabindex="0" role="button" aria-expanded="true">`;
    html += `  <span class="rpt-chevron expanded"></span>`;
    html += `  <span class="rpt-label">${escapeHtml(yr.year)}</span>`;
    html += `  <span class="rpt-cat"></span>`;
    html += `  <span class="rpt-amt">${formatAmount(yr.total)}</span>`;
    html += `  <span class="rpt-actions"></span>`;
    html += `</div>`;
    html += `<div class="rpt-children" id="${yId}">`;

    for (const mo of yr.months) {
      const monthName = MONTH_NAMES[parseInt(mo.month, 10) - 1];
      const mId = `rg-${reportUid++}`;
      html += `<div class="rpt-row rpt-month" data-toggle="${mId}" tabindex="0" role="button" aria-expanded="true">`;
      html += `  <span class="rpt-chevron expanded"></span>`;
      html += `  <span class="rpt-label">${escapeHtml(monthName)} ${escapeHtml(yr.year)}</span>`;
      html += `  <span class="rpt-cat"></span>`;
      html += `  <span class="rpt-amt">${formatAmount(mo.total)}</span>`;
      html += `  <span class="rpt-actions"></span>`;
      html += `</div>`;
      html += `<div class="rpt-children" id="${mId}">`;

      for (const day of mo.days) {
        const dayLabel = `${day.day} ${monthName.slice(0,3)}`;

        const detailsList = day.expenses.map(e => e.details);

        const preview =
        detailsList.length <= 4
          ? detailsList.join(", ")
          : `${detailsList.slice(0, 4).join(", ")} +${detailsList.length - 4} more`;

        const dId = `rg-${reportUid++}`;

        html += `<div class="rpt-row rpt-day" data-toggle="${dId}">`;
        html += `  <span class="rpt-chevron"></span>`;
       html += `
          <span class="rpt-label">
            <span class="rpt-day-text">${dayLabel}</span>
            <span class="rpt-preview">${escapeHtml(preview)}</span>
          </span>
        `;
        html += `  <span class="rpt-cat"></span>`;
        html += `  <span class="rpt-amt">${formatAmount(day.total)}</span>`;
        html += `  <span class="rpt-actions"></span>`;
        html += `</div>`;
        html += `<div class="rpt-children collapsed" id="${dId}">`;

        for (const exp of day.expenses) {
          html += `<div class="rpt-row rpt-expense">`;
          html += `  <span class="rpt-chevron-placeholder"></span>`;
          html += `  <span class="rpt-label">${escapeHtml(exp.details)}</span>`;
          html += `  <span class="rpt-cat"><span class="cat-badge" style="background:${getCategoryColor(exp.category)}20;color:${getCategoryColor(exp.category)}">${escapeHtml(formatCategory(exp.category))}</span></span>`;
          html += `  <span class="rpt-amt">${formatAmount(exp.amount)}</span>`;
          html += `  <span class="rpt-actions"><button class="action-btn rpt-copy-btn" data-id="${exp.id}" title="Copy to date" aria-label="Copy expense">📋</button><button class="action-btn rpt-edit-btn" data-id="${exp.id}" title="Edit" aria-label="Edit expense">✏️</button><button class="action-btn delete rpt-delete-btn" data-id="${exp.id}" title="Delete" aria-label="Delete expense">🗑️</button></span>`;
          html += `</div>`;
        }
        html += `</div>`; // day children
      }
      html += `</div>`; // month children
    }
    html += `</div>`; // year children
  }
  html += `</div>`;
  reportWrap.innerHTML = html;
}

// Report table click handlers (expand/collapse + edit/delete/copy)
reportWrap.addEventListener("click", async e => {
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

  // Expand/collapse
  const row = e.target.closest(".rpt-row[data-toggle]");
  if (!row) return;
  const targetId = row.dataset.toggle;
  const children = document.getElementById(targetId);
  if (!children) return;
  const chevron = row.querySelector(".rpt-chevron");
  const isExpanded = chevron.classList.toggle("expanded");
  children.classList.toggle("collapsed", !isExpanded);

  const preview = row.querySelector(".rpt-preview");
  if (preview) {
    preview.style.display = isExpanded ? "none" : "inline";
  }
  row.setAttribute("aria-expanded", String(isExpanded));
  });

// Also allow keyboard activation for report rows
reportWrap.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") {
    const row = e.target.closest(".rpt-row[data-toggle]");
    if (row) { e.preventDefault(); row.click(); }
  }
});

// Expand All / Collapse All / Default View
document.getElementById("report-expand-all").addEventListener("click", () => {
  reportWrap.querySelectorAll(".rpt-children").forEach(el => el.classList.remove("collapsed"));
  reportWrap.querySelectorAll(".rpt-chevron").forEach(el => el.classList.add("expanded"));
  reportWrap.querySelectorAll(".rpt-preview").forEach(el => el.style.display = "none");
  reportWrap.querySelectorAll("[aria-expanded]").forEach(el => el.setAttribute("aria-expanded", "true"));
});

document.getElementById("report-collapse-all").addEventListener("click", () => {
  reportWrap.querySelectorAll(".rpt-children").forEach(el => el.classList.add("collapsed"));
  reportWrap.querySelectorAll(".rpt-chevron").forEach(el => el.classList.remove("expanded"));
  reportWrap.querySelectorAll(".rpt-preview").forEach(el => el.style.display = "inline");
  reportWrap.querySelectorAll("[aria-expanded]").forEach(el => el.setAttribute("aria-expanded", "false"));
});

document.getElementById("report-default-view").addEventListener("click", () => {
  reportWrap.querySelectorAll(".rpt-children").forEach(el => el.classList.add("collapsed"));
  reportWrap.querySelectorAll(".rpt-chevron").forEach(el => el.classList.remove("expanded"));
  reportWrap.querySelectorAll(".rpt-preview").forEach(el => el.style.display = "inline");
  reportWrap.querySelectorAll("[aria-expanded]").forEach(el => el.setAttribute("aria-expanded", "false"));

  reportWrap.querySelectorAll(".rpt-year[data-toggle]").forEach(yearRow => {
    const targetId = yearRow.dataset.toggle;
    const children = document.getElementById(targetId);
    if (children) {
      children.classList.remove("collapsed");
      const chevron = yearRow.querySelector(".rpt-chevron");
      if (chevron) chevron.classList.add("expanded");
      yearRow.setAttribute("aria-expanded", "true");
    }
  });
  reportWrap.querySelectorAll(".rpt-month[data-toggle]").forEach(monthRow => {
    const targetId = monthRow.dataset.toggle;
    const children = document.getElementById(targetId);
    if (children) {
      children.classList.remove("collapsed");
      const chevron = monthRow.querySelector(".rpt-chevron");
      if (chevron) chevron.classList.add("expanded");
      monthRow.setAttribute("aria-expanded", "true");
      const preview = monthRow.querySelector(".rpt-preview");
      if (preview) preview.style.display = "none";
    }
  });
});

document.getElementById("report-apply").addEventListener("click", loadReports);
document.getElementById("report-reset").addEventListener("click", () => {
  reportFrom.value = ""; reportTo.value = "";
  syncDateOptionalClass(reportFrom);
  syncDateOptionalClass(reportTo);
  reportCategory.value = "all";
  setReportDefaults();
  loadReports();
});

function setReportDefaults() {
  const now = new Date();
  reportYear.value = now.getFullYear();
  reportMonth.value = String(now.getMonth() + 1);
  reportFrom.value = "";
  reportTo.value = "";
  syncDateOptionalClass(reportFrom);
  syncDateOptionalClass(reportTo);
}

// ===== CSV DOWNLOAD (uses report filters) =====
document.getElementById("report-csv-btn").addEventListener("click", async () => {
  const params = new URLSearchParams();
  if (reportFrom.value) {
    params.set("startDate", reportFrom.value);
    if (reportTo.value) params.set("endDate", reportTo.value);
  } else if (reportYear.value) {
    params.set("year", reportYear.value);
    if (reportMonth.value) params.set("month", reportMonth.value);
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
const PRESET_COLORS = [
  "#10b981", "#f59e0b", "#8b5cf6", "#3b82f6", "#ef4444",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#a855f7", "#e11d48", "#0ea5e9", "#d97706"
];

const categoriesList = document.getElementById("categories-list");
const newCategoryName = document.getElementById("new-category-name");
const newCategorySwatches = document.getElementById("new-category-swatches");
const addCategoryBtn = document.getElementById("add-category-btn");
const categoryMessage = document.getElementById("category-message");

let selectedNewColor = PRESET_COLORS[0];

function getAvailableColors() {
  const usedColors = new Set(categories.map(c => c.color));
  return PRESET_COLORS.filter(c => !usedColors.has(c));
}

function renderColorSwatches(container, selectedColor, onSelect) {
  container.innerHTML = "";
  const available = getAvailableColors();
  if (!available.includes(selectedColor) && available.length > 0) {
    selectedColor = available[0];
    onSelect(selectedColor);
  }
  for (const color of available) {
    const swatch = document.createElement("span");
    swatch.className = `color-swatch${color === selectedColor ? " selected" : ""}`;
    swatch.style.background = color;
    swatch.title = color;
    swatch.setAttribute("role", "button");
    swatch.setAttribute("tabindex", "0");
    swatch.setAttribute("aria-label", `Select color ${color}`);
    swatch.addEventListener("click", () => {
      container.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("selected"));
      swatch.classList.add("selected");
      onSelect(color);
    });
    swatch.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); swatch.click(); }
    });
    container.appendChild(swatch);
  }
}

renderColorSwatches(newCategorySwatches, selectedNewColor, c => { selectedNewColor = c; });

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
  populateCategorySelect(categoryFilterInput, true);
  populateCategorySelect(reportCategory, true);
  if (reportCategory.options[0]) reportCategory.options[0].textContent = "All Categories";
  renderColorSwatches(newCategorySwatches, selectedNewColor, c => { selectedNewColor = c; });
}

function renderCategoriesList() {
  categoriesList.innerHTML = "";
  for (const cat of categories) {
    const div = document.createElement("div");
    div.className = "category-item";
    div.dataset.id = cat.id;
    div.innerHTML = `
      <span class="category-color-dot" style="background:${cat.color}" data-id="${cat.id}" title="Change color" role="button" tabindex="0" aria-label="Change color for ${escapeHtml(formatCategory(cat.name))}"></span>
      <span class="category-name">${escapeHtml(formatCategory(cat.name))}</span>
      <button class="cat-rename-btn" data-id="${cat.id}" title="Rename category" aria-label="Rename ${escapeHtml(formatCategory(cat.name))}">✏️</button>
      <button class="cat-delete-btn" data-id="${cat.id}" title="Delete category" aria-label="Delete ${escapeHtml(formatCategory(cat.name))}">🗑️</button>
    `;
    categoriesList.appendChild(div);
  }
}

addCategoryBtn.addEventListener("click", async () => {
  const name = newCategoryName.value.trim();
  if (!name) { categoryMessage.textContent = "Enter a name."; categoryMessage.className = "form-msg error"; return; }

  try {
    const res = await safeFetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color: selectedNewColor }) });
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

categoriesList.addEventListener("click", async e => {
  // Color change
  const colorDot = e.target.closest(".category-color-dot");
  if (colorDot) {
    const id = parseInt(colorDot.dataset.id, 10);
    const cat = categories.find(c => c.id === id);
    const item = colorDot.closest(".category-item");

    if (item.querySelector(".color-picker-inline")) return;

    const picker = document.createElement("div");
    picker.className = "color-picker-inline";

    const otherUsed = new Set(categories.filter(c => c.id !== id).map(c => c.color));
    const available = PRESET_COLORS.filter(c => !otherUsed.has(c));

    for (const color of available) {
      const swatch = document.createElement("span");
      swatch.className = `color-swatch${color === cat.color ? " selected" : ""}`;
      swatch.style.background = color;
      swatch.setAttribute("role", "button");
      swatch.setAttribute("tabindex", "0");
      swatch.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        if (color === cat.color) { picker.remove(); return; }
        try {
          const res = await safeFetch(`/api/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: cat.name, color }) });
          if (res.ok) {
            categoryMessage.textContent = `Color updated for "${formatCategory(cat.name)}".`;
            categoryMessage.className = "form-msg success";
            await loadCategories();
            await refreshAll();
          } else {
            const data = await res.json();
            categoryMessage.textContent = data.error || "Failed to update color.";
            categoryMessage.className = "form-msg error";
          }
        } catch {}
        picker.remove();
      });
      picker.appendChild(swatch);
    }

    item.appendChild(picker);

    const closeHandler = (ev) => {
      if (!item.contains(ev.target)) { picker.remove(); document.removeEventListener("click", closeHandler); }
    };
    setTimeout(() => document.addEventListener("click", closeHandler), 0);
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
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      if (data.date_format) {
        dateFormat = data.date_format;
        const sel = document.getElementById("settings-date-format");
        if (sel) sel.value = data.date_format;
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
    if (data.success) { localStorage.removeItem("lock-remembered"); msg.textContent = "Lock disabled."; msg.className = "form-msg success"; document.getElementById("settings-disable-pin").value = ""; loadLockSettings(); }
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
  await loadCategories();
  await loadDateFormatSetting();
  setDateRangeToCurrentMonth();
  populateDetailsList();
  await refreshAll();
  loadReports();
  loadLockSettings();
}

initApp();

initApp();

// ===== NOTIFICATION SYSTEM (Recurring Expense Ending) =====
const NOTIFICATIONS_KEY = "expense-notifications";
const DISMISSED_KEY = "expense-dismissed-notifs";

function getNotifications() {
  try { return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]"); } catch { return []; }
}
function saveNotifications(notifs) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
}
function getDismissedIds() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function saveDismissedIds(ids) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

function createNotification(title, desc, { dates, details, amount }) {
  const notifs = getNotifications();
  const isDup = notifs.some(n =>
    n.details === details &&
    n.amount === amount &&
    n.dates.length === dates.length
  );
  if (isDup) return;
  // Guard against localStorage overflow
  if (notifs.length > 50) {
    notifs.splice(0, notifs.length - 50);
  }
  notifs.push({
    id: Date.now(),
    title,
    desc,
    details,
    amount,
    dates,
    createdAt: new Date().toISOString()
  });
  saveNotifications(notifs);
  updateNotificationBadge();
}

function checkNotifications() {
  let notifs = getNotifications();
  const dismissed = getDismissedIds();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activeNotifs = [];
  const expiredIds = [];
  let unreadCount = 0;

  for (const n of notifs) {
    const lastDateStr = n.dates[n.dates.length - 1];
    if (!lastDateStr) { expiredIds.push(n.id); continue; }

    const lastDate = new Date(lastDateStr + "T00:00:00");
    const expiresAt = new Date(lastDate);
    expiresAt.setDate(expiresAt.getDate() + 7);

    if (now > expiresAt) {
      expiredIds.push(n.id);
      continue;
    }

    if (now >= lastDate && now <= expiresAt) {
      if (!dismissed.includes(n.id)) {
        unreadCount++;
      }
    }

    activeNotifs.push(n);
  }

  if (expiredIds.length) {
    saveNotifications(activeNotifs);
    saveDismissedIds(dismissed.filter(id => !expiredIds.includes(id)));
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
  renderNotificationPanel();
}

function renderNotificationPanel() {
  const list = document.getElementById("notification-list");
  if (!list) return;
  const notifs = getNotifications();
  const dismissed = getDismissedIds();

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
  for (const n of [...notifs].reverse()) {
    const isDismissed = dismissed.includes(n.id);
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

document.getElementById("notification-bell")?.addEventListener("click", () => {
  const panel = document.getElementById("notification-panel");
  if (!panel) return;
  const dismissed = getDismissedIds();
  const notifs = getNotifications();
  const newlyRead = notifs.filter(n => !dismissed.includes(n.id)).map(n => n.id);
  if (newlyRead.length) {
    saveDismissedIds([...dismissed, ...newlyRead]);
    updateNotificationBadge();
    renderNotificationPanel();
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
  notifOverlay.classList.remove("open");
});

document.addEventListener("click", e => {
  const dismissBtn = e.target.closest(".dismiss-btn");
  if (!dismissBtn) return;
  const nid = parseInt(dismissBtn.dataset.nid, 10);
  if (!nid) return;
  const dismissed = getDismissedIds();
  if (dismissed.includes(nid)) {
    saveDismissedIds(dismissed.filter(id => id !== nid));
    let notifs = getNotifications();
    notifs = notifs.filter(n => n.id !== nid);
    saveNotifications(notifs);
  } else {
    saveDismissedIds([...dismissed, nid]);
  }
  updateNotificationBadge();
  renderNotificationPanel();
});

// Hook into fetch to create notification after copy success
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
              createNotification(
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

function updateNotificationBadge() {
  checkNotifications();
}

checkNotifications();

document.querySelectorAll(".bottom-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "tracker") {
      checkNotifications();
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
