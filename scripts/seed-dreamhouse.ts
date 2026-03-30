/**
 * Seed Script: Dream House Renovation
 *
 * Creates a full showcase project with 12 rooms, 10 vendors, 8 categories,
 * 12 task groups, 40+ items, milestones, and issues.
 *
 * Run: npx tsx scripts/seed-dreamhouse.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const OWNER_USER_ID = "cmnac3y1u001904l1lpqvrtzg";
const PROJECT_NAME = "Dream House Renovation";

async function main() {
  console.log("🏠 Seeding Dream House Renovation project\n");

  // ── 1. Delete existing project if present ─────────────────
  const existing = await prisma.project.findFirst({
    where: { name: PROJECT_NAME },
  });
  if (existing) {
    console.log(`🗑  Deleting existing project: ${existing.id}`);
    await prisma.project.delete({ where: { id: existing.id } });
    console.log("   Deleted (cascade removed all related data)\n");
  }

  // ── 2. Create project ─────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      name: PROJECT_NAME,
      totalBudget: 750000,
      isPublic: true,
    },
  });
  console.log(`✅ Project created: ${project.id}`);

  // ── 3. Create ProjectMember (OWNER) ───────────────────────
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: OWNER_USER_ID,
      role: "OWNER",
    },
  });
  console.log("✅ Owner membership created");

  // ── 4. Create floors & rooms ──────────────────────────────
  const groundFloor = await prisma.floor.create({
    data: {
      name: "Ground Floor",
      sortOrder: 0,
      projectId: project.id,
    },
  });

  const upperFloor = await prisma.floor.create({
    data: {
      name: "Upper Floor",
      sortOrder: 1,
      projectId: project.id,
    },
  });

  // Ground floor rooms
  const livingRoom = await prisma.room.create({
    data: { name: "Living Room", type: "ROOM", floorId: groundFloor.id },
  });
  const kitchen = await prisma.room.create({
    data: { name: "Kitchen", type: "ROOM", floorId: groundFloor.id },
  });
  const diningArea = await prisma.room.create({
    data: { name: "Dining Area", type: "ROOM", floorId: groundFloor.id },
  });
  const guestBathroom = await prisma.room.create({
    data: { name: "Guest Bathroom", type: "ROOM", floorId: groundFloor.id },
  });
  const homeOffice = await prisma.room.create({
    data: { name: "Home Office", type: "ROOM", floorId: groundFloor.id },
  });
  const frontPorch = await prisma.room.create({
    data: { name: "Front Porch", type: "BALCONY", floorId: groundFloor.id },
  });

  // Upper floor rooms
  const masterBedroom = await prisma.room.create({
    data: { name: "Master Bedroom", type: "ROOM", floorId: upperFloor.id },
  });
  const masterBathroom = await prisma.room.create({
    data: { name: "Master Bathroom", type: "ROOM", floorId: upperFloor.id },
  });
  const kidsRoom1 = await prisma.room.create({
    data: { name: "Kids Room 1", type: "ROOM", floorId: upperFloor.id },
  });
  const kidsRoom2 = await prisma.room.create({
    data: { name: "Kids Room 2", type: "ROOM", floorId: upperFloor.id },
  });
  const familyBathroom = await prisma.room.create({
    data: { name: "Family Bathroom", type: "ROOM", floorId: upperFloor.id },
  });
  const roofTerrace = await prisma.room.create({
    data: { name: "Roof Terrace", type: "BALCONY", floorId: upperFloor.id },
  });

  console.log("✅ 2 floors, 12 rooms created");

  // ── 5. Create vendors ─────────────────────────────────────
  const vYossi = await prisma.vendor.create({
    data: { name: "Yossi Plumbing Ltd", category: "Plumbing", phone: "052-3334567", projectId: project.id },
  });
  const vElectro = await prisma.vendor.create({
    data: { name: "ElectroPro", category: "Electrical", phone: "054-7778899", projectId: project.id },
  });
  const vShmulik = await prisma.vendor.create({
    data: { name: "Shmulik Carpentry", category: "Carpentry", phone: "050-2221111", projectId: project.id },
  });
  const vCoatMaster = await prisma.vendor.create({
    data: { name: "CoatMaster Painting", category: "Painting", phone: "053-6665544", projectId: project.id },
  });
  const vTileWorld = await prisma.vendor.create({
    data: { name: "TileWorld", category: "Flooring & Tiles", phone: "058-9998877", projectId: project.id },
  });
  const vSmartHome = await prisma.vendor.create({
    data: { name: "SmartHome IL", category: "Smart Home", phone: "052-1112233", projectId: project.id },
  });
  const vAluDesign = await prisma.vendor.create({
    data: { name: "AluDesign Windows", category: "Windows & Doors", phone: "054-4445566", projectId: project.id },
  });
  const vCoolAir = await prisma.vendor.create({
    data: { name: "CoolAir HVAC", category: "HVAC", phone: "050-8887766", projectId: project.id },
  });
  const vGranitePro = await prisma.vendor.create({
    data: { name: "GranitePro Counters", category: "Kitchen", phone: "053-3332211", projectId: project.id },
  });
  const vLightStudio = await prisma.vendor.create({
    data: { name: "LightStudio", category: "Lighting", phone: "058-5554433", projectId: project.id },
  });

  console.log("✅ 10 vendors created");

  // ── 6. Create categories ──────────────────────────────────
  const catPlumbing = await prisma.category.create({
    data: { name: "Plumbing", projectId: project.id },
  });
  const catElectrical = await prisma.category.create({
    data: { name: "Electrical", projectId: project.id },
  });
  const catCarpentry = await prisma.category.create({
    data: { name: "Carpentry", projectId: project.id },
  });
  const catPainting = await prisma.category.create({
    data: { name: "Painting", projectId: project.id },
  });
  const catFlooring = await prisma.category.create({
    data: { name: "Flooring", projectId: project.id },
  });
  const catSmartHome = await prisma.category.create({
    data: { name: "Smart Home", projectId: project.id },
  });
  const catHVAC = await prisma.category.create({
    data: { name: "HVAC", projectId: project.id },
  });
  const catKitchenBath = await prisma.category.create({
    data: { name: "Kitchen & Bath", projectId: project.id },
  });

  console.log("✅ 8 categories created");

  // ── Helper: create a node ─────────────────────────────────
  type NodeInput = {
    name: string;
    parentId?: string | null;
    expectedCost?: number;
    vendorId?: string;
    categoryId?: string;
    status?: string;
    completedDate?: string;
    sortOrder?: number;
    roomIds?: string[];
  };

  async function createNode(input: NodeInput) {
    const node = await prisma.projectNode.create({
      data: {
        name: input.name,
        projectId: project.id,
        parentId: input.parentId ?? null,
        expectedCost: input.expectedCost ?? undefined,
        vendorId: input.vendorId ?? undefined,
        categoryId: input.categoryId ?? undefined,
        status: (input.status as any) ?? "PENDING",
        completedDate: input.completedDate ? new Date(input.completedDate) : undefined,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    // Create room links
    if (input.roomIds && input.roomIds.length > 0) {
      for (const roomId of input.roomIds) {
        await prisma.nodeRoom.create({
          data: { nodeId: node.id, roomId },
        });
      }
    }

    return node;
  }

  // ── Helper: create a milestone ────────────────────────────
  type MilestoneInput = {
    nodeId: string;
    label: string;
    amount: number;
    status: "PAID" | "PENDING" | "DUE" | "OVERDUE";
    paidDate?: string;
    dueDate?: string;
  };

  async function createMilestone(input: MilestoneInput) {
    return prisma.paymentMilestone.create({
      data: {
        nodeId: input.nodeId,
        label: input.label,
        amount: input.amount,
        status: input.status,
        paidDate: input.paidDate ? new Date(input.paidDate) : undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      },
    });
  }

  // ── 7–9. Create groups, items, and milestones ─────────────

  let nodeCount = 0;
  let milestoneCount = 0;

  // ── GROUP 1: Kitchen Renovation ───────────────────────────
  const grpKitchen = await createNode({ name: "Kitchen Renovation", sortOrder: 0 });
  nodeCount++;

  const nCustomCabinets = await createNode({
    name: "Custom cabinets", parentId: grpKitchen.id, expectedCost: 85000,
    vendorId: vShmulik.id, categoryId: catKitchenBath.id, status: "INSTALLED",
    completedDate: "2026-02-15", roomIds: [kitchen.id], sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nCustomCabinets.id, label: "Full payment", amount: 85000, status: "PAID", paidDate: "2026-02-20" });
  milestoneCount++;

  const nGraniteCountertops = await createNode({
    name: "Granite countertops", parentId: grpKitchen.id, expectedCost: 32000,
    vendorId: vGranitePro.id, categoryId: catKitchenBath.id, status: "INSTALLED",
    completedDate: "2026-03-01", roomIds: [kitchen.id], sortOrder: 1,
  });
  nodeCount++;
  await createMilestone({ nodeId: nGraniteCountertops.id, label: "Full payment", amount: 32000, status: "PAID", paidDate: "2026-03-05" });
  milestoneCount++;

  const nKitchenSink = await createNode({
    name: "Kitchen sink + faucet", parentId: grpKitchen.id, expectedCost: 8500,
    vendorId: vYossi.id, categoryId: catPlumbing.id, status: "COMPLETED",
    roomIds: [kitchen.id], sortOrder: 2,
  });
  nodeCount++;
  await createMilestone({ nodeId: nKitchenSink.id, label: "Full payment", amount: 8500, status: "PAID", paidDate: "2026-03-10" });
  milestoneCount++;

  const nKitchenAppliances = await createNode({
    name: "Kitchen appliances", parentId: grpKitchen.id, expectedCost: 45000,
    categoryId: catKitchenBath.id, status: "DELIVERED",
    roomIds: [kitchen.id], sortOrder: 3,
  });
  nodeCount++;
  await createMilestone({ nodeId: nKitchenAppliances.id, label: "Deposit", amount: 22500, status: "PAID", paidDate: "2026-02-01" });
  await createMilestone({ nodeId: nKitchenAppliances.id, label: "Balance", amount: 22500, status: "PENDING", dueDate: "2026-04-15" });
  milestoneCount += 2;

  const nKitchenBacksplash = await createNode({
    name: "Kitchen backsplash tiles", parentId: grpKitchen.id, expectedCost: 12000,
    vendorId: vTileWorld.id, categoryId: catFlooring.id, status: "IN_PROGRESS",
    roomIds: [kitchen.id], sortOrder: 4,
  });
  nodeCount++;
  await createMilestone({ nodeId: nKitchenBacksplash.id, label: "Deposit", amount: 3600, status: "PAID", paidDate: "2026-03-15" });
  milestoneCount++;

  const nKitchenLighting = await createNode({
    name: "Kitchen lighting", parentId: grpKitchen.id, expectedCost: 6500,
    vendorId: vLightStudio.id, categoryId: catElectrical.id, status: "PENDING",
    roomIds: [kitchen.id], sortOrder: 5,
  });
  nodeCount++;

  console.log("   ✅ Kitchen Renovation group");

  // ── GROUP 2: Bathrooms ────────────────────────────────────
  const grpBathrooms = await createNode({ name: "Bathrooms", sortOrder: 1 });
  nodeCount++;

  const nMasterBathReno = await createNode({
    name: "Master bathroom full reno", parentId: grpBathrooms.id, expectedCost: 42000,
    vendorId: vTileWorld.id, categoryId: catKitchenBath.id, status: "IN_PROGRESS",
    roomIds: [masterBathroom.id], sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nMasterBathReno.id, label: "Deposit 30%", amount: 12600, status: "PAID", paidDate: "2026-03-01" });
  milestoneCount++;

  const nGuestBathReno = await createNode({
    name: "Guest bathroom renovation", parentId: grpBathrooms.id, expectedCost: 18000,
    vendorId: vTileWorld.id, categoryId: catKitchenBath.id, status: "IN_PROGRESS",
    roomIds: [guestBathroom.id], sortOrder: 1,
  });
  nodeCount++;
  await createMilestone({ nodeId: nGuestBathReno.id, label: "Deposit", amount: 5400, status: "PAID", paidDate: "2026-03-10" });
  milestoneCount++;

  const nFamilyBathReno = await createNode({
    name: "Family bathroom renovation", parentId: grpBathrooms.id, expectedCost: 28000,
    vendorId: vTileWorld.id, categoryId: catKitchenBath.id, status: "NOT_STARTED",
    roomIds: [familyBathroom.id], sortOrder: 2,
  });
  nodeCount++;

  const nBathFixtures = await createNode({
    name: "Bathroom fixtures (3 sets)", parentId: grpBathrooms.id, expectedCost: 15000,
    vendorId: vYossi.id, categoryId: catPlumbing.id, status: "ORDERED",
    roomIds: [masterBathroom.id, guestBathroom.id, familyBathroom.id], sortOrder: 3,
  });
  nodeCount++;

  console.log("   ✅ Bathrooms group");

  // ── GROUP 3: Flooring ─────────────────────────────────────
  const grpFlooring = await createNode({ name: "Flooring", sortOrder: 2 });
  nodeCount++;

  const nLivingParquet = await createNode({
    name: "Living room oak parquet", parentId: grpFlooring.id, expectedCost: 38000,
    vendorId: vTileWorld.id, categoryId: catFlooring.id, status: "INSTALLED",
    roomIds: [livingRoom.id], sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nLivingParquet.id, label: "Full payment", amount: 38000, status: "PAID", paidDate: "2026-01-20" });
  milestoneCount++;

  const nBedroomParquet = await createNode({
    name: "Bedroom parquet (3 rooms)", parentId: grpFlooring.id, expectedCost: 42000,
    vendorId: vTileWorld.id, categoryId: catFlooring.id, status: "IN_PROGRESS",
    roomIds: [masterBedroom.id, kidsRoom1.id, kidsRoom2.id], sortOrder: 1,
  });
  nodeCount++;
  await createMilestone({ nodeId: nBedroomParquet.id, label: "Material", amount: 21000, status: "PAID", paidDate: "2026-02-15" });
  await createMilestone({ nodeId: nBedroomParquet.id, label: "Installation", amount: 21000, status: "PENDING", dueDate: "2026-04-10" });
  milestoneCount += 2;

  const nKitchenDiningTiles = await createNode({
    name: "Kitchen + dining porcelain tiles", parentId: grpFlooring.id, expectedCost: 22000,
    vendorId: vTileWorld.id, categoryId: catFlooring.id, status: "COMPLETED",
    roomIds: [kitchen.id, diningArea.id], sortOrder: 2,
  });
  nodeCount++;
  await createMilestone({ nodeId: nKitchenDiningTiles.id, label: "Full payment", amount: 22000, status: "PAID", paidDate: "2026-02-01" });
  milestoneCount++;

  const nBathroomTiles = await createNode({
    name: "Bathroom tiles (3 rooms)", parentId: grpFlooring.id, expectedCost: 18000,
    vendorId: vTileWorld.id, categoryId: catFlooring.id, status: "IN_PROGRESS",
    roomIds: [masterBathroom.id, guestBathroom.id, familyBathroom.id], sortOrder: 3,
  });
  nodeCount++;

  const nTerraceTiles = await createNode({
    name: "Terrace outdoor tiles", parentId: grpFlooring.id, expectedCost: 14000,
    vendorId: vTileWorld.id, categoryId: catFlooring.id, status: "PENDING",
    roomIds: [roofTerrace.id], sortOrder: 4,
  });
  nodeCount++;

  console.log("   ✅ Flooring group");

  // ── GROUP 4: Electrical ───────────────────────────────────
  const grpElectrical = await createNode({ name: "Electrical", sortOrder: 3 });
  nodeCount++;

  const nRewiring = await createNode({
    name: "Full rewiring", parentId: grpElectrical.id, expectedCost: 35000,
    vendorId: vElectro.id, categoryId: catElectrical.id, status: "COMPLETED",
    sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nRewiring.id, label: "Full payment", amount: 35000, status: "PAID", paidDate: "2026-01-15" });
  milestoneCount++;

  const nPanelUpgrade = await createNode({
    name: "Electrical panel upgrade", parentId: grpElectrical.id, expectedCost: 8000,
    vendorId: vElectro.id, categoryId: catElectrical.id, status: "COMPLETED",
    sortOrder: 1,
  });
  nodeCount++;
  await createMilestone({ nodeId: nPanelUpgrade.id, label: "Full payment", amount: 8000, status: "PAID", paidDate: "2026-01-20" });
  milestoneCount++;

  const nRecessedLighting = await createNode({
    name: "Recessed lighting (20 units)", parentId: grpElectrical.id, expectedCost: 12000,
    vendorId: vLightStudio.id, categoryId: catElectrical.id, status: "IN_PROGRESS",
    sortOrder: 2,
  });
  nodeCount++;
  await createMilestone({ nodeId: nRecessedLighting.id, label: "Deposit", amount: 3600, status: "PAID", paidDate: "2026-03-01" });
  milestoneCount++;

  const nOutdoorLighting = await createNode({
    name: "Outdoor lighting", parentId: grpElectrical.id, expectedCost: 7500,
    vendorId: vLightStudio.id, categoryId: catElectrical.id, status: "PENDING",
    roomIds: [frontPorch.id, roofTerrace.id], sortOrder: 3,
  });
  nodeCount++;

  const nElectricBlinds = await createNode({
    name: "Electric blinds (8 windows)", parentId: grpElectrical.id, expectedCost: 16000,
    vendorId: vSmartHome.id, categoryId: catSmartHome.id, status: "ORDERED",
    sortOrder: 4,
  });
  nodeCount++;
  await createMilestone({ nodeId: nElectricBlinds.id, label: "Deposit", amount: 4800, status: "PAID", paidDate: "2026-03-20" });
  milestoneCount++;

  console.log("   ✅ Electrical group");

  // ── GROUP 5: Plumbing ─────────────────────────────────────
  const grpPlumbing = await createNode({ name: "Plumbing", sortOrder: 4 });
  nodeCount++;

  const nMainPipe = await createNode({
    name: "Main pipe replacement", parentId: grpPlumbing.id, expectedCost: 22000,
    vendorId: vYossi.id, categoryId: catPlumbing.id, status: "COMPLETED",
    sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nMainPipe.id, label: "Full payment", amount: 22000, status: "PAID", paidDate: "2026-01-10" });
  milestoneCount++;

  const nHotWater = await createNode({
    name: "Hot water system (solar)", parentId: grpPlumbing.id, expectedCost: 18000,
    vendorId: vYossi.id, categoryId: catPlumbing.id, status: "INSTALLED",
    roomIds: [roofTerrace.id], sortOrder: 1,
  });
  nodeCount++;
  await createMilestone({ nodeId: nHotWater.id, label: "Full payment", amount: 18000, status: "PAID", paidDate: "2026-02-10" });
  milestoneCount++;

  const nUnderfloorHeating = await createNode({
    name: "Underfloor heating (master)", parentId: grpPlumbing.id, expectedCost: 9500,
    vendorId: vYossi.id, categoryId: catPlumbing.id, status: "IN_PROGRESS",
    roomIds: [masterBedroom.id], sortOrder: 2,
  });
  nodeCount++;

  console.log("   ✅ Plumbing group");

  // ── GROUP 6: Windows & Doors ──────────────────────────────
  const grpWindows = await createNode({ name: "Windows & Doors", sortOrder: 5 });
  nodeCount++;

  const nAluminumWindows = await createNode({
    name: "Aluminum windows (12 units)", parentId: grpWindows.id, expectedCost: 48000,
    vendorId: vAluDesign.id, categoryId: catCarpentry.id, status: "INSTALLED",
    sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nAluminumWindows.id, label: "Deposit", amount: 14400, status: "PAID", paidDate: "2026-01-05" });
  await createMilestone({ nodeId: nAluminumWindows.id, label: "Installation", amount: 19200, status: "PAID", paidDate: "2026-02-20" });
  await createMilestone({ nodeId: nAluminumWindows.id, label: "Balance", amount: 14400, status: "PENDING", dueDate: "2026-04-20" });
  milestoneCount += 3;

  const nFrontDoor = await createNode({
    name: "Front door (security)", parentId: grpWindows.id, expectedCost: 12000,
    vendorId: vAluDesign.id, categoryId: catCarpentry.id, status: "DELIVERED",
    roomIds: [frontPorch.id], sortOrder: 1,
  });
  nodeCount++;
  await createMilestone({ nodeId: nFrontDoor.id, label: "Full payment", amount: 12000, status: "PAID", paidDate: "2026-02-25" });
  milestoneCount++;

  const nInteriorDoors = await createNode({
    name: "Interior doors (8 units)", parentId: grpWindows.id, expectedCost: 24000,
    vendorId: vShmulik.id, categoryId: catCarpentry.id, status: "ORDERED",
    sortOrder: 2,
  });
  nodeCount++;
  await createMilestone({ nodeId: nInteriorDoors.id, label: "Deposit", amount: 7200, status: "PAID", paidDate: "2026-03-15" });
  milestoneCount++;

  const nSlidingDoor = await createNode({
    name: "Sliding terrace door", parentId: grpWindows.id, expectedCost: 15000,
    vendorId: vAluDesign.id, categoryId: catCarpentry.id, status: "PENDING",
    roomIds: [roofTerrace.id], sortOrder: 3,
  });
  nodeCount++;

  console.log("   ✅ Windows & Doors group");

  // ── GROUP 7: Painting ─────────────────────────────────────
  const grpPainting = await createNode({ name: "Painting", sortOrder: 6 });
  nodeCount++;

  const nInteriorPainting = await createNode({
    name: "Interior painting (all rooms)", parentId: grpPainting.id, expectedCost: 28000,
    vendorId: vCoatMaster.id, categoryId: catPainting.id, status: "NOT_STARTED",
    sortOrder: 0,
  });
  nodeCount++;

  const nExteriorPainting = await createNode({
    name: "Exterior painting", parentId: grpPainting.id, expectedCost: 18000,
    vendorId: vCoatMaster.id, categoryId: catPainting.id, status: "NOT_STARTED",
    sortOrder: 1,
  });
  nodeCount++;

  const nSpecialtyWall = await createNode({
    name: "Specialty wall treatments", parentId: grpPainting.id, expectedCost: 8000,
    vendorId: vCoatMaster.id, categoryId: catPainting.id, status: "NOT_STARTED",
    roomIds: [livingRoom.id], sortOrder: 2,
  });
  nodeCount++;

  console.log("   ✅ Painting group");

  // ── GROUP 8: HVAC ─────────────────────────────────────────
  const grpHVAC = await createNode({ name: "HVAC", sortOrder: 7 });
  nodeCount++;

  const nCentralAC = await createNode({
    name: "Central AC system", parentId: grpHVAC.id, expectedCost: 45000,
    vendorId: vCoolAir.id, categoryId: catHVAC.id, status: "IN_PROGRESS",
    sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nCentralAC.id, label: "Equipment", amount: 18000, status: "PAID", paidDate: "2026-03-01" });
  await createMilestone({ nodeId: nCentralAC.id, label: "Installation", amount: 18000, status: "PENDING", dueDate: "2026-04-30" });
  milestoneCount += 2;

  const nACDucts = await createNode({
    name: "AC ducts + vents", parentId: grpHVAC.id, expectedCost: 12000,
    vendorId: vCoolAir.id, categoryId: catHVAC.id, status: "IN_PROGRESS",
    sortOrder: 1,
  });
  nodeCount++;

  const nBathVentilation = await createNode({
    name: "Bathroom ventilation", parentId: grpHVAC.id, expectedCost: 4500,
    vendorId: vCoolAir.id, categoryId: catHVAC.id, status: "PENDING",
    sortOrder: 2,
  });
  nodeCount++;

  console.log("   ✅ HVAC group");

  // ── GROUP 9: Smart Home ───────────────────────────────────
  const grpSmartHome = await createNode({ name: "Smart Home", sortOrder: 8 });
  nodeCount++;

  const nSmartSwitches = await createNode({
    name: "Smart switches (30 units)", parentId: grpSmartHome.id, expectedCost: 9000,
    vendorId: vSmartHome.id, categoryId: catSmartHome.id, status: "DELIVERED",
    sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nSmartSwitches.id, label: "Full payment", amount: 9000, status: "PAID", paidDate: "2026-02-28" });
  milestoneCount++;

  const nCentralHub = await createNode({
    name: "Central hub + app", parentId: grpSmartHome.id, expectedCost: 4500,
    vendorId: vSmartHome.id, categoryId: catSmartHome.id, status: "INSTALLED",
    sortOrder: 1,
  });
  nodeCount++;
  await createMilestone({ nodeId: nCentralHub.id, label: "Full payment", amount: 4500, status: "PAID", paidDate: "2026-03-05" });
  milestoneCount++;

  const nSecurityCameras = await createNode({
    name: "Security cameras (6)", parentId: grpSmartHome.id, expectedCost: 8500,
    vendorId: vSmartHome.id, categoryId: catSmartHome.id, status: "IN_PROGRESS",
    sortOrder: 2,
  });
  nodeCount++;
  await createMilestone({ nodeId: nSecurityCameras.id, label: "Deposit", amount: 2550, status: "PAID", paidDate: "2026-03-20" });
  milestoneCount++;

  const nSmartThermostat = await createNode({
    name: "Smart thermostat", parentId: grpSmartHome.id, expectedCost: 3200,
    vendorId: vSmartHome.id, categoryId: catSmartHome.id, status: "PENDING",
    sortOrder: 3,
  });
  nodeCount++;

  const nSmartDoorLock = await createNode({
    name: "Smart door lock", parentId: grpSmartHome.id, expectedCost: 2800,
    vendorId: vSmartHome.id, categoryId: catSmartHome.id, status: "ORDERED",
    roomIds: [frontPorch.id], sortOrder: 4,
  });
  nodeCount++;

  console.log("   ✅ Smart Home group");

  // ── GROUP 10: Carpentry & Built-ins ───────────────────────
  const grpCarpentry = await createNode({ name: "Carpentry & Built-ins", sortOrder: 9 });
  nodeCount++;

  const nWalkInCloset = await createNode({
    name: "Walk-in closet (master)", parentId: grpCarpentry.id, expectedCost: 22000,
    vendorId: vShmulik.id, categoryId: catCarpentry.id, status: "IN_PROGRESS",
    roomIds: [masterBedroom.id], sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nWalkInCloset.id, label: "Deposit", amount: 6600, status: "PAID", paidDate: "2026-03-10" });
  milestoneCount++;

  const nKidsWardrobes = await createNode({
    name: "Kids room wardrobes", parentId: grpCarpentry.id, expectedCost: 16000,
    vendorId: vShmulik.id, categoryId: catCarpentry.id, status: "NOT_STARTED",
    roomIds: [kidsRoom1.id, kidsRoom2.id], sortOrder: 1,
  });
  nodeCount++;

  const nOfficeDesk = await createNode({
    name: "Office built-in desk", parentId: grpCarpentry.id, expectedCost: 8500,
    vendorId: vShmulik.id, categoryId: catCarpentry.id, status: "NOT_STARTED",
    roomIds: [homeOffice.id], sortOrder: 2,
  });
  nodeCount++;

  const nTVUnit = await createNode({
    name: "Living room TV unit", parentId: grpCarpentry.id, expectedCost: 12000,
    vendorId: vShmulik.id, categoryId: catCarpentry.id, status: "ORDERED",
    roomIds: [livingRoom.id], sortOrder: 3,
  });
  nodeCount++;
  await createMilestone({ nodeId: nTVUnit.id, label: "Deposit", amount: 3600, status: "PAID", paidDate: "2026-03-25" });
  milestoneCount++;

  console.log("   ✅ Carpentry & Built-ins group");

  // ── GROUP 11: Staircase ───────────────────────────────────
  const grpStaircase = await createNode({ name: "Staircase", sortOrder: 10 });
  nodeCount++;

  const nWoodenStaircase = await createNode({
    name: "Wooden staircase", parentId: grpStaircase.id, expectedCost: 28000,
    vendorId: vShmulik.id, categoryId: catCarpentry.id, status: "IN_PROGRESS",
    sortOrder: 0,
  });
  nodeCount++;
  await createMilestone({ nodeId: nWoodenStaircase.id, label: "Deposit", amount: 14000, status: "PAID", paidDate: "2026-02-20" });
  await createMilestone({ nodeId: nWoodenStaircase.id, label: "Balance", amount: 14000, status: "PENDING", dueDate: "2026-04-15" });
  milestoneCount += 2;

  const nStaircaseRailing = await createNode({
    name: "Staircase railing (glass)", parentId: grpStaircase.id, expectedCost: 15000,
    vendorId: vAluDesign.id, categoryId: catCarpentry.id, status: "PENDING",
    sortOrder: 1,
  });
  nodeCount++;

  console.log("   ✅ Staircase group");

  // ── GROUP 12: Outdoor ─────────────────────────────────────
  const grpOutdoor = await createNode({ name: "Outdoor", sortOrder: 11 });
  nodeCount++;

  const nGardenLandscaping = await createNode({
    name: "Garden landscaping", parentId: grpOutdoor.id, expectedCost: 18000,
    vendorId: vCoatMaster.id, categoryId: catPainting.id, status: "NOT_STARTED",
    roomIds: [frontPorch.id], sortOrder: 0,
  });
  nodeCount++;

  const nPergola = await createNode({
    name: "Pergola", parentId: grpOutdoor.id, expectedCost: 14000,
    vendorId: vShmulik.id, categoryId: catCarpentry.id, status: "PENDING",
    roomIds: [roofTerrace.id], sortOrder: 1,
  });
  nodeCount++;

  const nOutdoorKitchen = await createNode({
    name: "Outdoor kitchen", parentId: grpOutdoor.id, expectedCost: 12000,
    vendorId: vGranitePro.id, categoryId: catKitchenBath.id, status: "NOT_STARTED",
    roomIds: [roofTerrace.id], sortOrder: 2,
  });
  nodeCount++;

  console.log("   ✅ Outdoor group");

  // ── 10. Create issues ─────────────────────────────────────
  await prisma.issue.create({
    data: {
      title: "Water stain on living room ceiling",
      nodeId: nMainPipe.id,
      status: "OPEN",
    },
  });

  await prisma.issue.create({
    data: {
      title: "Cracked tile in guest bathroom",
      nodeId: nGuestBathReno.id,
      status: "OPEN",
    },
  });

  await prisma.issue.create({
    data: {
      title: "Window seal leaking (master bedroom)",
      nodeId: nAluminumWindows.id,
      status: "IN_PROGRESS",
    },
  });

  await prisma.issue.create({
    data: {
      title: "Electrical outlet placement wrong in office",
      nodeId: nRewiring.id,
      status: "RESOLVED",
    },
  });

  await prisma.issue.create({
    data: {
      title: "Delay on interior doors delivery",
      nodeId: nInteriorDoors.id,
      status: "OPEN",
    },
  });

  console.log("✅ 5 issues created");

  // ── 11. Summary ───────────────────────────────────────────
  console.log("\n════════════════════════════════════════════");
  console.log("🏠 Dream House Renovation — Seed Complete!");
  console.log("════════════════════════════════════════════");
  console.log(`   Project ID:  ${project.id}`);
  console.log(`   Floors:      2`);
  console.log(`   Rooms:       12`);
  console.log(`   Vendors:     10`);
  console.log(`   Categories:  8`);
  console.log(`   Nodes:       ${nodeCount} (12 groups + ${nodeCount - 12} items)`);
  console.log(`   Milestones:  ${milestoneCount}`);
  console.log(`   Issues:      5`);
  console.log("════════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
