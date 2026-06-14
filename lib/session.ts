import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export interface AccessContext {
  accessToken: string;
  error?: string;
}

/**
 * Read the Google access token from the encrypted session JWT.
 * Returns null when the user is not authenticated.
 */
export async function getAccessContext(
  req: NextRequest,
): Promise<AccessContext | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) return null;
  return {
    accessToken: token.accessToken as string,
    error: token.error as string | undefined,
  };
}
