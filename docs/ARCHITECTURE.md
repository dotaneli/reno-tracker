# Architecture

## System Overview

```
                                 ┌──────────────────────┐
                                 │   LLM Agents          │
                                 │   (ChatGPT, Claude,   │
                                 │    Gemini, etc.)       │
                                 └──────────┬───────────┘
                                            │ Bearer rk_...
                                            │
┌─────────────┐    Session     ┌────────────▼────────────┐
│  Browser     │───Cookie────▶│     Vercel Edge          │
│  (React SPA) │               │     proxy.ts             │
└─────────────┘               │  ┌─────────────────────┐ │
                               │  │ Cookie → pass       │ │
                               │  │ Bearer → pass+CORS  │ │
                               │  │ /api/openapi → pub  │ │
                               │  │ Neither → 401       │ │
                               │  └─────────────────────┘ │
                               └────────────┬─────────────┘
                                            │
                               ┌────────────▼─────────────┐
                               │  Next.js API Routes       │
                               │  (34 endpoints)           │
                               │                           │
                               │  resolveAuth()            │
                               │  ├─ Session → userId      │
                               │  └─ Bearer → hash →       │
                               │     ApiKey → userId        │
                               │                           │
                               │  requireProjectAccess()   │
                               │  (OWNER/ADMIN/EDITOR/     │
                               │   VIEWER role check)      │
                               └──┬────────┬───────────┬──┘
                                  │        │           │
                    ┌─────────────▼┐ ┌─────▼────┐ ┌───▼──────────┐
                    │ Neon         │ │ Vercel   │ │ Upstash      │
                    │ PostgreSQL   │ │ Blob     │ │ Redis+QStash │
                    │              │ │          │ │              │
                    │ 21 models    │ │ Receipts │ │ Cache        │
                    │ via Prisma 7 │ │ PDFs     │ │ Rate limits  │
                    └──────────────┘ └──────────┘ └──────────────┘
```

## Service Map

