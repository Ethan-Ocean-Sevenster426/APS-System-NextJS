"use client";

/* Weekly Email Logs — read-only view of every automatic email the system
 * sent or tried to send (the weekly report emails run in the background on
 * their own schedules). Management-only. */

import React, { useEffect, useState } from "react";

interface LogRow {
  automation: string; run_at: string; week_start: string; week_end: string;
  status: string; recipients: string; error: string; triggered_by: string;
}

const ADMIN_ROLES = ["super_admin", "developer", "admin"];

const C = {
  card: "#ffffff", cardShadow: "0 2px 12px rgba(0,0,0,0.08)",
  heading: "#111827", muted: "#6b7280", border: "#e5e7eb", hair: "#f3f4f6",
  primary: "#007890", primaryLight: "#e6f7f9", green: "#15803d", greenLight: "#dcfce7",
  red: "#dc2626", redLight: "#fee2e2", amber: "#d97706", amberLight: "#fef3c7",
  blue: "#2563eb", blueLight: "#dbeafe", grayLight: "#f3f4f6",
};

const cardStyle: React.CSSProperties = { background: C.card, boxShadow: C.cardShadow, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 14 };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    SENT: { bg: C.greenLight, fg: C.green, label: "Sent" },
    TEST: { bg: C.blueLight, fg: C.blue, label: "Test sent" },
    FAILED: { bg: C.redLight, fg: C.red, label: "Failed" },
    SKIPPED_OFF: { bg: C.grayLight, fg: C.muted, label: "Skipped — switch off" },
    NO_RECIPIENTS: { bg: C.amberLight, fg: C.amber, label: "Skipped — no recipients" },
    ALREADY_SENT: { bg: C.grayLight, fg: C.muted, label: "Skipped — already sent" },
  };
  const s = map[status] || { bg: C.grayLight, fg: C.muted, label: status };
  return <span style={{ background: s.bg, color: s.fg, padding: "3px 9px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function fmtRunAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtWeek(startIso: string, endIso: string): string {
  const f = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return `${f(startIso)} — ${f(endIso)}`;
}

export default function WeeklyEmailLogsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) { window.location.href = "/login"; return; }
        setRole(d.role || "inspector");
      })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  const canView = role !== null && ADMIN_ROLES.includes(role);

  useEffect(() => {
    if (!canView) return;
    fetch("/api/weekly-email/logs", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (!d.success) throw new Error(d.error || "Could not load the email log");
        setLogs(d.logs);
      })
      .catch(e => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [canView]);

  if (role !== null && !canView) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
        <i className="fas fa-lock" style={{ fontSize: 28, marginBottom: 12 }} />
        <p>You don&apos;t have permission to view this page.</p>
        <a href="/inspections" style={{ color: "#007890" }}>Back to Inspections</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 26px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="fas fa-envelope-open-text" style={{ color: C.primary, fontSize: "1.15rem" }} />
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: C.heading, margin: 0, lineHeight: 1.2 }}>Weekly Email Logs</h1>
          <p style={{ fontSize: "0.8rem", color: C.muted, margin: "4px 0 0" }}>
            The weekly report emails send themselves in the background. Every attempt is recorded here — sent, failed (with the reason), and skipped — so a missed send never disappears quietly.
          </p>
        </div>
      </div>

      {error && <div style={{ ...cardStyle, color: C.red }}><i className="fas fa-exclamation-circle" /> {error}</div>}
      {loading && !error && <div style={{ ...cardStyle, color: C.muted }}>Loading the email log...</div>}

      {!loading && !error && (
        <div style={cardStyle}>
          {logs.length === 0 ? (
            <p style={{ color: C.muted, fontSize: "0.82rem", margin: 0 }}>Nothing yet — the first send will appear here.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["When", "Email", "Report week", "Result", "Sent to", "Details", "Started by"].map(hd => (
                      <th key={hd} style={{ textAlign: "left", padding: "7px 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.muted, borderBottom: `2px solid ${C.border}`, whiteSpace: "nowrap" }}>{hd}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.hair}` }}>
                      <td style={{ padding: "8px", fontSize: "0.78rem", whiteSpace: "nowrap" }}>{fmtRunAt(l.run_at)}</td>
                      <td style={{ padding: "8px", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>{l.automation || "—"}</td>
                      <td style={{ padding: "8px", fontSize: "0.78rem", whiteSpace: "nowrap" }}>{fmtWeek(l.week_start, l.week_end)}</td>
                      <td style={{ padding: "8px" }}><StatusBadge status={l.status} /></td>
                      <td style={{ padding: "8px", fontSize: "0.78rem", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.recipients}>{l.recipients || "—"}</td>
                      <td style={{ padding: "8px", fontSize: "0.75rem", color: C.red, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.error}>{l.error || ""}</td>
                      <td style={{ padding: "8px", fontSize: "0.78rem", color: C.muted }}>{l.triggered_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
