"use client";

import React, { useCallback, useEffect, useState } from "react";
import { buildWeeklyReportPdf, fmtDate, fmtWeekLabel, type ReportResponse } from "@/lib/weeklyReportPdf";

const VIEW_ROLES = ["super_admin", "developer", "admin", "inspector_manager", "inspector"];

type TabKey = "overview" | "performance" | "samples" | "approvals" | "compliance" | "travel";
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "fas fa-th-large" },
  { key: "performance", label: "Inspection Performance", icon: "fas fa-trophy" },
  { key: "samples", label: "Samples", icon: "fas fa-vial" },
  { key: "approvals", label: "Approvals & Capturing", icon: "fas fa-clipboard-check" },
  { key: "compliance", label: "Compliance", icon: "fas fa-shield-alt" },
  { key: "travel", label: "Travel", icon: "fas fa-route" },
];

const F = {
  card: "#ffffff", cardShadow: "0 2px 12px rgba(0,0,0,0.08)",
  heading: "#111827", muted: "#6b7280", border: "#e5e7eb", hair: "#f3f4f6",
  primary: "#007890", primaryLight: "#e6f7f9",
  red: "#dc2626", red50: "#fef2f2", redLight: "#fee2e2",
  green: "#15803d", greenLight: "#dcfce7", amber: "#d97706", blue: "#2563eb",
};

