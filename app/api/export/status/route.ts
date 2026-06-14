import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobStore";

export const runtime = "nodejs";

/**
 * GET /api/export/status?jobId=...            → JSON status
 * GET /api/export/status?jobId=...&download=1 → the .xlsx file (when ready)
 */
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  const download = req.nextUrl.searchParams.get("download");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (download) {
    if (job.status !== "done") {
      return NextResponse.json(
        { error: "Export is not ready yet." },
        { status: 409 },
      );
    }
    // If stored in Blob, redirect to the URL instead.
    if (job.url) return NextResponse.redirect(job.url);
    if (!job.buffer) {
      return NextResponse.json(
        { error: "Export file is no longer available." },
        { status: 410 },
      );
    }
    return new NextResponse(job.buffer as any, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${job.filename}"`,
      },
    });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    ready: job.status === "done",
  });
}
