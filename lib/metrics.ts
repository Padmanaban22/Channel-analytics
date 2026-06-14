/**
 * Human-friendly labels and formatters for YouTube Analytics API (reports.query)
 * metrics and dimension values.
 *
 * NOTE on the pasted Reporting-API doc: that doc uses snake_case names
 * (watch_time_minutes, average_view_duration_seconds, views_percentage, …).
 * The query API we use here uses the camelCase equivalents below. A few
 * Reporting-API metrics are NOT available via reports.query and are omitted:
 *   - video_thumbnail_impressions / _ctr  (impressions — Studio/Reporting only)
 *   - playlist_saves_added / _removed      (Reporting API only)
 *   - several estimated_partner_* revenue splits (Reporting API only)
 */

export const METRIC_LABELS: Record<string, string> = {
  views: "Views",
  redViews: "Premium views",
  engagedViews: "Engaged views",
  estimatedMinutesWatched: "Watch time (min)",
  estimatedRedMinutesWatched: "Premium watch time (min)",
  averageViewDuration: "Avg view duration",
  averageViewPercentage: "Avg view %",
  comments: "Comments",
  likes: "Likes",
  dislikes: "Dislikes",
  shares: "Shares",
  subscribersGained: "Subscribers gained",
  subscribersLost: "Subscribers lost",
  videosAddedToPlaylists: "Added to playlists",
  videosRemovedFromPlaylists: "Removed from playlists",
  cardImpressions: "Card impressions",
  cardClicks: "Card clicks",
  cardClickRate: "Card CTR",
  cardTeaserImpressions: "Card teaser impressions",
  cardTeaserClicks: "Card teaser clicks",
  cardTeaserClickRate: "Card teaser CTR",
  endScreenElementImpressions: "End screen impressions",
  endScreenElementClicks: "End screen clicks",
  endScreenElementClickRate: "End screen CTR",
  // monetary (only with the monetary scope)
  estimatedRevenue: "Estimated revenue",
  estimatedAdRevenue: "Ad revenue",
  grossRevenue: "Gross revenue",
  cpm: "CPM",
  playbackBasedCpm: "Playback CPM",
  monetizedPlaybacks: "Monetized playbacks",
  adImpressions: "Ad impressions",
};

export function labelFor(metric: string) {
  return METRIC_LABELS[metric] ?? metric;
}

/** Metrics that are rates/percentages (0–100 or 0–1 depending on metric). */
const PERCENT_METRICS = new Set([
  "averageViewPercentage",
  "cardClickRate",
  "cardTeaserClickRate",
  "endScreenElementClickRate",
  "viewerPercentage",
]);

const DURATION_METRICS = new Set(["averageViewDuration"]);

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en").format(Math.round(n));
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

export function formatDuration(totalSeconds: number) {
  const s = Math.round(totalSeconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  return `${m}m ${rem}s`;
}

export function formatMetricValue(metric: string, value: number) {
  if (DURATION_METRICS.has(metric)) return formatDuration(value);
  if (PERCENT_METRICS.has(metric)) return `${value.toFixed(1)}%`;
  return formatNumber(value);
}

/* ── Dimension value labels ─────────────────────────────────────────── */

export const TRAFFIC_SOURCE_LABELS: Record<string, string> = {
  ADVERTISING: "Advertising",
  ANNOTATION: "Annotations",
  CAMPAIGN_CARD: "Campaign cards",
  END_SCREEN: "End screens",
  EXT_URL: "External sites",
  HASHTAGS: "Hashtags",
  IMMERSIVE: "Immersive",
  LIVE_REDIRECT: "Live redirect",
  NO_LINK_EMBEDDED: "Embedded (no link)",
  NO_LINK_OTHER: "Direct or unknown",
  NOTIFICATION: "Notifications",
  PLAYLIST: "Playlists",
  PRODUCT_PAGE: "Product pages",
  PROMOTED: "Promoted",
  RELATED_VIDEO: "Suggested videos",
  SHORTS: "Shorts feed",
  SOUND_PAGE: "Sound page",
  SUBSCRIBER: "Browse / subscriptions",
  VIDEO_REMIXES: "Remixes",
  YT_CHANNEL: "Channel pages",
  YT_OTHER_PAGE: "Other YouTube pages",
  YT_PLAYLIST_PAGE: "Playlist pages",
  YT_SEARCH: "YouTube search",
};

export const DEVICE_LABELS: Record<string, string> = {
  DESKTOP: "Desktop",
  GAME_CONSOLE: "Game console",
  MOBILE: "Mobile",
  TABLET: "Tablet",
  TV: "TV",
  UNKNOWN_PLATFORM: "Unknown",
};

export const PLAYBACK_LOCATION_LABELS: Record<string, string> = {
  BROWSE: "Browse / Home",
  CHANNEL: "Channel page",
  EMBEDDED: "Embedded players",
  EXTERNAL_APP: "External apps",
  MOBILE: "Mobile (legacy)",
  SEARCH: "Search",
  SHORTS: "Shorts",
  WATCH: "Watch page",
  YT_OTHER: "Other YouTube",
};

export const SUBSCRIBED_LABELS: Record<string, string> = {
  SUBSCRIBED: "Subscribed",
  UNSUBSCRIBED: "Not subscribed",
};

export const AGE_LABELS: Record<string, string> = {
  "age13-17": "13–17",
  "age18-24": "18–24",
  "age25-34": "25–34",
  "age35-44": "35–44",
  "age45-54": "45–54",
  "age55-64": "55–64",
  "age65-": "65+",
};

let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string) {
  if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    try {
      return regionNames.of(code) ?? code;
    } catch {
      return code;
    }
  }
  return code;
}

export const SERIES_COLORS = [
  "#ff5a4d",
  "#39d3c3",
  "#f5b942",
  "#7c8cff",
  "#e06bd6",
  "#6fd36f",
  "#ff9f43",
  "#5ac8fa",
];
