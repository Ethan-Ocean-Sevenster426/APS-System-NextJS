"use client";

import { useState, useEffect } from "react";

const PRIMARY = "#007890";
const BORDER = "#e5e7eb";
const TEXT = "#1f2937";
const TEXT_LIGHT = "#6b7280";

export default function InspectorSettingsPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch user info on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch user info");
        const data = await res.json();
        if (!data.authenticated) {
          window.location.href = "/login";
          return;
        }
        const role = data.role || "inspector";
        if (role !== "inspector" && role !== "inspector_manager") {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || "");
      } catch {
        showToast("Failed to load user info", false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      setDarkMode(false);
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/inspector-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          first_name: firstName,
          last_name: lastName,
          email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Profile updated successfully");
      } else {
        showToast(data.error || "Failed to update profile", false);
      }
    } catch {
      showToast("Failed to update profile", false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    const themeValue = newMode ? "dark" : "light";

    // Apply immediately
    localStorage.setItem("theme", themeValue);
    document.documentElement.setAttribute("data-theme", themeValue);

    // Persist to backend
    setSavingTheme(true);
    try {
      const res = await fetch("/api/inspector-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_theme", theme_mode: newMode ? "on" : "off" }),
      });
      if (res.ok) {
        showToast(`Theme switched to ${newMode ? "dark" : "light"} mode`);
      } else {
        showToast("Failed to save theme preference", false);
      }
    } catch {
      showToast("Failed to save theme preference", false);
    } finally {
      setSavingTheme(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 36, height: 36,
            border: "3px solid #e2e8f0", borderTopColor: "#007890",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }} />
          <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <>
        <div style={{ padding: "32px", background: "transparent", minHeight: "100vh" }}>
          <div style={{
            background: "#fff", borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: "48px 32px", textAlign: "center",
            maxWidth: 500, margin: "80px auto",
          }}>
            <i className="fas fa-lock" style={{ fontSize: "2.5rem", color: "#dc2626", marginBottom: 16, display: "block" }} />
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>Access Denied</h2>
            <p style={{ fontSize: "0.9rem", color: TEXT_LIGHT, margin: 0 }}>
              This page is for inspectors only.
            </p>
          </div>
        </div>
      </>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    fontSize: "0.9rem",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    color: TEXT,
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: TEXT,
    marginBottom: 6,
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 10000,
          background: toast.ok ? "#059669" : "#dc2626", color: "#fff",
          padding: "12px 22px", borderRadius: 8, fontSize: 14, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`fas ${toast.ok ? "fa-check-circle" : "fa-exclamation-circle"}`} />
          {toast.msg}
        </div>
      )}

      <div style={{ padding: "32px", background: "transparent", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <h1 style={{
            fontSize: "1.6rem", fontWeight: 700, color: "white",
            display: "inline-flex", alignItems: "center", gap: 12,
            margin: "0 0 6px", textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}>
            <i className="fas fa-user-cog" style={{ color: "#5ee8ff" }} />
            Inspector Settings
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.4)", fontSize: 14 }}>
            Manage your profile and preferences.
          </p>
        </div>

        {/* Profile Card */}
        <div style={{
          background: "#fff", borderRadius: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          padding: "28px 32px",
          width: "100%",
          marginBottom: 24,
        }}>
          <h2 style={{
            fontSize: "1.15rem", fontWeight: 700, color: TEXT,
            margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <i className="fas fa-user-edit" style={{ color: PRIMARY }} />
            Profile
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            <div>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            <div style={{ paddingTop: 4 }}>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  background: saving ? "#94a3b8" : PRIMARY,
                  color: "#fff", border: "none", borderRadius: 8,
                  fontWeight: 600, fontSize: "0.88rem",
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  transition: "background 0.15s",
                }}
              >
                <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-save"}`} />
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Card */}
        <div style={{
          background: "#fff", borderRadius: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          padding: "28px 32px",
          width: "100%",
          marginBottom: 24,
        }}>
          <h2 style={{
            fontSize: "1.15rem", fontWeight: 700, color: TEXT,
            margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <i className="fas fa-palette" style={{ color: PRIMARY }} />
            Appearance
          </h2>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", background: "#f9fafb", borderRadius: 10,
            border: `1px solid ${BORDER}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <i
                className={`fas ${darkMode ? "fa-moon" : "fa-sun"}`}
                style={{ fontSize: "1.2rem", color: darkMode ? "#6366f1" : "#f59e0b" }}
              />
              <div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: TEXT }}>Dark Mode</div>
                <div style={{ fontSize: "0.8rem", color: TEXT_LIGHT, marginTop: 2 }}>
                  {darkMode ? "Dark theme is active" : "Light theme is active"}
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={handleToggleDarkMode}
              disabled={savingTheme}
              aria-label="Toggle dark mode"
              style={{
                position: "relative",
                width: 52,
                height: 28,
                borderRadius: 14,
                border: "none",
                background: darkMode ? PRIMARY : "#d1d5db",
                cursor: savingTheme ? "not-allowed" : "pointer",
                transition: "background 0.25s",
                padding: 0,
                opacity: savingTheme ? 0.6 : 1,
              }}
            >
              <span style={{
                position: "absolute",
                top: 3,
                left: darkMode ? 27 : 3,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                transition: "left 0.25s",
              }} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
