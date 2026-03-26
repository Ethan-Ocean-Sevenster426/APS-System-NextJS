"use client";

import { useState, useEffect } from "react";

const ALL_QUICK_LINKS = [
  { href: "/inspections",    icon: "fas fa-clipboard-list",    color: "#2563eb", title: "Inspections",              sub: "View & manage records",   roles: ["inspector","inspector_manager","lab_technician","admin","financial","super_admin","developer"] },
  { href: "/export-sheet",   icon: "fas fa-file-invoice",      color: "#16a34a", title: "Export Sheet",             sub: "Invoice dashboard",       roles: ["admin","financial","super_admin","developer"] },
  { href: "/analytics",      icon: "fas fa-chart-bar",         color: "#7c3aed", title: "Analytics",                sub: "View insights",           roles: ["inspector","inspector_manager","super_admin","developer"] },
  { href: "/clients",        icon: "fas fa-users",             color: "#ea580c", title: "Client Allocation Sheet",  sub: "Manage allocations",      roles: ["admin","financial","super_admin","developer"] },
];

const QUICK_ACTIONS = [
  { href: "/clients",      icon: "fas fa-users",             label: "View All Clients",      roles: ["admin","financial","super_admin","developer"] },
  { href: "/inspections",  icon: "fas fa-clipboard-check",   label: "View All Inspections",  roles: ["inspector","inspector_manager","lab_technician","admin","financial","super_admin","developer"] },
];

interface Activity {
  action: string;
  description: string;
  username: string;
  timestamp: string;
}

const ACTION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  SYNC:        { icon: "fas fa-sync",          color: "#16a34a", label: "Data synced successfully" },
  CREATE:      { icon: "fas fa-plus-circle",   color: "#2563eb", label: "New record created" },
  LOGIN:       { icon: "fas fa-sign-in-alt",   color: "#2563eb", label: "User logged in" },
  LOGOUT:      { icon: "fas fa-sign-out-alt",  color: "#6b7280", label: "User logged out" },
  UPDATE:      { icon: "fas fa-edit",          color: "#ca8a04", label: "Record updated" },
  DELETE:      { icon: "fas fa-trash",         color: "#dc2626", label: "Record deleted" },
  EXPORT:      { icon: "fas fa-download",      color: "#2563eb", label: "Data exported" },
  FILE_UPLOAD: { icon: "fas fa-file-upload",   color: "#2563eb", label: "File uploaded" },
  IMPORT:      { icon: "fas fa-upload",        color: "#16a34a", label: "Data imported" },
  SETTINGS:    { icon: "fas fa-cog",           color: "#6b7280", label: "Settings updated" },
};

