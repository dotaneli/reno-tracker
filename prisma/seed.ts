import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.item.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.pendingInbox.deleteMany();
  await prisma.project.deleteMany();

  // 1. Project
  const project = await prisma.project.create({
    data: {
      name: "Givatayim Penthouse Renovation",
      totalBudget: 500_000,
    },
  });
  console.log(`  Project: ${project.name} (budget: ${project.totalBudget})`);

  // 2. Phases
  const [flooring, av, carpentry, smartHome] = await Promise.all([
    prisma.phase.create({
      data: { name: "Flooring", projectId: project.id },
    }),
    prisma.phase.create({
      data: { name: "Audio/Visual", projectId: project.id },
    }),
    prisma.phase.create({
      data: { name: "Carpentry", projectId: project.id },
    }),
    prisma.phase.create({
      data: { name: "Smart Home", projectId: project.id },
    }),
  ]);
  console.log(`  Phases: Flooring, Audio/Visual, Carpentry, Smart Home`);

  // 3. Vendors
  const [yurista, simplyWood, monitorAudio] = await Promise.all([
    prisma.vendor.create({
      data: { name: "Yurista", category: "Flooring" },
    }),
    prisma.vendor.create({
      data: { name: "Simply Wood", category: "Carpentry" },
    }),
    prisma.vendor.create({
      data: { name: "Monitor Audio", category: "Audio/Visual" },
    }),
  ]);
  console.log(`  Vendors: Yurista, Simply Wood, Monitor Audio`);

  // 4. Items
  await Promise.all([
    prisma.item.create({
      data: {
        name: "Natural oak three-layer parquet",
        phaseId: flooring.id,
        vendorId: yurista.id,
      },
    }),
    prisma.item.create({
      data: {
        name: "5.1 surround sound system & balcony stereo",
        phaseId: av.id,
        vendorId: monitorAudio.id,
      },
    }),
    prisma.item.create({
      data: {
        name: "85-inch slim TV without One Connect box",
        phaseId: av.id,
      },
    }),
    prisma.item.create({
      data: {
        name: "22 Zigbee smart switches",
        phaseId: smartHome.id,
      },
    }),
  ]);
  console.log(`  Items: 4 items created`);

  // 5. Issue
  await prisma.issue.create({
    data: {
      title: "Balcony water leak to neighbor below",
      status: "OPEN",
      phaseId: flooring.id,
    },
  });
  console.log(`  Issues: 1 unresolved issue created`);

  console.log("\n✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
