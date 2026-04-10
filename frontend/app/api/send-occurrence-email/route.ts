import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const cookie = request.headers.get("cookie") || "";

    const res = await fetch(`${DJANGO_API_URL}/api/send-occurrence-email/`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: formData,
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ success: false, error: "Non-JSON response" }, { status: 502 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
