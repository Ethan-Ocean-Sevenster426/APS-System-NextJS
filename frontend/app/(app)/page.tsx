"use client";

import { useState, useEffect } from "react";

/* ─── Types ─── */
interface KpiRow {
  commodity: string;
  label: string;
  target: number;
  actual: number;
  still_needed: number;
  expected_by_now: number;
  pct_of_target: number;
  pct_of_expected: number;
  status: string;
}
interface Profitability {
  hourly_rate: number;
  km_rate: number;
  sample_rate: number;
  total_hours: number;
  total_km: number;
  total_samples: number;
  rev_hours: number;
  rev_km: number;
  rev_samples: number;
  actual_revenue: number;
  revenue_target: number;
  rev_target_pct: number;
  monthly_salary: number;
  monthly_vehicle: number;
  monthly_other: number;
  quarterly_salary: number;
  quarterly_vehicle: number;
  quarterly_other: number;
  quarterly_costs: number;
  net_profit: number;
  is_profitable: boolean;
  has_data: boolean;
}
interface RecentInspection {
  id: number;
  client_name: string;
  date_of_inspection: string;
  commodity: string;
  is_direction_present_for_this_inspection: boolean;
  inspector_name: string;
}
interface TopClient {
  client_name: string;
  count: number;
  percentage: number;
}
interface CommodityStat {
  commodity: string;
  count: number;
}
interface MonthlyTrend {
  month: number;
  month_name: string;
  count: number;
}
interface DashboardData {
  inspector_name: string;
  total_inspections: number;
  recent_inspections: number;
  this_month_inspections: number;
  avg_monthly_inspections: number;
  compliant_inspections: number;
  non_compliant_inspections: number;
  compliance_rate: number;
  kpi_rows: KpiRow[];
  kpi_overall_status: string;
  kpi_actual_total: number;
  kpi_total_target: number;
  quarter_label: string;
  quarter_progress_display: number;
  has_targets: boolean;
  profitability: Profitability;
  recent_inspections_list: RecentInspection[];
  top_clients: TopClient[];
  commodity_stats: CommodityStat[];
  monthly_trends: MonthlyTrend[];
  monthly_inspections: { month: string; count: number }[];
  forecast_data: { month: string; count: number }[];
}

/* ─── Quick Links (for non-inspector roles) ─── */
const ALL_QUICK_LINKS = [
  { href: "/inspections",  icon: "fas fa-clipboard-list",  color: "#2563eb", bg: "#eff6ff", title: "Inspections",              sub: "View & manage records",   roles: ["inspector","inspector_manager","lab_technician","admin","financial","super_admin","developer"] },
  { href: "/lab-analytics",icon: "fas fa-flask",           color: "#007890", bg: "#e6f7f9", title: "Lab Analytics",            sub: "Sample testing results",  roles: ["lab_technician","super_admin","developer"] },
  { href: "/export-sheet", icon: "fas fa-file-invoice",    color: "#16a34a", bg: "#f0fdf4", title: "Export Sheet",             sub: "Invoice dashboard",       roles: ["admin","financial","super_admin","developer"] },
  { href: "/analytics",        icon: "fas fa-chart-bar",   color: "#7c3aed", bg: "#faf5ff", title: "Analytics",       sub: "View insights",       roles: ["inspector","inspector_manager","super_admin","developer"] },
  { href: "/admin-analytics",  icon: "fas fa-chart-line",  color: "#007890", bg: "#e6f7f9", title: "Admin Analytics",  sub: "Operational overview", roles: ["admin"] },
  { href: "/clients",      icon: "fas fa-users",           color: "#ea580c", bg: "#fff7ed", title: "Client Allocation Sheet", sub: "Manage allocations",      roles: ["admin","financial","super_admin","developer"] },
];

/* ─── Colours ─── */
const PRIMARY = "#007890";
const SECONDARY = "#EC343C";
const COMMODITY_COLORS: Record<string, string> = {
  POULTRY: "#007890",
  RAW: "#EC343C",
  PMP: "#f59e0b",
  EGGS: "#8b5cf6",
};

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    on_track:        { bg: "#dcfce7", color: "#16a34a", label: "On Track" },
    slightly_behind: { bg: "#fef9c3", color: "#ca8a04", label: "Slightly Behind" },
    behind:          { bg: "#fee2e2", color: "#dc2626", label: "Behind" },
    no_target:       { bg: "#f3f4f6", color: "#6b7280", label: "No Target" },
  };
  const s = map[status] || map.no_target;
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

