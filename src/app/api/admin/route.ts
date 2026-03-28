import { requireUser } from "@/lib/dal";
import { json, handleError, errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "dotaneli@gmail.com";

// GET /api/admin — return all users, projects, and team memberships (admin only)
export async function GET() {
  try {
    const { email } = await requireUser();

    if (email !== ADMIN_EMAIL) {
      return errorResponse("Forbidden", 403);
    }

    const [users, projects, memberships, nodeCount] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.project.findMany({
        select: {
          id: true,
          name: true,
          totalBudget: true,
          createdAt: true,
          _count: { select: { members: true, nodes: true } },
          members: {
            select: {
              role: true,
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.projectMember.count(),
      prisma.projectNode.count(),
    ]);

    return json({
      stats: {
        totalUsers: users.length,
        totalProjects: projects.length,
        totalNodes: nodeCount,
      },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: u.createdAt,
        projectCount: u._count.memberships,
      })),
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        budget: p.totalBudget,
        createdAt: p.createdAt,
        memberCount: p._count.members,
        nodeCount: p._count.nodes,
        members: p.members.map((m) => ({
          role: m.role,
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
        })),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
