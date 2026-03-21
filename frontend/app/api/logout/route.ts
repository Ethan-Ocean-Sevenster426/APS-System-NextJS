import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    await fetch(`${DJANGO_API_URL}/logout/`, { method: "GET", headers: { Cookie: cookie } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
