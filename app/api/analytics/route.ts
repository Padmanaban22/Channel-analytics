import { NextRequest, NextResponse } from "next/server";
import { getAccessContext } from "@/lib/session";
import { queryAnalytics, YouTubeApiError } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const ctx = await getAccessContext(req);
  if (!ctx || ctx.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "Please sign in again." },
      { status: 401 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");
  const metrics = sp.get("metrics");

  if (!startDate || !endDate || !metrics) {
    return NextResponse.json(
      { error: "startDate, endDate and metrics are required." },
      { status: 400 },
    );
  }

  try {
    const result = await queryAnalytics(ctx.accessToken, {
      channelId: sp.get("channelId") ?? undefined,
      startDate,
      endDate,
      metrics,
      dimensions: sp.get("dimensions") ?? undefined,
      filters: sp.get("filters") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      maxResults: sp.get("maxResults")
        ? Number(sp.get("maxResults"))
        : undefined,
    });

    // Past date ranges are immutable — let the CDN cache them.
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=900" },
    });
  } catch (err) {
    if (err instanceof YouTubeApiError) {
      return NextResponse.json(
        { error: err.message, reason: err.reason },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Analytics request failed." },
      { status: 500 },
    );
  }
}
