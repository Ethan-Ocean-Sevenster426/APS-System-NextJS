"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("sidebarCollapsed") === "true";
    return false;
  });

  const toggleCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  return (
    <>
      <style>{`
        .app-outer {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }
        /* Mobile: sidebar hidden off-screen by default */
        .sidebar-wrapper {
          position: fixed;
          top: 0; left: 0;
          height: 100vh;
          z-index: 9998;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
          flex-shrink: 0;
        }
        .sidebar-wrapper.open {
          transform: translateX(0);
        }
        /* Mobile hamburger */
        .mobile-topbar {
          display: block;
          position: fixed;
          top: 12px; left: 12px;
          z-index: 99999;
        }
        @media (min-width: 768px) {
          .sidebar-wrapper {
            position: sticky;
            top: 0;
            transform: none !important;
            z-index: auto;
            height: 100vh;
            align-self: flex-start;
          }
          .mobile-topbar { display: none; }
        }
      `}</style>

      <div className="app-outer">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9997 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — shown on all pages, collapsible */}
        <div className={`sidebar-wrapper${sidebarOpen ? " open" : ""}`}>
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={toggleCollapse}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main content */}
        <div id="main-content" style={{ flex: 1, overflowY: "auto", height: "100%" }}>
          {/* Mobile hamburger */}
          <div className="mobile-topbar">
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ width: 44, height: 44, background: "#1e293b", border: "none", borderRadius: 8, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", boxShadow: "0 4px 8px rgba(0,0,0,0.3)" }}
            >
              <i className="fas fa-bars" />
            </button>
          </div>

          {children}
        </div>
      </div>
    </>
  );
}
