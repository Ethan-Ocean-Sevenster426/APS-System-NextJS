import { NextRequest, NextResponse } from "next/server";
import { DJANGO_API_URL } from "@/lib/config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for login page, API routes, and static assets
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    /\.\w+$/.test(pathname) // static files like .css, .js, .png
  ) {
    return NextResponse.next();
  }

  // Check if user is authenticated by calling Django
  try {
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch(`${DJANGO_API_URL}/api/me/`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        return NextResponse.next();
      }
    }
  } catch {
    // If Django is down, redirect to login
  }

  // Not authenticated — redirect to login
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
