// ===== GLOBALS & CONSTANTS =====
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

let categories = []; // loaded from server
let dateFormat = "MM/DD/YYYY"; // configurable date display format

// ===== THEME =====
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☀" : "🌙";
}
// Apply saved theme immediately
applyTheme(localStorage.getItem("theme") || "light");

// ===== HELPERS =====

// ---- Date-optional inputs: toggle "is-empty" class for cross-browser consistency ----
// Safari shows a ghost date when value is empty; hiding text via CSS + this class solves it.
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

// ===== TAB NAVIGATION =====
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const TAB_ORDER = ["tracker", "reports", "downloads", "settings"];

function switchToTab(tabId) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (!btn) return;
  tabBtns.forEach(b => b.classList.remove("active"));
  tabContents.forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  const tabEl = document.getElementById(`tab-${tabId}`);
  tabEl.classList.add("active");

  // On mobile, scroll the container to the correct panel
  if (window.innerWidth <= 640) {
    const container = document.querySelector(".container");
    const idx = TAB_ORDER.indexOf(tabId);
    if (container && idx >= 0) {
      container.scrollTo({ left: idx * container.offsetWidth, behavior: "smooth" });
    }
  }

  if (tabId === "reports") loadReports();
}

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => switchToTab(btn.dataset.tab));
});

// ---- Mobile: sync tab buttons with scroll-snap position ----
(function setupMobileScrollSync() {
  if (window.innerWidth > 640) return;
  const container = document.querySelector(".container");
  if (!container) return;

  let scrollTimeout = null;
  container.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const idx = Math.round(container.scrollLeft / container.offsetWidth);
      const clampedIdx = Math.max(0, Math.min(idx, TAB_ORDER.length - 1));
      const tabId = TAB_ORDER[clampedIdx];
      const currentActive = document.querySelector(".tab-btn.active");
      if (currentActive && currentActive.dataset.tab === tabId) return;
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
      if (btn) btn.classList.add("active");
      document.getElementById(`tab-${tabId}`).classList.add("active");
      if (tabId === "reports") loadReports();
    }, 50);
  }, { passive: true });

  // Also re-setup on resize (e.g. orientation change)
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 640) {
      const currentTab = document.querySelector(".tab-btn.active");
      if (currentTab) {
        const idx = TAB_ORDER.indexOf(currentTab.dataset.tab);
        if (idx >= 0) container.scrollLeft = idx * container.offsetWidth;
      }
    }
  });
})();

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

async function fetchExpenses() {
  const search = searchInput.value.trim();
  const params = new URLSearchParams();
  if (!search) {
    if (startDateInput.value) params.set("startDate", startDateInput.value);
    if (endDateInput.value) params.set("endDate", endDateInput.value);
  }
  if (categoryFilterInput.value !== "all") params.set("category", categoryFilterInput.value);
  if (search) params.set("search", search);
  const res = await fetch(`/api/expenses?${params}`);
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
      <td data-label="Date">${formatDate(row.date)}</td>
      <td data-label="Details">${row.details}</td>
      <td data-label="Category"><span class="cat-badge" style="background:${getCategoryColor(row.category)}20;color:${getCategoryColor(row.category)}">${formatCategory(row.category)}</span></td>
      <td data-label="Amount">${formatAmount(row.amount)}</td>
      <td class="actions-cell" data-label="">
        <button class="btn-copy" data-id="${row.id}" title="Copy to date">📋</button>
        <button class="btn-edit" data-id="${row.id}" title="Edit">✏</button>
        <button class="btn-delete" data-id="${row.id}" title="Delete">🗑</button>
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
    div.innerHTML = `<span class="summary-dot" style="background:${cat.color}"></span><div class="summary-info"><span class="summary-label">${formatCategory(cat.name)}</span><span class="summary-amount">${formatAmount(val)}</span></div>`;
    summaryGrid.appendChild(div);
  }
}

async function refreshAll() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Fetch expenses and summary in parallel
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
}

async function populateDetailsList() {
  try { const res = await fetch("/api/details"); if (res.ok) allDetails = await res.json(); } catch {}
}

let detailsDebounce = null;
function filterDetailsList() {
  const q = detailsInput.value.trim().toLowerCase();
  detailsList.innerHTML = "";
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
  detailsList.appendChild(fragment);
}
detailsInput.addEventListener("input", () => {
  clearTimeout(detailsDebounce);
  detailsDebounce = setTimeout(filterDetailsList, 250);
});

// Edit modal
function openEditModal(row) {
  editId.value = row.id; editDate.value = row.date; editDetails.value = row.details;
  populateCategorySelect(editCategory, false);
  editCategory.value = row.category;
  editAmount.value = row.amount; editModal.classList.add("open");
}
function closeEditModal() { editModal.classList.remove("open"); }

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
  copyDateStart.value = row.date; // Pre-fill with the expense's date (latest occurrence)
  copyMonths.value = "1";
  copyModal.classList.add("open");
  copyMonths.focus();
}
function closeCopyModal() { copyModal.classList.remove("open"); copyExpenseId = null; }

