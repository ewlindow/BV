"use strict";

let vaultData = {
apiVersion: "2.0",
generatedAt: "",
dashboard: {},
catalog: [],
inventory: [],
wishlist: [],
purchases: [],
tastings: [],
hunts: []
};

const money = new Intl.NumberFormat("en-US", {
style: "currency",
currency: "USD"
});

const wholeNumber = new Intl.NumberFormat("en-US", {
maximumFractionDigits: 0
});

const elements = {
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

mobileMenuButton: document.querySelector("#mobile-menu-button"),
primaryNavigation: document.querySelector("#primary-navigation"),

toastContainer: document.querySelector("#toast-container"),
footerVersion: document.querySelector("#footer-version")
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
high: 2,
medium: 3,
low: 4
};

function text(value) {
return value == null ? "" : String(value).trim();
}

function lower(value) {
return text(value).toLowerCase();
}

function numberOrNull(value) {
if (value == null || value === "") {
return null;
}

const result = Number(value);
return Number.isFinite(result) ? result : null;
}

function dateValue(value) {
const parsed = Date.parse(value);
return Number.isFinite(parsed) ? parsed : 0;
}

function unique(values) {
return [...new Set(values.map(text).filter(Boolean))]
.sort((a, b) => a.localeCompare(b));
}

function escapeHtml(value) {
return text(value)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

function escapeAttribute(value) {
return escapeHtml(value);
}

function formatMoney(value, fallback = "Not recorded") {
const amount = numberOrNull(value);
return amount == null ? fallback : money.format(amount);
}

function formatProof(value) {
const proof = numberOrNull(value);

if (proof == null) {
return "Proof unknown";
}

return `${Number.isInteger(proof) ? proof : proof.toFixed(1)} proof`;
}

function formatAge(value) {
const age = numberOrNull(value);

if (age == null || age <= 0) {
return "Not stated";
}

return `${age} ${age === 1 ? "year" : "years"}`;
}

function formatFill(value) {
const fill = numberOrNull(value);

if (fill == null) {
return "Not recorded";
}

const percentage = fill <= 1 ? fill * 100 : fill;
return `${Math.round(percentage)}%`;
}

function formatDate(value, fallback = "Not recorded") {
if (!value) {
return fallback;
}

const parsed = new Date(value);

if (Number.isNaN(parsed.getTime())) {
return text(value) || fallback;
}

return parsed.toLocaleDateString("en-US", {
month: "short",
day: "numeric",
year: "numeric"
});
}

function formatDateTime(value) {
if (!value) {
return "";
}

const parsed = new Date(value);

if (Number.isNaN(parsed.getTime())) {
return "";
}

return parsed.toLocaleString("en-US", {
month: "short",
day: "numeric",
year: "numeric",
hour: "numeric",
minute: "2-digit"
});
}

function slug(value) {
return lower(value)
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-+|-+$/g, "");
}

