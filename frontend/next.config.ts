import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this frontend directory. Without this,
  // Next can infer the parent repo folder as the root and fail to resolve
  // dependencies like "tailwindcss" (which live in frontend/node_modules).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
