"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportPanelProps {
  channelId: string;
  startDate: string;
  endDate: string;
  selectedVideoIds: string[];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportPanel({
  channelId,
  startDate,
  endDate,
  selectedVideoIds,
}: ExportPanelProps) {
  const [busy, setBusy] = useState<"" | "selected" | "all">("");
  const [status, setStatus] = useState<string>("");
  const [studioCsv, setStudioCsv] = useState<string>("");
  const [studioName, setStudioName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setStudioCsv(text);
    setStudioName(file.name);
  }

  function clearCsv() {
    setStudioCsv("");
    setStudioName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function exportSelected() {
    setBusy("selected");
    setStatus("");
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          startDate,
          endDate,
          scope: "selected",
          videoIds: selectedVideoIds,
          studioCsv: studioCsv || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Export failed.");
      triggerDownload(await res.blob(), `selected-${startDate}_${endDate}.xlsx`);
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setBusy("");
    }
  }

  async function exportAll() {
    setBusy("all");
    setStatus("Building export… this may take up to 30 seconds");
    try {
      // Use the same direct synchronous route as "Export selected".
      // The background-job pattern (/api/export/start) doesn't work on Vercel
      // because serverless functions are terminated after the HTTP response is
      // sent, killing the in-flight background task before it completes.
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          startDate,
          endDate,
          scope: "all",
          studioCsv: studioCsv || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Export failed.");
      const filename =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+?)"/)?.[1] ??
        `all-uploads-${startDate}_${endDate}.xlsx`;
      triggerDownload(await res.blob(), filename);
      setStatus("Done ✓");
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={exportSelected}
          disabled={busy !== "" || selectedVideoIds.length === 0}
        >
          {busy === "selected" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export selected ({selectedVideoIds.length})
        </Button>

        <Button onClick={exportAll} disabled={busy !== ""}>
          {busy === "all" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export all uploads
        </Button>
      </div>

      {/* Optional Studio CSV merge */}
      <div className="rounded-lg border border-dashed border-ink-line p-3">
        {studioName ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-cloud">
              <Paperclip className="h-4 w-4 text-cyan" />
              {studioName}
              <span className="text-cloud-faint">— will fill Impressions, CTR, Unique Viewers</span>
            </span>
            <button onClick={clearCsv} className="text-cloud-muted hover:text-cloud" aria-label="Remove file">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-cloud-muted">
              Optional: attach a YouTube Studio CSV to fill Impressions, CTR &amp; Unique Viewers
              <span className="block text-xs text-cloud-faint">
                These three aren’t available from the API. Export them from Studio (Advanced mode → table) and drop the CSV here.
              </span>
            </p>
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
              Attach CSV
            </Button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onPickCsv}
          className="hidden"
        />
      </div>

      {status ? <p className="font-mono text-xs text-cloud-muted tnum">{status}</p> : null}
    </div>
  );
}
