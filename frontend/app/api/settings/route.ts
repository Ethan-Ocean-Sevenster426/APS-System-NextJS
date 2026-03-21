import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:8000/api/settings/", { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}

export async function POST() {
  try {
    const res = await fetch("http://localhost:8000/api/settings/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
