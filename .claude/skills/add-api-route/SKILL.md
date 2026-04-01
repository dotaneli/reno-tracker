---
name: add-api-route
description: Create a new Next.js API route following project auth, error handling, and logging patterns
user_invocable: true
---

# Add API Route

Create a new API route following project conventions.

## Pattern

```typescript
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, handleError, errorResponse, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/actionlog";
import { log } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    // ... implementation
    return json(data);
  } catch (err) {
    return handleError(err);
  }
}
```

## Rules

1. **Auth** — use `requireUser()` for authenticated routes, `requireProjectAccess()` for project-scoped routes
2. **Error handling** — wrap in try/catch, use `handleError(err)` which handles AuthError, Prisma errors, and logs unhandled errors
3. **Mutations** — use `logAction()` for undo/redo support on CREATE/UPDATE/DELETE
4. **Logging** — use `log()` from `src/lib/logger.ts` for important events
5. **Validation** — validate required fields, return `errorResponse("message", 400)` for bad input
6. **File location** — `src/app/api/<resource>/route.ts` for collection, `src/app/api/<resource>/[id]/route.ts` for single item
7. **OpenAPI** — update `src/app/api/openapi.json/route.ts` if adding a public endpoint
8. **MCP** — if the new route should be accessible to LLM agents, add a tool to `src/lib/mcp-server.ts`
