# Google Sheets and durable board storage

GitHub Pages does not run API routes or keep files on a server. OfficeOps uses a Google Apps Script Web App as its durable, shared store.

**Setup steps and the production script live in [instructions.md](./instructions.md).** This file documents the client-to-script protocol for developers.

## Storage

- The board (`tasks`, `timeEntries`, `activeTimer`) is saved as JSON in a hidden `OfficeOps State` tab. The JSON is base64 encoded and split into 40,000-character chunks, one per row in column A. Each chunk has a `c` prefix so Sheets never reinterprets it.
- Every completed timer session is also appended to the visible `Time Log` tab.
- Older deployments stored the board in the `officeops-state-v1` Script Property, which is capped at 9 KB. The current script reads that value when the state tab is empty and migrates it on the next save.
- Reads and writes are serialized with `LockService`.

## Requests

All requests carry the shared sync key as `token`. The script rejects every request when the key is wrong or shorter than 16 characters.

| Direction | Transport | Payload | Response |
| --- | --- | --- | --- |
| Load board | JSONP `GET ?action=loadState&token=…&callback=…` | — | `{ ok, state: { tasks, timeEntries, activeTimer, rev, savedAt } \| null }` |
| Save board | `POST` (no-cors, `text/plain`) | `{ action: 'saveState', token, state: { tasks, timeEntries, activeTimer, rev } }` | Opaque to the client |
| Log session | `POST` (no-cors, `text/plain`) | `{ action: 'logTime', token, entry: { date, task, startedAt, endedAt, hours, duration } }` | Opaque to the client |

## Client sync rules (`index.html`)

- `localStorage` (`officeops-state-v2`) is always written first and acts as the offline cache. It also stores `pendingSync`, which marks local edits the remote store has not confirmed.
- Because no-cors POST responses are opaque, each save sends a random `rev`. The client then reloads remote state and shows **Synced** only when the stored `rev` matches.
- The client does not push until a remote load has succeeded. This keeps a device that is offline, or has a bad key, from overwriting the shared board.
- When a device connects, or reloads with no pending edits, remote state replaces local state. If the remote store is empty, local state is uploaded. Unconfirmed local edits (`pendingSync`) take priority on the next successful load.
- Remote state is reloaded when the page opens, when the tab becomes visible, and every 20 seconds while it is visible. A save counts as confirmed when the stored `rev` or the stored board content matches, so scripts deployed before `rev` existed still verify. Saves are last-write-wins.
