import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${DJANGO_API_URL}/api/clients-approval/report/${queryString ? `?${queryString}` : ""}`;

    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(url, { headers: { Cookie: cookie }, cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e), inspectors: [], incidents: [] },
      { status: 502 }
    );
  }
}
