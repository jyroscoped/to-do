# Google Sheets time-log connection

The deployed static site never stores a Google password or API key. It sends a completed session to a Google Apps Script Web App URL that you control.

1. Create a Google Sheet and add this header row: `Date`, `Task`, `Start`, `End`, `Hours`, `Duration`.
2. In the sheet, open **Extensions → Apps Script**. Paste the code below, replacing `YOUR_SHEET_ID` with the identifier in the sheet URL.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as** to your account and select the access level appropriate for the people using the OfficeOps site. Copy the `/exec` Web App URL.
4. On OfficeOps, select **Google Sheets**, paste the URL, and save. Every future stopped timer will send a row to the sheet. Existing browser-local entries can be downloaded using **Download CSV**.

```javascript
function doPost(event) {
  const data = JSON.parse(event.postData.contents);
  const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getSheets()[0];
  sheet.appendRow([
    data.date,
    data.task,
    data.startedAt,
    data.endedAt,
    data.hours,
    data.duration,
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Use a separate sheet for OfficeOps. The Web App URL accepts time-log entries from anyone who has it, so do not share it outside the people allowed to add rows to that sheet.
