"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);

      const res = await fetch("/api/forgot-password/", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Please try again.");
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
          <h2 style={{ color: "white", fontSize: "1rem", fontWeight: 400 }}>Password Recovery</h2>
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", width: "80%", maxWidth: "380px", padding: "2rem" }}>
          {/* Card header */}
          <div style={{ borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "15px", paddingBottom: "10px" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fas fa-envelope" /> Forgot Password
            </span>
          </div>

          {/* Description */}
          <p style={{ color: "var(--text-light)", fontSize: "0.9rem", marginBottom: "1.25rem", textAlign: "center", lineHeight: 1.5 }}>
            Enter your email address and we will send you a link to reset your password.
          </p>

          {/* Error */}
          {error && (
            <div style={{ background: "#fee", border: "1px solid #fcc", color: "#c33", padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
              <i className="fas fa-check-circle" />
              <span>If an account with that email exists, a password reset link has been sent.</span>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} autoComplete="off">
              {/* Email */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label htmlFor="email" style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text)", fontSize: "0.9rem" }}>Email Address</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <i className="fas fa-envelope" style={{ position: "absolute", left: "16px", color: "var(--primary)", fontSize: "1.1rem", zIndex: 2 }} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", height: "48px", border: "1px solid var(--border)", borderRadius: "var(--radius)", paddingLeft: "48px", paddingRight: "16px", fontSize: "1rem", color: "var(--text)", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", height: "48px", backgroundColor: loading ? "#cbd5e0" : "var(--primary)", color: "white", border: "none", borderRadius: "var(--radius)", fontWeight: 600, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer" }}
              >
                <i className="fas fa-paper-plane" />
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--text-light)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                Check your email inbox and follow the instructions to reset your password.
              </p>
            </div>
          )}

          {/* Back to login */}
          <div style={{ textAlign: "center", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
            <Link href="/login" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <i className="fas fa-arrow-left" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
