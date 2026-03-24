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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}>
      <img src="/logo.png" alt="FSA" style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .hp-wrap { min-height: 100%; display: flex; align-items: flex-start; justify-content: center; padding: 24px 24px 16px; box-sizing: border-box; }
        .hp-inner { width: 100%; max-width: 1200px; display: flex; flex-direction: column; gap: 14px; }
        .hp-header { text-align: center; }
        .hp-title { color: #fff; font-size: 1.6rem; font-weight: 700; margin: 0 0 4px; text-shadow: 0 2px 8px rgba(0,0,0,0.45); line-height: 1.2; }
        .hp-subtitle { color: rgba(255,255,255,0.88); font-size: 0.88rem; font-weight: 400; text-shadow: 0 1px 4px rgba(0,0,0,0.35); margin: 0; }
        .hp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .hp-stat { background: rgba(255,255,255,0.96); border-radius: 12px; padding: 18px 24px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.12); border: 1px solid rgba(255,255,255,0.6); }
        .hp-stat-num { color: #007890; font-size: 2.4rem; font-weight: 800; line-height: 1; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; min-height: 2.4rem; }
        .hp-stat-label { color: #6b7280; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin: 0; }
        .hp-quick { background: rgba(255,255,255,0.96); border-radius: 12px; padding: 18px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); border: 1px solid rgba(255,255,255,0.6); }
        .hp-quick-head { font-size: 0.95rem; font-weight: 700; color: #1f2937; margin: 0 0 3px; }
        .hp-quick-desc { color: #4b5563; font-size: 0.75rem; line-height: 1.5; margin: 0 0 14px; }
        .hp-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
        .hp-link { width: 160px; flex-shrink: 0; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 14px 10px; text-decoration: none; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s; }
        .hp-link:hover { box-shadow: 0 6px 18px rgba(0,0,0,0.12); transform: translateY(-2px); border-color: #007890; }
        .hp-link-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
        .hp-link-title { font-weight: 700; color: #1f2937; margin: 0; font-size: 0.78rem; line-height: 1.3; }
        .hp-link-sub { font-size: 0.68rem; color: #6b7280; margin: 0; line-height: 1.3; }
        .hp-footer { text-align: center; color: rgba(255,255,255,0.65); font-size: 0.68rem; margin: 0; }
        @media (max-width: 480px) { .hp-wrap { padding: 60px 12px 16px; } .hp-link { width: 140px; } }
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

          <div className="hp-quick">
            <h2 className="hp-quick-head">Quick Access</h2>
            <p className="hp-quick-desc">Data syncs automatically every hour in the background. Use the navigation menu to access all platform features.</p>
            {role === null ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: 13, padding: "8px 0" }}>
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
          </div>

          <p className="hp-footer">Food Safety Agency (Pty) Ltd -- Inspection Management System</p>
        </div>
      </div>
    </>
  );
}
