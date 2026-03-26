import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const qs = new URL(request.url).searchParams.toString();
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(
      `${DJANGO_API_URL}/api/inspector-mappings/${qs ? `?${qs}` : ""}`,
      { headers: { Cookie: cookie }, cache: "no-store" }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e), mappings: [] },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json();
    const res = await fetch(`${DJANGO_API_URL}/api/inspector-mappings/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
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
