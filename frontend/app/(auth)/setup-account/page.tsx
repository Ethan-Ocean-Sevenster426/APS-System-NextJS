"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function SetupAccountPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email || !otpCode) {
      setError("Email and OTP code are required.");
      return;
    }
    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      setError("OTP must be exactly 6 digits.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp_code: otpCode,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
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
          <h2 style={{ color: "white", fontSize: "1rem", fontWeight: 400 }}>Set Up Your Account</h2>
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", width: "80%", maxWidth: "420px", padding: "2rem" }}>
          {/* Card header */}
          <div style={{ borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "15px", paddingBottom: "10px" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fas fa-user-plus" /> Account Setup
            </span>
          </div>

          {/* Success */}
          {success && (
            <div style={{ textAlign: "center" }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "14px", borderRadius: "var(--radius)", marginBottom: "16px", fontSize: "0.9rem" }}>
                <i className="fas fa-check-circle" style={{ marginRight: "8px" }} />
                Your password has been set successfully! Redirecting to login...
              </div>
            </div>
          )}

          {/* Form */}
          {!success && (
            <>
              {/* Info */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: "12px", fontSize: "0.85rem" }}>
                <i className="fas fa-info-circle" style={{ marginRight: "6px" }} />
                Enter the 6-digit OTP code from your email and create a password.
              </div>

              {/* Error */}
              {error && (
                <div style={{ background: "#fee", border: "1px solid #fcc", color: "#c33", padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                  <i className="fas fa-exclamation-circle" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} autoComplete="off">
                {/* Email */}
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="email" style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text)", fontSize: "0.9rem" }}>Email Address</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <i className="fas fa-envelope" style={{ position: "absolute", left: "16px", color: "var(--primary)", fontSize: "1.1rem", zIndex: 2 }} />
                    <input
                      type="email"
                      id="email"
                      placeholder="Enter your email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: "100%", height: "48px", border: "1px solid var(--border)", borderRadius: "var(--radius)", paddingLeft: "48px", fontSize: "1rem", color: "var(--text)", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* OTP Code */}
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="otp_code" style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text)", fontSize: "0.9rem" }}>OTP Code</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <i className="fas fa-key" style={{ position: "absolute", left: "16px", color: "var(--primary)", fontSize: "1.1rem", zIndex: 2 }} />
                    <input
                      type="text"
                      id="otp_code"
                      placeholder="Enter 6-digit OTP"
                      required
                      maxLength={6}
                      inputMode="numeric"
                      pattern="\d{6}"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      style={{ width: "100%", height: "48px", border: "1px solid var(--border)", borderRadius: "var(--radius)", paddingLeft: "48px", fontSize: "1.25rem", letterSpacing: "6px", color: "var(--text)", boxSizing: "border-box", fontWeight: 600 }}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "1.25rem 0" }}>
                  <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                  <span style={{ fontSize: "0.8rem", color: "var(--text-light)", fontWeight: 500 }}>Create Your Password</span>
                  <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                </div>

                {/* New Password */}
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="new_password" style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text)", fontSize: "0.9rem" }}>New Password</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <i className="fas fa-lock" style={{ position: "absolute", left: "16px", color: "var(--primary)", fontSize: "1.1rem", zIndex: 2 }} />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="new_password"
                      placeholder="Enter new password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ width: "100%", height: "48px", border: "1px solid var(--border)", borderRadius: "var(--radius)", paddingLeft: "48px", paddingRight: "48px", fontSize: "1rem", color: "var(--text)", boxSizing: "border-box" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label="Toggle password visibility"
                      style={{ position: "absolute", right: "16px", background: "none", border: "none", color: "var(--text-light)", cursor: "pointer", fontSize: "1.1rem" }}
                    >
                      <i className={`fas ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`} />
                    </button>
                  </div>
                  <small style={{ color: "var(--text-light)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>Minimum 8 characters</small>
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label htmlFor="confirm_password" style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text)", fontSize: "0.9rem" }}>Confirm Password</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <i className="fas fa-lock" style={{ position: "absolute", left: "16px", color: "var(--primary)", fontSize: "1.1rem", zIndex: 2 }} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirm_password"
                      placeholder="Confirm new password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ width: "100%", height: "48px", border: "1px solid var(--border)", borderRadius: "var(--radius)", paddingLeft: "48px", paddingRight: "48px", fontSize: "1rem", color: "var(--text)", boxSizing: "border-box" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label="Toggle password visibility"
                      style={{ position: "absolute", right: "16px", background: "none", border: "none", color: "var(--text-light)", cursor: "pointer", fontSize: "1.1rem" }}
                    >
                      <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`} />
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", height: "48px", backgroundColor: loading ? "#cbd5e0" : "var(--primary)", color: "white", border: "none", borderRadius: "var(--radius)", fontWeight: 600, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer" }}
                >
                  <i className="fas fa-check-circle" />
                  {loading ? "Setting up..." : "Set Up Account"}
                </button>
              </form>
            </>
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
