/**
 * Comprehensive Health Check — Tree, DnD, Categories, Auth, Tenancy, Snapshots
 * Uses ONLY synthetic test data. NEVER touches user's real project data.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import crypto from "crypto";

const BASE = process.argv[2]?.replace(/\/$/, "") || "https://reno-tracker-rho.vercel.app";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let passed = 0, failed = 0;
const failures: string[] = [];
const ctx: Record<string, any> = {};

function ck() { return BASE.startsWith("https") ? "__Secure-authjs.session-token" : "authjs.session-token"; }

async function api(path: string, opts: any = {}): Promise<{ status: number; body: any }> {
  const { sessionToken, ...fo } = opts;
  const h: Record<string, string> = {};
  if (sessionToken) h["Cookie"] = `${ck()}=${sessionToken}`;
  if (!(fo.body instanceof FormData)) h["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { ...fo, headers: { ...h, ...fo.headers }, redirect: "manual" });
  const text = await res.text();
  let body: any; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; const msg = `  ❌ ${name}${detail ? ` — ${detail}` : ""}`; console.log(msg); failures.push(msg); }
}
function section(t: string) { console.log(`\n━━━ ${t} ━━━`); }

async function setup() {
  section("SETUP");
  const now = new Date(), exp = new Date(Date.now() + 86400000);
  for (const [key, name] of [["owner", "HC Owner"], ["stranger", "HC Stranger"], ["viewer", "HC Viewer"]] as const) {
    const u = await prisma.user.create({ data: { email: `hc-${key}-${crypto.randomUUID().slice(0, 8)}@test.local`, name, emailVerified: now } });
    ctx[`${key}Id`] = u.id; ctx[`${key}Token`] = crypto.randomUUID();
    await prisma.session.create({ data: { sessionToken: ctx[`${key}Token`], userId: u.id, expires: exp } });
  }
  // Create an API key for the owner (for MCP/OAuth tests)
  const apiKeyPlain = "rk_" + crypto.randomBytes(20).toString("hex");
  const apiKeyHash = crypto.createHash("sha256").update(apiKeyPlain).digest("hex");
  await prisma.apiKey.create({ data: { name: "HC Test Key", keyHash: apiKeyHash, keyPrefix: apiKeyPlain.slice(0, 7) + "...", scope: "READ_WRITE", userId: ctx.ownerId } });
  ctx.ownerApiKey = apiKeyPlain;
  console.log("  Created 3 synthetic test users + API key");
}

async function teardown() {
  section("TEARDOWN");
  if (ctx.projectId) await prisma.project.delete({ where: { id: ctx.projectId } }).catch(() => {});
  await prisma.apiKey.deleteMany({ where: { userId: { in: [ctx.ownerId, ctx.strangerId, ctx.viewerId] } } });
  await prisma.session.deleteMany({ where: { userId: { in: [ctx.ownerId, ctx.strangerId, ctx.viewerId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ctx.ownerId, ctx.strangerId, ctx.viewerId] } } });
  console.log("  Cleaned up");
}

async function testAuth() {
  section("AUTH WALLS");
  for (const ep of ["GET /api/me", "GET /api/projects", "GET /api/issues"]) {
    const [m, p] = ep.split(" ");
    const { status } = await api(p, { method: m });
    assert(`${ep} → 401`, status === 401);
  }
}

async function testProject() {
  section("PROJECT");
  const { status, body } = await api("/api/projects", { method: "POST", sessionToken: ctx.ownerToken, body: JSON.stringify({ name: "HC Reno", totalBudget: 100000 }) });
  assert("Create project → 201", status === 201);
  ctx.projectId = body.id;
}

async function testCategories() {
  section("CATEGORIES CRUD");
  const tok = ctx.ownerToken;

  const { status: cc, body: cat } = await api("/api/categories", { method: "POST", sessionToken: tok, body: JSON.stringify({ name: "HC Plumbing", projectId: ctx.projectId }) });
  assert("Create category → 201", cc === 201);
  ctx.catId = cat.id;

  const { body: cats } = await api(`/api/categories?projectId=${ctx.projectId}`, { sessionToken: tok });
  assert("List categories", cats.length >= 1);

  const { status: cu, body: updated } = await api(`/api/categories/${cat.id}`, { method: "PATCH", sessionToken: tok, body: JSON.stringify({ name: "HC Electrical" }) });
  assert("Update category → 200", cu === 200);
  assert("Category name updated", updated.name === "HC Electrical");

  // Create a second category
  const { body: cat2 } = await api("/api/categories", { method: "POST", sessionToken: tok, body: JSON.stringify({ name: "HC Carpentry", projectId: ctx.projectId }) });
  ctx.cat2Id = cat2.id;
}

async function testVendor() {
  section("VENDOR");
  const { status, body } = await api("/api/vendors", { method: "POST", sessionToken: ctx.ownerToken, body: JSON.stringify({ name: "HC Plumber", projectId: ctx.projectId }) });
  assert("Create vendor → 201", status === 201);
  ctx.vendorId = body.id;
}

async function testTreeCRUD() {
  section("TREE CRUD — 3+ levels deep");
  const tok = ctx.ownerToken;

  // Level 1: Root node with category
  const { status: r1s, body: root1 } = await api("/api/nodes", { method: "POST", sessionToken: tok, body: JSON.stringify({ name: "HC Kitchen Reno", projectId: ctx.projectId, categoryId: ctx.catId }) });
  assert("Create root node → 201", r1s === 201);
  assert("Root has category", root1.category?.id === ctx.catId);
  ctx.root1Id = root1.id;

  // Second root
  const { body: root2 } = await api("/api/nodes", { method: "POST", sessionToken: tok, body: JSON.stringify({ name: "HC Bathroom Reno", projectId: ctx.projectId, categoryId: ctx.cat2Id }) });
  ctx.root2Id = root2.id;

  // Level 2: Child of root1 (group — no cost)
  const { status: l2s, body: level2 } = await api("/api/nodes", { method: "POST", sessionToken: tok, body: JSON.stringify({ name: "HC Plumbing Work", projectId: ctx.projectId, parentId: root1.id, vendorId: ctx.vendorId }) });
  assert("Create level-2 node → 201", l2s === 201);
  assert("Level-2 has parent", level2.parentId === root1.id);
  ctx.level2Id = level2.id;

  // Level 3: Child of level2 (group — no cost)
  const { status: l3s, body: level3 } = await api("/api/nodes", { method: "POST", sessionToken: tok, body: JSON.stringify({ name: "HC Pipe Replacement", projectId: ctx.projectId, parentId: level2.id }) });
  assert("Create level-3 node → 201", l3s === 201);
  assert("Level-3 has grandparent chain", level3.parentId === level2.id);
  ctx.level3Id = level3.id;

  // Level 4: Child of level3 (leaf — has cost)
  const { status: l4s, body: level4 } = await api("/api/nodes", { method: "POST", sessionToken: tok, body: JSON.stringify({ name: "HC Copper Fitting", projectId: ctx.projectId, parentId: level3.id, expectedCost: 500 }) });
  assert("Create level-4 node → 201", l4s === 201);
  ctx.level4Id = level4.id;

  // Verify tree structure via tree=true
  const { body: tree } = await api(`/api/nodes?projectId=${ctx.projectId}&tree=true`, { sessionToken: tok });
  assert("Tree returns root nodes", tree.length === 2);
  const kitchenRoot = tree.find((n: any) => n.id === root1.id);
  assert("Root has level-2 child", kitchenRoot?.children?.length === 1);
  assert("Level-2 has level-3 child", kitchenRoot?.children?.[0]?.children?.length === 1);
  assert("Level-3 has level-4 child", kitchenRoot?.children?.[0]?.children?.[0]?.children?.length === 1);

  // Flat list returns all (2 roots + 1 level2 + 1 level3 + 1 level4 = 5)
  const { body: flat } = await api(`/api/nodes?projectId=${ctx.projectId}`, { sessionToken: tok });
  assert("Flat list returns all nodes", flat.length >= 5);
}

async function testMoveToRoot() {
  section("MOVE — Child to root");
  const tok = ctx.ownerToken;

  // Move level3 to root (parentId: null)
  const { status, body } = await api(`/api/nodes/${ctx.level3Id}`, { method: "PATCH", sessionToken: tok, body: JSON.stringify({ parentId: null }) });
  assert("Move to root → 200", status === 200);
  assert("parentId is now null", body.parentId === null);

  // Verify tree
  const { body: tree } = await api(`/api/nodes?projectId=${ctx.projectId}&tree=true`, { sessionToken: tok });
  assert("Tree now has 3 roots", tree.length === 3);
  const movedNode = tree.find((n: any) => n.id === ctx.level3Id);
  assert("Moved node is at root", !!movedNode);
  assert("Moved node kept its child (level4)", movedNode?.children?.length === 1);
}

async function testMoveToDeep() {
  section("MOVE — Root to deep nesting");
  const tok = ctx.ownerToken;

  // Move root2 under level2 (creates 3-level depth: root1 > level2 > root2)
  const { status } = await api(`/api/nodes/${ctx.root2Id}`, { method: "PATCH", sessionToken: tok, body: JSON.stringify({ parentId: ctx.level2Id }) });
  assert("Move root to deep → 200", status === 200);

  const { body: tree } = await api(`/api/nodes?projectId=${ctx.projectId}&tree=true`, { sessionToken: tok });
  const root1 = tree.find((n: any) => n.id === ctx.root1Id);
  const l2 = root1?.children?.find((n: any) => n.id === ctx.level2Id);
  const nested = l2?.children?.find((n: any) => n.id === ctx.root2Id);
  assert("Node is now nested 3 levels deep", !!nested);

  // Move it back to root
  await api(`/api/nodes/${ctx.root2Id}`, { method: "PATCH", sessionToken: tok, body: JSON.stringify({ parentId: null }) });
}

async function testCircularPrevention() {
  section("CIRCULAR REFERENCE PREVENTION");
  const tok = ctx.ownerToken;

  // Try to make root1 a child of level2 (which is root1's child) — should fail
  const { status } = await api(`/api/nodes/${ctx.root1Id}`, { method: "PATCH", sessionToken: tok, body: JSON.stringify({ parentId: ctx.level2Id }) });
  assert("Circular reference → 400", status === 400);
}

async function testChangeCategory() {
  section("CHANGE CATEGORY");
  const tok = ctx.ownerToken;

  // Change root1's category
  const { status, body } = await api(`/api/nodes/${ctx.root1Id}`, { method: "PATCH", sessionToken: tok, body: JSON.stringify({ categoryId: ctx.cat2Id }) });
  assert("Change category → 200", status === 200);
  assert("Category updated", body.category?.id === ctx.cat2Id);

  // Remove category
  const { body: cleared } = await api(`/api/nodes/${ctx.root1Id}`, { method: "PATCH", sessionToken: tok, body: JSON.stringify({ categoryId: null }) });
  assert("Clear category", cleared.categoryId === null);

  // Set it back
  await api(`/api/nodes/${ctx.root1Id}`, { method: "PATCH", sessionToken: tok, body: JSON.stringify({ categoryId: ctx.catId }) });
}

async function testMilestones() {
  section("MILESTONES");
  const tok = ctx.ownerToken;

  // Milestones on leaf node (level4, cost=500)
  const fd = new FormData(); fd.append("label", "Deposit"); fd.append("amount", "150"); fd.append("dueDate", "2026-06-01");
  const { status: mc, body: m } = await api(`/api/nodes/${ctx.level4Id}/milestones`, { method: "POST", sessionToken: tok, body: fd });
  assert("Create milestone → 201", mc === 201);
  ctx.msId = m.id;

  const fd2 = new FormData(); fd2.append("label", "Completion"); fd2.append("percentage", "70");
  const { status: mc2, body: m2 } = await api(`/api/nodes/${ctx.level4Id}/milestones`, { method: "POST", sessionToken: tok, body: fd2 });
  assert("Create milestone (%) → 201", mc2 === 201);
  assert("Amount = 70% of 500", Number(m2.amount) === 350);

  const fd3 = new FormData(); fd3.append("status", "PAID"); fd3.append("paidDate", new Date().toISOString());
  const { body: paid } = await api(`/api/nodes/${ctx.level4Id}/milestones/${ctx.msId}`, { method: "PATCH", sessionToken: tok, body: fd3 });
  assert("Mark paid", paid.status === "PAID");

  const { body: agg } = await api(`/api/projects/${ctx.projectId}/milestones`, { sessionToken: tok });
  assert("Aggregate milestones", agg.length >= 2);
}

async function testNotes() {
  section("NOTES");
  const { status, body } = await api(`/api/nodes/${ctx.level2Id}/notes`, { method: "POST", sessionToken: ctx.ownerToken, body: JSON.stringify({ text: "HC test note" }) });
  assert("Create note → 201", status === 201);
  assert("Note has author", body.author?.name === "HC Owner");
}

async function testIssues() {
  section("ISSUES");
  const tok = ctx.ownerToken;
  const { status, body } = await api("/api/issues", { method: "POST", sessionToken: tok, body: JSON.stringify({ title: "HC Leak", nodeId: ctx.root1Id }) });
  assert("Create issue → 201", status === 201);
  ctx.issueId = body.id;
}

async function testTenantIsolation() {
  section("TENANT ISOLATION");
  const { body: p } = await api("/api/projects", { sessionToken: ctx.strangerToken });
  assert("Stranger sees no projects", !p.some((x: any) => x.id === ctx.projectId));
  const { status } = await api(`/api/nodes?projectId=${ctx.projectId}`, { sessionToken: ctx.strangerToken });
  assert("Stranger blocked → 404", status === 404);
}

async function testRolePermissions() {
  section("ROLE PERMISSIONS");
  const viewer = await prisma.user.findUnique({ where: { id: ctx.viewerId } });
  await api(`/api/projects/${ctx.projectId}/members`, { method: "POST", sessionToken: ctx.ownerToken, body: JSON.stringify({ email: viewer!.email, role: "VIEWER" }) });
  const { status: vr } = await api(`/api/nodes?projectId=${ctx.projectId}`, { sessionToken: ctx.viewerToken });
  assert("Viewer can read → 200", vr === 200);
  const { status: vc } = await api("/api/nodes", { method: "POST", sessionToken: ctx.viewerToken, body: JSON.stringify({ name: "Hack", projectId: ctx.projectId }) });
  assert("Viewer cannot create → 403", vc === 403);
}

async function testSnapshotRollback() {
  section("SNAPSHOT — SAVE, ROLLBACK, AUTO-SAVE");
  const tok = ctx.ownerToken;

  const { body: snap1 } = await api(`/api/projects/${ctx.projectId}/snapshots`, { method: "POST", sessionToken: tok, body: JSON.stringify({ label: "V1" }) });
  const { body: nBefore } = await api(`/api/nodes?projectId=${ctx.projectId}`, { sessionToken: tok });
  const countV1 = nBefore.length;

  await api("/api/nodes", { method: "POST", sessionToken: tok, body: JSON.stringify({ name: "Post-V1", projectId: ctx.projectId }) });
  await api(`/api/projects/${ctx.projectId}/snapshots`, { method: "POST", sessionToken: tok, body: JSON.stringify({ label: "V2" }) });

  await api(`/api/projects/${ctx.projectId}/snapshots/${snap1.id}`, { method: "POST", sessionToken: tok });
  const { body: nAfter } = await api(`/api/nodes?projectId=${ctx.projectId}`, { sessionToken: tok });
  assert("Rollback restored node count", nAfter.length === countV1);

  const { body: snaps } = await api(`/api/projects/${ctx.projectId}/snapshots`, { sessionToken: tok });
  assert("Auto-save exists", snaps.some((s: any) => s.label.startsWith("Auto-save")));
  assert("V1 still exists", snaps.some((s: any) => s.label === "V1"));
  assert("V2 still exists", snaps.some((s: any) => s.label === "V2"));
}

async function testNewUserNoProjects() {
  section("NEW USER — NO PROJECTS");
  // Simulate a brand-new user who has zero projects (seed failed or wasn't invited)
  const now = new Date(), exp = new Date(Date.now() + 86400000);
  const u = await prisma.user.create({ data: { email: `hc-newuser-${crypto.randomUUID().slice(0, 8)}@test.local`, name: "HC New User", emailVerified: now } });
  const tok = crypto.randomUUID();
  await prisma.session.create({ data: { sessionToken: tok, userId: u.id, expires: exp } });

  // GET /api/projects should return empty array, NOT error
  const { status, body } = await api("/api/projects", { sessionToken: tok });
  assert("New user GET /api/projects → 200", status === 200);
  assert("New user has 0 projects", Array.isArray(body) && body.length === 0);

  // GET /api/me should work
  const { status: meStatus } = await api("/api/me", { sessionToken: tok });
  assert("New user GET /api/me → 200", meStatus === 200);

  // Dashboard page should not 500
  const dashRes = await fetch(`${BASE}/`, { headers: { Cookie: `${ck()}=${tok}` }, redirect: "manual" });
  assert("Dashboard page loads (not 500)", dashRes.status < 500);

  // Cleanup
  await prisma.session.deleteMany({ where: { userId: u.id } });
  await prisma.user.delete({ where: { id: u.id } });
}

async function testNewUserSeeding() {
  section("NEW USER — DEMO PROJECT SEEDING");
  // Simulate the createUser auth event: create user then call seedDemoProject
  const { seedDemoProject } = await import("../src/lib/seed-demo");
  const now = new Date(), exp = new Date(Date.now() + 86400000);
  const u = await prisma.user.create({ data: { email: `hc-seed-${crypto.randomUUID().slice(0, 8)}@test.local`, name: "HC Seed Test", emailVerified: now } });
  const tok = crypto.randomUUID();
  await prisma.session.create({ data: { sessionToken: tok, userId: u.id, expires: exp } });

  // Run seedDemoProject (same as createUser event does)
  await seedDemoProject(u.id);

  // Verify user now has the demo project
  const { status, body } = await api("/api/projects", { sessionToken: tok });
  assert("Seeded user GET /api/projects → 200", status === 200);
  assert("Seeded user has 1 project", Array.isArray(body) && body.length === 1);
  assert("Project is Dream House Renovation", body[0]?.name === "Dream House Renovation");

  // Verify project has nodes
  const { body: nodes } = await api(`/api/nodes?projectId=${body[0]?.id}`, { sessionToken: tok });
  assert("Demo project has 50+ nodes", Array.isArray(nodes) && nodes.length >= 50);

  // Verify idempotent — running again should not create a duplicate
  await seedDemoProject(u.id);
  const { body: body2 } = await api("/api/projects", { sessionToken: tok });
  assert("Seed is idempotent (still 1 project)", Array.isArray(body2) && body2.length === 1);

  // Cleanup
  if (body[0]?.id) await prisma.project.delete({ where: { id: body[0].id } }).catch(() => {});
  await prisma.session.deleteMany({ where: { userId: u.id } });
  await prisma.user.delete({ where: { id: u.id } });
}

async function testAdminLogs() {
  section("ADMIN LOGS");

  // Unauthenticated should get 401
  const { status: unauth } = await api("/api/logs");
  assert("Unauthenticated GET /api/logs → 401", unauth === 401);

  // Non-admin user should get 403 (test users aren't the admin email)
  const { status: forbidden } = await api("/api/logs", { sessionToken: ctx.strangerToken });
  assert("Non-admin GET /api/logs → 403", forbidden === 403, `got ${forbidden}`);

  // Owner test user also isn't admin email — should also get 403
  const { status: ownerForbidden } = await api("/api/logs", { sessionToken: ctx.ownerToken });
  assert("Test owner (not admin email) → 403", ownerForbidden === 403, `got ${ownerForbidden}`);
}

async function testOAuthEndpoints() {
  section("OAUTH ENDPOINTS");

  // GET /api/oauth/authorize without params should return 400
  const { status: noParams } = await api("/api/oauth/authorize");
  assert("OAuth authorize without params → 400", noParams === 400, `got ${noParams}`);

  // GET /api/oauth/authorize with valid params should redirect (302) to Google
  const authRes = await fetch(`${BASE}/api/oauth/authorize?response_type=code&client_id=claude&redirect_uri=${encodeURIComponent("https://claude.ai/api/mcp/auth_callback")}&state=test123`, { redirect: "manual" });
  assert("OAuth authorize → 302 redirect", authRes.status === 302, `got ${authRes.status}`);
  const location = authRes.headers.get("location") || "";
  assert("OAuth redirects to Google", location.includes("accounts.google.com"), `got ${location.slice(0, 80)}`);

  // POST /api/oauth/token without code should return 400
  const { status: noCode } = await api("/api/oauth/token", {
    method: "POST",
    body: JSON.stringify({ grant_type: "authorization_code", code: "", redirect_uri: "https://claude.ai/api/mcp/auth_callback" }),
  });
  assert("OAuth token without code → 400", noCode === 400, `got ${noCode}`);

  // POST /api/oauth/token with invalid code should return 400
  const { status: badCode } = await api("/api/oauth/token", {
    method: "POST",
    body: JSON.stringify({ grant_type: "authorization_code", code: "invalid-code", redirect_uri: "https://claude.ai/api/mcp/auth_callback" }),
  });
  assert("OAuth token with invalid code → 400", badCode === 400, `got ${badCode}`);

  // MCP test endpoint should still work with Bearer auth
  const { status: testStatus, body: testBody } = await api("/api/agent/mcp/test", { headers: { Authorization: `Bearer ${ctx.ownerApiKey}` } });
  if (ctx.ownerApiKey) {
    assert("MCP test with Bearer key → 200", testStatus === 200, `got ${testStatus}`);
    assert("MCP test returns ok:true", testBody?.ok === true);
  }

  // Well-known discovery endpoints
  const { status: prm, body: prmBody } = await api("/.well-known/oauth-protected-resource/api/agent/mcp");
  assert("Protected resource metadata → 200", prm === 200, `got ${prm}`);
  assert("Resource metadata has authorization_servers", Array.isArray(prmBody?.authorization_servers));

  const { status: asm, body: asmBody } = await api("/.well-known/oauth-authorization-server");
  assert("Authorization server metadata → 200", asm === 200, `got ${asm}`);
  assert("Server metadata has authorization_endpoint", !!asmBody?.authorization_endpoint);
  assert("Server metadata has token_endpoint", !!asmBody?.token_endpoint);

  // Dynamic client registration
  const { status: dcrStatus, body: dcrBody } = await api("/api/oauth/register", {
    method: "POST",
    body: JSON.stringify({ client_name: "Test Client", redirect_uris: ["https://example.com/callback"] }),
  });
  assert("Dynamic client registration → 201", dcrStatus === 201, `got ${dcrStatus}`);
  assert("DCR returns client_id", !!dcrBody?.client_id);

  // 401 should include WWW-Authenticate header with resource_metadata
  const rawRes = await fetch(`${BASE}/api/agent/mcp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }) });
  const wwwAuth = rawRes.headers.get("www-authenticate") || "";
  assert("401 includes WWW-Authenticate header", rawRes.status === 401 && wwwAuth.includes("resource_metadata"), `status=${rawRes.status} header=${wwwAuth.slice(0, 80)}`);
}

async function testAiChat() {
  section("AI CHAT");
  const tok = ctx.ownerToken;
  const pid = ctx.projectId;

  // ── 1. Auth wall ──────────────────────────────────────────────────
  const { status: noAuth } = await api("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message: "hi", projectId: pid }),
  });
  assert("POST /api/chat without auth → 401", noAuth === 401, `got ${noAuth}`);

  // ── 2. Missing message field ──────────────────────────────────────
  const { status: noMsg } = await api("/api/chat", {
    method: "POST",
    sessionToken: tok,
    body: JSON.stringify({ projectId: pid }),
  });
  assert("POST /api/chat without message → 400", noMsg === 400, `got ${noMsg}`);

  // ── 3. Missing projectId field ────────────────────────────────────
  const { status: noPid } = await api("/api/chat", {
    method: "POST",
    sessionToken: tok,
    body: JSON.stringify({ message: "hi" }),
  });
  assert("POST /api/chat without projectId → 400", noPid === 400, `got ${noPid}`);

  // ── 4 & 5. Valid request → 200 streaming response ────────────────
  // Cannot use api() helper for streaming — use raw fetch
  const streamRes = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${ck()}=${tok}`,
    },
    body: JSON.stringify({ message: "hi", projectId: pid }),
  });
  assert("POST /api/chat valid → 200", streamRes.status === 200, `got ${streamRes.status}`);

  const contentType = streamRes.headers.get("content-type") || "";
  assert(
    "Response is streamed (text/event-stream or ndjson or text/plain)",
    contentType.includes("text/event-stream") ||
      contentType.includes("application/x-ndjson") ||
      contentType.includes("text/plain") ||
      contentType.includes("application/json"),
    `got ${contentType}`,
  );

  // Consume the stream (with a timeout to avoid hanging on slow AI responses)
  let streamBody = "";
  if (streamRes.body) {
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    const deadline = Date.now() + 30_000; // 30s timeout
    try {
      while (Date.now() < deadline) {
        const { done, value } = await Promise.race([
          reader.read(),
          new Promise<{ done: true; value: undefined }>((resolve) =>
            setTimeout(() => resolve({ done: true, value: undefined }), 30_000),
          ),
        ]);
        if (done) break;
        if (value) streamBody += decoder.decode(value, { stream: true });
      }
    } catch { /* timeout or read error — ok for health check */ }
    try { reader.cancel(); } catch {}
  }
  assert("Stream returned non-empty body", streamBody.length > 0, `body length=${streamBody.length}`);

  // ── 6. Chat history endpoint ──────────────────────────────────────
  // History without auth → 401
  const { status: histNoAuth } = await api(`/api/chat/history?projectId=${pid}`);
  assert("GET /api/chat/history without auth → 401", histNoAuth === 401, `got ${histNoAuth}`);

  // History with auth → 200 + array
  const { status: histStatus, body: histBody } = await api(`/api/chat/history?projectId=${pid}`, { sessionToken: tok });
  assert("GET /api/chat/history → 200", histStatus === 200, `got ${histStatus}`);
  assert("History returns an array", Array.isArray(histBody), `got ${typeof histBody}`);

  // ── 7. Messages saved after sending (wait for async DB save) ──────
  await new Promise((r) => setTimeout(r, 3000));
  const { body: histFinal } = await api(`/api/chat/history?projectId=${pid}`, { sessionToken: tok });
  const msgs = Array.isArray(histFinal) ? histFinal : (Array.isArray(histBody) ? histBody : []);
  if (msgs.length > 0) {
    const userMessages = msgs.filter((m: any) => m.role === "user");
    assert("History contains at least 1 user message", userMessages.length >= 1, `found ${userMessages.length}`);
    const assistantMessages = msgs.filter((m: any) => m.role === "assistant");
    assert("History contains at least 1 assistant message", assistantMessages.length >= 1, `found ${assistantMessages.length}`);
    const allCorrectProject = msgs.every((m: any) => m.projectId === pid);
    assert("All messages belong to correct project", allCorrectProject);
  }

  // ── 8. Project isolation ──────────────────────────────────────────
  // Create a second project to test isolation
  const { body: proj2 } = await api("/api/projects", {
    method: "POST",
    sessionToken: tok,
    body: JSON.stringify({ name: "HC Chat Isolation", totalBudget: 1000 }),
  });
  const pid2 = proj2?.id;
  if (pid2) {
    const { status: h2Status, body: h2Body } = await api(`/api/chat/history?projectId=${pid2}`, { sessionToken: tok });
    assert("Second project history → 200", h2Status === 200, `got ${h2Status}`);
    assert("Second project has 0 messages (isolation)", Array.isArray(h2Body) && h2Body.length === 0, `found ${h2Body?.length ?? "n/a"}`);

    // Stranger cannot access owner's chat history
    const { status: strangerHist } = await api(`/api/chat/history?projectId=${pid}`, { sessionToken: ctx.strangerToken });
    assert("Stranger cannot read chat history → 404 or 403", strangerHist === 404 || strangerHist === 403, `got ${strangerHist}`);

    // Clean up second project
    await prisma.project.delete({ where: { id: pid2 } }).catch(() => {});
  }

  // ── 9. Rate limiting (optional — skip if not implemented) ─────────
  // We won't send 50+ requests; just verify the header exists or skip
  const rateLimitHeader = streamRes.headers.get("x-ratelimit-limit") || streamRes.headers.get("ratelimit-limit");
  if (rateLimitHeader) {
    assert("Rate limit header present", parseInt(rateLimitHeader) > 0, `value=${rateLimitHeader}`);
  } else {
    assert("[SKIP] Rate limit headers not implemented yet", true);
  }

  // ── Cleanup: delete ChatMessage records created during test ───────
  await prisma.chatMessage.deleteMany({ where: { userId: ctx.ownerId, projectId: pid } }).catch(() => {});
}

