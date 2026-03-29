import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${DJANGO_API_URL}/api/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });

    // Forward Set-Cookie headers from Django — strip Domain and fix Path
    const setCookie = res.headers.getSetCookie?.() || [];
    for (const cookie of setCookie) {
      // Remove Domain= so the browser uses the current domain
      // Remove SameSite=Lax issues, ensure Path=/
      const cleaned = cookie
        .replace(/;\s*Domain=[^;]*/gi, "")
        .replace(/;\s*SameSite=[^;]*/gi, "");
      response.headers.append("Set-Cookie", cleaned + "; SameSite=Lax");
    }

    return response;
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
