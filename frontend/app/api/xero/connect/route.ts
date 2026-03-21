import { NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";
export async function GET() {
  try {
    const res = await fetch(`${DJANGO_API_URL}/xero/connect/`, { cache: "no-store", redirect: "manual" });
    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get("location");
      return NextResponse.json({ redirect: location });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