copyCancel.addEventListener("click", closeCopyModal);
copyModal.addEventListener("click", e => { if (e.target === copyModal) closeCopyModal(); });

copyForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!copyExpenseId) return;
  const startDate = copyDateStart.value;
  const months = parseInt(copyMonths.value, 10);
  if (!startDate) { alert("Please select the current occurrence date."); return; }
  if (!months || months < 1 || months > 60) { alert("Please enter a number of months between 1 and 60."); return; }

  // Generate dates starting from the NEXT month after the latest occurrence
  const dates = [];
  const start = new Date(startDate + "T00:00:00");
  const targetDay = start.getDate(); // e.g. 2nd of the month

  for (let i = 1; i <= months; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);

    // Handle month overflow (e.g. Jan 31 + 1 month → Mar 3 if Feb has 28 days)
    // If the day changed due to month length, clamp to last day of target month
    if (d.getDate() !== targetDay) {
      d.setDate(0); // go to last day of previous month
    }

    dates.push(localDateStr(d));
  }

  if (dates.length === 0) { alert("No valid months to copy to."); return; }
  if (dates.length > 365) { alert("Cannot copy to more than 365 dates at once."); return; }

  if (!confirm(`Copy this expense to ${dates.length} month${dates.length > 1 ? "s" : ""} (${dates[0]} – ${dates[dates.length-1]})?`)) return;

  const copySaveBtn = copyForm.querySelector(".save-btn");
  copySaveBtn.disabled = true;
  copySaveBtn.textContent = "Copying...";

  const res = await fetch("/api/expenses/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: copyExpenseId, dates })
  });
  if (res.ok) {
    const r = await res.json();
    copySaveBtn.disabled = false;
    copySaveBtn.textContent = "Copy";
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
    copySaveBtn.disabled = false;
    copySaveBtn.textContent = "Copy";
    alert(err.error || "Failed to copy expense.");
  }
});

