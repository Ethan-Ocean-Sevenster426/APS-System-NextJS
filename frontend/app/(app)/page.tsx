"use client";

import { useState, useEffect } from "react";

const ALL_QUICK_LINKS = [
  { href: "/inspections",    icon: "fas fa-clipboard-list",    color: "#2563eb", tint: "#dbeafe", title: "Inspections",              sub: "View & manage records",   roles: ["inspector","inspector_manager","lab_technician","admin","financial","super_admin","developer"] },
  { href: "/export-sheet",   icon: "fas fa-file-invoice",      color: "#16a34a", tint: "#dcfce7", title: "Export Sheet",             sub: "Invoice dashboard",       roles: ["admin","financial","super_admin","developer"] },
  { href: "/analytics",      icon: "fas fa-chart-bar",         color: "#7c3aed", tint: "#f3e8ff", title: "Analytics",                sub: "View insights",           roles: ["inspector","inspector_manager","super_admin","developer"] },
  { href: "/clients",        icon: "fas fa-users",             color: "#ea580c", tint: "#ffedd5", title: "Client Allocation Sheet",  sub: "Manage allocations",      roles: ["admin","financial","super_admin","developer"] },
];

const QUICK_ACTIONS = [
  { href: "/clients",      icon: "fas fa-users",             label: "View All Clients",      roles: ["admin","financial","super_admin","developer"] },
  { href: "/inspections",  icon: "fas fa-clipboard-check",   label: "View All Inspections",  roles: ["inspector","inspector_manager","lab_technician","admin","financial","super_admin","developer"] },
];

interface Activity { action: string; description: string; username: string; timestamp: string; }

const ACTION_CONFIG: Record<string, { icon: string; color: string; tint: string; label: string }> = {
  SYNC:        { icon: "fas fa-sync",          color: "#16a34a", tint: "#dcfce7", label: "Data synced successfully" },
  CREATE:      { icon: "fas fa-plus-circle",   color: "#2563eb", tint: "#dbeafe", label: "New record created" },
  LOGIN:       { icon: "fas fa-sign-in-alt",   color: "#007890", tint: "#e0f2f5", label: "User logged in" },
  LOGOUT:      { icon: "fas fa-sign-out-alt",  color: "#6b7280", tint: "#f3f4f6", label: "User logged out" },
  UPDATE:      { icon: "fas fa-edit",          color: "#ca8a04", tint: "#fef3c7", label: "Record updated" },
  DELETE:      { icon: "fas fa-trash",         color: "#dc2626", tint: "#fee2e2", label: "Record deleted" },
  EXPORT:      { icon: "fas fa-download",      color: "#2563eb", tint: "#dbeafe", label: "Data exported" },
  FILE_UPLOAD: { icon: "fas fa-file-upload",   color: "#4338ca", tint: "#e0e7ff", label: "File uploaded" },
  IMPORT:      { icon: "fas fa-upload",        color: "#16a34a", tint: "#dcfce7", label: "Data imported" },
  SETTINGS:    { icon: "fas fa-cog",           color: "#6b7280", tint: "#f3f4f6", label: "Settings updated" },
};
const DEFAULT_ACTION_CONFIG = { icon: "fas fa-info-circle", color: "#6b7280", tint: "#f3f4f6", label: "" };

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60); if (m < 60) return `${m} minute${m !== 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h !== 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d} day${d !== 1 ? "s" : ""} ago`;
  return `${Math.floor(d / 30)} month${Math.floor(d / 30) !== 1 ? "s" : ""} ago`;
}

