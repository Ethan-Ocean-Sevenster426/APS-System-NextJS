import { NextResponse } from "next/server";
export async function POST() {
  try {
    const res = await fetch("http://localhost:8000/xero/sync-invoices/", { method: "POST", cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
