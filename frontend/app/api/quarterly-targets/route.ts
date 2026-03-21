import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const res = await fetch(`${DJANGO_API_URL}/api/react/quarterly-targets/${qs ? `?${qs}` : ""}`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${DJANGO_API_URL}/api/react/quarterly-targets/`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
