/**
 * Parse a YouTube Studio CSV export (Advanced mode "Table data") to pull the
 * metrics the Analytics query API can't give us: impressions, impression CTR,
 * and unique viewers.
 *
 * Studio's table export uses a "Content" column containing the video ID, plus
 * human-readable metric columns whose exact names vary by tab/locale. We match
 * columns by fuzzy header name so small wording changes don't break it.
 */

export interface StudioRow {
  impressions?: number;
  ctr?: number; // impression click-through rate, percent
  uniqueViewers?: number;
}

export interface StudioData {
  byVideoId: Map<string, StudioRow>;
  byTitle: Map<string, StudioRow>;
  matched: { impressions: boolean; ctr: boolean; uniqueViewers: boolean };
}

/** Minimal RFC-4180-ish CSV line splitter (handles quoted fields + commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore; \n handles the newline
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toNumber(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const cleaned = raw.replace(/[%,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseStudioCsv(text: string): StudioData {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  const byVideoId = new Map<string, StudioRow>();
  const byTitle = new Map<string, StudioRow>();
  const matched = { impressions: false, ctr: false, uniqueViewers: false };

  if (rows.length < 2) return { byVideoId, byTitle, matched };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const find = (test: (h: string) => boolean) => header.findIndex(test);

  const idCol = find(
    (h) => h === "content" || h === "video" || h.includes("video id"),
  );
  const titleCol = find((h) => h.includes("title") || h === "video title");
  // "Impressions" but not the CTR column
  const impCol = find(
    (h) => h.includes("impression") && !h.includes("rate") && !h.includes("ctr"),
  );
  const ctrCol = find(
    (h) =>
      h.includes("click-through") ||
      h.includes("click through") ||
      h.includes("ctr"),
  );
  const uvCol = find((h) => h.includes("unique viewer"));

  matched.impressions = impCol >= 0;
  matched.ctr = ctrCol >= 0;
  matched.uniqueViewers = uvCol >= 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const data: StudioRow = {
      impressions: impCol >= 0 ? toNumber(cells[impCol]) : undefined,
      ctr: ctrCol >= 0 ? toNumber(cells[ctrCol]) : undefined,
      uniqueViewers: uvCol >= 0 ? toNumber(cells[uvCol]) : undefined,
    };
    if (
      data.impressions === undefined &&
      data.ctr === undefined &&
      data.uniqueViewers === undefined
    )
      continue;

    const id = idCol >= 0 ? (cells[idCol] ?? "").trim() : "";
    if (id && VIDEO_ID.test(id)) byVideoId.set(id, data);

    const title = titleCol >= 0 ? (cells[titleCol] ?? "").trim() : "";
    if (title) byTitle.set(title.toLowerCase(), data);
  }

  return { byVideoId, byTitle, matched };
}
