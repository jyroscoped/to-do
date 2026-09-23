# Google Sheets and durable board storage

GitHub Pages does not run API routes or keep files on a server. OfficeOps uses a Google Apps Script Web App as its durable storage service: it saves the board and timer state in Script Properties, and appends each completed timer session to a Google Sheet.

## Set up the connector

1. Create a new Google Sheet and copy its ID from the URL.
2. Open **Extensions → Apps Script** and replace the starter code with the script below.
3. Set `SHEET_ID` and choose a long random `SYNC_KEY`. Keep the same sync key for every OfficeOps browser that should share this board.
4. Select **Deploy → New deployment → Web app**. Set **Execute as** to your account, choose an access level that allows your OfficeOps users to reach it, and deploy. Copy the Web App URL ending in `/exec`.
5. In OfficeOps, select **Google Sheets**, paste the `/exec` URL and the sync key, then save. Tasks and time logs are now loaded from the remote service whenever the site opens.

```javascript
const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const SHEET_NAME = 'Time Log';
const SYNC_KEY = 'replace-with-a-long-random-secret';
const STATE_KEY = 'officeops-state-v1';

function doGet(event) {
  const callback = event.parameter.callback;
  const response = event.parameter.action === 'loadState' && valid(event.parameter.token)
    ? { ok: true, state: JSON.parse(PropertiesService.getScriptProperties().getProperty(STATE_KEY) || 'null') }
    : { ok: false, error: 'Unauthorized or unsupported request' };

  // The static site uses JSONP because Apps Script content responses redirect
  // and cannot provide a custom CORS header.
  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput(`${callback}(${JSON.stringify(response)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || '{}');
    if (!valid(body.token)) throw new Error('Unauthorized');

    if (body.action === 'saveState') {
      const state = body.state || {};
      PropertiesService.getScriptProperties().setProperty(STATE_KEY, JSON.stringify({
        tasks: Array.isArray(state.tasks) ? state.tasks : [],
        timeEntries: Array.isArray(state.timeEntries) ? state.timeEntries : [],
        activeTimer: state.activeTimer || null,
      }));
    } else if (body.action === 'logTime') {
      const entry = body.entry || {};
      const sheet = getLogSheet();
      sheet.appendRow([entry.date, entry.task, entry.startedAt, entry.endedAt, entry.hours, entry.duration]);
    } else {
      throw new Error('Unsupported action');
    }
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) });
  }
}

function getLogSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['Date', 'Task', 'Start', 'End', 'Hours', 'Duration']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function valid(token) {
  return typeof token === 'string' && token === SYNC_KEY;
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
```

The sync key prevents casual writes to the shared board. Do not commit it to this repository or share it outside the people who should have access to the board.
