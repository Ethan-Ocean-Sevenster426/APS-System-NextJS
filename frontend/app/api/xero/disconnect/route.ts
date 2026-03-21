import { NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";
export async function POST() {
  try {
    const res = await fetch(`${DJANGO_API_URL}/xero/disconnect/`, { method: "POST", cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
