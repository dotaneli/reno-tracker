---
name: debug-user
description: Look up a user by name or email, check their account status, projects, sessions, and recent logs
user_invocable: true
---

# Debug User

Investigate a user's account state when they report issues.

## Steps

1. Search the database for the user by name or email (case-insensitive partial match)
2. Show: user ID, email, createdAt, emailVerified
3. Show: Google OAuth account (provider, scope)
4. Show: active sessions (count, expiry dates)
5. Show: project memberships (project names, roles)
6. If they have 0 projects, check if seedDemoProject ran (look for "Dream House Renovation")
7. Query system logs via `GET /api/logs?limit=50` filtering by their userId if possible
8. Summarize findings and suggest fixes

Use `npx tsx -e` with dotenv/config and PrismaPg to query the database directly.
