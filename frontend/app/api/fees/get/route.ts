import { NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";
export async function GET() {
  try {
    const res = await fetch(`${DJANGO_API_URL}/api/react/fees/get/`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
