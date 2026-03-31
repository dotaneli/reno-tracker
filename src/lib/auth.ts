import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { seedDemoProject } from "./seed-demo";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
    async signIn({ user, account }) {
      // Update stored tokens on every sign-in (picks up new scopes + refreshes tokens)
      if (account && user.id) {
        try {
          const existing = await prisma.account.findFirst({
            where: { userId: user.id, provider: account.provider },
          });
          if (existing) {
            await prisma.account.update({
              where: { id: existing.id },
              data: {
                access_token: account.access_token,
                refresh_token: account.refresh_token || existing.refresh_token,
                expires_at: account.expires_at,
                scope: account.scope,
                id_token: account.id_token,
                token_type: account.token_type,
              },
            });
          }
        } catch {}
      }
      return true;
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

      // Seed demo project for every new user
      await seedDemoProject(user.id!);
    },
  },
  pages: {
    signIn: "/login",
  },
});
