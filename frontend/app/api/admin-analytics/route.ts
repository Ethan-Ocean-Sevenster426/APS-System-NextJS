import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${DJANGO_API_URL}/api/admin-analytics/${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Cookie: cookie },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