function resetSelect(select, firstLabel, values) {
if (!select) {
return;
}

const currentValue = select.value;

select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>`;

values.forEach(value => {
const option = document.createElement("option");
option.value = value;
option.textContent = value;
select.append(option);
});

if ([...select.options].some(option => option.value === currentValue)) {
select.value = currentValue;
}
}

function firstNonBlank(...values) {
return values.find(value => text(value) !== "") || "";
}

function normalizePayload(payload) {
if (!payload || payload.error) {
throw new Error(
payload && payload.message
? payload.message
: "Invalid API response"
);
}

if (!Array.isArray(payload.inventory)) {
throw new Error("API response is missing inventory data.");
}

if (!Array.isArray(payload.wishlist)) {
throw new Error("API response is missing wishlist data.");
}

return {
apiVersion: text(payload.apiVersion) || "2.0",
generatedAt: text(payload.generatedAt),
dashboard:
payload.dashboard && typeof payload.dashboard === "object"
? payload.dashboard
: {},
catalog: Array.isArray(payload.catalog) ? payload.catalog : [],
inventory: payload.inventory,
wishlist: payload.wishlist,
purchases: Array.isArray(payload.purchases) ? payload.purchases : [],
tastings: Array.isArray(payload.tastings) ? payload.tastings : [],
hunts: Array.isArray(payload.hunts) ? payload.hunts : []
};
}

function applyData(payload, source) {
vaultData = normalizePayload(payload);

populateFilters();

if (elements.footerVersion) {
elements.footerVersion.textContent =
`Version ${vaultData.apiVersion || "2.0"}`;
}

if (elements.dataStatus) {
elements.dataStatus.textContent =
source === "live"
? "Live from Google Sheets"
: "Showing bundled workbook snapshot";

```
elements.dataStatus.className =
  `data-status ${source === "live" ? "live" : "error"}`;
```

}

if (elements.lastUpdated) {
elements.lastUpdated.textContent = vaultData.generatedAt
? `Updated ${formatDateTime(vaultData.generatedAt)}`
: "";
}

renderDashboard();
renderCollection();
renderWishlist();
renderCatalog();
}

function populateFilters() {
resetSelect(
collectionFilters.status,
"All statuses",
unique(vaultData.inventory.map(item => item.status))
);

resetSelect(
collectionFilters.distillery,
"All distilleries",
unique(vaultData.inventory.map(item => item.distillery))
);

resetSelect(
collectionFilters.category,
"All categories",
unique(vaultData.inventory.map(item => item.category))
);

resetSelect(
wishlistFilters.priority,
"All priorities",
unique(vaultData.wishlist.map(item => item.priority))
);

resetSelect(
wishlistFilters.status,
"All statuses",
unique(vaultData.wishlist.map(item => item.status))
);

resetSelect(
catalogFilters.distillery,
"All distilleries",
unique(vaultData.catalog.map(item => item.distillery))
);

resetSelect(
catalogFilters.category,
"All categories",
unique(vaultData.catalog.map(item => item.category))
);

resetSelect(
catalogFilters.releaseType,
"All release types",
unique(vaultData.catalog.map(item => item.releaseType))
);
}

function loadLiveData() {
const config = window.BOURBON_VAULT_CONFIG || {};
const apiUrl = text(config.apiUrl);

const configured =
/^https://script.google.com/macros/s/.+/exec(?:?.*)?$/.test(apiUrl);

if (!configured) {
useFallbackData(
"Apps Script URL has not been configured.",
config
);
return;
}

const callbackName = `bourbonVaultCallback_${Date.now()}`;
const script = document.createElement("script");

const timeout = window.setTimeout(() => {
cleanup();
useFallbackData("Live Sheet request timed out.", config);
}, 15000);

function cleanup() {
window.clearTimeout(timeout);
delete window[callbackName];
script.remove();
}

window[callbackName] = payload => {
cleanup();

```
try {
  applyData(payload, "live");
} catch (error) {
  console.error(error);
  useFallbackData(error.message, config);
}
```

};

script.onerror = () => {
cleanup();
useFallbackData("Unable to reach Apps Script.", config);
};

const separator = apiUrl.includes("?") ? "&" : "?";

script.src =
`${apiUrl}${separator}` +
`callback=${encodeURIComponent(callbackName)}` +
`&v=${Date.now()}`;

document.head.append(script);
}

function useFallbackData(message, config = {}) {
console.error(message);

if (
config.useFallbackData !== false &&
window.BOURBON_DATA
) {
try {
applyData(window.BOURBON_DATA, "fallback");

```
  if (elements.dataStatus) {
    elements.dataStatus.textContent =
      "Live Sheet unavailable · showing bundled snapshot";
    elements.dataStatus.className = "data-status error";
  }

  showToast(message, "error");
  return;
} catch (error) {
  console.error("Fallback data is invalid:", error);
}
```

}

if (elements.dataStatus) {
elements.dataStatus.textContent =
"Unable to load Google Sheets data.";
elements.dataStatus.className = "data-status error";
}

if (elements.lastUpdated) {
elements.lastUpdated.textContent = "";
}

showToast(message, "error");
}

function renderDashboard() {
renderDashboardMetrics();
renderStatusSummary();
renderHuntSummary();
renderRecentBottles();
}

function renderDashboardMetrics() {
if (!elements.dashboardMetrics) {
return;
}

const dashboard = vaultData.dashboard || {};

const totalBottles =
numberOrNull(dashboard.totalBottles) ??
vaultData.inventory.length;

const openBottles =
numberOrNull(dashboard.statuses && dashboard.statuses.open) ??
vaultData.inventory.filter(item => lower(item.status) === "open").length;

const finishedBottles =
numberOrNull(dashboard.statuses && dashboard.statuses.finished) ??
vaultData.inventory.filter(item => lower(item.status) === "finished").length;

const wishlistItems =
numberOrNull(dashboard.totalWishlistItems) ??
vaultData.wishlist.length;

const favorites =
numberOrNull(dashboard.favorites) ??
vaultData.inventory.filter(item => item.favorite === true).length;

const estimatedValue =
numberOrNull(dashboard.estimatedCollectionValue);

const averageProof =
numberOrNull(dashboard.averageProof) ??
calculateAverage(
vaultData.inventory
.map(item => numberOrNull(item.proof))
.filter(value => value != null)
);

const distilleries =
unique(vaultData.inventory.map(item => item.distillery)).length;

const metrics = [
{
label: "Collection",
value: wholeNumber.format(totalBottles),
note: `${distilleries} distilleries`
},
{
label: "Open",
value: wholeNumber.format(openBottles),
note: "Bottles currently open"
},
{
label: "Wishlist",
value: wholeNumber.format(wishlistItems),
note: "Active hunting targets"
},
{
label: "Finished",
value: wholeNumber.format(finishedBottles),
note: "Completed bottles"
},
{
label: "Favorites",
value: wholeNumber.format(favorites),
note: "Marked favorites"
},
{
label: "Average Proof",
value: averageProof ? averageProof.toFixed(1) : "—",
note: "Across recorded bottles"
},
{
label: "Estimated Value",
value:
estimatedValue == null
? "—"
: money.format(estimatedValue),
note: "Recorded collection value"
},
{
label: "Catalog",
value: wholeNumber.format(vaultData.catalog.length),
note: "Master bottle records"
}
];

elements.dashboardMetrics.innerHTML = metrics
.map(metric => `       <article class="metric">         <span>${escapeHtml(metric.label)}</span>         <strong>${escapeHtml(metric.value)}</strong>         <small>${escapeHtml(metric.note)}</small>       </article>
    `)
.join("");
}

function renderStatusSummary() {
if (!elements.statusSummary) {
return;
}

const statuses = [
"Sealed",
"Open",
"Finished",
"Gifted",
"Traded",
"Archived"
];

const dashboardStatuses =
vaultData.dashboard && vaultData.dashboard.statuses
? vaultData.dashboard.statuses
: {};

elements.statusSummary.innerHTML = statuses
.map(status => {
const key = lower(status);

```
  const count =
    numberOrNull(dashboardStatuses[key]) ??
    vaultData.inventory.filter(
      item => lower(item.status) === key
    ).length;

  return `
    <div class="status-summary-item">
      <span>${escapeHtml(status)}</span>
      <strong>${wholeNumber.format(count)}</strong>
    </div>
  `;
})
.join("");
```

}

function renderHuntSummary() {
if (!elements.huntSummary) {
return;
}

const dashboard = vaultData.dashboard || {};

const mustFind =
numberOrNull(dashboard.mustFindItems) ??
vaultData.wishlist.filter(
item => lower(item.priority) === "must find"
).length;

const safeToBuy = vaultData.wishlist.filter(
item => !isAlreadyOwned(item)
).length;

const alreadyOwned =
numberOrNull(dashboard.alreadyOwnedWishlistItems) ??
vaultData.wishlist.filter(isAlreadyOwned).length;

const huntStops =
numberOrNull(dashboard.huntStops) ??
vaultData.hunts.length;

const values = [
["Must-find bottles", mustFind],
["Safe-to-buy targets", safeToBuy],
["Already owned", alreadyOwned],
["Recorded hunt stops", huntStops]
];

elements.huntSummary.innerHTML = values
.map(([label, value]) => `       <div class="hunt-summary-item">         <span>${escapeHtml(label)}</span>         <strong>${wholeNumber.format(value)}</strong>       </div>
    `)
.join("");
}

function renderRecentBottles() {
if (!elements.recentBottles) {
return;
}

const recent = [...vaultData.inventory]
.sort((a, b) => {
const dateDifference =
dateValue(b.dateAdded) - dateValue(a.dateAdded);

```
  if (dateDifference !== 0) {
    return dateDifference;
  }

  return text(b.inventoryId || b.id)
    .localeCompare(text(a.inventoryId || a.id));
})
.slice(0, 4);
```

if (!recent.length) {
elements.recentBottles.innerHTML =
`<p class="empty-state">No inventory records are available.</p>`;
return;
}

elements.recentBottles.innerHTML = recent
.map(item => ` <button
     class="recent-bottle"
     type="button"
     data-record-type="inventory"
     data-record-id="${escapeAttribute(item.inventoryId || item.id)}"
   > <span class="status ${slug(item.status)}">
