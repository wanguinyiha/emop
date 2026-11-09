# EMOP Development Log

## 2026-11-09: Server skeleton and database connection
- AI wrote: Express server skeleton, db.ts connection pool, /health and /health/db routes (Claude chat)
- I wrote or changed myself: .env with my own database password, created the PostgreSQL user and database emop_db
- I tested it by: curl on /health and /health/db, both returned status ok
- Error found: browser showed "Cannot GET /" when opening localhost:3000
- How I found the cause: read the message; no route was defined for "/"
- Fix: not a bug. Optionally added a GET "/" route that returns a status message
- What I learned: Express only answers routes you define, and a missing route gives "Cannot GET"
