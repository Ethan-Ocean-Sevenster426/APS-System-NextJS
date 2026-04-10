import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const cookie = request.headers.get("cookie") || "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 115000);
    const res = await fetch(`${DJANGO_API_URL}/api/analytics/${qs ? `?${qs}` : ""}`, {
      headers: { Cookie: cookie },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