${escapeHtml(item.status || "Unknown")} </span>

```
    <h4>${escapeHtml(item.expression || "Unnamed bottle")}</h4>

    <p>
      ${escapeHtml(item.brand || "")}
      ${item.dateAdded ? ` · ${escapeHtml(formatDate(item.dateAdded))}` : ""}
    </p>
  </button>
`)
.join("");
```

bindDetailButtons(elements.recentBottles);
}

function getFilteredInventory() {
const query = lower(collectionFilters.search && collectionFilters.search.value);
const status = text(collectionFilters.status && collectionFilters.status.value);
const distillery = text(
collectionFilters.distillery && collectionFilters.distillery.value
);
const category = text(
collectionFilters.category && collectionFilters.category.value
);

const rows = vaultData.inventory.filter(item => {
const haystack = [
item.brand,
item.expression,
item.distillery,
item.release,
item.mashBill,
item.shelf,
item.category,
item.releaseType,
item.catalogId,
item.inventoryId,
item.id
]
.map(text)
.join(" ")
.toLowerCase();

```
return (
  (!query || haystack.includes(query)) &&
  (!status || item.status === status) &&
  (!distillery || item.distillery === distillery) &&
  (!category || item.category === category)
);
```

});

return rows.sort((a, b) => {
switch (collectionFilters.sort && collectionFilters.sort.value) {
case "date-desc":
return dateValue(b.dateAdded) - dateValue(a.dateAdded);

```
  case "proof-desc":
    return (numberOrNull(b.proof) || 0) -
      (numberOrNull(a.proof) || 0);

  case "proof-asc":
    return (numberOrNull(a.proof) || 0) -
      (numberOrNull(b.proof) || 0);

  case "msrp-desc":
    return (numberOrNull(b.msrp) || 0) -
      (numberOrNull(a.msrp) || 0);

  case "rating-desc":
    return (numberOrNull(b.rating) || 0) -
      (numberOrNull(a.rating) || 0);

  default:
    return `${text(a.brand)} ${text(a.expression)}`
      .localeCompare(`${text(b.brand)} ${text(b.expression)}`);
}
```

});
}

function renderCollection() {
if (!elements.collectionGrid) {
return;
}

const rows = getFilteredInventory();

elements.collectionCount.textContent =
`${rows.length} of ${vaultData.inventory.length} bottles`;

elements.collectionEmpty.hidden = rows.length !== 0;

elements.collectionGrid.innerHTML = rows
.map(item => renderBottleCard(item, "inventory"))
.join("");

bindDetailButtons(elements.collectionGrid);
bindImageFallbacks(elements.collectionGrid);
}

function renderBottleCard(item, recordType) {
const identifier =
recordType === "catalog"
? item.catalogId
: item.inventoryId || item.id;

const status =
recordType === "inventory"
? text(item.status)
: "";

const image = text(item.image);

return `    <article class="bottle-card">
      ${
        item.favorite
          ?`<span class="favorite-marker" title="Favorite" aria-label="Favorite">★</span>`
: ""
}

