import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    // Forward the multipart form data directly to Django
    const formData = await request.formData();

    // Build a new FormData to forward
    const forwardData = new FormData();
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        forwardData.append(key, value, value.name);
      } else {
        forwardData.append(key, value);
      }
    }

    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/api/upload-document/`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: forwardData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 502 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}
