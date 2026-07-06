"use client";

import { useState, useEffect, useCallback } from "react";

const DEFAULT_RECIPIENT = "";

/* ── Filament (Blue) design tokens ───────────────────────────────────────── */
const F = {
  pageBg: "#f9fafb",        // gray-50
  card: "#ffffff",
  cardShadow: "0 0 0 1px rgba(17,24,39,0.05), 0 1px 2px 0 rgba(0,0,0,0.05)",
  heading: "#111827",       // gray-900/950
  muted: "#6b7280",         // gray-500
  faint: "#9ca3af",         // gray-400
  strong: "#374151",        // gray-700
  border: "#e5e7eb",        // gray-200
  hair: "#f3f4f6",          // gray-100
  primary: "#007890",       // FSA teal
  primaryHover: "#005f73",
  primary50: "#e0f2f5",     // teal-50 tint
  primary700: "#005f73",
  primaryDisabled: "#80bcc7",
  inputRing: "#d1d5db",     // gray-300
};

interface Notification {
  id: number; title: string; message: string; type: string;
  priority: string; is_read: boolean; created_at: string; action_url?: string | null;
}
interface LastSent { sent_at: string; message: string; }

const TYPE_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  success: { icon: "fas fa-check-circle", color: "#16a34a", bg: "#dcfce7" },
  info:    { icon: "fas fa-info-circle",  color: "#2563eb", bg: "#dbeafe" },
  warning: { icon: "fas fa-exclamation-triangle", color: "#d97706", bg: "#fef3c7" },
  error:   { icon: "fas fa-times-circle", color: "#dc2626", bg: "#fee2e2" },
  danger:  { icon: "fas fa-times-circle", color: "#dc2626", bg: "#fee2e2" },
};
const DEFAULT_TYPE = { icon: "fas fa-bell", color: "#6b7280", bg: "#f3f4f6" };

const PRIORITY_STYLE: Record<string, { bg: string; color: string; ring: string }> = {
  high:     { bg: "#fef2f2", color: "#b91c1c", ring: "rgba(220,38,38,0.1)" },
  critical: { bg: "#fef2f2", color: "#b91c1c", ring: "rgba(220,38,38,0.1)" },
  medium:   { bg: "#e0f2f5", color: "#005f73", ring: "rgba(0,120,144,0.12)" },
  low:      { bg: "#f9fafb", color: "#4b5563", ring: "rgba(17,24,39,0.06)" },
};

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} minute${m !== 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h !== 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d} day${d !== 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

/* Filament section card */
function Section({ title, description, action, children, noPad }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; noPad?: boolean; }) {
  return (
    <section style={{ background: F.card, borderRadius: 12, boxShadow: F.cardShadow }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 24px", borderBottom: `1px solid ${F.hair}` }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: F.heading }}>{title}</h3>
          {description && <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: F.muted }}>{description}</p>}
        </div>
        {action}
      </div>
      <div style={{ padding: noPad ? 0 : 24 }}>{children}</div>
    </section>
  );
}

