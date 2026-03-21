import { NextResponse } from "next/server";
export async function GET() {
  try {
    const res = await fetch("http://localhost:8000/xero/status/", { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ connected: false, error: String(e) }, { status: 502 }); }
}
