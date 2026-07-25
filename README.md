# Bourbon Vault Live V2

This release connects a GitHub Pages website to a Google Sheet through a Google Apps Script web app.

## What updates automatically

Once configured, changes made in Google Sheets flow to the website whenever the page is refreshed:

- Inventory additions and edits
- Opened/unopened status
- Fill level
- Shelf location
- MSRP
- Wishlist items marked **Share with Wife? = Yes**
- Duplicate Check and wishlist pricing

The Google Sheet itself can remain private. The Apps Script publishes only the fields selected in `Code.gs`.

---

# iPhone / iPad setup

Safari is more reliable than the GitHub app for the initial setup.

## 1. Put the workbook in Google Sheets

1. Save `Bourbon_Vault_V1_1.xlsm` in Google Drive.
2. Open it in the Google Sheets app.
3. Convert it to a native Google Sheet if Google prompts you.
4. Confirm these tab names remain exact:
   - `Inventory`
   - `Wishlist`

## 2. Add the Apps Script

The Apps Script editor is best opened in Safari.

1. Open the Google Sheet in Safari.
2. Request the desktop website if the **Extensions** menu is not visible.
3. Select **Extensions → Apps Script**.
4. Delete the starter function in the editor.
5. Open `Code.gs` from this package and copy its entire contents.
6. Paste it into the Apps Script editor.
7. Save the project as `Bourbon Vault API`.

## 3. Deploy the API

1. In Apps Script, select **Deploy → New deployment**.
2. Select **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Select **Deploy**.
5. Approve the Google permissions.
6. Copy the URL ending in `/exec`.

The spreadsheet remains private, but anyone with the endpoint can read the fields returned by the script.

## 4. Connect the GitHub Pages site

1. In the GitHub repository, open `config.js`.
2. Select the edit pencil.
3. Replace:

   `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

   with the `/exec` URL.
4. Commit the change.

Example:

```javascript
window.BOURBON_VAULT_CONFIG = {
  apiUrl: "https://script.google.com/macros/s/EXAMPLE/exec",
  useFallbackData: true
};
```

## 5. Publish GitHub Pages

1. Open the repository's **Settings** in Safari.
2. Open **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the main branch and `/(root)`.
5. Save.

The page will show **Live from Google Sheets** when the connection works.

---

# Updating the workbook

After setup, update only the Google Sheet. Refreshing the website retrieves current values.

The API uses the column headings rather than fixed column letters, so columns may be rearranged. Do not rename the headings that the site currently uses.

## When changing Code.gs later

Apps Script deployments do not automatically use revised code.

1. Select **Deploy → Manage deployments**.
2. Edit the existing deployment.
3. Create/select a new version.
4. Deploy it.

The `/exec` URL should remain the same.

---

# Files

- `index.html` — website structure
- `styles.css` — design
- `app.js` — live data loading and interface
- `config.js` — Apps Script endpoint
- `fallback-data.js` — current workbook snapshot if Google is unavailable
- `Code.gs` — Google Apps Script API
- `.nojekyll` — tells GitHub Pages to serve the files directly

## Public data warning

The website and API expose shelf locations, fill levels, MSRP values, and wishlist maximum prices. Remove those fields from `Code.gs` and the interface before deployment if they should not be public.
