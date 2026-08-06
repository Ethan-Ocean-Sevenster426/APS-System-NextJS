import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

const URL_ = `${DJANGO_API_URL}/api/weekly-email/settings/`;

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(URL_, { headers: { Cookie: cookie }, cache: "no-store" });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.text();
    const res = await fetch(URL_, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
