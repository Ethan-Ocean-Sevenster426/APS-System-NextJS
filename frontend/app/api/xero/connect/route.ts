import { NextResponse } from "next/server";
export async function GET() {
  try {
    const res = await fetch("http://localhost:8000/xero/connect/", { cache: "no-store", redirect: "manual" });
    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get("location");
      return NextResponse.json({ redirect: location });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
