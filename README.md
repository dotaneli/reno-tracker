# Reno Tracker

A full-stack renovation project management application. Track tasks, costs, payments, vendors, issues, and rooms across your entire renovation. Bilingual (English/Hebrew) with RTL support.

**Live:** [reno-tracker-rho.vercel.app](https://reno-tracker-rho.vercel.app)
**Repository:** [github.com/dotaneli/reno-tracker](https://github.com/dotaneli/reno-tracker)

## Features

- **Recursive task tree** with unlimited nesting and drag-and-drop reordering
- **Card gallery view** with full expand-to-edit functionality
- **Payment tracking** with milestones, mark-as-paid, and PDF receipt uploads
- **Financial dashboard** with budget, cost, paid, remaining, and budget remaining
- **Unpaid deepdive** showing milestones, gaps, and unscheduled costs
- **Multi-project support** with role-based access (Owner, Admin, Editor, Viewer)
- **Bilingual** (EN/HE) with RTL support and auto-translation
- **Version history** with checkpoint/rollback
- **Undo/redo** for every mutation
- **LLM Agent Connector** (MCP + OpenAPI + API keys) for ChatGPT, Claude, Gemini
- **Export** to Google Sheets (CSV), styled HTML report, WhatsApp share
- **Search, sort, filter** across tasks with unpaid-only toggle
- **Inline edit-in-place** everywhere (no form-at-top-of-page)
- **Double-counting guards** preventing cost on both parent and child tasks

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) with Turbopack |
| Language | TypeScript 5, React 19 |
| Database | PostgreSQL on [Neon](https://neon.tech) |
| ORM | [Prisma 7](https://www.prisma.io) with PrismaPg adapter |
| Auth | [Auth.js v5](https://authjs.dev) (next-auth) with Google OAuth |
| Hosting | [Vercel](https://vercel.com) |
| File Storage | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) |
| Cache/Queue | [Upstash Redis + QStash](https://upstash.com) |
| CSS | [Tailwind CSS 4](https://tailwindcss.com) |
| Icons | [Lucide React](https://lucide.dev) |
| Drag & Drop | [dnd-kit](https://dndkit.com) |
| Data Fetching | [SWR](https://swr.vercel.app) |
| Translation | [google-translate-api-x](https://github.com/AidanWelch/google-translate-api) |
| Email | [Resend](https://resend.com) |
| LLM Protocol | [Model Context Protocol SDK](https://modelcontextprotocol.io) |

## Getting Started

### Prerequisites

- Node.js 20+
- A Neon PostgreSQL database
- Google OAuth credentials (for authentication)

### Setup

```bash
git clone https://github.com/dotaneli/reno-tracker.git
cd reno-tracker
npm install
```

Copy `.env.example` to `.env` and fill in the values (see [Environment Variables](#environment-variables)).

```bash
npx prisma db push        # Sync schema to database
npx prisma generate        # Generate Prisma client
npm run dev                # Start dev server at http://localhost:3000
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `AUTH_SECRET` | Random secret for Auth.js session encryption | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `RESEND_API_KEY` | Resend email API key (for invitations) | No |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | No |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | No |
| `QSTASH_URL` | Upstash QStash URL | No |
| `QSTASH_TOKEN` | Upstash QStash token | No |

### Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint
npm run healthcheck      # Run 52-test healthcheck against production
npm run healthcheck:local # Run healthcheck against localhost
```

## Project Structure

```
src/
  app/
    (dashboard)/          # Protected pages (layout with Shell/Nav)
      page.tsx            # Dashboard home
      tasks/              # Task management (list + card views)
      costs/              # Cost insights + unpaid deepdive
      vendors/            # Vendor CRUD with cost breakdown
      categories/         # Category CRUD with cost breakdown
      property/           # Floor & room management
      issues/             # Issue tracking
      history/            # Version history (checkpoint/rollback)
      team/               # Team members & invitations
      projects/           # Multi-project management
      integrations/       # LLM agent connector setup
    api/
      auth/               # Auth.js handlers
      nodes/              # Task CRUD, milestones, receipts, notes
      projects/           # Project CRUD, members, snapshots, export
      keys/               # API key management
      agent/mcp/          # MCP server (JSON-RPC 2.0)
      openapi.json/       # OpenAPI 3.1 spec
      issues/             # Issue CRUD
      vendors/            # Vendor CRUD
      categories/         # Category CRUD
      floors/             # Floor CRUD
      rooms/              # Room CRUD
      translate/          # Translation endpoint
      me/                 # Current user
    login/                # Login page
  components/
    NodeTree.tsx           # Recursive tree with DnD
    InlineNodeEdit.tsx     # Shared inline edit form
    ItemMilestones.tsx     # Payment management panel
    InlineCreateSelect.tsx # Dropdown with inline create
    RoomMultiSelect.tsx    # Multi-room chip selector
    ExportButtons.tsx      # CSV/HTML/WhatsApp export
    Card.tsx, StatCard     # Card components
    TaskLine.tsx           # Task summary line
    Shell.tsx, Nav.tsx     # App shell and navigation
    ...
  hooks/
    useApi.ts             # SWR-based data fetching
    useFinancials.ts      # Shared financial calculations
    useProject.tsx        # Multi-project context
    useTranslate.ts       # Auto-translation hook
  lib/
    auth.ts               # Auth.js configuration
    dal.ts                # Data Access Layer (auth + authorization)
    prisma.ts             # Prisma client singleton
    api.ts                # API helpers + TypeScript interfaces
    actionlog.ts          # Undo/redo infrastructure
    snapshots.ts          # Version history capture/restore
    mcp-server.ts         # MCP tool definitions + handlers
    openapi-spec.ts       # OpenAPI 3.1 specification
    i18n.tsx              # Bilingual dictionary (180+ keys)
    rate-limit.ts         # In-memory rate limiter
    file-upload.ts        # Base64 file upload utility
  proxy.ts                # Next.js 16 middleware (auth + CORS)
scripts/
  healthcheck.ts          # 52-test integration suite
  mcp-integration-test.ts # 100-test MCP + API suite
  mcp-test-setup.ts       # Test fixture generator
  seed.ts                 # Database seeder
prisma/
  schema.prisma           # Database schema (21 models, 8 enums)
```

## Testing

Two test suites, both using synthetic test data (never touches real user data):

```bash
# Healthcheck: auth, CRUD, tree operations, milestones, snapshots, roles
npm run healthcheck         # 52 tests

# MCP Integration: all 16 tools, REST Bearer auth, scopes, CORS, OpenAPI
npx tsx scripts/mcp-integration-test.ts  # 100 tests
```

Both suites create isolated test users, projects, and API keys, then clean up after themselves.

## API Documentation

### REST API

All endpoints require authentication via session cookie or `Authorization: Bearer rk_...` API key.

**OpenAPI spec:** [reno-tracker-rho.vercel.app/api/openapi.json](https://reno-tracker-rho.vercel.app/api/openapi.json)

### MCP Server

JSON-RPC 2.0 endpoint at `/api/agent/mcp` with 16 tools:

| Tool | Description |
|------|-------------|
| `list_projects` | List all accessible projects |
| `get_project_tree` | Full nested task tree with costs |
| `get_financial_summary` | Budget, cost, paid, remaining breakdown |
| `create_node` / `update_node` / `delete_node` | Task CRUD |
| `mark_node_done` | Complete task + pay all milestones |
| `create_milestone` / `update_milestone` | Payment CRUD |
| `create_issue` / `update_issue` | Issue CRUD |
| `create_vendor` / `list_vendors` | Vendor management |
| `list_categories` / `list_issues` | Read operations |
| `upload_receipt` | PDF upload (base64) |

### API Keys

Scoped access: `READ_ONLY`, `READ_WRITE`, `ADMIN`. Optional project restriction. SHA-256 hashed storage.

## License

Private project. All rights reserved.
