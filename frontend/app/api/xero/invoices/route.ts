import { NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";
export async function GET() {
  try {
    const res = await fetch(`${DJANGO_API_URL}/xero/invoices/`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ invoices: [], aging: {}, error: String(e) }, { status: 502 }); }
}
