import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file") || "";

  if (!file) {
    return NextResponse.json({ error: "No file specified" }, { status: 400 });
  }

  // Prevent directory traversal
  const safePath = file.replace(/\.\./g, "").replace(/^\/+/, "");

  // Redirect to nginx-served media URL (direct file serving, no Django hop)
  const mediaUrl = `/media/${safePath}`;
  return NextResponse.redirect(new URL(mediaUrl, req.url));
}
