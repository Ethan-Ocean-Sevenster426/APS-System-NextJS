"use client";

import { useEffect } from "react";

/**
 * Loads Font Awesome without blocking first paint.
 *
 * The stylesheet is injected after hydration with media="all", so it is not a
 * render-blocking request during initial load. A <noscript> fallback keeps
 * icons working when JS is disabled.
 */
const FA_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";

export default function FontAwesome() {
  useEffect(() => {
    if (document.querySelector('link[data-fa="1"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FA_URL;
    link.setAttribute("data-fa", "1");
    document.head.appendChild(link);
  }, []);

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={FA_URL} />
    </noscript>
  );
}
