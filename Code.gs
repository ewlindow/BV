/**
 * Bourbon Vault Version 2 API
 *
 * Install from:
 * Google Sheet > Extensions > Apps Script
 *
 * Deploy as a Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * The spreadsheet may remain private. This API exposes only the fields
 * explicitly selected below.
 */

const SHEETS = Object.freeze({
  CATALOG: 'Bottle Catalog',
  INVENTORY: 'Inventory V2',
  WISHLIST: 'Wishlist V2',
  PURCHASES: 'Purchases',
  TASTINGS: 'Tasting Log',
  HUNTS: 'Hunt Log'
});

/**
 * Main web-app endpoint.
 *
 * Supported examples:
 *   /exec
 *   /exec?section=inventory
 *   /exec?section=wishlist
 *   /exec?section=catalog
 *   /exec?callback=myFunction
 */
function doGet(e) {
  try {
    const request = e && e.parameter ? e.parameter : {};
    const section = text_(request.section).toLowerCase();

    const catalogRows = getRows_(SHEETS.CATALOG);
    const catalogMap = createCatalogMap_(catalogRows);

    const completePayload = {
      apiVersion: '2.0',
      generatedAt: new Date().toISOString(),
      dashboard: getDashboard_(catalogRows),
      catalog: getCatalog_(catalogRows),
      inventory: getInventory_(catalogMap),
      wishlist: getWishlist_(catalogMap),
      purchases: getPurchases_(),
      tastings: getTastings_(),
      hunts: getHunts_()
    };

    const payload = section
      ? getRequestedSection_(completePayload, section)
      : completePayload;

    return createResponse_(payload, request.callback);
  } catch (error) {
    return createResponse_(
      {
        error: true,
        generatedAt: new Date().toISOString(),
        message: getErrorMessage_(error)
      },
      e && e.parameter ? e.parameter.callback : ''
    );
  }
}

/**
 * Returns one requested section while preserving basic API metadata.
 */
function getRequestedSection_(payload, section) {
  const allowedSections = [
    'dashboard',
    'catalog',
    'inventory',
    'wishlist',
    'purchases',
    'tastings',
    'hunts'
  ];

  if (!allowedSections.includes(section)) {
    throw new Error(
      `Unknown API section "${section}". Allowed sections: ${allowedSections.join(', ')}`
    );
  }

  return {
    apiVersion: payload.apiVersion,
    generatedAt: payload.generatedAt,
    [section]: payload[section]
  };
}

/**
 * Creates a lookup table keyed by Catalog ID.
 */
function createCatalogMap_(rows) {
  const map = {};

  rows.forEach(row => {
    const catalogId = text_(row['Catalog ID']);

    if (catalogId) {
      map[catalogId] = normalizeCatalogRow_(row);
    }
  });

  return map;
}

/**
 * Returns normalized Bottle Catalog records.
 */
function getCatalog_(rows) {
  return rows
    .filter(row => {
      const catalogId = text_(row['Catalog ID']);
      const brand = text_(row['Brand']);
      const active = text_(row['Active?']).toLowerCase();

      return catalogId && brand && active !== 'no';
    })
    .map(normalizeCatalogRow_);
}

function normalizeCatalogRow_(row) {
  return {
    catalogId: text_(row['Catalog ID']),
    distillery: text_(row['Distillery']),
    brand: text_(row['Brand']),
    expression: text_(row['Expression']),
    release: text_(row['Batch / Release']),
    proof: number_(row['Proof']),
    age: number_(row['Age (Years)']),
    mashBill: text_(row['Mash Bill']),
    size: text_(row['Bottle Size']),
    msrp: money_(row['MSRP']),
    category: text_(row['Category']),
    releaseType: text_(row['Release Type']),
    image: normalizeImagePath_(row['Image File']),
    active: yesNoBoolean_(row['Active?'], true),
    source: text_(row['Source'])
  };
}

/**
 * Returns physical bottles from Inventory V2.
 *
 * Catalog data is merged into each inventory record.
 */
