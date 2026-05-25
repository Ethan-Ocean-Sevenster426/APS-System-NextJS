"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const e = searchParams.get("email");
    if (e) setEmail(e);
  }, [searchParams]);

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
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
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
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
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

  const inputStyle: React.CSSProperties = {
    width: "100%", height: "44px", border: "1px solid #e5e7eb", borderRadius: "6px",
    paddingLeft: "44px", fontSize: "0.95rem", color: "#1f2937", boxSizing: "border-box",
  };
  const iconStyle: React.CSSProperties = {
    position: "absolute", left: "14px", color: "#007890", fontSize: "1rem", zIndex: 2,
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontWeight: 600, marginBottom: "0.3rem", color: "#1f2937", fontSize: "0.85rem",
  };

  return (
    <>
      {/* Success */}
      {success && (
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className="fas fa-check" style={{ fontSize: 28, color: "#16a34a" }} />
          </div>
          <h3 style={{ margin: "0 0 8px", color: "#1f2937", fontSize: "1.1rem" }}>Account Set Up Successfully</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Redirecting you to the login page...</p>
        </div>
      )}

      {/* Form */}
      {!success && (
        <>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "10px 14px", borderRadius: "6px", marginBottom: "14px", fontSize: "0.82rem", lineHeight: 1.5 }}>
            <i className="fas fa-info-circle" style={{ marginRight: "6px" }} />
            Enter the 6-digit code from your email, fill in your details, and create a password.
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: "6px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Email — disabled, auto-filled */}
            <div style={{ marginBottom: "0.85rem" }}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <i className="fas fa-envelope" style={iconStyle} />
                <input
                  type="email"
                  value={email}
                  disabled
                  style={{ ...inputStyle, background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
                />
              </div>
            </div>

            {/* OTP Code */}
            <div style={{ marginBottom: "0.85rem" }}>
              <label htmlFor="otp_code" style={labelStyle}>OTP Code</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <i className="fas fa-key" style={iconStyle} />
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
                  style={{ ...inputStyle, fontSize: "1.15rem", letterSpacing: "6px", fontWeight: 600 }}
                />
              </div>
            </div>

            {/* Divider — Your Details */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "1rem 0 0.85rem" }}>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
              <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 500 }}>Your Details</span>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
            </div>

            {/* First Name / Last Name — side by side on desktop, stacked on mobile */}
            <div className="setup-name-row">
              <div style={{ flex: 1, marginBottom: "0.85rem" }}>
                <label htmlFor="first_name" style={labelStyle}>First Name</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <i className="fas fa-user" style={iconStyle} />
                  <input
                    type="text"
                    id="first_name"
                    placeholder="First name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ flex: 1, marginBottom: "0.85rem" }}>
                <label htmlFor="last_name" style={labelStyle}>Last Name</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <i className="fas fa-user" style={iconStyle} />
                  <input
                    type="text"
                    id="last_name"
                    placeholder="Last name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Username */}
            <div style={{ marginBottom: "0.85rem" }}>
              <label htmlFor="username" style={labelStyle}>Username</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <i className="fas fa-at" style={iconStyle} />
                <input
                  type="text"
                  id="username"
                  placeholder="Choose a username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <small style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "2px", display: "block" }}>This is what you will use to log in</small>
            </div>

            {/* Divider — Password */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "1rem 0 0.85rem" }}>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
              <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 500 }}>Create Your Password</span>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
            </div>

            {/* New Password */}
            <div style={{ marginBottom: "0.85rem" }}>
              <label htmlFor="new_password" style={labelStyle}>New Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <i className="fas fa-lock" style={iconStyle} />
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="new_password"
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: "44px" }}
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} aria-label="Toggle password visibility"
                  style={{ position: "absolute", right: "14px", background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1rem" }}>
                  <i className={`fas ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
              <small style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "2px", display: "block" }}>Minimum 8 characters</small>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="confirm_password" style={labelStyle}>Confirm Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <i className="fas fa-lock" style={iconStyle} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirm_password"
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: "44px" }}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="Toggle password visibility"
                  style={{ position: "absolute", right: "14px", background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1rem" }}>
                  <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", height: "46px", backgroundColor: loading ? "#cbd5e0" : "#007890", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer" }}>
              <i className="fas fa-check-circle" />
              {loading ? "Setting up..." : "Set Up Account"}
            </button>
          </form>
        </>
      )}

      {/* Back to login */}
      <div style={{ textAlign: "center", marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid #e5e7eb" }}>
        <Link href="/login" style={{ color: "#007890", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <i className="fas fa-arrow-left" /> Back to Sign In
        </Link>
      </div>
    </>
  );
}

export default function SetupAccountPage() {
  return (
    <>
      <style>{`
        :root { --primary: #007890; }
        body {
          background-image: url('/background.jpg');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          margin: 0;
          min-height: 100vh;
          overflow-y: auto;
        }
        body::before {
          content: "";
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
          z-index: 0;
        }
        .setup-name-row {
          display: flex;
          gap: 10px;
        }
        @media (max-width: 500px) {
          .setup-name-row {
            flex-direction: column;
            gap: 0;
          }
        }
      `}</style>

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 10px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <Image src="/logo.png" alt="Food Safety Agency Logo" width={70} height={60} style={{ maxHeight: "60px", width: "auto" }} />
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <h1 style={{ color: "white", fontSize: "1.3rem", fontWeight: 600, marginBottom: "2px" }}>Food Safety Agency (Pty) Ltd</h1>
          <h2 style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.95rem", fontWeight: 400, margin: 0 }}>Set Up Your Account</h2>
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", width: "92%", maxWidth: "460px", padding: "1.5rem" }}>
          {/* Card header */}
          <div style={{ borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px", paddingBottom: "10px" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#007890", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fas fa-user-plus" /> Account Setup
            </span>
          </div>

          <Suspense fallback={<div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Loading...</div>}>
            <SetupForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
