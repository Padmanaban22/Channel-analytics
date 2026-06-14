"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/dashboard/MetricTile";
import { ViewsChart, type TimePoint } from "@/components/dashboard/ViewsChart";
import { ExportPanel } from "@/components/dashboard/ExportPanel";
import { BarList } from "@/components/dashboard/BarList";
import { Donut } from "@/components/dashboard/Donut";
import {
  DemographicsChart,
  type AgeGenderRow,
} from "@/components/dashboard/DemographicsChart";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import {
  AGE_LABELS,
  DEVICE_LABELS,
  PLAYBACK_LOCATION_LABELS,
  SUBSCRIBED_LABELS,
  TRAFFIC_SOURCE_LABELS,
  countryName,
  formatCompact,
  formatDuration,
  formatNumber,
} from "@/lib/metrics";

type Row = (string | number)[];
interface Result {
  columnHeaders: { name: string }[];
  rows: Row[];
}

const RANGES = [
  { label: "28 days", days: 28 },
  { label: "90 days", days: 90 },
  { label: "365 days", days: 365 },
];

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function val(result: Result | null, row: Row, name: string) {
  if (!result) return 0;
  const i = result.columnHeaders.findIndex((h) => h.name === name);
  return i >= 0 ? Number(row[i]) : 0;
}

/** Fetch one analytics report; return null on failure so one bad panel
 *  never blanks the whole dashboard. */
async function safeGet(params: Record<string, string>): Promise<Result | null> {
  try {
    const qs = new URLSearchParams(params);
    const res = await fetch(`/api/analytics?${qs}`);
    if (!res.ok) return null;
    return (await res.json()) as Result;
  } catch {
    return null;
  }
}

interface State {
  totals: Record<string, number>;
  series: TimePoint[];
  top: { id: string; title: string; views: number; watch: number; likes: number }[];
  traffic: { label: string; value: number }[];
  geography: { label: string; value: number }[];
  devices: { label: string; value: number }[];
  locations: { label: string; value: number }[];
  subscribed: { label: string; value: number }[];
  demographics: AgeGenderRow[];
}

