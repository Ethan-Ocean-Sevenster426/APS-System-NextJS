"use client";

import { useState, useEffect } from "react";

interface MonthEntry   { month: string; count: number; }
interface SentEntry    { month: string; sent: number; total: number; }
interface Inspector    { inspector_name: string; count: number; }
interface GroupType    { group_type: string; count: number; }
interface Corporate    { corporate_group: string; count: number; }

interface AnalyticsData {
  success: boolean;
  total_clients: number;
  total_groups: number;
  total_inspections: number;
  this_month_groups: number;
  total_sent: number;
  total_approved: number;
  compliance_rate: number;
  non_compliant: number;
  monthly: MonthEntry[];
  sent_monthly: SentEntry[];
  top_inspectors: Inspector[];
  group_type_data: GroupType[];
  corporate_data: Corporate[];
}

interface LateInspectorRow {
  inspector_name: string;
  total_inspections: number;
  late_count: number;
}
interface LateCaptureSummary {
  success: boolean;
  lag_days: number;
  total_in_range: number;
  total_late: number;
  inspectors: LateInspectorRow[];
}

// Chart series colors — validated (chroma, CVD separation, contrast): teal = inspections, blue = docs sent
const TEAL = "#007890";        // brand teal (headings, buttons)
const CHART_TEAL = "#0891b2";  // chart-mark teal (passes chroma floor)
const CHART_BLUE = "#2563eb";
const TEAL_LIGHT = "#e6f7f9";
// Status pair for on-time vs late (validated, colour-vision safe)
const C_ONTIME = "#2563eb";
const C_LATE = "#dc2626";

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", cursor: "help", marginLeft: 6, verticalAlign: "middle" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <i className="fas fa-info-circle" style={{ fontSize: "0.8rem", color: "#007890" }} />
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#f1f5f9", fontSize: "0.72rem", padding: "8px 12px",
          borderRadius: 8, width: 220, textAlign: "left", zIndex: 9999, lineHeight: 1.45,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)", pointerEvents: "none",
          fontWeight: 400,
        }}>{text}</div>
      )}
    </span>
  );
}

function StatCard({ icon, label, value, sub, color = TEAL, tip, href }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string; tip?: string; href?: string;
}) {
  const card = (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "16px 18px", height: "100%",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: "50%", background: TEAL_LIGHT,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <i className={icon} style={{ color, fontSize: "1.05rem" }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1f2937", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600, marginTop: 3, whiteSpace: "nowrap" }}>
          {label}{tip && <InfoTip text={tip} />}
        </div>
        {sub && <div style={{ fontSize: "0.64rem", color: "#9ca3af", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: "none" }} title="Open the full report">{card}</a> : card;
}

/* Horizontal labeled bars — one measure, one hue (magnitude) */
function BarChart({ data, valueKey, labelKey, color = CHART_TEAL }: {
  data: Record<string, number | string>[]; valueKey: string; labelKey: string; color?: string;
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey])), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} className="aa-hbar-row" style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 4 }}
          title={`${String(d[labelKey])}: ${d[valueKey]}`}>
          <div style={{ width: 130, fontSize: "0.7rem", color: "#374151", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {String(d[labelKey])}
          </div>
          <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 16, overflow: "hidden" }}>
            <div style={{
              width: `${(Number(d[valueKey]) / max) * 100}%`,
              background: color, height: "100%", borderRadius: 4,
              transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#374151", width: 30, textAlign: "right" }}>
            {d[valueKey]}
          </div>
        </div>
      ))}
      {data.length === 0 && <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>No data</p>}
    </div>
  );
}

/* On-time vs late per inspector — same visual as the Late Captures report */
function OnTimeVsLateChart({ inspectors }: { inspectors: LateInspectorRow[] }) {
  const max = Math.max(...inspectors.map(i => i.total_inspections), 1);
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: "0.66rem", color: "#6b7280", fontWeight: 600 }}>
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
            <a key={i.inspector_name} href={`/late-captures?inspector=${encodeURIComponent(i.inspector_name)}`}
              style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", borderRadius: 4, padding: "1px 2px" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              title={`${i.inspector_name}: ${onTime} on time, ${i.late_count} late (of ${i.total_inspections}) — click to open their late captures`}>
              <div style={{ width: 110, fontSize: "0.7rem", color: "#374151", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {i.inspector_name}
              </div>
              <div style={{ flex: 1, display: "flex", gap: 2, height: 16 }}>
                <div style={{ width: `${(onTime / max) * 100}%`, background: C_ONTIME, borderRadius: 4, minWidth: onTime > 0 ? 3 : 0 }} />
                <div style={{ width: `${(i.late_count / max) * 100}%`, background: C_LATE, borderRadius: 4, minWidth: i.late_count > 0 ? 3 : 0 }} />
              </div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C_LATE, width: 52, flexShrink: 0 }}>
                {i.late_count} late
              </div>
            </a>
          );
        })}
      </div>
      {inspectors.length === 0 && <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>No late captures in this period</p>}
    </div>
  );
}

