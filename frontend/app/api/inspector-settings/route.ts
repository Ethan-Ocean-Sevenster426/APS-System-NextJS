import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json();

    // Convert JSON body to URL-encoded form data for Django's request.POST
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      formData.append(key, String(value));
    }

    const res = await fetch(`${DJANGO_API_URL}/inspector-settings/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      body: formData.toString(),
      redirect: "manual",
    });

    // Django view redirects or renders HTML on success;
    // a 302 or 200 means it worked
    if (res.status === 302 || res.status === 200) {
      return NextResponse.json({ success: true, message: "Settings saved successfully." });
    }

    return NextResponse.json(
      { success: false, error: `Django responded with status ${res.status}` },
      { status: res.status }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }
}
