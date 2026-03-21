"use client";

import { useState, useEffect, useCallback } from "react";

const PRIMARY = "#007890";
const BORDER = "#e5e7eb";
const TEXT = "#1f2937";
const TEXT_LIGHT = "#6b7280";

interface Ticket {
  id: number;
  title: string;
  issue_type: string;
  description: string;
  status: string;
  priority: string;
  created_by: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  browser_info: string;
  additional_notes: string;
  affected_area: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  impact_users: string;
  is_blocking: boolean;
}

interface Stats {
  open: number;
  in_progress: number;
  resolved_today: number;
  high_priority: number;
  total: number;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  open: { bg: "#dbeafe", color: "#1d4ed8" },
  "in-progress": { bg: "#fef3c7", color: "#92400e" },
  resolved: { bg: "#d1fae5", color: "#065f46" },
  closed: { bg: "#f3f4f6", color: "#374151" },
};

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  low: { bg: "#f0fdf4", color: "#15803d" },
  medium: { bg: "#fefce8", color: "#92400e" },
  high: { bg: "#fee2e2", color: "#b91c1c" },
  urgent: { bg: "#fae8ff", color: "#86198f" },
};

function formatDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 10,
  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  border: `1px solid ${BORDER}`,
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: TEXT_LIGHT,
  background: "#f9fafb",
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: "nowrap",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats>({ open: 0, in_progress: 0, resolved_today: 0, high_priority: 0, total: 0 });
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cStatus, setCStatus] = useState("open");
  const [cPriority, setCPriority] = useState("medium");
  const [cAssigned, setCAssigned] = useState("");
  const [cDue, setCDue] = useState("");
  const [creating, setCreating] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      const res = await fetch(`/api/support-tickets${params.toString() ? `?${params}` : ""}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load");
      setTickets(data.tickets);
      setStats(data.stats);
      setAllUsers(data.all_users || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleStatusChange = async (id: number, status: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    try {
      const res = await fetch(`/api/support-tickets/${id}/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast("Status updated");
      fetchTickets();
    } catch {
      showToast("Failed to update status", false);
      fetchTickets();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Delete ticket #${id}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/support-tickets/${id}/delete`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast("Ticket deleted");
      setTickets(prev => prev.filter(t => t.id !== id));
      setStats(prev => ({ ...prev, total: prev.total - 1 }));
    } catch {
      showToast("Failed to delete ticket", false);
    }
  };

  const handleCreate = async () => {
    if (!cTitle.trim() || !cDesc.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/support-tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cTitle.trim(), description: cDesc.trim(), status: cStatus, priority: cPriority, assigned_to: cAssigned, due_date: cDue || null }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(`Ticket #${data.ticket_id} created`);
      setShowCreate(false);
      setCTitle(""); setCDesc(""); setCStatus("open"); setCPriority("medium"); setCAssigned(""); setCDue("");
      fetchTickets();
    } catch {
      showToast("Failed to create ticket", false);
    } finally {
      setCreating(false);
    }
  };

  const statsCards = [
    { label: "Open", value: stats.open, color: "#1d4ed8", bg: "#dbeafe", icon: "fa-folder-open" },
    { label: "In Progress", value: stats.in_progress, color: "#92400e", bg: "#fef3c7", icon: "fa-spinner" },
    { label: "Resolved Today", value: stats.resolved_today, color: "#065f46", bg: "#d1fae5", icon: "fa-check-circle" },
    { label: "High Priority", value: stats.high_priority, color: "#b91c1c", bg: "#fee2e2", icon: "fa-exclamation-circle" },
    { label: "Total Tickets", value: stats.total, color: PRIMARY, bg: "#e0f2f7", icon: "fa-ticket-alt" },
  ];

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, background: toast.ok ? "#059669" : "#dc2626", color: "#fff", padding: "12px 22px", borderRadius: 8, fontSize: 14, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 10000, display: "flex", alignItems: "center", gap: 8 }}>
          <i className={`fas ${toast.ok ? "fa-check-circle" : "fa-exclamation-circle"}`} /> {toast.msg}
        </div>
      )}

      {/* View Ticket Modal */}
      {viewTicket && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setViewTicket(null)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 600, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Ticket #{viewTicket.id}</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>{viewTicket.title}</h2>
              </div>
              <button onClick={() => setViewTicket(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: TEXT_LIGHT, padding: "2px 6px" }}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {(() => { const sc = STATUS_COLORS[viewTicket.status] ?? STATUS_COLORS.open; return <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color }}>{viewTicket.status}</span>; })()}
              {(() => { const pc = PRIORITY_COLORS[viewTicket.priority] ?? PRIORITY_COLORS.medium; return <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: pc.bg, color: pc.color }}>{viewTicket.priority}</span>; })()}
              {viewTicket.issue_type && <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#f3f4f6", color: TEXT }}>{viewTicket.issue_type}</span>}
            </div>
            {[
              { label: "Description", value: viewTicket.description },
              { label: "Steps to Reproduce", value: viewTicket.steps_to_reproduce },
              { label: "Expected Behavior", value: viewTicket.expected_behavior },
              { label: "Actual Behavior", value: viewTicket.actual_behavior },
              { label: "Browser / Device", value: viewTicket.browser_info },
              { label: "Additional Notes", value: viewTicket.additional_notes },
              { label: "Impact", value: viewTicket.impact_users },
            ].filter(f => f.value).map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: 14, color: TEXT, whiteSpace: "pre-wrap" }}>{f.value}</div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 16, paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
              <div><span style={{ color: TEXT_LIGHT }}>Submitted by: </span><strong>{viewTicket.created_by || "-"}</strong></div>
              <div><span style={{ color: TEXT_LIGHT }}>Assigned to: </span><strong>{viewTicket.assigned_to || "Unassigned"}</strong></div>
              <div><span style={{ color: TEXT_LIGHT }}>Created: </span>{formatDate(viewTicket.created_at)}</div>
              <div><span style={{ color: TEXT_LIGHT }}>Updated: </span>{formatDate(viewTicket.updated_at)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: 0 }}><i className="fas fa-plus-circle" style={{ color: PRIMARY, marginRight: 8 }} />Create Ticket</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: TEXT_LIGHT }}>
                <i className="fas fa-times" />
              </button>
            </div>
            {[
              { label: "Title *", el: <input value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="Brief summary" style={{ width: "100%", padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const }} /> },
              { label: "Description *", el: <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} rows={4} placeholder="Describe the issue..." style={{ width: "100%", padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, resize: "vertical" as const, boxSizing: "border-box" as const }} /> },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 5 }}>{f.label}</label>
                {f.el}
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 5 }}>Status</label>
                <select value={cStatus} onChange={e => setCStatus(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14 }}>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 5 }}>Priority</label>
                <select value={cPriority} onChange={e => setCPriority(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14 }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 5 }}>Assign To</label>
                <select value={cAssigned} onChange={e => setCAssigned(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14 }}>
                  <option value="">Unassigned</option>
                  {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 5 }}>Due Date</label>
                <input type="date" value={cDue} onChange={e => setCDue(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleCreate} disabled={creating || !cTitle.trim() || !cDesc.trim()}
                style={{ padding: "9px 22px", background: creating ? "#94a3b8" : PRIMARY, color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: creating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7 }}>
                <i className={`fas ${creating ? "fa-spinner fa-spin" : "fa-plus"}`} /> {creating ? "Creating..." : "Create Ticket"}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ padding: "9px 18px", background: "#f3f4f6", color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 7, fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "1.5rem", minHeight: "100vh", background: "transparent" }}>
        {/* Header */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 700, color: "white", display: "inline-flex", alignItems: "center", gap: 10, margin: "0 0 4px", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            <i className="fas fa-headset" style={{ color: "#5ee8ff" }} /> Support Tickets
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>Manage and track all support requests</p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: "8px 18px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            <i className="fas fa-plus" /> New Ticket
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {statsCards.map(s => (
            <div key={s.label} style={{ ...cardStyle, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 12 }} />
              </div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: TEXT_LIGHT, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: "0.75rem", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <i className="fas fa-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: TEXT_LIGHT, fontSize: 13 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." style={{ width: "100%", padding: "7px 10px 7px 30px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, boxSizing: "border-box" as const }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, minWidth: 130 }}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, minWidth: 130 }}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {(search || statusFilter || priorityFilter) && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); }} style={{ padding: "7px 14px", background: "#f3f4f6", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, cursor: "pointer", color: TEXT }}>
              <i className="fas fa-times" style={{ marginRight: 5 }} />Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: TEXT_LIGHT }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, display: "block", marginBottom: 12 }} />Loading tickets...
            </div>
          ) : error ? (
            <div style={{ padding: 60, textAlign: "center", color: "#dc2626" }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: 28, display: "block", marginBottom: 12 }} />{error}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["ID", "Title", "Status", "Priority", "Submitted By", "Assigned To", "Created", "Actions"].map(col => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 50, textAlign: "center", color: TEXT_LIGHT }}>
                      <i className="fas fa-ticket-alt" style={{ fontSize: 30, display: "block", marginBottom: 10, opacity: 0.4 }} />
                      No tickets found.
                    </td>
                  </tr>
                ) : tickets.map(t => {
                  const sc = STATUS_COLORS[t.status] ?? STATUS_COLORS.open;
                  const pc = PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.medium;
                  return (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: TEXT_LIGHT, whiteSpace: "nowrap" }}>#{t.id}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 500, color: TEXT, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <button onClick={() => setViewTicket(t)} style={{ background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontWeight: 600, fontSize: 13, textAlign: "left", padding: 0 }}>
                          {t.title}
                        </button>
                      </td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <select value={t.status} onChange={e => handleStatusChange(t.id, e.target.value)}
                          style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, border: "none", cursor: "pointer" }}>
                          <option value="open">Open</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: pc.bg, color: pc.color }}>
                          {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: TEXT }}>{t.created_by || "-"}</td>
                      <td style={{ padding: "10px 14px", color: TEXT }}>{t.assigned_to || <span style={{ color: TEXT_LIGHT, fontStyle: "italic" }}>Unassigned</span>}</td>
                      <td style={{ padding: "10px 14px", color: TEXT_LIGHT, fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(t.created_at)}</td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setViewTicket(t)} title="View"
                            style={{ padding: "4px 10px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 5, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="fas fa-eye" /> View
                          </button>
                          <button onClick={() => handleDelete(t.id)} title="Delete"
                            style={{ padding: "4px 10px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 5, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="fas fa-trash" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