```
  <button
    class="bottle-card-button"
    type="button"
    data-record-type="${escapeAttribute(recordType)}"
    data-record-id="${escapeAttribute(identifier)}"
  >
    <div class="bottle-image-wrap">
      ${
        image
          ? `
            <img
              class="bottle-image"
              src="${escapeAttribute(image)}"
              alt="${escapeAttribute(
                `${item.brand || ""} ${item.expression || ""}`.trim()
              )}"
              loading="lazy"
            >
          `
          : bottlePlaceholder(item.brand)
      }
    </div>

    <div class="bottle-card-content">
      <div class="card-top">
        <div>
          <p class="brand-name">
            ${escapeHtml(item.brand || "Unknown brand")}
          </p>

          <h3 class="expression-name">
            ${escapeHtml(item.expression || "Unnamed expression")}
          </h3>

          ${
            item.release
              ? `<p class="release-name">${escapeHtml(item.release)}</p>`
              : ""
          }
        </div>

        <span class="proof">
          ${escapeHtml(formatProof(item.proof))}
        </span>
      </div>

      <div class="card-bottom">
        <p class="meta">
          ${escapeHtml(item.distillery || "Distillery unknown")}
          <br>
          ${escapeHtml(
            firstNonBlank(
              item.category,
              item.mashBill,
              item.releaseType,
              "Additional details unavailable"
            )
          )}
        </p>

        ${
          status
            ? `
              <span class="status ${slug(status)}">
                ${escapeHtml(status)}
              </span>
            `
            : item.releaseType
              ? `
                <span class="catalog-badge">
                  ${escapeHtml(item.releaseType)}
                </span>
              `
              : ""
        }
      </div>
    </div>
  </button>
</article>
```

