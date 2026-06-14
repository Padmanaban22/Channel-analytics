import { NextRequest, NextResponse } from "next/server";
import { getAccessContext } from "@/lib/session";
import {
  listChannels,
  listAllUploads,
  YouTubeApiError,
} from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/videos?channelId=...
 * Returns every uploaded video (id, title, publishedAt) for the channel.
 */
export async function GET(req: NextRequest) {
  const ctx = await getAccessContext(req);
  if (!ctx || ctx.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "Please sign in again." },
      { status: 401 },
    );
  }

  const channelId = req.nextUrl.searchParams.get("channelId");

  try {
    const channels = await listChannels(ctx.accessToken);
    const channel = channelId
      ? channels.find((c) => c.id === channelId)
      : channels[0];

    if (!channel?.uploadsPlaylistId) {
      return NextResponse.json(
        { error: "No uploads playlist found for this channel." },
        { status: 404 },
      );
    }

    const videos = await listAllUploads(
      ctx.accessToken,
      channel.uploadsPlaylistId,
    );
    return NextResponse.json({ videos, count: videos.length });
  } catch (err) {
    if (err instanceof YouTubeApiError) {
      return NextResponse.json(
        { error: err.message, reason: err.reason },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Could not list videos." },
      { status: 500 },
    );
  }
}
