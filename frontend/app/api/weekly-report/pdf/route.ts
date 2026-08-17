/* Server-side Weekly Report PDF — used by the automatic Monday email.
 * Protected by the shared internal key; builds the PDF with the exact same
 * code as the on-screen Export PDF button. */
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { DJANGO_API_URL } from "@/lib/config";
import { buildInspectorReportPdf, buildManagerReportPdf, buildFinanceReportPdf, buildWeeklyReportPdf, type ReportResponse } from "@/lib/weeklyReportPdf";

const INTERNAL_KEY = process.env.WEEKLY_INTERNAL_KEY || "aps-weekly-internal-2026";

export async function GET(request: NextRequest) {
  if (request.headers.get("x-internal-key") !== INTERNAL_KEY) {
    return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const inspector = (searchParams.get("inspector") || "").trim();
    const type = (searchParams.get("type") || "").trim().toLowerCase();
    const qs = searchParams.toString(); // inspector stays — Django adds that inspector's record-level detail
    const res = await fetch(`${DJANGO_API_URL}/api/weekly-report/${qs ? `?${qs}` : ""}`, {
      headers: { "X-Internal-Key": INTERNAL_KEY },
      cache: "no-store",
    });
    const data = (await res.json()) as ReportResponse;
    if (!data.success) throw new Error(data.error || "Report API returned an error");

    let logo: string | null = null;
    try {
      const buf = await fs.readFile(path.join(process.cwd(), "public", "logo.png"));
      logo = `data:image/png;base64,${buf.toString("base64")}`;
    } catch { /* no logo available */ }

    // ?inspector=<name> → that inspector's PERSONAL report.
    // ?type=manager     → the operations-focused MANAGER report.
    // otherwise         → the full inspector-management report.
    const doc = inspector
      ? await buildInspectorReportPdf(data, inspector, logo)
      : type === "manager"
        ? await buildManagerReportPdf(data, logo)
        : type === "finance"
          ? await buildFinanceReportPdf(data, logo)
          : await buildWeeklyReportPdf(data, logo);
    const bytes = doc.output("arraybuffer") as ArrayBuffer;
    const safeName = inspector ? `_${inspector.replace(/[^\w-]+/g, "-")}` : type === "manager" ? "_Manager" : type === "finance" ? "_Finance" : "";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Weekly-Report${safeName}_${data.week_start}_to_${data.week_end}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
