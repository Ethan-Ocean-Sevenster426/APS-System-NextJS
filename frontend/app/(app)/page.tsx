"use client";

import { useState, useEffect, useRef } from "react";

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
interface MonthlyInspection {
  month: string;
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
  monthly_inspections: MonthlyInspection[];
  monthly_trends: MonthlyTrend[];
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
  POULTRY: "#3b82f6",
  RAW: "#ef4444",
  PMP: "#f59e0b",
  EGGS: "#8b5cf6",
  EGG: "#8b5cf6",
  DAIRY: "#10b981",
};

function getCommodityColor(commodity: string, index: number): string {
  const upper = (commodity || "").toUpperCase();
  if (COMMODITY_COLORS[upper]) return COMMODITY_COLORS[upper];
  const fallback = ["#007890", "#EC343C", "#f59e0b", "#10b981", "#8b5cf6", "#64748b"];
  return fallback[index % fallback.length];
}

const fmtR = (n: number) => "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtR0 = (n: number) => "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/* ─── Tooltip component ─── */
function InfoTip({ tip }: { tip: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <i className="fas fa-circle-info" style={{ fontSize: "0.7rem", color: show ? "#007890" : "#9ca3af", marginLeft: 4, transition: "color 0.15s" }} />
      {show && (
        <>
          <span style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
            background: "#1e293b", color: "#f1f5f9", fontSize: "0.72rem", fontWeight: 400, lineHeight: 1.45,
            padding: "8px 12px", borderRadius: 8, whiteSpace: "normal", width: 230, textAlign: "left",
            zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", textTransform: "none", letterSpacing: 0,
          }}>
            {tip}
          </span>
          <span style={{
            position: "absolute", bottom: "calc(100% + 2px)", left: "50%", transform: "translateX(-50%)",
            borderWidth: 5, borderStyle: "solid", borderColor: "#1e293b transparent transparent transparent",
            zIndex: 9999,
          }} />
        </>
      )}
    </span>
  );
}

/* ─── KPI status badge (large, for header) ─── */
function KpiStatusBadgeLarge({ status }: { status: string }) {
  if (status === "on_track") {
    return (
      <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 14px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }}>
        <i className="fas fa-check-circle" style={{ marginRight: 4 }} /> On Track
      </span>
    );
  }
  if (status === "slightly_behind") {
    return (
      <span style={{ background: "#fef9c3", color: "#854d0e", padding: "4px 14px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }}>
        <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }} /> Slightly Behind
      </span>
    );
  }
  if (status === "behind") {
    return (
      <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 14px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }}>
        <i className="fas fa-times-circle" style={{ marginRight: 4 }} /> Falling Behind
      </span>
    );
  }
  return null;
}

/* ─── KPI status badge (small, for rows) ─── */
function KpiStatusBadgeSmall({ status }: { status: string }) {
  if (status === "on_track") {
    return (
      <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700 }}>
        <i className="fas fa-check" style={{ marginRight: 2 }} /> On Track
      </span>
    );
  }
  if (status === "slightly_behind") {
    return (
      <span style={{ background: "#fef9c3", color: "#854d0e", padding: "2px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700 }}>
        <i className="fas fa-exclamation" style={{ marginRight: 2 }} /> Slightly Behind
      </span>
    );
  }
  return (
    <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700 }}>
      <i className="fas fa-times" style={{ marginRight: 2 }} /> Behind
    </span>
  );
}

/* ─── Progress bar fill color by status ─── */
function statusBarColor(status: string): string {
  if (status === "on_track") return "#22c55e";
  if (status === "slightly_behind") return "#facc15";
  return "#ef4444";
}

/* ─── Status text color by status ─── */
function statusTextColor(status: string): string {
  if (status === "on_track") return "#16a34a";
  if (status === "slightly_behind") return "#ca8a04";
  return "#dc2626";
}

/* ─── Card style ─── */
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  border: "1px solid #e5e7eb",
  transition: "box-shadow 0.2s, transform 0.2s",
};

