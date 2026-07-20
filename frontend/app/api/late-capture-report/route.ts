import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

// GET ?date_from=&date_to=[&inspector=] → per-inspector late-capture stats.
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const qs = request.nextUrl.search;
    const res = await fetch(`${DJANGO_API_URL}/api/late-capture-report/${qs}`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