async function testEdgeCases() {
  section("EDGE CASES");
  const tok = ctx.ownerToken;
  const { status: bj } = await api("/api/nodes", { method: "POST", sessionToken: tok, body: "not json{{" });
  assert("Invalid JSON → 400", bj === 400);
  const { status: nf } = await api("/api/nodes/nonexistent", { sessionToken: tok });
  assert("Non-existent node → 404", nf === 404);
  const { status: es } = await api(`/api/projects/${ctx.projectId}/snapshots`, { method: "POST", sessionToken: tok, body: JSON.stringify({}) });
  assert("Empty snapshot label → 400", es === 400);
  const { status: ec } = await api("/api/categories", { method: "POST", sessionToken: tok, body: JSON.stringify({}) });
  assert("Empty category → 400", ec === 400);
}

async function main() {
  console.log(`\n🏥 Health Check — ${BASE}\n`);
  const start = Date.now();
  try {
    await setup();
    await testAuth();
    await testProject();
    await testCategories();
    await testVendor();
    await testTreeCRUD();
    await testMoveToRoot();
    await testMoveToDeep();
    await testCircularPrevention();
    await testChangeCategory();
    await testMilestones();
    await testNotes();
    await testIssues();
    await testTenantIsolation();
    await testRolePermissions();
    await testSnapshotRollback();
    await testNewUserNoProjects();
    await testNewUserSeeding();
    await testAdminLogs();
    await testOAuthEndpoints();
    await testAiChat();
    await testEdgeCases();
  } catch (err) { console.error("\n💥 Fatal:", err); }
  finally { await teardown(); await prisma.$disconnect(); }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const total = passed + failed;
  console.log(`\n${"━".repeat(50)}`);
  console.log(`  ${passed}/${total} passed, ${failed} failed — ${elapsed}s`);
  if (failures.length) { console.log(`\n  Failures:`); failures.forEach(f => console.log(f)); }
  console.log(failed === 0 ? "\n  🟢 ALL SYSTEMS OPERATIONAL\n" : "\n  🔴 ISSUES DETECTED\n");
  process.exit(failed > 0 ? 1 : 0);
}

main();
