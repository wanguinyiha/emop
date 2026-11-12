# EMOP Development Log

## 2026-11-09: Server skeleton and database connection
- AI wrote: Express server skeleton, db.ts connection pool, /health and /health/db routes (Claude chat)
- I wrote or changed myself: .env with my own database password, created the PostgreSQL user and database emop_db
- I tested it by: curl on /health and /health/db, both returned status ok
- Error found: browser showed "Cannot GET /" when opening localhost:3000
- How I found the cause: read the message; no route was defined for "/"
- Fix: not a bug. Optionally added a GET "/" route that returns a status message
- What I learned: Express only answers routes you define, and a missing route gives "Cannot GET"




## 2026-11-12: Database design on paper (Phase 1)
- AI wrote: the final text of docs/design.md, the Mermaid diagram and the grouping rule wording (Claude chat), after I did my own first drafts
- I wrote or changed myself: first drafts of the users, location, reports and incidents tables
- I tested it by: reading the design against the project document (can every feature be stored? can the questions in the document be answered?)
- Error found: my first reports/incidents design put the foreign key on the incident side, so one incident could link to only one report
- How I found the cause: I noticed 30 reports from one area could not all share one incident, then reasoned that a column holds one value per row
- Fix: moved the foreign key to the reports table (incident_id), because the "many" side holds the key
- Other corrections: removed "towns it has" lists from the location tables, stored location as neighbourhood_id instead of text, store password_hash and never the password, removed stored duration in favour of started_at and restored_at
- What I learned: ask "what is one row, what does it point to, what facts does it hold" instead of "who does it belong to"
EOF
## 2026-11-12: Migration runner and location tables (Phase 2)
- AI wrote: migration runner (src/migrate.ts) and 001_create_locations.sql (Claude chat); committed unmodified first
- I wrote or changed myself: (fill in anything you changed)
- I tested it by: ran migrate twice (second run applied nothing), inspected tables with \dt and \d towns, inserted a town with a missing county, inserted a duplicate county inside a transaction and rolled it back
- Error found: (write any real error you hit; if none, write: none, but the database correctly refused a town with a missing county and a duplicate county name)
- How I found the cause: read the error message from PostgreSQL naming the constraint
- Fix: not needed, constraints worked as designed
- What I learned: migrations run once each, in order, inside transactions; foreign keys and unique rules are enforced by the database itself

## 2026-11-12: Users and causes tables (Phase 2)
- AI wrote: 002_create_users.sql and 003_create_causes.sql (Claude chat); committed unmodified first
- I wrote or changed myself: (fill in anything you changed)
- I tested it by: ran migrate; inspected with \d users; tried 4 bad inserts (no contact details, invalid role, customer without location, duplicate email with different capitals) inside a transaction with savepoints, then rolled everything back
- Error found: (write any real error you hit; if none: the database correctly refused all 4 bad rows, each naming the rule it broke)
- How I found the cause: read the constraint name in the PostgreSQL error message
- Fix: not needed, constraints worked as designed
- What I learned: CHECK rules and unique indexes let the database refuse bad data even if the backend has a bug; never edit an applied migration

## 2026-11-12: Outage incidents and reports tables (Phase 2)
- AI wrote: 004_create_outage_incidents.sql and 005_create_outage_reports.sql (Claude chat); committed unmodified first
- I wrote or changed myself: (fill in anything you changed)
- I tested it by: ran migrate; inspected with \d; tried 6 cases inside a transaction with savepoints (invalid status, restored without a time, restored before start, report pointing at a missing incident, two users reporting one incident, same user reporting twice), then rolled everything back
- Error found: (write any real error you hit; if none: the database correctly refused all bad rows, each naming the rule it broke)
- How I found the cause: read the constraint name in the PostgreSQL error message
- Fix: not needed, constraints worked as designed
- What I learned: the foreign key goes on the "many" side (reports point to the incident); two columns that describe one fact (status and restored_at) can be tied together with a CHECK so they never disagree; time-dependent rules belong in the backend
