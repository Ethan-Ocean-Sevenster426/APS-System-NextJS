import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const uidb64 = request.headers.get("X-UIDB64");
    const token = request.headers.get("X-TOKEN");

    if (!uidb64 || !token) {
      return NextResponse.json(
        { success: false, error: "Missing uidb64 or token" },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    const res = await fetch(
      `${DJANGO_API_URL}/reset-password/${uidb64}/${token}/`,
      {
        method: "POST",
        body: formData,
      }
    );

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: res.ok };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