function getInventory_(catalogMap) {
  const rows = getRows_(SHEETS.INVENTORY);

  return rows
    .filter(row =>
      text_(row['Inventory ID']) &&
      text_(row['Catalog ID'])
    )
    .map(row => {
      const catalogId = text_(row['Catalog ID']);
      const catalog = catalogMap[catalogId] || {};

      return {
        // Keep "id" for compatibility with the Version 1 frontend.
        id: text_(row['Inventory ID']),
        inventoryId: text_(row['Inventory ID']),
        catalogId: catalogId,

        distillery: catalog.distillery || '',
        brand: catalog.brand || text_(row['Brand']),
        expression: catalog.expression || text_(row['Expression']),
        release: catalog.release || text_(row['Batch / Release']),
        proof: catalog.proof ?? null,
        age: catalog.age ?? null,
        mashBill: catalog.mashBill || '',
        size: catalog.size || '',
        msrp: catalog.msrp ?? null,
        category: catalog.category || '',
        releaseType: catalog.releaseType || '',
        image: firstNonBlank_(
          normalizeImagePath_(row['Photo Link']),
          catalog.image
        ),

        status: normalizeInventoryStatus_(row['Status']),
        fill: number_(row['Fill Level']),
        shelf: text_(row['Shelf Location']),
        favorite: yesNoBoolean_(row['Favorite?'], false),
        rating: number_(row['Personal Rating']),
        estimatedValue: money_(row['Estimated Value']),
        dateAdded: dateText_(row['Date Added']),
        finishedDate: dateText_(row['Finished Date']),
        rebuy: text_(row['Rebuy?']),
        archiveReason: text_(row['Archive Reason']),
        notes: text_(row['Notes'])
      };
    });
}

/**
 * Returns active Wishlist V2 records.
 *
 * Share with Wife? is intentionally gone. Every active wishlist record is
 * returned unless its status indicates that it should no longer appear.
 */
function getWishlist_(catalogMap) {
  const rows = getRows_(SHEETS.WISHLIST);

  const hiddenStatuses = [
    'acquired',
    'purchased',
    'no longer interested',
    'removed'
  ];

  return rows
    .filter(row => {
      const wishId = text_(row['Wish ID']);
      const catalogId = text_(row['Catalog ID']);
      const status = text_(row['Status']).toLowerCase();

      return (
        wishId &&
        catalogId &&
        !hiddenStatuses.includes(status)
      );
    })
    .map(row => {
      const catalogId = text_(row['Catalog ID']);
      const catalog = catalogMap[catalogId] || {};

      return {
        // Keep "id" and "maxPrice" for Version 1 frontend compatibility.
        id: text_(row['Wish ID']),
        wishId: text_(row['Wish ID']),
        catalogId: catalogId,

        distillery: catalog.distillery || '',
        brand: catalog.brand || text_(row['Brand']),
        expression: catalog.expression || text_(row['Expression']),
        release: catalog.release || '',
        proof: catalog.proof ?? null,
        age: catalog.age ?? null,
        mashBill: catalog.mashBill || '',
        size: catalog.size || '',
        category: catalog.category || '',
        releaseType: catalog.releaseType || '',

        msrp: money_(row['MSRP']) ?? catalog.msrp ?? null,
        buyUnder: money_(row['Buy Under']),
        absoluteMax: money_(row['Absolute Max']),
        maxPrice: money_(row['Absolute Max']),

        priority: text_(row['Priority']),
        status: text_(row['Status']),
        ownedQty: integer_(row['Owned Qty']),
        duplicateCheck: text_(row['Duplicate Check']),
        lastSeenDate: dateText_(row['Last Seen Date']),
        whereSeen: text_(row['Where Seen']),
        image: firstNonBlank_(
          normalizeImagePath_(row['Image File']),
          catalog.image
        ),
        notes: text_(row['Notes'])
      };
    });
}

/**
 * Returns purchase records.
 *
 * This sheet remains linked using Inventory ID / Bottle ID.
 */
function getPurchases_() {
  const rows = getOptionalRows_(SHEETS.PURCHASES);

  return rows
    .filter(row => text_(row['Purchase ID']))
    .map(row => ({
      purchaseId: text_(row['Purchase ID']),
      inventoryId: firstNonBlank_(
        text_(row['Inventory ID']),
        text_(row['Bottle ID'])
      ),
      purchaseDate: dateText_(row['Purchase Date']),
      seller: text_(row['Store / Seller']),
      city: text_(row['City']),
      state: text_(row['State']),
      purchaseType: text_(row['Purchase Type']),
      msrp: money_(row['MSRP']),
      pricePaid: money_(row['Price Paid']),
      taxFees: money_(row['Tax / Fees']),
      totalCost: money_(row['Total Cost']),
      receipt: text_(row['Receipt Link']),
      notes: text_(row['Notes'])
    }));
}

