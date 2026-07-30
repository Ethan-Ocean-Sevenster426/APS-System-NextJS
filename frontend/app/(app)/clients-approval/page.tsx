"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface TargetClient {
  id: number;
  client_id: string;
  name: string;
  town: string;
}
interface PendingClient {
  id: number;
  client_id: string;
  name: string;
  town: string;
  corporate_group: string;
  group_type: string;
  facility_type: string;
  created_at: string | null;
  created_by: string;
  inspection_count: number;
}

const CAN_APPROVE_ROLES = ["admin", "super_admin", "developer", "inspector_manager"];
const PAGE_SIZE = 20;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? iso + "T12:00:00" : iso)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClientsApprovalPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<PendingClient[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [matchClient, setMatchClient] = useState<PendingClient | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmBox, setConfirmBox] = useState<{
    title: string;
    lines: string[];
    confirmLabel: string;
    confirmClass: string;
    onConfirm: () => void;
  } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [targetSearch, setTargetSearch] = useState("");
  const [targetResults, setTargetResults] = useState<TargetClient[]>([]);
  const [targetLoading, setTargetLoading] = useState(false);
  const targetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) { window.location.href = "/login"; return; }
        setRole(d.role || "inspector");
      })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  const load = useCallback((pageArg: number, searchArg: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pageArg), page_size: String(PAGE_SIZE) });
    if (searchArg) params.set("search", searchArg);
    fetch(`/api/clients-approval?${params}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setClients(d.clients || []);
          setTotal(d.count || 0);
          setTotalPages(d.total_pages || 1);
          setError("");
        } else {
          setError(d.error || "Failed to load pending clients");
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const canApprove = role !== null && CAN_APPROVE_ROLES.includes(role);

  useEffect(() => {
    if (canApprove) load(page, search);
    // search changes are debounced separately below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApprove, page]);

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      load(1, value);
    }, 350);
  };

  const onTargetSearch = (value: string) => {
    setTargetSearch(value);
    if (targetTimer.current) clearTimeout(targetTimer.current);
    const q = value.trim();
    if (!q) {
      setTargetResults([]);
      return;
    }
    targetTimer.current = setTimeout(() => {
      setTargetLoading(true);
      fetch(`/api/clients-approval?target_search=${encodeURIComponent(q)}`, { cache: "no-store" })
        .then(r => r.json())
        .then(d => setTargetResults(d.results || []))
        .catch(() => {})
        .finally(() => setTargetLoading(false));
    }, 300);
  };

  const startMatching = (client: PendingClient) => {
    setMatchClient(client);
    setTargetSearch("");
    setTargetResults([]);
  };

  const stopMatching = () => {
    setMatchClient(null);
    setTargetSearch("");
    setTargetResults([]);
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === "error" ? 6000 : 4000);
  };

  const refresh = () => load(page, search);

  const doAccept = async (client: PendingClient) => {
    setBusyId(client.id);
    try {
      const res = await fetch("/api/clients-approval/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.message || "Client accepted");
        refresh();
      } else {
        showToast(d.error || "Accept failed", "error");
      }
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const accept = (client: PendingClient) => {
    setConfirmBox({
      title: "Accept New Client",
      lines: [
        `Accept "${client.name}" as a new client?`,
        `Its ${client.inspection_count} inspection${client.inspection_count === 1 ? "" : "s"} will stay under this name.`,
      ],
      confirmLabel: "Yes, Accept Client",
      confirmClass: "ir-btn-green",
      onConfirm: () => doAccept(client),
    });
  };

  const doMerge = async (client: PendingClient, target: TargetClient) => {
    setBusyId(client.id);
    try {
      const res = await fetch("/api/clients-approval/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id, target_id: target.id }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.message || "Matched to correct client");
        stopMatching();
        refresh();
      } else {
        showToast(d.error || "Match failed", "error");
      }
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const merge = (client: PendingClient, target: TargetClient) => {
    setConfirmBox({
      title: "Match to Correct Client",
      lines: [
        `"${client.name}" is really "${target.name}"?`,
        `Its ${client.inspection_count} inspection${client.inspection_count === 1 ? "" : "s"} will move to "${target.name}" and the misspelled name "${client.name}" will be deleted.`,
        "This cannot be undone.",
      ],
      confirmLabel: "Yes, Match Client",
      confirmClass: "ir-btn-primary",
      onConfirm: () => doMerge(client, target),
    });
  };

  /* ── Render ────────────────────────────────────────────────────────────── */
  if (role !== null && !canApprove) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
        <i className="fas fa-lock" style={{ fontSize: 28, marginBottom: 12 }} />
        <p>You don&apos;t have permission to approve clients.</p>
        <a href="/inspections" style={{ color: "#007890" }}>Back to Inspections</a>
      </div>
    );
  }

  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <style>{`
        .ir-container { width: 100%; padding: 5px 0; }
        .ir-header { padding: 10px 5px 20px; margin-bottom: 5px; width: 100%; text-align: center; }
        .ir-header h1 { color: white; font-size: 1.75rem; font-weight: 600; margin-bottom: 4px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
        .ir-header h2 { color: white; font-size: 1rem; font-weight: 400; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
        .ir-card { background: #fff; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06); margin-bottom: 5px; border: 1px solid #e5e7eb; width: 100%; }
        .ir-card-header { padding: 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .ir-card-title { font-size: 1rem; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px; }
        .ir-card-body { padding: 16px; overflow-x: auto; }
        .ir-action-bar { display: flex; gap: 12px; margin-bottom: 5px; width: 100%; flex-wrap: wrap; }
        .ir-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 6px; border: none; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.15s ease; text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .ir-btn:disabled { opacity: 0.55; cursor: default; }
        .ir-btn-primary { background: #007890; color: white; }
        .ir-btn-primary:hover { background: #005a6b; }
        .ir-btn-secondary { background: #6b7280; color: white; }
        .ir-btn-secondary:hover { background: #4b5563; }
        .ir-btn-green { background: #22c55e; color: white; }
        .ir-btn-green:hover:not(:disabled) { background: #16a34a; }
        .ir-btn-purple { background: #7c3aed; color: white; }
        .ir-btn-purple:hover:not(:disabled) { background: #6d28d9; }
        .ir-btn-grey { background: #e5e7eb; color: #374151; }
        .ir-btn-grey:hover:not(:disabled) { background: #d1d5db; }
        .ir-btn-sm { padding: 6px 12px; font-size: 0.75rem; border-radius: 5px; gap: 5px; }
        .ir-form-label { font-size: 0.875rem; font-weight: 500; color: #6b7280; display: block; margin-bottom: 4px; }
        .ir-form-control { padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.875rem; color: #1f2937; background: #fff; width: 100%; box-sizing: border-box; }
        .ir-form-control:focus { outline: none; border-color: #007890; box-shadow: 0 0 0 3px #e6f3f7; }
        .ir-table { min-width: 100%; border-collapse: collapse; }
        .ir-table thead { background: #f9fafb; }
        .ir-table th { padding: 11px 12px; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        .ir-table th.center { text-align: center; }
        .ir-table td { padding: 11px 12px; font-size: 0.8rem; border-bottom: 1px solid #e5e7eb; color: #1f2937; vertical-align: middle; }
        .ir-table td.center { text-align: center; }
        .ir-table-info { font-size: 0.875rem; color: #6b7280; margin-bottom: 12px; }
        .ir-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; display: inline-block; white-space: nowrap; }
        .ir-badge-amber { background: #fef3c7; color: #b45309; }
        .ir-badge-green { background: #dcfce7; color: #166534; }
        .ir-badge-red { background: #fee2e2; color: #991b1b; }
        .ca-match-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 12px; border-bottom: 1px solid #f3f4f6; cursor: pointer; font-size: 0.85rem; }
        .ca-match-item:last-child { border-bottom: none; }
        .ca-match-item:hover { background: #e6f3f7; }
        .ca-toast { position: fixed; top: 18px; right: 18px; z-index: 10002; background: #15803d; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); font-size: 13.5px; font-weight: 600; }
        @media (max-width: 768px) {
          .ir-header h1 { font-size: 1.1rem; }
          .ir-header h2 { font-size: 0.8rem; }
          .ir-action-bar { gap: 6px; }
          .ir-action-bar .ir-btn { padding: 6px 10px; font-size: 0.75rem; }
          .ir-card-header { padding: 10px; }
          .ir-card-body { padding: 6px; }
          .ir-table th, .ir-table td { padding: 4px 6px; font-size: 0.65rem; }
          .ir-table { min-width: 700px; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="ca-toast" style={toast.type === "error" ? { background: "#dc2626" } : undefined}>
          <i className={`fas ${toast.type === "error" ? "fa-exclamation-triangle" : "fa-check-circle"}`} style={{ marginRight: 8 }} />
          {toast.msg}
        </div>
      )}

      {/* Confirmation box */}
      {confirmBox && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.55)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 10001,
          }}
          onClick={() => setConfirmBox(null)}
        >
          <div
            style={{
              background: "white", borderRadius: 12, padding: 24,
              maxWidth: 460, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 17, color: "#1f2937", display: "flex", alignItems: "center", gap: 9 }}>
              <i
                className={`fas ${confirmBox.confirmClass === "ir-btn-green" ? "fa-check-circle" : "fa-random"}`}
                style={{ color: confirmBox.confirmClass === "ir-btn-green" ? "#22c55e" : "#007890" }}
              />
              {confirmBox.title}
            </h3>
            {confirmBox.lines.map((line, i) => (
              <p key={i} style={{
                margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.5,
                color: line === "This cannot be undone." ? "#dc2626" : "#4b5563",
                fontWeight: line === "This cannot be undone." ? 600 : i === 0 ? 600 : 400,
              }}>
                {line}
              </p>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                className="ir-btn ir-btn-grey"
                style={{ flex: 1 }}
                onClick={() => setConfirmBox(null)}
              >
                Cancel
              </button>
              <button
                className={`ir-btn ${confirmBox.confirmClass}`}
                style={{ flex: 1 }}
                onClick={() => { const action = confirmBox.onConfirm; setConfirmBox(null); action(); }}
              >
                {confirmBox.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match to Correct Client modal */}
      {matchClient && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={stopMatching}
        >
          <div
            style={{
              background: "white", borderRadius: 12, padding: 24,
              maxWidth: 520, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "#1f2937" }}>
              Match &quot;{matchClient.name}&quot; to the correct client
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#6b7280" }}>
              Search for the client this actually is. Its {matchClient.inspection_count} inspection{matchClient.inspection_count === 1 ? "" : "s"} will
              move to that client and the name &quot;{matchClient.name}&quot; will be removed.
            </p>
            <input
              className="ir-form-control"
              value={targetSearch}
              autoFocus
              onChange={e => onTargetSearch(e.target.value)}
              disabled={busyId === matchClient.id}
              placeholder="Type the correct client's name..."
            />
            <div style={{ minHeight: 60, maxHeight: 260, overflowY: "auto", marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 8 }}>
              {!targetSearch.trim() ? (
                <div style={{ padding: "18px 14px", fontSize: "0.85rem", color: "#9ca3af", textAlign: "center" }}>
                  Start typing to search all existing clients…
                </div>
              ) : targetLoading ? (
                <div style={{ padding: "18px 14px", fontSize: "0.85rem", color: "#6b7280", textAlign: "center" }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Searching…
                </div>
              ) : targetResults.length === 0 ? (
                <div style={{ padding: "18px 14px", fontSize: "0.85rem", color: "#6b7280", fontStyle: "italic", textAlign: "center" }}>
                  No existing clients found for &quot;{targetSearch.trim()}&quot;.
                </div>
              ) : targetResults.map(s => (
                <div key={s.id} className="ca-match-item" onClick={() => merge(matchClient, s)}>
                  <span>
                    <strong>{s.name}</strong>
                    {s.town && <span style={{ color: "#9ca3af", marginLeft: 6, fontSize: "0.75rem" }}>({s.town})</span>}
                  </span>
                  <span style={{ color: "#007890", fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                    Match <i className="fas fa-arrow-right" style={{ fontSize: 10 }} />
                  </span>
                </div>
              ))}
            </div>
            <button
              style={{
                marginTop: 14, width: "100%", padding: "9px", background: "#e5e7eb",
                color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
              }}
              onClick={stopMatching}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "5px 5px" }}>
        <div className="ir-container">

          {/* Header */}
          <div className="ir-header">
            <h1>Food Safety Agency (Pty) Ltd</h1>
            <h2>Clients Approval</h2>
          </div>

          {/* Action Bar */}
          <div className="ir-action-bar">
            <a href="/" className="ir-btn ir-btn-primary"><i className="fas fa-home" /> Home</a>
            <a href="/inspections" className="ir-btn ir-btn-secondary"><i className="fas fa-arrow-left" /> Back to Inspections</a>
            <button type="button" className="ir-btn ir-btn-secondary" onClick={refresh} disabled={loading}>
              <i className="fas fa-sync-alt" /> Refresh
            </button>
            <a href="/clients-approval/report" className="ir-btn ir-btn-primary">
              <i className="fas fa-chart-bar" /> Inspector Report
            </a>
          </div>

          {/* Filter Card */}
          <div className="ir-card">
            <div className="ir-card-header">
              <div className="ir-card-title"><i className="fas fa-filter" /> Filter Pending Clients</div>
            </div>
            <div className="ir-card-body" style={{ overflow: "visible" }}>
              <div style={{ maxWidth: 420 }}>
                <label className="ir-form-label">Search</label>
                <input
                  className="ir-form-control"
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search by client name, town or inspector..."
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="ir-card" style={{ borderColor: "#fecaca" }}>
              <div className="ir-card-body" style={{ color: "#dc2626", fontSize: "0.875rem" }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />{error}
              </div>
            </div>
          )}

          {/* List Card */}
          <div className="ir-card">
            <div className="ir-card-header">
              <div className="ir-card-title">
                <i className="fas fa-user-check" /> Pending Clients
                {total > 0 && (
                  <span className="ir-badge ir-badge-amber" style={{ fontSize: 11, padding: "3px 8px" }}>
                    {total} awaiting approval
                  </span>
                )}
              </div>
            </div>
            <div className="ir-card-body">
              {loading || role === null ? (
                <div style={{ padding: "50px 0", textAlign: "center", color: "#6b7280", fontSize: 14 }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} /> Loading pending clients…
                </div>
              ) : clients.length === 0 && !error ? (
                <div style={{ padding: "40px 16px", textAlign: "center" }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%", background: "#dcfce7",
                    display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                  }}>
                    <i className="fas fa-check" style={{ fontSize: 22, color: "#166534" }} />
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "1rem", color: "#1f2937" }}>
                    {search ? "No pending clients match your search" : "All caught up"}
                  </h3>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
                    {search ? "Try a different search term." : "No clients are waiting for approval. Newly added clients will appear here."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="ir-table-info">
                    Showing {startIdx}–{endIdx} of {total} pending client{total === 1 ? "" : "s"}
                  </div>
                  <table className="ir-table">
                    <thead>
                      <tr>
                        <th>New Client Name</th>
                        <th>Added By</th>
                        <th>Added On</th>
                        <th className="center">Inspections</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map(client => {
                        const busy = busyId === client.id;
                        return (
                          <tr key={client.id} style={{ opacity: busy ? 0.6 : 1 }}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{client.name}</div>
                              <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 1 }}>
                                {client.town || "—"}{client.facility_type ? ` · ${client.facility_type}` : ""}
                              </div>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <i className="fas fa-user-plus" style={{ color: "#007890", marginRight: 6, fontSize: 11 }} />
                              {client.created_by || "unknown"}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>{fmtDate(client.created_at)}</td>
                            <td className="center" style={{ fontWeight: 600 }}>{client.inspection_count}</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <button
                                className="ir-btn ir-btn-green ir-btn-sm"
                                onClick={() => accept(client)}
                                disabled={busy}
                                title="Yes, this is a real new client"
                                style={{ marginRight: 6 }}
                              >
                                <i className="fas fa-check" /> Accept
                              </button>
                              <button
                                className="ir-btn ir-btn-primary ir-btn-sm"
                                onClick={() => startMatching(client)}
                                disabled={busy}
                                title="This client already exists under another name — match it"
                              >
                                <i className="fas fa-random" /> Match to Correct Client
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginTop: 12, flexWrap: "wrap", gap: 8,
                    }}>
                      <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                        Page {page} of {totalPages}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="ir-btn ir-btn-secondary ir-btn-sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page <= 1}
                        >
                          <i className="fas fa-chevron-left" /> Prev
                        </button>
                        <button
                          className="ir-btn ir-btn-secondary ir-btn-sm"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                        >
                          Next <i className="fas fa-chevron-right" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
