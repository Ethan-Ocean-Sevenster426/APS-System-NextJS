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

  /* ---- Styles ---- */
  const cardStyle: React.CSSProperties = {
    background: "white", borderRadius: 10, border: `1px solid ${BORDER}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
  };
  const thStyle: React.CSSProperties = {
    padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600,
    color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", background: "#f9fafb",
  };
  const filterSelectStyle: React.CSSProperties = {
    width: "100%", padding: "5px 8px", border: "1px solid #d1d5db",
    borderRadius: 5, fontSize: 12, background: "white", color: TEXT, outline: "none",
  };
  const btnBase: React.CSSProperties = {
    padding: "5px 11px", border: "none", borderRadius: 5, fontSize: 12,
    fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto", boxSizing: "border-box" }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      {/* ---- Header ---- */}
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "white", margin: 0, display: "inline-flex", alignItems: "center", gap: 8, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
          <i className="fas fa-shield-alt" style={{ opacity: 0.8, color: "#5ee8ff" }} />
          System Logs
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", margin: "4px 0 0", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
          Activity tracking, monitoring &amp; duplicate detection
        </p>
      </div>

      {/* ---- Filter Card ---- */}
      <div style={cardStyle}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fas fa-filter" style={{ color: PRIMARY, fontSize: 13 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Filter Logs</span>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#374151", marginBottom: 3 }}>User</label>
              <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={filterSelectStyle}>
                <option value="">All Users</option>
                {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Action</label>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={filterSelectStyle}>
                <option value="">All Actions</option>
                {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Page</label>
              <select value={pageFilter} onChange={e => setPageFilter(e.target.value)} style={filterSelectStyle}>
                <option value="">All Pages</option>
                {allPages.map(p => <option key={p} value={p}>{friendlyPage(p)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Date From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={filterSelectStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Date To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={filterSelectStyle} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
            <button onClick={handleApply} style={{ ...btnBase, background: PRIMARY, color: "white" }}
              onMouseOver={e => (e.currentTarget.style.background = PRIMARY_HOVER)}
              onMouseOut={e => (e.currentTarget.style.background = PRIMARY)}>
              <i className="fas fa-search" /> Apply Filters
            </button>
            <button onClick={handleClear} style={{ ...btnBase, border: "1px solid #d1d5db", background: "white", color: "#374151" }}>
              <i className="fas fa-times" /> Clear All
            </button>
          </div>
        </div>
      </div>

      {/* ---- Table Card ---- */}
      <div style={{ background: "white", borderRadius: 10, border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {/* Card header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {activeView === "logs" && <><i className="fas fa-list-alt" style={{ color: PRIMARY }} /> Activity Logs</>}
            {activeView === "dupes" && <><i className="fas fa-copy" style={{ color: "#dc2626" }} /> Duplicate Inspections</>}
            {activeView === "history" && <><i className="fas fa-history" style={{ color: "#7c3aed" }} /> Inspection Edit History</>}
          </h3>
          <span style={{ fontSize: 12, color: TEXT_LIGHT }}>
            {activeView === "logs" && `Showing ${logs.length} of ${total}`}
            {activeView === "dupes" && `${duplicateCount} duplicate groups`}
            {activeView === "history" && `${editHistoryTotal} total edits (showing latest 200)`}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: 48, textAlign: "center" }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: PRIMARY, marginBottom: 12, display: "block" }} />
            <p style={{ color: TEXT_LIGHT, fontSize: 14, margin: 0 }}>Loading system logs…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: 28, color: "#dc2626", marginBottom: 12, display: "block" }} />
            <p style={{ color: "#dc2626", fontSize: 14, margin: 0 }}>{error}</p>
            <button onClick={handleApply} style={{ marginTop: 12, padding: "6px 16px", border: "none", borderRadius: 6, background: PRIMARY, color: "white", fontSize: 13, cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {/* ---- Activity Logs ---- */}
        {!loading && !error && activeView === "logs" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Timestamp", "User", "Action", "Page", "Description", "IP Address"].map(col => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT }}>
                      <i className="fas fa-list-alt" style={{ fontSize: 32, opacity: 0.4, display: "block", marginBottom: 12 }} />
                      No system logs found.
                    </td>
                  </tr>
                ) : logs.map(log => {
                  const ac = ACTION_COLORS[log.action?.toUpperCase()] ?? { bg: "#f3f4f6", color: "#374151" };
                  return (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap", fontSize: 12, color: TEXT_LIGHT }}>{formatTimestamp(log.timestamp)}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 500, color: TEXT }}>{log.username}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: ac.bg, color: ac.color }}>
                          {log.action ? log.action.charAt(0) + log.action.slice(1).toLowerCase() : "-"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", color: TEXT }}>{friendlyPage(log.page)}</td>
                      <td style={{ padding: "10px 16px", color: TEXT_LIGHT, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.description || "-"}</td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: TEXT_LIGHT, fontFamily: "monospace", whiteSpace: "nowrap" }}>{log.ip_address || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Duplicates ---- */}
        {!loading && !error && activeView === "dupes" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Groups", "Client / Facility", "Inspector", "Date", "ID Range", "Action"].map(col => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {duplicates.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT }}>
                      <i className="fas fa-check-circle" style={{ fontSize: 32, opacity: 0.4, display: "block", marginBottom: 12, color: "#15803d" }} />
                      No duplicate inspection groups found.
                    </td>
                  </tr>
                ) : duplicates.map((dup, idx) => {
                  const badgeBg = dup.count >= 10 ? "#dc2626" : dup.count >= 5 ? "#f59e0b" : "#6b7280";
                  return (
                    <tr key={idx} style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, borderRadius: 6, minWidth: 28, height: 22, padding: "0 8px", color: "white", background: badgeBg }}>
                          {dup.count}x
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", fontWeight: 500, color: TEXT }}>{dup.client_name}</td>
                      <td style={{ padding: "10px 16px", color: TEXT }}>{dup.inspector || "-"}</td>
                      <td style={{ padding: "10px 16px", color: TEXT }}>{formatDate(dup.date)}</td>
                      <td style={{ padding: "10px 16px", fontSize: 11, color: TEXT_LIGHT }}>#{dup.first_id} - #{dup.last_id}</td>
                      <td style={{ padding: "10px 16px" }}>
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
        )}

        {/* ---- Edit History ---- */}
        {!loading && !error && activeView === "history" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
                    <th key={label} style={{ ...thStyle, width: w }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT }}>
                      <i className="fas fa-history" style={{ fontSize: 32, opacity: 0.3, display: "block", marginBottom: 12 }} />
                      No edit history yet. Changes to inspections will appear here once someone edits a record.
                    </td>
                  </tr>
                ) : editHistory.map(eh => (
                  <tr key={eh.id} style={{ borderBottom: `1px solid ${BORDER}`, verticalAlign: "top" }}>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: TEXT_LIGHT, whiteSpace: "nowrap" }}>{formatDatetime(eh.edited_at)}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500 }}>{eh.edited_by}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{
                        background: eh.object_type === "group" ? "#e0f2fe" : "#ede9fe",
                        color: eh.object_type === "group" ? "#0369a1" : "#6d28d9",
                        padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      }}>
                        {eh.object_type === "group" ? "Group" : "Row"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500 }}>{eh.client_name || "-"}</td>
                    <td style={{ padding: "10px 16px", fontSize: 12 }}>{eh.date_of_inspection ? formatDate(eh.date_of_inspection) : "-"}</td>
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      <span style={{ background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                        {eh.change_count}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 12 }}>
                      {Object.entries(eh.changes || {}).map(([field, diff]) => (
                        <div key={field} style={{ marginBottom: 4, padding: "4px 8px", background: "#f9fafb", borderRadius: 6, borderLeft: "3px solid #7c3aed" }}>
                          <span style={{ fontWeight: 600, color: "#374151" }}>{diff.label}</span>:{" "}
                          <span style={{ background: "#fee2e2", color: "#991b1b", padding: "1px 5px", borderRadius: 3, fontFamily: "monospace" }}>{diff.old || "—"}</span>
                          <span style={{ color: "#9ca3af", margin: "0 4px" }}>→</span>
                          <span style={{ background: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: 3, fontFamily: "monospace" }}>{diff.new || "—"}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Pagination ---- */}
        {!loading && !error && activeView === "logs" && !showAll && totalPages > 1 && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "First", target: 1, disabled: pageNum === 1 },
              { label: "Previous", target: pageNum - 1, disabled: pageNum === 1 },
            ].map(({ label, target, disabled }) => (
              <button key={label} onClick={() => !disabled && handlePage(target)} disabled={disabled}
                style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", color: disabled ? "#9ca3af" : "#374151", fontSize: 12, cursor: disabled ? "default" : "pointer" }}>
                {label}
              </button>
            ))}
            <span style={{ fontSize: 13, color: TEXT_LIGHT, padding: "0 4px" }}>Page {pageNum} of {totalPages}</span>
            {[
              { label: "Next", target: pageNum + 1, disabled: pageNum === totalPages },
              { label: "Last", target: totalPages, disabled: pageNum === totalPages },
            ].map(({ label, target, disabled }) => (
              <button key={label} onClick={() => !disabled && handlePage(target)} disabled={disabled}
                style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", color: disabled ? "#9ca3af" : "#374151", fontSize: 12, cursor: disabled ? "default" : "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