/**
 * Returns tasting log records when the sheet contains entries.
 */
function getTastings_() {
  const rows = getOptionalRows_(SHEETS.TASTINGS);

  return rows
    .filter(row =>
      text_(row['Tasting ID']) ||
      text_(row['Bottle ID']) ||
      text_(row['Inventory ID'])
    )
    .map(row => ({
      tastingId: text_(row['Tasting ID']),
      inventoryId: firstNonBlank_(
        text_(row['Inventory ID']),
        text_(row['Bottle ID'])
      ),
      tastingDate: dateText_(
        firstNonBlank_(row['Tasting Date'], row['Date'])
      ),
      serving: text_(row['Serving']),
      glass: text_(row['Glass']),
      rating: number_(
        firstNonBlank_(row['Rating'], row['Score'])
      ),
      nose: text_(row['Nose']),
      palate: text_(row['Palate']),
      finish: text_(row['Finish']),
      notes: text_(row['Notes'])
    }));
}

/**
 * Returns hunt-log entries when the sheet contains entries.
 */
function getHunts_() {
  const rows = getOptionalRows_(SHEETS.HUNTS);

  return rows
    .filter(row =>
      text_(row['Hunt ID']) ||
      text_(row['Store']) ||
      text_(row['Store / Seller'])
    )
    .map(row => ({
      huntId: text_(row['Hunt ID']),
      huntDate: dateText_(
        firstNonBlank_(row['Hunt Date'], row['Date'])
      ),
      store: firstNonBlank_(
        text_(row['Store']),
        text_(row['Store / Seller'])
      ),
      city: text_(row['City']),
      state: text_(row['State']),
      rating: text_(row['Store Rating']),
      catalogId: text_(row['Catalog ID']),
      brand: text_(row['Brand']),
      expression: text_(row['Expression']),
      priceSeen: money_(
        firstNonBlank_(row['Price Seen'], row['Price'])
      ),
      result: firstNonBlank_(
        text_(row['Result']),
        text_(row['Outcome'])
      ),
      notes: text_(row['Notes'])
    }));
}

/**
 * Generates summary metrics for the Version 2 dashboard.
 */
function getDashboard_(catalogRows) {
  const inventory = getRows_(SHEETS.INVENTORY);
  const wishlist = getRows_(SHEETS.WISHLIST);
  const purchases = getOptionalRows_(SHEETS.PURCHASES);
  const tastings = getOptionalRows_(SHEETS.TASTINGS);
  const hunts = getOptionalRows_(SHEETS.HUNTS);

  const inventoryRows = inventory.filter(row =>
    text_(row['Inventory ID']) && text_(row['Catalog ID'])
  );

  const wishlistRows = wishlist.filter(row =>
    text_(row['Wish ID']) && text_(row['Catalog ID'])
  );

  const statuses = {
    sealed: 0,
    open: 0,
    finished: 0,
    gifted: 0,
    traded: 0,
    archived: 0
  };

  inventoryRows.forEach(row => {
    const status = normalizeInventoryStatus_(row['Status']).toLowerCase();

    if (Object.prototype.hasOwnProperty.call(statuses, status)) {
      statuses[status] += 1;
    }
  });

  const proofValues = catalogRows
    .map(row => number_(row['Proof']))
    .filter(value => value != null);

  const purchaseTotals = purchases
    .map(row => money_(row['Total Cost']))
    .filter(value => value != null);

  const estimatedValues = inventoryRows
    .map(row => money_(row['Estimated Value']))
    .filter(value => value != null);

  const ratings = inventoryRows
    .map(row => number_(row['Personal Rating']))
    .filter(value => value != null && value > 0);

  return {
    totalBottles: inventoryRows.length,
    totalCatalogEntries: catalogRows.filter(row =>
      text_(row['Catalog ID']) && text_(row['Brand'])
    ).length,
    totalWishlistItems: wishlistRows.length,

    statuses: statuses,

    favorites: inventoryRows.filter(row =>
      yesNoBoolean_(row['Favorite?'], false)
    ).length,

    mustFindItems: wishlistRows.filter(row =>
      text_(row['Priority']).toLowerCase() === 'must find'
    ).length,

    alreadyOwnedWishlistItems: wishlistRows.filter(row =>
      text_(row['Duplicate Check']).toLowerCase() === 'already owned'
    ).length,

    totalPaid: roundMoney_(sum_(purchaseTotals)),
    estimatedCollectionValue: roundMoney_(sum_(estimatedValues)),
    averageProof: round_(average_(proofValues), 1),
    averageRating: round_(average_(ratings), 1),

    tastingSessions: tastings.filter(row =>
      text_(row['Tasting ID']) ||
      text_(row['Bottle ID']) ||
      text_(row['Inventory ID'])
    ).length,

    huntStops: hunts.filter(row =>
      text_(row['Hunt ID']) ||
      text_(row['Store']) ||
      text_(row['Store / Seller'])
    ).length
  };
}