`;
}

function bottlePlaceholder(brand) {
const initials = text(brand)
.split(/\s+/)
.filter(Boolean)
.slice(0, 2)
.map(word => word.charAt(0).toUpperCase())
.join("") || "BV";

return `     <div
      class="bottle-image-placeholder"
      aria-label="Bottle image unavailable"     >
      ${escapeHtml(initials)}     </div>
  `;
}

function getFilteredWishlist() {
const query = lower(wishlistFilters.search && wishlistFilters.search.value);
const priority = text(
wishlistFilters.priority && wishlistFilters.priority.value
);
const status = text(
wishlistFilters.status && wishlistFilters.status.value
);
const duplicate = text(
wishlistFilters.duplicate && wishlistFilters.duplicate.value
);

const rows = vaultData.wishlist.filter(item => {
const haystack = [
item.brand,
item.expression,
item.distillery,
item.release,
item.category,
item.releaseType,
item.notes,
item.whereSeen
]
.map(text)
.join(" ")
.toLowerCase();

```
const alreadyOwned = isAlreadyOwned(item);

return (
  (!query || haystack.includes(query)) &&
  (!priority || item.priority === priority) &&
  (!status || item.status === status) &&
  (
    !duplicate ||
    (duplicate === "owned" && alreadyOwned) ||
    (duplicate === "safe" && !alreadyOwned)
  )
);
```

});

return rows.sort((a, b) => {
switch (wishlistFilters.sort && wishlistFilters.sort.value) {
case "brand":
return `${text(a.brand)} ${text(a.expression)}`
.localeCompare(`${text(b.brand)} ${text(b.expression)}`);

```
  case "buy-under-asc":
    return sortableMoney(a.buyUnder) - sortableMoney(b.buyUnder);

  case "absolute-max-asc":
    return sortableMoney(a.absoluteMax ?? a.maxPrice) -
      sortableMoney(b.absoluteMax ?? b.maxPrice);

  case "msrp-asc":
    return sortableMoney(a.msrp) - sortableMoney(b.msrp);

  default:
    return getPriorityRank(a.priority) - getPriorityRank(b.priority) ||
      `${text(a.brand)} ${text(a.expression)}`
        .localeCompare(`${text(b.brand)} ${text(b.expression)}`);
}
```

});
}

function sortableMoney(value) {
const amount = numberOrNull(value);
return amount == null ? Number.MAX_SAFE_INTEGER : amount;
}

function getPriorityRank(priority) {
return priorityRank[lower(priority)] || 99;
}

function isAlreadyOwned(item) {
return (
lower(item.duplicateCheck).includes("already owned") ||
numberOrNull(item.ownedQty) > 0
);
}

function renderWishlist() {
if (!elements.wishlistGrid) {
return;
}

const rows = getFilteredWishlist();

elements.wishlistCount.textContent =
`${rows.length} of ${vaultData.wishlist.length} active targets`;

elements.wishlistEmpty.hidden = rows.length !== 0;

elements.wishlistGrid.innerHTML = rows
.map(item => {
const owned = isAlreadyOwned(item);
const maximum = item.absoluteMax ?? item.maxPrice;

```
  return `
    <article
      class="wish-card"
      data-record-type="wishlist"
      data-record-id="${escapeAttribute(item.wishId || item.id)}"
    >
      <div class="wish-card-main">
        <p class="eyebrow">
          ${escapeHtml(item.brand || "Unknown brand")}
        </p>

        <h3>${escapeHtml(item.expression || "Unnamed expression")}</h3>

        <p>
          ${escapeHtml(item.distillery || "Distillery unknown")}
          ${item.release ? ` · ${escapeHtml(item.release)}` : ""}
        </p>
      </div>

      <div class="wish-field">
        <span>Priority</span>
        <strong>
          <span class="priority-badge ${slug(item.priority)}">
            ${escapeHtml(item.priority || "Not set")}
          </span>
        </strong>
      </div>

      <div class="wish-field">
        <span>MSRP</span>
        <strong>${escapeHtml(formatMoney(item.msrp, "—"))}</strong>
      </div>

      <div class="wish-field">
        <span>Buy under</span>
        <strong>${escapeHtml(formatMoney(item.buyUnder, "—"))}</strong>
      </div>

      <div class="wish-field">
        <span>Absolute max</span>
        <strong>${escapeHtml(formatMoney(maximum, "—"))}</strong>
      </div>

      <div class="wish-field">
        <span>Buy status</span>
        <strong class="${owned ? "owned" : "safe"}">
          ${owned ? "Already owned" : "Safe to buy"}
        </strong>
      </div>

      <div class="wish-field">
        <span>Hunt status</span>
        <strong>${escapeHtml(item.status || "Searching")}</strong>
      </div>
    </article>
  `;
})
.join("");
```

elements.wishlistGrid
.querySelectorAll(".wish-card")
.forEach(card => {
card.tabIndex = 0;
card.setAttribute("role", "button");

```
  card.addEventListener("click", () => {
    openRecord(
      card.dataset.recordType,
      card.dataset.recordId
    );
  });

  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      card.click();
    }
  });
});
```

}

function getFilteredCatalog() {
const query = lower(catalogFilters.search && catalogFilters.search.value);
const distillery = text(
catalogFilters.distillery && catalogFilters.distillery.value
);
const category = text(
catalogFilters.category && catalogFilters.category.value
);
const releaseType = text(
catalogFilters.releaseType && catalogFilters.releaseType.value
);

const rows = vaultData.catalog.filter(item => {
const haystack = [
item.brand,
item.expression,
item.distillery,
item.release,
item.category,
item.releaseType,
item.mashBill,
item.catalogId
]
.map(text)
.join(" ")
.toLowerCase();

```
return (
  (!query || haystack.includes(query)) &&
  (!distillery || item.distillery === distillery) &&
  (!category || item.category === category) &&
  (!releaseType || item.releaseType === releaseType)
);
```

});

return rows.sort((a, b) => {
switch (catalogFilters.sort && catalogFilters.sort.value) {
case "proof-desc":
return (numberOrNull(b.proof) || 0) -
(numberOrNull(a.proof) || 0);

```
  case "msrp-desc":
    return (numberOrNull(b.msrp) || 0) -
      (numberOrNull(a.msrp) || 0);

  default:
    return `${text(a.brand)} ${text(a.expression)}`
      .localeCompare(`${text(b.brand)} ${text(b.expression)}`);
}
```

});
}

function renderCatalog() {
if (!elements.catalogGrid) {
return;
}

const rows = getFilteredCatalog();

elements.catalogCount.textContent =
`${rows.length} of ${vaultData.catalog.length} catalog records`;

elements.catalogEmpty.hidden = rows.length !== 0;

elements.catalogGrid.innerHTML = rows
.map(item => renderBottleCard(item, "catalog"))
.join("");

bindDetailButtons(elements.catalogGrid);
bindImageFallbacks(elements.catalogGrid);
}

function bindDetailButtons(container) {
if (!container) {
return;
}

container
.querySelectorAll("[data-record-type][data-record-id]")
.forEach(button => {
button.addEventListener("click", () => {
openRecord(
button.dataset.recordType,
button.dataset.recordId
);
});
});
}

function bindImageFallbacks(container) {
container
.querySelectorAll("img.bottle-image")
.forEach(image => {
image.addEventListener(
"error",
() => {
image.replaceWith(
createPlaceholderElement(
image.alt.split(" ")[0] || "BV"
)
);
},
{ once: true }
);
});
}

function createPlaceholderElement(brand) {
const wrapper = document.createElement("div");
wrapper.innerHTML = bottlePlaceholder(brand);
return wrapper.firstElementChild;
}

function openRecord(recordType, recordId) {
let item = null;

if (recordType === "inventory") {
item = vaultData.inventory.find(
row => text(row.inventoryId || row.id) === text(recordId)
);
}

if (recordType === "wishlist") {
item = vaultData.wishlist.find(
row => text(row.wishId || row.id) === text(recordId)
);
}

if (recordType === "catalog") {
item = vaultData.catalog.find(
row => text(row.catalogId) === text(recordId)
);
}

if (!item) {
showToast("That bottle record could not be found.", "error");
return;
}

openBottleDialog(item, recordType);
}

function openBottleDialog(item, recordType) {
if (!elements.dialog || !elements.dialogContent) {
return;
}

const image = text(item.image);

let details = [];

if (recordType === "inventory") {
details = [
["Distillery", item.distillery || "Not recorded"],
["Proof", formatProof(item.proof)],
["Batch / Release", item.release || "Not recorded"],
["Age", formatAge(item.age)],
["Mash Bill", item.mashBill || "Unknown"],
["Category", item.category || "Not recorded"],
["Release Type", item.releaseType || "Not recorded"],
["Bottle Size", item.size || "Not recorded"],
["Status", item.status || "Not recorded"],
["Fill Level", formatFill(item.fill)],
["Shelf", item.shelf || "Not recorded"],
["MSRP", formatMoney(item.msrp)],
["Estimated Value", formatMoney(item.estimatedValue)],
["Personal Rating", item.rating || "Not rated"],
["Date Added", formatDate(item.dateAdded)],
["Finished Date", formatDate(item.finishedDate)],
["Rebuy?", item.rebuy || "Not recorded"],
["Inventory ID", item.inventoryId || item.id || "Not recorded"],
["Catalog ID", item.catalogId || "Not recorded"],
["Notes", item.notes || "No notes"]
];
}

if (recordType === "wishlist") {
details = [
["Distillery", item.distillery || "Not recorded"],
["Proof", formatProof(item.proof)],
["Batch / Release", item.release || "Not recorded"],
["Category", item.category || "Not recorded"],
["Release Type", item.releaseType || "Not recorded"],
["Priority", item.priority || "Not set"],
["Hunt Status", item.status || "Searching"],
["MSRP", formatMoney(item.msrp)],
["Buy Under", formatMoney(item.buyUnder)],
[
"Absolute Max",
formatMoney(item.absoluteMax ?? item.maxPrice)
],
[
"Duplicate Check",
isAlreadyOwned(item) ? "Already owned" : "Safe to buy"
],
["Owned Quantity", item.ownedQty ?? 0],
["Last Seen", formatDate(item.lastSeenDate)],
["Where Seen", item.whereSeen || "Not recorded"],
["Wish ID", item.wishId || item.id || "Not recorded"],
["Catalog ID", item.catalogId || "Not recorded"],
["Notes", item.notes || "No notes"]
];
}

if (recordType === "catalog") {
details = [
["Distillery", item.distillery || "Not recorded"],
["Proof", formatProof(item.proof)],
["Batch / Release", item.release || "Not recorded"],
["Age", formatAge(item.age)],
["Mash Bill", item.mashBill || "Unknown"],
["Category", item.category || "Not recorded"],
["Release Type", item.releaseType || "Not recorded"],
["Bottle Size", item.size || "Not recorded"],
["MSRP", formatMoney(item.msrp)],
["Active", item.active === false ? "No" : "Yes"],
["Source", item.source || "Not recorded"],
["Catalog ID", item.catalogId || "Not recorded"]
];
}

const notesLabels = new Set(["Notes"]);

elements.dialogContent.innerHTML = `    <div class="dialog-body">       <div class="dialog-header">         <div class="dialog-image-wrap">
          ${
            image
              ?`
<img
class="dialog-image"
src="${escapeAttribute(image)}"
alt="${escapeAttribute(
`${item.brand || ""} ${item.expression || ""}`.trim()
)}"
>
`
: bottlePlaceholder(item.brand)
} </div>

