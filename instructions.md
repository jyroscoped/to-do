# Set up Google Sheets storage for OfficeOps

OfficeOps runs on GitHub Pages, which cannot store data. By default, each browser keeps its own copy of the board. Clearing browser data erases that copy, and other computers cannot see it.

To keep one shared board that every computer can open, OfficeOps saves to a Google Sheet through a small Google Apps Script you own. After setup:

- Every change you make is saved to your Google Sheet. The status line under **Time log** says **Synced with Google Sheets** when a save is confirmed.
- Any computer or phone that enters the same URL and sync key loads the same board.
- The data stays in your Google Drive until you delete the spreadsheet.

Setup takes about 10 minutes and needs only a Google account.

---

## 1. Create the spreadsheet

1. Go to <https://sheets.new> to create a new Google Sheet. Name it something like **OfficeOps Data**.
2. Copy the spreadsheet ID from the address bar. It is the long string between `/d/` and `/edit`:

   ```
   https://docs.google.com/spreadsheets/d/1AbC...xyz/edit#gid=0
                                          └──────┬──────┘
                                           spreadsheet ID
   ```

## 2. Choose a sync key

The sync key is a shared password. Only browsers that know it can read or change the board. Generate a long random value, for example by running this in a terminal:

```sh
openssl rand -hex 24
```

Or use a password manager to generate a password of 30 or more characters. Store it in your password manager. **Do not commit it to this repository.**

## 3. Add the Apps Script

1. In the spreadsheet, open **Extensions → Apps Script**.
2. Delete the starter code in `Code.gs` and paste the entire script below.
3. Replace `PASTE_YOUR_SHEET_ID_HERE` with your spreadsheet ID from step 1.
4. Replace `replace-with-a-long-random-secret` with your sync key from step 2.
5. Click **Save** (the disk icon).

```javascript
// OfficeOps durable storage. See instructions.md in the OfficeOps repository.
const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const SYNC_KEY = 'replace-with-a-long-random-secret';

const LOG_SHEET = 'Time Log';
const STATE_SHEET = 'OfficeOps State';
const LEGACY_STATE_KEY = 'officeops-state-v1';
// Sheets cells hold up to 50,000 characters, so the board is split across rows.
const CHUNK_SIZE = 40000;

function doGet(event) {
  const params = event.parameter || {};
  let response;
  if (!valid(params.token)) {
    response = { ok: false, error: 'Unauthorized' };
  } else if (params.action === 'loadState') {
    response = withLock(() => ({ ok: true, state: readState() }));
  } else {
    response = { ok: false, error: 'Unsupported request' };
  }

  // The static site reads with JSONP because Apps Script responses cannot set CORS headers.
  const callback = params.callback;
  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput(`${callback}(${JSON.stringify(response)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json(response);
}

function doPost(event) {
  try {
    const body = JSON.parse((event.postData && event.postData.contents) || '{}');
    if (!valid(body.token)) throw new Error('Unauthorized');

    if (body.action === 'saveState') {
      const state = body.state || {};
      withLock(() => writeState({
        tasks: Array.isArray(state.tasks) ? state.tasks : [],
        timeEntries: Array.isArray(state.timeEntries) ? state.timeEntries : [],
        activeTimer: state.activeTimer || null,
        rev: typeof state.rev === 'string' ? state.rev : '',
        savedAt: new Date().toISOString(),
      }));
    } else if (body.action === 'logTime') {
      const entry = body.entry || {};
      withLock(() => getLogSheet().appendRow([
        entry.date, entry.task, entry.startedAt, entry.endedAt, entry.hours, entry.duration,
      ]));
    } else {
      throw new Error('Unsupported action');
    }
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) });
  }
}

function readState() {
  const sheet = spreadsheet().getSheetByName(STATE_SHEET);
  const rows = sheet ? sheet.getLastRow() : 0;
  if (!rows) {
    // Boards saved by the earlier version of this script live in Script Properties.
    const legacy = PropertiesService.getScriptProperties().getProperty(LEGACY_STATE_KEY);
    return legacy ? JSON.parse(legacy) : null;
  }
  // Each cell holds a "c"-prefixed base64 chunk, so Sheets never converts it to a number, date or formula.
  const encoded = sheet.getRange(1, 1, rows, 1).getValues().map((row) => String(row[0]).slice(1)).join('');
  const text = Utilities.newBlob(Utilities.base64Decode(encoded, Utilities.Charset.UTF_8)).getDataAsString('UTF-8');
  return JSON.parse(text);
}

function writeState(state) {
  let sheet = spreadsheet().getSheetByName(STATE_SHEET);
  if (!sheet) {
    sheet = spreadsheet().insertSheet(STATE_SHEET);
    sheet.hideSheet();
  }
  const encoded = Utilities.base64Encode(JSON.stringify(state), Utilities.Charset.UTF_8);
  const rows = [];
  for (let i = 0; i < encoded.length; i += CHUNK_SIZE) rows.push(['c' + encoded.slice(i, i + CHUNK_SIZE)]);
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 1).setNumberFormat('@').setValues(rows);
  SpreadsheetApp.flush();
}

