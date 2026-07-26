"use strict";

const state = {
  data: {
    apiVersion: "2.0",
    generatedAt: "",
    dashboard: {},
    catalog: [],
    inventory: [],
    wishlist: [],
    purchases: [],
    tastings: [],
    hunts: []
  },
  source: ""
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const integer = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const els = {
  dataStatus: document.querySelector("#data-status"),
  lastUpdated: document.querySelector("#last-updated"),
  dashboardMetrics: document.querySelector("#dashboard-metrics"),
  statusSummary: document.querySelector("#status-summary"),
  huntSummary: document.querySelector("#hunt-summary"),
  recentBottles: document.querySelector("#recent-bottles"),
  collectionGrid: document.querySelector("#collection-grid"),
  collectionEmpty: document.querySelector("#collection-empty"),
  collectionCount: document.querySelector("#collection-count"),
  wishlistGrid: document.querySelector("#wishlist-grid"),
  wishlistEmpty: document.querySelector("#wishlist-empty"),
  wishlistCount: document.querySelector("#wishlist-count"),
  catalogGrid: document.querySelector("#catalog-grid"),
  catalogEmpty: document.querySelector("#catalog-empty"),
  catalogCount: document.querySelector("#catalog-count"),
  dialog: document.querySelector("#bottle-dialog"),
  dialogContent: document.querySelector("#dialog-content"),
  dialogClose: document.querySelector(".dialog-close"),
  mobileMenuButton: document.querySelector("#mobile-menu-button"),
  primaryNavigation: document.querySelector("#primary-navigation"),
  toastContainer: document.querySelector("#toast-container"),
  footerVersion: document.querySelector("#footer-version"),
  clearCollection: document.querySelector("#clear-collection-filters"),
  clearWishlist: document.querySelector("#clear-wishlist-filters"),
  clearCatalog: document.querySelector("#clear-catalog-filters")
};

const collectionFilters = {
  search: document.querySelector("#search-input"),
  status: document.querySelector("#status-filter"),
  distillery: document.querySelector("#distillery-filter"),
  category: document.querySelector("#category-filter"),
  sort: document.querySelector("#sort-filter")
};

const wishlistFilters = {
  search: document.querySelector("#wishlist-search-input"),
  priority: document.querySelector("#wishlist-priority-filter"),
  status: document.querySelector("#wishlist-status-filter"),
  duplicate: document.querySelector("#wishlist-duplicate-filter"),
  sort: document.querySelector("#wishlist-sort-filter")
};

const catalogFilters = {
  search: document.querySelector("#catalog-search-input"),
  distillery: document.querySelector("#catalog-distillery-filter"),
  category: document.querySelector("#catalog-category-filter"),
  releaseType: document.querySelector("#catalog-release-filter"),
  sort: document.querySelector("#catalog-sort-filter")
};

const priorityRank = {
  "must find": 1,
  "must-have": 1,
  high: 2,
  medium: 3,
  low: 4
};

function str(value) {
  return value == null ? "" : String(value).trim();
}

function lower(value) {
  return str(value).toLowerCase();
}

function num(value) {
  if (value == null || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function html(value) {
  return str(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function attr(value) {
  return html(value);
}

function slug(value) {
  return lower(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values) {
  return [...new Set(values.map(str).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function firstValue(...values) {
  return values.find(value => str(value)) || "";
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = num(value);
    if (parsed != null) return parsed;
  }
  return null;
}

function formatMoney(value, fallback = "—") {
  const amount = num(value);
  return amount == null ? fallback : money.format(amount);
}

function formatProof(value) {
  const proof = num(value);
  if (proof == null) return "Proof unknown";
  return `${Number.isInteger(proof) ? proof : proof.toFixed(1)} proof`;
}

function formatAge(value) {
  const age = num(value);
  if (age == null || age <= 0) return "Not stated";
  return `${age} ${age === 1 ? "year" : "years"}`;
}

function formatFill(value) {
  const fill = num(value);
  if (fill == null) return "Not recorded";
  return `${Math.round(fill <= 1 ? fill * 100 : fill)}%`;
}

function parseDate(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value, fallback = "Not recorded") {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return str(value) || fallback;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function average(values) {
  const valid = values.filter(value => num(value) != null).map(Number);
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function normalizedId(item, type) {
  if (type === "catalog") return firstValue(item.catalogId, item.id, item["Catalog ID"]);
  if (type === "wishlist") return firstValue(item.wishId, item.id, item["Wish ID"]);
  return firstValue(item.inventoryId, item.id, item["Inventory ID"], item.bottleId, item["Bottle ID"]);
}

function normalizeRecord(item = {}) {
  return {
    ...item,
    id: firstValue(item.id, item.inventoryId, item.catalogId, item.wishId, item["Bottle ID"], item["Inventory ID"], item["Catalog ID"], item["Wish ID"]),
    inventoryId: firstValue(item.inventoryId, item["Inventory ID"], item.bottleId, item["Bottle ID"]),
    catalogId: firstValue(item.catalogId, item["Catalog ID"]),
    wishId: firstValue(item.wishId, item["Wish ID"]),
    brand: firstValue(item.brand, item["Brand"]),
    expression: firstValue(item.expression, item["Expression"], item.name, item["Bottle Name"]),
    distillery: firstValue(item.distillery, item["Distillery"]),
    release: firstValue(item.release, item.batch, item["Batch / Release"], item["Release"]),
    category: firstValue(item.category, item["Category"], item.type, item["Type"]),
    releaseType: firstValue(item.releaseType, item["Release Type"]),
    mashBill: firstValue(item.mashBill, item["Mash Bill"], item["Mash bill"]),
    status: firstValue(item.status, item["Status"]),
    priority: firstValue(item.priority, item["Priority"]),
    duplicateCheck: firstValue(item.duplicateCheck, item["Duplicate Check"]),
    image: firstValue(item.image, item.imageUrl, item["Image URL"], item["Bottle Image"]),
    proof: firstNumber(item.proof, item["Proof"]),
    msrp: firstNumber(item.msrp, item["MSRP"]),
    buyUnder: firstNumber(item.buyUnder, item["Buy Under"], item["Target Price"]),
    absoluteMax: firstNumber(item.absoluteMax, item.maxPrice, item["Absolute Max"], item["Maximum Price"]),
    estimatedValue: firstNumber(item.estimatedValue, item["Estimated Value"], item.value, item["Value"]),
    age: firstNumber(item.age, item["Age"]),
    fill: firstNumber(item.fill, item["Fill"], item["Fill Level"]),
    rating: firstNumber(item.rating, item["Rating"], item["Personal Rating"]),
    ownedQty: firstNumber(item.ownedQty, item["Owned Qty"], item["Owned Quantity"]),
    size: firstValue(item.size, item["Size"], item["Bottle Size"]),
    shelf: firstValue(item.shelf, item["Shelf"], item.location, item["Location"]),
    notes: firstValue(item.notes, item["Notes"]),
    dateAdded: firstValue(item.dateAdded, item["Date Added"], item.purchaseDate, item["Purchase Date"]),
    finishedDate: firstValue(item.finishedDate, item["Finished Date"]),
    lastSeenDate: firstValue(item.lastSeenDate, item["Last Seen Date"]),
    whereSeen: firstValue(item.whereSeen, item["Where Seen"]),
    favorite: item.favorite === true || lower(item.favorite) === "yes" || lower(item["Favorite"]) === "yes"
  };
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("The API returned no usable data.");
  if (payload.error) throw new Error(payload.message || "The API returned an error.");

  const inventory = Array.isArray(payload.inventory) ? payload.inventory.map(normalizeRecord) : [];
  const wishlist = Array.isArray(payload.wishlist) ? payload.wishlist.map(normalizeRecord) : [];
  const catalog = Array.isArray(payload.catalog) ? payload.catalog.map(normalizeRecord) : [];

  if (!inventory.length && !wishlist.length && !catalog.length) {
    throw new Error("The API returned an empty vault.");
  }

  return {
    apiVersion: str(payload.apiVersion) || "2.0",
    generatedAt: str(payload.generatedAt),
    dashboard: payload.dashboard && typeof payload.dashboard === "object" ? payload.dashboard : {},
    catalog,
    inventory,
    wishlist,
    purchases: Array.isArray(payload.purchases) ? payload.purchases : [],
    tastings: Array.isArray(payload.tastings) ? payload.tastings : [],
    hunts: Array.isArray(payload.hunts) ? payload.hunts : []
  };
}

function resetSelect(select, label, values) {
  if (!select) return;
  const previous = select.value;
  select.innerHTML = `<option value="">${html(label)}</option>`;

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });

  if ([...select.options].some(option => option.value === previous)) select.value = previous;
}

function populateFilters() {
  const { inventory, wishlist, catalog } = state.data;
  resetSelect(collectionFilters.status, "All statuses", unique(inventory.map(item => item.status)));
  resetSelect(collectionFilters.distillery, "All distilleries", unique(inventory.map(item => item.distillery)));
  resetSelect(collectionFilters.category, "All categories", unique(inventory.map(item => item.category)));
  resetSelect(wishlistFilters.priority, "All priorities", unique(wishlist.map(item => item.priority)));
  resetSelect(wishlistFilters.status, "All statuses", unique(wishlist.map(item => item.status)));
  resetSelect(catalogFilters.distillery, "All distilleries", unique(catalog.map(item => item.distillery)));
  resetSelect(catalogFilters.category, "All categories", unique(catalog.map(item => item.category)));
  resetSelect(catalogFilters.releaseType, "All release types", unique(catalog.map(item => item.releaseType)));
}

function setStatus(message, statusClass = "") {
  if (!els.dataStatus) return;
  els.dataStatus.textContent = message;
  els.dataStatus.className = `data-status ${statusClass}`.trim();
}

function applyData(payload, source) {
  state.data = normalizePayload(payload);
  state.source = source;
  populateFilters();
  setStatus(source === "live" ? "Live from Google Sheets" : "Showing bundled workbook snapshot", source === "live" ? "live" : "error");

  if (els.lastUpdated) {
    els.lastUpdated.textContent = state.data.generatedAt ? `Updated ${formatDateTime(state.data.generatedAt)}` : "";
  }

  if (els.footerVersion) els.footerVersion.textContent = `Version ${state.data.apiVersion}`;
  renderEverything();
}

async function fetchJson(apiUrl) {
  const separator = apiUrl.includes("?") ? "&" : "?";
  const response = await fetch(`${apiUrl}${separator}v=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
    redirect: "follow"
  });

  if (!response.ok) throw new Error(`API returned HTTP ${response.status}.`);
  return response.json();
}

function fetchJsonp(apiUrl) {
  return new Promise((resolve, reject) => {
    const callbackName = `bourbonVaultCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const separator = apiUrl.includes("?") ? "&" : "?";

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("JSONP request timed out."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = payload => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed."));
    };

    script.src = `${apiUrl}${separator}callback=${encodeURIComponent(callbackName)}&v=${Date.now()}`;
    document.head.append(script);
  });
}

async function loadLiveData() {
  const config = window.BOURBON_VAULT_CONFIG || {};
  const apiUrl = str(config.apiUrl);

  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(apiUrl)) {
    useFallback("Apps Script URL has not been configured.", config);
    return;
  }

  setStatus("Loading vault data…");

  try {
    applyData(await fetchJson(apiUrl), "live");
    return;
  } catch (error) {
    console.warn("Normal JSON request failed. Trying JSONP.", error);
  }

  try {
    applyData(await fetchJsonp(apiUrl), "live");
  } catch (error) {
    console.error("Both API loading methods failed.", error);
    useFallback(error.message, config);
  }
}

function useFallback(message, config = {}) {
  console.error(message);

  if (config.useFallbackData !== false && window.BOURBON_DATA) {
    try {
      applyData(window.BOURBON_DATA, "fallback");
      setStatus("Live Sheet unavailable · showing bundled snapshot", "error");
      showToast(message, "error");
      return;
    } catch (error) {
      console.error("Fallback data is invalid.", error);
    }
  }

  setStatus("Unable to load Google Sheets data.", "error");
  if (els.lastUpdated) els.lastUpdated.textContent = "";
  showToast(message, "error");
}

function renderEverything() {
  renderDashboard();
  renderCollection();
  renderWishlist();
  renderCatalog();
}

function renderDashboard() {
  renderDashboardMetrics();
  renderStatusSummary();
  renderHuntSummary();
  renderRecentBottles();
}

function renderDashboardMetrics() {
  if (!els.dashboardMetrics) return;
  const { dashboard, inventory, wishlist, catalog } = state.data;
  const statuses = dashboard.statuses || {};
  const openCount = firstNumber(statuses.open, statuses.opened) ?? inventory.filter(item => ["open", "opened"].includes(lower(item.status))).length;
  const finishedCount = firstNumber(statuses.finished) ?? inventory.filter(item => lower(item.status) === "finished").length;
  const collectionValue = firstNumber(dashboard.estimatedCollectionValue, dashboard.collectionValue, dashboard.totalValue) ?? inventory.reduce((sum, item) => sum + (item.estimatedValue ?? item.msrp ?? 0), 0);

  const metrics = [
    ["Collection", inventory.length, `${unique(inventory.map(item => item.distillery)).length} distilleries`],
    ["Open", openCount, "Bottles currently open"],
    ["Wishlist", wishlist.length, "Active hunting targets"],
    ["Finished", finishedCount, "Completed bottles"],
    ["Favorites", inventory.filter(item => item.favorite).length, "Marked favorites"],
    ["Average Proof", average(inventory.map(item => item.proof)).toFixed(1), "Across recorded bottles"],
    ["Estimated Value", collectionValue ? money.format(collectionValue) : "—", "Recorded collection value"],
    ["Catalog", catalog.length, "Master bottle records"]
  ];

  els.dashboardMetrics.innerHTML = metrics.map(([label, value, note]) => `
    <article class="metric"><span>${html(label)}</span><strong>${html(value)}</strong><small>${html(note)}</small></article>
  `).join("");
}

function renderStatusSummary() {
  if (!els.statusSummary) return;
  const statuses = ["Sealed", "Open", "Finished", "Gifted", "Traded", "Archived"];

  els.statusSummary.innerHTML = statuses.map(status => {
    const key = lower(status);
    const count = state.data.inventory.filter(item => {
      const itemStatus = lower(item.status);
      return key === "open" ? ["open", "opened"].includes(itemStatus) : itemStatus === key;
    }).length;

    return `<div class="status-summary-item"><span>${html(status)}</span><strong>${integer.format(count)}</strong></div>`;
  }).join("");
}

function isAlreadyOwned(item) {
  return lower(item.duplicateCheck).includes("already owned") || (item.ownedQty ?? 0) > 0;
}

function renderHuntSummary() {
  if (!els.huntSummary) return;
  const values = [
    ["Must-find bottles", state.data.wishlist.filter(item => ["must find", "must-have"].includes(lower(item.priority))).length],
    ["Safe-to-buy targets", state.data.wishlist.filter(item => !isAlreadyOwned(item)).length],
    ["Already owned", state.data.wishlist.filter(isAlreadyOwned).length],
    ["Recorded hunt stops", state.data.hunts.length]
  ];

  els.huntSummary.innerHTML = values.map(([label, value]) => `
    <div class="hunt-summary-item"><span>${html(label)}</span><strong>${integer.format(value)}</strong></div>
  `).join("");
}

function renderRecentBottles() {
  if (!els.recentBottles) return;
  const rows = [...state.data.inventory].sort((a, b) => parseDate(b.dateAdded) - parseDate(a.dateAdded)).slice(0, 4);

  if (!rows.length) {
    els.recentBottles.innerHTML = `<p class="empty-state">No inventory records are available.</p>`;
    return;
  }

  els.recentBottles.innerHTML = rows.map(item => `
    <button class="recent-bottle" type="button" data-record-type="inventory" data-record-id="${attr(normalizedId(item, "inventory"))}">
      <span class="status ${slug(item.status)}">${html(item.status || "Unknown")}</span>
      <h4>${html(item.expression || "Unnamed bottle")}</h4>
      <p>${html(item.brand || "")}${item.dateAdded ? ` · ${html(formatDate(item.dateAdded))}` : ""}</p>
    </button>
  `).join("");

  bindRecordButtons(els.recentBottles);
}

function filteredInventory() {
  const query = lower(collectionFilters.search?.value);
  const status = str(collectionFilters.status?.value);
  const distillery = str(collectionFilters.distillery?.value);
  const category = str(collectionFilters.category?.value);

  const rows = state.data.inventory.filter(item => {
    const haystack = [item.brand, item.expression, item.distillery, item.release, item.mashBill, item.shelf, item.category, item.releaseType, item.catalogId, item.inventoryId, item.id].map(str).join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!status || item.status === status) && (!distillery || item.distillery === distillery) && (!category || item.category === category);
  });

  return rows.sort((a, b) => {
    switch (collectionFilters.sort?.value) {
      case "date-desc": return parseDate(b.dateAdded) - parseDate(a.dateAdded);
      case "proof-desc": return (b.proof ?? 0) - (a.proof ?? 0);
      case "proof-asc": return (a.proof ?? 0) - (b.proof ?? 0);
      case "msrp-desc": return (b.msrp ?? 0) - (a.msrp ?? 0);
      case "rating-desc": return (b.rating ?? 0) - (a.rating ?? 0);
      default: return `${a.brand} ${a.expression}`.localeCompare(`${b.brand} ${b.expression}`);
    }
  });
}

function bottlePlaceholder(brand) {
  const initials = str(brand).split(/\s+/).filter(Boolean).slice(0, 2).map(word => word.charAt(0).toUpperCase()).join("") || "BV";
  return `<div class="bottle-image-placeholder" aria-label="Bottle image unavailable">${html(initials)}</div>`;
}

function renderBottleCard(item, type) {
  const id = normalizedId(item, type);
  const image = str(item.image);
  const status = type === "inventory" ? str(item.status) : "";

  return `
    <article class="bottle-card">
      ${item.favorite ? `<span class="favorite-marker" aria-label="Favorite">★</span>` : ""}
      <button class="bottle-card-button" type="button" data-record-type="${attr(type)}" data-record-id="${attr(id)}">
        <div class="bottle-image-wrap">
          ${image ? `<img class="bottle-image" src="${attr(image)}" alt="${attr(`${item.brand} ${item.expression}`)}" loading="lazy">` : bottlePlaceholder(item.brand)}
        </div>
        <div class="bottle-card-content">
          <div class="card-top">
            <div>
              <p class="brand-name">${html(item.brand || "Unknown brand")}</p>
              <h3 class="expression-name">${html(item.expression || "Unnamed expression")}</h3>
              ${item.release ? `<p class="release-name">${html(item.release)}</p>` : ""}
            </div>
            <span class="proof">${html(formatProof(item.proof))}</span>
          </div>
          <div class="card-bottom">
            <p class="meta">${html(item.distillery || "Distillery unknown")}<br>${html(firstValue(item.category, item.mashBill, item.releaseType, "Additional details unavailable"))}</p>
            ${status ? `<span class="status ${slug(status)}">${html(status)}</span>` : item.releaseType ? `<span class="catalog-badge">${html(item.releaseType)}</span>` : ""}
          </div>
        </div>
      </button>
    </article>
  `;
}

function renderCollection() {
  if (!els.collectionGrid) return;
  const rows = filteredInventory();
  if (els.collectionCount) els.collectionCount.textContent = `${rows.length} of ${state.data.inventory.length} bottles`;
  if (els.collectionEmpty) els.collectionEmpty.hidden = rows.length !== 0;
  els.collectionGrid.innerHTML = rows.map(item => renderBottleCard(item, "inventory")).join("");
  bindRecordButtons(els.collectionGrid);
  bindImageFallbacks(els.collectionGrid);
}

function sortablePrice(value) {
  return num(value) ?? Number.MAX_SAFE_INTEGER;
}

function getPriorityRank(value) {
  return priorityRank[lower(value)] || 99;
}

function filteredWishlist() {
  const query = lower(wishlistFilters.search?.value);
  const priority = str(wishlistFilters.priority?.value);
  const status = str(wishlistFilters.status?.value);
  const duplicate = str(wishlistFilters.duplicate?.value);

  const rows = state.data.wishlist.filter(item => {
    const haystack = [item.brand, item.expression, item.distillery, item.release, item.category, item.releaseType, item.notes, item.whereSeen].map(str).join(" ").toLowerCase();
    const owned = isAlreadyOwned(item);
    return (!query || haystack.includes(query)) && (!priority || item.priority === priority) && (!status || item.status === status) && (!duplicate || (duplicate === "owned" && owned) || (duplicate === "safe" && !owned));
  });

  return rows.sort((a, b) => {
    switch (wishlistFilters.sort?.value) {
      case "brand": return `${a.brand} ${a.expression}`.localeCompare(`${b.brand} ${b.expression}`);
      case "buy-under-asc": return sortablePrice(a.buyUnder) - sortablePrice(b.buyUnder);
      case "absolute-max-asc": return sortablePrice(a.absoluteMax) - sortablePrice(b.absoluteMax);
      case "msrp-asc": return sortablePrice(a.msrp) - sortablePrice(b.msrp);
      default: return getPriorityRank(a.priority) - getPriorityRank(b.priority) || `${a.brand} ${a.expression}`.localeCompare(`${b.brand} ${b.expression}`);
    }
  });
}

function renderWishlist() {
  if (!els.wishlistGrid) return;
  const rows = filteredWishlist();
  if (els.wishlistCount) els.wishlistCount.textContent = `${rows.length} of ${state.data.wishlist.length} active targets`;
  if (els.wishlistEmpty) els.wishlistEmpty.hidden = rows.length !== 0;

  els.wishlistGrid.innerHTML = rows.map(item => {
    const owned = isAlreadyOwned(item);
    return `
      <article class="wish-card" tabindex="0" role="button" data-record-type="wishlist" data-record-id="${attr(normalizedId(item, "wishlist"))}">
        <div class="wish-card-main">
          <p class="eyebrow">${html(item.brand || "Unknown brand")}</p>
          <h3>${html(item.expression || "Unnamed expression")}</h3>
          <p>${html(item.distillery || "Distillery unknown")}${item.release ? ` · ${html(item.release)}` : ""}</p>
        </div>
        <div class="wish-field"><span>Priority</span><strong><span class="priority-badge ${slug(item.priority)}">${html(item.priority || "Not set")}</span></strong></div>
        <div class="wish-field"><span>MSRP</span><strong>${html(formatMoney(item.msrp))}</strong></div>
        <div class="wish-field"><span>Buy under</span><strong>${html(formatMoney(item.buyUnder))}</strong></div>
        <div class="wish-field"><span>Absolute max</span><strong>${html(formatMoney(item.absoluteMax))}</strong></div>
        <div class="wish-field"><span>Buy status</span><strong class="${owned ? "owned" : "safe"}">${owned ? "Already owned" : "Safe to buy"}</strong></div>
        <div class="wish-field"><span>Hunt status</span><strong>${html(item.status || "Searching")}</strong></div>
      </article>
    `;
  }).join("");

  bindRecordButtons(els.wishlistGrid);
}

function filteredCatalog() {
  const query = lower(catalogFilters.search?.value);
  const distillery = str(catalogFilters.distillery?.value);
  const category = str(catalogFilters.category?.value);
  const releaseType = str(catalogFilters.releaseType?.value);

  const rows = state.data.catalog.filter(item => {
    const haystack = [item.brand, item.expression, item.distillery, item.release, item.category, item.releaseType, item.mashBill, item.catalogId].map(str).join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!distillery || item.distillery === distillery) && (!category || item.category === category) && (!releaseType || item.releaseType === releaseType);
  });

  return rows.sort((a, b) => {
    switch (catalogFilters.sort?.value) {
      case "proof-desc": return (b.proof ?? 0) - (a.proof ?? 0);
      case "msrp-desc": return (b.msrp ?? 0) - (a.msrp ?? 0);
      default: return `${a.brand} ${a.expression}`.localeCompare(`${b.brand} ${b.expression}`);
    }
  });
}

function renderCatalog() {
  if (!els.catalogGrid) return;
  const rows = filteredCatalog();
  if (els.catalogCount) els.catalogCount.textContent = `${rows.length} of ${state.data.catalog.length} catalog records`;
  if (els.catalogEmpty) els.catalogEmpty.hidden = rows.length !== 0;
  els.catalogGrid.innerHTML = rows.map(item => renderBottleCard(item, "catalog")).join("");
  bindRecordButtons(els.catalogGrid);
  bindImageFallbacks(els.catalogGrid);
}

function bindRecordButtons(container) {
  if (!container) return;

  container.querySelectorAll("[data-record-type][data-record-id]").forEach(element => {
    const open = () => openRecord(element.dataset.recordType, element.dataset.recordId);
    element.addEventListener("click", open);

    if (element.getAttribute("role") === "button") {
      element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    }
  });
}

function bindImageFallbacks(container) {
  if (!container) return;
  container.querySelectorAll("img.bottle-image").forEach(image => {
    image.addEventListener("error", () => image.replaceWith(createPlaceholder(image.alt || "BV")), { once: true });
  });
}

function createPlaceholder(label) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = bottlePlaceholder(label);
  return wrapper.firstElementChild;
}

function findRecord(type, id) {
  const source = type === "catalog" ? state.data.catalog : type === "wishlist" ? state.data.wishlist : state.data.inventory;
  return source.find(item => normalizedId(item, type) === str(id));
}

function openRecord(type, id) {
  const item = findRecord(type, id);
  if (!item) {
    showToast("That bottle record could not be found.", "error");
    return;
  }
  openDialog(item, type);
}

function openDialog(item, type) {
  if (!els.dialog || !els.dialogContent) return;

  const common = [
    ["Distillery", item.distillery || "Not recorded"],
    ["Proof", formatProof(item.proof)],
    ["Batch / Release", item.release || "Not recorded"],
    ["Category", item.category || "Not recorded"],
    ["Release Type", item.releaseType || "Not recorded"],
    ["MSRP", formatMoney(item.msrp, "Not recorded")]
  ];

  let details = common;

  if (type === "inventory") {
    details = [...common, ["Age", formatAge(item.age)], ["Mash Bill", item.mashBill || "Unknown"], ["Bottle Size", item.size || "Not recorded"], ["Status", item.status || "Not recorded"], ["Fill Level", formatFill(item.fill)], ["Shelf", item.shelf || "Not recorded"], ["Estimated Value", formatMoney(item.estimatedValue, "Not recorded")], ["Personal Rating", item.rating ?? "Not rated"], ["Date Added", formatDate(item.dateAdded)], ["Finished Date", formatDate(item.finishedDate)], ["Inventory ID", normalizedId(item, "inventory") || "Not recorded"], ["Catalog ID", item.catalogId || "Not recorded"], ["Notes", item.notes || "No notes"]];
  }

  if (type === "wishlist") {
    details = [...common, ["Priority", item.priority || "Not set"], ["Hunt Status", item.status || "Searching"], ["Buy Under", formatMoney(item.buyUnder, "Not recorded")], ["Absolute Max", formatMoney(item.absoluteMax, "Not recorded")], ["Duplicate Check", isAlreadyOwned(item) ? "Already owned" : "Safe to buy"], ["Owned Quantity", item.ownedQty ?? 0], ["Last Seen", formatDate(item.lastSeenDate)], ["Where Seen", item.whereSeen || "Not recorded"], ["Wish ID", normalizedId(item, "wishlist") || "Not recorded"], ["Catalog ID", item.catalogId || "Not recorded"], ["Notes", item.notes || "No notes"]];
  }

  if (type === "catalog") {
    details = [...common, ["Age", formatAge(item.age)], ["Mash Bill", item.mashBill || "Unknown"], ["Bottle Size", item.size || "Not recorded"], ["Catalog ID", normalizedId(item, "catalog") || "Not recorded"]];
  }

  els.dialogContent.innerHTML = `
    <div class="dialog-body">
      <div class="dialog-header">
        <div class="dialog-image-wrap">
          ${item.image ? `<img class="dialog-image" src="${attr(item.image)}" alt="${attr(`${item.brand} ${item.expression}`)}">` : bottlePlaceholder(item.brand)}
        </div>
        <div>
          <p class="eyebrow">${html(item.brand || "Unknown brand")}</p>
          <h3 id="dialog-title">${html(item.expression || "Unnamed expression")}</h3>
          <p class="dialog-subtitle">${html(firstValue(item.release, item.distillery, item.category, "Bottle details"))}</p>
        </div>
      </div>
      <div class="detail-grid">
        ${details.map(([label, value]) => `<div class="detail ${label === "Notes" ? "detail-wide" : ""}"><span>${html(label)}</span><strong>${html(value)}</strong></div>`).join("")}
      </div>
    </div>
  `;

  const dialogImage = els.dialogContent.querySelector(".dialog-image");
  if (dialogImage) dialogImage.addEventListener("error", () => dialogImage.replaceWith(createPlaceholder(item.brand)), { once: true });
  document.body.classList.add("dialog-open");
  els.dialog.showModal();
}

function closeDialog() {
  if (els.dialog?.open) els.dialog.close();
  document.body.classList.remove("dialog-open");
}

function switchView(viewName, updateHash = true) {
  const target = document.querySelector(`#${viewName}-view`);
  if (!target) return;

  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view === target));
  document.querySelectorAll(".nav-button").forEach(button => button.classList.toggle("active", button.dataset.view === viewName));
  if (updateHash) history.replaceState(null, "", `#${viewName}`);
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMobileMenu() {
  if (!els.primaryNavigation || !els.mobileMenuButton) return;
  const open = els.primaryNavigation.classList.toggle("open");
  els.mobileMenuButton.setAttribute("aria-expanded", String(open));
}

function closeMobileMenu() {
  els.primaryNavigation?.classList.remove("open");
  els.mobileMenuButton?.setAttribute("aria-expanded", "false");
}

function clearFilters(group, render) {
  Object.values(group).forEach(control => {
    if (control) control.value = "";
  });
  render();
}

function showToast(message, type = "") {
  if (!els.toastContainer || !message) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`.trim();
  toast.textContent = message;
  els.toastContainer.append(toast);
  window.setTimeout(() => toast.remove(), 5000);
}

function bindEvents() {
  document.querySelectorAll(".nav-button").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
  document.querySelectorAll("[data-jump-view]").forEach(button => button.addEventListener("click", () => switchView(button.dataset.jumpView)));

  Object.values(collectionFilters).forEach(control => {
    control?.addEventListener("input", renderCollection);
    control?.addEventListener("change", renderCollection);
  });

  Object.values(wishlistFilters).forEach(control => {
    control?.addEventListener("input", renderWishlist);
    control?.addEventListener("change", renderWishlist);
  });

  Object.values(catalogFilters).forEach(control => {
    control?.addEventListener("input", renderCatalog);
    control?.addEventListener("change", renderCatalog);
  });

  els.clearCollection?.addEventListener("click", () => clearFilters(collectionFilters, renderCollection));
  els.clearWishlist?.addEventListener("click", () => clearFilters(wishlistFilters, renderWishlist));
  els.clearCatalog?.addEventListener("click", () => clearFilters(catalogFilters, renderCatalog));
  els.mobileMenuButton?.addEventListener("click", toggleMobileMenu);
  els.dialogClose?.addEventListener("click", closeDialog);
  els.dialog?.addEventListener("click", event => {
    if (event.target === els.dialog) closeDialog();
  });
  els.dialog?.addEventListener("close", () => document.body.classList.remove("dialog-open"));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMobileMenu();
  });
  window.addEventListener("hashchange", () => {
    const view = location.hash.replace("#", "");
    if (["dashboard", "collection", "wishlist", "catalog"].includes(view)) switchView(view, false);
  });
}

function initializeView() {
  const view = location.hash.replace("#", "");
  switchView(["dashboard", "collection", "wishlist", "catalog"].includes(view) ? view : "dashboard", false);
}

bindEvents();
initializeView();
loadLiveData();
