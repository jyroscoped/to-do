# OfficeOps

Phone-first shared task board for physical office operations. It supports task triage, estimation, state transitions, completion history, and time-boxed planning.

## Run locally

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
