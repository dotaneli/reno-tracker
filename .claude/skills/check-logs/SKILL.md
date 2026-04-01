---
name: check-logs
description: Query system logs from Upstash Redis to investigate errors, auth issues, or seed failures
user_invocable: true
---

# Check Logs

Query the structured logging system to investigate issues.

## Usage

`/check-logs` — show recent errors
`/check-logs seed` — show seed-related events
`/check-logs auth` — show auth events

## Steps

1. Parse the optional argument to determine filter (default: level=error)
2. Query the production logs API: `curl -s 'https://reno-tracker-rho.vercel.app/api/logs?level=error&limit=50'` with admin session cookie
3. If no session available, query Upstash Redis directly using the REST API with credentials from .env
4. Format results as a table: timestamp | level | event | message | userId
5. Highlight errors in red, warnings in yellow
6. Suggest actions based on patterns (e.g., repeated seed_failed = DB issue)

Alternative: use `npx tsx -e` to call `queryLogs()` from `src/lib/logger.ts` directly.
