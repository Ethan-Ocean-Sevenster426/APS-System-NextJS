import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

function csrfFrom(cookie: string): string {
  return cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.text();
    const res = await fetch(`${DJANGO_API_URL}/api/sample-discrepancies/toggle-group/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, "X-CSRFToken": csrfFrom(cookie) },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
