import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

/* Forwards both multipart uploads and JSON remove-actions unchanged. */
export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const contentType = request.headers.get("content-type") || "application/json";
    const body = await request.arrayBuffer();
    const res = await fetch(`${DJANGO_API_URL}/api/weekly-email/attachment/`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": contentType },
      body,
      cache: "no-store",
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