/* ─── Section title style ─── */
const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "1rem",
  display: "flex",
  alignItems: "center",
  gap: 6,
  margin: 0,
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Inspector Dashboard Component                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function InspectorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const monthlyChartRef = useRef<HTMLCanvasElement>(null);
  const commodityChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch("/api/inspector-dashboard", { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`Status ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  /* Chart.js rendering */
  useEffect(() => {
    if (!data) return;

    let monthlyChart: any = null;
    let commodityChart: any = null;

    const loadCharts = async () => {
      try {
        const ChartJS = (await import("chart.js/auto")).default;

        // Monthly bar+line chart
        const monthlyData = data.monthly_inspections || [];
        if (monthlyChartRef.current && monthlyData.length > 0) {
          const ctx = monthlyChartRef.current.getContext("2d");
          if (ctx) {
            const labels = monthlyData.map(d => {
              const dt = new Date(d.month);
              return dt.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
            });
            const counts = monthlyData.map(d => d.count);
            monthlyChart = new ChartJS(ctx, {
              type: "bar",
              data: {
                labels,
                datasets: [
                  {
                    label: "Inspections",
                    data: counts,
                    backgroundColor: "rgba(0,120,144,0.2)",
                    borderColor: "#007890",
                    borderWidth: 2,
                    borderRadius: 6,
                    type: "bar" as const,
                  },
                  {
                    label: "Trend",
                    data: counts,
                    borderColor: "#EC343C",
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: "#EC343C",
                    fill: false,
                    tension: 0.4,
                    type: "line" as const,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } }, grid: { color: "rgba(0,0,0,0.05)" } },
                  x: { ticks: { font: { size: 11 } }, grid: { display: false } },
                },
              },
            });
          }
        }

        // Commodity doughnut chart
        const commodityData = data.commodity_stats || [];
        if (commodityChartRef.current && commodityData.length > 0) {
          const ctx = commodityChartRef.current.getContext("2d");
          if (ctx) {
            const labels = commodityData.map(d => d.commodity || "Unknown");
            const counts = commodityData.map(d => d.count);
            const colors = labels.map((l, i) => getCommodityColor(l, i));
            commodityChart = new ChartJS(ctx, {
              type: "doughnut",
              data: {
                labels,
                datasets: [{ data: counts, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "65%",
                plugins: { legend: { display: false } },
              },
            });
          }
        }
      } catch {
        // Chart.js not available - charts will just not render
      }
    };

    loadCharts();

    return () => {
      if (monthlyChart) monthlyChart.destroy();
      if (commodityChart) commodityChart.destroy();
    };
  }, [data]);

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

  const totalInsp = data.total_inspections || 0;
  const nonCompRate = totalInsp > 0 ? Math.round((data.non_compliant_inspections / totalInsp) * 100) : 0;
  const monthVsAvgPct = data.avg_monthly_inspections > 0
    ? Math.min(100, Math.round((data.this_month_inspections / data.avg_monthly_inspections) * 100))
    : 0;
  const recentBarPct = totalInsp > 0 ? Math.min(100, Math.round((data.recent_inspections / totalInsp) * 100)) : 0;
  const complianceColor = data.compliance_rate >= 80 ? "#059669" : data.compliance_rate >= 60 ? "#d97706" : "#dc2626";
  const totalQuarterPct = data.kpi_total_target > 0 ? Math.min(100, Math.round((data.kpi_actual_total / data.kpi_total_target) * 100)) : 0;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 640px) {
          .id-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div style={{ width: "100%", padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── 4 Stat Cards ── */}
        <div className="id-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {/* Larger screens: 4 columns */}
          <style>{`@media (min-width: 1024px) { .id-stat-grid { grid-template-columns: repeat(4, 1fr) !important; } }`}</style>

          {/* Total Inspections */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  Total Inspections
                  <InfoTip tip="The total number of food safety inspections you have ever completed since you started. Each visit to a client to check food safety rules counts as one inspection." />
                </p>
                <p style={{ fontSize: "1.875rem", fontWeight: 700, color: "#2563eb", marginTop: 4, marginBottom: 0, lineHeight: 1 }}>{data.total_inspections || 0}</p>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4, marginBottom: 0 }}>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>{data.this_month_inspections || 0}</span> this month
                </p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0, background: "#eff6ff", color: "#2563eb" }}>
                <i className="fas fa-clipboard-check" />
              </div>
            </div>
          </div>

          {/* Last 30 Days */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  Last 30 Days
                  <InfoTip tip="How many inspections you completed in the past 30 days. The average below shows your normal monthly pace so you can see if you're doing more or less than usual." />
                </p>
                <p style={{ fontSize: "1.875rem", fontWeight: 700, color: "#059669", marginTop: 4, marginBottom: 0, lineHeight: 1 }}>{data.recent_inspections || 0}</p>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4, marginBottom: 0 }}>
                  <span style={{ color: "#2563eb", fontWeight: 600 }}>{data.avg_monthly_inspections || 0}</span> avg/month
                </p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0, background: "#ecfdf5", color: "#059669" }}>
                <i className="fas fa-chart-line" />
              </div>
            </div>
          </div>

          {/* Compliance Rate */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  Compliance Rate
                  <InfoTip tip="Out of all the places you inspected, the percentage that were following the food safety rules. A higher number is better -- 100% means every single place passed!" />
                </p>
                <p style={{ fontSize: "1.875rem", fontWeight: 700, color: complianceColor, marginTop: 4, marginBottom: 0, lineHeight: 1 }}>{data.compliance_rate || 0}%</p>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4, marginBottom: 0 }}>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>{data.compliant_inspections || 0}</span> compliant
                </p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0, background: "#faf5ff", color: "#7c3aed" }}>
                <i className="fas fa-shield-alt" />
              </div>
            </div>
          </div>

          {/* Non-Compliant */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  Non-Compliant
                  <InfoTip tip="Places that were NOT following the food safety rules when you visited. A direction (official notice to fix the problem) was issued. Lower is better -- zero means no issues found!" />
                </p>
                <p style={{ fontSize: "1.875rem", fontWeight: 700, color: "#dc2626", marginTop: 4, marginBottom: 0, lineHeight: 1 }}>{data.non_compliant_inspections || 0}</p>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4, marginBottom: 0 }}>directions issued</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0, background: "#fef2f2", color: "#dc2626" }}>
                <i className="fas fa-exclamation-triangle" />
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Tracker ── */}
        {data.has_targets ? (
          <div style={{ ...cardStyle, padding: 20 }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>
                <i className="fas fa-bullseye" style={{ color: PRIMARY }} /> {data.quarter_label} KPI Tracker
                <InfoTip tip="KPI means Key Performance Indicator -- these are your inspection targets for this quarter (a 3-month period). This section shows how many inspections you need to do vs how many you have already done." />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  Quarter progress: <span style={{ fontWeight: 700, color: "#374151" }}>{data.quarter_progress_display}%</span>
                  <InfoTip tip="How far through the quarter we are today. For example, 86% means we are near the end of the quarter and you have little time left to hit your targets!" />
                </div>
                <KpiStatusBadgeLarge status={data.kpi_overall_status} />
              </div>
            </div>

            {/* Quarter total bar */}
            {data.kpi_total_target > 0 && (
              <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: "#374151" }}>Total Inspections This Quarter</span>
                  <span style={{ fontWeight: 700, color: "#374151" }}>{data.kpi_actual_total} / {data.kpi_total_target}</span>
                </div>
                <div style={{ height: 10, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, width: `${totalQuarterPct}%`, background: statusBarColor(data.kpi_overall_status), transition: "width 0.6s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>
                  <span>0</span>
                  <span>
                    Expected by now: ~{data.quarter_progress_display}% of target
                    <InfoTip tip="Based on how much of the quarter has passed, this is roughly how many inspections you should have completed by today to be on track. If your actual number is below this, you are behind pace." />
                  </span>
                  <span>{data.kpi_total_target}</span>
                </div>
              </div>
            )}

            {/* Per-commodity cards */}
            <div className="id-kpi-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              <style>{`
                @media (min-width: 640px) { .id-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; } }
                @media (min-width: 1024px) { .id-kpi-grid { grid-template-columns: repeat(4, 1fr) !important; } }
              `}</style>
              {data.kpi_rows.filter(row => row.target > 0).map((row) => (
                <div key={row.commodity} style={{ borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", background: "#fff" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</span>
                    <KpiStatusBadgeSmall status={row.status} />
                  </div>
                  {/* Done / Target big numbers */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 8 }}>
                    <span style={{ fontSize: "1.875rem", fontWeight: 900, color: statusTextColor(row.status), lineHeight: 1 }}>{row.actual}</span>
                    <span style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: 2 }}>/ {row.target}</span>
                  </div>
                  {/* Still need message */}
                  {row.still_needed === 0 ? (
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16a34a", marginBottom: 8, marginTop: 0 }}>
                      <i className="fas fa-check-circle" style={{ marginRight: 4 }} /> Target reached!
                    </p>
                  ) : (
                    <p style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 600, marginBottom: 8, marginTop: 0 }}>
                      <i className="fas fa-arrow-up" style={{ marginRight: 4 }} /> Still need <strong>{row.still_needed}</strong> more to hit target of {row.target}
                      <InfoTip tip={`You need to do ${row.still_needed} more ${row.label} inspections before the end of this quarter to reach your target of ${row.target}.`} />
                    </p>
                  )}
                  {/* Progress bar */}
                  <div style={{ height: 8, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${row.pct_of_target}%`, background: statusBarColor(row.status), transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginTop: 4 }}>
                    <span style={{ color: "#9ca3af" }}>0</span>
                    <span style={{ fontWeight: 700, color: statusTextColor(row.status) }}>{row.pct_of_target}%</span>
                    <span style={{ color: "#9ca3af" }}>{row.target}</span>
                  </div>
                  {/* Expected by now hint */}
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f3f4f6", fontSize: "0.75rem", color: "#9ca3af" }}>
                    Expected by now: <span style={{ fontWeight: 600, color: "#4b5563" }}>~{row.expected_by_now}</span>
                    <InfoTip tip={`If you were doing inspections at a steady pace since the start of the quarter, you should have done about ${row.expected_by_now} ${row.label} inspections by today. Compare this to your actual number above.`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* No formal targets -- show actual quarterly counts */
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>
                <i className="fas fa-bullseye" style={{ color: PRIMARY }} /> {data.quarter_label} Quarterly Inspections
              </div>
              <span style={{ background: "#fef9c3", color: "#854d0e", padding: "4px 14px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }} /> No Targets Set
              </span>
            </div>

            {/* Quarter total */}
            <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Total Inspections This Quarter</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "#007890" }}>{data.kpi_actual_total}</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4, marginBottom: 0 }}>
                {data.quarter_progress_display}% through {data.quarter_label} &middot; Ask your manager to set quarterly targets to track KPI progress
              </p>
            </div>

            {/* Per-commodity actual counts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <style>{`@media (min-width: 640px) { .id-no-target-grid { grid-template-columns: repeat(4, 1fr) !important; } }`}</style>
              {data.kpi_rows.map((row) => (
                <div key={row.commodity} style={{ borderRadius: 8, padding: 12, textAlign: "center", background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{row.label}</div>
                  <div style={{ fontSize: "1.875rem", fontWeight: 900, color: "#007890" }}>{row.actual}</div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>this quarter</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Profitability Calculator ── */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>
              <i className="fas fa-calculator" style={{ color: PRIMARY }} /> {data.quarter_label} Profitability
              <InfoTip tip="This shows whether the company makes or loses money from your inspections. Revenue is what you earn; costs are what it costs to employ you. If revenue is more than costs, it's profitable (green). If costs are more, it's a loss (red)." />
            </div>
            {data.profitability.has_data && (
              data.profitability.is_profitable ? (
                <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 14px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: 4 }} /> Profitable
                </span>
              ) : (
                <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 14px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }}>
                  <i className="fas fa-times-circle" style={{ marginRight: 4 }} /> Not Profitable
                </span>
              )
            )}
          </div>

          {!data.profitability.has_data ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0, background: "#f9fafb", color: "#9ca3af" }}>
                <i className="fas fa-chart-pie" />
              </div>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>No revenue or cost data available for this quarter yet. Salary and rate configuration may be needed.</p>
            </div>
          ) : (
            <>
              <div className="id-profit-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
                <style>{`@media (min-width: 1024px) { .id-profit-grid { grid-template-columns: repeat(3, 1fr) !important; } }`}</style>

                {/* Revenue */}
                <div style={{ borderRadius: 8, padding: 16, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, marginTop: 0 }}>
                    <i className="fas fa-arrow-up" style={{ marginRight: 4 }} /> Revenue This Quarter
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.875rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                        Hours ({data.profitability.total_hours}h x R{data.profitability.hourly_rate})
                        <InfoTip tip={`You spent ${data.profitability.total_hours} hours doing inspections this quarter. Each hour earns R${data.profitability.hourly_rate}, so: ${data.profitability.total_hours} x R${data.profitability.hourly_rate} = ${fmtR(data.profitability.rev_hours)}.`} />
                      </span>
                      <span style={{ fontWeight: 600 }}>{fmtR(data.profitability.rev_hours)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                        KM ({data.profitability.total_km}km x R{data.profitability.km_rate})
                        <InfoTip tip={`You drove ${data.profitability.total_km} km to reach inspection sites this quarter. Every km earns R${data.profitability.km_rate} travel money, so: ${data.profitability.total_km} x R${data.profitability.km_rate} = ${fmtR(data.profitability.rev_km)}.`} />
                      </span>
                      <span style={{ fontWeight: 600 }}>{fmtR(data.profitability.rev_km)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                        Samples ({data.profitability.total_samples} x R{data.profitability.sample_rate})
                        <InfoTip tip={`You collected ${data.profitability.total_samples} food samples this quarter. Each sample earns R${data.profitability.sample_rate}, so: ${data.profitability.total_samples} x R${data.profitability.sample_rate} = ${fmtR(data.profitability.rev_samples)}.`} />
                      </span>
                      <span style={{ fontWeight: 600 }}>{fmtR(data.profitability.rev_samples)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #bbf7d0", paddingTop: 8, marginTop: 4 }}>
                      <span style={{ fontWeight: 700, color: "#166534" }}>
                        Total Revenue
                        <InfoTip tip={`All your earnings added together: hours + km + samples = ${fmtR(data.profitability.actual_revenue)}. This is the total money you generated for the company this quarter.`} />
                      </span>
                      <span style={{ fontWeight: 700, color: "#166534" }}>{fmtR(data.profitability.actual_revenue)}</span>
                    </div>
                  </div>
                  {data.profitability.revenue_target > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280", marginBottom: 4 }}>
                        <span>vs Target ({fmtR0(data.profitability.revenue_target)})</span>
                        <span style={{ fontWeight: 700 }}>{data.profitability.rev_target_pct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3, transition: "width 0.6s ease",
                          width: `${data.profitability.rev_target_pct}%`,
                          background: data.profitability.rev_target_pct >= 80 ? "#22c55e" : data.profitability.rev_target_pct >= 50 ? "#facc15" : "#ef4444",
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Costs */}
                <div style={{ borderRadius: 8, padding: 16, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, marginTop: 0 }}>
                    <i className="fas fa-arrow-down" style={{ marginRight: 4 }} /> Costs This Quarter
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.875rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                        Operational Expense ({fmtR0(data.profitability.monthly_salary)} x 3 months)
                        <InfoTip tip={`Your monthly operational expense (salary) is ${fmtR0(data.profitability.monthly_salary)}. A quarter has 3 months, so the total for the quarter is ${fmtR0(data.profitability.monthly_salary)} x 3 = ${fmtR(data.profitability.quarterly_salary)}.`} />
                      </span>
                      <span style={{ fontWeight: 600 }}>{fmtR(data.profitability.quarterly_salary)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                        Vehicle ({fmtR0(data.profitability.monthly_vehicle)} x 3 months)
                        <InfoTip tip="Monthly vehicle costs (e.g. car payment or allowance) multiplied by 3 months to get the full quarterly cost." />
                      </span>
                      <span style={{ fontWeight: 600 }}>{fmtR(data.profitability.quarterly_vehicle)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                        Other ({fmtR0(data.profitability.monthly_other)} x 3 months)
                        <InfoTip tip="Any other monthly costs (e.g. equipment, phone) multiplied by 3 months to get the full quarterly cost." />
                      </span>
                      <span style={{ fontWeight: 600 }}>{fmtR(data.profitability.quarterly_other)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #fed7aa", paddingTop: 8, marginTop: 4 }}>
                      <span style={{ fontWeight: 700, color: "#9a3412" }}>
                        Total Costs
                        <InfoTip tip={`Everything it costs to employ you for this quarter: salary + vehicle + other expenses = ${fmtR(data.profitability.quarterly_costs)}.`} />
                      </span>
                      <span style={{ fontWeight: 700, color: "#9a3412" }}>{fmtR(data.profitability.quarterly_costs)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Result */}
                <div style={{
                  borderRadius: 8, padding: 16,
                  background: data.profitability.is_profitable ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${data.profitability.is_profitable ? "#bbf7d0" : "#fecaca"}`,
                }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, marginTop: 0, color: data.profitability.is_profitable ? "#15803d" : "#b91c1c" }}>
                    <i className="fas fa-balance-scale" style={{ marginRight: 4 }} /> Net Result
                    <InfoTip tip="Revenue minus costs. If this number is green (positive), the company made money from your inspections this quarter. If it is red (negative), the costs were more than the revenue -- meaning the company spent more on you than you earned back." />
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 96 }}>
                    <p style={{ fontSize: "1.875rem", fontWeight: 900, color: data.profitability.is_profitable ? "#15803d" : "#b91c1c", margin: 0 }}>
                      {data.profitability.net_profit >= 0 ? "+" : ""}{fmtR(data.profitability.net_profit)}
                    </p>
                    <p style={{ fontSize: "0.75rem", marginTop: 4, marginBottom: 0, color: data.profitability.is_profitable ? "#16a34a" : "#dc2626" }}>
                      Revenue minus costs
                    </p>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Revenue</span>
                      <span style={{ fontWeight: 600, color: "#15803d" }}>{fmtR(data.profitability.actual_revenue)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e5e7eb", paddingTop: 4 }}>
                      <span>Costs</span>
                      <span style={{ fontWeight: 600, color: "#c2410c" }}>{fmtR(data.profitability.quarterly_costs)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Charts Row ── */}
        <div className="id-charts-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <style>{`@media (min-width: 1024px) { .id-charts-grid { grid-template-columns: 2fr 1fr !important; } }`}</style>

          {/* Monthly Inspections Chart */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ ...sectionTitleStyle, marginBottom: 16 }}>
              <i className="fas fa-chart-area" style={{ color: PRIMARY }} /> Monthly Inspections
            </div>
            <div style={{ position: "relative", height: 220 }}>
              <canvas ref={monthlyChartRef} />
            </div>
          </div>

          {/* By Commodity */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ ...sectionTitleStyle, marginBottom: 16 }}>
              <i className="fas fa-layer-group" style={{ color: PRIMARY }} /> By Commodity
            </div>
            <div style={{ position: "relative", height: 220 }}>
              <canvas ref={commodityChartRef} />
            </div>
            {/* Commodity legend */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {(data.commodity_stats || []).map((d, i) => {
                const pct = totalInsp > 0 ? Math.round(d.count / totalInsp * 100) : 0;
                const color = getCommodityColor(d.commodity, i);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: color }} />
                      <span style={{ fontWeight: 500 }}>{d.commodity || "Unknown"}</span>
                    </div>
                    <span style={{ color: "#6b7280" }}>{d.count} <span style={{ color: "#9ca3af" }}>({pct}%)</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Recent Inspections + Top Clients ── */}
        <div className="id-bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <style>{`@media (min-width: 1024px) { .id-bottom-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>

          {/* Recent Inspections */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ ...sectionTitleStyle, marginBottom: 16 }}>
              <i className="fas fa-history" style={{ color: PRIMARY }} /> Recent Inspections
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.recent_inspections_list.length > 0 ? (
                data.recent_inspections_list.map((insp, i) => {
                  const isCompliant = !insp.is_direction_present_for_this_inspection;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderRadius: 8, background: "#f9fafb",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#f9fafb")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: isCompliant ? "#22c55e" : "#ef4444" }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: "0.875rem", fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{insp.client_name || "Unknown"}</p>
                          <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}>
                            {insp.date_of_inspection} &middot; {insp.commodity || "\u2014"}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 999,
                        fontSize: "0.7rem", fontWeight: 600, flexShrink: 0, marginLeft: 8,
                        background: isCompliant ? "#dcfce7" : "#fee2e2",
                        color: isCompliant ? "#15803d" : "#b91c1c",
                      }}>
                        {isCompliant ? "Compliant" : "Non-Compliant"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                  <i className="fas fa-clipboard-list" style={{ fontSize: "1.875rem", marginBottom: 12, display: "block" }} />
                  <p style={{ fontSize: "0.875rem", margin: 0 }}>No inspections found</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Clients */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ ...sectionTitleStyle, marginBottom: 16 }}>
              <i className="fas fa-store" style={{ color: PRIMARY }} /> Top Clients
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.top_clients.length > 0 ? (
                data.top_clients.slice(0, 8).map((client, i) => {
                  const maxCount = data.top_clients[0]?.count || 1;
                  const pct = Math.round((client.count / maxCount) * 100);
                  const color = getCommodityColor("", i);
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }} title={client.client_name}>
                          {client.client_name || "Unknown"}
                        </span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4b5563" }}>{client.count}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: color, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: "0.875rem", color: "#9ca3af", textAlign: "center", padding: "24px 0", margin: 0 }}>No data</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Performance Summary ── */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ ...sectionTitleStyle, marginBottom: 16 }}>
            <i className="fas fa-trophy" style={{ color: PRIMARY }} /> Performance Summary
          </div>
          <div className="id-perf-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
            <style>{`
              @media (min-width: 640px) { .id-perf-grid { grid-template-columns: repeat(2, 1fr) !important; } }
              @media (min-width: 1024px) { .id-perf-grid { grid-template-columns: repeat(4, 1fr) !important; } }
            `}</style>

            {/* Compliance Rate */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: 6 }}>
                <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                  Compliance Rate
                  <InfoTip tip="The percentage of all your inspections where the client was following the rules. 100% is perfect -- it means every place you visited passed the food safety check!" />
                </span>
                <span style={{ fontWeight: 700, color: "#16a34a" }}>{data.compliance_rate || 0}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${data.compliance_rate || 0}%`, background: "#22c55e", transition: "width 0.6s ease" }} />
              </div>
            </div>

            {/* This Month vs Avg */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: 6 }}>
                <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                  This Month vs Avg
                  <InfoTip tip="Compares how many inspections you did this month (left number) to your usual monthly average (right number). If the left is higher, you're having a great month!" />
                </span>
                <span style={{ fontWeight: 700, color: "#2563eb" }}>{data.this_month_inspections || 0} / {data.avg_monthly_inspections || 0}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${monthVsAvgPct}%`, background: "#3b82f6", transition: "width 0.6s ease" }} />
              </div>
            </div>

            {/* Recent Activity (30d) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: 6 }}>
                <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                  Recent Activity (30d)
                  <InfoTip tip="How active you've been in the last 30 days. The bar fills up relative to your busiest recorded month, so you can quickly see if you're in a busy or quiet period." />
                </span>
                <span style={{ fontWeight: 700, color: "#7c3aed" }}>{data.recent_inspections || 0}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${recentBarPct}%`, background: "#8b5cf6", transition: "width 0.6s ease" }} />
              </div>
            </div>

            {/* Non-Compliance Rate */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: 6 }}>
                <span style={{ color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                  Non-Compliance Rate
                  <InfoTip tip="The percentage of your inspections where the client failed the food safety check. Lower is better -- 0% means every place you visited was following the rules." />
                </span>
                <span style={{ fontWeight: 700, color: "#dc2626" }}>{nonCompRate}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${nonCompRate}%`, background: "#ef4444", transition: "width 0.6s ease" }} />
              </div>
            </div>
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
