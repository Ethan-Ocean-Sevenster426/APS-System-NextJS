import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json();
    const action = body.action; // "start-all" or "stop-all"

    if (action !== "start-all" && action !== "stop-all") {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'start-all' or 'stop-all'." },
        { status: 400 }
      );
    }

    const res = await fetch(`${DJANGO_API_URL}/master-service/${action}/`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 502 }
    );
  }
}
