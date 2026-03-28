# Reno Tracker — Agent Guidelines

## Project Overview

Renovation project management app. Next.js 16 + Prisma 7 + Neon PostgreSQL + Auth.js v5.

**Live:** https://reno-tracker-rho.vercel.app
**Repo:** https://github.com/dotaneli/reno-tracker

## Critical Rules

1. **Next.js 16 breaking changes** — uses `proxy.ts` instead of `middleware.ts`, async params in route handlers, `@prisma/adapter-pg` (no `url` in schema.prisma). Read `node_modules/next/dist/docs/` before writing code.
2. **i18n mandatory** — every UI string must use `t("key")` from `src/lib/i18n.tsx` with both EN and HE translations. Never hardcode English.
3. **Never touch real user data in tests** — all tests use synthetic users (`*@test.local`) and clean up after themselves.
4. **Costs on leaves only** — `expectedCost` cannot be set on a node that has children with costs, or on a child whose parent has a cost. Guards enforced in API.
5. **Inline edit-in-place** — edit forms render at the item location, never at the top of the page.

## Architecture Quick Reference

- **Auth:** `resolveAuth()` in `src/lib/dal.ts` — supports session cookies AND Bearer API keys
- **Financial math:** `useFinancials` hook — single source of truth. `remainingToPay = totalCost - totalPaid`
- **MCP Server:** `src/lib/mcp-server.ts` — 16 tools, served at `/api/agent/mcp`
- **Mutations:** always call `mutateAll()` or `onMutate()` after any data change to refresh SWR caches

## Running Tests

```bash
npm run healthcheck                    # 52 tests against production
npx tsx scripts/mcp-integration-test.ts # 100 tests against production
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/dal.ts` | Auth + authorization (resolveAuth, requireUser, requireProjectAccess) |
| `src/lib/api.ts` | Response helpers + TypeScript interfaces |
| `src/hooks/useFinancials.ts` | Financial calculations (shared across all pages) |
| `src/lib/mcp-server.ts` | MCP tool definitions and handlers |
| `src/proxy.ts` | Middleware (auth check, CORS, rate limiting) |
| `src/lib/i18n.tsx` | Translation dictionary (180+ keys) |
| `prisma/schema.prisma` | Database schema (21 models) |
