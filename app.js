let inventory = [];
let wishlist = [];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const collectionGrid = document.querySelector("#collection-grid");
const collectionEmpty = document.querySelector("#collection-empty");
const collectionCount = document.querySelector("#collection-count");
const wishlistGrid = document.querySelector("#wishlist-grid");
const wishlistCount = document.querySelector("#wishlist-count");
const dataStatus = document.querySelector("#data-status");
const dialog = document.querySelector("#bottle-dialog");
const dialogContent = document.querySelector("#dialog-content");

const filters = {
  search: document.querySelector("#search-input"),
  status: document.querySelector("#status-filter"),
  distillery: document.querySelector("#distillery-filter"),
  sort: document.querySelector("#sort-filter")
};

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function resetSelect(select, firstLabel, values) {
  select.innerHTML = `<option value="">${firstLabel}</option>`;
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function displayProof(value) {
  if (value == null) return "Proof unknown";
  return Number.isInteger(value) ? `${value} proof` : `${value.toFixed(1)} proof`;
}

function applyData(payload, source) {
  if (!payload || payload.error || !Array.isArray(payload.inventory) || !Array.isArray(payload.wishlist)) {
    throw new Error(payload && payload.message ? payload.message : "Invalid API response");
  }

  inventory = payload.inventory;
  wishlist = payload.wishlist;

  resetSelect(filters.status, "All statuses", unique(inventory.map(item => item.status)));
  resetSelect(filters.distillery, "All distilleries", unique(inventory.map(item => item.distillery)));

  dataStatus.textContent = source === "live"
    ? `Live from Google Sheets${payload.generatedAt ? ` · updated ${new Date(payload.generatedAt).toLocaleString()}` : ""}`
    : "Showing bundled workbook snapshot";
  dataStatus.className = `data-status ${source}`;

  renderMetrics();
  renderCollection();
  renderWishlist();
}

function loadLiveData() {
  const config = window.BOURBON_VAULT_CONFIG || {};
  const apiUrl = String(config.apiUrl || "").trim();
  const configured = /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(apiUrl);

  if (!configured) {
    if (config.useFallbackData !== false && window.BOURBON_DATA) {
      applyData(window.BOURBON_DATA, "fallback");
      return;
    }
    dataStatus.textContent = "Apps Script URL has not been configured.";
    dataStatus.className = "data-status error";
    return;
  }

  const callbackName = `bourbonVaultCallback_${Date.now()}`;
  const script = document.createElement("script");
  const timeout = window.setTimeout(() => {
    cleanup();
    useFallback("Live Sheet request timed out");
  }, 12000);

  function cleanup() {
    window.clearTimeout(timeout);
    delete window[callbackName];
    script.remove();
  }

  function useFallback(message) {
    console.error(message);
    if (config.useFallbackData !== false && window.BOURBON_DATA) {
      applyData(window.BOURBON_DATA, "fallback");
      dataStatus.textContent = "Live Sheet unavailable · showing bundled snapshot";
      dataStatus.className = "data-status error";
    } else {
      dataStatus.textContent = "Unable to load Google Sheets data.";
      dataStatus.className = "data-status error";
    }
  }

  window[callbackName] = payload => {
    cleanup();
    try {
      applyData(payload, "live");
    } catch (error) {
      useFallback(error.message);
    }
  };

  script.onerror = () => {
    cleanup();
    useFallback("Unable to reach Apps Script");
  };

  const separator = apiUrl.includes("?") ? "&" : "?";
  script.src = `${apiUrl}${separator}callback=${encodeURIComponent(callbackName)}&v=${Date.now()}`;
  document.head.append(script);
}

function renderMetrics() {
  const totalMsrp = inventory.reduce((sum, item) => sum + (Number(item.msrp) || 0), 0);
  const opened = inventory.filter(item => item.status === "Opened").length;
  const proofs = inventory.map(item => Number(item.proof)).filter(Number.isFinite);
  const averageProof = proofs.length ? proofs.reduce((sum, value) => sum + value, 0) / proofs.length : 0;
  const metrics = [
    ["Bottles", inventory.length],
    ["Unopened", inventory.length - opened],
    ["Opened", opened],
    ["Recorded MSRP", money.format(totalMsrp)],
    ["Average proof", averageProof.toFixed(1)],
    ["Distilleries", unique(inventory.map(item => item.distillery)).length],
    ["Wishlist", wishlist.length],
    ["Safe-to-buy targets", wishlist.filter(item => item.duplicateCheck !== "ALREADY OWNED").length]
  ];
  document.querySelector("#metrics").innerHTML = metrics.map(([label, value]) =>
    `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`
  ).join("");
}

function filteredInventory() {
  const q = filters.search.value.trim().toLowerCase();
  let rows = inventory.filter(item => {
    const haystack = [item.brand, item.expression, item.distillery, item.release, item.mashBill, item.shelf]
      .filter(Boolean).join(" ").toLowerCase();
    return (!q || haystack.includes(q))
      && (!filters.status.value || item.status === filters.status.value)
      && (!filters.distillery.value || item.distillery === filters.distillery.value);
  });

  rows.sort((a, b) => {
    switch (filters.sort.value) {
      case "proof-desc": return (Number(b.proof) || 0) - (Number(a.proof) || 0);
      case "proof-asc": return (Number(a.proof) || 0) - (Number(b.proof) || 0);
      case "msrp-desc": return (Number(b.msrp) || 0) - (Number(a.msrp) || 0);
      default: return `${a.brand} ${a.expression}`.localeCompare(`${b.brand} ${b.expression}`);
    }
  });
  return rows;
}

function renderCollection() {
  const rows = filteredInventory();
  collectionCount.textContent = `${rows.length} of ${inventory.length} bottles`;
  collectionEmpty.hidden = rows.length !== 0;
  collectionGrid.innerHTML = rows.map(item => `
    <button class="bottle-card" type="button" data-id="${item.id}">
      <div class="card-top">
        <div>
          <p class="brand-name">${escapeHtml(item.brand)}</p>
          <h3 class="expression-name">${escapeHtml(item.expression)}</h3>
        </div>
        <span class="proof">${displayProof(Number(item.proof))}</span>
      </div>
      <div class="card-bottom">
        <p class="meta">${escapeHtml(item.distillery)}<br>${escapeHtml(item.mashBill || "Mash bill unknown")} · ${escapeHtml(item.size || "")}</p>
        <span class="status ${item.status === "Opened" ? "opened" : ""}">${escapeHtml(item.status)}</span>
      </div>
    </button>
  `).join("");

  collectionGrid.querySelectorAll(".bottle-card").forEach(button => {
    button.addEventListener("click", () => openBottle(button.dataset.id));
  });
}

function openBottle(id) {
  const item = inventory.find(row => row.id === id);
  if (!item) return;
  const fillValue = Number(item.fill);
  const fill = Number.isFinite(fillValue) ? `${Math.round(fillValue * 100)}%` : "Not recorded";
  const ageValue = Number(item.age);
  const msrpValue = Number(item.msrp);

  dialogContent.innerHTML = `
    <div class="dialog-body">
      <p class="eyebrow">${escapeHtml(item.brand)}</p>
      <h3>${escapeHtml(item.expression)}</h3>
      <div class="detail-grid">
        <div class="detail"><span>Distillery</span><strong>${escapeHtml(item.distillery || "Not recorded")}</strong></div>
        <div class="detail"><span>Proof</span><strong>${displayProof(Number(item.proof))}</strong></div>
        <div class="detail"><span>Batch / Release</span><strong>${escapeHtml(item.release || "Not recorded")}</strong></div>
        <div class="detail"><span>Age</span><strong>${Number.isFinite(ageValue) ? `${ageValue} years` : "Not stated"}</strong></div>
        <div class="detail"><span>Mash bill</span><strong>${escapeHtml(item.mashBill || "Unknown")}</strong></div>
        <div class="detail"><span>Status</span><strong>${escapeHtml(item.status)}</strong></div>
        <div class="detail"><span>Fill level</span><strong>${fill}</strong></div>
        <div class="detail"><span>Shelf</span><strong>${escapeHtml(item.shelf || "Not recorded")}</strong></div>
        <div class="detail"><span>MSRP</span><strong>${Number.isFinite(msrpValue) ? money.format(msrpValue) : "Not recorded"}</strong></div>
        <div class="detail"><span>Bottle ID</span><strong>${escapeHtml(item.id)}</strong></div>
      </div>
    </div>`;
  dialog.showModal();
}

function renderWishlist() {
  wishlistCount.textContent = `${wishlist.length} active targets`;
  wishlistGrid.innerHTML = wishlist.map(item => {
    const owned = item.duplicateCheck === "ALREADY OWNED";
    const msrp = Number(item.msrp);
    const maxPrice = Number(item.maxPrice);
    return `
      <article class="wish-card">
        <div>
          <p class="eyebrow">${escapeHtml(item.brand)}</p>
          <h3>${escapeHtml(item.expression)}</h3>
          <p>${escapeHtml(item.distillery || "")}</p>
        </div>
        <div class="wish-field"><span>Priority</span><strong>${escapeHtml(item.priority || "Not set")}</strong></div>
        <div class="wish-field"><span>MSRP</span><strong>${Number.isFinite(msrp) ? money.format(msrp) : "—"}</strong></div>
        <div class="wish-field"><span>Maximum</span><strong>${Number.isFinite(maxPrice) ? money.format(maxPrice) : "—"}</strong></div>
        <div class="wish-field"><span>Buy status</span><strong class="${owned ? "owned" : "safe"}">${owned ? "Already owned" : "Safe to buy"}</strong></div>
        <div class="wish-field"><span>Hunt status</span><strong>${escapeHtml(item.status || "Searching")}</strong></div>
      </article>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll(".nav-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach(item => item.classList.toggle("active", item === button));
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    document.querySelector(`#${button.dataset.view}-view`).classList.add("active");
    history.replaceState(null, "", `#${button.dataset.view}`);
  });
});

Object.values(filters).forEach(control => control.addEventListener("input", renderCollection));
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

if (location.hash === "#wishlist") {
  document.querySelector('[data-view="wishlist"]').click();
}

loadLiveData();
