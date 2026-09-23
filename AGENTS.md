# OfficeOps development guide

## Project purpose

OfficeOps is a phone-first shared office task board with task planning and time tracking. The live product is a static web app at `https://jyroscoped.github.io/to-do/`.

## Source of truth and deployment

- The deployment source is `main`, repository root, through GitHub Pages.
- The deployed entry point is `index.html`. Changes intended for users must work when served as plain static files.
- GitHub Pages does **not** run Next.js Route Handlers, server actions, Docker, PostgreSQL, or a writable filesystem. Do not add client calls to `/api/*` for deployed functionality.
- Existing `app/`, `lib/`, and `prisma/` code is a legacy/local Next.js foundation. It may be evolved separately for a future non-static host, but it is not the Pages runtime.

## Persistence model

`index.html` uses two layers:

1. `localStorage` key `officeops-state-v2` is an offline cache for tasks, time entries, an active timer, connector settings, and a `pendingSync` flag for local edits the remote store has not confirmed.
2. An optional Google Apps Script Web App is the durable, shared store. Once configured under **Google Sheets**, the app loads remote state on page open, on tab focus, and every 20 seconds while visible, and pushes state 300 ms after changes.

The Apps Script stores the board as base64 JSON chunks in a hidden `OfficeOps State` tab and appends completed sessions to a visible `Time Log` tab. Do not move board state back into Script Properties; they cap each value at 9 KB. Setup steps and the production-ready script are in `instructions.md`. The client-to-script protocol and sync rules are in `GOOGLE_SHEETS.md`.

### Sync invariants

These rules prevent one device from wiping the shared board. Keep them when changing sync code in `index.html`:

- Never push until a remote load has succeeded (`remoteReady`). An offline device or one with a bad key must not overwrite remote state.
- A newly connected device adopts the remote board. It uploads its local board only when the remote store is empty.
- Unconfirmed local edits (`pendingSync`) win over remote state on the next successful load; otherwise remote state replaces local state.
- A no-CORS POST is opaque, so every save is confirmed by reading state back and matching the `rev` id, or the board content for scripts deployed before `rev` existed. Show **Synced** only after that confirmation.
- Pushes are serialized (`pushing`/`pushAgain`). Rendering calls `save()`, so unchanged state must not trigger a push.

The static client writes state with a no-CORS POST and reads it with JSONP. Keep this design unless a proper API host with CORS and authentication replaces it. The sync key must never be committed or hard-coded into `index.html`.

## Main user flows

- Create, search, filter, start, complete, reopen, and delete tasks.
- The visible **Start tracking** control opens a timer against a selected task or general office work.
- Stopping the timer creates an entry with date, task, start, end, decimal hours, and duration.
- **Download CSV** exports the time log.
- **Google Sheets** stores an Apps Script `/exec` URL and shared sync key, then enables cross-device state and time-log sync. The status line under **Time log** (`#syncStatus`) reports browser-only, loading, saving, synced, offline, rejected-key, or unconfirmed-save states.

## Development workflow

The repository may include a project-local Node runtime in `.tools/`. When the host does not have Node installed globally:

```sh
export PATH="$PWD/.tools/bin:$PATH"
npm ci
npm run test
npm run test:e2e
npm run build
```

`npm run test:e2e` serves the repository root using Python and tests the static page at 375 px. It must continue to exercise the actual `index.html`, not the legacy Next.js board.

`e2e/board.spec.ts` mocks the Apps Script at `https://sync.example.test/exec` with `page.route`, including a legacy mode without `rev`. Multi-device tests use separate browser contexts that share one mock store. Add a test there for any sync behavior change. The mock is not the real script: changes to the script in `instructions.md` must be checked in a real Apps Script project.

## Apps Script changes

- The script in `instructions.md` is what users paste into Apps Script; the repository does not deploy it. Users must deploy a **New version** under **Deploy → Manage deployments** before changes reach the `/exec` URL.
- Keep the client compatible with already-deployed scripts where practical, and document any required script update in `instructions.md`.
- `doGet` and `doPost` only run as web-app handlers. Users test the setup with `testSetup`, which must not write board state; an empty stored board would be adopted by the first connecting device instead of uploading its tasks.

## Required checks

Before committing product changes:

```sh
npm run test
npm run test:e2e
git diff --check
```

Run `npm run build` when changing TypeScript, Next.js, Prisma, package dependencies, or deployment configuration.

## Implementation guardrails

- Preserve static Pages compatibility. Do not rely on secrets, environment variables, or Node APIs in `index.html`.
- Treat the Apps Script URL and sync key as credentials. Do not log them or expose them in repository files.
- Keep the mobile viewport first-class: the target width is 375 px, and interactive controls must remain usable by touch.
- Sanitize user content before assigning it to `innerHTML`; the existing `esc()` helper is used for task and time-log text.
- Update `GOOGLE_SHEETS.md` and the script in `instructions.md` whenever the client-to-script payload changes.
- Do not claim server persistence is active until the user has configured their own Apps Script Web App and sync key.
- Use `git pull --ff-only origin main` before work if the remote may have received merges or Copilot changes. Inspect the merged code rather than assuming local files are current.

## Known limitations

- Without the Apps Script connector, data persists only in the current browser profile.
- The shared Apps Script model is bearer-key based. It is suitable for a small internal team; a larger or higher-security deployment should replace it with authenticated backend storage.
- The static page has no per-user identity, roles, real-time collaboration, or conflict resolution. Remote saves are last-write-wins, and other devices see changes within about 20 seconds (polling), not instantly.
- Deployments of the earlier Apps Script still store state in a 9 KB Script Property. The client works with them, but saves fail once the board grows until the user installs the current script.
