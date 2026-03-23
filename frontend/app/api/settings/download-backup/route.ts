import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file") || "";

    const res = await fetch(
      `${DJANGO_API_URL}/api/settings/download-backup/?file=${encodeURIComponent(file)}`,
      {
        headers: { Cookie: cookie },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: res.status });
    }

    const blob = await res.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": res.headers.get("Content-Disposition") || `attachment; filename="${file}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
