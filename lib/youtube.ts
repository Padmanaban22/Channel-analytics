/**
 * Server-side helpers for the YouTube Data API v3 and YouTube Analytics API v2.
 * All functions take an OAuth access token and run inside route handlers — the
 * token must never reach the browser.
 */

const DATA_API = "https://www.googleapis.com/youtube/v3";
const ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2";

export interface Channel {
  id: string;
  title: string;
  thumbnail: string | null;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  uploadsPlaylistId: string | null;
}

export interface AnalyticsResult {
  columnHeaders: { name: string; columnType: string; dataType: string }[];
  rows: (string | number)[][];
}

export interface VideoMeta {
  id: string;
  title: string;
  publishedAt: string;
}

class YouTubeApiError extends Error {
  status: number;
  reason?: string;
  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.name = "YouTubeApiError";
    this.status = status;
    this.reason = reason;
  }
}

async function ytFetch(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    // Cache immutable past-range analytics at the edge where possible.
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    let reason: string | undefined;
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      reason = body?.error?.errors?.[0]?.reason ?? body?.error?.status;
      message = body?.error?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new YouTubeApiError(message, res.status, reason);
  }
  return res.json();
}

/** List the channels the authenticated user owns/manages. */
export async function listChannels(accessToken: string): Promise<Channel[]> {
  const url =
    `${DATA_API}/channels?part=id,snippet,contentDetails,statistics&mine=true&maxResults=50`;
  const data = await ytFetch(url, accessToken);

  return (data.items ?? []).map((item: any): Channel => ({
    id: item.id,
    title: item.snippet?.title ?? "Untitled channel",
    thumbnail:
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.default?.url ??
      null,
    subscriberCount: item.statistics?.subscriberCount ?? "0",
    videoCount: item.statistics?.videoCount ?? "0",
    viewCount: item.statistics?.viewCount ?? "0",
    uploadsPlaylistId:
      item.contentDetails?.relatedPlaylists?.uploads ?? null,
  }));
}

/** Walk the uploads playlist to collect every video on the channel. */
export async function listAllUploads(
  accessToken: string,
  uploadsPlaylistId: string,
): Promise<VideoMeta[]> {
  const videos: VideoMeta[] = [];
  let pageToken = "";

  do {
    const url =
      `${DATA_API}/playlistItems?part=contentDetails,snippet` +
      `&playlistId=${uploadsPlaylistId}&maxResults=50` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const data = await ytFetch(url, accessToken);

    for (const item of data.items ?? []) {
      videos.push({
        id: item.contentDetails?.videoId,
        title: item.snippet?.title ?? "",
        publishedAt: item.contentDetails?.videoPublishedAt ?? "",
      });
    }
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);

  return videos.filter((v) => v.id);
}

/** Generic Analytics report query. */
export async function queryAnalytics(
  accessToken: string,
  params: {
    channelId?: string;
    startDate: string;
    endDate: string;
    metrics: string;
    dimensions?: string;
    filters?: string;
    sort?: string;
    maxResults?: number;
    startIndex?: number;
  },
): Promise<AnalyticsResult> {
  const qs = new URLSearchParams({
    ids: params.channelId ? `channel==${params.channelId}` : "channel==MINE",
    startDate: params.startDate,
    endDate: params.endDate,
    metrics: params.metrics,
  });
  if (params.dimensions) qs.set("dimensions", params.dimensions);
  if (params.filters) qs.set("filters", params.filters);
  if (params.sort) qs.set("sort", params.sort);
  if (params.maxResults) qs.set("maxResults", String(params.maxResults));
  if (params.startIndex) qs.set("startIndex", String(params.startIndex));

  const data = await ytFetch(`${ANALYTICS_API}/reports?${qs}`, accessToken);
  return {
    columnHeaders: data.columnHeaders ?? [],
    rows: data.rows ?? [],
  };
}

/**
 * Per-video analytics for the whole channel in one paginated query
 * (dimensions=video). Far cheaper than one request per video.
 */
export async function queryVideoAnalytics(
  accessToken: string,
  params: {
    channelId?: string;
    startDate: string;
    endDate: string;
    metrics: string;
  },
): Promise<AnalyticsResult> {
  const PAGE = 200;
  let startIndex = 1;
  let headers: AnalyticsResult["columnHeaders"] = [];
  const allRows: (string | number)[][] = [];

  // Cap pagination defensively; very large channels should use the async job.
  for (let page = 0; page < 25; page++) {
    const result = await queryAnalytics(accessToken, {
      ...params,
      dimensions: "video",
      sort: "-views",
      maxResults: PAGE,
      startIndex,
    });
    if (page === 0) headers = result.columnHeaders;
    allRows.push(...result.rows);
    if (result.rows.length < PAGE) break;
    startIndex += PAGE;
  }

  return { columnHeaders: headers, rows: allRows };
}

/**
 * Per-video traffic-source breakdown for the whole channel in one paginated
 * query (dimensions=video,insightTrafficSourceType). Returns a lookup keyed by
 * video id → { trafficSourceType: views }.
 */
export async function queryTrafficSources(
  accessToken: string,
  params: {
    channelId?: string;
    startDate: string;
    endDate: string;
    videoIds?: string[];
  },
): Promise<Map<string, Record<string, number>>> {
  const PAGE = 200;
  let startIndex = 1;
  const map = new Map<string, Record<string, number>>();

  for (let page = 0; page < 50; page++) {
    const result = await queryAnalytics(accessToken, {
      channelId: params.channelId,
      startDate: params.startDate,
      endDate: params.endDate,
      metrics: "views",
      dimensions: "video,insightTrafficSourceType",
      sort: "-views",
      maxResults: PAGE,
      startIndex,
      filters: params.videoIds?.length
        ? `video==${params.videoIds.join(",")}`
        : undefined,
    });

    const vIdx = result.columnHeaders.findIndex((h) => h.name === "video");
    const sIdx = result.columnHeaders.findIndex(
      (h) => h.name === "insightTrafficSourceType",
    );
    const viewIdx = result.columnHeaders.findIndex((h) => h.name === "views");

    for (const row of result.rows) {
      const videoId = String(row[vIdx]);
      const source = String(row[sIdx]);
      const views = Number(row[viewIdx]);
      const entry = map.get(videoId) ?? {};
      entry[source] = (entry[source] ?? 0) + views;
      map.set(videoId, entry);
    }

    if (result.rows.length < PAGE) break;
    startIndex += PAGE;
  }

  return map;
}

export { YouTubeApiError };
