import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Forward the session cookie so Django can authenticate the user
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch("http://localhost:8000/api/me/", {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ authenticated: false, error: String(e) }, { status: 502 });
  }
}
