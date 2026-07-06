import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

function csrfFrom(cookie: string): string {
  return cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/api/sample-discrepancies/${id}/rectify/`, {
      method: "POST",
      headers: { Cookie: cookie, "X-CSRFToken": csrfFrom(cookie) },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
