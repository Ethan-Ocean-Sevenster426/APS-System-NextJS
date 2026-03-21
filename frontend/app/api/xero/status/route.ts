import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/xero/status/`, { headers: { Cookie: cookie }, cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ connected: false, error: String(e) }, { status: 502 }); }
}