```
    <div>
      <p class="eyebrow">
        ${escapeHtml(item.brand || "Unknown brand")}
      </p>

      <h3 id="dialog-title">
        ${escapeHtml(item.expression || "Unnamed expression")}
      </h3>

      <p class="dialog-subtitle">
        ${escapeHtml(
          firstNonBlank(
            item.release,
            item.distillery,
            item.category,
            "Bottle details"
          )
        )}
      </p>
    </div>
  </div>

  <div class="detail-grid">
    ${details
      .map(([label, value]) => `
        <div class="detail ${notesLabels.has(label) ? "detail-wide" : ""}">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `)
      .join("")}
  </div>
</div>
```

`;

const dialogImage =
elements.dialogContent.querySelector("img.dialog-image");

if (dialogImage) {
dialogImage.addEventListener(
"error",
() => {
dialogImage.replaceWith(
createPlaceholderElement(item.brand)
);
},
{ once: true }
);
}

document.body.classList.add("dialog-open");
elements.dialog.showModal();
}

function closeDialog() {
if (elements.dialog && elements.dialog.open) {
elements.dialog.close();
}

document.body.classList.remove("dialog-open");
}

function switchView(viewName, updateHash = true) {
const targetView = document.querySelector(`#${viewName}-view`);

if (!targetView) {
return;
}

