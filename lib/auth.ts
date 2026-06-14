import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Scopes required by the dashboard.
 *
 * - yt-analytics.readonly  → analytics metrics (views, watch time, ratings…)
 * - youtube.readonly       → list channels/videos AND now required by the
 *                            Analytics reports.query method itself.
 *
 * Add "https://www.googleapis.com/auth/yt-analytics-monetary.readonly"
 * ONLY if you surface revenue / ad-performance metrics. It raises the bar
 * at OAuth verification time, so omit it unless you need it.
 *
 * All of these are SENSITIVE scopes — your app must complete Google OAuth
 * verification before it can serve more than 100 users.
 */
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshAccessToken(token: any) {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      // Google does not always return a new refresh token; keep the old one.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      error: undefined,
    };
  } catch (err) {
    console.error("Failed to refresh access token", err);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: SCOPES,
          access_type: "offline", // request a refresh token
          prompt: "consent", // force consent so a refresh token is always returned
          include_granted_scopes: "true",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist tokens from Google.
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: (account.expires_at as number) * 1000,
        };
      }

      // Token still valid.
      if (Date.now() < (token as any).accessTokenExpires) {
        return token;
      }

      // Expired → refresh.
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // Surface refresh failures to the client so it can force re-login.
      (session as any).error = (token as any).error;
      // NOTE: the access token is intentionally NOT exposed to the client.
      // All Google API calls happen server-side via getToken().
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
