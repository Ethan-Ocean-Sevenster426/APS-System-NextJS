import { NextResponse } from "next/server";
export async function GET() {
  try {
    const res = await fetch("http://localhost:8000/xero/invoices/", { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ invoices: [], aging: {}, error: String(e) }, { status: 502 }); }
}
