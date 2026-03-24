"use client";

import { useState, useEffect } from "react";

const ALL_QUICK_LINKS = [
  { href: "/inspections",  icon: "fas fa-clipboard-list",  color: "#2563eb", bg: "#eff6ff", title: "Inspections",              sub: "View & manage records",   roles: ["inspector","inspector_manager","lab_technician","admin","financial","super_admin","developer"] },
  { href: "/lab-analytics",icon: "fas fa-flask",           color: "#007890", bg: "#e6f7f9", title: "Lab Analytics",            sub: "Sample testing results",  roles: ["lab_technician","super_admin","developer"] },
  { href: "/export-sheet", icon: "fas fa-file-invoice",    color: "#16a34a", bg: "#f0fdf4", title: "Export Sheet",             sub: "Invoice dashboard",       roles: ["admin","financial","super_admin","developer"] },
  { href: "/analytics",        icon: "fas fa-chart-bar",   color: "#7c3aed", bg: "#faf5ff", title: "Analytics",       sub: "View insights",       roles: ["inspector","inspector_manager","super_admin","developer"] },
  { href: "/admin-analytics",  icon: "fas fa-chart-line",  color: "#007890", bg: "#e6f7f9", title: "Admin Analytics",  sub: "Operational overview", roles: ["admin"] },
  { href: "/clients",      icon: "fas fa-users",           color: "#ea580c", bg: "#fff7ed", title: "Client Allocation Sheet", sub: "Manage allocations",      roles: ["admin","financial","super_admin","developer"] },
];

export default function HomePage() {
  const [totalClients, setTotalClients] = useState<number | null>(null);
  const [totalInspections, setTotalInspections] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/home-stats")
      .then(r => r.json())
      .then(d => {
        setTotalClients(d.clients ?? 0);
        setTotalInspections(d.inspections ?? 0);
        setLoading(false);
      })
      .catch(() => {
        setTotalClients(0);
        setTotalInspections(0);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => setRole(d.authenticated ? (d.role || "inspector") : "inspector"))
      .catch(() => setRole("inspector"));
  }, []);

  const quickLinks = role
    ? ALL_QUICK_LINKS.filter(l => l.roles.includes(role))
    : [];

  const Spinner = () => (
    <div style={{
      width: "clamp(20px, 2vw, 36px)",
      height: "clamp(20px, 2vw, 36px)",
      borderRadius: "50%",
      border: "3px solid rgba(0,120,144,0.2)",
      borderTopColor: "#007890",
      animation: "spin 0.8s linear infinite",
      margin: "0 auto",
    }} />
  );

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
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .hp-wrap { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 32px 24px 24px; box-sizing: border-box; }
        .hp-inner { width: 100%; max-width: 900px; display: flex; flex-direction: column; gap: 20px; }
        .hp-header { text-align: center; margin-bottom: 4px; }
        .hp-title { color: #fff; font-size: 1.4rem; font-weight: 700; margin: 0 0 4px; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
        .hp-subtitle { color: rgba(255,255,255,0.85); font-size: 0.82rem; text-shadow: 0 1px 4px rgba(0,0,0,0.35); margin: 0; }
        .hp-stats { display: flex; justify-content: center; gap: 16px; }
        .hp-stat { background: rgba(255,255,255,0.97); border-radius: 10px; padding: 14px 32px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.1); border-left: 4px solid #007890; }
        .hp-stat-num { color: #007890; font-size: 1.8rem; font-weight: 800; line-height: 1; margin-bottom: 2px; display: flex; align-items: center; justify-content: center; }
        .hp-stat-label { color: #6b7280; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin: 0; }
        .hp-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .hp-link { background: rgba(255,255,255,0.97); border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; text-decoration: none; display: flex; align-items: center; gap: 12px; transition: box-shadow 0.2s, transform 0.15s, border-color 0.2s; }
        .hp-link:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.1); transform: translateY(-1px); border-color: #007890; }
        .hp-link-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
        .hp-link-title { font-weight: 600; color: #1f2937; margin: 0; font-size: 0.78rem; line-height: 1.2; }
        .hp-link-sub { font-size: 0.65rem; color: #6b7280; margin: 2px 0 0; line-height: 1.2; }
        .hp-footer { text-align: center; color: rgba(255,255,255,0.6); font-size: 0.65rem; margin: 0; }
        @media (max-width: 480px) { .hp-wrap { padding: 60px 12px 16px; } .hp-links { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <div className="hp-wrap">
        <div className="hp-inner">
          <div className="hp-header">
            <h1 className="hp-title">Welcome to Food Safety Agency</h1>
            <p className="hp-subtitle">Your comprehensive food safety management platform</p>
          </div>

          <div className="hp-stats">
            <div className="hp-stat">
              <div className="hp-stat-num">{loading ? <Spinner /> : totalClients?.toLocaleString()}</div>
              <p className="hp-stat-label">Total Clients</p>
            </div>
            <div className="hp-stat">
              <div className="hp-stat-num">{loading ? <Spinner /> : totalInspections?.toLocaleString()}</div>
              <p className="hp-stat-label">Total Inspections</p>
            </div>
          </div>

          {role === null ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#6b7280", fontSize: 13, padding: "16px 0" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #e5e7eb", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              Loading...
            </div>
          ) : (
            <div className="hp-links">
              {quickLinks.map(link => (
                <a key={link.href} href={link.href} className="hp-link">
                  <div className="hp-link-icon" style={{ background: link.bg }}>
                    <i className={link.icon} style={{ color: link.color }} />
                  </div>
                  <div>
                    <p className="hp-link-title">{link.title}</p>
                    <p className="hp-link-sub">{link.sub}</p>
                  </div>
                </a>
              ))}
            </div>
          )}

          <p className="hp-footer">Food Safety Agency (Pty) Ltd — Inspection Management System</p>
        </div>
      </div>
    </>
  );
}
