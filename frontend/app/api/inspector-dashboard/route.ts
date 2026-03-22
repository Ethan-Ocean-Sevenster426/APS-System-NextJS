import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") || "";
  try {
    const res = await fetch(`${DJANGO_API_URL}/api/inspector-dashboard/`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
