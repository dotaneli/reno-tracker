import { prisma } from "./prisma";

/** Capture full project state as JSON (version 2 — recursive nodes). */
export async function captureProjectState(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, totalBudget: true, expectedStartDate: true, expectedEndDate: true },
  });

  const floors = await prisma.floor.findMany({
    where: { projectId },
    include: { rooms: true },
    orderBy: { sortOrder: "asc" },
  });

  const vendors = await prisma.vendor.findMany({ where: { projectId } });

  const nodes = await prisma.projectNode.findMany({
    where: { projectId },
    include: { rooms: true, milestones: true, receipts: true, notes: true, issues: true },
    orderBy: { sortOrder: "asc" },
  });

  const allRooms = floors.flatMap((f) => f.rooms);

  function serializeNode(node: any, childNodes: any[]): any {
    return {
      name: node.name,
      nodeType: node.nodeType,
      status: node.status,
      expectedCost: node.expectedCost,
      actualCost: node.actualCost,
      startDate: node.startDate,
      endDate: node.endDate,
      expectedDate: node.expectedDate,
      completedDate: node.completedDate,
      sortOrder: node.sortOrder,
      vendorName: node.vendorId ? vendors.find((v) => v.id === node.vendorId)?.name || null : null,
      roomNames: node.rooms.map((r: any) => allRooms.find((rm) => rm.id === r.roomId)?.name || "").filter(Boolean),
      milestones: node.milestones.map((m: any) => ({
        label: m.label, amount: m.amount, percentage: m.percentage,
        dueDate: m.dueDate, paidDate: m.paidDate, status: m.status,
        receiptUrl: m.receiptUrl, receiptName: m.receiptName,
      })),
      receipts: node.receipts.map((r: any) => ({ fileUrl: r.fileUrl, fileName: r.fileName, fileSize: r.fileSize })),
      notes: node.notes.map((n: any) => ({ text: n.text, authorId: n.authorId, createdAt: n.createdAt })),
      issues: node.issues.map((iss: any) => ({ title: iss.title, description: iss.description, status: iss.status })),
      children: childNodes.filter((c) => c.parentId === node.id).map((c) => serializeNode(c, childNodes)),
    };
  }

  const rootNodes = nodes.filter((n) => n.parentId === null);

  return {
    version: 2,
    project,
    floors: floors.map((f) => ({ name: f.name, sortOrder: f.sortOrder, rooms: f.rooms.map((r) => ({ name: r.name, type: r.type })) })),
    vendors: vendors.map((v) => ({ name: v.name, category: v.category, phone: v.phone, email: v.email })),
    nodes: rootNodes.map((n) => serializeNode(n, nodes)),
  };
}