const fmt = (n: number) => n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtR = (n: number) => "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Inspector Dashboard Component                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function InspectorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inspector-dashboard", { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`Status ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "4px solid rgba(0,120,144,0.2)", borderTopColor: PRIMARY, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#6b7280", fontSize: 14 }}>Loading dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );

  if (error) return <div style={{ padding: 40, textAlign: "center", color: SECONDARY }}>{error}</div>;
  if (!data) return null;

  const maxMonthly = Math.max(...(data.monthly_trends || []).map(t => t.count), 1);
  const totalCommodity = (data.commodity_stats || []).reduce((s, c) => s + c.count, 0) || 1;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .id-grid { display: grid; gap: 16px; }
        .id-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); padding: 20px; }
        .id-card h3 { margin: 0 0 14px; font-size: 15px; font-weight: 700; color: #1f2937; }
        @media (min-width: 768px) {
          .id-stats-row { grid-template-columns: repeat(4, 1fr) !important; }
          .id-two-col { grid-template-columns: 1fr 1fr !important; }
          .id-three-col { grid-template-columns: 1fr 1fr 1fr !important; }
        }
      `}</style>

      <div style={{ padding: "20px 20px 40px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
            Inspector Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.85)", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
            Welcome back, {data.inspector_name}
          </p>
        </div>

        {/* ── Stats Cards ── */}
        <div className="id-grid id-stats-row" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
          {[
            { label: "Total Inspections", value: fmt(data.total_inspections), sub: `${data.this_month_inspections} this month`, color: PRIMARY, icon: "fas fa-clipboard-list" },
            { label: "Last 30 Days", value: fmt(data.recent_inspections), sub: `${data.avg_monthly_inspections} avg/month`, color: "#2563eb", icon: "fas fa-calendar-alt" },
            { label: "Compliance Rate", value: `${data.compliance_rate}%`, sub: `${data.compliant_inspections} compliant`, color: "#16a34a", icon: "fas fa-check-circle" },
            { label: "Non-Compliant", value: fmt(data.non_compliant_inspections), sub: "directions issued", color: SECONDARY, icon: "fas fa-exclamation-triangle" },
          ].map((card, i) => (
            <div key={i} className="id-card" style={{ textAlign: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: card.color + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <i className={card.icon} style={{ color: card.color, fontSize: 16 }} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ── KPI Tracker ── */}
        {data.has_targets && (
          <div className="id-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                KPI Tracker - {data.quarter_label}
              </h3>
              {statusBadge(data.kpi_overall_status)}
            </div>

            {/* Quarter progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                <span>Quarter Progress</span>
                <span>{data.quarter_progress_display}%</span>
              </div>
              <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${data.quarter_progress_display}%`, background: PRIMARY, borderRadius: 999, transition: "width 0.5s" }} />
              </div>
            </div>

            {/* Total */}
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 12, fontWeight: 600 }}>
              Total: {data.kpi_actual_total} / {data.kpi_total_target} inspections
            </div>

            {/* Per-commodity rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.kpi_rows.map(row => (
                <div key={row.commodity} style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: COMMODITY_COLORS[row.commodity] || "#374151" }}>{row.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ color: "#374151", fontWeight: 600 }}>{row.actual} / {row.target}</span>
                      {statusBadge(row.status)}
                    </div>
                  </div>
                  <div style={{ height: 6, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ height: "100%", width: `${row.pct_of_target}%`, background: COMMODITY_COLORS[row.commodity] || PRIMARY, borderRadius: 999, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" }}>
                    <span>Still needed: {row.still_needed}</span>
                    <span>Expected by now: {row.expected_by_now}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Profitability ── */}
        {data.profitability.has_data && (
          <div className="id-card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Profitability - {data.quarter_label}</h3>

            <div className="id-grid id-two-col" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
              {/* Revenue */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Revenue</div>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      { label: `Hours (${data.profitability.total_hours}h x ${fmtR(data.profitability.hourly_rate)})`, value: data.profitability.rev_hours },
                      { label: `KM (${data.profitability.total_km}km x ${fmtR(data.profitability.km_rate)})`, value: data.profitability.rev_km },
                      { label: `Samples (${data.profitability.total_samples} x ${fmtR(data.profitability.sample_rate)})`, value: data.profitability.rev_samples },
                    ].map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: "4px 0", color: "#374151" }}>{r.label}</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600, color: "#374151" }}>{fmtR(r.value)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "6px 0", fontWeight: 700, color: "#16a34a" }}>Total Revenue</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>{fmtR(data.profitability.actual_revenue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Costs */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: SECONDARY, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Costs (Quarterly)</div>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      { label: `Salary (${fmtR(data.profitability.monthly_salary)} x 3)`, value: data.profitability.quarterly_salary },
                      { label: `Vehicle (${fmtR(data.profitability.monthly_vehicle)} x 3)`, value: data.profitability.quarterly_vehicle },
                      { label: `Other (${fmtR(data.profitability.monthly_other)} x 3)`, value: data.profitability.quarterly_other },
                    ].map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: "4px 0", color: "#374151" }}>{r.label}</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600, color: "#374151" }}>{fmtR(r.value)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "6px 0", fontWeight: 700, color: SECONDARY }}>Total Costs</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 700, color: SECONDARY }}>{fmtR(data.profitability.quarterly_costs)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net result */}
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8, background: data.profitability.is_profitable ? "#dcfce7" : "#fee2e2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: data.profitability.is_profitable ? "#16a34a" : "#dc2626" }}>Net Result</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: data.profitability.is_profitable ? "#16a34a" : "#dc2626" }}>{fmtR(data.profitability.net_profit)}</span>
            </div>

            {/* Revenue vs target */}
            {data.profitability.revenue_target > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  <span>Revenue vs Target</span>
                  <span>{fmtR(data.profitability.actual_revenue)} / {fmtR(data.profitability.revenue_target)}</span>
                </div>
                <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${data.profitability.rev_target_pct}%`, background: "#16a34a", borderRadius: 999 }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Charts Row ── */}
        <div className="id-grid id-two-col" style={{ gridTemplateColumns: "1fr", marginBottom: 16 }}>
          {/* Monthly Inspections Bar Chart */}
          <div className="id-card">
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Monthly Inspections</h3>
            {(data.monthly_trends && data.monthly_trends.length > 0) ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
                {data.monthly_trends.map((t, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{t.count}</span>
                    <div style={{
                      width: "100%",
                      maxWidth: 48,
                      height: `${Math.max((t.count / maxMonthly) * 120, 4)}px`,
                      background: PRIMARY,
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.4s",
                    }} />
                    <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{t.month_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}>No monthly data available</p>
            )}
          </div>

          {/* By Commodity */}
          <div className="id-card">
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>By Commodity</h3>
            {(data.commodity_stats && data.commodity_stats.length > 0) ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.commodity_stats.map((c, i) => {
                  const pct = Math.round((c.count / totalCommodity) * 100);
                  const color = COMMODITY_COLORS[c.commodity?.toUpperCase()] || ["#007890","#EC343C","#f59e0b","#8b5cf6","#10b981","#6366f1"][i % 6];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.commodity || "Unknown"}</span>
                          <span style={{ color: "#6b7280", flexShrink: 0 }}>{c.count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 4, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}>No commodity data available</p>
            )}
          </div>
        </div>

        {/* ── Recent Inspections + Top Clients ── */}
        <div className="id-grid id-two-col" style={{ gridTemplateColumns: "1fr", marginBottom: 16 }}>
          {/* Recent Inspections */}
          <div className="id-card">
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Recent Inspections</h3>
            {data.recent_inspections_list.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.recent_inspections_list.map((insp, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f9fafb", borderRadius: 8, gap: 8, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{insp.client_name}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{insp.date_of_inspection} &middot; {insp.commodity}</div>
                    </div>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 600,
                      background: insp.is_direction_present_for_this_inspection ? "#fee2e2" : "#dcfce7",
                      color: insp.is_direction_present_for_this_inspection ? "#dc2626" : "#16a34a",
                      flexShrink: 0,
                    }}>
                      {insp.is_direction_present_for_this_inspection ? "Non-Compliant" : "Compliant"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}>No recent inspections</p>
            )}
          </div>

          {/* Top Clients */}
          <div className="id-card">
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Top Clients</h3>
            {data.top_clients.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.top_clients.map((client, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "#f9fafb", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: PRIMARY + "20", color: PRIMARY, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.client_name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#6b7280", flexShrink: 0 }}>{client.count} ({client.percentage}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}>No client data</p>
            )}
          </div>
        </div>

        {/* ── Performance Summary ── */}
        <div className="id-card">
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Performance Summary</h3>
          <div className="id-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Compliance Rate", value: `${data.compliance_rate}%`, color: data.compliance_rate >= 80 ? "#16a34a" : data.compliance_rate >= 60 ? "#ca8a04" : "#dc2626" },
              { label: "This Month vs Avg", value: `${data.this_month_inspections} / ${data.avg_monthly_inspections}`, color: data.this_month_inspections >= data.avg_monthly_inspections ? "#16a34a" : "#ca8a04" },
              { label: "Recent Activity (30d)", value: fmt(data.recent_inspections), color: PRIMARY },
              { label: "Non-Compliance Rate", value: `${data.total_inspections > 0 ? (100 - data.compliance_rate).toFixed(1) : 0}%`, color: SECONDARY },
            ].map((item, i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Home Page (shows dashboard for inspectors, quick-links for others)       */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [totalClients, setTotalClients] = useState<number | null>(null);
  const [totalInspections, setTotalInspections] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [isInspector, setIsInspector] = useState(false);

  useEffect(() => {
    fetch("/api/home-stats")
      .then(r => r.json())
      .then(d => {
        setTotalClients(d.clients ?? 0);
        setTotalInspections(d.inspections ?? 0);
        setLoading(false);
      })
      .catch(() => {
        setTotalClients(0);
        setTotalInspections(0);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const userRole = d.authenticated ? (d.role || "inspector") : "inspector";
        setRole(userRole);
        if (userRole === "inspector" || userRole === "inspector_manager") {
          setIsInspector(true);
        }
      })
      .catch(() => setRole("inspector"));
  }, []);

  /* Inspector role => show inline dashboard */
  if (isInspector) {
    return <InspectorDashboard />;
  }

  const quickLinks = role
    ? ALL_QUICK_LINKS.filter(l => l.roles.includes(role))
    : [];

  const Spinner = () => (
    <div style={{
      width: "clamp(20px, 2vw, 36px)",
      height: "clamp(20px, 2vw, 36px)",
      borderRadius: "50%",
      border: "3px solid rgba(0,120,144,0.2)",
      borderTopColor: "#007890",
      animation: "spin 0.8s linear infinite",
      margin: "0 auto",
    }} />
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        .hp-wrap {
          min-height: 100%;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 24px 24px 16px;
          box-sizing: border-box;
        }
        .hp-inner {
          width: 100%;
          max-width: 1200px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* -- Header -- */
        .hp-header { text-align: center; }
        .hp-title {
          color: #fff;
          font-size: 1.6rem;
          font-weight: 700;
          margin: 0 0 4px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.45);
          line-height: 1.2;
        }
        .hp-subtitle {
          color: rgba(255,255,255,0.88);
          font-size: 0.88rem;
          font-weight: 400;
          text-shadow: 0 1px 4px rgba(0,0,0,0.35);
          margin: 0;
        }

        /* -- Stats row -- */
        .hp-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .hp-stat {
          background: rgba(255,255,255,0.96);
          border-radius: 12px;
          padding: 18px 24px;
          text-align: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          border: 1px solid rgba(255,255,255,0.6);
        }
        .hp-stat-num {
          color: #007890;
          font-size: 2.4rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 2.4rem;
        }
        .hp-stat-label {
          color: #6b7280;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          font-weight: 600;
          margin: 0;
        }

        /* -- Quick access -- */
        .hp-quick {
          background: rgba(255,255,255,0.96);
          border-radius: 12px;
          padding: 18px 20px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          border: 1px solid rgba(255,255,255,0.6);
        }
        .hp-quick-head {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 3px;
        }
        .hp-quick-desc {
          color: #4b5563;
          font-size: 0.75rem;
          line-height: 1.5;
          margin: 0 0 14px;
        }
        .hp-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        }
        .hp-link {
          width: 160px;
          flex-shrink: 0;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          padding: 14px 10px;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
          transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
        }
        .hp-link:hover {
          box-shadow: 0 6px 18px rgba(0,0,0,0.12);
          transform: translateY(-2px);
          border-color: #007890;
        }
        .hp-link-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .hp-link-title {
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          font-size: 0.78rem;
          line-height: 1.3;
        }
        .hp-link-sub {
          font-size: 0.68rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.3;
        }

        /* -- Footer note -- */
        .hp-footer {
          text-align: center;
          color: rgba(255,255,255,0.65);
          font-size: 0.68rem;
          margin: 0;
        }

        /* -- Large screens (1600px+) -- */
        @media (min-width: 1600px) {
          .hp-wrap { padding: 40px 40px 24px; }
          .hp-inner { gap: 20px; max-width: 1400px; }
          .hp-title { font-size: 2.2rem; }
          .hp-subtitle { font-size: 1rem; }
          .hp-stat { padding: 28px 32px; }
          .hp-stat-num { font-size: 3.5rem; min-height: 3.5rem; }
          .hp-stat-label { font-size: 0.78rem; }
          .hp-quick { padding: 24px 28px; }
          .hp-quick-head { font-size: 1.1rem; }
          .hp-quick-desc { font-size: 0.85rem; margin-bottom: 18px; }
          .hp-links { gap: 14px; }
          .hp-link { padding: 20px 14px; gap: 10px; }
          .hp-link-icon { width: 52px; height: 52px; font-size: 1.4rem; }
          .hp-link-title { font-size: 0.9rem; }
          .hp-link-sub { font-size: 0.75rem; }
          .hp-footer { font-size: 0.78rem; }
        }

        /* -- Very large / TV (2200px+) -- */
        @media (min-width: 2200px) {
          .hp-wrap { padding: 60px 60px 32px; }
          .hp-inner { gap: 28px; max-width: 1800px; }
          .hp-title { font-size: 3rem; }
          .hp-subtitle { font-size: 1.3rem; }
          .hp-stat { padding: 40px 48px; border-radius: 16px; }
          .hp-stat-num { font-size: 5rem; min-height: 5rem; margin-bottom: 8px; }
          .hp-stat-label { font-size: 1rem; }
          .hp-quick { padding: 32px 36px; border-radius: 16px; }
          .hp-quick-head { font-size: 1.4rem; margin-bottom: 6px; }
          .hp-quick-desc { font-size: 1.05rem; margin-bottom: 24px; }
          .hp-links { gap: 18px; }
          .hp-link { padding: 28px 18px; gap: 14px; border-radius: 14px; }
          .hp-link-icon { width: 68px; height: 68px; font-size: 1.8rem; }
          .hp-link-title { font-size: 1.1rem; }
          .hp-link-sub { font-size: 0.9rem; }
          .hp-footer { font-size: 0.95rem; }
        }

        /* -- Small / tablet -- */
        @media (max-width: 480px) {
          .hp-wrap { padding: 60px 12px 16px; }
          .hp-link { width: 140px; }
        }
      `}</style>

      <div className="hp-wrap">
        <div className="hp-inner">

          {/* Header */}
          <div className="hp-header">
            <h1 className="hp-title">Welcome to Food Safety Agency</h1>
            <p className="hp-subtitle">Your comprehensive food safety management platform</p>
          </div>

          {/* Stats */}
          <div className="hp-stats">
            <div className="hp-stat">
              <div className="hp-stat-num">
                {loading ? <Spinner /> : totalClients?.toLocaleString()}
              </div>
              <p className="hp-stat-label">Total Clients</p>
            </div>
            <div className="hp-stat">
              <div className="hp-stat-num">
                {loading ? <Spinner /> : totalInspections?.toLocaleString()}
              </div>
              <p className="hp-stat-label">Total Inspections</p>
            </div>
          </div>

          {/* Quick Access */}
          <div className="hp-quick">
            <h2 className="hp-quick-head">Quick Access</h2>
            <p className="hp-quick-desc">
              Data syncs automatically every hour in the background.
              Use the navigation menu to access all platform features.
            </p>
            {role === null ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: 13, padding: "8px 0" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #e5e7eb", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                Loading...
              </div>
            ) : (
              <div className="hp-links">
                {quickLinks.map(link => (
                  <a key={link.href} href={link.href} className="hp-link">
                    <div className="hp-link-icon" style={{ background: link.bg }}>
                      <i className={link.icon} style={{ color: link.color }} />
                    </div>
                    <div>
                      <p className="hp-link-title">{link.title}</p>
                      <p className="hp-link-sub">{link.sub}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="hp-footer">Food Safety Agency (Pty) Ltd -- Inspection Management System</p>

        </div>
      </div>
    </>
  );
}
