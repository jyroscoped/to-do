# Decisions

- The board defaults to a dense responsive list because it is the fastest phone workflow; a Kanban view can consume the same task API.
- The initial implementation returns heuristic estimates synchronously so creation is usable without an Anthropic key. The estimate endpoint is the replacement seam for asynchronous AI jobs and SSE broadcasts.
- PostgreSQL full-text search is deferred to a migration with a generated `tsvector` column; case-insensitive title/description search is used until that migration lands.
- Seed accounts are development-only fixtures. Production access is intended to be provided by Auth.js with the allowlist enforced before session creation and refresh.