/** Restore project state from snapshot. Handles both v1 (subProjects) and v2 (nodes) formats. */
export async function restoreProjectState(projectId: string, data: any) {
  // Delete current data
  await prisma.note.deleteMany({ where: { node: { projectId } } });
  await prisma.receipt.deleteMany({ where: { node: { projectId } } });
  await prisma.paymentMilestone.deleteMany({ where: { node: { projectId } } });
  await prisma.issue.deleteMany({ where: { node: { projectId } } });
  await prisma.nodeRoom.deleteMany({ where: { node: { projectId } } });
  await prisma.projectNode.deleteMany({ where: { projectId } });
  await prisma.room.deleteMany({ where: { floor: { projectId } } });
  await prisma.floor.deleteMany({ where: { projectId } });
  await prisma.vendor.deleteMany({ where: { projectId } });

  // Restore project metadata
  if (data.project) {
    await prisma.project.update({
      where: { id: projectId },
      data: { name: data.project.name, totalBudget: data.project.totalBudget, expectedStartDate: data.project.expectedStartDate, expectedEndDate: data.project.expectedEndDate },
    });
  }

  // Restore floors & rooms
  const roomMap = new Map<string, string>();
  for (const f of data.floors || []) {
    const floor = await prisma.floor.create({ data: { name: f.name, sortOrder: f.sortOrder, projectId } });
    for (const r of f.rooms || []) {
      const room = await prisma.room.create({ data: { name: r.name, type: r.type, floorId: floor.id } });
      roomMap.set(r.name, room.id);
    }
  }

  // Restore vendors
  const vendorMap = new Map<string, string>();
  for (const v of data.vendors || []) {
    const vendor = await prisma.vendor.create({ data: { name: v.name, category: v.category, phone: v.phone, email: v.email, projectId } });
    vendorMap.set(v.name, vendor.id);
  }

  if (data.version === 2 || data.nodes) {
    // v2: recursive nodes
    async function restoreNode(nd: any, parentId: string | null) {
      const node = await prisma.projectNode.create({
        data: {
          name: nd.name, nodeType: nd.nodeType, status: nd.status,
          expectedCost: nd.expectedCost, actualCost: nd.actualCost,
          startDate: nd.startDate, endDate: nd.endDate,
          expectedDate: nd.expectedDate, completedDate: nd.completedDate,
          sortOrder: nd.sortOrder || 0, parentId, projectId,
          vendorId: nd.vendorName ? vendorMap.get(nd.vendorName) || null : null,
        },
      });
      for (const rn of nd.roomNames || []) { const rid = roomMap.get(rn); if (rid) await prisma.nodeRoom.create({ data: { nodeId: node.id, roomId: rid } }); }
      for (const m of nd.milestones || []) { await prisma.paymentMilestone.create({ data: { ...m, nodeId: node.id } }); }
      for (const r of nd.receipts || []) { await prisma.receipt.create({ data: { ...r, nodeId: node.id } }); }
      for (const n of nd.notes || []) { await prisma.note.create({ data: { text: n.text, authorId: n.authorId, createdAt: n.createdAt, nodeId: node.id } }); }
      for (const iss of nd.issues || []) { await prisma.issue.create({ data: { title: iss.title, description: iss.description, status: iss.status, nodeId: node.id } }); }
      for (const child of nd.children || []) { await restoreNode(child, node.id); }
    }
    for (const rootNode of data.nodes) { await restoreNode(rootNode, null); }
  } else {
    // v1 legacy: subProjects format — convert to nodes on restore
    for (const sp of data.subProjects || []) {
      const groupNode = await prisma.projectNode.create({
        data: { name: sp.name, nodeType: sp.type, status: sp.status, startDate: sp.startDate, endDate: sp.endDate, parentId: null, projectId },
      });
      for (const rn of sp.roomNames || []) { const rid = roomMap.get(rn); if (rid) await prisma.nodeRoom.create({ data: { nodeId: groupNode.id, roomId: rid } }); }
      for (const iss of sp.issues || []) { await prisma.issue.create({ data: { title: iss.title, description: iss.description, status: iss.status, nodeId: groupNode.id } }); }
      for (const item of sp.items || []) {
        const leaf = await prisma.projectNode.create({
          data: {
            name: item.name, status: item.status, expectedCost: item.expectedCost, actualCost: item.actualCost,
            expectedDate: item.expectedDate, completedDate: item.completedDate,
            parentId: groupNode.id, projectId, vendorId: item.vendorName ? vendorMap.get(item.vendorName) || null : null,
          },
        });
        for (const m of item.milestones || []) { await prisma.paymentMilestone.create({ data: { label: m.label, amount: m.amount, percentage: m.percentage, dueDate: m.dueDate, paidDate: m.paidDate, status: m.status, receiptUrl: m.receiptUrl, receiptName: m.receiptName, nodeId: leaf.id } }); }
        for (const r of item.receipts || []) { await prisma.receipt.create({ data: { fileUrl: r.fileUrl, fileName: r.fileName, fileSize: r.fileSize, nodeId: leaf.id } }); }
        for (const n of item.notes || []) { await prisma.note.create({ data: { text: n.text, authorId: n.authorId, createdAt: n.createdAt, nodeId: leaf.id } }); }
      }
    }
  }
}