/* Filament stat-overview widget */
function Stat({ label, value, icon, color, tint }: { label: string; value: React.ReactNode; icon: string; color: string; tint: string; }) {
  return (
    <div style={{ background: F.card, borderRadius: 12, boxShadow: F.cardShadow, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 500, color: F.muted }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={icon} style={{ color, fontSize: "0.9rem" }} />
        </div>
      </div>
      <div style={{ fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.02em", color: F.primary, marginTop: 8, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

/* Filament buttons */
function btnPrimary(disabled = false): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: disabled ? F.primaryDisabled : F.primary, color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", whiteSpace: "nowrap" };
}
function btnSecondary(disabled = false): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#fff", color: F.strong, fontSize: "0.82rem", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", boxShadow: "0 0 0 1px rgba(17,24,39,0.1), 0 1px 2px 0 rgba(0,0,0,0.05)", border: "none", whiteSpace: "nowrap", opacity: disabled ? 0.6 : 1 };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState(DEFAULT_RECIPIENT);
  const [lastSent, setLastSent] = useState<LastSent | null>(null);
  const [samplesThisMonth, setSamplesThisMonth] = useState<number | null>(null);
  const [emailsSent, setEmailsSent] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setNotifications(Array.isArray(d.notifications) ? d.notifications : []);
        setUnreadCount(d.unread_count ?? 0);
        setLoading(false);
      })
      .catch(() => { setNotifications([]); setUnreadCount(0); setLoading(false); });
  }, []);

  const loadInfo = useCallback(() => {
    fetch("/api/kpi-report?info=1", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setLastSent(d.last_sent || null); setSamplesThisMonth(d.samples_this_month ?? null); setEmailsSent(d.emails_sent ?? null); })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); loadInfo(); }, [load, loadInfo]);

  const markRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try { await fetch(`/api/notifications/${id}/read`, { method: "POST" }); } catch {}
  };
  const markAllRead = async () => {
    setBusy(true);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try { await fetch("/api/notifications/mark-all-read", { method: "POST" }); } catch {}
    setBusy(false);
  };
  const remove = async (id: number) => {
    const wasUnread = notifications.find(n => n.id === id)?.is_read === false;
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
    try { await fetch(`/api/notifications/${id}/delete`, { method: "POST" }); } catch {}
  };
  const sendReport = async () => {
    if (!email.trim()) { setSendMsg({ ok: false, text: "Enter a recipient email." }); return; }
    setSending(true); setSendMsg(null);
    try {
      const res = await fetch("/api/kpi-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const d = await res.json();
      if (d.success) { setSendMsg({ ok: true, text: d.message || "Report sent." }); loadInfo(); load(); }
      else setSendMsg({ ok: false, text: d.error || "Failed to send report." });
    } catch (e) { setSendMsg({ ok: false, text: String(e) }); }
    finally { setSending(false); }
  };

  return (
    <>
      <div style={{ padding: "32px 32px 48px" }}>
        {/* Page header — over the FSA photo background (white for contrast) */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>Notifications</h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "rgba(255,255,255,0.9)", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>Reports and system alerts{unreadCount > 0 ? ` · ${unreadCount} unread` : ""}.</p>
        </div>

        {/* Stat widgets */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <Stat label="Unread notifications" value={unreadCount} icon="fas fa-bell" color={F.primary} tint={F.primary50} />
          <Stat label="Lab samples this month" value={samplesThisMonth ?? "—"} icon="fas fa-flask" color={F.primary} tint={F.primary50} />
          <Stat label="Reports emailed" value={emailsSent ?? "—"} icon="fas fa-paper-plane" color="#16a34a" tint="#dcfce7" />
        </div>

        {/* KPI Report section */}
        <div style={{ marginBottom: 24 }}>
          <Section
            title="Inspector KPI Report"
            description={lastSent ? `Last sent ${new Date(lastSent.sent_at).toLocaleString()}` : "This report has not been sent yet."}
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="recipient@example.com"
                style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: F.strong, background: "#fff", border: "none", boxShadow: `0 0 0 1px ${F.inputRing}, 0 1px 2px 0 rgba(0,0,0,0.05)`, boxSizing: "border-box" }} />
              <button onClick={sendReport} disabled={sending} style={btnPrimary(sending)}>
                <i className="fas fa-paper-plane" /> {sending ? "Sending…" : "Send report now"}
              </button>
            </div>
            {sendMsg && (
              <div style={{ padding: "10px 14px", borderRadius: 8, marginTop: 12, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 8,
                background: sendMsg.ok ? "#f0fdf4" : "#fef2f2", color: sendMsg.ok ? "#166534" : "#b91c1c",
                boxShadow: `0 0 0 1px ${sendMsg.ok ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)"}` }}>
                <i className={`fas ${sendMsg.ok ? "fa-circle-check" : "fa-circle-exclamation"}`} />
                {sendMsg.text}
              </div>
            )}
          </Section>
        </div>

        {/* Notifications list section */}
        <Section
          title="Recent notifications"
          description={loading ? "Loading…" : `${notifications.length} item${notifications.length !== 1 ? "s" : ""}`}
          noPad
          action={
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={load} disabled={busy} style={btnSecondary(busy)}><i className="fas fa-arrows-rotate" /> Refresh</button>
              <button onClick={markAllRead} disabled={busy || unreadCount === 0} style={unreadCount === 0 ? btnSecondary(true) : btnPrimary(false)}><i className="fas fa-check-double" /> Mark all read</button>
            </div>
          }
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", color: F.muted, fontSize: "0.85rem" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${F.border}`, borderTopColor: F.primary, animation: "spin 0.8s linear infinite", marginRight: 10 }} />
              Loading notifications…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px" }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: F.hair, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <i className="fas fa-bell-slash" style={{ fontSize: "1.15rem", color: F.faint }} />
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: F.heading }}>No notifications</div>
              <div style={{ fontSize: "0.82rem", color: F.muted, marginTop: 2 }}>New notifications will appear here.</div>
            </div>
          ) : (
            notifications.map((n, i) => {
              const ts = TYPE_STYLE[n.type] ?? DEFAULT_TYPE;
              const pr = PRIORITY_STYLE[n.priority];
              return (
                <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                  style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 24px", borderTop: i === 0 ? "none" : `1px solid ${F.hair}`, background: n.is_read ? "#fff" : "#f8fafc", cursor: n.is_read ? "default" : "pointer" }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: ts.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={ts.icon} style={{ color: ts.color, fontSize: "0.95rem" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.875rem", color: F.heading }}>{n.title}</span>
                      {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: F.primary, flexShrink: 0 }} />}
                      {pr && <span style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "capitalize", padding: "1px 8px", borderRadius: 6, background: pr.bg, color: pr.color, boxShadow: `0 0 0 1px ${pr.ring}` }}>{n.priority}</span>}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: F.muted, marginTop: 3, lineHeight: 1.45 }}>{n.message}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
                      <span style={{ fontSize: "0.72rem", color: F.faint }}><i className="far fa-clock" style={{ marginRight: 4 }} />{timeAgo(n.created_at)}</span>
                      {n.action_url && <a href={n.action_url} onClick={e => e.stopPropagation()} style={{ fontSize: "0.72rem", color: F.primary, fontWeight: 600, textDecoration: "none" }}>View <i className="fas fa-arrow-right" style={{ fontSize: "0.6rem" }} /></a>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); remove(n.id); }} title="Delete"
                    style={{ flexShrink: 0, background: "none", border: "none", color: F.faint, cursor: "pointer", padding: 6, fontSize: "0.82rem", borderRadius: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "#fef2f2"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = F.faint; e.currentTarget.style.background = "none"; }}>
                    <i className="fas fa-trash-can" />
                  </button>
                </div>
              );
            })
          )}
        </Section>
      </div>
    </>
  );
}
