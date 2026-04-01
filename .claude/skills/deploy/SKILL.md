---
name: deploy
description: Run all tests, build both UI versions, and deploy to Vercel production
user_invocable: true
---

# Deploy

Deploy both v1 and v2 to Vercel production after verifying everything works.

## Steps

1. Run TypeScript check: `npx tsc --noEmit`
2. Build v1: `NEXT_PUBLIC_UI_VERSION=v1 npx next build`
3. Build v2: `NEXT_PUBLIC_UI_VERSION=v2 npx next build`
4. Run healthcheck: `npm run healthcheck`
5. Run MCP tests: `npx tsx scripts/mcp-integration-test.ts`
6. If all pass, deploy v1: `NEXT_PUBLIC_UI_VERSION=v1 vercel --prod --yes -e NEXT_PUBLIC_UI_VERSION=v1`
7. Deploy v2: switch .vercel/project.json to v2 project, then `NEXT_PUBLIC_UI_VERSION=v2 vercel --prod --yes -e NEXT_PUBLIC_UI_VERSION=v2`, then restore v1 link
8. Push to git: `git push origin master`
9. Report deployment URLs and test results

If any step fails, stop and report the failure. Do not deploy broken code.
