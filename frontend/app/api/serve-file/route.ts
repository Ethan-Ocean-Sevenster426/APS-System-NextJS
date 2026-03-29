import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file") || "";

  if (!file) {
    return NextResponse.json({ error: "No file specified" }, { status: 400 });
  }

  // Prevent directory traversal
  const safePath = file.replace(/\.\./g, "").replace(/^\/+/, "");

  // Rewrite to nginx-served media URL using the original host
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "v4-project.moc-pty.com";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const mediaUrl = `${proto}://${host}/media/${encodeURI(safePath)}`;
  return NextResponse.redirect(mediaUrl);
}
