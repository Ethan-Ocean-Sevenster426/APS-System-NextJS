import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file") || "";
  const action = searchParams.get("action") || "view";

  if (!file) {
    return NextResponse.json({ error: "No file specified" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${DJANGO_API_URL}/api/serve-file/?file=${encodeURIComponent(file)}&action=${action}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "File not found" }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = res.headers.get("content-disposition") || "inline";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