function getLogSheet() {
  let sheet = spreadsheet().getSheetByName(LOG_SHEET);
  if (!sheet) {
    sheet = spreadsheet().insertSheet(LOG_SHEET);
    sheet.appendRow(['Date', 'Task', 'Start', 'End', 'Hours', 'Duration']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function spreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function withLock(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

function valid(token) {
  return typeof token === 'string' && SYNC_KEY.length >= 16 && token === SYNC_KEY;
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor to grant permissions and confirm the Sheet ID is correct.
function testSetup() {
  if (!spreadsheet().getSheetByName(STATE_SHEET)) spreadsheet().insertSheet(STATE_SHEET).hideSheet();
  readState();
  getLogSheet();
  Logger.log('OfficeOps storage is ready.');
}
```

## 4. Authorize the script

1. In the toolbar function menu, select **testSetup**, then click **Run**.
2. Google asks for permission. Click **Review permissions** and choose your account.
3. If you see **Google hasn't verified this app**, click **Advanced**, then **Go to (project name) (unsafe)**. The warning appears because you wrote this script yourself.
4. Click **Allow**. The execution log should say `OfficeOps storage is ready.`

The spreadsheet now has a **Time Log** tab. The board itself is stored in a hidden **OfficeOps State** tab. Do not edit that tab by hand.

## 5. Deploy it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to **Select type** and choose **Web app**.
3. Set these options:
   - **Description:** `OfficeOps`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
4. Click **Deploy**, then copy the **Web app URL**. It ends in `/exec`.

**Who has access** must be **Anyone** because the page calls the script from the browser without a Google login. The sync key keeps other people out: any request without the correct key is rejected.

## 6. Connect OfficeOps

1. Open <https://jyroscoped.github.io/to-do/>.
2. Under **Time log**, click **Google Sheets**.
3. Paste the `/exec` URL and your sync key, then click **Save connection**.
4. Wait for the status line under **Time log** to say **Synced with Google Sheets**.

On the first computer you connect, the board in that browser is uploaded to the empty spreadsheet.

## 7. Connect every other computer and phone

Repeat step 6 on each device with the **same URL and sync key**. Once connected, a device loads the shared board from Google Sheets and **replaces** whatever was in its own browser.

Each device remembers its connection. The board reloads from Google Sheets when you open the page or switch back to its tab.

---

## Checking that it works

- Add a task on computer A and wait for **Synced with Google Sheets**. Reload the page on computer B; the task appears.
- Stop the timer. A new row appears on the **Time Log** tab of your spreadsheet.

## Status messages

| Status | Meaning |
| --- | --- |
| Saved in this browser only | No Google Sheets connection on this device. |
| Synced with Google Sheets | The last change was saved and read back from the spreadsheet. |
| Cannot reach Google Sheets | The device is offline or the URL is wrong. Changes stay in this browser and upload after the next successful connection. |
| Google Sheets rejected the sync key | The key in OfficeOps does not match `SYNC_KEY` in the script. |
| Google Sheets did not confirm the last save | The script ran but did not store the change. See Troubleshooting. |

## Updating the script later

Saving code in the editor does **not** change the live web app. After any edit:

1. Click **Deploy → Manage deployments**.
2. Click the pencil icon on your deployment.
3. Under **Version**, choose **New version**, then click **Deploy**.

The `/exec` URL stays the same, so connected devices need no changes.

If you set up an earlier version of this script, which stored the board in Script Properties, replace it with the script above and deploy a new version. The first load reads the old board, and the next save moves it into the **OfficeOps State** tab.

## Troubleshooting

- **"Cannot reach Google Sheets" on every device.** Check that the URL ends in `/exec`, not `/dev`, and that **Who has access** is **Anyone**. Opening the URL in a browser should show `{"ok":false,"error":"Unauthorized"}`.
- **"Rejected the sync key."** Keys are case-sensitive and must be at least 16 characters. Re-enter the key under **Google Sheets**.
- **Changes don't appear on the other device.** Reload the page or switch back to the tab. OfficeOps does not push live updates.
- **Two people edited at the same time.** The last save wins, so avoid editing the same board on two devices at once.
- **Backups.** Use **File → Version history** in Google Sheets to restore an earlier state of the spreadsheet.

## Security notes

- Anyone with both the `/exec` URL and the sync key can read and change the board. Share them only with your team.
- To revoke access, change `SYNC_KEY` in the script, deploy a new version, and enter the new key on each device you want to keep.
- The script runs as your Google account. Google's permission screen covers all your spreadsheets, but the script opens only the one whose ID you set.