// Tracker table click handlers
rowsEl.addEventListener("click", async e => {
  const btn = e.target.closest("button"); if (!btn) return;
  const id = parseInt(btn.dataset.id, 10);
  const row = currentRows.find(r => r.id === id); if (!row) return;
  if (btn.classList.contains("btn-edit")) { openEditModal(row); }
  else if (btn.classList.contains("btn-copy")) { openCopyModal(row); }
  else if (btn.classList.contains("btn-delete")) {
    if (!confirm(`Delete this expense?\n\n${formatDate(row.date)} — ${row.details} — ${formatAmount(row.amount)}`)) return;
    btn.disabled = true;
    btn.textContent = "⏳";
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
    // Also disable sibling action buttons to prevent misclicks
    const siblings = btn.parentElement.querySelectorAll("button");
    siblings.forEach(s => { s.disabled = true; s.style.pointerEvents = "none"; });
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) { await refreshAll(); populateDetailsList(); } else { alert("Failed to delete"); siblings.forEach(s => { s.disabled = false; s.style.pointerEvents = ""; }); btn.textContent = "🗑"; btn.style.opacity = ""; }
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
  const res = await fetch(`/api/expenses/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: editDate.value, details: editDetails.value.trim(), category: editCategory.value, amount: amountNum }) });
  if (res.ok) { closeEditModal(); await refreshAll(); await loadReports(); populateDetailsList(); } else { const err = await res.json(); alert(err.error || "Failed to update"); }
  saveBtn.disabled = false;
  saveBtn.textContent = "Save";
});
editCancel.addEventListener("click", closeEditModal);
editModal.addEventListener("click", e => { if (e.target === editModal) closeEditModal(); });

// Batch rename
const batchModal = document.getElementById("batch-modal");
const batchForm = document.getElementById("batch-form");
const batchOld = document.getElementById("batch-old");
const batchNew = document.getElementById("batch-new");
const batchList = document.getElementById("batch-list");

// Batch rename datalist filtering (cap at 8 like tracker)
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
  batchModal.classList.add("open"); batchOld.focus();
});
document.getElementById("batch-cancel").addEventListener("click", () => batchModal.classList.remove("open"));
batchModal.addEventListener("click", e => { if (e.target === batchModal) batchModal.classList.remove("open"); });

batchForm.addEventListener("submit", async e => {
  e.preventDefault();
  const oldVal = batchOld.value.trim(), newVal = batchNew.value.trim();
  if (!oldVal || !newVal) return;
  if (!confirm(`Rename all "${oldVal}" entries to "${newVal}"?`)) return;
  const batchSaveBtn = batchForm.querySelector(".save-btn");
  batchSaveBtn.disabled = true;
  batchSaveBtn.textContent = "Renaming...";
  const res = await fetch("/api/expenses/batch", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldDetails: oldVal, newDetails: newVal }) });
  batchSaveBtn.disabled = false;
  batchSaveBtn.textContent = "Rename All";
  if (res.ok) { const r = await res.json(); batchModal.classList.remove("open"); await refreshAll(); await loadReports(); populateDetailsList(); alert(`Renamed ${r.updated} entr${r.updated===1?"y":"ies"}.`); }
  else { alert("Failed to batch rename"); }
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
});
batchCatCancel.addEventListener("click", () => batchCatModal.classList.remove("open"));
batchCatModal.addEventListener("click", e => { if (e.target === batchCatModal) batchCatModal.classList.remove("open"); });

batchCatForm.addEventListener("submit", async e => {
  e.preventDefault();
  const oldCat = batchCatOld.value, newCat = batchCatNew.value;
  if (!oldCat || !newCat) return;
  if (oldCat === newCat) { alert("Source and target categories must be different."); return; }
  if (!confirm(`Reassign all "${formatCategory(oldCat)}" expenses to "${formatCategory(newCat)}"?`)) return;
  const batchCatSaveBtn = batchCatForm.querySelector(".save-btn");
  batchCatSaveBtn.disabled = true;
  batchCatSaveBtn.textContent = "Reassigning...";
  const res = await fetch("/api/expenses/batch-category", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldCategory: oldCat, newCategory: newCat }) });
  batchCatSaveBtn.disabled = false;
  batchCatSaveBtn.textContent = "Reassign All";
  if (res.ok) {
    const r = await res.json();
    batchCatModal.classList.remove("open");
    await refreshAll();
    await loadReports();
    alert(`Reassigned ${r.updated} expense${r.updated===1?"":"s"}.`);
  } else {
    const err = await res.json();
    alert(err.error || "Failed to reassign.");
  }
});

// Event listeners — Add expense with double-click prevention and duplicate check
const addExpenseMsg = document.getElementById("add-expense-msg");
const addBtn = document.getElementById("add-btn");
let isSubmitting = false;

expenseForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (isSubmitting) return; // Prevent double-click

  // Disable immediately on click — before any async work
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
  // Validate amount is a valid decimal number
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
        if (!confirm(`A similar entry already exists:\n\n${formatDate(date)} — ${details} — ${amount}\n\nThis may be a duplicate. Add anyway?`)) {
          isSubmitting = false;
          addBtn.disabled = false;
          addBtn.textContent = "+ Add";
          return;
        }
      }
    }
  } catch {}

  try {
    const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, details, category, amount: amountNum }) });
    if (res.ok) {
      addExpenseMsg.textContent = "Expense added successfully.";
      addExpenseMsg.className = "form-msg success";
      detailsInput.value = ""; amountInput.value = "";
      await refreshAll(); populateDetailsList();
      setTimeout(() => { addExpenseMsg.textContent = ""; addExpenseMsg.className = "form-msg"; }, 3000);
    } else {
      const err = await res.json();
      addExpenseMsg.textContent = err.error || "Failed to add expense.";
      addExpenseMsg.className = "form-msg error";
    }
  } finally {
    isSubmitting = false;
    addBtn.disabled = false;
    addBtn.textContent = "+ Add";
  }
});

startDateInput.addEventListener("change", refreshAll);
endDateInput.addEventListener("change", refreshAll);
categoryFilterInput.addEventListener("change", refreshAll);
let searchDebounce = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(refreshAll, 300);
});
clearRangeButton.addEventListener("click", () => { categoryFilterInput.value = "all"; searchInput.value = ""; setDateRangeToCurrentMonth(); refreshAll(); });

// Today button resets add-expense date to today
document.getElementById("date-today-btn").addEventListener("click", () => {
  dateInput.value = todayStr();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeEditModal();
    closeCopyModal();
    batchModal.classList.remove("open");
    batchCatModal.classList.remove("open");
  }
});

// ===== REPORTS TAB =====
const reportYear = document.getElementById("report-year");
const reportMonth = document.getElementById("report-month");
const reportCategory = document.getElementById("report-category");
const reportFrom = document.getElementById("report-from");
const reportTo = document.getElementById("report-to");
const reportWrap = document.getElementById("report-table-wrap");
const toggleChartsButton = document.getElementById("toggle-charts");
const chartsContent = document.getElementById("charts-content");

populateGenericYearPicker(reportYear);
setReportDefaults();

let chartsExpanded = true;
function setChartsExpanded(expanded) {
  chartsExpanded = expanded;
  chartsContent.classList.toggle("collapsed", !expanded);
  toggleChartsButton.textContent = expanded ? "▼" : "▶";
  toggleChartsButton.setAttribute("aria-expanded", String(expanded));
}
toggleChartsButton.addEventListener("click", () => setChartsExpanded(!chartsExpanded));

async function fetchCharts() {
  const month = reportMonth.value ? parseInt(reportMonth.value, 10) : (new Date().getMonth() + 1);
  const year = parseInt(reportYear.value, 10) || new Date().getFullYear();

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

  const res = await fetch(`/api/reports?${params}`);
  if (!res.ok) { reportWrap.innerHTML = `<p class="report-empty">Failed to load reports.</p>`; return; }
  const data = await res.json();
  renderReportTable(data);

  try {
    const charts = await fetchCharts();
    renderCharts(charts);
  } catch {}
}

let reportUid = 0;

function renderReportTable(data) {
  if (!data.length) { reportWrap.innerHTML = `<p class="report-empty">No data for selected range.</p>`; return; }

  reportUid = 0;
  let html = `<div class="rpt">`;
  html += `<div class="rpt-row rpt-header"><span></span><span class="rpt-label">Description</span><span class="rpt-cat">Category</span><span class="rpt-amt">Amount</span><span class="rpt-actions">Actions</span></div>`;

  for (const yr of data) {
    const yId = `rg-${reportUid++}`;
    html += `<div class="rpt-row rpt-year" data-toggle="${yId}">`;
    html += `  <span class="rpt-chevron expanded"></span>`;
    html += `  <span class="rpt-label">${yr.year}</span>`;
    html += `  <span class="rpt-cat"></span>`;
    html += `  <span class="rpt-amt">${formatAmount(yr.total)}</span>`;
    html += `  <span class="rpt-actions"></span>`;
    html += `</div>`;
    html += `<div class="rpt-children" id="${yId}">`;

    for (const mo of yr.months) {
      const monthName = MONTH_NAMES[parseInt(mo.month, 10) - 1];
      const mId = `rg-${reportUid++}`;
      html += `<div class="rpt-row rpt-month" data-toggle="${mId}">`;
      html += `  <span class="rpt-chevron expanded"></span>`;
      html += `  <span class="rpt-label">${monthName} ${yr.year}</span>`;
      html += `  <span class="rpt-cat"></span>`;
      html += `  <span class="rpt-amt">${formatAmount(mo.total)}</span>`;
      html += `  <span class="rpt-actions"></span>`;
      html += `</div>`;
      html += `<div class="rpt-children" id="${mId}">`;

      for (const day of mo.days) {
        const dayLabel = `${day.day} ${monthName.slice(0,3)}`;
        const preview = day.expenses.map(e => e.details).join(", ");
        const dId = `rg-${reportUid++}`;
        html += `<div class="rpt-row rpt-day" data-toggle="${dId}">`;
        html += `  <span class="rpt-chevron"></span>`;
        html += `  <span class="rpt-label">${dayLabel}<span class="rpt-preview"> — ${preview}</span></span>`;
        html += `  <span class="rpt-cat"></span>`;
        html += `  <span class="rpt-amt">${formatAmount(day.total)}</span>`;
        html += `  <span class="rpt-actions"></span>`;
        html += `</div>`;
        html += `<div class="rpt-children collapsed" id="${dId}">`;

        for (const exp of day.expenses) {
          html += `<div class="rpt-row rpt-expense">`;
          html += `  <span class="rpt-chevron-placeholder"></span>`;
          html += `  <span class="rpt-label">${exp.details}</span>`;
          html += `  <span class="rpt-cat"><span class="cat-badge" style="background:${getCategoryColor(exp.category)}20;color:${getCategoryColor(exp.category)}">${formatCategory(exp.category)}</span></span>`;
          html += `  <span class="rpt-amt">${formatAmount(exp.amount)}</span>`;
          html += `  <span class="rpt-actions"><button class="rpt-copy-btn" data-id="${exp.id}" title="Copy to date">📋</button><button class="rpt-edit-btn" data-id="${exp.id}" title="Edit">✏</button><button class="rpt-delete-btn" data-id="${exp.id}" title="Delete">🗑</button></span>`;
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
  // Copy button
  const copyBtn = e.target.closest(".rpt-copy-btn");
  if (copyBtn) {
    const id = parseInt(copyBtn.dataset.id, 10);
    const res = await fetch(`/api/expenses/${id}`);
    if (res.ok) {
      const row = await res.json();
      openCopyModal(row);
    }
    return;
  }

  // Edit button
  const editBtn = e.target.closest(".rpt-edit-btn");
  if (editBtn) {
    const id = parseInt(editBtn.dataset.id, 10);
    const res = await fetch(`/api/expenses/${id}`);
    if (res.ok) {
      const row = await res.json();
      openEditModal(row);
    }
    return;
  }

  // Delete button
  const delBtn = e.target.closest(".rpt-delete-btn");
  if (delBtn) {
    const id = parseInt(delBtn.dataset.id, 10);
    if (!confirm("Delete this expense?")) return;
    delBtn.disabled = true;
    delBtn.textContent = "⏳";
    delBtn.style.opacity = "0.5";
    delBtn.style.pointerEvents = "none";
    // Disable sibling action buttons
    const siblings = delBtn.parentElement.querySelectorAll("button");
    siblings.forEach(s => { s.disabled = true; s.style.pointerEvents = "none"; });
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) { await loadReports(); await refreshAll(); populateDetailsList(); }
    else { alert("Failed to delete"); siblings.forEach(s => { s.disabled = false; s.style.pointerEvents = ""; }); delBtn.textContent = "🗑"; delBtn.style.opacity = ""; }
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
  if (preview) preview.style.display = isExpanded ? "none" : "inline";
});

// Expand All / Collapse All
document.getElementById("report-expand-all").addEventListener("click", () => {
  reportWrap.querySelectorAll(".rpt-children").forEach(el => el.classList.remove("collapsed"));
  reportWrap.querySelectorAll(".rpt-chevron").forEach(el => el.classList.add("expanded"));
  reportWrap.querySelectorAll(".rpt-preview").forEach(el => el.style.display = "none");
});

document.getElementById("report-collapse-all").addEventListener("click", () => {
  reportWrap.querySelectorAll(".rpt-children").forEach(el => el.classList.add("collapsed"));
  reportWrap.querySelectorAll(".rpt-chevron").forEach(el => el.classList.remove("expanded"));
  reportWrap.querySelectorAll(".rpt-preview").forEach(el => el.style.display = "inline");
});

document.getElementById("report-default-view").addEventListener("click", () => {
  // Collapse everything first
  reportWrap.querySelectorAll(".rpt-children").forEach(el => el.classList.add("collapsed"));
  reportWrap.querySelectorAll(".rpt-chevron").forEach(el => el.classList.remove("expanded"));
  reportWrap.querySelectorAll(".rpt-preview").forEach(el => el.style.display = "inline");

  // Expand year-level and month-level (but keep days collapsed)
  reportWrap.querySelectorAll(".rpt-year[data-toggle]").forEach(yearRow => {
    const targetId = yearRow.dataset.toggle;
    const children = document.getElementById(targetId);
    if (children) {
      children.classList.remove("collapsed");
      const chevron = yearRow.querySelector(".rpt-chevron");
      if (chevron) chevron.classList.add("expanded");
    }
  });
  reportWrap.querySelectorAll(".rpt-month[data-toggle]").forEach(monthRow => {
    const targetId = monthRow.dataset.toggle;
    const children = document.getElementById(targetId);
    if (children) {
      children.classList.remove("collapsed");
      const chevron = monthRow.querySelector(".rpt-chevron");
      if (chevron) chevron.classList.add("expanded");
      const preview = monthRow.querySelector(".rpt-preview");
      if (preview) preview.style.display = "none";
    }
  });
});

document.getElementById("report-apply").addEventListener("click", loadReports);
document.getElementById("report-reset").addEventListener("click", () => {
  reportFrom.value = ""; reportTo.value = "";
  reportCategory.value = "all";
  setReportDefaults();
  loadReports();
});

function setReportDefaults() {
  const now = new Date();
  reportYear.value = now.getFullYear();
  reportMonth.value = String(now.getMonth() + 1);
  // Leave from/to empty so year/month selectors drive the query
  reportFrom.value = "";
  reportTo.value = "";
  syncDateOptionalClass(reportFrom);
  syncDateOptionalClass(reportTo);
}

// ===== DOWNLOADS TAB =====
const dlYear = document.getElementById("dl-year");
const dlMonth = document.getElementById("dl-month");
const dlFrom = document.getElementById("dl-from");
const dlTo = document.getElementById("dl-to");

populateGenericYearPicker(dlYear, true);

document.getElementById("dl-csv-btn").addEventListener("click", async () => {
  const params = new URLSearchParams();
  if (dlFrom.value) {
    params.set("startDate", dlFrom.value);
    if (dlTo.value) params.set("endDate", dlTo.value);
  } else if (dlYear.value === "all") {
    params.set("all", "true");
  } else if (dlYear.value) {
    params.set("year", dlYear.value);
    if (dlMonth.value) params.set("month", dlMonth.value);
  }

  const res = await fetch(`/api/export/csv?${params}`);
  if (!res.ok) { alert("Failed to download CSV"); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "expenses.csv"; a.click();
  URL.revokeObjectURL(url);
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
    swatch.addEventListener("click", () => {
      container.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("selected"));
      swatch.classList.add("selected");
      onSelect(color);
    });
    container.appendChild(swatch);
  }
}

// Initialize add-row swatches
renderColorSwatches(newCategorySwatches, selectedNewColor, c => { selectedNewColor = c; });

async function loadCategories() {
  const res = await fetch("/api/categories");
  if (res.ok) categories = await res.json();
  renderCategoriesList();
  // Update all category selects
  populateCategorySelect(categoryInput, false);
  populateCategorySelect(categoryFilterInput, true);
  populateCategorySelect(reportCategory, true);
  // Set "All Categories" text for report
  if (reportCategory.options[0]) reportCategory.options[0].textContent = "All Categories";
  // Refresh color swatches to hide used colors
  renderColorSwatches(newCategorySwatches, selectedNewColor, c => { selectedNewColor = c; });
}

function renderCategoriesList() {
  categoriesList.innerHTML = "";
  for (const cat of categories) {
    const div = document.createElement("div");
    div.className = "category-item";
    div.dataset.id = cat.id;
    div.innerHTML = `
      <span class="category-color-dot" style="background:${cat.color}" data-id="${cat.id}" title="Change color"></span>
      <span class="category-name">${formatCategory(cat.name)}</span>
      <button class="cat-rename-btn" data-id="${cat.id}" title="Rename category">✏</button>
      <button class="cat-delete-btn" data-id="${cat.id}" title="Delete category">🗑</button>
    `;
    categoriesList.appendChild(div);
  }
}

addCategoryBtn.addEventListener("click", async () => {
  const name = newCategoryName.value.trim();
  if (!name) { categoryMessage.textContent = "Enter a name."; categoryMessage.className = "settings-msg error"; return; }

  const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color: selectedNewColor }) });
  const data = await res.json();
  if (res.ok) {
    categoryMessage.textContent = `Added "${formatCategory(data.name)}".`;
    categoryMessage.className = "settings-msg success";
    newCategoryName.value = "";
    await loadCategories();
  } else {
    categoryMessage.textContent = data.error || "Failed to add.";
    categoryMessage.className = "settings-msg error";
  }
});

categoriesList.addEventListener("click", async e => {
  // Color change
  const colorDot = e.target.closest(".category-color-dot");
  if (colorDot) {
    const id = parseInt(colorDot.dataset.id, 10);
    const cat = categories.find(c => c.id === id);
    const item = colorDot.closest(".category-item");

    // Check if swatch picker already open
    if (item.querySelector(".color-picker-inline")) return;

    const picker = document.createElement("div");
    picker.className = "color-picker-inline";

    // Show all colors except ones used by OTHER categories
    const otherUsed = new Set(categories.filter(c => c.id !== id).map(c => c.color));
    const available = PRESET_COLORS.filter(c => !otherUsed.has(c));

    for (const color of available) {
      const swatch = document.createElement("span");
      swatch.className = `color-swatch${color === cat.color ? " selected" : ""}`;
      swatch.style.background = color;
      swatch.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        if (color === cat.color) { picker.remove(); return; }
        const res = await fetch(`/api/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: cat.name, color }) });
        if (res.ok) {
          categoryMessage.textContent = `Color updated for "${formatCategory(cat.name)}".`;
          categoryMessage.className = "settings-msg success";
          await loadCategories();
          await refreshAll();
        } else {
          const data = await res.json();
          categoryMessage.textContent = data.error || "Failed to update color.";
          categoryMessage.className = "settings-msg error";
        }
        picker.remove();
      });
      picker.appendChild(swatch);
    }

    item.appendChild(picker);

    // Close picker when clicking outside
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

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cat-cancel-btn";
    cancelBtn.title = "Cancel";
    cancelBtn.textContent = "✕";

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
        const span = document.createElement("span");
        span.className = "category-name";
        span.textContent = formatCategory(cat.name);
        input.replaceWith(span);
        saveBtn.remove();
        cancelBtn.remove();
        renameBtn.style.display = "";
        deleteBtn.style.display = "";
        return;
      }
      const res = await fetch(`/api/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, color: cat.color }) });
      const data = await res.json();
      if (res.ok) {
        categoryMessage.textContent = `Renamed "${formatCategory(cat.name)}" → "${formatCategory(newName)}".`;
        categoryMessage.className = "settings-msg success";
        await loadCategories();
        await refreshAll();
      } else {
        categoryMessage.textContent = data.error || "Failed to rename.";
        categoryMessage.className = "settings-msg error";
        const span = document.createElement("span");
        span.className = "category-name";
        span.textContent = formatCategory(cat.name);
        input.replaceWith(span);
        saveBtn.remove();
        cancelBtn.remove();
        renameBtn.style.display = "";
        deleteBtn.style.display = "";
      }
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
  if (!confirm(`⚠ Delete category "${formatCategory(cat.name)}"?\n\nThis will permanently remove the category. Any historical expenses using it will lose their category assignment.\n\nConsider renaming the category instead if you want to preserve historical records.`)) return;
  const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (res.ok) {
    categoryMessage.textContent = "Deleted.";
    categoryMessage.className = "settings-msg success";
    await loadCategories();
  } else {
    categoryMessage.textContent = data.error || "Failed to delete.";
    categoryMessage.className = "settings-msg error";
  }
});

// Date format settings
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
  } catch(e) {}
}

document.getElementById("settings-date-format-save").addEventListener("click", async function() {
  const btn = this;
  const sel = document.getElementById("settings-date-format");
  const msg = document.getElementById("date-format-message");
  const selectedFormat = sel.value;
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date_format: selectedFormat })
    });
    if (res.ok) {
      dateFormat = selectedFormat;
      msg.textContent = "Date format saved.";
      msg.className = "settings-msg success";
      renderRows(currentRows);
      await loadReports();
    } else {
      const err = await res.json();
      msg.textContent = err.error || "Failed to save.";
      msg.className = "settings-msg error";
    }
  } catch(e) {
    msg.textContent = "Failed to save.";
    msg.className = "settings-msg error";
  }
  btn.disabled = false;
  btn.textContent = "Save";
  setTimeout(() => { msg.textContent = ""; msg.className = "settings-msg"; }, 3000);
});

// Lock settings
const lockSetupSection = document.getElementById("lock-setup-section");
const lockDisableSection = document.getElementById("lock-disable-section");

async function loadLockSettings() {
  const res = await fetch("/api/lock/status");
  const { locked } = await res.json();
  lockSetupSection.style.display = locked ? "none" : "block";
  lockDisableSection.style.display = locked ? "block" : "none";
  document.getElementById("lock-recovery-alert-section").style.display = "none";
  document.getElementById("settings-pin").value = "";
  document.getElementById("settings-pin-confirm").value = "";
  document.getElementById("settings-lock-message").textContent = "";
  document.getElementById("settings-lock-message").className = "settings-msg";
}

document.getElementById("settings-lock-enable").addEventListener("click", async () => {
  const pin = document.getElementById("settings-pin").value;
  const confirmPin = document.getElementById("settings-pin-confirm").value;
  const msg = document.getElementById("settings-lock-message");
  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) { msg.textContent = "PIN must be exactly 6 digits."; msg.className = "settings-msg error"; return; }
  if (pin !== confirmPin) { msg.textContent = "PINs do not match."; msg.className = "settings-msg error"; return; }

  const res = await fetch("/api/lock/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
  const data = await res.json();
  if (data.success) {
    lockSetupSection.style.display = "none";
    const alertSection = document.getElementById("lock-recovery-alert-section");
    alertSection.innerHTML = `<div class="recovery-alert"><div class="recovery-alert-header">✓ Lock enabled successfully</div><div class="recovery-alert-body">
<p>Your recovery code:</p><code class="recovery-code">${data.recoveryCode}</code>
<p class="recovery-warning">⚠ Save this code now. This is the only time it will be shown. If you forget your PIN and don't have this code, you will permanently lose access to the app.</p><p class="recovery-tips">Tips: Save it in your notes app, email it to yourself, or store it in your password manager.</p></div></div>`;
    alertSection.style.display = "block";
    lockDisableSection.style.display = "block";
  } else { msg.textContent = data.error || "Failed"; msg.className = "settings-msg error"; }
});

