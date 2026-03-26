import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/api/convert-docx-to-pdf/`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    const pdfBuffer = await res.arrayBuffer();
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Analytics_Report.pdf"',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
