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

1. `localStorage` key `officeops-state-v2` is an offline cache for tasks, time entries, an active timer, and connector settings.
2. An optional Google Apps Script Web App is the durable, shared store. Once configured under **Google Sheets**, the app loads remote state on page open and pushes state after changes.

The Apps Script connector also appends completed sessions to a Sheet. Setup steps and the production-ready script are in `instructions.md`. The client-to-script protocol and sync rules are in `GOOGLE_SHEETS.md`.

The static client writes state with a no-CORS POST and reads it with JSONP. Keep this design unless a proper API host with CORS and authentication replaces it. The sync key must never be committed or hard-coded into `index.html`.

## Main user flows

- Create, search, filter, start, complete, reopen, and delete tasks.
- The visible **Start tracking** control opens a timer against a selected task or general office work.
- Stopping the timer creates an entry with date, task, start, end, decimal hours, and duration.
- **Download CSV** exports the time log.
- **Google Sheets** stores an Apps Script `/exec` URL and shared sync key, then enables cross-session state and time-log sync.

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
- The static page has no per-user identity, roles, real-time collaboration, or conflict resolution. Remote saves are last-write-wins.
