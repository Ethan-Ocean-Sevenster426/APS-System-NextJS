import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

function csrfFrom(cookie: string): string {
  return cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "";
}

// GET ?format=pdf → stream the PDF download; GET ?info=1 → last-sent JSON.
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const qs = request.nextUrl.search;
    const res = await fetch(`${DJANGO_API_URL}/api/kpi-report/${qs}`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/pdf")) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: res.status,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": res.headers.get("content-disposition") || "attachment; filename=kpi-report.pdf",
        },
      });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}

// POST {email, year?, quarter?} → email the report.
export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.text();
    const res = await fetch(`${DJANGO_API_URL}/api/kpi-report/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, "X-CSRFToken": csrfFrom(cookie) },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