/* ── Filament (FSA teal) ─────────────────────────────────────────────────── */
const F = { card: "#fff", cardShadow: "0 0 0 1px rgba(17,24,39,0.05), 0 1px 2px 0 rgba(0,0,0,0.05)", heading: "#111827", muted: "#6b7280", hair: "#f3f4f6", primary: "#007890", primary50: "#e0f2f5" };
const spinner = <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid rgba(0,120,144,0.2)", borderTopColor: F.primary, animation: "spin 0.8s linear infinite" }} />;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: F.card, borderRadius: 12, boxShadow: F.cardShadow }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${F.hair}` }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: F.heading }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </section>
  );
}
function Stat({ label, value, icon, tint, color }: { label: string; value: React.ReactNode; icon: string; tint: string; color: string }) {
  return (
    <div style={{ background: F.card, borderRadius: 12, boxShadow: F.cardShadow, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 500, color: F.muted }}>{label}</span>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={icon} style={{ color, fontSize: "0.95rem" }} />
        </div>
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", color: F.primary, marginTop: 10, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function HomePage() {
  const [totalClients, setTotalClients] = useState<number | null>(null);
  const [totalInspections, setTotalInspections] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/home-stats").then(r => r.json()).then(d => {
      setTotalClients(d.clients ?? 0);
      setTotalInspections(d.inspections ?? 0);
      setRecentActivities(Array.isArray(d.recent_activities) ? d.recent_activities.slice(0, 8) : []);
      setLoading(false);
    }).catch(() => { setTotalClients(0); setTotalInspections(0); setRecentActivities([]); setLoading(false); });
  }, []);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then(r => r.json())
      .then(d => setRole(d.authenticated ? (d.role || "inspector") : "inspector")).catch(() => setRole("inspector"));
  }, []);

  const quickLinks = role ? ALL_QUICK_LINKS.filter(l => l.roles.includes(role)) : [];
  const quickActions = role ? QUICK_ACTIONS.filter(a => a.roles.includes(role)) : [];

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 900px) { .home-stats-grid, .home-content-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>Welcome to Food Safety Agency</h1>
        <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "rgba(255,255,255,0.9)", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>Your comprehensive food safety management platform.</p>
      </div>

      {/* Stat widgets */}
      <div className="home-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Stat label="Total Clients" value={loading ? spinner : (totalClients ?? 0).toLocaleString()} icon="fas fa-users" tint={F.primary50} color={F.primary} />
        <Stat label="Total Inspections" value={loading ? spinner : (totalInspections ?? 0).toLocaleString()} icon="fas fa-clipboard-list" tint="#dbeafe" color="#2563eb" />
      </div>

      {/* Quick Access */}
      <div style={{ marginBottom: 20 }}>
        <Section title="Quick Access">
          <p style={{ color: F.muted, lineHeight: 1.5, margin: "0 0 14px", fontSize: "0.82rem" }}>
            Welcome to the Food Safety Agency management system. Data syncs automatically every hour in the background.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, minHeight: 64 }}>
            {quickLinks.map(link => (
              <a key={link.href} href={link.href} style={{
                background: "#fff", borderRadius: 10, boxShadow: "0 0 0 1px rgba(17,24,39,0.06)", padding: "12px 14px",
                textDecoration: "none", display: "flex", alignItems: "center", gap: 12, transition: "box-shadow 0.2s, transform 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,120,144,0.3), 0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(17,24,39,0.06)"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: link.tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={link.icon} style={{ fontSize: "1rem", color: link.color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: F.heading, fontSize: "0.85rem" }}>{link.title}</div>
                  <div style={{ fontSize: "0.72rem", color: F.muted, marginTop: 1 }}>{link.sub}</div>
                </div>
              </a>
            ))}
          </div>
        </Section>
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="home-content-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Section title="Quick Actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {quickActions.map(action => (
              <a key={action.href} href={action.href} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f9fafb",
                borderRadius: 8, textDecoration: "none", transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
              onMouseLeave={e => e.currentTarget.style.background = "#f9fafb"}>
                <i className={action.icon} style={{ color: F.primary, fontSize: "0.85rem", width: 16, textAlign: "center" }} />
                <span style={{ fontWeight: 500, color: F.heading, fontSize: "0.82rem" }}>{action.label}</span>
              </a>
            ))}
          </div>
        </Section>

        <Section title="Recent Activity">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentActivities.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: F.muted, fontStyle: "italic" }}>No recent activity</div>
            ) : recentActivities.map((activity, idx) => {
              const cfg = ACTION_CONFIG[activity.action] || DEFAULT_ACTION_CONFIG;
              return (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: cfg.tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={cfg.icon} style={{ color: cfg.color, fontSize: "0.72rem" }} />
                  </div>
                  <div style={{ flex: 1, lineHeight: 1.4 }}>
                    <span style={{ fontSize: "0.8rem", color: "#374151" }}>{activity.description || cfg.label}</span>
                    <span style={{ color: "#9ca3af", fontSize: "0.7rem", marginLeft: 6 }}>{timeAgo(activity.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}
