import ExcelJS from "exceljs";
import type { AnalyticsResult, VideoMeta } from "@/lib/youtube";
import type { StudioData } from "@/lib/studioCsv";
import { TRAFFIC_SOURCE_LABELS } from "@/lib/metrics";

const HEADER_FILL = "FF161922";
const ACCENT = "FFFF5A4D";
const NA_GREY = "FF9AA3B2";
const NA_TEXT = "N/A (Studio only)";

const METRIC_LABELS: Record<string, string> = {
  video: "Video ID",
  views: "Views",
  estimatedMinutesWatched: "Watch Time (min)",
  averageViewDuration: "Avg View Duration (s)",
  averageViewPercentage: "Avg View %",
  likes: "Likes",
  dislikes: "Dislikes",
  comments: "Comments",
  shares: "Shares",
  subscribersGained: "Subs Gained",
  subscribersLost: "Subs Lost",
  videosAddedToPlaylists: "Added to Playlists",
  day: "Date",
};

function label(key: string) {
  return METRIC_LABELS[key] ?? key;
}

function mmss(seconds: number) {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Group raw traffic-source enum views into the columns creators recognize. */
function groupTraffic(sources: Record<string, number> | undefined) {
  const g = (keys: string[]) =>
    keys.reduce((sum, k) => sum + (sources?.[k] ?? 0), 0);
  return {
    suggested: g(["RELATED_VIDEO"]),
    browse: g(["SUBSCRIBER", "YT_OTHER_PAGE"]),
    search: g(["YT_SEARCH"]),
    shorts: g(["SHORTS"]),
    external: g(["EXT_URL", "NO_LINK_OTHER", "NO_LINK_EMBEDDED"]),
    notifications: g(["NOTIFICATION"]),
  };
}

function topSource(sources: Record<string, number> | undefined): string {
  if (!sources) return "";
  let best = "";
  let max = -1;
  for (const [k, v] of Object.entries(sources)) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best ? TRAFFIC_SOURCE_LABELS[best] ?? best : "";
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  row.height = 22;
  row.eachCell((cell) => {
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: ACCENT } } };
  });
}

export async function buildAnalyticsWorkbook(
  result: AnalyticsResult,
  options: {
    sheetName: string;
    videoMeta?: Map<string, VideoMeta>;
    trafficSourceMap?: Map<string, Record<string, number>>;
    studio?: StudioData;
  },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Channel Analytics";
  wb.created = new Date();
  const ws = wb.addWorksheet(options.sheetName.slice(0, 31));

  const keys = result.columnHeaders.map((h) => h.name);
  const hasVideo = keys.includes("video") && options.videoMeta;
  const videoIdx = keys.indexOf("video");
  const minutesIdx = keys.indexOf("estimatedMinutesWatched");
  const avgDurIdx = keys.indexOf("averageViewDuration");

  // Extra (derived + merged) columns appended after the core metrics.
  const EXTRA_HEADERS = [
    "Watch Hours",
    "Avg View Duration (mm:ss)",
    "Views: Suggested",
    "Views: Browse",
    "Views: Search",
    "Views: Shorts",
    "Views: Direct & External",
    "Views: Notifications",
    "Top Traffic Source",
    "Impressions",
    "Impression CTR (%)",
    "Unique Viewers",
  ];

  // Build header row, injecting Title/Published after the video id.
  const headerLabels: string[] = [];
  for (const k of keys) {
    headerLabels.push(label(k));
    if (k === "video" && hasVideo) headerLabels.push("Title", "Published");
  }
  const naColStart = headerLabels.length + EXTRA_HEADERS.length - 3; // Impressions
  headerLabels.push(...EXTRA_HEADERS);

  const header = ws.addRow(headerLabels);
  styleHeader(header);
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of result.rows) {
    const videoId = videoIdx >= 0 ? String(row[videoIdx]) : "";
    const minutes = minutesIdx >= 0 ? Number(row[minutesIdx]) : 0;
    const avgDur = avgDurIdx >= 0 ? Number(row[avgDurIdx]) : 0;

    // Core cells (+ Title/Published).
    const out: (string | number)[] = [];
    row.forEach((value, i) => {
      out.push(value);
      if (keys[i] === "video" && hasVideo) {
        const meta = options.videoMeta!.get(String(value));
        out.push(meta?.title ?? "", meta?.publishedAt?.slice(0, 10) ?? "");
      }
    });

    // Derived columns.
    const traffic = groupTraffic(options.trafficSourceMap?.get(videoId));
    out.push(Math.round((minutes / 60) * 100) / 100);
    out.push(mmss(avgDur));
    out.push(
      traffic.suggested,
      traffic.browse,
      traffic.search,
      traffic.shorts,
      traffic.external,
      traffic.notifications,
    );
    out.push(topSource(options.trafficSourceMap?.get(videoId)));

    // Studio-merged columns (impressions, CTR, unique viewers).
    const studioRow =
      options.studio?.byVideoId.get(videoId) ??
      (hasVideo
        ? options.studio?.byTitle.get(
            (options.videoMeta!.get(videoId)?.title ?? "").toLowerCase(),
          )
        : undefined);

    out.push(
      studioRow?.impressions ?? NA_TEXT,
      studioRow?.ctr ?? NA_TEXT,
      studioRow?.uniqueViewers ?? NA_TEXT,
    );

    const added = ws.addRow(out);
    // Grey-italic any N/A cells so it's obvious where to paste from Studio.
    for (let c = naColStart + 1; c <= naColStart + 3; c++) {
      const cell = added.getCell(c);
      if (cell.value === NA_TEXT) {
        cell.font = { italic: true, color: { argb: NA_GREY }, size: 10 };
      }
    }
  }

  ws.columns.forEach((col) => {
    const headerLen = String(col.values?.[1] ?? "").length;
    col.width = Math.min(Math.max(headerLen + 2, 12), 52);
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
