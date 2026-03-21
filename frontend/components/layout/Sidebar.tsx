"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type Role = "inspector" | "inspector_manager" | "lab_technician" | "admin" | "financial" | "super_admin" | "developer";

interface NavItem { href: string; label: string; icon: string; }
interface NavSection { label: string; items: NavItem[]; }

// All possible nav items
const ALL_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/",               label: "Home Center",          icon: "fas fa-home"                 },
      { href: "/inspections",    label: "Inspection Records",   icon: "fas fa-file-invoice"         },
      { href: "/clients",        label: "Client Allocation",    icon: "fas fa-th-list"              },
      { href: "/analytics",        label: "Inspector Analytics",  icon: "fas fa-chart-bar"            },
      { href: "/admin-analytics", label: "Admin Analytics",     icon: "fas fa-chart-line"           },
      { href: "/lab-analytics",   label: "Lab Analytics",       icon: "fas fa-flask"                },
      { href: "/export-sheet",   label: "Export Sheet",         icon: "fas fa-file-download"        },
      { href: "/debtors",        label: "Debtors",              icon: "fas fa-file-invoice-dollar"  },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/user-management", label: "User Management", icon: "fas fa-user-shield" },
      { href: "/system-logs",     label: "System Logs",     icon: "fas fa-history"     },
      { href: "/server-view",     label: "Server View",     icon: "fas fa-database"    },
      { href: "/training",        label: "Training",         icon: "fas fa-video"       },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/support",       label: "Support Tickets", icon: "fas fa-ticket-alt"  },
      { href: "/submit-ticket", label: "Submit Ticket",   icon: "fas fa-paper-plane" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: "fas fa-sliders-h" },
    ],
  },
];

// Which hrefs each role is allowed to see
const ROLE_ALLOWED: Record<Role, Set<string>> = {
  inspector: new Set([
    "/", "/inspections", "/analytics",
    "/training", "/submit-ticket",
  ]),
  inspector_manager: new Set([
    "/", "/inspections", "/analytics",
    "/training", "/submit-ticket",
  ]),
  lab_technician: new Set([
    "/", "/inspections", "/lab-analytics",
    "/training", "/submit-ticket",
  ]),
  admin: new Set([
    "/", "/inspections", "/clients", "/admin-analytics", "/export-sheet", "/debtors",
    "/system-logs",
    "/training", "/submit-ticket",
  ]),
  financial: new Set([
    "/", "/inspections", "/clients", "/export-sheet", "/debtors",
    "/training", "/submit-ticket",
  ]),
  super_admin: new Set([
    "/", "/inspections", "/clients", "/analytics", "/lab-analytics", "/export-sheet", "/debtors",
    "/user-management", "/system-logs", "/server-view",
    "/training", "/support", "/submit-ticket", "/settings",
  ]),
  developer: new Set([
    "/", "/inspections", "/clients", "/analytics", "/lab-analytics", "/export-sheet", "/debtors",
    "/user-management", "/system-logs", "/server-view",
    "/training", "/support", "/submit-ticket", "/settings",
  ]),
};

const ROLE_LABELS: Record<Role, string> = {
  inspector:         "Inspector",
  inspector_manager: "Inspector Manager",
  lab_technician:    "Lab Technician",
  admin:             "Admin",
  financial:         "Financial",
  super_admin:       "Super Admin",
  developer:         "Developer",
};

