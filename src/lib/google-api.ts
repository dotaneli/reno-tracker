import { google } from "googleapis";
import { prisma } from "./prisma";

/**
 * Get an authenticated Google OAuth2 client for a user.
 * Reads the stored access/refresh tokens from the Account table.
 * Refreshes the token if expired.
 */
export async function getGoogleAuth(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) throw new Error("No Google account linked");

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  // Refresh if token is expired
  oauth2.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
          ...(tokens.expiry_date && { expires_at: Math.floor(tokens.expiry_date / 1000) }),
        },
      });
    }
  });

  return oauth2;
}
