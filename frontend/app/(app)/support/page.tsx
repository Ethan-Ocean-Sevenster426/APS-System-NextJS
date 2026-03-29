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
      <style>{`
/* Support page */
.sp-container { padding: 1.5rem; min-height: 100vh; background: transparent; box-sizing: border-box; }
.sp-header { margin-bottom: 20px; text-align: center; }
.sp-header h1 { font-size: 1.45rem; font-weight: 700; color: white; display: inline-flex; align-items: center; gap: 10px; margin: 0 0 4px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
.sp-header p { color: rgba(255,255,255,0.9); font-size: 13px; margin: 0; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }

/* Card base */
.sp-card { background: #ffffff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }

/* Stats grid */
.sp-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; margin-bottom: 0.75rem; }
.sp-stat-card { padding: 10px 12px; text-align: center; }
.sp-stat-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; }
.sp-stat-value { font-size: 1.15rem; font-weight: 700; }
.sp-stat-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

/* New ticket button row */
.sp-new-btn-row { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.sp-btn-primary { padding: 8px 18px; background: #007890; color: #fff; border: none; border-radius: 7px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 7px; }

/* Filter bar */
.sp-filter-bar { padding: 12px 16px; margin-bottom: 0.75rem; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.sp-search-wrapper { position: relative; flex: 1; min-width: 180px; }
.sp-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #6b7280; font-size: 13px; }
.sp-search-input { width: 100%; padding: 7px 10px 7px 30px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; box-sizing: border-box; }
.sp-filter-select { padding: 7px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; min-width: 130px; }
.sp-clear-btn { padding: 7px 14px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; cursor: pointer; color: #1f2937; }

/* Table */
.sp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sp-table th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.sp-table tbody tr { border-bottom: 1px solid #e5e7eb; transition: background 0.15s; }
.sp-table tbody tr:hover { background: #f9fafb; }
.sp-table td { padding: 10px 14px; }

/* Action buttons */
.sp-action-btn { padding: 4px 10px; border: none; border-radius: 5px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }

/* Mobile/Desktop toggle */
.sp-mobile-only { display: none !important; }
.sp-desktop-only { display: block; }

/* Modal */
.sp-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 9000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.sp-modal { background: #fff; border-radius: 12px; padding: 28px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.2); max-height: 85vh; overflow-y: auto; }
.sp-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.sp-modal-close { background: none; border: none; cursor: pointer; font-size: 20px; color: #6b7280; padding: 2px 6px; }
.sp-form-label { display: block; font-size: 12px; font-weight: 600; color: #1f2937; margin-bottom: 5px; }
.sp-form-input { width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.sp-form-select { width: 100%; padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px; }
.sp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.sp-modal-footer { display: flex; gap: 10px; flex-wrap: wrap; }
.sp-modal-meta { border-top: 1px solid #e5e7eb; margin-top: 16px; padding-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }

/* Toast */
.sp-toast { position: fixed; top: 20px; right: 24px; color: #fff; padding: 12px 22px; border-radius: 8px; font-size: 14px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; display: flex; align-items: center; gap: 8px; }

/* Status/Priority badges */
.sp-badge { padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.sp-status-select { padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; border: none; cursor: pointer; }

/* Responsive */
@media (max-width: 768px) {
  .sp-mobile-only { display: block !important; }
  .sp-desktop-only { display: none !important; }
  .sp-container { padding: 0.75rem; }
  .sp-header h1 { font-size: 1.15rem; }
  .sp-header p { font-size: 0.75rem; }
  .sp-stats-grid { grid-template-columns: repeat(3, 1fr); }
  .sp-filter-bar { flex-direction: column; }
  .sp-search-wrapper { min-width: 0; width: 100%; }
  .sp-filter-select { width: 100%; }
  .sp-clear-btn { width: 100%; text-align: center; }
  .sp-new-btn-row { justify-content: stretch; }
  .sp-new-btn-row .sp-btn-primary { width: 100%; justify-content: center; }
  .sp-modal { padding: 20px 16px; max-width: 95%; }
  .sp-form-grid { grid-template-columns: 1fr; }
  .sp-modal-meta { grid-template-columns: 1fr; }
  .sp-toast { right: 12px; left: 12px; font-size: 13px; padding: 10px 16px; }
}
@media (max-width: 480px) {
  .sp-container { padding: 0.5rem; }
  .sp-header h1 { font-size: 1rem; }
  .sp-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .sp-stat-value { font-size: 1rem; }
  .sp-stat-label { font-size: 9px; }
}
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="sp-toast" style={{ background: toast.ok ? "#059669" : "#dc2626" }}>
          <i className={`fas ${toast.ok ? "fa-check-circle" : "fa-exclamation-circle"}`} /> {toast.msg}
        </div>
      )}

      {/* View Ticket Modal */}
      {viewTicket && (
        <div className="sp-modal-backdrop" onClick={() => setViewTicket(null)}>
          <div className="sp-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <div>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Ticket #{viewTicket.id}</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>{viewTicket.title}</h2>
              </div>
              <button onClick={() => setViewTicket(null)} className="sp-modal-close"><i className="fas fa-times" /></button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {(() => { const sc = STATUS_COLORS[viewTicket.status] ?? STATUS_COLORS.open; return <span className="sp-badge" style={{ background: sc.bg, color: sc.color }}>{viewTicket.status}</span>; })()}
              {(() => { const pc = PRIORITY_COLORS[viewTicket.priority] ?? PRIORITY_COLORS.medium; return <span className="sp-badge" style={{ background: pc.bg, color: pc.color }}>{viewTicket.priority}</span>; })()}
              {viewTicket.issue_type && <span className="sp-badge" style={{ background: "#f3f4f6", color: TEXT }}>{viewTicket.issue_type}</span>}
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
            <div className="sp-modal-meta">
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
        <div className="sp-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="sp-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: 0 }}><i className="fas fa-plus-circle" style={{ color: PRIMARY, marginRight: 8 }} />Create Ticket</h2>
              <button onClick={() => setShowCreate(false)} className="sp-modal-close"><i className="fas fa-times" /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="sp-form-label">Title *</label>
              <input value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="Brief summary" className="sp-form-input" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="sp-form-label">Description *</label>
              <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} rows={4} placeholder="Describe the issue..." className="sp-form-input" style={{ resize: "vertical" }} />
            </div>
            <div className="sp-form-grid">
              <div>
                <label className="sp-form-label">Status</label>
                <select value={cStatus} onChange={e => setCStatus(e.target.value)} className="sp-form-select">
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="sp-form-label">Priority</label>
                <select value={cPriority} onChange={e => setCPriority(e.target.value)} className="sp-form-select">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="sp-form-grid" style={{ marginBottom: 20 }}>
              <div>
                <label className="sp-form-label">Assign To</label>
                <select value={cAssigned} onChange={e => setCAssigned(e.target.value)} className="sp-form-select">
                  <option value="">Unassigned</option>
                  {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="sp-form-label">Due Date</label>
                <input type="date" value={cDue} onChange={e => setCDue(e.target.value)} className="sp-form-input" />
              </div>
            </div>
            <div className="sp-modal-footer">
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

      <div className="sp-container">
        {/* Header */}
        <div className="sp-header">
          <h1><i className="fas fa-headset" style={{ color: "#5ee8ff" }} /> Support Tickets</h1>
          <p>Manage and track all support requests</p>
        </div>

        <div className="sp-new-btn-row">
          <button onClick={() => setShowCreate(true)} className="sp-btn-primary">
            <i className="fas fa-plus" /> New Ticket
          </button>
        </div>

        {/* Stats */}
        <div className="sp-stats-grid">
          {statsCards.map(s => (
            <div key={s.label} className="sp-card sp-stat-card">
              <div className="sp-stat-icon" style={{ background: s.bg }}>
                <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 12 }} />
              </div>
              <div className="sp-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="sp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="sp-card sp-filter-bar">
          <div className="sp-search-wrapper">
            <i className="fas fa-search sp-search-icon" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="sp-search-input" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="sp-filter-select">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="sp-filter-select">
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {(search || statusFilter || priorityFilter) && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); }} className="sp-clear-btn">
              <i className="fas fa-times" style={{ marginRight: 5 }} />Clear
            </button>
          )}
        </div>

        {/* Table - Desktop */}
        <div className="sp-card sp-desktop-only" style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: TEXT_LIGHT }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, display: "block", marginBottom: 12 }} />Loading tickets...
            </div>
          ) : error ? (
            <div style={{ padding: 60, textAlign: "center", color: "#dc2626" }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: 28, display: "block", marginBottom: 12 }} />{error}
            </div>
          ) : (
            <table className="sp-table">
              <thead>
                <tr>
                  {["ID", "Title", "Status", "Priority", "Submitted By", "Assigned To", "Created", "Actions"].map(col => (
                    <th key={col}>{col}</th>
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
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, color: TEXT_LIGHT, whiteSpace: "nowrap" }}>#{t.id}</td>
                      <td style={{ fontWeight: 500, color: TEXT, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <button onClick={() => setViewTicket(t)} style={{ background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontWeight: 600, fontSize: 13, textAlign: "left", padding: 0 }}>
                          {t.title}
                        </button>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <select value={t.status} onChange={e => handleStatusChange(t.id, e.target.value)}
                          className="sp-status-select" style={{ background: sc.bg, color: sc.color }}>
                          <option value="open">Open</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className="sp-badge" style={{ padding: "2px 10px", fontSize: 11, background: pc.bg, color: pc.color }}>
                          {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                        </span>
                      </td>
                      <td style={{ color: TEXT }}>{t.created_by || "-"}</td>
                      <td style={{ color: TEXT }}>{t.assigned_to || <span style={{ color: TEXT_LIGHT, fontStyle: "italic" }}>Unassigned</span>}</td>
                      <td style={{ color: TEXT_LIGHT, fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(t.created_at)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setViewTicket(t)} className="sp-action-btn" style={{ background: PRIMARY, color: "#fff" }}>
                            <i className="fas fa-eye" /> View
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="sp-action-btn" style={{ background: "#fee2e2", color: "#b91c1c" }}>
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

        {/* Mobile Card View */}
        <div className="sp-mobile-only" style={{ display: "none" }}>
          {loading ? (
            <div className="sp-card" style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, display: "block", marginBottom: 12 }} />Loading tickets...
            </div>
          ) : error ? (
            <div className="sp-card" style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: 28, display: "block", marginBottom: 12 }} />{error}
            </div>
          ) : tickets.length === 0 ? (
            <div className="sp-card" style={{ padding: 40, textAlign: "center", color: TEXT_LIGHT }}>
              <i className="fas fa-ticket-alt" style={{ fontSize: 30, display: "block", marginBottom: 10, opacity: 0.4 }} />
              No tickets found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tickets.map(t => {
                const sc = STATUS_COLORS[t.status] ?? STATUS_COLORS.open;
                const pc = PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.medium;
                return (
                  <div key={t.id} className="sp-card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.65rem", color: TEXT_LIGHT, fontWeight: 600 }}>#{t.id}</div>
                        <button onClick={() => setViewTicket(t)} style={{ background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontWeight: 700, fontSize: "0.9rem", textAlign: "left", padding: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", width: "100%" }}>
                          {t.title}
                        </button>
                      </div>
                      <span className="sp-badge" style={{ background: pc.bg, color: pc.color, fontSize: 10, flexShrink: 0, marginLeft: 8 }}>
                        {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <select value={t.status} onChange={e => handleStatusChange(t.id, e.target.value)}
                        className="sp-status-select" style={{ background: sc.bg, color: sc.color, fontSize: 10 }}>
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <span style={{ fontSize: "0.7rem", color: TEXT_LIGHT }}>{t.created_by || "-"}</span>
                      <span style={{ fontSize: "0.65rem", color: "#9ca3af", marginLeft: "auto" }}>{formatDate(t.created_at)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setViewTicket(t)} className="sp-action-btn" style={{ background: PRIMARY, color: "#fff", flex: 1, justifyContent: "center" }}>
                        <i className="fas fa-eye" /> View
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="sp-action-btn" style={{ background: "#fee2e2", color: "#b91c1c", flex: 1, justifyContent: "center" }}>
                        <i className="fas fa-trash" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