export default function DashboardPage({
  params,
}: {
  params: { channelId: string };
}) {
  const channelId = params.channelId;
  const [rangeDays, setRangeDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [data, setData] = useState<State | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const endDate = useMemo(() => isoDaysAgo(3), []);
  const startDate = useMemo(() => isoDaysAgo(3 + rangeDays), [rangeDays]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFatal(null);
    const base = { channelId, startDate, endDate };

    (async () => {
      const [
        totalsR,
        cardsR,
        seriesR,
        topR,
        trafficR,
        geoR,
        deviceR,
        locR,
        subR,
        demoR,
        videosRes,
      ] = await Promise.all([
        safeGet({
          ...base,
          metrics:
            "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost,videosAddedToPlaylists,videosRemovedFromPlaylists",
        }),
        safeGet({
          ...base,
          metrics:
            "cardImpressions,cardClicks,cardClickRate,cardTeaserImpressions,cardTeaserClicks,cardTeaserClickRate,endScreenElementImpressions,endScreenElementClicks,endScreenElementClickRate",
        }),
        safeGet({
          ...base,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "day",
          sort: "day",
        }),
        safeGet({
          ...base,
          metrics: "views,estimatedMinutesWatched,averageViewPercentage,likes,comments",
          dimensions: "video",
          sort: "-views",
          maxResults: "10",
        }),
        safeGet({
          ...base,
          metrics: "views",
          dimensions: "insightTrafficSourceType",
          sort: "-views",
        }),
        safeGet({
          ...base,
          metrics: "views",
          dimensions: "country",
          sort: "-views",
          maxResults: "12",
        }),
        safeGet({ ...base, metrics: "views", dimensions: "deviceType", sort: "-views" }),
        safeGet({
          ...base,
          metrics: "views",
          dimensions: "insightPlaybackLocationType",
          sort: "-views",
        }),
        safeGet({
          ...base,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "subscribedStatus",
        }),
        safeGet({
          ...base,
          metrics: "viewerPercentage",
          dimensions: "ageGroup,gender",
        }),
        fetch(`/api/videos?channelId=${channelId}`).then((r) =>
          r.ok ? r.json() : { videos: [] },
        ),
      ]);

      if (!active) return;

      if (!totalsR && !seriesR) {
        setFatal("Couldn’t load analytics. Your session may have expired — try signing in again.");
        setLoading(false);
        return;
      }

      // Totals → flat record of every returned metric.
      const totals: Record<string, number> = {};
      if (totalsR?.rows[0]) {
        totalsR.columnHeaders.forEach((h, i) => {
          totals[h.name] = Number(totalsR.rows[0][i]);
        });
      }
      if (cardsR?.rows[0]) {
        cardsR.columnHeaders.forEach((h, i) => {
          totals[h.name] = Number(cardsR.rows[0][i]);
        });
      }

      const series: TimePoint[] = (seriesR?.rows ?? []).map((r) => ({
        date: String(r[0]).slice(5),
        views: val(seriesR, r, "views"),
        watchTime: val(seriesR, r, "estimatedMinutesWatched"),
      }));

      const titleMap = new Map<string, string>(
        (videosRes.videos ?? []).map((v: any) => [v.id, v.title]),
      );
      const top = (topR?.rows ?? []).map((r) => {
        const id = String(r[0]);
        return {
          id,
          title: titleMap.get(id) ?? id,
          views: val(topR, r, "views"),
          watch: val(topR, r, "estimatedMinutesWatched"),
          likes: val(topR, r, "likes"),
        };
      });

      const mapRows = (
        res: Result | null,
        labels: Record<string, string>,
        take = 99,
      ) =>
        (res?.rows ?? [])
          .map((r) => ({
            label: labels[String(r[0])] ?? String(r[0]),
            value: val(res, r, "views"),
          }))
          .slice(0, take);

      const traffic = mapRows(trafficR, TRAFFIC_SOURCE_LABELS, 8);
      const geography = (geoR?.rows ?? []).map((r) => ({
        label: countryName(String(r[0])),
        value: val(geoR, r, "views"),
      }));
      const devices = mapRows(deviceR, DEVICE_LABELS);
      const locations = mapRows(locR, PLAYBACK_LOCATION_LABELS, 8);
      const subscribed = mapRows(subR, SUBSCRIBED_LABELS);

      // Demographics: ageGroup x gender → grouped rows.
      const demoMap = new Map<string, AgeGenderRow>();
      for (const r of demoR?.rows ?? []) {
        const age = AGE_LABELS[String(r[0])] ?? String(r[0]);
        const gender = String(r[1]).toLowerCase();
        const pct = Number(r[2]);
        const row =
          demoMap.get(age) ?? { age, female: 0, male: 0, other: 0 };
        if (gender === "female") row.female += pct;
        else if (gender === "male") row.male += pct;
        else row.other += pct;
        demoMap.set(age, row);
      }
      const ageOrder = Object.values(AGE_LABELS);
      const demographics = Array.from(demoMap.values()).sort(
        (a, b) => ageOrder.indexOf(a.age) - ageOrder.indexOf(b.age),
      );

      setData({
        totals,
        series,
        top,
        traffic,
        geography,
        devices,
        locations,
        subscribed,
        demographics,
      });
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [channelId, startDate, endDate]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const METRICS_ORDER = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "likes",
    "dislikes",
    "comments",
    "shares",
    "subscribersGained",
    "subscribersLost",
    "videosAddedToPlaylists",
    "videosRemovedFromPlaylists",
    "cardImpressions",
    "cardClicks",
    "cardClickRate",
    "cardTeaserImpressions",
    "cardTeaserClicks",
    "cardTeaserClickRate",
    "endScreenElementImpressions",
    "endScreenElementClicks",
    "endScreenElementClickRate",
  ];

  const t = data?.totals ?? {};
  const netSubs = (t.subscribersGained ?? 0) - (t.subscribersLost ?? 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-cloud-muted">
          <span className="h-2 w-2 rounded-full bg-ember" />
          Channel Analytics
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-ink-line p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                className={`rounded-md px-3 py-1 text-xs transition-colors ${
                  rangeDays === r.days
                    ? "bg-ink-raised text-cloud"
                    : "text-cloud-muted hover:text-cloud"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/channels")}>
            Switch channel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
        </div>
      </header>

      <p className="mb-6 font-mono text-xs text-cloud-faint tnum">
        {startDate} → {endDate} · figures lag ~3 days
      </p>

      {fatal ? (
        <Card className="p-6">
          <p className="text-cloud">Couldn’t load analytics</p>
          <p className="mt-1 text-sm text-cloud-muted">{fatal}</p>
        </Card>
      ) : loading || !data ? (
        <p className="text-cloud-muted">Loading analytics…</p>
      ) : (
        <>
          {/* Headline metrics */}
          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Views" value={formatNumber(t.views ?? 0)} accent="#ff5a4d" />
            <MetricTile
              label="Watch time"
              value={formatNumber(t.estimatedMinutesWatched ?? 0)}
              sub="minutes"
              accent="#39d3c3"
            />
            <MetricTile
              label="Avg view duration"
              value={formatDuration(t.averageViewDuration ?? 0)}
              accent="#f5b942"
            />
            <MetricTile
              label="Avg view %"
              value={`${(t.averageViewPercentage ?? 0).toFixed(1)}%`}
              accent="#7c8cff"
            />
            <MetricTile label="Likes" value={formatNumber(t.likes ?? 0)} accent="#39d3c3" />
            <MetricTile label="Comments" value={formatNumber(t.comments ?? 0)} accent="#f5b942" />
            <MetricTile label="Shares" value={formatNumber(t.shares ?? 0)} accent="#e06bd6" />
            <MetricTile
              label="Net subscribers"
              value={`${netSubs >= 0 ? "+" : ""}${formatNumber(netSubs)}`}
              sub={`+${formatCompact(t.subscribersGained ?? 0)} / −${formatCompact(t.subscribersLost ?? 0)}`}
              accent="#6fd36f"
            />
          </section>

          {/* Views over time */}
          <Card className="mb-6">
            <CardHeader title="Views over time" hint="daily" />
            <ViewsChart data={data.series} />
          </Card>

          {/* Traffic + Devices */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Traffic sources" hint="by views" />
              <BarList items={data.traffic} color="#ff5a4d" />
            </Card>
            <Card>
              <CardHeader title="Devices" hint="by views" />
              <Donut data={data.devices} />
            </Card>
          </div>

          {/* Geography + Playback location */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Top countries" hint="by views" />
              <BarList items={data.geography} color="#39d3c3" />
            </Card>
            <Card>
              <CardHeader title="Playback locations" hint="by views" />
              <BarList items={data.locations} color="#f5b942" />
            </Card>
          </div>

          {/* Demographics + Subscribed status */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Audience" hint="age & gender, % of views" />
              <DemographicsChart data={data.demographics} />
            </Card>
            <Card>
              <CardHeader title="Subscriber mix" hint="by views" />
              <Donut data={data.subscribed} />
            </Card>
          </div>

          {/* Full metric totals */}
          <Card className="mb-6">
            <CardHeader title="All metrics" hint={`${startDate} → ${endDate}`} />
            <MetricsGrid values={t} order={METRICS_ORDER} />
          </Card>

          {/* Top videos */}
          <Card className="mb-6">
            <CardHeader
              title="Top videos"
              hint="select rows to export, or export the whole channel"
            />
            <div className="overflow-x-auto px-2 pb-2">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-cloud-faint">
                    <th className="px-3 py-2 font-normal"></th>
                    <th className="px-3 py-2 font-normal">Title</th>
                    <th className="px-3 py-2 text-right font-normal">Views</th>
                    <th className="px-3 py-2 text-right font-normal">Watch (min)</th>
                    <th className="px-3 py-2 text-right font-normal">Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top.map((v) => (
                    <tr key={v.id} className="border-t border-ink-line/60 hover:bg-ink-raised/40">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(v.id)}
                          onChange={() => toggle(v.id)}
                          className="h-4 w-4 accent-ember"
                          aria-label={`Select ${v.title}`}
                        />
                      </td>
                      <td className="max-w-md truncate px-3 py-2 text-cloud">{v.title}</td>
                      <td className="px-3 py-2 text-right font-mono text-cloud tnum">{formatNumber(v.views)}</td>
                      <td className="px-3 py-2 text-right font-mono text-cloud-muted tnum">{formatNumber(v.watch)}</td>
                      <td className="px-3 py-2 text-right font-mono text-cloud-muted tnum">{formatNumber(v.likes)}</td>
                    </tr>
                  ))}
                  {data.top.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-cloud-muted">
                        No video activity in this range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Export */}
          <Card className="pb-5">
            <CardHeader title="Export to Excel" />
            <div className="px-5 pt-4">
              <ExportPanel
                channelId={channelId}
                startDate={startDate}
                endDate={endDate}
                selectedVideoIds={Array.from(selected)}
              />
            </div>
          </Card>
        </>
      )}
    </main>
  );
}