function filterSections(sections: NavSection[], role: Role): NavSection[] {
  const allowed = ROLE_ALLOWED[role] ?? ROLE_ALLOWED["inspector"];
  return sections
    .map(s => ({ ...s, items: s.items.filter(i => allowed.has(i.href)) }))
    .filter(s => s.items.length > 0);
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState("Loading...");
  const [roleLabel, setRoleLabel] = useState("");

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          const r: Role = (d.role as Role) in ROLE_ALLOWED ? d.role as Role : "inspector";
          setRole(r);
          const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.username;
          setDisplayName(name);
          setRoleLabel(ROLE_LABELS[r] ?? r);
        } else {
          setDisplayName("Guest");
          setRoleLabel("");
          setRole("inspector");
        }
      })
      .catch(() => { setRole("inspector"); setDisplayName("User"); });
  }, []);

  // Don't render nav until role is known (prevents flash of wrong items)
  const sections = role ? filterSections(ALL_SECTIONS, role) : [];

  return (
    <aside style={{
      width: collapsed ? 48 : 200,
      minWidth: collapsed ? 48 : 200,
      height: "100vh",
      backgroundColor: "#0f172a",
      color: "#cbd5e1",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      borderRight: "1px solid #1e293b",
      transition: "width 0.25s ease, min-width 0.25s ease",
      overflow: "hidden",
    }}>

      {/* Brand — only when expanded */}
      {!collapsed && (
        <div style={{ padding: "12px 10px", borderBottom: "1px solid #1e293b", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", flexShrink: 0 }}>
          <Image src="/logo.png" alt="FSA Logo" width={44} height={44} style={{ borderRadius: "8px", marginBottom: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>Food Safety Agency</div>
            <div style={{ fontSize: "0.55rem", color: "#64748b", marginTop: "1px" }}>Management Platform</div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-end",
          padding: collapsed ? "6px 0" : "5px 10px",
          background: "none", border: "none",
          borderBottom: "1px solid #1e293b",
          color: "#475569", cursor: "pointer",
          fontSize: "0.7rem", transition: "color 0.15s",
          flexShrink: 0, width: "100%",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#007890"}
        onMouseLeave={e => e.currentTarget.style.color = "#475569"}
      >
        <i className={`fas fa-${collapsed ? "chevron-right" : "chevron-left"}`} />
      </button>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "2px 0" : "4px 6px" }}>
        {sections.map((section) => (
          <div key={section.label} style={{ marginBottom: collapsed ? 0 : 4 }}>
            {!collapsed && (
              <div style={{ fontSize: "0.5rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 6px", marginBottom: "1px" }}>
                {section.label}
              </div>
            )}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 0 }}>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      onClick={onClose}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: collapsed ? 0 : 6,
                        padding: collapsed ? "7px 0" : "4px 6px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        borderRadius: collapsed ? 0 : 4,
                        fontSize: "0.68rem",
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "#ffffff" : "#94a3b8",
                        textDecoration: "none",
                        backgroundColor: isActive ? "#007890" : "transparent",
                        borderLeft: collapsed ? "none" : (isActive ? "2px solid #00b4d8" : "2px solid transparent"),
                        borderRight: "none",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "#1e293b";
                          e.currentTarget.style.color = "#e2e8f0";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#94a3b8";
                        }
                      }}
                    >
                      <i className={item.icon} style={{ width: collapsed ? "100%" : 12, textAlign: "center", fontSize: collapsed ? "0.8rem" : "0.65rem", flexShrink: 0 }} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* User footer */}
      <div style={{ flexShrink: 0, borderTop: "1px solid #1e293b", padding: collapsed ? "6px 0" : "8px 6px" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", marginBottom: 4 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#007890", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="fas fa-user" style={{ fontSize: "0.55rem", color: "white" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
              <div style={{ fontSize: "0.52rem", color: "#475569" }}>{roleLabel}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            try { fetch("/api/logout/", { method: "POST", credentials: "include" }); } catch {}
            window.location.href = "/login";
          }}
          title={collapsed ? "Sign Out" : undefined}
          style={{
            display: "flex", alignItems: "center",
            justifyContent: collapsed ? "center" : "center",
            gap: collapsed ? 0 : 6,
            width: "100%", padding: collapsed ? "6px 0" : "6px",
            borderRadius: collapsed ? 0 : 4,
            background: "transparent",
            border: collapsed ? "none" : "1px solid #1e293b",
            color: "#64748b", cursor: "pointer",
            fontSize: collapsed ? "0.8rem" : "0.62rem",
            fontWeight: 500, transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}
        >
          <i className="fas fa-sign-out-alt" />
          {!collapsed && " Sign Out"}
        </button>
      </div>
    </aside>
  );
}
