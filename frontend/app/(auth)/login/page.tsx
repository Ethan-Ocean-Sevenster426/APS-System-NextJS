"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const res = await fetch(`/api/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        router.push("/");
      } else {
        setError(data.error || "Invalid username or password. Please try again.");
      }
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        :root {
          --primary: #007890;
          --border: #e5e7eb;
          --text: #1f2937;
          --text-light: #6b7280;
          --radius: 6px;
          --shadow-lg: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        }
        body {
          background-image: url('/background.jpg');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          margin: 0;
          min-height: 100vh;
          overflow: hidden;
        }
        body::before {
          content: "";
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
          z-index: 0;
        }
      `}</style>

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <Image src="/logo.png" alt="Food Safety Agency Logo" width={80} height={70} style={{ maxHeight: "70px", width: "auto" }} />
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: 600, marginBottom: "4px" }}>Food Safety Agency (Pty) Ltd</h1>
          <h2 style={{ color: "white", fontSize: "1rem", fontWeight: 400 }}>Secure Login Portal</h2>
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", width: "80%", maxWidth: "380px", padding: "2rem" }}>
          {/* Card header */}
          <div style={{ borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "15px", paddingBottom: "10px" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fas fa-lock" /> Sign In
            </span>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#fee", border: "1px solid #fcc", color: "#c33", padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Username */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="username" style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text)", fontSize: "0.9rem" }}>Username</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <i className="fas fa-user" style={{ position: "absolute", left: "16px", color: "var(--primary)", fontSize: "1.1rem", zIndex: 2 }} />
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Enter your username"
                  required
                  style={{ width: "100%", height: "48px", border: "1px solid var(--border)", borderRadius: "var(--radius)", paddingLeft: "48px", paddingRight: "16px", fontSize: "1rem", color: "var(--text)", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="password" style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text)", fontSize: "0.9rem" }}>Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <i className="fas fa-lock" style={{ position: "absolute", left: "16px", color: "var(--primary)", fontSize: "1.1rem", zIndex: 2 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  style={{ width: "100%", height: "48px", border: "1px solid var(--border)", borderRadius: "var(--radius)", paddingLeft: "48px", paddingRight: "48px", fontSize: "1rem", color: "var(--text)", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  style={{ position: "absolute", right: "16px", background: "none", border: "none", color: "var(--text-light)", cursor: "pointer", fontSize: "1.1rem" }}
                >
                  <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginBottom: "1rem" }}>
              <Link href="/forgot-password" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>
                Forgot Password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", height: "48px", backgroundColor: loading ? "#cbd5e0" : "var(--primary)", color: "white", border: "none", borderRadius: "var(--radius)", fontWeight: 600, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer" }}
            >
              <i className="fas fa-sign-in-alt" />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      {/* Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    </>
  );
}
