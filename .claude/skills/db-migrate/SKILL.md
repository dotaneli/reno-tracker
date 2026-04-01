---
name: db-migrate
description: Create and apply Prisma schema changes safely with migration scripts
user_invocable: true
---

# Database Migration

Safely modify the Prisma schema and push changes.

## Rules

1. **Prisma 7 + @prisma/adapter-pg** — no `url` in schema.prisma, connection via adapter
2. **Never drop columns/tables** without explicit user approval
3. **Always back up** — suggest `captureProjectState()` snapshot before destructive migrations
4. **Test with synthetic data** — never modify real user data

## Steps

1. Edit `prisma/schema.prisma` with the requested changes
2. Run `npx prisma generate` to regenerate the client
3. Run `npx prisma db push` to apply changes to Neon PostgreSQL
4. If a data migration is needed, create a script in `scripts/migrate-*.ts`
5. Run TypeScript check: `npx tsc --noEmit`
6. Run healthcheck to verify nothing broke
7. Commit with a descriptive message about the schema change
