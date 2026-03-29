"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface LogEntry {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  page: string;
  description: string;
  ip_address: string;
  location: string;
  suburb: string;
  city: string;
  country_code: string;
}

interface DuplicateGroup {
  client_name: string;
  inspector: string;
  date: string;
  count: number;
  first_id: number;
  last_id: number;
}

interface EditHistoryEntry {
  id: number;
  edited_at: string;
  edited_by: string;
  object_type: string;
  client_name: string;
  date_of_inspection: string;
  change_count: number;
  changes: Record<string, { label: string; old: string; new: string }>;
}

interface SystemLogsResponse {
  success: boolean;
  total: number;
  total_pages: number;
  page_num: number;
  logs: LogEntry[];
  duplicates: DuplicateGroup[];
  duplicate_count: number;
  edit_history: EditHistoryEntry[];
  edit_history_total: number;
  all_users: string[];
  all_pages: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const PRIMARY = "#007890";
const PRIMARY_HOVER = "#006070";
const BORDER = "#e5e7eb";
const TEXT = "#111827";
const TEXT_LIGHT = "#6b7280";

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  VIEW:   { bg: "#dbeafe", color: "#1d4ed8" },
  LOGIN:  { bg: "#dcfce7", color: "#15803d" },
  LOGOUT: { bg: "#fef3c7", color: "#b45309" },
  CREATE: { bg: "#d1fae5", color: "#047857" },
  UPDATE: { bg: "#cffafe", color: "#0e7490" },
  DELETE: { bg: "#fee2e2", color: "#dc2626" },
};

const ALL_ACTIONS = ["VIEW", "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE"];

const PAGE_LABELS: Record<string, string> = {
  "/home/": "Home",
  "/inspections/": "Inspection Records",
  "/system-logs/": "System Logs",
  "/analytics-dashboard/": "Analytics Dashboard",
  "/api/analytics-dashboard/": "Analytics Dashboard",
  "/settings/": "Settings",
  "/user-management/": "User Management",
  "/clients/": "Clients",
  "/debtors/": "Debtors",
  "/training/": "Training",
  "/login/": "Login",
  "/logout/": "Logout",
};