const DEFAULT_ACTION_CONFIG = { icon: "fas fa-info-circle", color: "#6b7280", label: "" };

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? "s" : ""} ago`;
}

export default function HomePage() {
  const [totalClients, setTotalClients] = useState<number | null>(null);
  const [totalInspections, setTotalInspections] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; latency?: number; name?: string; host?: string }>({ connected: false });

  useEffect(() => {
    fetch("/api/home-stats")
      .then(r => r.json())
      .then(d => {
        setTotalClients(d.clients ?? 0);
        setTotalInspections(d.inspections ?? 0);
        setRecentActivities(Array.isArray(d.recent_activities) ? d.recent_activities.slice(0, 8) : []);
        setLoading(false);
      })
      .catch(() => {
        setTotalClients(0);
        setTotalInspections(0);
        setRecentActivities([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => setRole(d.authenticated ? (d.role || "inspector") : "inspector"))
      .catch(() => setRole("inspector"));
  }, []);

  // DB connection check
  useEffect(() => {
    const start = performance.now();
    fetch("/api/home-stats")
      .then(r => {
        const latency = Math.round(performance.now() - start);
        if (r.ok) setDbStatus({ connected: true, latency, name: "PostgreSQL", host: "Remote (82.25.97.159)" });
        else setDbStatus({ connected: false });
      })
      .catch(() => setDbStatus({ connected: false }));
  }, []);

  const quickLinks = role ? ALL_QUICK_LINKS.filter(l => l.roles.includes(role)) : [];
  const quickActions = role ? QUICK_ACTIONS.filter(a => a.roles.includes(role)) : [];

  if (loading && role === null) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#007890", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100%", padding: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ paddingTop: 20, paddingBottom: 12, textAlign: "center", marginBottom: 8 }}>
        <h1 style={{ color: "#ffffff", fontSize: "1.4rem", fontWeight: 600, margin: "0 0 4px", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
          Welcome to Food Safety Agency
        </h1>
        <h2 style={{ color: "#ffffff", fontSize: "0.85rem", fontWeight: 400, margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
          Your comprehensive food safety management platform
        </h2>
      </div>

      {/* Quick Access Card */}
      <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", padding: "12px 16px", marginBottom: 10, marginLeft: 20, marginRight: 20 }}>
        <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1f2937", marginBottom: 6, marginTop: 0 }}>Quick Access</h2>
        <p style={{ color: "#4b5563", lineHeight: 1.4, marginBottom: 10, fontSize: "0.72rem" }}>
          Welcome to the Food Safety Agency management system. Data syncs automatically every hour in the background.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
          {quickLinks.map(link => (
            <a key={link.href} href={link.href} style={{
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 10px",
              textDecoration: "none", display: "flex", alignItems: "center", gap: 8,
              transition: "box-shadow 0.2s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
            >
              <i className={link.icon} style={{ fontSize: "1rem", color: link.color }} />
              <div>
                <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "0.75rem" }}>{link.title}</div>
                <div style={{ fontSize: "0.62rem", color: "#6b7280" }}>{link.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Statistics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10, marginLeft: 20, marginRight: 20 }}>
        <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", padding: "10px 16px", textAlign: "center" }}>
          <div style={{ color: "#007890", fontSize: "1.5rem", fontWeight: 700, marginBottom: 2, lineHeight: 1 }}>
            {loading ? (
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(0,120,144,0.2)", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            ) : totalClients?.toLocaleString()}
          </div>
          <div style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>Total Clients</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", padding: "10px 16px", textAlign: "center" }}>
          <div style={{ color: "#007890", fontSize: "1.5rem", fontWeight: 700, marginBottom: 2, lineHeight: 1 }}>
            {loading ? (
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(0,120,144,0.2)", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            ) : totalInspections?.toLocaleString()}
          </div>
          <div style={{ color: "#6b7280", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>Total Inspections</div>
        </div>
      </div>

      {/* Content Grid: Quick Actions + Recent Activity + System Status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginLeft: 20, marginRight: 20, paddingBottom: 16 }}>
        {/* Quick Actions */}
        <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", padding: "8px 10px" }}>
          <h3 style={{ fontSize: "0.72rem", fontWeight: 600, color: "#1f2937", marginBottom: 6, marginTop: 0 }}>Quick Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {quickActions.map(action => (
              <a key={action.href} href={action.href} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 6px", background: "#f9fafb", borderRadius: 4,
                textDecoration: "none", transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={e => e.currentTarget.style.background = "#f9fafb"}
              >
                <i className={action.icon} style={{ color: "#007890", fontSize: "0.65rem" }} />
                <span style={{ fontWeight: 500, color: "#1f2937", fontSize: "0.68rem" }}>{action.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", padding: "8px 10px" }}>
          <h3 style={{ fontSize: "0.72rem", fontWeight: 600, color: "#1f2937", marginBottom: 6, marginTop: 0 }}>Recent Activity</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {recentActivities.length === 0 ? (
              <div style={{ fontSize: "0.65rem", color: "#6b7280", fontStyle: "italic" }}>No recent activity</div>
            ) : (
              recentActivities.map((activity, idx) => {
                const cfg = ACTION_CONFIG[activity.action] || DEFAULT_ACTION_CONFIG;
                return (
                  <div key={idx} style={{ fontSize: "0.65rem", color: "#4b5563", display: "flex", alignItems: "flex-start", gap: 4 }}>
                    <i className={cfg.icon} style={{ color: cfg.color, marginTop: 1, flexShrink: 0, width: 12, textAlign: "center", fontSize: "0.55rem" }} />
                    <div style={{ flex: 1, lineHeight: 1.3 }}>
                      <span>{activity.description || cfg.label}</span>
                      <span style={{ color: "#9ca3af", fontSize: "0.55rem", marginLeft: 4 }}>{timeAgo(activity.timestamp)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* System Status */}
        <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", padding: "8px 10px" }}>
          <h3 style={{ fontSize: "0.72rem", fontWeight: 600, color: "#1f2937", marginBottom: 6, marginTop: 0 }}>
            <i className="fas fa-server" style={{ marginRight: 4, color: "#007890", fontSize: "0.6rem" }} />System Status
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", background: dbStatus.connected ? "#f0fdf4" : "#fef2f2", borderRadius: 4, border: `1px solid ${dbStatus.connected ? "#bbf7d0" : "#fecaca"}` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: dbStatus.connected ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.65rem", color: "#1f2937" }}>Database</div>
                <div style={{ fontSize: "0.55rem", color: "#6b7280" }}>{dbStatus.connected ? `${dbStatus.name} — ${dbStatus.host}` : "Disconnected"}</div>
              </div>
              <span style={{ fontSize: "0.5rem", fontWeight: 600, padding: "1px 5px", borderRadius: 8, background: dbStatus.connected ? "#dcfce7" : "#fee2e2", color: dbStatus.connected ? "#166534" : "#991b1b" }}>
                {dbStatus.connected ? "Connected" : "Offline"}
              </span>
            </div>
            {dbStatus.connected && dbStatus.latency !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", background: "#f9fafb", borderRadius: 4 }}>
                <i className="fas fa-tachometer-alt" style={{ color: "#007890", fontSize: "0.55rem" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.65rem", color: "#1f2937" }}>Response Time</div>
                  <div style={{ fontSize: "0.55rem", color: "#6b7280" }}>{dbStatus.latency}ms</div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", background: "#f0fdf4", borderRadius: 4, border: "1px solid #bbf7d0" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.65rem", color: "#1f2937" }}>Django Backend</div>
                <div style={{ fontSize: "0.55rem", color: "#6b7280" }}>localhost:8000</div>
              </div>
              <span style={{ fontSize: "0.5rem", fontWeight: 600, padding: "1px 5px", borderRadius: 8, background: "#dcfce7", color: "#166534" }}>Active</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", background: "#f0fdf4", borderRadius: 4, border: "1px solid #bbf7d0" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.65rem", color: "#1f2937" }}>Next.js Frontend</div>
                <div style={{ fontSize: "0.55rem", color: "#6b7280" }}>localhost:3000</div>
              </div>
              <span style={{ fontSize: "0.5rem", fontWeight: 600, padding: "1px 5px", borderRadius: 8, background: "#dcfce7", color: "#166534" }}>Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
