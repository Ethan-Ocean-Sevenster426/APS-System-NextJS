import { NextRequest, NextResponse } from "next/server";
export async function GET() {
  try {
    const res = await fetch("http://localhost:8000/api/react/inspector-salaries/", { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch("http://localhost:8000/api/react/inspector-salaries/", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 502 }); }
}
