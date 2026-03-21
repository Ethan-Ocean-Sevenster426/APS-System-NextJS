import { NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET() {
  try {
    const res = await fetch(`${DJANGO_API_URL}/api/home-stats/`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ clients: 0, inspections: 0, recent_activities: [], error: String(e) });
  }
}
