import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/api/weekly-email/users/`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
