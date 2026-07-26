# Bourbon Vault V2

A GitHub Pages frontend for the Bourbon Vault Google Sheets / Apps Script backend.

## Installation

1. Extract this ZIP.
2. Open `config.js`.
3. Replace `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with your deployed Apps Script URL ending in `/exec`.
4. Upload all files to the root of your GitHub Pages repository.
5. Commit the changes and wait for GitHub Pages to publish.
6. Open the site with `?v=23` appended once, then use Ctrl+Shift+R to bypass older cached files.

## Included files

- `index.html`: Version 2 dashboard, collection, wishlist, catalog, dialog, and mobile navigation.
- `styles.css`: charcoal and bourbon-gold responsive theme.
- `app.js`: complete frontend logic. It tries standard JSON first and JSONP second, then uses fallback data if enabled.
- `config.js`: API endpoint configuration.
- `fallback-data.js`: bundled sample/snapshot used when the live API cannot load.
- `.nojekyll`: tells GitHub Pages to serve the site as plain static files.

## Expected API sections

The frontend supports these top-level arrays when supplied by Apps Script:

- `inventory`
- `wishlist`
- `catalog`
- `purchases`
- `tastings`
- `hunts`

It also accepts an optional `dashboard`, `apiVersion`, and `generatedAt` field. The JavaScript recognizes both camelCase field names and many spreadsheet-style column names.

## Loading diagnostics

The header status will show one of these states:

- `Live from Google Sheets`
- `Live Sheet unavailable · showing bundled snapshot`
- `Unable to load Google Sheets data.`

When the live API fails, open browser developer tools and inspect the Console and Network tabs. Confirm that the Apps Script deployment is accessible to anyone with the link and that `config.js` contains the `/exec` deployment URL, not the Apps Script editor URL.