/* Grouped monthly bars — two series (identity): legend + per-bar tooltip, 2px gap inside pairs */
function MonthlyActivityChart({ monthly, sentMonthly }: { monthly: MonthEntry[]; sentMonthly: SentEntry[] }) {
  const sentByMonth = new Map(sentMonthly.map(s => [s.month, s.sent]));
  const max = Math.max(...monthly.map(m => m.count), ...sentMonthly.map(s => s.sent), 1);
  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: "0.66rem", color: "#6b7280", fontWeight: 600 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: CHART_TEAL, display: "inline-block" }} /> Inspections
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: CHART_BLUE, display: "inline-block" }} /> Docs sent
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 108 }}>
        {monthly.map((m, i) => {
          const sent = sentByMonth.get(m.month) ?? 0;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#6b7280" }}>{m.count}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, width: "100%", justifyContent: "center" }}>
                <div title={`${m.month} — Inspections: ${m.count}`} style={{
                  width: "42%", maxWidth: 22, background: CHART_TEAL, borderRadius: "4px 4px 0 0",
                  height: `${(m.count / max) * 74}px`, minHeight: m.count > 0 ? 4 : 1,
                  transition: "height 0.4s ease",
                }} />
                <div title={`${m.month} — Docs sent: ${sent}`} style={{
                  width: "42%", maxWidth: 22, background: CHART_BLUE, borderRadius: "4px 4px 0 0",
                  height: `${(sent / max) * 74}px`, minHeight: sent > 0 ? 4 : 1,
                  transition: "height 0.4s ease",
                }} />
              </div>
              <div style={{ fontSize: "0.58rem", color: "#6b7280", textAlign: "center", lineHeight: 1.1 }}>
                {m.month.split(" ")[0]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [late, setLate] = useState<LateCaptureSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inspectorFilter, setInspectorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [allInspectors, setAllInspectors] = useState<string[]>([]);

  const fetchData = (inspector = "", from = "", to = "") => {
    setLoading(true);
    const params = new URLSearchParams();
    if (inspector) params.set("inspector", inspector);
    if (from) params.set("date_from", from);
    if (to) params.set("date_to", to);
    fetch(`/api/admin-analytics?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.all_inspectors) setAllInspectors(d.all_inspectors);
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });

    // Late-capture summary uses the same period as the rest of the page:
    // the chosen date range, or ALL TIME when no dates are set (the report
    // endpoint alone would default to the last 90 days, which wouldn't match).
    const lateParams = new URLSearchParams();
    lateParams.set("date_from", from || "2000-01-01");
    lateParams.set("date_to", to || new Date().toISOString().slice(0, 10));
    if (inspector) lateParams.set("inspector", inspector);
    fetch(`/api/late-capture-report?${lateParams}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setLate(d.success ? d : null))
      .catch(() => setLate(null));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#007890", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (error || !data?.success) return (
    <div style={{ padding: 24, color: "#ef4444", fontSize: "0.85rem" }}>
      Failed to load analytics. {error}
    </div>
  );

  const sentRate = data.total_groups > 0 ? Math.round((data.total_sent / data.total_groups) * 100) : 0;
  const approvedRate = data.total_groups > 0 ? Math.round((data.total_approved / data.total_groups) * 100) : 0;
  const latePct = late && late.total_in_range > 0 ? Math.round((late.total_late / late.total_in_range) * 100) : 0;
  const complianceColor = data.compliance_rate >= 80 ? "#16a34a" : data.compliance_rate >= 60 ? "#ea580c" : "#dc2626";

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .aa-wrap { padding: 24px; width: 100%; }
        .aa-tiles-volumes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
        .aa-tiles-status { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .aa-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .aa-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 1100px) {
          .aa-tiles-volumes, .aa-tiles-status { grid-template-columns: repeat(2, 1fr); }
          .aa-grid3 { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .aa-tiles-volumes, .aa-tiles-status { grid-template-columns: 1fr; }
        }
        .aa-card { background: #fff; border-radius: 12px; padding: 18px 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
        .aa-card-title { font-size: 0.82rem; font-weight: 700; color: #1f2937; margin: 0 0 14px; }
        .aa-hbar-row:hover { background: #f9fafb; }
        @media (max-width: 900px) {
          .aa-grid2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="aa-wrap">
        {/* Page header */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            <i className="fas fa-chart-line" style={{ color: "#5ee8ff", marginRight: 8 }} />
            Admin Analytics
          </h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", margin: "4px 0 0", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
            Overview of inspections, clients, and operational performance
          </p>
        </div>

        {/* Filters */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 2 }}>Inspector</label>
            <select value={inspectorFilter} onChange={e => setInspectorFilter(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.8rem", minWidth: 160 }}>
              <option value="">All Inspectors</option>
              {allInspectors.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 2 }}>Date From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.8rem" }} />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 2 }}>Date To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.8rem" }} />
          </div>
          <button onClick={() => fetchData(inspectorFilter, dateFrom, dateTo)}
            style={{ padding: "6px 16px", background: TEAL, color: "#fff", border: "none", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
            <i className="fas fa-filter" style={{ marginRight: 4 }} /> Apply
          </button>
          <button onClick={() => { setInspectorFilter(""); setDateFrom(""); setDateTo(""); fetchData(); }}
            style={{ padding: "6px 16px", background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
            <i className="fas fa-times" style={{ marginRight: 4 }} /> Clear
          </button>
        </div>

        {/* Stat tiles — volumes on top, statuses below */}
        <div className="aa-tiles-volumes">
          <StatCard icon="fas fa-users" label="Total Clients" value={data.total_clients.toLocaleString()} tip="Total number of client facilities registered in the system." />
          <StatCard icon="fas fa-folder-open" label="Inspection Groups" value={data.total_groups.toLocaleString()} sub={`${data.this_month_groups} this month`} tip="Each inspection visit to a client is one group. A group can contain multiple commodities." />
          <StatCard icon="fas fa-file-invoice" label="Total Inspections" value={data.total_inspections.toLocaleString()} tip="Total individual product inspections across all groups (each commodity in a group is one inspection)." />
        </div>
        <div className="aa-tiles-status">
          <StatCard icon="fas fa-check-circle" label="Approved" value={`${data.total_approved.toLocaleString()} (${approvedRate}%)`} color="#16a34a" tip="How many inspection groups have been approved by management." />
          <StatCard icon="fas fa-paper-plane" label="Sent" value={`${data.total_sent.toLocaleString()} (${sentRate}%)`} color={CHART_BLUE} tip="How many inspection groups have had their documents emailed to the client." />
          <StatCard icon="fas fa-shield-alt" label="Compliance Rate" value={`${data.compliance_rate}%`} sub={`${data.non_compliant} with directions`} color={complianceColor} tip="Share of inspection groups without a direction issued. Groups where a direction is present count as non-compliant." />
          {late && (
            <StatCard icon="fas fa-user-clock" label="Late Captures" value={`${late.total_late} (${latePct}%)`} sub={`> ${late.lag_days}-day window — open report →`} color="#dc2626" href="/late-captures"
              tip={`Inspections captured more than ${late.lag_days} days after the inspection date, in the same period as this page. Click to open the full per-inspector report.`} />
          )}
        </div>

        {/* Monthly activity + On time vs late */}
        <div className="aa-grid2">
          <div className="aa-card">
            <p className="aa-card-title">Monthly Activity <InfoTip text="Inspection groups created vs documents sent to clients, per month, over the last 6 months. Hover a bar for exact values." /></p>
            <MonthlyActivityChart monthly={data.monthly} sentMonthly={data.sent_monthly} />
          </div>
          <div className="aa-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <p className="aa-card-title">On Time vs Late — by Inspector <InfoTip text="Each inspector's inspections split into captured on time (within the 2-day window, blue) vs captured late (red). Click an inspector to open their late captures. Uses the same period as the rest of this page." /></p>
              <a href="/late-captures" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#dc2626", textDecoration: "none", whiteSpace: "nowrap" }}>
                Open Late Captures report <i className="fas fa-arrow-right" style={{ fontSize: 10 }} />
              </a>
            </div>
            <OnTimeVsLateChart inspectors={late?.inspectors ?? []} />
          </div>
        </div>

        {/* Breakdowns */}
        <div className="aa-grid3">
          <div className="aa-card">
            <p className="aa-card-title">Top Inspectors <InfoTip text="Inspectors with the most inspection groups in the selected period." /></p>
            <BarChart
              data={data.top_inspectors.map(d => ({ label: d.inspector_name, value: d.count }))}
              labelKey="label" valueKey="value"
            />
          </div>
          <div className="aa-card">
            <p className="aa-card-title">By Corporate Group <InfoTip text="Breakdown of inspection groups by the corporate group the client belongs to (e.g., Woolworths, Pick n Pay)." /></p>
            <BarChart
              data={data.corporate_data.map(d => ({ label: d.corporate_group, value: d.count }))}
              labelKey="label" valueKey="value"
            />
          </div>
          <div className="aa-card">
            <p className="aa-card-title">By Store Type <InfoTip text="Breakdown of inspection groups by store type (corporate, franchise, independent)." /></p>
            <BarChart
              data={data.group_type_data.map(d => ({ label: d.group_type, value: d.count }))}
              labelKey="label" valueKey="value"
            />
          </div>
        </div>
      </div>
    </>
  );
}