document.getElementById("settings-lock-disable").addEventListener("click", async () => {
  const pin = document.getElementById("settings-disable-pin").value;
  const msg = document.getElementById("settings-disable-message");
  const res = await fetch("/api/lock/disable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
  const data = await res.json();
  if (data.success) { localStorage.removeItem("lock-remembered"); msg.textContent = "Lock disabled."; msg.className = "settings-msg success"; document.getElementById("settings-disable-pin").value = ""; loadLockSettings(); }
  else { msg.textContent = data.error || "Incorrect PIN"; msg.className = "settings-msg error"; }
});

document.getElementById("settings-pin-confirm").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("settings-lock-enable").click(); }
});

document.getElementById("settings-disable-pin").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("settings-lock-disable").click(); }
});

// ===== PIN INPUT FILTERING =====
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
  // deduplicate: if same details+amount already exists with same end date range, skip
  const isDup = notifs.some(n =>
    n.details === details &&
    n.amount === amount &&
    n.dates.length === dates.length
  );
  if (isDup) return;
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
  now.setHours(0, 0, 0, 0); // normalize to start of day

  // Auto-delete expired notifications (past the 14-day window)
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
      // Past the 14-day window — auto-delete
      expiredIds.push(n.id);
      continue;
    }

    // Within the 14-day window: check if today is on or after the last date
    if (now >= lastDate && now <= expiresAt) {
      if (!dismissed.includes(n.id)) {
        unreadCount++;
      }
    }

    activeNotifs.push(n);
  }

  // Clean up expired notifications and their dismissed ids
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
      bell.title = `${unreadCount} notification${unreadCount > 1 ? "s" : ""}`;
    } else {
      badge.style.display = "none";
      bell.title = "Notifications";
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
      <div style="font-size:20px;margin-bottom:8px;">🔔</div>
      <div style="font-weight:600;margin-bottom:6px;">No notifications</div>
      <div style="font-size:12px;line-height:1.5;">Recurring expense reminders will appear here when a copied series is approaching its last occurrence.</div>
    </div>`;
    return;
  }

  list.innerHTML = "";
  // Show most recent first
  for (const n of [...notifs].reverse()) {
    const isDismissed = dismissed.includes(n.id);
    const div = document.createElement("div");
    div.className = `notification-item ${isDismissed ? "read" : "unread"}`;
    const lastDate = n.dates[n.dates.length - 1] || "";
    const formattedLast = lastDate ? formatDate(lastDate) : "";

    div.innerHTML = `
      <div class="notification-item-title">${n.title}</div>
      <div class="notification-item-desc">${n.desc}${formattedLast ? ` (ends ${formattedLast})` : ""}</div>
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
  // Mark all as read when opening
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
    // Remove permanently
    saveDismissedIds(dismissed.filter(id => id !== nid));
    let notifs = getNotifications();
    notifs = notifs.filter(n => n.id !== nid);
    saveNotifications(notifs);
  } else {
    // Mark as dismissed (read)
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
      // Clone the response so we can read body
      const cloned = response.clone();
      try {
        const body = await cloned.json();
        if (body.inserted && body.inserted > 0) {
          // Find the last date from the request body
          try {
            const reqBody = typeof args[1]?.body === "string" ? JSON.parse(args[1].body) : args[1]?.body;
            if (reqBody?.dates?.length) {
              const dates = reqBody.dates;
              const lastDate = dates[dates.length - 1];
              const firstDate = dates[0];
              const months = dates.length;
              // Get details from the copied expense info (from the button data)
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

// Initial check
checkNotifications();

// Re-check when switching to tracker tab
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "tracker") {
      checkNotifications();
    }
  });
});

