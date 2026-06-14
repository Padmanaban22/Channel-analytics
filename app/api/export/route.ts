import { NextRequest, NextResponse } from "next/server";
import { getAccessContext } from "@/lib/session";
import {
  listChannels,
  listAllUploads,
  queryAnalytics,
  queryVideoAnalytics,
  queryTrafficSources,
  YouTubeApiError,
  type VideoMeta,
} from "@/lib/youtube";
import { buildAnalyticsWorkbook } from "@/lib/excel";
import { parseStudioCsv } from "@/lib/studioCsv";

export const runtime = "nodejs";
// Requires Fluid Compute. Large channels should use /api/export/start instead.
export const maxDuration = 60;

const DEFAULT_METRICS =
  "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost,videosAddedToPlaylists";

/**
 * POST /api/export
 * Body: {
 *   channelId?: string,
 *   startDate: string,        // YYYY-MM-DD
 *   endDate: string,          // YYYY-MM-DD
 *   scope: "selected" | "all",
 *   videoIds?: string[],      // required when scope === "selected"
 *   metrics?: string
 * }
 * Returns an .xlsx file.
 */
export async function POST(req: NextRequest) {
  const ctx = await getAccessContext(req);
  if (!ctx || ctx.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "Please sign in again." },
      { status: 401 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { channelId, startDate, endDate, scope, videoIds, metrics, studioCsv } =
    body ?? {};
  if (!startDate || !endDate || !scope) {
    return NextResponse.json(
      { error: "startDate, endDate and scope are required." },
      { status: 400 },
    );
  }

  const metricList = metrics || DEFAULT_METRICS;

  try {
    // Fetch channel info first (needed for uploads playlist ID and filename).
    const channels = await listChannels(ctx.accessToken);
    const channel = channelId
      ? channels.find((c) => c.id === channelId)
      : channels[0];

    if (scope === "selected" && (!Array.isArray(videoIds) || videoIds.length === 0)) {
      return NextResponse.json(
        { error: "videoIds is required when scope is 'selected'." },
        { status: 400 },
      );
    }

    // Run all independent fetches in parallel to minimise wall-clock time.
    const analyticsPromise =
      scope === "selected"
        ? queryAnalytics(ctx.accessToken, {
            channelId,
            startDate,
            endDate,
            metrics: metricList,
            dimensions: "video",
            filters: `video==${videoIds.join(",")}`,
            sort: "-views",
            maxResults: 200,
          })
        : queryVideoAnalytics(ctx.accessToken, {
            channelId,
            startDate,
            endDate,
            metrics: metricList,
          });

    const trafficPromise = queryTrafficSources(ctx.accessToken, {
      channelId,
      startDate,
      endDate,
      videoIds: scope === "selected" ? videoIds : undefined,
    });

    const uploadsPromise = channel?.uploadsPlaylistId
      ? listAllUploads(ctx.accessToken, channel.uploadsPlaylistId)
      : Promise.resolve([] as VideoMeta[]);

    // All three run concurrently — wall-clock time ≈ slowest one, not the sum.
    const [result, trafficSourceMap, uploads] = await Promise.all([
      analyticsPromise,
      trafficPromise,
      uploadsPromise,
    ]);

    const metaMap: Map<string, VideoMeta> | undefined = uploads.length
      ? new Map(uploads.map((v) => [v.id, v]))
      : undefined;

    const studio =
      typeof studioCsv === "string" && studioCsv.trim()
        ? parseStudioCsv(studioCsv)
        : undefined;

    const buffer = await buildAnalyticsWorkbook(result, {
      sheetName: scope === "selected" ? "Selected Videos" : "All Uploads",
      videoMeta: metaMap,
      trafficSourceMap,
      studio,
    });

    const filename =
      `${(channel?.title ?? "channel").replace(/[^a-z0-9]+/gi, "-")}` +
      `-${scope}-${startDate}_${endDate}.xlsx`;

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof YouTubeApiError) {
      return NextResponse.json(
        { error: err.message, reason: err.reason },
        { status: err.status },
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
