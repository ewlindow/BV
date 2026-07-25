/**
 * Bourbon Vault live API for Google Sheets.
 *
 * Install this script from Extensions > Apps Script inside the Google Sheet.
 * Deploy it as a Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * The spreadsheet can remain private. The web app exposes only the fields
 * explicitly selected below.
 */

const INVENTORY_SHEET = 'Inventory';
const WISHLIST_SHEET = 'Wishlist';

function doGet(e) {
  try {
    const payload = {
      generatedAt: new Date().toISOString(),
      inventory: getInventory_(),
      wishlist: getWishlist_()
    };

    const callback = sanitizeCallback_(e && e.parameter && e.parameter.callback);
    const json = JSON.stringify(payload);

    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${json});`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    const payload = {
      error: true,
      message: String(error && error.message ? error.message : error)
    };
    const callback = sanitizeCallback_(e && e.parameter && e.parameter.callback);
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
}

function getInventory_() {
  const rows = getRows_(INVENTORY_SHEET);

  return rows
    .filter(row => text_(row['Bottle ID']) && text_(row['Brand']))
    .map(row => ({
      id: text_(row['Bottle ID']),
      distillery: text_(row['Distillery']),
      brand: text_(row['Brand']),
      expression: text_(row['Expression']),
      release: text_(row['Batch / Release']),
      proof: number_(row['Proof']),
      age: number_(row['Age (Years)']),
      mashBill: text_(row['Mash Bill']),
      size: text_(row['Bottle Size']),
      status: text_(row['Status']),
      fill: number_(row['Fill Level']),
      shelf: text_(row['Shelf Location']),
      msrp: number_(row['MSRP']),
      notes: text_(row['Notes'])
    }));
}

function getWishlist_() {
  const rows = getRows_(WISHLIST_SHEET);

  return rows
    .filter(row =>
      text_(row['Wish ID']) &&
      text_(row['Brand']) &&
      text_(row['Share with Wife?']).toLowerCase() === 'yes' &&
      text_(row['Status']).toLowerCase() !== 'purchased'
    )
    .map(row => ({
      id: text_(row['Wish ID']),
      distillery: text_(row['Distillery']),
      brand: text_(row['Brand']),
      expression: text_(row['Expression']),
      priority: text_(row['Priority']),
      msrp: number_(row['MSRP']),
      maxPrice: number_(row['Maximum Price']),
      status: text_(row['Status']),
      duplicateCheck: text_(row['Duplicate Check']),
      notes: text_(row['Notes'])
    }));
}

function getRows_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Missing required sheet: ${sheetName}`);
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0].map(value => String(value).trim());

  return values.slice(1).map(row => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = row[index];
    });
    return object;
  });
}

function text_(value) {
  return value == null ? '' : String(value).trim();
}

function number_(value) {
  if (value == null || value === '') return null;

  const cleaned = String(value)
    .replace(/[$,%\s,]/g, '')
    .trim();

  if (!cleaned) return null;

  let result = Number(cleaned);

  // Fill Level may arrive as "75" or "75%". Normalize likely percentages.
  if (result > 1 && result <= 100 && String(value).includes('%')) {
    result = result / 100;
  }

  return Number.isFinite(result) ? result : null;
}

function sanitizeCallback_(value) {
  const callback = text_(value);
  return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback) ? callback : '';
}
