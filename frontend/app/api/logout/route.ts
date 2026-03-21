import { NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST() {
  try {
    await fetch(`${DJANGO_API_URL}/logout/`, { method: "GET" });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