| Service | Provider | URL | Purpose |
|---------|----------|-----|---------|
| **Web App** | Vercel | [reno-tracker-rho.vercel.app](https://reno-tracker-rho.vercel.app) | Frontend + API |
| **Database** | Neon | ep-crimson-lake-a4xt3y9b-pooler.us-east-1.aws.neon.tech | PostgreSQL (pooled) |
| **File Storage** | Vercel Blob | Managed by Vercel | Receipt PDFs |
| **Cache** | Upstash Redis | ruling-goose-70055.upstash.io | Translation cache, rate limiting |
| **Queue** | Upstash QStash | qstash-us-east-1.upstash.io | Background tasks |
| **Auth** | Google Cloud | console.cloud.google.com | OAuth credentials |
| **Email** | Resend | api.resend.com | Team invitations |
| **Source** | GitHub | [github.com/dotaneli/reno-tracker](https://github.com/dotaneli/reno-tracker) | Version control |
| **OpenAPI Spec** | Vercel | [/api/openapi.json](https://reno-tracker-rho.vercel.app/api/openapi.json) | API documentation |
| **MCP Endpoint** | Vercel | [/api/agent/mcp](https://reno-tracker-rho.vercel.app/api/agent/mcp) | LLM agent connector |

## Data Model

### Core Hierarchy

```
Project
  ├── ProjectNode (recursive tree via parentId)
  │     ├── PaymentMilestone[]
  │     ├── Receipt[]
  │     ├── Note[]
  │     ├── Issue[]
  │     └── NodeRoom[] → Room → Floor
  ├── Vendor[]
  ├── Category[]
  ├── Floor[]
  │     └── Room[]
  ├── ProjectMember[] → User
  ├── ActionLog[] (undo/redo)
  └── ProjectSnapshot[] (version history)

User
  ├── Account[] (OAuth)
  ├── Session[] (database sessions)
  ├── ApiKey[] (LLM agent auth)
  └── ProjectMember[]
```

### Key Design Decisions

**Recursive tree (not separate tables):** Tasks use a single `ProjectNode` table with self-referencing `parentId`. This allows unlimited nesting depth with a single query pattern. The alternative (separate SubProject/Item tables) was tried and abandoned in Phase 3 due to rigid depth limits.

**Costs on leaves only:** The system enforces that `expectedCost` can only be set on leaf nodes (no children with costs) OR on nodes without a parent that has costs. This prevents double-counting in financial aggregations. Enforced at API level with clear error messages.

**Milestones independent of cost:** A task's `expectedCost` is the budget. Milestones are individual payment records. They don't have to sum to the cost — the gap is tracked as "unscheduled" in the UI.

**Database sessions (not JWT):** Auth.js uses database sessions stored in Neon. This allows immediate revocation and simpler session management, at the cost of a DB query per request.

## Authentication & Authorization

### Dual Auth Flow

```
Request arrives
  ├── Has session cookie? → auth() → Session → User
  └── Has Bearer header?  → SHA-256(token) → ApiKey → User
```

Both paths return `{ userId, email }` to route handlers. The `resolveAuth()` function in `dal.ts` handles both, and `requireUser()` wraps it for backward compatibility with all 34 existing routes.

### Role Model

| Role | Can Read | Can Edit | Can Delete | Can Manage Team |
|------|----------|----------|------------|-----------------|
| VIEWER | Yes | No | No | No |
| EDITOR | Yes | Yes | Yes | No |
| ADMIN | Yes | Yes | Yes | No (treated as OWNER for data ops) |
| OWNER | Yes | Yes | Yes | Yes |

### API Key Scopes

| Scope | Read | Write | Delete Projects/Members |
|-------|------|-------|------------------------|
| READ_ONLY | Yes | No | No |
| READ_WRITE | Yes | Yes | No |
| ADMIN | Yes | Yes | Yes |

Keys are SHA-256 hashed before storage. Optional project restriction (`projectId` on ApiKey).

## Financial Architecture

### Definitions

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Total Budget** | `project.totalBudget` | The overall budget set by the owner |
| **Total Cost** | `SUM(nodes.expectedCost)` | All allocated costs across leaf tasks |
| **Total Paid** | `SUM(milestones WHERE status=PAID)` | Actual money paid via milestones |
| **Total Milestoned** | `SUM(milestones.amount)` | All scheduled payments (paid + unpaid) |
| **Remaining to Pay** | `totalCost - totalPaid` | How much is still owed |
| **Unscheduled** | `totalCost - totalMilestoned` | Cost without payment milestones |
| **Budget Remaining** | `totalBudget - totalCost` | Unallocated budget |
| **Paid %** | `totalPaid / totalCost * 100` | Payment progress |

### Cost Aggregation

- Tree view: `sumCosts()` and `sumPaid()` recursively roll up children's costs
- Flat view: each node has `_paid` and `_totalMilestoned` computed by the API
- `useFinancials` hook: single source of truth used by dashboard, costs, tasks pages

### Double-Counting Prevention

API guards on `POST /api/nodes` and `PATCH /api/nodes/:id`:
- Cannot set `expectedCost` on a node that has children with costs
- Cannot set `expectedCost` on a child whose parent already has a cost
- Clearing cost (setting to null) is always allowed

## Assumptions

1. **Single currency (ILS):** All costs are in Israeli New Shekels. No multi-currency support.
2. **Small team size:** Designed for household renovation teams (2-10 people). No pagination on member lists.
3. **Moderate data volume:** Optimized for projects with up to ~500 tasks and ~1000 milestones. No server-side pagination on node lists.
4. **Vercel serverless:** All API routes run as serverless functions with cold starts. No WebSockets or long-lived connections.
5. **Trusted users:** API key holders are assumed to be the user themselves (giving their key to their own LLM). No audit log for key-level abuse detection beyond `lastUsedAt`.
6. **Translation as best-effort:** Google Translate is used for auto-translation. Results are cached client-side but not persisted. Translation failures fall back to the original text silently.

## Risks & Concerns

### Data Integrity

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Milestone totals can exceed task cost** | Inaccurate financial reporting | UI shows the discrepancy; 9 NIS rounding error exists in real data |
| **No foreign key validation on categoryId/vendorId** | Could link to another project's entity | Documented as known gap; low risk with small user base |
| **Undo/redo assumes stable schema** | Undo of old actions may fail after schema changes | ActionLog stores snapshots; structural changes may invalidate old entries |

### Security

| Risk | Impact | Mitigation |
|------|--------|------------|
| **API keys grant full user permissions** | Compromised key = full account access | SHA-256 hashing, optional expiry, revocation UI, lastUsedAt tracking |
| **No rate limiting on key creation** | Attacker with session could create 10 keys | Max 10 keys per user enforced at API level |
| **CORS allows all origins for Bearer requests** | Any domain can call API with a valid key | By design — LLM platforms call from various origins |
| **Base64 file upload vector** | Large payloads, malicious files | 5MB limit, PDF/JPEG/PNG extension validation, Vercel body size limit |

### Performance

| Risk | Impact | Mitigation |
|------|--------|------------|
| **useFinancials fetches all projects** | Unnecessary data on every page using it | Low impact with few projects; should fetch single project in v2 |
| **No server-side pagination** | Slow response with 500+ nodes | Acceptable for renovation-scale data; add pagination in v2 if needed |
| **In-memory rate limiter resets on cold start** | Brief window of unlimited requests after deploy | Acceptable for current scale; move to Redis-based in v2 |
| **SWR revalidateOnFocus disabled** | Stale data if another tab makes changes | `mutateAll()` handles same-tab freshness; cross-tab requires focus revalidation |

### Operational

| Risk | Impact | Mitigation |
|------|--------|------------|
| **No automated CI/CD pipeline** | Manual deploys via `vercel deploy --prod` | GitHub push triggers Vercel auto-deploy (when connected) |
| **No database backups configured** | Data loss on Neon failure | Neon has point-in-time recovery; ProjectSnapshot provides app-level backup |
| **No monitoring/alerting** | Silent failures in production | Vercel logs available; no Sentry/DataDog integration |
| **Single region (us-east-1)** | Latency for non-US users | Acceptable for Israel-based users accessing Neon in us-east-1 |

## Future Considerations (v2)

- Server-side pagination for large projects
- Redis-based rate limiting (replace in-memory)
- Per-project API key scoping in MCP tools
- MCP resources and prompts (currently tools-only)
- Webhook integrations (contractor notifications)
- Mobile app (React Native or PWA)
- Multi-currency support
- Gantt chart / timeline view
- Photo documentation (before/after per task)
