import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/api/corporate-invoice-file/${qs ? `?${qs}` : ""}`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    // If download mode, forward the PDF bytes
    if (searchParams.get("download")) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("Content-Type") || "application/pdf",
          "Content-Disposition": res.headers.get("Content-Disposition") || "inline",
        },
      });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const forwardData = new FormData();
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        forwardData.append(key, value, value.name);
      } else {
        forwardData.append(key, value);
      }
    }
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/api/corporate-invoice-file/`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: forwardData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
