import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const res = await fetch(`http://localhost:8000/api/system-logs/${qs ? `?${qs}` : ""}`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
