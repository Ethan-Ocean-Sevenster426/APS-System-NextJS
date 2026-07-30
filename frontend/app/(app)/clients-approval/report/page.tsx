"use client";

import React, { useCallback, useEffect, useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface InspectorRow {
  inspector_name: string;
  total: number;
  accepted: number;
  merged: number;
  error_pct: number;
}
interface Incident {
  typed_name: string;
  correct_name: string;
  inspector_name: string;
  inspection_count: number;
  captured_at: string | null;
  decided_at: string | null;
  decided_by: string;
}
interface MonthlyRow { month: string; total: number; merged: number; }
interface ReportResponse {
  success: boolean;
  date_from: string;
  date_to: string;
  total_decided: number;
  total_accepted: number;
  total_merged: number;
  inspectors: InspectorRow[];
  incidents: Incident[];
  monthly: MonthlyRow[];
  error?: string;
}

const CAN_APPROVE_ROLES = ["admin", "super_admin", "developer", "inspector_manager"];

const F = {
  card: "#ffffff", cardShadow: "0 2px 12px rgba(0,0,0,0.08)",
  heading: "#111827", muted: "#6b7280", border: "#e5e7eb", hair: "#f3f4f6",
  primary: "#007890", primaryLight: "#e6f7f9",
  red: "#dc2626", red50: "#fef2f2", redLight: "#fee2e2", green: "#15803d",
};

// Status pair for fine vs incorrect (same validated pair as the Late Capture report)
const C_FINE = "#2563eb";
const C_BAD = "#dc2626";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? iso + "T12:00:00" : iso)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function SummaryCard({ icon, label, value, color = F.heading }: {
  icon: string; label: string; value: string | number; color?: string;
}) {
  return (
    <div style={{
      background: F.card, boxShadow: F.cardShadow, border: `1px solid ${F.border}`,
      borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: "50%", background: F.primaryLight, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={icon} style={{ color: color === F.heading ? F.primary : color, fontSize: "1.05rem" }} />
      </div>
      <div>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.7rem", color: F.muted, fontWeight: 600, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

/* Fine vs incorrect, stacked per inspector */
function FineVsIncorrectChart({ inspectors }: { inspectors: InspectorRow[] }) {
  const max = Math.max(...inspectors.map(i => i.total), 1);
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: "0.66rem", color: F.muted, fontWeight: 600 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C_FINE, display: "inline-block" }} /> Fine (real new client)
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C_BAD, display: "inline-block" }} /> Incorrect (duplicate)
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {inspectors.map(i => (
          <div key={i.inspector_name} style={{ display: "flex", alignItems: "center", gap: 8 }}
            title={`${i.inspector_name}: ${i.accepted} fine, ${i.merged} incorrect (of ${i.total})`}>
            <div style={{ width: 105, fontSize: "0.7rem", color: "#374151", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {i.inspector_name}
            </div>
            <div style={{ flex: 1, display: "flex", gap: 2, height: 16 }}>
              <div style={{ width: `${(i.accepted / max) * 100}%`, background: C_FINE, borderRadius: 4, minWidth: i.accepted > 0 ? 3 : 0 }} />
              <div style={{ width: `${(i.merged / max) * 100}%`, background: C_BAD, borderRadius: 4, minWidth: i.merged > 0 ? 3 : 0 }} />
            </div>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: i.merged ? C_BAD : F.muted, width: 74, flexShrink: 0 }}>
              {i.merged} incorrect
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Month-by-month: clients added that were fine vs duplicates */
function ByMonthChart({ monthly }: { monthly: MonthlyRow[] }) {
  const max = Math.max(...monthly.map(m => Math.max(m.total - m.merged, m.merged)), 1);
  const label = (key: string) => new Date(key + "-15").toLocaleDateString("en-GB", { month: "short" });
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 8, fontSize: "0.66rem", color: F.muted, fontWeight: 600 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C_FINE, display: "inline-block" }} /> Fine
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C_BAD, display: "inline-block" }} /> Incorrect
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 118, paddingTop: 4 }}>
        {monthly.map(m => {
          const fine = Math.max(0, m.total - m.merged);
          const pct = m.total ? Math.round((m.merged / m.total) * 100) : 0;
          return (
            <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
              title={`${label(m.month)}: ${m.total} clients added — ${fine} fine, ${m.merged} incorrect (${pct}%)`}>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: m.merged ? C_BAD : F.muted }}>{m.merged ? `${pct}%` : "0%"}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, width: "100%", justifyContent: "center" }}>
                <div style={{ width: "38%", maxWidth: 20, background: C_FINE, borderRadius: "4px 4px 0 0", height: `${(fine / max) * 78}px`, minHeight: fine > 0 ? 3 : 1 }} />
                <div style={{ width: "38%", maxWidth: 20, background: C_BAD, borderRadius: "4px 4px 0 0", height: `${(m.merged / max) * 78}px`, minHeight: m.merged > 0 ? 3 : 1 }} />
              </div>
              <div style={{ fontSize: "0.6rem", color: F.muted }}>{label(m.month)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ClientsApprovalReportPage() {
  const [role, setRole] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(90));
  const [dateTo, setDateTo] = useState(isoDaysAgo(0));
  const [inspector, setInspector] = useState("");
  const [inspectorOptions, setInspectorOptions] = useState<string[]>([]);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) { window.location.href = "/login"; return; }
        setRole(d.role || "inspector");
      })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  const canView = role !== null && CAN_APPROVE_ROLES.includes(role);

  const fetchReport = useCallback((from: string, to: string, insp: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ date_from: from, date_to: to });
    if (insp) params.set("inspector", insp);
    fetch(`/api/clients-approval/report?${params}`, { cache: "no-store" })
      .then(r => r.json())
      .then((d: ReportResponse) => {
        if (!d.success) throw new Error(d.error || "Failed to load report");
        setData(d);
        if (!insp) setInspectorOptions(d.inspectors.map(i => i.inspector_name));
        setExpanded(insp && d.inspectors.length === 1 ? d.inspectors[0].inspector_name : null);
      })
      .catch(e => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (canView) fetchReport(dateFrom, dateTo, inspector);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  if (role !== null && !canView) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
        <i className="fas fa-lock" style={{ fontSize: 28, marginBottom: 12 }} />
        <p>You don&apos;t have permission to view this report.</p>
        <a href="/inspections" style={{ color: "#007890" }}>Back to Inspections</a>
      </div>
    );
  }

  const card: React.CSSProperties = { background: F.card, boxShadow: F.cardShadow, border: `1px solid ${F.border}`, borderRadius: 12, padding: "16px 18px" };
  const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: F.muted, borderBottom: `2px solid ${F.border}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${F.hair}` };
  const input: React.CSSProperties = { padding: "7px 10px", border: `1px solid ${F.border}`, borderRadius: 6, fontSize: "0.8rem", background: "#fff" };
  const label: React.CSSProperties = { display: "block", fontSize: "0.68rem", fontWeight: 600, color: F.muted, marginBottom: 3 };
  const btn: React.CSSProperties = { padding: "7px 16px", background: F.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" };
  const btnGhost: React.CSSProperties = { ...btn, background: "#6b7280" };
  const btnSmall: React.CSSProperties = { padding: "4px 12px", background: F.primaryLight, color: F.primary, border: `1px solid ${F.primary}33`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };

  return (
    <>
      <style>{`
        .car-row:hover { background: #f9fafb; }
        .car-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        .car-charts { display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; margin-bottom: 16px; }
        @media (max-width: 1100px) { .car-charts { grid-template-columns: 1fr; } }
        @media (max-width: 1000px) { .car-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .car-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ padding: 24, width: "100%" }}>
        {/* Header — white on the photo background, same treatment as Late Captures */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            <i className="fas fa-user-tag" style={{ color: "#5ee8ff", marginRight: 8 }} />
            Client Entry Report
          </h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", margin: "4px 0 0", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
            Inspectors who added new clients while capturing — and how many of those were duplicates of existing clients instead of real new ones.
          </p>
          <a href="/clients-approval" style={{ ...btnSmall, marginTop: 10, background: "rgba(255,255,255,0.92)" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: 5, fontSize: 10 }} />
            Back to Clients Approval
          </a>
        </div>

        {/* Filters */}
        <div style={{ ...card, display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <label style={label}>Inspector</label>
            <select style={{ ...input, minWidth: 190 }} value={inspector} onChange={e => setInspector(e.target.value)}>
              <option value="">All inspectors who added clients</option>
              {inspectorOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Date From</label>
            <input type="date" style={input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={label}>Date To</label>
            <input type="date" style={input} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button type="button" style={btn} onClick={() => fetchReport(dateFrom, dateTo, inspector)} disabled={loading}>
            <i className="fas fa-filter" style={{ marginRight: 5 }} />{loading ? "Loading..." : "Apply"}
          </button>
          <button type="button" style={btnGhost} disabled={loading}
            onClick={() => {
              setInspector("");
              const from = isoDaysAgo(90), to = isoDaysAgo(0);
              setDateFrom(from); setDateTo(to);
              fetchReport(from, to, "");
            }}>
            <i className="fas fa-times" style={{ marginRight: 5 }} />Clear All
          </button>
        </div>

        {error && (
          <div style={{ ...card, color: F.red, marginBottom: 16 }}>
            <i className="fas fa-exclamation-circle" /> {error}
          </div>
        )}

        {data && !error && (
          <>
            {/* Summary */}
            <div className="car-grid">
              <SummaryCard icon="fas fa-users" label="Inspectors who added clients" value={data.inspectors.length} />
              <SummaryCard icon="fas fa-user-plus" label="New clients added" value={data.total_decided} />
              <SummaryCard icon="fas fa-check-circle" label="Fine — real new clients" value={data.total_accepted} color={F.green} />
              <SummaryCard icon="fas fa-code-merge" label="Incorrect — merged into existing" value={data.total_merged} color={data.total_merged ? F.red : F.green} />
            </div>

            {/* Visuals */}
            {data.total_decided > 0 && (
              <div className="car-charts">
                <div style={card}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: F.heading, margin: "0 0 12px" }}>
                    Fine vs incorrect — by inspector
                  </h2>
                  <FineVsIncorrectChart inspectors={data.inspectors} />
                </div>
                <div style={card}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: F.heading, margin: "0 0 12px" }}>
                    Clients added by month
                  </h2>
                  <ByMonthChart monthly={data.monthly ?? []} />
                </div>
              </div>
            )}

            {/* Per-inspector table */}
            <div style={{ ...card, overflowX: "auto" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: F.heading, margin: "0 0 4px" }}>
                {inspector ? `Client entries by ${inspector}` : "Inspectors who added new clients"}
              </h2>
              <p style={{ fontSize: 12, color: F.muted, margin: "0 0 12px" }}>
                An <strong>incorrect</strong> entry means the inspector typed a new client name instead of selecting the existing client — the back office had to merge it. Click <strong>Quick view</strong> to see exactly what they typed.
              </p>
              {data.inspectors.length === 0 ? (
                <div style={{ color: F.green, fontSize: 13, padding: "8px 0" }}>
                  <i className="fas fa-check-circle" /> No new clients were added by inspectors in this period.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Inspector</th>
                      <th style={th}>New Clients Added</th>
                      <th style={th}>Fine (Real New)</th>
                      <th style={th}>Incorrect (Merged)</th>
                      <th style={th}>% Incorrect</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inspectors.map(row => (
                      <React.Fragment key={row.inspector_name}>
                        <tr className="car-row">
                          <td style={{ ...td, fontWeight: 700, color: F.primary }}>{row.inspector_name}</td>
                          <td style={td}>{row.total}</td>
                          <td style={td}>
                            <span style={{ color: F.green, fontWeight: 700 }}>{row.accepted}</span>
                          </td>
                          <td style={td}>
                            <span style={{ background: row.merged ? F.redLight : F.hair, color: row.merged ? F.red : F.muted, fontWeight: 700, padding: "2px 10px", borderRadius: 99, fontSize: 12 }}>
                              {row.merged}
                            </span>
                          </td>
                          <td style={{ ...td, minWidth: 130 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 64, height: 8, background: F.hair, borderRadius: 4, overflow: "hidden", display: "inline-block" }}>
                                <span style={{ display: "block", width: `${Math.min(100, row.error_pct)}%`, height: "100%", background: F.red, borderRadius: 4 }} />
                              </span>
                              <span style={{ fontWeight: 700, color: row.merged ? F.red : F.muted, fontSize: 12 }}>{row.error_pct}%</span>
                            </span>
                          </td>
                          <td style={{ ...td, whiteSpace: "nowrap" }}>
                            {row.merged > 0 && (
                              <button type="button" style={btnSmall}
                                onClick={() => setExpanded(expanded === row.inspector_name ? null : row.inspector_name)}>
                                <i className={`fas fa-chevron-${expanded === row.inspector_name ? "up" : "down"}`} style={{ marginRight: 5, fontSize: 10 }} />
                                {expanded === row.inspector_name ? "Hide" : "Quick view"}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expanded === row.inspector_name && (
                          <tr>
                            <td colSpan={6} style={{ padding: 0, borderBottom: `1px solid ${F.hair}` }}>
                              <div style={{ background: F.red50, padding: "12px 16px", borderLeft: `3px solid ${F.red}` }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr>
                                      <th style={th}>They Typed</th>
                                      <th style={th}>Correct Client</th>
                                      <th style={th}>Inspections Moved</th>
                                      <th style={th}>Captured On</th>
                                      <th style={th}>Fixed By</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.incidents.filter(i => i.inspector_name === row.inspector_name).map((i, n) => (
                                      <tr key={n}>
                                        <td style={{ ...td, fontWeight: 700, color: F.red }}>{i.typed_name}</td>
                                        <td style={{ ...td, fontWeight: 600 }}>
                                          <i className="fas fa-arrow-right" style={{ color: F.muted, marginRight: 6, fontSize: 10 }} />
                                          {i.correct_name}
                                        </td>
                                        <td style={td}>{i.inspection_count}</td>
                                        <td style={td}>{fmtDate(i.captured_at)}</td>
                                        <td style={td}>{i.decided_by} · {fmtDate(i.decided_at)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </>
        )}
      </div>
    </>
  );
}
