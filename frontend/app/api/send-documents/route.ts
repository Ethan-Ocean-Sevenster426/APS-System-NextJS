import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookie = request.headers.get("cookie") || "";
    console.log("[send-documents] Sending to Django:", JSON.stringify(body).slice(0, 200));
    console.log("[send-documents] Cookie present:", !!cookie);

    const res = await fetch(`${DJANGO_API_URL}/inspections/send-documents/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log("[send-documents] Response status:", res.status, "length:", text.length);

    // Try parsing as JSON, handle HTML responses
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      console.log("[send-documents] Non-JSON response:", text.slice(0, 200));
      // Django returned HTML (likely auth redirect) - try the API endpoint instead
      const res2 = await fetch(`${DJANGO_API_URL}/api/send-documents/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify(body),
      });
      const text2 = await res2.text();
      try {
        const data2 = JSON.parse(text2);
        return NextResponse.json(data2, { status: res2.status });
      } catch {
        return NextResponse.json({ success: false, error: `Server returned non-JSON response (status ${res.status})` }, { status: 502 });
      }
    }
  } catch (e) {
    console.log("[send-documents] Error:", String(e));
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
