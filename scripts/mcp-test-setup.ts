/**
 * Creates test fixtures for MCP integration testing.
 * Uses synthetic test data — never touches real user data.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createHash, randomBytes } from "crypto";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Clean up any previous test data
  await prisma.apiKey.deleteMany({ where: { user: { email: "mcp-test@test.local" } } });
  await prisma.projectMember.deleteMany({ where: { user: { email: "mcp-test@test.local" } } });
  await prisma.project.deleteMany({ where: { name: "MCP Test Project" } });
  await prisma.user.deleteMany({ where: { email: "mcp-test@test.local" } });

  // Create test user
  const testUser = await prisma.user.create({
    data: { email: "mcp-test@test.local", name: "MCP Test User" },
  });
  console.log("Test user:", testUser.id);

  // Create test project
  const project = await prisma.project.create({
    data: { name: "MCP Test Project", totalBudget: 100000 },
  });
  console.log("Test project:", project.id);

  // Make user OWNER
  await prisma.projectMember.create({
    data: { projectId: project.id, userId: testUser.id, role: "OWNER" },
  });

  // Create API key
  const plaintext = "rk_" + randomBytes(20).toString("hex");
  const keyHash = createHash("sha256").update(plaintext).digest("hex");
  await prisma.apiKey.create({
    data: {
      name: "MCP Test Key",
      keyHash,
      keyPrefix: plaintext.slice(0, 7) + "...",
      scope: "READ_WRITE",
      userId: testUser.id,
    },
  });

  console.log("\n=== TEST FIXTURES ===");
  console.log(`API_KEY=${plaintext}`);
  console.log(`PROJECT_ID=${project.id}`);
  console.log(`USER_ID=${testUser.id}`);
  console.log("=====================\n");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
