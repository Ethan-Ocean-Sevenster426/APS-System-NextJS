import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/server-status/`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    // If Django returns HTML, parse what we can or return raw text
    const text = await res.text();
    return NextResponse.json({ raw: text, html: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 502 }
    );
  }
}