document.querySelectorAll(".view").forEach(view => {
view.classList.toggle("active", view === targetView);
});

document.querySelectorAll(".nav-button").forEach(button => {
button.classList.toggle(
"active",
button.dataset.view === viewName
);
});

if (updateHash) {
history.replaceState(null, "", `#${viewName}`);
}

closeMobileMenu();

window.scrollTo({
top: 0,
behavior: "smooth"
});
}

function closeMobileMenu() {
if (elements.primaryNavigation) {
elements.primaryNavigation.classList.remove("open");
}

if (elements.mobileMenuButton) {
elements.mobileMenuButton.setAttribute(
"aria-expanded",
"false"
);
}
}

function toggleMobileMenu() {
if (
!elements.primaryNavigation ||
!elements.mobileMenuButton
) {
return;
}

const open =
elements.primaryNavigation.classList.toggle("open");

elements.mobileMenuButton.setAttribute(
"aria-expanded",
String(open)
);
}

function clearFilters(filterGroup, renderFunction) {
Object.values(filterGroup).forEach(control => {
if (control) {
control.value = "";
}
});

renderFunction();
}

function calculateAverage(values) {
if (!values.length) {
return 0;
}

return values.reduce((total, value) => total + value, 0) /
values.length;
}

function showToast(message, type = "") {
if (!elements.toastContainer || !message) {
return;
}

const toast = document.createElement("div");
toast.className = `toast ${type}`.trim();
toast.textContent = message;

elements.toastContainer.append(toast);

window.setTimeout(() => {
toast.remove();
}, 5000);
}

