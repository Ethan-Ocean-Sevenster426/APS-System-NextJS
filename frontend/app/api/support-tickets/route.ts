import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const qs = new URL(request.url).searchParams.toString();
    const res = await fetch(`http://localhost:8000/api/support-tickets/${qs ? `?${qs}` : ""}`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
