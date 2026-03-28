import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database (ProjectNode model)...\n");

  // 1. Project
  const project = await prisma.project.create({
    data: {
      name: "Givatayim Penthouse Renovation",
      totalBudget: 500_000,
      expectedStartDate: new Date("2026-04-01"),
      expectedEndDate: new Date("2026-09-30"),
    },
  });
  console.log(`  Project: ${project.name}`);

  // 2. Floor
  const mainFloor = await prisma.floor.create({
    data: { name: "Main Floor", sortOrder: 0, projectId: project.id },
  });

  // 3. Rooms
  const roomData = [
    { name: "Living Room", type: "ROOM" as const },
    { name: "Kitchen", type: "ROOM" as const },
    { name: "Master Bedroom", type: "ROOM" as const },
    { name: "Master Bathroom", type: "ROOM" as const },
    { name: "Guest Bathroom", type: "ROOM" as const },
    { name: "Office", type: "ROOM" as const },
    { name: "Hallway", type: "ROOM" as const },
    { name: "Front Balcony", type: "BALCONY" as const },
    { name: "Rear Balcony", type: "BALCONY" as const },
  ];
  const rooms: Record<string, string> = {};
  for (const r of roomData) {
    const room = await prisma.room.create({ data: { name: r.name, type: r.type, floorId: mainFloor.id } });
    rooms[r.name] = room.id;
  }
  console.log(`  Rooms: ${roomData.length}`);

  // 4. Vendors (project-scoped)
  const [yurista, simplyWood, monitorAudio] = await Promise.all([
    prisma.vendor.create({ data: { name: "Yurista", category: "Flooring", projectId: project.id } }),
    prisma.vendor.create({ data: { name: "Simply Wood", category: "Carpentry", projectId: project.id } }),
    prisma.vendor.create({ data: { name: "Monitor Audio", category: "Audio/Visual", projectId: project.id } }),
  ]);
  console.log(`  Vendors: 3`);

  // 5. Root nodes (groups — was SubProject)
  const flooring = await prisma.projectNode.create({
    data: {
      name: "Flooring", nodeType: "FLOORING", status: "IN_PROGRESS",
      startDate: new Date("2026-04-15"), projectId: project.id,
      rooms: { create: ["Living Room", "Kitchen", "Master Bedroom", "Hallway"].map(n => ({ roomId: rooms[n] })) },
    },
  });
  const av = await prisma.projectNode.create({
    data: {
      name: "Audio/Visual", nodeType: "AUDIO_VISUAL", projectId: project.id,
      rooms: { create: [{ roomId: rooms["Living Room"] }] },
    },
  });
  const carpentry = await prisma.projectNode.create({
    data: {
      name: "Carpentry", nodeType: "CARPENTRY", projectId: project.id,
      rooms: { create: ["Kitchen", "Master Bedroom", "Office"].map(n => ({ roomId: rooms[n] })) },
    },
  });
  const smartHome = await prisma.projectNode.create({
    data: {
      name: "Smart Home", nodeType: "SMART_HOME", projectId: project.id,
      rooms: { create: Object.values(rooms).map(roomId => ({ roomId })) },
    },
  });
  console.log(`  Root nodes: 4 (Flooring, A/V, Carpentry, Smart Home)`);

  // 6. Leaf nodes (items — children of root nodes)
  const parquet = await prisma.projectNode.create({
    data: {
      name: "Natural oak three-layer parquet", status: "ORDERED",
      expectedCost: 45_000, expectedDate: new Date("2026-05-01"),
      parentId: flooring.id, projectId: project.id, vendorId: yurista.id,
    },
  });
  const surround = await prisma.projectNode.create({
    data: {
      name: "5.1 surround sound system & balcony stereo",
      expectedCost: 32_000, expectedDate: new Date("2026-06-15"),
      parentId: av.id, projectId: project.id, vendorId: monitorAudio.id,
    },
  });
  const tv = await prisma.projectNode.create({
    data: {
      name: "85-inch slim TV without One Connect box",
      expectedCost: 15_000, expectedDate: new Date("2026-06-01"),
      parentId: av.id, projectId: project.id,
    },
  });
  const switches = await prisma.projectNode.create({
    data: {
      name: "22 Zigbee smart switches", status: "ORDERED",
      expectedCost: 8_800, expectedDate: new Date("2026-05-15"),
      parentId: smartHome.id, projectId: project.id,
    },
  });
  const cabinets = await prisma.projectNode.create({
    data: {
      name: "Custom kitchen cabinets",
      expectedCost: 65_000, expectedDate: new Date("2026-07-01"),
      parentId: carpentry.id, projectId: project.id, vendorId: simplyWood.id,
    },
  });
  console.log(`  Leaf nodes: 5`);

  // 7. Payment milestones
  await prisma.paymentMilestone.createMany({
    data: [
      { label: "Deposit (30%)", amount: 13_500, percentage: 30, dueDate: new Date("2026-04-20"), status: "PAID", paidDate: new Date("2026-04-20"), nodeId: parquet.id },
      { label: "Delivery (40%)", amount: 18_000, percentage: 40, dueDate: new Date("2026-05-01"), status: "PENDING", nodeId: parquet.id },
      { label: "Installation (30%)", amount: 13_500, percentage: 30, dueDate: new Date("2026-05-15"), status: "PENDING", nodeId: parquet.id },
      { label: "Order deposit (50%)", amount: 16_000, percentage: 50, dueDate: new Date("2026-05-10"), status: "PAID", paidDate: new Date("2026-05-10"), nodeId: surround.id },
      { label: "Installation (50%)", amount: 16_000, percentage: 50, dueDate: new Date("2026-06-20"), status: "PENDING", nodeId: surround.id },
      { label: "Full payment", amount: 15_000, dueDate: new Date("2026-06-01"), status: "PENDING", nodeId: tv.id },
      { label: "Full payment", amount: 8_800, dueDate: new Date("2026-05-15"), status: "PENDING", nodeId: switches.id },
      { label: "Design deposit (20%)", amount: 13_000, percentage: 20, dueDate: new Date("2026-04-15"), status: "PAID", paidDate: new Date("2026-04-15"), nodeId: cabinets.id },
      { label: "Materials (30%)", amount: 19_500, percentage: 30, dueDate: new Date("2026-05-20"), status: "PENDING", nodeId: cabinets.id },
      { label: "Completion (50%)", amount: 32_500, percentage: 50, dueDate: new Date("2026-07-15"), status: "PENDING", nodeId: cabinets.id },
    ],
  });
  console.log(`  Milestones: 10`);

  // 8. Issue
  await prisma.issue.create({
    data: {
      title: "Balcony water leak to neighbor below",
      description: "Water seepage from front balcony floor into the apartment below. Need waterproofing membrane replacement.",
      status: "OPEN", nodeId: flooring.id,
    },
  });
  console.log(`  Issues: 1`);

  // 9. Link users if they exist
  for (const email of ["dotaneli@gmail.com", "lipaz.sarusi@gmail.com"]) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const role = email === "dotaneli@gmail.com" ? "OWNER" : "EDITOR";
      await prisma.projectMember.create({ data: { projectId: project.id, userId: user.id, role: role as any } });
      console.log(`  Linked ${user.name || email} as ${role}`);
    }
  }

  console.log("\n✅ Seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
