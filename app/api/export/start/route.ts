import { NextRequest, NextResponse } from "next/server";
import { getAccessContext } from "@/lib/session";
import {
  listChannels,
  listAllUploads,
  queryVideoAnalytics,
  queryTrafficSources,
  type VideoMeta,
} from "@/lib/youtube";
import { buildAnalyticsWorkbook } from "@/lib/excel";
import { parseStudioCsv } from "@/lib/studioCsv";
import { createJob, updateJob, sweepJobs } from "@/lib/jobStore";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_METRICS =
  "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost,videosAddedToPlaylists";

/**
 * POST /api/export/start
 * Body: { channelId?, startDate, endDate, metrics? }
 * Returns { jobId } immediately and builds the workbook in the background.
 *
 * Poll GET /api/export/status?jobId=... for progress and the download link.
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

  const { channelId, startDate, endDate, metrics, studioCsv } = body ?? {};
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required." },
      { status: 400 },
    );
  }

  sweepJobs();
  const job = createJob(`all-uploads-${startDate}_${endDate}.xlsx`);
  const accessToken = ctx.accessToken;
  const metricList = metrics || DEFAULT_METRICS;

  // Fire-and-forget background work. In production this should be a queue or
  // Vercel Workflow so it survives the request lifecycle reliably.
    void (async () => {
    try {
      updateJob(job.id, { status: "running", progress: 5 });

      const channels = await listChannels(accessToken);
      const channel = channelId
        ? channels.find((c) => c.id === channelId)
        : channels[0];

      updateJob(job.id, { progress: 15 });

      // Run all three independent fetches concurrently.
      const analyticsPromise = queryVideoAnalytics(accessToken, {
        channelId,
        startDate,
        endDate,
        metrics: metricList,
      });

      const trafficPromise = queryTrafficSources(accessToken, {
        channelId,
        startDate,
        endDate,
      });

      const uploadsPromise = channel?.uploadsPlaylistId
        ? listAllUploads(accessToken, channel.uploadsPlaylistId)
        : Promise.resolve([] as VideoMeta[]);

      // Wall-clock time ≈ slowest query, not sum of all three.
      const [result, trafficSourceMap, uploads] = await Promise.all([
        analyticsPromise,
        trafficPromise,
        uploadsPromise,
      ]);

      updateJob(job.id, { progress: 85 });

      const metaMap: Map<string, VideoMeta> | undefined = uploads.length
        ? new Map(uploads.map((v) => [v.id, v]))
        : undefined;

      const studio =
        typeof studioCsv === "string" && studioCsv.trim()
          ? parseStudioCsv(studioCsv)
          : undefined;

      const buffer = await buildAnalyticsWorkbook(result, {
        sheetName: "All Uploads",
        videoMeta: metaMap,
        trafficSourceMap,
        studio,
      });

      // Production: upload `buffer` to Vercel Blob here and set { url }.
      updateJob(job.id, { status: "done", progress: 100, buffer });
    } catch (err: any) {
      updateJob(job.id, {
        status: "error",
        error: err?.message ?? "Export failed.",
      });
    }
  })();

  return NextResponse.json({ jobId: job.id });
}
