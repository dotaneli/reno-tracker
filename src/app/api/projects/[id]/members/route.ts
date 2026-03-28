import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody } from "@/lib/api";
import type { ProjectRole } from "@/generated/prisma/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface InviteBody {
  email: string;
  role?: ProjectRole;
}

interface RemoveBody {
  userId: string;
}

// GET /api/projects/:id/members — list all members + pending invites
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    await requireProjectAccess(userId, id);

    const [members, pendingInvites] = await Promise.all([
      prisma.projectMember.findMany({
        where: { projectId: id },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pendingInvite.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return json({ members, pendingInvites });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/projects/:id/members — invite a user by email (OWNER only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    await requireProjectAccess(userId, id, ["OWNER"]);

    const body = await parseBody<InviteBody>(request);
    if (!body.email?.trim()) return errorResponse("email is required", 400);

    const role = body.role || "EDITOR";
    if (role === "OWNER") return errorResponse("Cannot assign OWNER role via invite", 400);

    const email = body.email.trim().toLowerCase();

    // Get project name and inviter name for the email
    const [project, inviter] = await Promise.all([
      prisma.project.findUnique({ where: { id }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    ]);

    const inviterName = inviter?.name || inviter?.email || "Someone";
    const projectName = project?.name || "a renovation project";
    const loginUrl = `${request.headers.get("origin") || "https://reno-tracker-rho.vercel.app"}/login`;

    // Check if user exists
    const invitee = await prisma.user.findUnique({ where: { email } });

    if (invitee) {
      // User exists — add directly as member
      const member = await prisma.projectMember.create({
        data: { projectId: id, userId: invitee.id, role },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      // Send email notification
      await resend.emails.send({
        from: "Reno Tracker <onboarding@resend.dev>",
        to: email,
        subject: `You've been added to "${projectName}"`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
            <div style="background: #c4a882; width: 40px; height: 40px; border-radius: 10px; margin-bottom: 24px;"></div>
            <h2 style="color: #1c1917; font-size: 20px; margin-bottom: 8px;">You're in!</h2>
            <p style="color: #78716c; font-size: 14px; line-height: 1.6;">
              <strong>${inviterName}</strong> added you to <strong>${projectName}</strong> as ${role === "EDITOR" ? "an Editor" : "a Viewer"}.
            </p>
            <a href="${loginUrl}" style="display: inline-block; margin-top: 20px; background: #1c1917; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 500;">
              Open Project
            </a>
            <p style="color: #a8a29e; font-size: 12px; margin-top: 32px;">Reno Tracker — Renovation project management</p>
          </div>
        `,
      }).catch(console.error);

      return json(member, 201);
    }

    // User doesn't exist yet — create a pending invite
    const invite = await prisma.pendingInvite.create({
      data: { projectId: id, email, role },
    });

    // Send invitation email
    await resend.emails.send({
      from: "Reno Tracker <onboarding@resend.dev>",
      to: email,
      subject: `${inviterName} invited you to "${projectName}"`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <div style="background: #c4a882; width: 40px; height: 40px; border-radius: 10px; margin-bottom: 24px;"></div>
          <h2 style="color: #1c1917; font-size: 20px; margin-bottom: 8px;">You're invited!</h2>
          <p style="color: #78716c; font-size: 14px; line-height: 1.6;">
            <strong>${inviterName}</strong> invited you to collaborate on <strong>${projectName}</strong> as ${role === "EDITOR" ? "an Editor" : "a Viewer"}.
          </p>
          <p style="color: #78716c; font-size: 14px; line-height: 1.6;">
            Sign in with your Google account to get started — you'll have access automatically.
          </p>
          <a href="${loginUrl}" style="display: inline-block; margin-top: 20px; background: #1c1917; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Sign in & Join
          </a>
          <p style="color: #a8a29e; font-size: 12px; margin-top: 32px;">Reno Tracker — Renovation project management</p>
        </div>
      `,
    }).catch(console.error);

    return json(
      { ...invite, pending: true, user: { email, name: email.split("@")[0] } },
      201
    );
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/projects/:id/members — remove a member (OWNER only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    await requireProjectAccess(userId, id, ["OWNER"]);

    const body = await parseBody<RemoveBody>(request);
    if (!body.userId?.trim()) return errorResponse("userId is required", 400);

    if (body.userId === userId) {
      return errorResponse("Cannot remove yourself as OWNER", 400);
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: id, userId: body.userId } },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
