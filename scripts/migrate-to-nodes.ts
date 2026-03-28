/**
 * Data Migration: SubProject + Item → ProjectNode
 *
 * Copies all data from old tables to new recursive nodes.
 * Run: npx tsx scripts/migrate-to-nodes.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔄 Starting migration: SubProject + Item → ProjectNode\n");

  // Maps: oldId → newNodeId
  const spToNode = new Map<string, string>();
  const itemToNode = new Map<string, string>();

  // Get all sub-projects with their items and relations
  const subProjects = await prisma.subProject.findMany({
    include: {
      rooms: true,
      items: {
        include: {
          milestones: true,
          receipts: true,
          notes: true,
        },
      },
      issues: true,
    },
  });

  console.log(`  Found ${subProjects.length} sub-projects to migrate`);

  for (const sp of subProjects) {
    // 1. Create root node from SubProject
    const rootNode = await prisma.projectNode.create({
      data: {
        name: sp.name,
        nodeType: sp.type as any, // enum values match 1:1
        status: sp.status as any, // enum values match 1:1
        startDate: sp.startDate,
        endDate: sp.endDate,
        parentId: null,
        projectId: sp.projectId,
        createdAt: sp.createdAt,
      },
    });
    spToNode.set(sp.id, rootNode.id);
    console.log(`  ✓ SubProject "${sp.name}" → Node ${rootNode.id}`);

    // 2. Migrate room links
    for (const spr of sp.rooms) {
      await prisma.nodeRoom.create({
        data: { nodeId: rootNode.id, roomId: spr.roomId },
      });
    }
    if (sp.rooms.length > 0) console.log(`    ↳ ${sp.rooms.length} room links`);

    // 3. Migrate issues to root node
    for (const issue of sp.issues) {
      await prisma.issue.update({
        where: { id: issue.id },
        data: { nodeId: rootNode.id },
      });
    }
    if (sp.issues.length > 0) console.log(`    ↳ ${sp.issues.length} issues`);

    // 4. Migrate items as child nodes
    for (const item of sp.items) {
      const leafNode = await prisma.projectNode.create({
        data: {
          name: item.name,
          nodeType: null, // items don't have their own type
          status: item.status as any, // enum values match 1:1
          expectedCost: item.expectedCost,
          actualCost: item.actualCost,
          expectedDate: item.expectedDate,
          completedDate: item.completedDate,
          parentId: rootNode.id,
          projectId: sp.projectId,
          vendorId: item.vendorId,
          createdAt: item.createdAt,
        },
      });
      itemToNode.set(item.id, leafNode.id);

      // 5. Migrate milestones
      for (const m of item.milestones) {
        await prisma.paymentMilestone.update({
          where: { id: m.id },
          data: { nodeId: leafNode.id },
        });
      }

      // 6. Migrate receipts
      for (const r of item.receipts) {
        await prisma.receipt.update({
          where: { id: r.id },
          data: { nodeId: leafNode.id },
        });
      }

      // 7. Migrate notes
      for (const n of item.notes) {
        await prisma.note.update({
          where: { id: n.id },
          data: { nodeId: leafNode.id },
        });
      }

      const extras = [
        item.milestones.length > 0 ? `${item.milestones.length}ms` : "",
        item.receipts.length > 0 ? `${item.receipts.length}rc` : "",
        item.notes.length > 0 ? `${item.notes.length}nt` : "",
      ].filter(Boolean).join(", ");

      console.log(`    ↳ Item "${item.name}" → Node ${leafNode.id}${extras ? ` (${extras})` : ""}`);
    }
  }

  // ── Verification ──
  console.log("\n🔍 Verifying migration...\n");

  const totalNodes = await prisma.projectNode.count();
  const rootNodes = await prisma.projectNode.count({ where: { parentId: null } });
  const leafNodes = await prisma.projectNode.count({ where: { NOT: { parentId: null } } });
  const totalOldSP = await prisma.subProject.count();
  const totalOldItems = await prisma.item.count();

  console.log(`  Nodes created: ${totalNodes} (${rootNodes} root + ${leafNodes} leaf)`);
  console.log(`  Old SubProjects: ${totalOldSP}, Old Items: ${totalOldItems}`);

  const ok = rootNodes === totalOldSP && leafNodes === totalOldItems;
  console.log(`  Count match: ${ok ? "✅ YES" : "❌ NO"}`);

  // Check all milestones have nodeId
  const orphanMs = await prisma.paymentMilestone.count({ where: { nodeId: null } });
  console.log(`  Orphan milestones (no nodeId): ${orphanMs === 0 ? "✅ 0" : `❌ ${orphanMs}`}`);

  const orphanRc = await prisma.receipt.count({ where: { nodeId: null } });
  console.log(`  Orphan receipts (no nodeId): ${orphanRc === 0 ? "✅ 0" : `❌ ${orphanRc}`}`);

  const orphanNt = await prisma.note.count({ where: { nodeId: null } });
  console.log(`  Orphan notes (no nodeId): ${orphanNt === 0 ? "✅ 0" : `❌ ${orphanNt}`}`);

  const orphanIs = await prisma.issue.count({ where: { nodeId: null } });
  console.log(`  Orphan issues (no nodeId): ${orphanIs === 0 ? "✅ 0" : `❌ ${orphanIs}`}`);

  const nodeRooms = await prisma.nodeRoom.count();
  const oldSPRooms = await prisma.subProjectRoom.count();
  console.log(`  Room links: ${nodeRooms} new / ${oldSPRooms} old — ${nodeRooms === oldSPRooms ? "✅ match" : "❌ mismatch"}`);

  if (ok && orphanMs === 0 && orphanRc === 0 && orphanNt === 0 && orphanIs === 0) {
    console.log("\n✅ Migration complete — all data verified!\n");
  } else {
    console.log("\n❌ Migration has issues — check above\n");
    process.exit(1);
  }
}

main()
  .catch((e) => { console.error("Migration failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
