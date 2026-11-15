# Task 002: Outage reports and grouping

## Goal
Let a logged-in customer submit an outage report. The server groups it into an existing open incident or creates a new one. Add read routes for incidents and the user's own reports.

## Context
- Express + TypeScript in server/. Reuse the existing auth middleware in src/middleware/auth.ts and the `pool` from src/db.ts.
- Tables: see server/migrations/004_create_outage_incidents.sql and 005_create_outage_reports.sql, and docs/design.md. Do NOT change migrations or seeds.
- All SQL must use parameterized queries ($1, $2).

## Files you may create or edit
src/routes/reports.ts, src/routes/incidents.ts, src/index.ts (only to register the new routes). Nothing else. Install no new libraries.

## Routes (all require login)
1. POST /api/reports
   Body: started_at (ISO 8601 string with time zone, required); optional: description (max 1000 characters), neighbours_affected (boolean), neighbourhood_id (defaults to the user's own).
   - Reject unknown fields with 400. The client can never send user_id or incident_id.
   - started_at must not be more than 5 minutes in the future and not older than 48 hours: otherwise 400 { error }.
   - Unknown neighbourhood_id: 400 { error: "Unknown neighbourhood" }.
   - Rate limit: 10 requests per hour per IP, 429 { error: "Too many attempts, try again later" }.
   - Success: 201 { report, incident, grouped } where grouped is true if the report joined an existing incident.
   - If this user already has a report on the incident they would join: 409 { error: "You already reported this outage", incident_id }.
2. GET /api/incidents
   Query (optional): neighbourhood_id (integer), status = "open" (default, means not restored) | "restored" | "all".
   Returns up to 100 incidents, newest started_at first. Each: id, neighbourhood { id, name, town, county }, status, is_planned, is_simulated, cause (name), cause_confirmed, started_at, estimated_restoration_at, restored_at, report_count.
   Never include any user information (names, emails, phones, user ids).
3. GET /api/reports/mine
   Returns the logged-in user's own reports, newest first: id, incident_id, neighbourhood_id, started_at, description, neighbours_affected, created_at.

## Grouping rule (the core of this task)
Everything below happens inside ONE transaction using ONE client from pool.connect(). Never call pool.query inside the transaction.
1. BEGIN.
2. Take a transaction-level advisory lock: `SELECT pg_advisory_xact_lock(1, $1)` with the neighbourhood id (1 is a namespace meaning "incident grouping"). It is released automatically at COMMIT or ROLLBACK.
3. Look for an incident to join: same neighbourhood_id, status <> 'restored', is_planned = FALSE, is_simulated = FALSE, started_at >= NOW() - GROUPING_WINDOW_HOURS hours; ORDER BY started_at DESC LIMIT 1.
4. If none: create one with the cause named 'Unknown' (look up its id), cause_confirmed FALSE, is_planned FALSE, status 'reported', is_simulated FALSE (write it explicitly), started_at = the report's started_at.
5. If one exists, first check this user has no report on it yet (409 if so). Do not change the incident.
6. Insert the report with user_id from the logged-in user and the incident id.
7. COMMIT. On any error: ROLLBACK, then log it and return the generic 500. Always release the client in a `finally` block.
GROUPING_WINDOW_HOURS is a named constant (12) at the top of the file, with a comment explaining it is a guess to tune later.

## Other rules
- zod for validation, as in the auth routes. Return the same error shape as before: { error: "<short message>" }.
- TypeScript strict, no `any`. Short comments that explain why, not what.

## Out of scope
Notifications, estimates, admin routes, changing incident status, Socket.IO, frontend, automated tests.

## When finished
List the files you created or changed.
