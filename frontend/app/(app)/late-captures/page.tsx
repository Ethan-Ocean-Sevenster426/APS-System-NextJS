"use client";

import React, { useState, useEffect, useCallback } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface InspectorRow {
  inspector_name: string;
  total_inspections: number;
  late_count: number;
  late_pct: number | null;
  avg_days_late: number;
  max_days_late: number;
}
interface LateEntry {
  group_id: number;
  client_name: string;
  inspector_name: string;
  captured_by: string;
  date_of_inspection: string;
  captured_at: string;
  days_late: number;
}
interface MonthlyRow { month: string; total: number; late: number; }
/* Back-office approval turnaround (from the Clients Approval log) */
interface ReviewerRow {
  reviewer: string;
  total: number;
  late: number;
  late_pct: number;
  avg_days: number;
  max_days: number;
}
interface LateDecision {
  typed_name: string;
  final_name: string;
  outcome: string;
  inspector_name: string;
  captured_at: string;
  decided_at: string;
  days_taken: number;
  decided_by: string;
}
interface PendingRow {
  name: string;
  created_by: string;
  created_at: string | null;
  days_waiting: number;
  overdue: boolean;
}
interface ApprovalReport {
  success: boolean;
  approval_lag_days: number;
  reviewers: ReviewerRow[];
  approval_monthly: MonthlyRow[];
  late_decisions: LateDecision[];
  pending: PendingRow[];
  pending_overdue: number;
}
interface ReportResponse {
  success: boolean;
  lag_days: number;
  date_from: string;
  date_to: string;
  total_in_range: number;
  total_late: number;
  inspectors: InspectorRow[];
  late_entries: LateEntry[];
  monthly: MonthlyRow[];
  error?: string;
}

const F = {
  card: "#ffffff", cardShadow: "0 2px 12px rgba(0,0,0,0.08)",
  heading: "#111827", muted: "#6b7280", border: "#e5e7eb", hair: "#f3f4f6",
  primary: "#007890", primaryLight: "#e6f7f9",
  red: "#dc2626", red50: "#fef2f2", redLight: "#fee2e2", green: "#15803d",
};

