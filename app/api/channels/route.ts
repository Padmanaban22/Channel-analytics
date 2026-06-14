import { NextRequest, NextResponse } from "next/server";
import { getAccessContext } from "@/lib/session";
import { listChannels, YouTubeApiError } from "@/lib/youtube";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ctx = await getAccessContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (ctx.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "Session expired. Please sign in again." },
      { status: 401 },
    );
  }

  try {
    const channels = await listChannels(ctx.accessToken);
    return NextResponse.json({ channels });
  } catch (err) {
    if (err instanceof YouTubeApiError) {
      return NextResponse.json(
        { error: err.message, reason: err.reason },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Could not load channels." },
      { status: 500 },
    );
  }
}