/**
 * Reads a required sheet and converts every row into an object whose keys are
 * taken from the first row.
 */
function getRows_(sheetName) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Missing required sheet: ${sheetName}`);
  }

  return sheetToRows_(sheet);
}

/**
 * Reads an optional sheet. Missing optional sheets return an empty list
 * instead of breaking the complete API.
 */
function getOptionalRows_(sheetName) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(sheetName);

  return sheet ? sheetToRows_(sheet) : [];
}

function sheetToRows_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(value => text_(value));

  return values.slice(1).map(row => {
    const object = {};

    headers.forEach((header, index) => {
      if (header) {
        object[header] = row[index];
      }
    });

    return object;
  });
}

/**
 * Produces JSON or JSONP output.
 */
function createResponse_(payload, callbackValue) {
  const callback = sanitizeCallback_(callbackValue);
  const json = JSON.stringify(payload);

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function text_(value) {
  return value == null ? '' : String(value).trim();
}

function number_(value) {
  if (value == null || value === '') {
    return null;
  }

  const source = String(value).trim();
  const cleaned = source
    .replace(/[$,%\s,]/g, '')
    .trim();

  if (!cleaned) {
    return null;
  }

  let result = Number(cleaned);

  if (
    result > 1 &&
    result <= 100 &&
    source.includes('%')
  ) {
    result /= 100;
  }

  return Number.isFinite(result) ? result : null;
}

function integer_(value) {
  const result = number_(value);
  return result == null ? 0 : Math.trunc(result);
}

function money_(value) {
  const result = number_(value);
  return result == null ? null : roundMoney_(result);
}

function dateText_(value) {
  return text_(value);
}

function normalizeInventoryStatus_(value) {
  const status = text_(value).toLowerCase();

  const aliases = {
    unopened: 'Sealed',
    sealed: 'Sealed',
    opened: 'Open',
    open: 'Open',
    finished: 'Finished',
    gifted: 'Gifted',
    traded: 'Traded',
    archived: 'Archived'
  };

  return aliases[status] || text_(value);
}

function normalizeImagePath_(value) {
  const path = text_(value);

  if (!path) {
    return '';
  }

  // Preserve complete web URLs.
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Normalize Windows-style separators if one sneaks into the sheet.
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

function yesNoBoolean_(value, defaultValue) {
  const normalized = text_(value).toLowerCase();

  if (['yes', 'true', '1', 'y'].includes(normalized)) {
    return true;
  }

  if (['no', 'false', '0', 'n'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function firstNonBlank_(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && text_(value) !== '') {
      return value;
    }
  }

  return '';
}

function sum_(values) {
  return values.reduce((total, value) => total + value, 0);
}

function average_(values) {
  if (!values.length) {
    return 0;
  }

  return sum_(values) / values.length;
}

function round_(value, decimalPlaces) {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function roundMoney_(value) {
  return round_(value, 2);
}

function sanitizeCallback_(value) {
  const callback = text_(value);

  return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)
    ? callback
    : '';
}

function getErrorMessage_(error) {
  if (error && error.message) {
    return String(error.message);
  }

  return String(error);
}
