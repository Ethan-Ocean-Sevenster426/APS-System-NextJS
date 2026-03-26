import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json();
    const res = await fetch(`${DJANGO_API_URL}/inspections/download-all-files/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Download failed" }));
      return NextResponse.json(err, { status: res.status });
    }
    // Stream the ZIP back
    const blob = await res.arrayBuffer();
    const filename = res.headers.get("content-disposition")?.match(/filename="?(.+?)"?$/)?.[1] || "inspection_files.zip";
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