// ===== PULL TO REFRESH (iPhone PWA) =====
let pullStartY = 0;
let pullMoveY = 0;
let isPulling = false;
const PULL_THRESHOLD = 80;

const pullIndicator = document.createElement("div");
pullIndicator.className = "pull-indicator";
pullIndicator.id = "pull-indicator";
const container = document.querySelector(".container");
if (container) {
  container.parentNode.insertBefore(pullIndicator, container);
}

function isAtTopOfScroll() {
  // On mobile with scroll-snap panels, scrolling happens inside .tab-content
  if (window.innerWidth <= 640) {
    const activePanel = document.querySelector(".tab-content.active");
    if (activePanel) return activePanel.scrollTop <= 10;
  }
  return window.scrollY <= 10;
}

document.addEventListener("touchstart", e => {
  // Only activate pull-to-refresh when at top of page/panel
  if (!isAtTopOfScroll()) return;
  const target = e.target;
  if (target.closest(".modal-overlay") || target.closest(".notification-panel")) return;
  pullStartY = e.touches[0].clientY;
  pullMoveY = pullStartY;
  isPulling = true;
}, { passive: true });

document.addEventListener("touchmove", e => {
  if (!isPulling) return;
  pullMoveY = e.touches[0].clientY;
  const dist = pullMoveY - pullStartY;
  if (dist < 0) { isPulling = false; pullIndicator.classList.remove("visible"); return; }

  const indicator = document.getElementById("pull-indicator");
  if (dist > 20) {
    indicator.innerHTML = dist > PULL_THRESHOLD
      ? `<span class="spinner"></span>Release to refresh...`
      : `<span class="spinner"></span>Pull down to refresh...`;
    indicator.classList.add("visible");
  }
}, { passive: true });

document.addEventListener("touchend", async e => {
  if (!isPulling) return;
  isPulling = false;
  const dist = pullMoveY - pullStartY;
  const indicator = document.getElementById("pull-indicator");

  if (dist > PULL_THRESHOLD) {
    indicator.innerHTML = `<span class="spinner"></span>Refreshing...`;
    try {
      await Promise.all([
        refreshAll(),
        loadReports().catch(() => {}),
        loadCategories()
      ]);
      populateDetailsList();
      indicator.innerHTML = `✓ Updated`;
    } catch {
      indicator.innerHTML = `✗ Failed`;
    }
    setTimeout(() => {
      indicator.classList.remove("visible");
      indicator.innerHTML = "";
    }, 1500);
  } else {
    indicator.classList.remove("visible");
    indicator.innerHTML = "";
  }
}, { passive: true });
