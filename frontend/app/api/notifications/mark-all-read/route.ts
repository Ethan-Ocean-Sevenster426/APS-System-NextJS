import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

function csrfFrom(cookie: string): string {
  return cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "";
}

// Mark all of the current user's notifications as read.
export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/api/notifications/mark-all-read/`, {
      method: "POST",
      headers: { Cookie: cookie, "X-CSRFToken": csrfFrom(cookie) },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
