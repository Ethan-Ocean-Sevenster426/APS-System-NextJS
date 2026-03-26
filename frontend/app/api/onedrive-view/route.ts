import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/api/onedrive-view/`, {
      headers: {
        Cookie: cookie,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";

    // If Django returns JSON, pass it through
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Django returns HTML — try to parse what we can from the response
    // If not JSON, return a structured fallback indicating we got an HTML response
    return NextResponse.json({
      connected: res.ok,
      folders: [],
      total_files: 0,
      error: res.ok
        ? null
        : `Django returned HTTP ${res.status}`,
      token_refreshed: false,
      html_response: true,
    });
  } catch (e) {
    return NextResponse.json(
      {
        connected: false,
        folders: [],
        total_files: 0,
        error: String(e),
        token_refreshed: false,
      },
      { status: 502 }
    );
  }
}
