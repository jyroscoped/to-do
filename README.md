# OfficeOps

OfficeOps is now a phone-first task board. Run it with the Next.js server so `index.html` can persist board progress through `/api/progress`, which writes to a JSON file on the server.

The always-visible **Start tracking** button records work sessions as date, task, start, end, and decimal hours. Use **Download CSV** for an export, or follow [Google Sheets time-log connection](./GOOGLE_SHEETS.md) to link a sheet through your own Apps Script URL.

## Run locally

This workspace includes a local Node runtime in `.tools`. If Node is not installed globally, run `export PATH="$PWD/.tools/bin:$PATH"` once from the project directory before using the commands below.

1. `cp .env.example .env`
2. `docker compose up -d db`
3. `npm install`
4. `npm run db:migrate && npm run db:seed`
5. `npm run dev`

Open http://localhost:3000. The seed uses `admin@officeops.test` as the administrator. Set `ALLOWED_EMAIL_DOMAINS` and Auth.js credentials before deploying.

## Commands

`npm run test` runs the core domain tests. `npm run test:e2e` runs Playwright tests. `npm run build` produces the production build.

## Architecture

Next.js App Router supplies the responsive board and route handlers. Prisma models the PostgreSQL data store. Validation lives in `lib/schemas.ts`, while estimation, urgency, planning, and state transitions are isolated in small testable modules.