/* ── Building blocks ─────────────────────────────────────────────────────── */
function SummaryCard({ icon, label, value, sub, color = F.heading }: {
  icon: string; label: string; value: string | number; sub?: React.ReactNode; color?: string;
}) {
  return (
    <div style={{ background: F.card, boxShadow: F.cardShadow, border: `1px solid ${F.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: F.primaryLight, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className={icon} style={{ color: color === F.heading ? F.primary : color, fontSize: "1rem" }} />
      </div>
      <div>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.68rem", color: F.muted, fontWeight: 600, marginTop: 3 }}>{label}{sub}</div>
      </div>
    </div>
  );
}

function Movement({ change, suffix = "", nullLabel = "new" }: { change: number | null; suffix?: string; nullLabel?: string }) {
  if (change === null || change === undefined) return <span style={{ color: F.muted }}>{nullLabel}</span>;
  if (change === 0) return <span style={{ color: F.muted }}>—</span>;
  const up = change > 0;
  return (
    <span style={{ color: up ? F.green : F.red, fontWeight: 700 }}>
      <i className={`fas fa-arrow-${up ? "up" : "down"}`} style={{ fontSize: 10, marginRight: 3 }} />
      {Math.abs(change)}{suffix}
    </span>
  );
}

/* Horizontal ranking bars */
function HBars({ rows, color = F.primary, unit = "" }: {
  rows: { label: string; value: number }[]; color?: string; unit?: string;
}) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }} title={`${r.label}: ${r.value}${unit}`}>
          <div style={{ width: 140, fontSize: "0.75rem", color: "#374151", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
          <div style={{ flex: 1, background: F.hair, borderRadius: 4, height: 17, overflow: "hidden" }}>
            <div style={{ width: `${(r.value / max) * 100}%`, background: color, height: "100%", borderRadius: 4, minWidth: r.value > 0 ? 3 : 0 }} />
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", width: 58, flexShrink: 0 }}>{r.value}{unit}</div>
        </div>
      ))}
    </div>
  );
}

/* Stacked two-part bars */
function StackedBars({ rows, aLabel, bLabel, aColor = F.blue, bColor = F.red }: {
  rows: { label: string; a: number; b: number }[]; aLabel: string; bLabel: string; aColor?: string; bColor?: string;
}) {
  const max = Math.max(...rows.map(r => r.a + r.b), 1);
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 8, fontSize: "0.7rem", color: F.muted, fontWeight: 600 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: aColor, display: "inline-block" }} /> {aLabel}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: bColor, display: "inline-block" }} /> {bLabel}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }} title={`${r.label}: ${r.a} ${aLabel.toLowerCase()}, ${r.b} ${bLabel.toLowerCase()}`}>
            <div style={{ width: 140, fontSize: "0.75rem", color: "#374151", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
            <div style={{ flex: 1, display: "flex", gap: 2, height: 17 }}>
              <div style={{ width: `${(r.a / max) * 100}%`, background: aColor, borderRadius: 4, minWidth: r.a > 0 ? 3 : 0 }} />
              <div style={{ width: `${(r.b / max) * 100}%`, background: bColor, borderRadius: 4, minWidth: r.b > 0 ? 3 : 0 }} />
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#374151", width: 58, flexShrink: 0 }}>{r.a}/{r.a + r.b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* SVG trend line; height configurable so the Overview can show it large */
function TrendLine({ points, unit = "", color = F.primary, height = 120 }: {
  points: { label: string; value: number | null }[]; unit?: string; color?: string; height?: number;
}) {
  const vals = points.map(p => p.value).filter((v): v is number => v !== null);
  if (!vals.length) return <div style={{ color: F.muted, fontSize: 12 }}>No data for this period.</div>;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const W = 100, H = 40, PAD = 4;
  const xy = points.map((p, i) => ({
    x: PAD + (i * (W - 2 * PAD)) / Math.max(points.length - 1, 1),
    y: p.value === null ? null : H - PAD - ((p.value - min) / span) * (H - 2 * PAD),
    ...p,
  }));
  const path = xy.filter(p => p.y !== null).map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} preserveAspectRatio="none">
        <path d={path} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: F.muted, marginTop: 4 }}>
        {xy.map((p, i) => <span key={i} style={{ textAlign: "center" }}>{fmtWeekLabel(p.label)}<br /><b style={{ color: "#374151", fontSize: "0.78rem" }}>{p.value === null ? "—" : `${p.value}${unit}`}</b></span>)}
      </div>
    </div>
  );
}

/* Doughnut via conic-gradient */
function Doughnut({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total === 0) return <div style={{ color: F.muted, fontSize: 12 }}>No samples in this period.</div>;
  let acc = 0;
  const stops = parts.map(p => {
    const from = (acc / total) * 360; acc += p.value;
    const to = (acc / total) * 360;
    return `${p.color} ${from}deg ${to}deg`;
  }).join(", ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
      <div style={{ width: 150, height: 150, borderRadius: "50%", background: `conic-gradient(${stops})`, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <span style={{ fontWeight: 800, fontSize: "1.3rem" }}>{total}</span>
          <span style={{ fontSize: "0.6rem", color: F.muted }}>samples</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.8rem" }}>
        {parts.map(p => (
          <span key={p.label} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 11, height: 11, borderRadius: 2, background: p.color, display: "inline-block" }} />
            {p.label}: <b>{p.value}</b> ({Math.round((p.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

function RankingNote({ basis }: { basis: string }) {
  return (
    <p style={{ fontSize: 12, color: F.muted, margin: "0 0 12px" }}>
      <i className="fas fa-sort-amount-down" style={{ marginRight: 5 }} />
      Ranked highest to lowest by <strong>{basis}</strong>.
    </p>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function WeeklyReportPage() {
  const [role, setRole] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState<TabKey>("overview");
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) { window.location.href = "/login"; return; }
        setRole(d.role || "inspector");
      })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  const canView = role !== null && VIEW_ROLES.includes(role);

  const fetchReport = useCallback((from: string, to: string) => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams();
    if (from) p.set("date_from", from);
    if (to) p.set("date_to", to);
    fetch(`/api/weekly-report${p.toString() ? `?${p}` : ""}`, { cache: "no-store" })
      .then(r => r.json())
      .then((d: ReportResponse) => {
        if (!d.success) throw new Error(d.error || "Failed to load report");
        setData(d);
        setDateFrom(d.week_start);
        setDateTo(d.week_end);
      })
      .catch(e => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (canView) fetchReport("", ""); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [canView]);

  /* ── PDF export — clean A4 portrait, suitable for email and WhatsApp ────── */
  const exportPdf = useCallback(async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      let logo: string | null = null;
      try {
        const res = await fetch("/logo.png");
        if (res.ok) {
          const blob = await res.blob();
          logo = await new Promise<string>(resolve => {
            const rd = new FileReader();
            rd.onloadend = () => resolve(rd.result as string);
            rd.readAsDataURL(blob);
          });
        }
      } catch { /* no logo */ }
      const doc = await buildWeeklyReportPdf(data, logo);
      doc.save(`Weekly-Report_${data.week_start}_to_${data.week_end}.pdf`);
    } catch (e) {
      setError(`PDF export failed: ${String(e)}`);
    } finally {
      setPdfLoading(false);
    }
  }, [data]);

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
  const th: React.CSSProperties = { textAlign: "left", padding: "9px 11px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: F.muted, borderBottom: `2px solid ${F.border}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "9px 11px", fontSize: 13, borderBottom: `1px solid ${F.hair}` };
  const btn: React.CSSProperties = { padding: "7px 14px", background: F.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" };
  const rankTd: React.CSSProperties = { ...td, fontWeight: 800, color: F.primary, width: 44 };
  const h2: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: F.heading, margin: "0 0 10px" };

  const t = data?.totals;
  const weekWord = data?.is_single_week ? "week" : "period";
  const weekDelta = t ? t.inspections - t.prev_inspections : 0;
  const compDelta = t && t.overall_compliance !== null && t.prev_overall_compliance !== null
    ? t.overall_compliance - t.prev_overall_compliance : null;

  return (
    <>
      <style>{`
        .wr-row:hover { background: #f9fafb; }
        .wr-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 14px; }
        @media (max-width: 1000px) { .wr-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .wr-grid { grid-template-columns: 1fr; } }
        /* Winners and watch-outs share one grid so a lone watch-out card is the
           same width as a winner card instead of stretching across the row.
           Three per row also matches how the PDF lays these out. */
        .wr-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        @media (max-width: 700px) { .wr-cards { grid-template-columns: 1fr; } }
        .wr-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 1rem; }
        .wr-tab { display: inline-flex; align-items: center; gap: 10px; padding: 7px 12px; border: none; border-left: 3px solid transparent; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; background: #ffffff; color: #64748b; box-shadow: 0 1px 3px rgba(0,0,0,0.08); min-height: 36px; transition: all 0.2s; }
        .wr-tab.active { background: #007890; color: #fff; font-weight: 600; border-left: 3px solid #fff; }
      `}</style>
      <div style={{ padding: 24, width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 14, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            <i className="fas fa-chart-line" style={{ color: "#5ee8ff", marginRight: 8 }} />
            Weekly Inspectorate Performance Report
          </h1>
          {data && (
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.92)", margin: "4px 0 0", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
              Reporting period: <strong>{data.is_single_week ? `Monday ${fmtDate(data.week_start)} — Sunday ${fmtDate(data.week_end)}` : `${fmtDate(data.week_start)} — ${fmtDate(data.week_end)}`}</strong> · {data.quarter} · This report contains no financial information.
            </p>
          )}
        </div>

        {/* Topic navigation — top, like Inspector Analytics */}
        <div className="wr-tabs">
          {TABS.map(tb => (
            <button key={tb.key} type="button" className={`wr-tab${tab === tb.key ? " active" : ""}`} onClick={() => setTab(tb.key)}>
              <i className={tb.icon} style={{ width: 18, textAlign: "center", fontSize: "0.85rem" }} />{tb.label}
            </button>
          ))}
        </div>

        {/* Filter — underneath the navigation */}
        <div style={{ ...card, display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap", padding: "12px 18px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: F.muted, marginBottom: 3 }}>Date From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: "7px 10px", border: `1px solid ${F.border}`, borderRadius: 6, fontSize: "0.8rem" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: F.muted, marginBottom: 3 }}>Date To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: "7px 10px", border: `1px solid ${F.border}`, borderRadius: 6, fontSize: "0.8rem" }} />
          </div>
          <button type="button" style={btn} disabled={loading} onClick={() => fetchReport(dateFrom, dateTo)}>
            <i className="fas fa-filter" style={{ marginRight: 5 }} />{loading ? "Loading..." : "Apply"}
          </button>
          <button type="button" style={{ ...btn, background: "#6b7280" }} disabled={loading} onClick={() => fetchReport("", "")}>
            <i className="fas fa-calendar-week" style={{ marginRight: 5 }} />Latest completed week
          </button>
          <button type="button" style={{ ...btn, background: "#15803d", marginLeft: "auto" }} disabled={loading || pdfLoading || !data} onClick={exportPdf}>
            <i className="fas fa-file-pdf" style={{ marginRight: 5 }} />{pdfLoading ? "Building PDF..." : "Export PDF"}
          </button>
        </div>

        {error && <div style={{ ...card, color: F.red, marginBottom: 16 }}><i className="fas fa-exclamation-circle" /> {error}</div>}

        {data && !error && t && (
          <>
            {/* ══ OVERVIEW ══ */}
            {tab === "overview" && (
              <>
                {(() => {
                  const winners: { label: string; name: string; value: string }[] = [];
                  const topPerf = data.performance[0];
                  if (topPerf && topPerf.weekly_inspections > 0) winners.push({ label: "Most Inspections", name: topPerf.inspector_name, value: `${topPerf.weekly_inspections} inspections` });
                  const topAppr = [...data.approvals].sort((a, b) => b.approved - a.approved)[0];
                  if (topAppr && topAppr.approved > 0) winners.push({ label: "Most Approved", name: topAppr.inspector_name, value: `${topAppr.approved} approved` });
                  const topComp = [...data.compliance].filter(c => c.compliant + c.non_compliant > 0).sort((a, b) => b.rate - a.rate || (b.inspections ?? 0) - (a.inspections ?? 0))[0];
                  if (topComp) winners.push({ label: "Best Compliance", name: topComp.inspector_name, value: `${topComp.rate}% of ${topComp.inspections} inspections` });
                  if (winners.length === 0) return null;
                  return (
                    <div style={{ ...card, marginBottom: 14 }}>
                      <h2 style={h2}><i className="fas fa-trophy" style={{ color: F.amber, marginRight: 6 }} />This {weekWord}&apos;s winners</h2>
                      <div className="wr-cards">
                        {winners.slice(0, 6).map(w0 => (
                          <div key={w0.label} style={{ background: "#fffbeb", borderTop: `3px solid ${F.amber}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: F.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>{w0.label}</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: "4px 0 2px" }}>{w0.name}</div>
                            <div style={{ fontSize: 12, color: F.muted }}>{w0.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ══ WATCH-OUTS — the mirror of the winners block. Same shape and
                     sizing, red instead of amber, so the bad news reads as
                     deliberately separate from the good news rather than hiding
                     among it. Categories with nothing to report are skipped. ══ */}
                {(() => {
                  const watchOuts: { label: string; name: string; value: string }[] = [];
                  const worstPending = [...data.approvals]
                    .sort((a, b) => b.pending - a.pending || b.total_records - a.total_records)[0];
                  if (worstPending && worstPending.pending > 0) watchOuts.push({
                    label: "Most Not Approved",
                    name: worstPending.inspector_name,
                    value: `${worstPending.pending} of ${worstPending.total_records} not approved`,
                  });
                  if (watchOuts.length === 0) return null;
                  return (
                    <div style={{ ...card, marginBottom: 14 }}>
                      <h2 style={h2}><i className="fas fa-exclamation-triangle" style={{ color: F.red, marginRight: 6 }} />This {weekWord}&apos;s watch-outs</h2>
                      <div className="wr-cards">
                        {watchOuts.slice(0, 6).map(w0 => (
                          <div key={w0.label} style={{ background: F.red50, borderTop: `3px solid ${F.red}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: F.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>{w0.label}</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: "4px 0 2px" }}>{w0.name}</div>
                            <div style={{ fontSize: 12, color: F.muted }}>{w0.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="wr-grid">
                  <SummaryCard icon="fas fa-clipboard-list" label={`Inspections this ${weekWord}`} value={t.inspections}
                    sub={<> · <Movement change={weekDelta} /> vs previous</>} />
                  <SummaryCard icon="fas fa-users" label="Active inspectors" value={t.active_inspectors} />
                  <SummaryCard icon="fas fa-vial" label="Samples taken" value={t.samples} />
                  <SummaryCard icon="fas fa-shield-alt" label="Overall compliance"
                    value={t.overall_compliance === null ? "—" : `${t.overall_compliance}%`}
                    color={t.overall_compliance === null ? F.muted : t.overall_compliance >= 70 ? F.green : F.amber}
                    sub={compDelta !== null ? <> · <Movement change={compDelta} suffix="pt" /> vs previous</> : undefined} />
                  <SummaryCard icon="fas fa-route" label="Kilometres travelled" value={t.total_km.toLocaleString("en-ZA")} />
                </div>

                {/* The race — competition leaderboard, same as the emailed reports */}
                <div style={{ ...card, marginBottom: 14, overflowX: "auto" }}>
                  <h2 style={h2}><i className="fas fa-flag-checkered" style={{ color: F.primary, marginRight: 6 }} />The race — who did the most inspections this {weekWord}</h2>
                  <p style={{ fontSize: 12, color: F.muted, margin: "0 0 10px" }}>
                    Position 1 went to the inspector who completed the most inspections this {weekWord}.
                    The last column shows how many <b style={{ color: F.green }}>more</b> or <b style={{ color: F.red }}>fewer</b> inspections each person did compared with last {weekWord}.
                  </p>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <th style={th} title="1 = the most inspections this period">Position</th><th style={th}>Inspector</th>
                      <th style={th}>Inspections This {data.is_single_week ? "Week" : "Period"}</th>
                      <th style={th}>Inspections Last {data.is_single_week ? "Week" : "Period"}</th>
                      <th style={th} title="How many more or fewer inspections than the previous period">More or Fewer Than Last {data.is_single_week ? "Week" : "Period"}</th>
                    </tr></thead>
                    <tbody>
                      {data.performance.map(p => (
                        <tr key={p.inspector_name} className="wr-row" style={p.rank === 1 ? { background: "#fefce8" } : undefined}>
                          <td style={rankTd}>
                            {p.rank === 1 && <i className="fas fa-trophy" style={{ color: F.amber, marginRight: 6 }} />}#{p.rank}
                          </td>
                          <td style={{ ...td, fontWeight: p.rank === 1 ? 800 : 700 }}>{p.inspector_name}</td>
                          <td style={{ ...td, fontWeight: 700 }}>{p.weekly_inspections}</td>
                          <td style={td}>{p.prev_inspections ?? 0}</td>
                          <td style={td}><Movement change={p.weekly_inspections - (p.prev_inspections ?? 0)} nullLabel="—" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ ...card, marginBottom: 14 }}>
                  <h2 style={h2}><i className="fas fa-chart-line" style={{ color: F.primary, marginRight: 6 }} />Inspectorate trend — inspections per week (last 8 weeks)</h2>
                  <TrendLine height={260} points={data.inspection_trend.map(p => ({ label: p.week, value: p.inspections ?? 0 }))} />
                </div>

                <div style={{ ...card, marginBottom: 14 }}>
                  <h2 style={h2}><i className="fas fa-shield-alt" style={{ color: F.green, marginRight: 6 }} />Inspectorate trend — compliance rate per week (last 8 weeks)</h2>
                  <TrendLine height={260} unit="%" color={F.green} points={data.compliance_trend.map(p => ({ label: p.week, value: p.rate ?? null }))} />
                </div>

                <div style={{ ...card }}>
                  <h2 style={h2}><i className="fas fa-trophy" style={{ color: F.amber, marginRight: 6 }} />Inspections this {weekWord} — normal inspections vs occurrence reports</h2>
                  <p style={{ fontSize: 12, color: F.muted, margin: "0 0 10px" }}>
                    Each bar is the inspector&apos;s total inspections. The orange part shows how many of those were occurrence reports. The number reads: normal / total.
                  </p>
                  <StackedBars
                    aLabel="Normal inspections" bLabel="Occurrence reports"
                    aColor={F.primary} bColor={F.amber}
                    rows={data.performance.map(p => {
                      const occ = data.occurrences.find(o => o.inspector_name === p.inspector_name)?.count ?? 0;
                      return { label: p.inspector_name, a: p.weekly_inspections - occ, b: occ };
                    })} />
                </div>
              </>
            )}

            {/* ══ INSPECTION PERFORMANCE ══ */}
            {tab === "performance" && (
              <>
                <div style={{ ...card, overflowX: "auto", marginBottom: 14 }}>
                  <h2 style={h2}>Inspection performance against quarterly targets</h2>
                  <RankingNote basis={`inspections completed in the ${weekWord}`} />
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <th style={th} title="1 = most inspections done in this period">Rank</th>
                      <th style={th}>Inspector</th>
                      <th style={th} title="How many inspections management expects from this inspector for the whole quarter">Quarterly Inspection Target</th>
                      <th style={th} title="Inspections completed in the selected dates">{data.is_single_week ? "Inspections This Week" : "Inspections This Period"}</th>
                      <th style={th} title="This period's inspections already approved by the office">Approved</th>
                      <th style={th} title="This period's inspections still waiting for office approval">Waiting Approval</th>
                      <th style={th} title="Did this inspector do more or fewer inspections than the previous period">More or Fewer vs Last {data.is_single_week ? "Week" : "Period"}</th>
                      <th style={th} title="Inspections completed from the start of the quarter up to now">Inspections This Quarter So Far</th>
                      <th style={th} title="Quarter inspections so far, as a percentage of the quarterly target">% of Quarterly Target Done</th>
                      <th style={th} title="How many ranking places this inspector moved up or down compared with the previous period">Rank Change vs Last {data.is_single_week ? "Week" : "Period"}</th>
                    </tr></thead>
                    <tbody>
                      {data.performance.map(p => {
                        const a = data.approvals.find(x => x.inspector_name === p.inspector_name);
                        return (
                          <tr key={p.inspector_name} className="wr-row">
                            <td style={rankTd}>{p.rank}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{p.inspector_name}</td>
                            <td style={td}>{p.quarter_target || <span style={{ color: F.muted }}>No target set</span>}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{p.weekly_inspections}</td>
                            <td style={{ ...td, color: (a?.approved ?? 0) > 0 ? F.green : F.muted, fontWeight: 700 }}>{a?.approved ?? 0}</td>
                            <td style={{ ...td, color: (a?.pending ?? 0) > 0 ? F.red : F.muted, fontWeight: 700 }}>{a?.pending ?? 0}</td>
                            <td style={td}><Movement change={p.weekly_inspections - (p.prev_inspections ?? 0)} nullLabel="—" /></td>
                            <td style={{ ...td, fontWeight: 700 }}>{p.cumulative_inspections}</td>
                            <td style={{ ...td, minWidth: 130 }}>
                              {p.target_pct === null ? <span style={{ color: F.muted }}>—</span> : (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ width: 64, height: 8, background: F.hair, borderRadius: 4, overflow: "hidden", display: "inline-block" }}>
                                    <span style={{ display: "block", width: `${Math.min(100, p.target_pct)}%`, height: "100%", background: p.target_pct >= 100 ? F.green : p.target_pct >= 60 ? F.amber : F.red, borderRadius: 4 }} />
                                  </span>
                                  <b>{p.target_pct}%</b>
                                </span>
                              )}
                            </td>
                            <td style={td}><Movement change={p.rank_change} /></td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: "#111827" }}>
                        <td style={{ ...td, color: "#fff" }} />
                        <td style={{ ...td, color: "#fff", fontWeight: 700 }}>Whole team — grand total</td>
                        <td style={{ ...td, color: "#fff" }} />
                        <td style={{ ...td, color: "#fff", fontWeight: 700 }}>{data.performance.reduce((s, p) => s + p.weekly_inspections, 0)}</td>
                        <td style={{ ...td, color: "#4ade80", fontWeight: 700 }}>{data.approvals.reduce((s, a) => s + a.approved, 0)}</td>
                        <td style={{ ...td, color: "#f87171", fontWeight: 700 }}>{data.approvals.reduce((s, a) => s + a.pending, 0)}</td>
                        <td style={{ ...td, color: "#fff" }} />
                        <td style={{ ...td, color: "#fff", fontWeight: 700 }}>{data.performance.reduce((s, p) => s + p.cumulative_inspections, 0)}</td>
                        <td style={{ ...td, color: "#fff" }} />
                        <td style={{ ...td, color: "#fff" }} />
                      </tr>
                    </tbody>
                  </table>
                  <p style={{ fontSize: 12, color: F.muted, margin: "10px 0 0" }}>
                    Approved + Waiting Approval = this {weekWord}&apos;s inspections. &quot;Quarter so far&quot; = all inspections this quarter ({data.quarter}) up to the end of this reporting {weekWord}.
                  </p>
                </div>
                <div style={{ ...card, marginBottom: 14 }}>
                  <h2 style={h2}>Inspections this {weekWord} — normal inspections vs occurrence reports</h2>
                  <p style={{ fontSize: 12, color: F.muted, margin: "0 0 10px" }}>
                    Each bar is the inspector&apos;s total inspections. The orange part shows how many of those were occurrence reports. The number reads: normal / total.
                  </p>
                  <StackedBars
                    aLabel="Normal inspections" bLabel="Occurrence reports"
                    aColor={F.primary} bColor={F.amber}
                    rows={data.performance.map(p => {
                      const occ = data.occurrences.find(o => o.inspector_name === p.inspector_name)?.count ?? 0;
                      return { label: p.inspector_name, a: p.weekly_inspections - occ, b: occ };
                    })} />
                </div>
                <div style={{ ...card, marginBottom: 14 }}>
                  <h2 style={h2}>Of those inspections — approved vs still waiting for approval</h2>
                  <p style={{ fontSize: 12, color: F.muted, margin: "0 0 10px" }}>
                    Same inspectors, same order. Blue = approved by the office, red = still waiting. The number reads: approved / total.
                  </p>
                  <StackedBars
                    aLabel="Approved" bLabel="Waiting approval"
                    aColor={F.blue} bColor={F.red}
                    rows={data.performance
                      .map(p => {
                        const a = data.approvals.find(x => x.inspector_name === p.inspector_name);
                        return { label: p.inspector_name, a: a?.approved ?? 0, b: a?.pending ?? 0 };
                      })
                      .sort((x, z) => z.a - x.a || (z.a + z.b) - (x.a + x.b))} />
                </div>
                <div style={{ ...card, overflowX: "auto" }}>
                  <h2 style={h2}>The travel effort behind these inspections</h2>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <th style={th}>Inspector</th>
                      <th style={th}>Inspections</th>
                      <th style={th}>KM Travelled</th>
                      <th style={th}>Hours on the Road</th>
                    </tr></thead>
                    <tbody>
                      {[...data.travel]
                        .sort((a, b) => b.km - a.km)
                        .map(t => (
                          <tr key={t.inspector_name} className="wr-row">
                            <td style={{ ...td, fontWeight: 700 }}>{t.inspector_name}</td>
                            <td style={td}>{t.inspections}</td>
                            <td style={td}>{t.km.toLocaleString("en-ZA")}</td>
                            <td style={td}>{t.hours}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ SAMPLES ══ */}
            {tab === "samples" && (
              <>
                <div style={{ ...card, marginBottom: 14 }}>
                  <h2 style={h2}>Sample status this {weekWord}</h2>
                  <Doughnut parts={[
                    { label: "Completed (COA received)", value: data.sample_status.completed, color: F.green },
                    { label: "Waiting for results", value: data.sample_status.waiting, color: F.amber },
                    { label: `Overdue (> ${data.sample_overdue_days} days)`, value: data.sample_status.overdue, color: F.red },
                  ]} />
                </div>
                <div style={{ ...card, overflowX: "auto", marginBottom: 14 }}>
                  <h2 style={h2}>Samples per inspector</h2>
                  <p style={{ fontSize: 12, color: F.muted, margin: "0 0 10px" }}>
                    &quot;Result Back&quot; — the laboratory certificate (COA) has been received and uploaded for the sample.{" "}
                    &quot;Still Waiting&quot; — the sample is on its way to the laboratory or is still being tested.{" "}
                    &quot;No Sample Taken&quot; — the inspection was completed without collecting a sample.
                  </p>
                  {data.samples.length === 0 ? <div style={{ color: F.muted, fontSize: 13 }}>No inspections in this period.</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={th} title="1 = most samples taken in this period">Rank</th><th style={th}>Inspector</th>
                        <th style={th} title="All inspections the inspector did in this period">Inspections</th>
                        <th style={th} title="Samples the inspector collected in this period">Samples Taken</th>
                        <th style={th} title="Inspections where no sample was collected">No Sample Taken</th>
                        <th style={th} title="Samples whose laboratory certificate (COA) is uploaded in the system">Result Back</th>
                        <th style={th} title="Samples with the courier or the laboratory, within the allowed time">Still Waiting</th>
                        <th style={th} title={`Samples with no result after more than ${data.sample_overdue_days} days`}>Waiting &gt; {data.sample_overdue_days} Days</th>
                      </tr></thead>
                      <tbody>
                        {data.samples.map(s => (
                          <tr key={s.inspector_name} className="wr-row">
                            <td style={rankTd}>{s.rank}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{s.inspector_name}</td>
                            <td style={td}>{s.inspections ?? "—"}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{s.taken}</td>
                            <td style={{ ...td, color: (s.no_sample ?? 0) > 0 ? F.amber : F.muted, fontWeight: 700 }}>{s.no_sample ?? "—"}</td>
                            <td style={{ ...td, color: s.completed ? F.green : F.muted, fontWeight: 600 }}>{s.completed}</td>
                            <td style={{ ...td, color: s.waiting ? F.amber : F.muted, fontWeight: 600 }}>{s.waiting}</td>
                            <td style={{ ...td, color: s.overdue ? F.red : F.muted, fontWeight: 700 }}>{s.overdue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {data.outstanding_samples.length > 0 && (() => {
                  const groups = new Map<string, { count: number; maxDays: number; clients: string[] }>();
                  data.outstanding_samples.forEach(s => {
                    const g = groups.get(s.inspector_name) || { count: 0, maxDays: 0, clients: [] };
                    g.count += 1;
                    g.maxDays = Math.max(g.maxDays, s.age_days);
                    if (!g.clients.includes(s.client_name)) g.clients.push(s.client_name);
                    groups.set(s.inspector_name, g);
                  });
                  const grouped = [...groups.entries()].sort((a, b) => b[1].maxDays - a[1].maxDays || b[1].count - a[1].count);
                  return (
                    <div style={{ ...card, overflowX: "auto" }}>
                      <h2 style={h2}>Samples awaiting laboratory results</h2>
                      <p style={{ fontSize: 12, color: F.muted, margin: "0 0 10px" }}>
                        A sample normally waits a few days while it travels to the laboratory and is tested.
                        A <span style={{ color: F.red, fontWeight: 700 }}>red row</span> has a sample waiting longer than {data.sample_overdue_days} days.
                      </p>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>
                          <th style={{ ...th, whiteSpace: "nowrap" }}>Inspector</th>
                          <th style={{ ...th, textAlign: "center" }}>Samples Waiting</th>
                          <th style={{ ...th, textAlign: "center" }} title="Their oldest sample with no result yet">Longest Waiting</th>
                          <th style={th}>Clients</th>
                        </tr></thead>
                        <tbody>
                          {grouped.map(([name, g]) => (
                            <tr key={name} className="wr-row" style={g.maxDays > data.sample_overdue_days ? { background: F.red50 } : undefined}>
                              <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{name}</td>
                              <td style={{ ...td, fontWeight: 700, textAlign: "center" }}>{g.count}</td>
                              <td style={{ ...td, color: g.maxDays > data.sample_overdue_days ? F.red : "#374151", fontWeight: 700, textAlign: "center" }}>{g.maxDays} days</td>
                              <td style={{ ...td, maxWidth: 420 }}>{g.clients.join(", ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>
            )}

            {/* ══ APPROVALS & CAPTURING ══ */}
            {tab === "approvals" && (
              <>
                <div style={{ ...card, overflowX: "auto", marginBottom: 14 }}>
                  <h2 style={h2}>Approval versus capturing — is the administration being done on time?</h2>
                  <p style={{ fontSize: 12, color: F.muted, margin: "0 0 10px" }}>
                    <span style={{ color: F.green, fontWeight: 700 }}>Green</span> = approved, or captured within {data.admin_lag_days} days of the inspection.{" "}
                    <span style={{ color: F.red, fontWeight: 700 }}>Red</span> = still waiting for office approval, or captured later than {data.admin_lag_days} days.
                  </p>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <th style={th} title="1 = highest percentage approved">Rank</th><th style={th}>Inspector</th>
                      <th style={th} title="All inspection records for this inspector in the period">Inspections</th>
                      <th style={th} title={`Records entered into the system within ${data.admin_lag_days} days of the inspection`}>Captured Within {data.admin_lag_days} Days</th>
                      <th style={th} title="Records the office has approved">Approved</th>
                      <th style={th} title="Records still waiting for office approval">Waiting for Approval</th>
                    </tr></thead>
                    <tbody>
                      {data.approvals.map(a => {
                        const capRatio = a.total_records > 0 ? a.captured_on_time / a.total_records : 0;
                        return (
                          <tr key={a.inspector_name} className="wr-row">
                            <td style={rankTd}>{a.rank}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{a.inspector_name}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{a.total_records}</td>
                            <td style={{ ...td, color: capRatio >= 0.9 ? F.green : capRatio >= 0.5 ? F.amber : F.red, fontWeight: 700 }}>{a.captured_on_time}</td>
                            <td style={{ ...td, color: a.approved ? F.green : F.muted, fontWeight: 700 }}>{a.approved}</td>
                            <td style={{ ...td, color: a.pending ? F.red : F.muted, fontWeight: 700 }}>{a.pending}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ══ COMPLIANCE ══ */}
            {tab === "compliance" && (
              <>
                <div style={{ ...card, overflowX: "auto", marginBottom: 14 }}>
                  <h2 style={h2}>Compliance per inspector</h2>
                  <p style={{ fontSize: 12, color: F.muted, margin: "0 0 10px" }}>
                    % Compliant counts <b>every</b> inspection the inspector did — all commodities. An inspection with no recorded
                    outcome cannot count as compliant, so missing outcomes pull the percentage down. Exact to one decimal.
                  </p>
                  {data.compliance.length === 0 ? <div style={{ color: F.muted, fontSize: 13 }}>No inspections in this period.</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={th} title="1 = highest percentage compliant">Rank</th><th style={th}>Inspector</th>
                        <th style={th} title="All inspections this period — every commodity">Inspections</th>
                        <th style={th} title="Results where the product met the rules">Compliant</th>
                        <th style={th} title="Results where the product did not meet the rules">Non-Compliant</th>
                        <th style={th} title="Inspections where no compliant/non-compliant outcome was captured">No Outcome Recorded</th>
                        <th style={th} title="Compliant results as a percentage of ALL inspections, exact to one decimal">% Compliant</th>
                      </tr></thead>
                      <tbody>
                        {data.compliance.map(c => {
                          const assessed = c.compliant + c.non_compliant;
                          return (
                            <tr key={c.inspector_name} className="wr-row">
                              <td style={rankTd}>{c.rank}</td>
                              <td style={{ ...td, fontWeight: 700 }}>{c.inspector_name}</td>
                              <td style={{ ...td, fontWeight: 700 }}>{c.inspections ?? assessed}</td>
                              <td style={{ ...td, color: c.compliant ? F.green : F.muted, fontWeight: 600 }}>{c.compliant}</td>
                              <td style={{ ...td, color: c.non_compliant ? F.red : F.muted, fontWeight: 600 }}>{c.non_compliant}</td>
                              <td style={{ ...td, color: (c.not_assessed ?? 0) > 0 ? F.amber : F.muted, fontWeight: 700 }}>{c.not_assessed ?? 0}</td>
                              <td style={{ ...td, fontWeight: 800 }}>{c.rate}%</td>
                            </tr>
                          );
                        })}
                        {(() => {
                          const t = data.compliance.reduce(
                            (acc, c) => ({ insp: acc.insp + (c.inspections ?? 0), c: acc.c + c.compliant, nc: acc.nc + c.non_compliant, na: acc.na + (c.not_assessed ?? 0) }),
                            { insp: 0, c: 0, nc: 0, na: 0 });
                          const rate = t.insp > 0 ? Math.round((t.c * 100 / t.insp) * 10) / 10 : 0;
                          return (
                            <tr style={{ background: "#111827" }}>
                              <td style={{ ...td, color: "#fff" }} />
                              <td style={{ ...td, color: "#fff", fontWeight: 700 }}>Whole team — grand total</td>
                              <td style={{ ...td, color: "#fff", fontWeight: 700 }}>{t.insp}</td>
                              <td style={{ ...td, color: "#4ade80", fontWeight: 700 }}>{t.c}</td>
                              <td style={{ ...td, color: "#f87171", fontWeight: 700 }}>{t.nc}</td>
                              <td style={{ ...td, color: "#fbbf24", fontWeight: 700 }}>{t.na}</td>
                              <td style={{ ...td, color: "#fff", fontWeight: 800 }}>{rate}%</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  )}
                </div>
                {(() => {
                  const comms = (data.commodity_compliance ?? []).filter(c => (c.inspectors ?? []).length > 0);
                  if (comms.length === 0) return null;
                  return (
                    <div style={{ ...card, overflowX: "auto", marginBottom: 14 }}>
                      <h2 style={h2}>Compliance per commodity</h2>
                      <p style={{ fontSize: 12, color: F.muted, margin: "0 0 10px" }}>
                        Each cell shows the % compliant for that commodity. &quot;0&quot; = no inspections of that commodity.{" "}
                        &quot;no outcomes&quot; = the inspections were done, but no compliant / non-compliant outcome has been captured for them yet.{" "}
                        <span style={{ color: F.green, fontWeight: 700 }}>Green</span> = 75% or better,{" "}
                        <span style={{ color: F.amber, fontWeight: 700 }}>orange</span> = 50% to 74.9%,{" "}
                        <span style={{ color: F.red, fontWeight: 700 }}>red</span> = below 50%, or no outcomes captured yet.
                      </p>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>
                          <th style={th}>Inspector</th>
                          {comms.map(c => <th key={c.commodity} style={{ ...th, textAlign: "center" }}>{c.commodity}</th>)}
                          <th style={{ ...th, textAlign: "center" }}>All Commodities Combined</th>
                        </tr></thead>
                        <tbody>
                          {data.compliance.map(ci => {
                            const cellTd = (p: { inspections: number; compliant: number; non_compliant: number; rate: number } | null, key: string) => {
                              if (!p || p.inspections === 0) return <td key={key} style={{ ...td, textAlign: "center", color: F.muted }}>0</td>;
                              if (p.compliant === 0 && p.non_compliant === 0) {
                                return <td key={key} style={{ ...td, textAlign: "center", color: F.red, background: "#fee2e2" }}>no outcomes</td>;
                              }
                              const band = p.rate >= 75
                                ? { bg: "#dcfce7", col: F.green }
                                : p.rate >= 50 ? { bg: "#fef3c7", col: "#b45309" } : { bg: "#fee2e2", col: F.red };
                              return (
                                <td key={key} style={{ ...td, textAlign: "center", background: band.bg, color: band.col, fontWeight: 700 }}>
                                  {p.rate}%
                                </td>
                              );
                            };
                            const combined = comms.reduce((t, c) => {
                              const p = (c.inspectors ?? []).find(x => x.inspector_name === ci.inspector_name);
                              return p ? { inspections: t.inspections + p.inspections, compliant: t.compliant + p.compliant, non_compliant: t.non_compliant + p.non_compliant } : t;
                            }, { inspections: 0, compliant: 0, non_compliant: 0 });
                            const combinedCell = combined.inspections > 0
                              ? { ...combined, rate: Math.round((combined.compliant * 100 / combined.inspections) * 10) / 10 }
                              : null;
                            return (
                              <tr key={ci.inspector_name} className="wr-row">
                                <td style={{ ...td, fontWeight: 700 }}>{ci.inspector_name}</td>
                                {comms.map(c => cellTd((c.inspectors ?? []).find(x => x.inspector_name === ci.inspector_name) ?? null, c.commodity))}
                                {cellTd(combinedCell, "combined")}
                              </tr>
                            );
                          })}
                          <tr style={{ background: "#111827" }}>
                            <td style={{ ...td, color: "#fff", fontWeight: 700 }}>Whole team</td>
                            {comms.map(c => <td key={c.commodity} style={{ ...td, color: "#fff", textAlign: "center", fontWeight: 700 }}>{c.rate}%</td>)}
                            {(() => {
                              const t = comms.reduce((a, c) => ({ n: a.n + c.inspections, c: a.c + c.compliant }), { n: 0, c: 0 });
                              const rate = t.n > 0 ? Math.round((t.c * 100 / t.n) * 10) / 10 : 0;
                              return <td style={{ ...td, color: "#fff", textAlign: "center", fontWeight: 700 }}>{rate}%</td>;
                            })()}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>
            )}

            {/* ══ TRAVEL ══ */}
            {tab === "travel" && (
              <>
                <div style={{ ...card, overflowX: "auto", marginBottom: 14 }}>
                  <h2 style={h2}>Travel activity per inspector</h2>
                  <RankingNote basis="kilometres travelled" />
                  {data.travel.length === 0 ? <div style={{ color: F.muted, fontSize: 13 }}>No travel recorded in this period.</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={th} title="1 = most kilometres travelled">Rank</th><th style={th}>Inspector</th>
                        <th style={th} title="Total kilometres travelled in the period">KM Travelled</th>
                        <th style={th} title="Total hours spent travelling and inspecting">Hours on the Road</th>
                        <th style={th} title="Inspections completed in the period">Inspections Done</th>
                        <th style={th} title="Total kilometres divided by inspections — a rough estimate of how far they drive per inspection">KM per Inspection (Rough Estimate)</th>
                      </tr></thead>
                      <tbody>
                        {data.travel.map(v => (
                          <tr key={v.inspector_name} className="wr-row">
                            <td style={rankTd}>{v.rank}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{v.inspector_name}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{v.km.toLocaleString("en-ZA")}</td>
                            <td style={td}>{v.hours}</td>
                            <td style={td}>{v.inspections}</td>
                            <td style={td}>{v.avg_km_per_inspection}</td>
                          </tr>
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
