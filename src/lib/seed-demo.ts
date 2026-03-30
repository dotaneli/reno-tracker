/**
 * Seeds the "Dream House Renovation" demo project for a new user.
 * Called from the createUser auth event when a new user signs up.
 * Creates a complete showcase project with tasks, payments, vendors, etc.
 */
import { prisma } from "./prisma";

export async function seedDemoProject(userId: string) {
  try {
    // Check if user already has this project (idempotent)
    const existing = await prisma.project.findFirst({
      where: { name: "Dream House Renovation", members: { some: { userId } } },
    });
    if (existing) return;

    // ── Project ──
    const project = await prisma.project.create({
      data: {
        name: "Dream House Renovation",
        totalBudget: 750000,
        expectedStartDate: new Date("2026-01-01"),
        expectedEndDate: new Date("2026-09-30"),
        members: { create: { userId, role: "OWNER" } },
      },
    });
    const pid = project.id;

    // ── Floors & Rooms ──
    const gf = await prisma.floor.create({ data: { name: "Ground Floor", sortOrder: 0, projectId: pid } });
    const uf = await prisma.floor.create({ data: { name: "Upper Floor", sortOrder: 1, projectId: pid } });

    const r = async (name: string, floorId: string, type: "ROOM" | "BALCONY" = "ROOM") =>
      prisma.room.create({ data: { name, type, floorId } });

    const living = await r("Living Room", gf.id);
    const kitchen = await r("Kitchen", gf.id);
    const dining = await r("Dining Area", gf.id);
    const guestBath = await r("Guest Bathroom", gf.id);
    const office = await r("Home Office", gf.id);
    const porch = await r("Front Porch", gf.id, "BALCONY");
    const masterBed = await r("Master Bedroom", uf.id);
    const masterBath = await r("Master Bathroom", uf.id);
    const kids1 = await r("Kids Room 1", uf.id);
    const kids2 = await r("Kids Room 2", uf.id);
    const familyBath = await r("Family Bathroom", uf.id);
    const terrace = await r("Roof Terrace", uf.id, "BALCONY");

    // ── Vendors ──
    const v = async (name: string, category: string, phone: string) =>
      prisma.vendor.create({ data: { name, category, phone, projectId: pid } });

    const vYossi = await v("Yossi Plumbing Ltd", "Plumbing", "052-3334567");
    const vElectro = await v("ElectroPro", "Electrical", "054-7778899");
    const vShmulik = await v("Shmulik Carpentry", "Carpentry", "050-2221111");
    const vCoat = await v("CoatMaster Painting", "Painting", "053-6665544");
    const vTile = await v("TileWorld", "Flooring & Tiles", "058-9998877");
    const vSmart = await v("SmartHome IL", "Smart Home", "052-1112233");
    const vAlu = await v("AluDesign Windows", "Windows & Doors", "054-4445566");
    const vCool = await v("CoolAir HVAC", "HVAC", "050-8887766");
    const vGranite = await v("GranitePro Counters", "Kitchen", "053-3332211");
    const vLight = await v("LightStudio", "Lighting", "058-5554433");

    // ── Categories ──
    const c = async (name: string) =>
      prisma.category.create({ data: { name, projectId: pid } });

    const cPlumb = await c("Plumbing");
    const cElec = await c("Electrical");
    const cCarp = await c("Carpentry");
    const cPaint = await c("Painting");
    const cFloor = await c("Flooring");
    const cSmart = await c("Smart Home");
    const cHvac = await c("HVAC");
    const cKitBath = await c("Kitchen & Bath");

    // ── Helper: create node ──
    const node = async (name: string, parentId: string | null, opts: {
      cost?: number; vendorId?: string; categoryId?: string; status?: string;
      roomIds?: string[]; completedDate?: string;
    } = {}) => {
      const n = await prisma.projectNode.create({
        data: {
          name,
          projectId: pid,
          parentId,
          expectedCost: opts.cost,
          vendorId: opts.vendorId,
          categoryId: opts.categoryId,
          status: (opts.status as any) || "PENDING",
          completedDate: opts.completedDate ? new Date(opts.completedDate) : undefined,
          rooms: opts.roomIds?.length ? { create: opts.roomIds.map(roomId => ({ roomId })) } : undefined,
        },
      });
      return n;
    };

    // ── Helper: create milestone ──
    const ms = async (nodeId: string, label: string, amount: number, status: "PAID" | "PENDING", dateStr?: string) => {
      await prisma.paymentMilestone.create({
        data: {
          label, amount, nodeId, status,
          ...(status === "PAID" ? { paidDate: new Date(dateStr || "2026-03-01") } : {}),
          ...(status === "PENDING" ? { dueDate: new Date(dateStr || "2026-05-01") } : {}),
        },
      });
    };

    // ═══════════════ TASK TREE ═══════════════

    // 1. Kitchen
    const gKitchen = await node("Kitchen Renovation", null);
    const nCabinets = await node("Custom cabinets", gKitchen.id, { cost: 85000, vendorId: vShmulik.id, categoryId: cKitBath.id, roomIds: [kitchen.id], status: "INSTALLED", completedDate: "2026-02-15" });
    await ms(nCabinets.id, "Full payment", 85000, "PAID", "2026-02-20");
    const nCounters = await node("Granite countertops", gKitchen.id, { cost: 32000, vendorId: vGranite.id, categoryId: cKitBath.id, roomIds: [kitchen.id], status: "INSTALLED", completedDate: "2026-03-01" });
    await ms(nCounters.id, "Full payment", 32000, "PAID", "2026-03-05");
    const nSink = await node("Kitchen sink + faucet", gKitchen.id, { cost: 8500, vendorId: vYossi.id, categoryId: cPlumb.id, roomIds: [kitchen.id], status: "COMPLETED" });
    await ms(nSink.id, "Full payment", 8500, "PAID", "2026-03-10");
    const nAppliances = await node("Kitchen appliances", gKitchen.id, { cost: 45000, categoryId: cKitBath.id, roomIds: [kitchen.id], status: "DELIVERED" });
    await ms(nAppliances.id, "Deposit", 22500, "PAID", "2026-02-01");
    await ms(nAppliances.id, "Balance", 22500, "PENDING", "2026-04-15");
    const nBacksplash = await node("Kitchen backsplash tiles", gKitchen.id, { cost: 12000, vendorId: vTile.id, categoryId: cFloor.id, roomIds: [kitchen.id], status: "IN_PROGRESS" });
    await ms(nBacksplash.id, "Deposit", 3600, "PAID", "2026-03-15");
    await node("Kitchen lighting", gKitchen.id, { cost: 6500, vendorId: vLight.id, categoryId: cElec.id, roomIds: [kitchen.id], status: "PENDING" });

    // 2. Bathrooms
    const gBath = await node("Bathrooms", null);
    const nMasterBath = await node("Master bathroom full reno", gBath.id, { cost: 42000, vendorId: vTile.id, categoryId: cKitBath.id, roomIds: [masterBath.id], status: "IN_PROGRESS" });
    await ms(nMasterBath.id, "Deposit 30%", 12600, "PAID", "2026-03-01");
    const nGuestBath = await node("Guest bathroom renovation", gBath.id, { cost: 18000, vendorId: vTile.id, categoryId: cKitBath.id, roomIds: [guestBath.id], status: "IN_PROGRESS" });
    await ms(nGuestBath.id, "Deposit", 5400, "PAID", "2026-03-10");
    await node("Family bathroom renovation", gBath.id, { cost: 28000, vendorId: vTile.id, categoryId: cKitBath.id, roomIds: [familyBath.id], status: "NOT_STARTED" });
    await node("Bathroom fixtures (3 sets)", gBath.id, { cost: 15000, vendorId: vYossi.id, categoryId: cPlumb.id, roomIds: [masterBath.id, guestBath.id, familyBath.id], status: "ORDERED" });

    // 3. Flooring
    const gFloor = await node("Flooring", null);
    const nLivingParquet = await node("Living room oak parquet", gFloor.id, { cost: 38000, vendorId: vTile.id, categoryId: cFloor.id, roomIds: [living.id], status: "INSTALLED" });
    await ms(nLivingParquet.id, "Full payment", 38000, "PAID", "2026-01-20");
    const nBedParquet = await node("Bedroom parquet (3 rooms)", gFloor.id, { cost: 42000, vendorId: vTile.id, categoryId: cFloor.id, roomIds: [masterBed.id, kids1.id, kids2.id], status: "IN_PROGRESS" });
    await ms(nBedParquet.id, "Material", 21000, "PAID", "2026-02-15");
    await ms(nBedParquet.id, "Installation", 21000, "PENDING", "2026-04-10");
    const nKitTiles = await node("Kitchen + dining porcelain tiles", gFloor.id, { cost: 22000, vendorId: vTile.id, categoryId: cFloor.id, roomIds: [kitchen.id, dining.id], status: "COMPLETED" });
    await ms(nKitTiles.id, "Full payment", 22000, "PAID", "2026-02-01");
    await node("Bathroom tiles (3 rooms)", gFloor.id, { cost: 18000, vendorId: vTile.id, categoryId: cFloor.id, roomIds: [masterBath.id, guestBath.id, familyBath.id], status: "IN_PROGRESS" });
    await node("Terrace outdoor tiles", gFloor.id, { cost: 14000, vendorId: vTile.id, categoryId: cFloor.id, roomIds: [terrace.id], status: "PENDING" });

    // 4. Electrical
    const gElec = await node("Electrical", null);
    const nRewire = await node("Full rewiring", gElec.id, { cost: 35000, vendorId: vElectro.id, categoryId: cElec.id, status: "COMPLETED" });
    await ms(nRewire.id, "Full payment", 35000, "PAID", "2026-01-15");
    const nPanel = await node("Electrical panel upgrade", gElec.id, { cost: 8000, vendorId: vElectro.id, categoryId: cElec.id, status: "COMPLETED" });
    await ms(nPanel.id, "Full payment", 8000, "PAID", "2026-01-20");
    const nRecessed = await node("Recessed lighting (20 units)", gElec.id, { cost: 12000, vendorId: vLight.id, categoryId: cElec.id, status: "IN_PROGRESS" });
    await ms(nRecessed.id, "Deposit", 3600, "PAID", "2026-03-01");
    await node("Outdoor lighting", gElec.id, { cost: 7500, vendorId: vLight.id, categoryId: cElec.id, roomIds: [porch.id, terrace.id], status: "PENDING" });
    const nBlinds = await node("Electric blinds (8 windows)", gElec.id, { cost: 16000, vendorId: vSmart.id, categoryId: cSmart.id, status: "ORDERED" });
    await ms(nBlinds.id, "Deposit", 4800, "PAID", "2026-03-20");

    // 5. Plumbing
    const gPlumb = await node("Plumbing", null);
    const nPipes = await node("Main pipe replacement", gPlumb.id, { cost: 22000, vendorId: vYossi.id, categoryId: cPlumb.id, status: "COMPLETED" });
    await ms(nPipes.id, "Full payment", 22000, "PAID", "2026-01-10");
    const nSolar = await node("Hot water system (solar)", gPlumb.id, { cost: 18000, vendorId: vYossi.id, categoryId: cPlumb.id, roomIds: [terrace.id], status: "INSTALLED" });
    await ms(nSolar.id, "Full payment", 18000, "PAID", "2026-02-10");
    await node("Underfloor heating (master)", gPlumb.id, { cost: 9500, vendorId: vYossi.id, categoryId: cPlumb.id, roomIds: [masterBed.id], status: "IN_PROGRESS" });

    // 6. Windows & Doors
    const gWin = await node("Windows & Doors", null);
    const nWindows = await node("Aluminum windows (12 units)", gWin.id, { cost: 48000, vendorId: vAlu.id, categoryId: cCarp.id, status: "INSTALLED" });
    await ms(nWindows.id, "Deposit", 14400, "PAID", "2026-01-05");
    await ms(nWindows.id, "Installation", 19200, "PAID", "2026-02-20");
    await ms(nWindows.id, "Balance", 14400, "PENDING", "2026-04-20");
    const nFrontDoor = await node("Front door (security)", gWin.id, { cost: 12000, vendorId: vAlu.id, categoryId: cCarp.id, roomIds: [porch.id], status: "DELIVERED" });
    await ms(nFrontDoor.id, "Full payment", 12000, "PAID", "2026-02-25");
    const nIntDoors = await node("Interior doors (8 units)", gWin.id, { cost: 24000, vendorId: vShmulik.id, categoryId: cCarp.id, status: "ORDERED" });
    await ms(nIntDoors.id, "Deposit", 7200, "PAID", "2026-03-15");
    await node("Sliding terrace door", gWin.id, { cost: 15000, vendorId: vAlu.id, categoryId: cCarp.id, roomIds: [terrace.id], status: "PENDING" });

    // 7. Painting
    const gPaint = await node("Painting", null);
    await node("Interior painting (all rooms)", gPaint.id, { cost: 28000, vendorId: vCoat.id, categoryId: cPaint.id, status: "NOT_STARTED" });
    await node("Exterior painting", gPaint.id, { cost: 18000, vendorId: vCoat.id, categoryId: cPaint.id, status: "NOT_STARTED" });
    await node("Specialty wall treatments", gPaint.id, { cost: 8000, vendorId: vCoat.id, categoryId: cPaint.id, roomIds: [living.id], status: "NOT_STARTED" });

    // 8. HVAC
    const gHvac = await node("HVAC", null);
    const nAC = await node("Central AC system", gHvac.id, { cost: 45000, vendorId: vCool.id, categoryId: cHvac.id, status: "IN_PROGRESS" });
    await ms(nAC.id, "Equipment", 18000, "PAID", "2026-03-01");
    await ms(nAC.id, "Installation", 18000, "PENDING", "2026-04-30");
    await node("AC ducts + vents", gHvac.id, { cost: 12000, vendorId: vCool.id, categoryId: cHvac.id, status: "IN_PROGRESS" });
    await node("Bathroom ventilation", gHvac.id, { cost: 4500, vendorId: vCool.id, categoryId: cHvac.id, status: "PENDING" });

    // 9. Smart Home
    const gSmrt = await node("Smart Home", null);
    const nSwitches = await node("Smart switches (30 units)", gSmrt.id, { cost: 9000, vendorId: vSmart.id, categoryId: cSmart.id, status: "DELIVERED" });
    await ms(nSwitches.id, "Full payment", 9000, "PAID", "2026-02-28");
    const nHub = await node("Central hub + app", gSmrt.id, { cost: 4500, vendorId: vSmart.id, categoryId: cSmart.id, status: "INSTALLED" });
    await ms(nHub.id, "Full payment", 4500, "PAID", "2026-03-05");
    const nCams = await node("Security cameras (6)", gSmrt.id, { cost: 8500, vendorId: vSmart.id, categoryId: cSmart.id, status: "IN_PROGRESS" });
    await ms(nCams.id, "Deposit", 2550, "PAID", "2026-03-20");
    await node("Smart thermostat", gSmrt.id, { cost: 3200, vendorId: vSmart.id, categoryId: cSmart.id, status: "PENDING" });
    await node("Smart door lock", gSmrt.id, { cost: 2800, vendorId: vSmart.id, categoryId: cSmart.id, roomIds: [porch.id], status: "ORDERED" });

    // 10. Carpentry
    const gCarp = await node("Carpentry & Built-ins", null);
    const nCloset = await node("Walk-in closet (master)", gCarp.id, { cost: 22000, vendorId: vShmulik.id, categoryId: cCarp.id, roomIds: [masterBed.id], status: "IN_PROGRESS" });
    await ms(nCloset.id, "Deposit", 6600, "PAID", "2026-03-10");
    await node("Kids room built-in wardrobes", gCarp.id, { cost: 16000, vendorId: vShmulik.id, categoryId: cCarp.id, roomIds: [kids1.id, kids2.id], status: "NOT_STARTED" });
    await node("Office built-in desk", gCarp.id, { cost: 8500, vendorId: vShmulik.id, categoryId: cCarp.id, roomIds: [office.id], status: "NOT_STARTED" });
    const nTVUnit = await node("Living room TV unit", gCarp.id, { cost: 12000, vendorId: vShmulik.id, categoryId: cCarp.id, roomIds: [living.id], status: "ORDERED" });
    await ms(nTVUnit.id, "Deposit", 3600, "PAID", "2026-03-25");

    // 11. Staircase
    const gStair = await node("Staircase", null);
    const nStairs = await node("Wooden staircase", gStair.id, { cost: 28000, vendorId: vShmulik.id, categoryId: cCarp.id, status: "IN_PROGRESS" });
    await ms(nStairs.id, "Deposit", 14000, "PAID", "2026-02-20");
    await ms(nStairs.id, "Balance", 14000, "PENDING", "2026-04-15");
    await node("Staircase railing (glass)", gStair.id, { cost: 15000, vendorId: vAlu.id, categoryId: cCarp.id, status: "PENDING" });

    // 12. Outdoor
    const gOut = await node("Outdoor", null);
    await node("Garden landscaping", gOut.id, { cost: 18000, vendorId: vCoat.id, categoryId: cPaint.id, roomIds: [porch.id], status: "NOT_STARTED" });
    await node("Pergola", gOut.id, { cost: 14000, vendorId: vShmulik.id, categoryId: cCarp.id, roomIds: [terrace.id], status: "PENDING" });
    await node("Outdoor kitchen", gOut.id, { cost: 12000, vendorId: vGranite.id, categoryId: cKitBath.id, roomIds: [terrace.id], status: "NOT_STARTED" });

    // ── Issues ──
    await prisma.issue.create({ data: { title: "Water stain on living room ceiling", description: "Appeared after pipe replacement. Needs inspection.", nodeId: nPipes.id, status: "OPEN" } });
    await prisma.issue.create({ data: { title: "Cracked tile in guest bathroom", description: "One tile cracked during installation. Vendor to replace.", nodeId: nGuestBath.id, status: "OPEN" } });
    await prisma.issue.create({ data: { title: "Window seal leaking (master bedroom)", description: "Water leaks during rain from window frame.", nodeId: nWindows.id, status: "IN_PROGRESS" } });
    await prisma.issue.create({ data: { title: "Electrical outlet placement wrong in office", description: "Two outlets installed 10cm too low. Fixed by ElectroPro.", nodeId: nRewire.id, status: "RESOLVED" } });
    await prisma.issue.create({ data: { title: "Delay on interior doors delivery", description: "Vendor reports 3-week delay due to supply chain.", nodeId: nIntDoors.id, status: "OPEN" } });

    console.log(`✅ Demo project seeded for user ${userId}: ${pid}`);
  } catch (err) {
    console.error("Demo project seed failed (non-fatal):", err);
  }
}