function fmtDate(iso: string): string {
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

// Status pair for on-time vs late (validated for contrast + colour-vision safety)
const C_ONTIME = "#2563eb";
const C_LATE = "#dc2626";

/* On-time vs late, stacked per inspector */
function OnTimeVsLateChart({ inspectors }: { inspectors: InspectorRow[] }) {
  const max = Math.max(...inspectors.map(i => i.total_inspections), 1);
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: "0.66rem", color: F.muted, fontWeight: 600 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C_ONTIME, display: "inline-block" }} /> On time
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C_LATE, display: "inline-block" }} /> Late
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {inspectors.map(i => {
          const onTime = Math.max(0, i.total_inspections - i.late_count);
          return (
            <div key={i.inspector_name} style={{ display: "flex", alignItems: "center", gap: 8 }}
              title={`${i.inspector_name}: ${onTime} on time, ${i.late_count} late (of ${i.total_inspections})`}>
              <div style={{ width: 105, fontSize: "0.7rem", color: "#374151", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {i.inspector_name}
              </div>
              <div style={{ flex: 1, display: "flex", gap: 2, height: 16 }}>
                <div style={{ width: `${(onTime / max) * 100}%`, background: C_ONTIME, borderRadius: 4, minWidth: onTime > 0 ? 3 : 0 }} />
                <div style={{ width: `${(i.late_count / max) * 100}%`, background: C_LATE, borderRadius: 4, minWidth: i.late_count > 0 ? 3 : 0 }} />
              </div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C_LATE, width: 56, flexShrink: 0 }}>
                {i.late_count} late
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Month-by-month comparison: captures that were on time vs late */
function LateByMonthChart({ monthly }: { monthly: MonthlyRow[] }) {
  const max = Math.max(...monthly.map(m => Math.max(m.total - m.late, m.late)), 1);
  const label = (key: string) => new Date(key + "-15").toLocaleDateString("en-GB", { month: "short" });
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 8, fontSize: "0.66rem", color: F.muted, fontWeight: 600 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C_ONTIME, display: "inline-block" }} /> On time
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C_LATE, display: "inline-block" }} /> Late
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 118, paddingTop: 4 }}>
        {monthly.map(m => {
          const onTime = Math.max(0, m.total - m.late);
          const pct = m.total ? Math.round((m.late / m.total) * 100) : 0;
          return (
            <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
              title={`${label(m.month)}: ${m.total} captured — ${onTime} on time, ${m.late} late (${pct}% late)`}>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: m.late ? C_LATE : F.muted }}>{m.late ? `${pct}%` : "0%"}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, width: "100%", justifyContent: "center" }}>
                <div style={{ width: "38%", maxWidth: 20, background: C_ONTIME, borderRadius: "4px 4px 0 0", height: `${(onTime / max) * 78}px`, minHeight: onTime > 0 ? 3 : 1 }} />
                <div style={{ width: "38%", maxWidth: 20, background: C_LATE, borderRadius: "4px 4px 0 0", height: `${(m.late / max) * 78}px`, minHeight: m.late > 0 ? 3 : 1 }} />
              </div>
              <div style={{ fontSize: "0.6rem", color: F.muted }}>{label(m.month)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* How late — severity buckets */
function SeverityChart({ entries, lagDays }: { entries: { days_late: number }[]; lagDays: number }) {
  const buckets: { label: string; test: (d: number) => boolean }[] = [
    { label: `${lagDays + 1}–7 days`, test: d => d <= 7 },
    { label: "8–14 days", test: d => d >= 8 && d <= 14 },
    { label: "15–30 days", test: d => d >= 15 && d <= 30 },
    { label: "31+ days", test: d => d >= 31 },
  ];
  const counts = buckets.map(b => entries.filter(e => b.test(e.days_late)).length);
  const max = Math.max(...counts, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {buckets.map((b, i) => (
        <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8 }}
          title={`${b.label}: ${counts[i]} inspection${counts[i] === 1 ? "" : "s"}`}>
          <div style={{ width: 78, fontSize: "0.7rem", color: "#374151", textAlign: "right", flexShrink: 0 }}>{b.label}</div>
          <div style={{ flex: 1, background: F.hair, borderRadius: 4, height: 16, overflow: "hidden" }}>
            <div style={{ width: `${(counts[i] / max) * 100}%`, background: C_LATE, height: "100%", borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#374151", width: 24, textAlign: "right" }}>{counts[i]}</div>
        </div>
      ))}
    </div>
  );
}

export default function LateCapturesPage() {
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(90));
  const [dateTo, setDateTo] = useState(isoDaysAgo(0));
  const [inspector, setInspector] = useState("");
  const [inspectorOptions, setInspectorOptions] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [minDaysLate, setMinDaysLate] = useState("");
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [approval, setApproval] = useState<ApprovalReport | null>(null);
  const [expandedReviewer, setExpandedReviewer] = useState<string | null>(null);

  const fetchReport = useCallback((from: string, to: string, insp: string, client = "", minDays = "") => {
    setLoading(true);
    setError(null);
    // Back-office approval turnaround for the same date range (section hides
    // itself for roles without access to the Clients Approval log)
    fetch(`/api/clients-approval/report?date_from=${from}&date_to=${to}`, { cache: "no-store" })
      .then(r => r.json())
      .then((d: ApprovalReport) => setApproval(d.success ? d : null))
      .catch(() => setApproval(null));
    const params = new URLSearchParams({ date_from: from, date_to: to });
    if (insp) params.set("inspector", insp);
    if (client.trim()) params.set("client_search", client.trim());
    if (minDays) params.set("min_days_late", minDays);
    fetch(`/api/late-capture-report?${params}`, { cache: "no-store" })
      .then(r => r.json())
      .then((d: ReportResponse) => {
        if (!d.success) throw new Error(d.error || "Failed to load report");
        setData(d);
        // Keep the dropdown listing every inspector with late captures (unfiltered loads only)
        if (!insp) setInspectorOptions(d.inspectors.map(i => i.inspector_name));
        // Drilling into one inspector: open their entries right away
        setExpanded(insp && d.inspectors.length === 1 ? d.inspectors[0].inspector_name : null);
      })
      .catch(e => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Deep links: ?inspector=Name (Admin Analytics chart) and
    // ?date_from=&date_to= (Export Sheet late-capture banner)
    const sp = new URLSearchParams(window.location.search);
    const urlInspector = sp.get("inspector") || "";
    const urlFrom = sp.get("date_from") || "";
    const urlTo = sp.get("date_to") || "";
    if (urlInspector) {
      setInspector(urlInspector);
      setInspectorOptions([urlInspector]);
    }
    if (urlFrom) setDateFrom(urlFrom);
    if (urlTo) setDateTo(urlTo);
    fetchReport(urlFrom || dateFrom, urlTo || dateTo, urlInspector);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        .lc-row:hover { background: #f9fafb; }
        .lc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .lc-charts { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        @media (max-width: 1100px) { .lc-charts { grid-template-columns: 1fr; } }
        @media (max-width: 800px) { .lc-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ padding: 24, width: "100%" }}>
        {/* Header — white on the photo background, same treatment as other pages */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            <i className="fas fa-user-clock" style={{ color: "#5ee8ff", marginRight: 8 }} />
            Late Capture &amp; Approval Report
          </h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", margin: "4px 0 0", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
            Inspectors who captured inspections late — inspections must be captured within {data?.lag_days ?? 2} days of the inspection date.
          </p>
        </div>

        {/* Filters */}
        <div style={{ ...card, display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <label style={label}>Inspector</label>
            <select style={{ ...input, minWidth: 190 }} value={inspector} onChange={e => setInspector(e.target.value)}>
              <option value="">All inspectors with late captures</option>
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
          <div>
            <label style={label}>Client</label>
            <input type="text" style={{ ...input, minWidth: 170 }} placeholder="Search client..."
              value={clientSearch} onChange={e => setClientSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") fetchReport(dateFrom, dateTo, inspector, clientSearch, minDaysLate); }} />
          </div>
          <div>
            <label style={label}>Late by at least (days)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="number" min={3} style={{ ...input, width: 90 }} placeholder="any"
                value={minDaysLate} onChange={e => setMinDaysLate(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") fetchReport(dateFrom, dateTo, inspector, clientSearch, minDaysLate); }} />
              {["8", "15", "31"].map(d => (
                <button key={d} type="button"
                  onClick={() => { setMinDaysLate(d); fetchReport(dateFrom, dateTo, inspector, clientSearch, d); }}
                  style={{
                    padding: "5px 9px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
                    border: `1px solid ${minDaysLate === d ? F.red : F.border}`,
                    background: minDaysLate === d ? F.redLight : "#fff",
                    color: minDaysLate === d ? F.red : F.muted,
                  }}>
                  {d}+
                </button>
              ))}
            </div>
          </div>
          <button type="button" style={btn} onClick={() => fetchReport(dateFrom, dateTo, inspector, clientSearch, minDaysLate)} disabled={loading}>
            <i className="fas fa-filter" style={{ marginRight: 5 }} />{loading ? "Loading..." : "Apply"}
          </button>
          <button type="button" style={btnGhost} disabled={loading}
            onClick={() => {
              setInspector(""); setClientSearch(""); setMinDaysLate("");
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
            <div className="lc-grid">
              <SummaryCard icon="fas fa-clipboard-list" label="Inspections in range" value={data.total_in_range} />
              <SummaryCard icon="fas fa-user-clock" label={`Captured late (> ${data.lag_days} days)`} value={data.total_late} color={data.total_late ? F.red : F.green} />
              <SummaryCard icon="fas fa-users" label="Inspectors with late captures" value={data.inspectors.length} color={data.inspectors.length ? F.red : F.green} />
            </div>

            {/* Visuals */}
            {data.late_entries.length > 0 && (
              <div className="lc-charts">
                <div style={card}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: F.heading, margin: "0 0 12px" }}>
                    On time vs late — by inspector
                  </h2>
                  <OnTimeVsLateChart inspectors={data.inspectors} />
                </div>
                <div style={card}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: F.heading, margin: "0 0 12px" }}>
                    Late captures by month
                  </h2>
                  <LateByMonthChart monthly={data.monthly ?? []} />
                </div>
                <div style={card}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: F.heading, margin: "0 0 12px" }}>
                    How late — severity
                  </h2>
                  <SeverityChart entries={data.late_entries} lagDays={data.lag_days} />
                </div>
              </div>
            )}

            {/* Per-inspector table */}
            <div style={{ ...card, overflowX: "auto" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: F.heading, margin: "0 0 4px" }}>
                {inspector ? `Late captures by ${inspector}` : "Inspectors who captured inspections late"}
              </h2>
              <p style={{ fontSize: 12, color: F.muted, margin: "0 0 12px" }}>
                Click <strong>View late inspections</strong> to see exactly which inspections were captured late, by whom, and open them.
              </p>
              {data.inspectors.length === 0 ? (
                <div style={{ color: F.green, fontSize: 13, padding: "8px 0" }}>
                  <i className="fas fa-check-circle" /> No late captures in this period.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Inspector</th>
                      <th style={th}>Total Inspections</th>
                      <th style={th}>Late Captures</th>
                      <th style={th}>% Late</th>
                      <th style={th}>Avg Days Late</th>
                      <th style={th}>Worst</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inspectors.map(row => (
                      <React.Fragment key={row.inspector_name}>
                        <tr className="lc-row">
                          <td style={{ ...td, fontWeight: 700, color: F.primary }}>{row.inspector_name}</td>
                          <td style={td}>{row.total_inspections}</td>
                          <td style={td}>
                            <span style={{ background: F.redLight, color: F.red, fontWeight: 700, padding: "2px 10px", borderRadius: 99, fontSize: 12 }}>
                              {row.late_count}
                            </span>
                          </td>
                          <td style={{ ...td, minWidth: 130 }}>
                            {row.late_pct != null ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 64, height: 8, background: F.hair, borderRadius: 4, overflow: "hidden", display: "inline-block" }}>
                                  <span style={{ display: "block", width: `${Math.min(100, row.late_pct)}%`, height: "100%", background: F.red, borderRadius: 4 }} />
                                </span>
                                <span style={{ fontWeight: 700, color: F.red, fontSize: 12 }}>{row.late_pct}%</span>
                              </span>
                            ) : "—"}
                          </td>
                          <td style={td}>{row.avg_days_late} days</td>
                          <td style={{ ...td, fontWeight: 600 }}>{row.max_days_late} days</td>
                          <td style={{ ...td, whiteSpace: "nowrap" }}>
                            <button type="button" style={btnSmall}
                              onClick={() => setExpanded(expanded === row.inspector_name ? null : row.inspector_name)}>
                              <i className={`fas fa-chevron-${expanded === row.inspector_name ? "up" : "down"}`} style={{ marginRight: 5, fontSize: 10 }} />
                              {expanded === row.inspector_name ? "Hide" : "Quick view"}
                            </button>{" "}
                            <a style={btnSmall} href={`/inspections?inspector=${encodeURIComponent(row.inspector_name)}&late_capture=LATE`}
                              title={`Open Inspection Records filtered to all of ${row.inspector_name}'s late inspections`}>
                              <i className="fas fa-external-link-alt" style={{ marginRight: 5, fontSize: 10 }} />
                              View their late inspections
                            </a>
                          </td>
                        </tr>
                        {expanded === row.inspector_name && (
                          <tr>
                            <td colSpan={7} style={{ padding: 0, borderBottom: `1px solid ${F.hair}` }}>
                              <div style={{ background: F.red50, padding: "12px 16px", borderLeft: `3px solid ${F.red}` }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr>
                                      <th style={th}>Client</th>
                                      <th style={th}>Inspection Date</th>
                                      <th style={th}>Captured</th>
                                      <th style={th}>Days Late</th>
                                      <th style={th}>Captured By</th>
                                      <th style={th}></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.late_entries.filter(e => e.inspector_name === row.inspector_name).map(e => (
                                      <tr key={e.group_id}>
                                        <td style={{ ...td, fontWeight: 600 }}>{e.client_name || "—"}</td>
                                        <td style={td}>{fmtDate(e.date_of_inspection)}</td>
                                        <td style={td}>{fmtDate(e.captured_at)}</td>
                                        <td style={{ ...td, color: F.red, fontWeight: 700 }}>+{e.days_late} days</td>
                                        <td style={{ ...td, fontWeight: 600 }}>
                                          {e.captured_by
                                            ? e.captured_by
                                            : <span title="Recorded before capture-user tracking — assumed to be the inspector" style={{ color: F.muted, fontWeight: 400 }}>{e.inspector_name} (assumed)</span>}
                                        </td>
                                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                                          <a style={btnSmall} href={`/inspections?inspector=${encodeURIComponent(e.inspector_name)}&late_capture=LATE`}
                                            title={`Open Inspection Records filtered to all of ${e.inspector_name}'s late inspections`}>
                                            <i className="fas fa-external-link-alt" style={{ marginRight: 5, fontSize: 10 }} />
                                            View inspector&apos;s late inspections
                                          </a>
                                        </td>
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

            {/* ── Late approvals — back office ─────────────────────────────── */}
            {approval && (
              <>
                <div style={{ margin: "22px 0 12px", textAlign: "center" }}>
                  <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                    <i className="fas fa-stopwatch" style={{ color: "#5ee8ff", marginRight: 8 }} />
                    Late Approvals — Back Office
                  </h1>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", margin: "4px 0 0", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
                    New clients added by inspectors must be approved or matched within {approval.approval_lag_days} days — longer than that is late.
                  </p>
                </div>

                <div className="lc-grid">
                  <SummaryCard icon="fas fa-hourglass-half" label="Pending right now" value={approval.pending.length} />
                  <SummaryCard icon="fas fa-exclamation-triangle" label={`Overdue now (> ${approval.approval_lag_days} days waiting)`} value={approval.pending_overdue} color={approval.pending_overdue ? F.red : F.green} />
                  <SummaryCard icon="fas fa-stopwatch" label={`Approved late in range (> ${approval.approval_lag_days} days)`} value={approval.late_decisions.length} color={approval.late_decisions.length ? F.red : F.green} />
                </div>

                {/* Visuals — same three charts as the capture section */}
                {approval.reviewers.length > 0 && (
                  <div className="lc-charts">
                    <div style={card}>
                      <h2 style={{ fontSize: 13, fontWeight: 700, color: F.heading, margin: "0 0 12px" }}>
                        On time vs late — by back-office user
                      </h2>
                      <OnTimeVsLateChart inspectors={approval.reviewers.map(r => ({
                        inspector_name: r.reviewer,
                        total_inspections: r.total,
                        late_count: r.late,
                        late_pct: r.late_pct,
                        avg_days_late: r.avg_days,
                        max_days_late: r.max_days,
                      }))} />
                    </div>
                    <div style={card}>
                      <h2 style={{ fontSize: 13, fontWeight: 700, color: F.heading, margin: "0 0 12px" }}>
                        Late approvals by month
                      </h2>
                      <LateByMonthChart monthly={approval.approval_monthly ?? []} />
                    </div>
                    <div style={card}>
                      <h2 style={{ fontSize: 13, fontWeight: 700, color: F.heading, margin: "0 0 12px" }}>
                        How late — severity
                      </h2>
                      <SeverityChart entries={approval.late_decisions.map(d => ({ days_late: d.days_taken }))} lagDays={approval.approval_lag_days} />
                    </div>
                  </div>
                )}

                {approval.pending.length > 0 && (
                  <div style={{ ...card, overflowX: "auto", marginBottom: 16 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: F.heading, margin: "0 0 4px" }}>
                      Waiting for approval right now
                    </h2>
                    <p style={{ fontSize: 12, color: F.muted, margin: "0 0 12px" }}>
                      Rows in red have been waiting longer than {approval.approval_lag_days} days.{" "}
                      <a href="/clients-approval" style={{ color: F.primary, fontWeight: 600 }}>Go approve them</a>.
                    </p>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={th}>Client</th>
                          <th style={th}>Added By</th>
                          <th style={th}>Added On</th>
                          <th style={th}>Days Waiting</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approval.pending.map((p, n) => (
                          <tr key={n} className="lc-row" style={p.overdue ? { background: F.red50 } : undefined}>
                            <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
                            <td style={td}>{p.created_by || "—"}</td>
                            <td style={td}>{p.created_at ? fmtDate(p.created_at) : "—"}</td>
                            <td style={td}>
                              <span style={{ background: p.overdue ? F.redLight : F.hair, color: p.overdue ? F.red : F.muted, fontWeight: 700, padding: "2px 10px", borderRadius: 99, fontSize: 12 }}>
                                {p.days_waiting} day{p.days_waiting === 1 ? "" : "s"}{p.overdue ? " — LATE" : ""}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ ...card, overflowX: "auto" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: F.heading, margin: "0 0 4px" }}>
                    Approval turnaround by back-office user
                  </h2>
                  <p style={{ fontSize: 12, color: F.muted, margin: "0 0 12px" }}>
                    How long each back-office user took to decide the new clients they handled in this period. Click <strong>Quick view</strong> to see their late decisions.
                  </p>
                  {approval.reviewers.length === 0 ? (
                    <div style={{ color: F.muted, fontSize: 13, padding: "8px 0" }}>
                      No approval decisions in this period.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={th}>Back-Office User</th>
                          <th style={th}>Decisions</th>
                          <th style={th}>Late (&gt; {approval.approval_lag_days} days)</th>
                          <th style={th}>% Late</th>
                          <th style={th}>Avg Days to Decide</th>
                          <th style={th}>Worst</th>
                          <th style={th}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {approval.reviewers.map(row => (
                          <React.Fragment key={row.reviewer}>
                            <tr className="lc-row">
                              <td style={{ ...td, fontWeight: 700, color: F.primary }}>{row.reviewer}</td>
                              <td style={td}>{row.total}</td>
                              <td style={td}>
                                <span style={{ background: row.late ? F.redLight : F.hair, color: row.late ? F.red : F.muted, fontWeight: 700, padding: "2px 10px", borderRadius: 99, fontSize: 12 }}>
                                  {row.late}
                                </span>
                              </td>
                              <td style={{ ...td, minWidth: 130 }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ width: 64, height: 8, background: F.hair, borderRadius: 4, overflow: "hidden", display: "inline-block" }}>
                                    <span style={{ display: "block", width: `${Math.min(100, row.late_pct)}%`, height: "100%", background: F.red, borderRadius: 4 }} />
                                  </span>
                                  <span style={{ fontWeight: 700, color: row.late ? F.red : F.muted, fontSize: 12 }}>{row.late_pct}%</span>
                                </span>
                              </td>
                              <td style={td}>{row.avg_days} days</td>
                              <td style={{ ...td, fontWeight: 600 }}>{row.max_days} days</td>
                              <td style={{ ...td, whiteSpace: "nowrap" }}>
                                {row.late > 0 && (
                                  <button type="button" style={btnSmall}
                                    onClick={() => setExpandedReviewer(expandedReviewer === row.reviewer ? null : row.reviewer)}>
                                    <i className={`fas fa-chevron-${expandedReviewer === row.reviewer ? "up" : "down"}`} style={{ marginRight: 5, fontSize: 10 }} />
                                    {expandedReviewer === row.reviewer ? "Hide" : "Quick view"}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {expandedReviewer === row.reviewer && (
                              <tr>
                                <td colSpan={7} style={{ padding: 0, borderBottom: `1px solid ${F.hair}` }}>
                                  <div style={{ background: F.red50, padding: "12px 16px", borderLeft: `3px solid ${F.red}` }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                      <thead>
                                        <tr>
                                          <th style={th}>Client</th>
                                          <th style={th}>Added By</th>
                                          <th style={th}>Added On</th>
                                          <th style={th}>Decided On</th>
                                          <th style={th}>Days Taken</th>
                                          <th style={th}>Outcome</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {approval.late_decisions.filter(d => d.decided_by === row.reviewer).map((d, n) => (
                                          <tr key={n}>
                                            <td style={{ ...td, fontWeight: 600 }}>{d.typed_name}</td>
                                            <td style={td}>{d.inspector_name}</td>
                                            <td style={td}>{fmtDate(d.captured_at)}</td>
                                            <td style={td}>{fmtDate(d.decided_at)}</td>
                                            <td style={{ ...td, color: F.red, fontWeight: 700 }}>+{d.days_taken} days</td>
                                            <td style={td}>{d.outcome === "merged" ? "Matched to existing" : "Accepted as new"}</td>
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

          </>
        )}
      </div>
    </>
  );
}
