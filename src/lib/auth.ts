import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // When a new user signs in for the first time,
      // convert any pending invites into real project memberships
      if (!user.email) return;

      const pendingInvites = await prisma.pendingInvite.findMany({
        where: { email: user.email.toLowerCase() },
      });

      if (pendingInvites.length === 0) return;

      await Promise.all(
        pendingInvites.map((invite) =>
          prisma.projectMember.create({
            data: {
              projectId: invite.projectId,
              userId: user.id!,
              role: invite.role,
            },
          })
        )
      );

      // Clean up the pending invites
      await prisma.pendingInvite.deleteMany({
        where: { email: user.email.toLowerCase() },
      });
    },
  },
  pages: {
    signIn: "/login",
  },
});
