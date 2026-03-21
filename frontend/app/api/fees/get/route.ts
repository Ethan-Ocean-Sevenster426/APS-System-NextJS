import { NextResponse } from "next/server";
export async function GET() {
  try {
    const res = await fetch("http://localhost:8000/api/react/fees/get/", { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