function friendlyPage(page: string): string {
  if (!page) return "-";
  if (PAGE_LABELS[page]) return PAGE_LABELS[page];
  for (const [url, label] of Object.entries(PAGE_LABELS)) {
    if (page.includes(url.replace(/^\/|\/$/g, ""))) return label;
  }
  if (page.includes("client-allocation")) return "Client Allocation";
  if (page.includes("fsa-operations")) return "Operations Board";
  if (page.includes("submit-ticket")) return "Submit Ticket";
  if (page.includes("server-view")) return "Server View";
  return page;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${min}:${ss}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDatetime(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [allPages, setAllPages] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [editHistoryTotal, setEditHistoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [pageFilter, setPageFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pageNum, setPageNum] = useState(1);

  // View: 'logs' | 'dupes' | 'history'
  const [activeView, setActiveView] = useState<"logs" | "dupes" | "history">("logs");

  // Keep refs for stable fetch
  const filtersRef = useRef({ userFilter, actionFilter, pageFilter, dateFrom, dateTo });
  filtersRef.current = { userFilter, actionFilter, pageFilter, dateFrom, dateTo };

  const applyData = (data: SystemLogsResponse) => {
    setLogs(data.logs ?? []);
    setDuplicates(data.duplicates ?? []);
    setEditHistory(data.edit_history ?? []);
    setAllUsers(data.all_users ?? []);
    setAllPages(data.all_pages ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.total_pages ?? 1);
    setDuplicateCount(data.duplicate_count ?? 0);
    setEditHistoryTotal(data.edit_history_total ?? 0);
  };

  const doFetch = useCallback(async (opts: {
    userFilter?: string; actionFilter?: string; pageFilter?: string;
    dateFrom?: string; dateTo?: string; showAll?: boolean; pageNum?: number;
  } = {}) => {
    setLoading(true);
    setError("");
    try {
      const f = filtersRef.current;
      const params = new URLSearchParams();
      const u = opts.userFilter ?? f.userFilter;
      const a = opts.actionFilter ?? f.actionFilter;
      const pf = opts.pageFilter ?? f.pageFilter;
      const df = opts.dateFrom ?? f.dateFrom;
      const dt = opts.dateTo ?? f.dateTo;
      const sa = opts.showAll ?? showAll;
      const pn = opts.pageNum ?? pageNum;
      if (u) params.set("user", u);
      if (a) params.set("action", a);
      if (pf) params.set("page_filter", pf);
      if (df) params.set("date_from", df);
      if (dt) params.set("date_to", dt);
      if (sa) params.set("show_all", "true");
      params.set("page_num", String(pn));
      const qs = params.toString();
      const res = await fetch(`/api/system-logs${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SystemLogsResponse = await res.json();
      applyData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [showAll, pageNum]);

  useEffect(() => { doFetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    setPageNum(1);
    doFetch({ pageNum: 1 });
  };

  const handleClear = () => {
    setUserFilter(""); setActionFilter(""); setPageFilter("");
    setDateFrom(""); setDateTo(""); setShowAll(false); setPageNum(1);
    doFetch({ userFilter: "", actionFilter: "", pageFilter: "", dateFrom: "", dateTo: "", showAll: false, pageNum: 1 });
  };

  const handleToggleShowAll = () => {
    const next = !showAll;
    setShowAll(next);
    setPageNum(1);
    doFetch({ showAll: next, pageNum: 1 });
  };

  const handlePage = (n: number) => {
    setPageNum(n);
    doFetch({ pageNum: n });
  };

  const switchView = (view: "dupes" | "history") => {
    setActiveView(prev => prev === view ? "logs" : view);
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  if (loading) return (
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
/* System Logs card */
.sl-card { background: #ffffff; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); margin-bottom: 10px; border: 1px solid #e5e7eb; width: 100%; }
.sl-card-header { padding: 0.625rem 0.875rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; min-height: 44px; }
.sl-card-title { font-size: 0.8125rem; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 0.375rem; margin: 0; }
.sl-card-body { padding: 0.875rem 1rem; }

/* Header */
.sl-header { text-align: center; margin-bottom: 1.25rem; padding: 1.5rem 0 1rem; }
.sl-header h1 { color: white; font-size: 1.375rem; font-weight: 700; margin: 0; display: inline-flex; align-items: center; gap: 8px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
.sl-header p { font-size: 0.8125rem; color: rgba(255,255,255,0.9); margin: 4px 0 0; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }

/* Container */
.sl-container { width: 100%; max-width: 1400px; margin: 0 auto; padding: 0 1.25rem 1.5rem; box-sizing: border-box; }

/* Filter grid */
.sl-filter-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px; }
.sl-filter-label { display: block; font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 3px; }
.sl-filter-select { width: 100%; padding: 5px 8px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 12px; background: white; color: #111827; outline: none; box-sizing: border-box; }

/* Buttons */
.sl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 5px 11px; border: none; border-radius: 5px; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.sl-btn-primary { background: #007890; color: white; }
.sl-btn-primary:hover { background: #006070; }
.sl-btn-secondary { border: 1px solid #d1d5db; background: white; color: #374151; }
.sl-btn-secondary:hover { background: #f9fafb; }

/* Filter actions */
.sl-filter-actions { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid #e5e7eb; flex-wrap: wrap; }

/* Tab buttons */
.sl-tab-btn { padding: 5px 11px; border: none; border-radius: 5px; font-size: 12px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s ease; }
.sl-tab-btn.active { color: white; }
.sl-tab-btn:not(.active) { background: #f3f4f6; color: #374151; }
.sl-tab-btn:not(.active):hover { background: #e5e7eb; }

/* Table */
.sl-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; background: white; }
.sl-table th { background-color: #f9fafb; color: #6b7280; text-align: left; padding: 10px 16px; font-weight: 600; white-space: nowrap; border-bottom: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
.sl-table tbody tr { border-bottom: 1px solid #e5e7eb; transition: background-color 0.15s ease; }
.sl-table tbody tr:hover { background-color: #f9fafb; }
.sl-table td { padding: 10px 16px; font-size: 13px; color: #374151; }

/* Action badge */
.sl-action-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }

/* Count badge */
.sl-count-badge { display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border-radius: 6px; min-width: 28px; height: 22px; padding: 0 8px; color: white; }

/* Type badge */
.sl-type-badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }

/* Change diff */
.sl-change-item { margin-bottom: 4px; padding: 4px 8px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #7c3aed; font-size: 12px; }
.sl-change-old { background: #fee2e2; color: #991b1b; padding: 1px 5px; border-radius: 3px; font-family: monospace; }
.sl-change-new { background: #dcfce7; color: #166534; padding: 1px 5px; border-radius: 3px; font-family: monospace; }
.sl-change-arrow { color: #9ca3af; margin: 0 4px; }

/* Pagination */
.sl-pagination { padding: 12px 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sl-page-btn { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; font-size: 12px; cursor: pointer; }
.sl-page-btn:disabled { color: #9ca3af; cursor: default; }
.sl-page-btn:not(:disabled) { color: #374151; }
.sl-page-btn:not(:disabled):hover { background: #f9fafb; }

/* Table responsive */
.sl-table-responsive { overflow-x: auto; width: 100%; }

/* Mobile/Desktop toggle */
.sl-mobile-only { display: none !important; }
.sl-desktop-only { display: block; }

/* View count */
.sl-view-count { font-size: 12px; color: #6b7280; }

/* Loading / Error */
.sl-loading { display: flex; justify-content: center; align-items: center; padding: 48px; text-align: center; flex-direction: column; }
.sl-error { padding: 32px; text-align: center; }

/* Empty state */
.sl-empty { padding: 40px; text-align: center; color: #6b7280; }

/* Responsive breakpoints */
@media (max-width: 768px) {
  .sl-mobile-only { display: block !important; }
  .sl-desktop-only { display: none !important; }
  .sl-container { padding: 0 0.75rem 1.25rem; }
  .sl-header h1 { font-size: 1.15rem; }
  .sl-header p { font-size: 0.75rem; }
  .sl-header { padding: 1rem 0 0.75rem; margin-bottom: 1rem; }
  .sl-filter-grid { grid-template-columns: 1fr 1fr; }
  .sl-card-header { padding: 0.5rem 0.75rem; flex-direction: column; gap: 8px; align-items: stretch; }
  .sl-card-body { padding: 0.75rem; }
  .sl-filter-actions { justify-content: stretch; }
  .sl-filter-actions .sl-btn { flex: 1; justify-content: center; }
  .sl-pagination { justify-content: center; }
  .sl-tab-group { width: 100%; display: flex; flex-wrap: wrap; gap: 6px; }
  .sl-tab-group .sl-tab-btn { flex: 1; justify-content: center; min-width: 0; }
}
@media (max-width: 480px) {
  .sl-container { padding: 0 0.5rem 1rem; }
  .sl-header h1 { font-size: 1rem; }
  .sl-header p { font-size: 0.7rem; }
  .sl-filter-grid { grid-template-columns: 1fr; }
  .sl-btn { font-size: 11px; padding: 5px 8px; }
  .sl-tab-group .sl-tab-btn { font-size: 10px; padding: 5px 8px; }
}
      `}</style>

      <div style={{ width: "100%", minHeight: "100%", boxSizing: "border-box" }}>
      <div className="sl-container">
        {/* Header */}
        <div className="sl-header">
          <h1>
            <i className="fas fa-shield-alt" style={{ opacity: 0.8, color: "#5ee8ff" }} />
            System Logs
          </h1>
          <p>Activity tracking, monitoring &amp; duplicate detection</p>
        </div>

        {/* Filter Card */}
        <div className="sl-card">
          <div className="sl-card-header">
            <div className="sl-card-title">
              <i className="fas fa-filter" style={{ color: PRIMARY, fontSize: 13 }} />
              Filter Logs
            </div>
          </div>
          <div className="sl-card-body">
            <div className="sl-filter-grid">
              <div>
                <label className="sl-filter-label">User</label>
                <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="sl-filter-select">
                  <option value="">All Users</option>
                  {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="sl-filter-label">Action</label>
                <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="sl-filter-select">
                  <option value="">All Actions</option>
                  {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="sl-filter-label">Page</label>
                <select value={pageFilter} onChange={e => setPageFilter(e.target.value)} className="sl-filter-select">
                  <option value="">All Pages</option>
                  {allPages.map(p => <option key={p} value={p}>{friendlyPage(p)}</option>)}
                </select>
              </div>
              <div>
                <label className="sl-filter-label">Date From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="sl-filter-select" />
              </div>
              <div>
                <label className="sl-filter-label">Date To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="sl-filter-select" />
              </div>
            </div>

            <div className="sl-filter-actions">
              <button onClick={handleApply} className="sl-btn sl-btn-primary">
                <i className="fas fa-search" /> Apply Filters
              </button>
              <button onClick={handleClear} className="sl-btn sl-btn-secondary">
                <i className="fas fa-times" /> Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="sl-card">
          {/* Card header with tabs */}
          <div className="sl-card-header">
            <h3 className="sl-card-title">
              {activeView === "logs" && <><i className="fas fa-list-alt" style={{ color: PRIMARY }} /> Activity Logs</>}
              {activeView === "dupes" && <><i className="fas fa-copy" style={{ color: "#dc2626" }} /> Duplicate Inspections</>}
              {activeView === "history" && <><i className="fas fa-history" style={{ color: "#7c3aed" }} /> Inspection Edit History</>}
            </h3>
            <div className="sl-tab-group" style={{ display: "flex", gap: 6 }}>
              <button className={`sl-tab-btn ${activeView === "logs" ? "active" : ""}`} style={activeView === "logs" ? { background: PRIMARY } : {}} onClick={() => setActiveView("logs")}>
                <i className="fas fa-list-alt" /> Logs
              </button>
              <button className={`sl-tab-btn ${activeView === "dupes" ? "active" : ""}`} style={activeView === "dupes" ? { background: "#dc2626" } : {}} onClick={() => switchView("dupes")}>
                <i className="fas fa-copy" /> Duplicates
                {duplicateCount > 0 && <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "0 6px", fontSize: 10, marginLeft: 2 }}>{duplicateCount}</span>}
              </button>
              <button className={`sl-tab-btn ${activeView === "history" ? "active" : ""}`} style={activeView === "history" ? { background: "#7c3aed" } : {}} onClick={() => switchView("history")}>
                <i className="fas fa-history" /> Edit History
              </button>
            </div>
            <span className="sl-view-count">
              {activeView === "logs" && `Showing ${logs.length} of ${total}`}
              {activeView === "dupes" && `${duplicateCount} duplicate groups`}
              {activeView === "history" && `${editHistoryTotal} total edits (showing latest 200)`}
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="sl-loading">
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: PRIMARY, marginBottom: 12, display: "block" }} />
              <p style={{ color: TEXT_LIGHT, fontSize: 14, margin: 0 }}>Loading system logs…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="sl-error">
              <i className="fas fa-exclamation-triangle" style={{ fontSize: 28, color: "#dc2626", marginBottom: 12, display: "block" }} />
              <p style={{ color: "#dc2626", fontSize: 14, margin: 0 }}>{error}</p>
              <button onClick={handleApply} style={{ marginTop: 12 }} className="sl-btn sl-btn-primary">
                Retry
              </button>
            </div>
          )}

          {/* ---- Activity Logs ---- */}
          {!loading && !error && activeView === "logs" && (
            <>
              {/* Desktop Table */}
              <div className="sl-table-responsive sl-desktop-only">
                <table className="sl-table">
                  <thead>
                    <tr>
                      {["Timestamp", "User", "Action", "Page", "Description", "IP Address"].map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="sl-empty">
                          <i className="fas fa-list-alt" style={{ fontSize: 32, opacity: 0.4, display: "block", marginBottom: 12 }} />
                          No system logs found.
                        </td>
                      </tr>
                    ) : logs.map(log => {
                      const ac = ACTION_COLORS[log.action?.toUpperCase()] ?? { bg: "#f3f4f6", color: "#374151" };
                      return (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: "nowrap", fontSize: 12, color: TEXT_LIGHT }}>{formatTimestamp(log.timestamp)}</td>
                          <td style={{ fontWeight: 500, color: TEXT }}>{log.username}</td>
                          <td>
                            <span className="sl-action-badge" style={{ background: ac.bg, color: ac.color }}>
                              {log.action ? log.action.charAt(0) + log.action.slice(1).toLowerCase() : "-"}
                            </span>
                          </td>
                          <td style={{ color: TEXT }}>{friendlyPage(log.page)}</td>
                          <td style={{ color: TEXT_LIGHT, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.description || "-"}</td>
                          <td style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: "monospace", whiteSpace: "nowrap" }}>{log.ip_address || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sl-mobile-only" style={{ display: "none" }}>
                {logs.length === 0 ? (
                  <div className="sl-empty">
                    <i className="fas fa-list-alt" style={{ fontSize: 32, opacity: 0.4, display: "block", marginBottom: 12 }} />
                    No system logs found.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10 }}>
                    {logs.map(log => {
                      const ac = ACTION_COLORS[log.action?.toUpperCase()] ?? { bg: "#f3f4f6", color: "#374151" };
                      return (
                        <div key={log.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1f2937" }}>{log.username}</div>
                            <span className="sl-action-badge" style={{ background: ac.bg, color: ac.color }}>
                              {log.action ? log.action.charAt(0) + log.action.slice(1).toLowerCase() : "-"}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4 }}>
                            <i className="fas fa-clock" style={{ marginRight: 4 }} />{formatTimestamp(log.timestamp)}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#374151", marginBottom: 4 }}>
                            <i className="fas fa-file" style={{ marginRight: 4, color: "#9ca3af" }} />{friendlyPage(log.page)}
                          </div>
                          {log.description && (
                            <div style={{ fontSize: "0.7rem", color: "#6b7280", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {log.description}
                            </div>
                          )}
                          <div style={{ fontSize: "0.65rem", color: "#9ca3af", fontFamily: "monospace" }}>
                            <i className="fas fa-network-wired" style={{ marginRight: 4 }} />{log.ip_address || "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---- Duplicates ---- */}
          {!loading && !error && activeView === "dupes" && (
            <>
              {/* Desktop Table */}
              <div className="sl-table-responsive sl-desktop-only">
                <table className="sl-table">
                  <thead>
                    <tr>
                      {["Groups", "Client / Facility", "Inspector", "Date", "ID Range", "Action"].map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="sl-empty">
                          <i className="fas fa-check-circle" style={{ fontSize: 32, opacity: 0.4, display: "block", marginBottom: 12, color: "#15803d" }} />
                          No duplicate inspection groups found.
                        </td>
                      </tr>
                    ) : duplicates.map((dup, idx) => {
                      const badgeBg = dup.count >= 10 ? "#dc2626" : dup.count >= 5 ? "#f59e0b" : "#6b7280";
                      return (
                        <tr key={idx}>
                          <td>
                            <span className="sl-count-badge" style={{ background: badgeBg }}>{dup.count}x</span>
                          </td>
                          <td style={{ fontWeight: 500, color: TEXT }}>{dup.client_name}</td>
                          <td style={{ color: TEXT }}>{dup.inspector || "-"}</td>
                          <td style={{ color: TEXT }}>{formatDate(dup.date)}</td>
                          <td style={{ fontSize: 11, color: TEXT_LIGHT }}>#{dup.first_id} - #{dup.last_id}</td>
                          <td>
                            <a
                              href={`/inspections?client=${encodeURIComponent(dup.client_name)}&inspection_date_from=${dup.date}&inspection_date_to=${dup.date}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ padding: "4px 10px", border: "none", borderRadius: 4, background: PRIMARY, color: "white", fontSize: 11, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <i className="fas fa-external-link-alt" /> View
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sl-mobile-only" style={{ display: "none" }}>
                {duplicates.length === 0 ? (
                  <div className="sl-empty">
                    <i className="fas fa-check-circle" style={{ fontSize: 32, opacity: 0.4, display: "block", marginBottom: 12, color: "#15803d" }} />
                    No duplicate inspection groups found.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10 }}>
                    {duplicates.map((dup, idx) => {
                      const badgeBg = dup.count >= 10 ? "#dc2626" : dup.count >= 5 ? "#f59e0b" : "#6b7280";
                      return (
                        <div key={idx} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1f2937" }}>{dup.client_name}</div>
                            <span className="sl-count-badge" style={{ background: badgeBg }}>{dup.count}x</span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#374151", marginBottom: 4 }}>
                            <i className="fas fa-user" style={{ marginRight: 4, color: "#9ca3af" }} />{dup.inspector || "-"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 4 }}>
                            <i className="fas fa-calendar" style={{ marginRight: 4 }} />{formatDate(dup.date)}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>#{dup.first_id} - #{dup.last_id}</span>
                            <a
                              href={`/inspections?client=${encodeURIComponent(dup.client_name)}&inspection_date_from=${dup.date}&inspection_date_to=${dup.date}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ padding: "4px 10px", border: "none", borderRadius: 4, background: PRIMARY, color: "white", fontSize: 11, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <i className="fas fa-external-link-alt" /> View
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---- Edit History ---- */}
          {!loading && !error && activeView === "history" && (
            <>
              {/* Desktop Table */}
              <div className="sl-table-responsive sl-desktop-only">
                <table className="sl-table">
                  <thead>
                    <tr>
                      {[
                        { label: "When", w: 140 },
                        { label: "Edited By", w: 120 },
                        { label: "Type", w: 70 },
                        { label: "Client / Facility", w: undefined },
                        { label: "Date", w: 100 },
                        { label: "Fields", w: 70 },
                        { label: "Changes", w: undefined },
                      ].map(({ label, w }) => (
                        <th key={label} style={{ width: w }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="sl-empty">
                          <i className="fas fa-history" style={{ fontSize: 32, opacity: 0.3, display: "block", marginBottom: 12 }} />
                          No edit history yet. Changes to inspections will appear here once someone edits a record.
                        </td>
                      </tr>
                    ) : editHistory.map(eh => (
                      <tr key={eh.id} style={{ verticalAlign: "top" }}>
                        <td style={{ fontSize: 12, color: TEXT_LIGHT, whiteSpace: "nowrap" }}>{formatDatetime(eh.edited_at)}</td>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>{eh.edited_by}</td>
                        <td>
                          <span className="sl-type-badge" style={{
                            background: eh.object_type === "group" ? "#e0f2fe" : "#ede9fe",
                            color: eh.object_type === "group" ? "#0369a1" : "#6d28d9",
                          }}>
                            {eh.object_type === "group" ? "Group" : "Row"}
                          </span>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>{eh.client_name || "-"}</td>
                        <td style={{ fontSize: 12 }}>{eh.date_of_inspection ? formatDate(eh.date_of_inspection) : "-"}</td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                            {eh.change_count}
                          </span>
                        </td>
                        <td>
                          {Object.entries(eh.changes || {}).map(([field, diff]) => (
                            <div key={field} className="sl-change-item">
                              <span style={{ fontWeight: 600, color: "#374151" }}>{diff.label}</span>:{" "}
                              <span className="sl-change-old">{diff.old || "—"}</span>
                              <span className="sl-change-arrow">→</span>
                              <span className="sl-change-new">{diff.new || "—"}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sl-mobile-only" style={{ display: "none" }}>
                {editHistory.length === 0 ? (
                  <div className="sl-empty">
                    <i className="fas fa-history" style={{ fontSize: 32, opacity: 0.3, display: "block", marginBottom: 12 }} />
                    No edit history yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10 }}>
                    {editHistory.map(eh => (
                      <div key={eh.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1f2937" }}>{eh.client_name || "-"}</div>
                          <span className="sl-type-badge" style={{
                            background: eh.object_type === "group" ? "#e0f2fe" : "#ede9fe",
                            color: eh.object_type === "group" ? "#0369a1" : "#6d28d9",
                          }}>
                            {eh.object_type === "group" ? "Group" : "Row"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, fontSize: "0.75rem", color: "#6b7280" }}>
                          <span><i className="fas fa-user" style={{ marginRight: 4, color: "#9ca3af" }} />{eh.edited_by}</span>
                          <span><i className="fas fa-clock" style={{ marginRight: 4 }} />{formatDatetime(eh.edited_at)}</span>
                        </div>
                        {eh.date_of_inspection && (
                          <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: 8 }}>
                            <i className="fas fa-calendar" style={{ marginRight: 4 }} />Inspection: {formatDate(eh.date_of_inspection)}
                          </div>
                        )}
                        <div style={{ fontSize: "0.7rem", color: "#374151", marginBottom: 6, fontWeight: 600 }}>
                          {eh.change_count} field{eh.change_count !== 1 ? "s" : ""} changed:
                        </div>
                        {Object.entries(eh.changes || {}).map(([field, diff]) => (
                          <div key={field} className="sl-change-item">
                            <span style={{ fontWeight: 600, color: "#374151" }}>{diff.label}</span>:{" "}
                            <span className="sl-change-old">{diff.old || "—"}</span>
                            <span className="sl-change-arrow">→</span>
                            <span className="sl-change-new">{diff.new || "—"}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Pagination */}
          {!loading && !error && activeView === "logs" && !showAll && totalPages > 1 && (
            <div className="sl-pagination">
              {[
                { label: "First", target: 1, disabled: pageNum === 1 },
                { label: "Previous", target: pageNum - 1, disabled: pageNum === 1 },
              ].map(({ label, target, disabled }) => (
                <button key={label} onClick={() => !disabled && handlePage(target)} disabled={disabled} className="sl-page-btn">
                  {label}
                </button>
              ))}
              <span style={{ fontSize: 13, color: TEXT_LIGHT, padding: "0 4px" }}>Page {pageNum} of {totalPages}</span>
              {[
                { label: "Next", target: pageNum + 1, disabled: pageNum === totalPages },
                { label: "Last", target: totalPages, disabled: pageNum === totalPages },
              ].map(({ label, target, disabled }) => (
                <button key={label} onClick={() => !disabled && handlePage(target)} disabled={disabled} className="sl-page-btn">
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
