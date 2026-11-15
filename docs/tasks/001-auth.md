# Task 001: Registration and login

## Goal
Add registration, login, logout and "who am I" to the Express server, plus one public route listing neighbourhoods.

## Context
- Express + TypeScript in server/. Database access only through `pool` from src/db.ts, using parameterized queries (`$1`, `$2`).
- Table definitions are in server/migrations/. Read 002_create_users.sql. Do NOT change migrations or seeds.
- Design notes are in docs/design.md.

## Libraries to install
argon2, jsonwebtoken, cookie-parser, express-rate-limit, zod, and the matching @types packages where needed.

## Environment
- JWT_SECRET is already in server/.env. Never read, print or log values from .env. Refuse to start if JWT_SECRET is missing.

## Files you may create or edit
src/index.ts, src/routes/auth.ts, src/routes/locations.ts, src/middleware/auth.ts, package.json (through npm install). Nothing else.

## Routes
1. GET /api/locations/neighbourhoods (public)
   Returns a JSON array of { id, name, town, county }, sorted by county, town, name.
2. POST /api/auth/register
   Body: first_name, last_name, email, password, neighbourhood_id; optional: phone, notify_sms, notify_email.
   - Reject unknown fields with 400.
   - Email must be valid; store it lowercase. Phone, if given: 9 to 15 characters, digits with an optional leading +.
   - Password: 10 to 128 characters. Hash with argon2 (argon2id).
   - Role is always "customer". Never accept role from the request.
   - Unknown neighbourhood_id: 400 { error: "Unknown neighbourhood" }.
   - Duplicate email or phone (Postgres error code 23505): 409 { error: "That email or phone is already registered" }.
   - Success: 201 { user }, and set the login cookie.
3. POST /api/auth/login
   Body: email, password.
   - Wrong email OR wrong password: 401 { error: "Invalid email or password" }, identical in both cases.
   - When the email is not found, still run a password verification against a fixed dummy hash, so response time does not reveal whether the email exists.
   - Success: 200 { user }, and set the login cookie.
4. POST /api/auth/logout
   Clears the cookie. Returns 200 { ok: true }.
5. GET /api/auth/me
   Requires login. Returns 200 { user }. Not logged in or invalid token: 401 { error: "Not logged in" }.

## Response shape
`user` contains only: id, first_name, last_name, email, phone, role, neighbourhood_id. Never password_hash. Select columns explicitly; never return a whole row.
Validation errors: 400 { error: "<short message>" }.

## Token and cookie
- JWT signed with JWT_SECRET, containing only the user id, expiring in 1 day.
- Cookie name: emop_token. Flags: httpOnly, sameSite "lax", secure only when NODE_ENV is "production", maxAge 1 day.
- The auth middleware must verify the token AND load the user from the database on each request, so deleted users lose access immediately.

## Other rules
- Rate limits: login 10 attempts per 15 minutes per IP; register 10 attempts per hour per IP. Return 429 { error: "Too many attempts, try again later" }.
- express.json() with a 10kb body limit.
- A central error handler: log details on the server, return only 500 { error: "Something went wrong" } to the client. No stack traces in responses.
- TypeScript strict, no `any`. Short comments that explain why, not what.

## Out of scope
Frontend, other routes, automated tests, email verification, password reset, admin creation.

## When finished
List the files you created or changed and the commands to run the server.
