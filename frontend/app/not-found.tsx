import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DJANGO_API_URL } from "@/lib/config";

// Any unknown/dead link (e.g. an old "/home" bookmark from the previous system)
// lands here instead of showing a raw 404. Signed-in users are sent to the
// dashboard; everyone else goes to the login page.
export default async function NotFound() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let authenticated = false;
  try {
    const res = await fetch(`${DJANGO_API_URL}/api/me/`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      authenticated = Boolean(data.authenticated);
    }
  } catch {
    // Django unreachable — fall through to the login page.
  }

  redirect(authenticated ? "/" : "/login");
}