function bindEvents() {
document.querySelectorAll(".nav-button").forEach(button => {
button.addEventListener("click", () => {
switchView(button.dataset.view);
});
});

document
.querySelectorAll("[data-jump-view]")
.forEach(button => {
button.addEventListener("click", () => {
switchView(button.dataset.jumpView);
});
});

Object.values(collectionFilters).forEach(control => {
if (control) {
control.addEventListener("input", renderCollection);
control.addEventListener("change", renderCollection);
}
});

Object.values(wishlistFilters).forEach(control => {
if (control) {
control.addEventListener("input", renderWishlist);
control.addEventListener("change", renderWishlist);
}
});

Object.values(catalogFilters).forEach(control => {
if (control) {
control.addEventListener("input", renderCatalog);
control.addEventListener("change", renderCatalog);
}
});

const clearCollection =
document.querySelector("#clear-collection-filters");

const clearWishlist =
document.querySelector("#clear-wishlist-filters");

const clearCatalog =
document.querySelector("#clear-catalog-filters");

if (clearCollection) {
clearCollection.addEventListener("click", () => {
clearFilters(collectionFilters, renderCollection);
});
}

if (clearWishlist) {
clearWishlist.addEventListener("click", () => {
clearFilters(wishlistFilters, renderWishlist);
});
}

if (clearCatalog) {
clearCatalog.addEventListener("click", () => {
clearFilters(catalogFilters, renderCatalog);
});
}

if (elements.mobileMenuButton) {
elements.mobileMenuButton.addEventListener(
"click",
toggleMobileMenu
);
}

const closeButton = document.querySelector(".dialog-close");

if (closeButton) {
closeButton.addEventListener("click", closeDialog);
}

if (elements.dialog) {
elements.dialog.addEventListener("click", event => {
if (event.target === elements.dialog) {
closeDialog();
}
});

```
elements.dialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
});
```

}

document.addEventListener("keydown", event => {
if (event.key === "Escape") {
closeMobileMenu();
}
});

window.addEventListener("hashchange", () => {
const requestedView = location.hash.replace("#", "");

```
if (
  ["dashboard", "collection", "wishlist", "catalog"]
    .includes(requestedView)
) {
  switchView(requestedView, false);
}
```

});
}

function initializeView() {
const requestedView = location.hash.replace("#", "");

if (
["dashboard", "collection", "wishlist", "catalog"]
.includes(requestedView)
) {
switchView(requestedView, false);
} else {
switchView("dashboard", false);
}
}

bindEvents();
initializeView();
loadLiveData();
