"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import InspectorDashboard from "@/components/InspectorDashboard";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Radar } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend
);
// DO NOT register ChartDataLabels globally — pass per-chart via plugins prop

// ── Types ──────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  totalInspections: number;
  complianceRate: number;
  activeInspectors: number;
  totalHours: number;
  avgHours: number;
  totalOccurrenceReports: number;
  complianceByCommodity: { commodity: string; total: number; compliant: number; non_compliant: number; compliance_rate: number }[];
  commodityAnalysis: { commodity: string; total_inspections: number }[];
  samplesByCommodity: { commodity: string; count: number }[];
  facilityTypeDistribution: { facility_type: string; count: number }[];
  monthlyCommodityTrends: { month: string; commodity: string; count: number }[];
  monthlyComplianceTrend: { month: string; commodity: string; total: number; compliant: number; compliance_rate: number }[];
  weeklyComplianceTrend: { week: string; total: number; compliant: number; compliance_rate: number }[];
  dailyComplianceTrend: { day: string; commodity: string; total: number; compliant: number; compliance_rate: number }[];
  timeAllocation: { inspector_name: string; total_hours: number }[];
  inspectionsList: { date_of_inspection: string; inspector_name: string; client_name: string; commodity: string; facility_type: string; is_sample_taken: boolean; approved_status: string; town: string }[];
  inspectorPerformance: { inspector_name: string; total_inspections: number; compliant: number; non_compliant: number }[];
  occurrenceReports: { inspector_name: string; count: number }[];
  directionsPerInspector: { inspector_name: string; total: number; directions: number; non_compliant_products: number }[];
  travelPerInspector: { inspector_name: string; total_km: number; total_hours: number; inspection_count: number; avg_km: number }[];
  inspectorCommodityMatrix: { inspector_name: string; commodity: string; count: number }[];
  inspectorSampleMatrix: { inspector_name: string; commodity: string; count: number }[];
  approvalPerInspector: { inspector_name: string; total: number; approved: number; pending: number }[];
  monthlyInspectorTrend: { day: string; inspector_name: string; count: number; total_km: number; total_hours: number; samples: number }[];
  inspectorFinancials: { inspector_name: string; total_inspections: number; total_hours: number; total_km: number; total_samples: number; inspection_time: number; revenue_hours: number; revenue_km: number; revenue_samples: number; total_revenue: number }[];
  financialSummary: { total_revenue: number; hourly_rate: number; km_rate: number; sample_rate: number };
  monthlyOccurrenceTrend: { month: string; count: number }[];
  monthlyTravelTrend: { month: string; total_km: number }[];
  monthlyDocSendTrend: { month: string; avg_days: number; count: number }[];
  weeklyDocSendTrend: { week: string; avg_days: number; count: number }[];
  monthlyInvoiceTrend: { month: string; avg_days: number; count: number }[];
  weeklyInvoiceTrend: { week: string; avg_days: number; count: number }[];
  monthlyInspectionsTrend: { month: string; count: number }[];
  monthlyCoaTrend: { month: string; avg_days: number; count: number }[];
  weeklyCoaTrend: { week: string; avg_days: number; count: number }[];
  monthlyApprovalTrend: { month: string; avg_days: number; count: number }[];
  weeklyApprovalTrend: { week: string; avg_days: number; count: number }[];
  monthlyTravelHoursTrend: { month: string; total_hours: number }[];
  docSendTime: { name: string; avg_days: number; count: number }[];
  invoiceUploadTime: { name: string; avg_days: number; count: number }[];
  coaAnalysisTime: { commodity: string; avg_days: number; count: number }[];
  approvalTime: { inspector_name: string; avg_days: number; count: number }[];
  travelTimePerInspector: { inspector_name: string; total_hours: number }[];
  filterOptions: { inspectors: string[]; commodities: string[]; years: number[] };
  inspectorTargets: Record<string, { eggs: number; poultry: number; raw: number; pmp: number; raw_samples: number; pmp_samples: number; total_samples: number }>;
  nonInspectorNames: string[];
  salaries?: Record<string, { salary: number; employee_number: string }>;
  quarterlyTargets?: Record<string, { inspector_name: string; year: number; quarter: number; eggs: number; poultry: number; raw: number; pmp: number; raw_samples: number; pmp_samples: number }>;
}

interface QuarterlyTarget {
  inspector_name: string; year: number; quarter: number;
  eggs: number; poultry: number; raw: number; pmp: number;
  raw_samples: number; pmp_samples: number;
}

interface Filters {
  date_from: string;
  date_to: string;
  year: string;
  month: string;
  inspector: string[];
  commodity: string[];
}

interface UserInfo {
  authenticated: boolean;
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "inspector" | "inspector_manager" | "admin" | "super_admin" | "lab_technician" | "developer" | "financial";
}

// ── Constants ──────────────────────────────────────────────────────────────────

const COMMODITY_COLORS: Record<string, string> = {
  EGG: "#f59e0b",
  PMP: "#3b82f6",
  POULTRY: "#10b981",
  RAW: "#ef4444",
};

const CHART_PALETTE = [
  "#0078d4", "#107c10", "#f59e0b", "#d13438", "#8764b8",
  "#e3008c", "#00b7c3", "#7fba00", "#ff6f00", "#6a1b9a",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type PanelKey = "overview" | "inspectors" | "compliance" | "operations" | "timelines" | "financial";

const PANELS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "fas fa-tachometer-alt" },
  { key: "inspectors", label: "Inspectors", icon: "fas fa-user-tie" },
  { key: "compliance", label: "Compliance", icon: "fas fa-shield-alt" },
  { key: "operations", label: "Operations", icon: "fas fa-route" },
  { key: "timelines", label: "Timelines", icon: "fas fa-file-alt" },
  { key: "financial", label: "Financial", icon: "fas fa-chart-bar" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtMonth(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
}

function fmtDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

function fmtRand(v: number): string {
  return "R" + v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function colorForCommodity(c: string): string {
  const key = c?.toUpperCase?.() ?? "";
  if (key.includes("EGG")) return COMMODITY_COLORS.EGG;
  if (key.includes("PMP")) return COMMODITY_COLORS.PMP;
  if (key.includes("POULTRY")) return COMMODITY_COLORS.POULTRY;
  if (key.includes("RAW")) return COMMODITY_COLORS.RAW;
  return "#6b7280";
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Look up salary by inspector full name. Salaries are keyed by lowercase last name (e.g. "dlamini"). */
function lookupSalary(salaries: Record<string, { salary: number; employee_number: string }>, fullName: string): number {
  // Try exact full name lowercase first
  const exact = salaries[fullName.toLowerCase()];
  if (exact) return exact.salary ?? 0;
  // Try last name (last word)
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 1) {
    const lastName = parts[parts.length - 1].toLowerCase();
    const byLast = salaries[lastName];
    if (byLast) return byLast.salary ?? 0;
  }
  // Try first name
  if (parts.length > 0) {
    const firstName = parts[0].toLowerCase();
    const byFirst = salaries[firstName];
    if (byFirst) return byFirst.salary ?? 0;
  }
  return 0;
}

/** Exclude EGG and POULTRY from samples data — they don't take samples */
const EXCLUDED_SAMPLE_COMMODITIES = ["EGG", "EGGS", "POULTRY"];
function isSampleCommodity(commodity: string): boolean {
  return !EXCLUDED_SAMPLE_COMMODITIES.includes(commodity?.toUpperCase?.() ?? "");
}

// ── Shared Chart Defaults ──────────────────────────────────────────────────────

const lineDefaults = { tension: 0.3, fill: false, pointRadius: 3, borderWidth: 2 };

function baseChartOptions(title?: string, yLabel?: string, opts?: { datalabels?: boolean; datalabelColor?: string; datalabelSuffix?: string; datalabelFormatter?: (v: number) => string }): Record<string, unknown> {
  const showLabels = opts?.datalabels !== false; // default true
  const suffix = opts?.datalabelSuffix ?? "";
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, labels: { boxWidth: 12, font: { size: 11 } } },
      title: title ? { display: true, text: title, font: { size: 13 } } : { display: false },
      datalabels: showLabels ? {
        anchor: "end" as const,
        align: "end" as const,
        offset: -2,
        font: { size: 9, weight: "bold" as const },
        color: opts?.datalabelColor ?? "#fff",
        formatter: opts?.datalabelFormatter ?? ((v: unknown) => { const n = Number(v); return !n || isNaN(n) ? "" : (Number.isInteger(n) ? String(n) + suffix : n.toFixed(1) + suffix); }),
        clamp: true,
        clip: false,
      } : { display: false },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { beginAtZero: true, ticks: { font: { size: 10 } }, title: yLabel ? { display: true, text: yLabel, font: { size: 11 } } : undefined },
    },
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-tooltip">
      <i className="fas fa-info-circle" style={{ color: "#9ca3af", fontSize: 13 }} />
      <span className="info-tooltip-text">{text}</span>
    </span>
  );
}

function Card({ title, icon, children, className = "", headerRight, subtitle, tooltip }: { title: string; icon?: string; children: React.ReactNode; className?: string; headerRight?: React.ReactNode; subtitle?: string; tooltip?: string }) {
  return (
    <div className={`analytics-card bg-white rounded-md border border-gray-200 ${className}`} style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", marginBottom: 5, overflow: "hidden", maxWidth: "100%" }}>
      <div className="border-b border-gray-200 flex items-center justify-between flex-wrap gap-2" style={{ padding: "12px 16px" }}>
        <div className="flex items-center gap-2">
          {icon && <i className={`${icon} text-[#007890]`} style={{ fontSize: "1rem" }} />}
          <h3 className="font-semibold text-gray-800" style={{ fontSize: "1rem", margin: 0 }}>{title}</h3>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        <div className="flex items-center gap-2">
          {subtitle && <span style={{ fontSize: "0.7rem", color: "#6b7280", fontStyle: "italic" }}>{subtitle}</span>}
          {headerRight}
        </div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function KpiCard({ label, value, color = "#007890", icon }: { label: string; value: string | number; color?: string; icon?: string }) {
  return (
    <div className="bg-white rounded-md border border-gray-200 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      {icon && <div style={{ fontSize: "1.1rem", color, marginBottom: 4 }}><i className={icon} /></div>}
      <div style={{ fontSize: "2rem", fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{label}</div>
    </div>
  );
}

function ChartWrap({ children, height = "300px" }: { children: React.ReactNode; height?: string }) {
  return <div className="analytics-chart-wrap" style={{ position: "relative", height, minHeight: 200 }}>{children}</div>;
}

// Wrapper components that inject ChartDataLabels plugin per-chart (not globally)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DLBar(props: any) { return <Bar {...props} plugins={[ChartDataLabels, ...(props.plugins || [])]} />; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DLLine(props: any) { return <Line {...props} plugins={[ChartDataLabels, ...(props.plugins || [])]} />; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DLRadar(props: any) { return <Radar {...props} plugins={[ChartDataLabels, ...(props.plugins || [])]} />; }

// ── Main Page Component ────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [activePanel, setActivePanel] = useState<PanelKey>("overview");
  const [rawData, setRawData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ date_from: "", date_to: "", year: "", month: "", inspector: [], commodity: [] });
  const [inspectorMetric, setInspectorMetric] = useState<"count" | "total_km" | "total_hours" | "samples">("count");
  const [salaries, setSalaries] = useState<Record<string, { salary: number; employee_number: string }>>({});
  const [quarterlyTargets, setQuarterlyTargets] = useState<Record<string, QuarterlyTarget>>({});
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [targetQuarter, setTargetQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<QuarterlyTarget>({ inspector_name: "", year: new Date().getFullYear(), quarter: Math.ceil((new Date().getMonth() + 1) / 3), eggs: 51, poultry: 59, raw: 63, pmp: 54, raw_samples: 58, pmp_samples: 12 });
  const [xeroStatus, setXeroStatus] = useState<{ connected: boolean; org_name?: string }>({ connected: false });
  const [xeroInvoices, setXeroInvoices] = useState<{ invoices: Array<Record<string, unknown>>; aging: Record<string, number>; total_count?: number }>({ invoices: [], aging: {} });
  const [xeroPage, setXeroPage] = useState(1);
  const [xeroSyncing, setXeroSyncing] = useState(false);

  // ── User role & identity ────────────────────────────────────────────────────
  const [user, setUser] = useState<UserInfo | null>(null);
  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then(r => r.json()).then(d => {
      if (d.authenticated) setUser(d);
    }).catch(() => {});
  }, []);

  const userRole = user?.role ?? "developer";
  const isInspector = userRole === "inspector" || userRole === "inspector_manager";
  const isAdmin = userRole === "admin";
  // Inspector's display name for matching against data (e.g. "Lwandile Dlamini")
  const userFullName = user ? `${user.first_name} ${user.last_name}`.trim() : "";

  // Role-based: inspectors default to Financial tab, admins/inspectors see limited tabs
  useEffect(() => {
    if (isInspector) setActivePanel("financial");
  }, [isInspector]);

  // Panels visible based on role — inspectors only see Financial, admins see all but with own data
  const visiblePanels = useMemo(() => {
    if (isInspector) return PANELS.filter(p => p.key === "financial");
    return PANELS; // admins, super_admin, developer see all
  }, [isInspector]);

  const fetchData = useCallback(async (f?: Filters) => {
    setLoading(true);
    try {
      const active = f ?? filters;
      const p = new URLSearchParams();
      if (active.date_from) p.set("date_from", active.date_from);
      if (active.date_to) p.set("date_to", active.date_to);
      if (active.year) p.set("year", active.year);
      if (active.month) p.set("month", active.month);
      // Send single inspector/commodity to API if only one selected
      if (active.inspector.length === 1) p.set("inspector", active.inspector[0]);
      if (active.commodity.length === 1) p.set("commodity", active.commodity[0]);
      const qs = p.toString();
      const res = await fetch(`/api/analytics${qs ? "?" + qs : ""}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (json.salaries) setSalaries(json.salaries);
      if (json.quarterlyTargets) {
        const reKeyed: Record<string, QuarterlyTarget> = {};
        for (const val of Object.values(json.quarterlyTargets) as QuarterlyTarget[]) {
          reKeyed[val.inspector_name] = val;
        }
        setQuarterlyTargets(reKeyed);
      }
      setRawData(json);
    } catch (e) {
      console.error("Analytics fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Client-side filtered data derived from rawData + filters ───────────────
  const data = useMemo((): AnalyticsData | null => {
    if (!rawData) return null;

    // Role-based: admins see only their own inspector data (matched by name)
    const roleFilteredInspector = (isAdmin && userFullName) ? userFullName : "";

    const selInspectors = new Set(filters.inspector);
    // If admin role with a matched name, enforce that filter
    if (roleFilteredInspector) {
      // Find the matching inspector name from the data
      const match = (rawData.filterOptions?.inspectors ?? []).find(n =>
        n.toLowerCase() === roleFilteredInspector.toLowerCase() ||
        n.toLowerCase().includes(roleFilteredInspector.toLowerCase()) ||
        roleFilteredInspector.toLowerCase().includes(n.toLowerCase())
      );
      if (match) selInspectors.add(match);
    }
    const selCommodities = new Set(filters.commodity);
    const hasI = selInspectors.size > 0;
    const hasC = selCommodities.size > 0;

    const matchMonth = (m: string) => {
      if (!m) return true;
      const ym = m.substring(0, 7); // "2026-02-01" → "2026-02"
      if (filters.year && !ym.startsWith(filters.year)) return false;
      if (filters.month) {
        const mm = filters.month.padStart(2, "0");
        if (!ym.endsWith(`-${mm}`)) return false;
      }
      if (filters.date_from && ym < filters.date_from.substring(0, 7)) return false;
      if (filters.date_to && ym > filters.date_to.substring(0, 7)) return false;
      return true;
    };

    const matchDay = (d: string) => {
      if (!d) return true;
      const ds = d.substring(0, 10); // normalize "2026-02-01T00:00:00" → "2026-02-01"
      if (filters.date_from && ds < filters.date_from) return false;
      if (filters.date_to && ds > filters.date_to) return false;
      if (filters.year && !ds.startsWith(filters.year)) return false;
      if (filters.month) {
        const part = `-${filters.month.padStart(2, "0")}-`;
        if (!ds.includes(part)) return false;
      }
      return true;
    };

    const fi = <T extends { inspector_name: string }>(arr: T[] = []) =>
      hasI ? arr.filter(r => selInspectors.has(r.inspector_name)) : arr;
    const fc = <T extends { commodity: string }>(arr: T[] = []) =>
      hasC ? arr.filter(r => selCommodities.has(r.commodity)) : arr;

    const filteredList = (rawData.inspectionsList ?? []).filter(s => {
      if (hasI && !selInspectors.has(s.inspector_name)) return false;
      if (hasC && !selCommodities.has(s.commodity)) return false;
      if (!matchDay(s.date_of_inspection)) return false;
      return true;
    });

    const filteredCompliance = fc(rawData.complianceByCommodity ?? []);
    const totalCompliant = filteredCompliance.reduce((s, r) => s + r.compliant, 0);
    const totalForRate = filteredCompliance.reduce((s, r) => s + r.total, 0);
    const filteredTravel = fi(rawData.travelPerInspector ?? []);
    const filteredTime = fi(rawData.timeAllocation ?? []);
    const filteredOcc = fi(rawData.occurrenceReports ?? []);
    const filteredFin = fi(rawData.inspectorFinancials ?? []);

    const facilityTypeDist = (() => {
      const counts: Record<string, number> = {};
      filteredList.forEach(s => { if (s.facility_type) counts[s.facility_type] = (counts[s.facility_type] || 0) + 1; });
      return Object.entries(counts).map(([facility_type, count]) => ({ facility_type, count }));
    })();

    return {
      ...rawData,
      // Use API-computed values (which cover ALL records, not just the 200 in inspectionsList)
      // Only override if client-side inspector/commodity filters are applied
      totalInspections: (hasI || hasC) ? filteredList.length : rawData.totalInspections,
      complianceRate: (hasI || hasC) ? (totalForRate > 0 ? (totalCompliant / totalForRate) * 100 : 0) : rawData.complianceRate,
      activeInspectors: (hasI || hasC) ? new Set(filteredList.map(s => s.inspector_name)).size : rawData.activeInspectors,
      totalHours: filteredTime.reduce((s, r) => s + r.total_hours, 0),
      avgHours: filteredTime.length > 0 ? filteredTime.reduce((s, r) => s + r.total_hours, 0) / filteredTime.length : 0,
      totalOccurrenceReports: filteredOcc.reduce((s, r) => s + r.count, 0),
      complianceByCommodity: filteredCompliance,
      commodityAnalysis: fc(rawData.commodityAnalysis ?? []),
      samplesByCommodity: fc(rawData.samplesByCommodity ?? []),
      facilityTypeDistribution: facilityTypeDist,
      timeAllocation: filteredTime,
      inspectionsList: filteredList,
      inspectorPerformance: fi(rawData.inspectorPerformance ?? []),
      occurrenceReports: filteredOcc,
      directionsPerInspector: fi(rawData.directionsPerInspector ?? []),
      travelPerInspector: filteredTravel,
      inspectorCommodityMatrix: (rawData.inspectorCommodityMatrix ?? []).filter(r =>
        (!hasI || selInspectors.has(r.inspector_name)) && (!hasC || selCommodities.has(r.commodity))),
      inspectorSampleMatrix: (rawData.inspectorSampleMatrix ?? []).filter(r =>
        (!hasI || selInspectors.has(r.inspector_name)) && (!hasC || selCommodities.has(r.commodity))),
      approvalPerInspector: fi(rawData.approvalPerInspector ?? []),
      inspectorFinancials: filteredFin,
      financialSummary: { ...rawData.financialSummary, total_revenue: filteredFin.reduce((s, r) => s + (r.total_revenue || 0), 0) },
      docSendTime: (rawData.docSendTime ?? []).filter(r => !hasI || selInspectors.has((r as unknown as { name: string }).name)),
      invoiceUploadTime: (rawData.invoiceUploadTime ?? []).filter(r => !hasI || selInspectors.has((r as unknown as { name: string }).name)),
      coaAnalysisTime: fc(rawData.coaAnalysisTime ?? []),
      approvalTime: fi(rawData.approvalTime ?? []),
      travelTimePerInspector: fi(rawData.travelTimePerInspector ?? []),
      monthlyInspectorTrend: fi(rawData.monthlyInspectorTrend ?? []).filter(r => matchDay(r.day)),
      monthlyCommodityTrends: fc(rawData.monthlyCommodityTrends ?? []).filter(r => matchMonth(r.month)),
      monthlyComplianceTrend: fc(rawData.monthlyComplianceTrend ?? []).filter(r => matchMonth(r.month)),
      weeklyComplianceTrend: rawData.weeklyComplianceTrend ?? [],
      dailyComplianceTrend: (() => {
        const raw = rawData.dailyComplianceTrend ?? [];
        const afterCommodity = fc(raw);
        const afterDay = afterCommodity.filter(r => matchDay(r.day));
        console.log("[DailyCompliance] raw from API:", raw.length, "items, first 3:", raw.slice(0, 3));
        console.log("[DailyCompliance] after commodity filter:", afterCommodity.length);
        console.log("[DailyCompliance] after matchDay filter:", afterDay.length, "| date_from:", filters.date_from, "| date_to:", filters.date_to);
        if (raw.length > 0 && afterDay.length === 0) {
          console.log("[DailyCompliance] matchDay is filtering everything out! Sample day values:", raw.slice(0, 5).map(r => r.day));
        }
        return afterDay;
      })(),
      monthlyOccurrenceTrend: (rawData.monthlyOccurrenceTrend ?? []).filter(r => matchMonth(r.month)),
      monthlyTravelTrend: (rawData.monthlyTravelTrend ?? []).filter(r => matchMonth(r.month)),
      monthlyDocSendTrend: (rawData.monthlyDocSendTrend ?? []).filter(r => matchMonth(r.month)),
      weeklyDocSendTrend: rawData.weeklyDocSendTrend ?? [],
      monthlyInvoiceTrend: (rawData.monthlyInvoiceTrend ?? []).filter(r => matchMonth(r.month)),
      weeklyInvoiceTrend: rawData.weeklyInvoiceTrend ?? [],
      monthlyInspectionsTrend: (rawData.monthlyInspectionsTrend ?? []).filter(r => matchMonth(r.month)),
      monthlyCoaTrend: (rawData.monthlyCoaTrend ?? []).filter(r => matchMonth(r.month)),
      weeklyCoaTrend: rawData.weeklyCoaTrend ?? [],
      monthlyApprovalTrend: (rawData.monthlyApprovalTrend ?? []).filter(r => matchMonth(r.month)),
      weeklyApprovalTrend: rawData.weeklyApprovalTrend ?? [],
      monthlyTravelHoursTrend: (rawData.monthlyTravelHoursTrend ?? []).filter(r => matchMonth(r.month)),
    };
  }, [rawData, filters, isAdmin, userFullName]);

  // Also fetch salaries separately (for when saving updates)
  const refreshSalaries = () => {
    fetch("/api/inspector-salaries").then(r => r.json()).then(d => {
      if (d.salaries) setSalaries(d.salaries);
    }).catch(() => {});
  };

  // Fetch quarterly targets for selected year/quarter
  const refreshQuarterlyTargets = (y?: number, q?: number) => {
    const yr = y ?? targetYear;
    const qr = q ?? targetQuarter;
    fetch(`/api/quarterly-targets?year=${yr}&quarter=${qr}`).then(r => r.json()).then(d => {
      if (d.targets) setQuarterlyTargets(d.targets);
    }).catch(() => {});
  };

  useEffect(() => { refreshQuarterlyTargets(); }, [targetYear, targetQuarter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Xero status & invoices
  useEffect(() => {
    fetch("/api/xero/status").then(r => r.json()).then(d => setXeroStatus(d)).catch(() => {});
    fetch("/api/xero/invoices").then(r => r.json()).then(d => {
      if (d.invoices) setXeroInvoices(d);
    }).catch(() => {});
  }, []);

  const handleXeroSync = async () => {
    setXeroSyncing(true);
    try {
      await fetch("/api/xero/sync", { method: "POST" });
      const r = await fetch("/api/xero/invoices");
      const d = await r.json();
      if (d.invoices) setXeroInvoices(d);
    } catch {}
    setXeroSyncing(false);
  };

  const handleXeroConnect = async () => {
    try {
      const r = await fetch("/api/xero/connect");
      const d = await r.json();
      if (d.redirect) window.location.href = d.redirect;
    } catch {}
  };

  const handleXeroDisconnect = async () => {
    try {
      await fetch("/api/xero/disconnect", { method: "POST" });
      setXeroStatus({ connected: false });
      setXeroInvoices({ invoices: [], aging: {} });
    } catch {}
  };

  // Expense log (localStorage, matching Django)
  const [expenseLog, setExpenseLog] = useState<Array<{ id: string; inspector: string; amount: number; description: string; date: string }>>([]);
  useEffect(() => {
    try { const raw = localStorage.getItem("EXPENSE_LOG"); if (raw) setExpenseLog(JSON.parse(raw)); } catch {}
  }, []);
  const saveExpenses = (log: typeof expenseLog) => { setExpenseLog(log); localStorage.setItem("EXPENSE_LOG", JSON.stringify(log)); };

  // Salary modal
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingSalaries, setEditingSalaries] = useState<Record<string, number>>({});
  const openSalaryModal = () => {
    const init: Record<string, number> = {};
    (data?.inspectorFinancials ?? []).forEach(r => {
      const key = r.inspector_name.toLowerCase();
      init[r.inspector_name] = salaries[key]?.salary ?? 0;
    });
    setEditingSalaries(init);
    setShowSalaryModal(true);
  };
  const saveSalaries = async () => {
    try {
      const r = await fetch("/api/inspector-salaries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salaries: editingSalaries }) });
      const d = await r.json();
      if (d.salaries) setSalaries(d.salaries);
      else refreshSalaries();
    } catch {}
    setShowSalaryModal(false);
  };

  // Save quarterly target
  const saveQuarterlyTarget = async () => {
    if (!editingTarget.inspector_name) return;
    try {
      await fetch("/api/quarterly-targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingTarget) });
      refreshQuarterlyTargets(editingTarget.year, editingTarget.quarter);
    } catch {}
    setShowTargetsModal(false);
  };

  const applyTargetToAll = async () => {
    if (!rawData?.filterOptions?.inspectors) return;
    for (const inspector of rawData.filterOptions.inspectors) {
      try {
        await fetch("/api/quarterly-targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editingTarget, inspector_name: inspector }) });
      } catch {}
    }
    refreshQuarterlyTargets(editingTarget.year, editingTarget.quarter);
    setShowTargetsModal(false);
  };

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ inspector: "", amount: "", description: "", date: "" });

  const handleApply = () => fetchData(filters);
  const handleReset = () => {
    const empty: Filters = { date_from: "", date_to: "", year: "", month: "", inspector: [], commodity: [] };
    setFilters(empty);
    fetchData(empty);
  };

  // ── Export: Excel ───────────────────────────────────────────────────────────
  const handleExtractExcel = () => {
    if (!data) return;
    import("xlsx").then(XLSX => {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Inspections List
      if (data.inspectionsList?.length) {
        const ws1 = XLSX.utils.json_to_sheet(data.inspectionsList);
        XLSX.utils.book_append_sheet(wb, ws1, "Inspections");
      }

      // Sheet 2: Financial Summary
      const kmRate = data.financialSummary?.km_rate ?? 4.5;
      const finRows = (data.inspectorFinancials ?? []).map(r => {
        const sal = lookupSalary(salaries, r.inspector_name);
        const exp = expenseLog.filter(e => e.inspector === r.inspector_name).reduce((s, e) => s + e.amount, 0);
        const mgmt = (sal + exp) * 0.20;
        const cost = sal + exp + mgmt;
        return {
          Inspector: r.inspector_name,
          Inspections: r.total_inspections,
          "Billable Hrs": r.total_hours,
          KM: r.total_km,
          "R/km": Math.round(r.total_km * kmRate),
          "On-Site Hrs": r.inspection_time,
          "Rev (Hours)": Math.round(r.revenue_hours),
          "Rev (KM)": Math.round(r.revenue_km),
          "Rev (Samples)": Math.round(r.revenue_samples),
          "Total Revenue": Math.round(r.total_revenue),
          "Salary (CTC)": Math.round(sal),
          Expenses: Math.round(exp),
          "Management Fees": Math.round(mgmt),
          "Total Cost": Math.round(cost),
          "Rev/Hr": r.total_hours > 0 ? Math.round(r.total_revenue / r.total_hours) : 0,
          "Cost/Hr": r.total_hours > 0 ? Math.round(cost / r.total_hours) : 0,
          Profit: Math.round(r.total_revenue - cost),
        };
      });
      if (finRows.length) {
        const ws2 = XLSX.utils.json_to_sheet(finRows);
        XLSX.utils.book_append_sheet(wb, ws2, "Financial");
      }

      // Sheet 3: Compliance
      if (data.complianceByCommodity?.length) {
        const ws3 = XLSX.utils.json_to_sheet(data.complianceByCommodity);
        XLSX.utils.book_append_sheet(wb, ws3, "Compliance");
      }

      // Sheet 4: Travel
      if (data.travelPerInspector?.length) {
        const ws4 = XLSX.utils.json_to_sheet(data.travelPerInspector);
        XLSX.utils.book_append_sheet(wb, ws4, "Travel");
      }

      // Sheet 5: Inspector Performance
      if (data.inspectorPerformance?.length) {
        const ws5 = XLSX.utils.json_to_sheet(data.inspectorPerformance);
        XLSX.utils.book_append_sheet(wb, ws5, "Inspector Performance");
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Analytics_Report_${dateStr}.xlsx`);
    });
  };

  // ── Build Word document (shared by Word export + PDF conversion) ────────
  const buildWordDoc = async () => {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ImageRun, WidthType, AlignmentType, BorderStyle, ShadingType, Header, Footer, PageOrientation, PageBreak, convertInchesToTwip } = await import("docx");
    const html2canvas = (await import("html2canvas")).default;

    // ── Brand colors ──
    const TEAL = "007890";
    const DARK = "0F172A";
    const TEAL_LIGHT = "E6F3F7";
    const GREEN = "059669";
    const RED = "DC2626";
    const AMBER = "F59E0B";
    const GRAY = "6B7280";
    const GRAY_LIGHT = "9CA3AF";
    const WHITE = "FFFFFF";

    const noBorders = { top: { style: BorderStyle.NONE, size: 0, color: WHITE }, bottom: { style: BorderStyle.NONE, size: 0, color: WHITE }, left: { style: BorderStyle.NONE, size: 0, color: WHITE }, right: { style: BorderStyle.NONE, size: 0, color: WHITE } };
    const thinBorder = { bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" }, top: { style: BorderStyle.NONE, size: 0, color: WHITE }, left: { style: BorderStyle.NONE, size: 0, color: WHITE }, right: { style: BorderStyle.NONE, size: 0, color: WHITE } };

    const filterDesc = [
      filters.year && `Year: ${filters.year}`,
      filters.month && `Month: ${MONTHS[Number(filters.month) - 1]}`,
      filters.inspector.length > 0 && `Inspector: ${filters.inspector.join(", ")}`,
      filters.commodity.length > 0 && `Commodity: ${filters.commodity.join(", ")}`,
      filters.date_from && `From: ${filters.date_from}`,
      filters.date_to && `To: ${filters.date_to}`,
    ].filter(Boolean).join("  |  ") || "All Time — No Filters Applied";

    // ── Fetch logo as base64 ──
    let logoBuffer: ArrayBuffer | null = null;
    try {
      const logoRes = await fetch("/logo.png");
      if (logoRes.ok) logoBuffer = await logoRes.arrayBuffer();
    } catch { /* skip logo */ }

    // ── Capture charts from DOM as images ──
    const captureChart = async (selector: string): Promise<ArrayBuffer | null> => {
      try {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) return null;
        const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, logging: false });
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
        return blob ? await blob.arrayBuffer() : null;
      } catch { return null; }
    };

    // Capture visible chart canvases
    const chartCanvases = document.querySelectorAll("canvas");
    const chartImages: ArrayBuffer[] = [];
    for (const cvs of Array.from(chartCanvases)) {
      try {
        const parent = cvs.closest("[class*='chart-wrap'], [style]")?.parentElement;
        if (parent) {
          const canvas = await html2canvas(parent as HTMLElement, { backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true });
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
          if (blob) chartImages.push(await blob.arrayBuffer());
        }
      } catch { /* skip */ }
    }

    // ── Helper: create a styled table ──
    const makeTable = (headers: string[], rows: string[][], opts?: { colWidths?: number[]; highlightCol?: number }) => {
      const colW = opts?.colWidths ?? headers.map(() => Math.floor(100 / headers.length));
      const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          width: { size: colW[i], type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
          borders: noBorders,
          children: [new Paragraph({ alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT, spacing: { before: 50, after: 50 }, children: [new TextRun({ text: h, bold: true, size: 15, color: WHITE, font: "Calibri" })] })],
        })),
      });
      const bodyRows = rows.map((row, ri) => new TableRow({
        children: row.map((cell, ci) => {
          const isHighlight = opts?.highlightCol === ci;
          return new TableCell({
            width: { size: colW[ci], type: WidthType.PERCENTAGE },
            shading: ri % 2 === 0 ? { type: ShadingType.SOLID, color: "F8FAFC", fill: "F8FAFC" } : undefined,
            borders: thinBorder,
            children: [new Paragraph({
              alignment: ci === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
              spacing: { before: 35, after: 35 },
              children: [new TextRun({
                text: cell,
                size: 15,
                color: isHighlight ? (cell.startsWith("-") ? RED : GREEN) : "374151",
                bold: isHighlight,
                font: "Calibri",
              })],
            })],
          });
        }),
      }));
      return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] });
    };

    // ── KPI cards row ──
    const kpiRow = (items: { label: string; value: string; color?: string }[]) => {
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: items.map(item => new TableCell({
              width: { size: Math.floor(100 / items.length), type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: TEAL_LIGHT, fill: TEAL_LIGHT },
              borders: { top: { style: BorderStyle.SINGLE, size: 3, color: item.color ?? TEAL }, bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" }, left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" }, right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" } },
              margins: { top: convertInchesToTwip(0.1), bottom: convertInchesToTwip(0.1), left: convertInchesToTwip(0.1), right: convertInchesToTwip(0.1) },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [new TextRun({ text: item.value, bold: true, size: 28, color: item.color ?? TEAL, font: "Calibri" })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.label.toUpperCase(), size: 12, color: GRAY, font: "Calibri", bold: true })] }),
              ],
            })),
          }),
        ],
      });
    };

    // ── Compliance visual bars ──
    const complianceBars = (items: { commodity: string; compliance_rate: number; total: number; compliant: number }[]) => {
      const COMMODITY_HEX: Record<string, string> = { EGG: "F59E0B", PMP: "3B82F6", POULTRY: "10B981", RAW: "EF4444" };
      const getColor = (c: string) => {
        const k = c?.toUpperCase?.() ?? "";
        if (k.includes("EGG")) return COMMODITY_HEX.EGG;
        if (k.includes("PMP")) return COMMODITY_HEX.PMP;
        if (k.includes("POULTRY")) return COMMODITY_HEX.POULTRY;
        if (k.includes("RAW")) return COMMODITY_HEX.RAW;
        return TEAL;
      };
      const barSegments = 20; // visual segments for bar
      return items.map(item => {
        const filledCount = Math.round((item.compliance_rate / 100) * barSegments);
        const barColor = getColor(item.commodity);
        return new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({
            children: [
              // Commodity name
              new TableCell({
                width: { size: 12, type: WidthType.PERCENTAGE }, borders: noBorders,
                verticalAlign: "center" as never,
                children: [new Paragraph({ spacing: { before: 20, after: 20 }, children: [new TextRun({ text: item.commodity, bold: true, size: 17, color: "374151", font: "Calibri" })] })],
              }),
              // Visual bar using filled/empty cells
              ...Array.from({ length: barSegments }, (_, i) => new TableCell({
                width: { size: 3.2, type: WidthType.PERCENTAGE }, borders: noBorders,
                shading: i < filledCount ? { type: ShadingType.SOLID, color: barColor, fill: barColor } : { type: ShadingType.SOLID, color: "E5E7EB", fill: "E5E7EB" },
                children: [new Paragraph({ spacing: { before: 10, after: 10 }, children: [new TextRun({ text: " ", size: 10 })] })],
              })),
              // Rate text
              new TableCell({
                width: { size: 24, type: WidthType.PERCENTAGE }, borders: noBorders,
                verticalAlign: "center" as never,
                children: [new Paragraph({
                  alignment: AlignmentType.RIGHT, spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({ text: `${item.compliance_rate.toFixed(1)}%`, bold: true, size: 17, color: barColor, font: "Calibri" }),
                    new TextRun({ text: `  (${item.compliant}/${item.total})`, size: 14, color: GRAY_LIGHT, font: "Calibri" }),
                  ],
                })],
              }),
            ],
          })],
        });
      });
    };

    const sectionTitle = (text: string, icon?: string) => new Paragraph({
      spacing: { before: 340, after: 140 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" } },
      children: [
        new TextRun({ text: icon ? `${icon}  ` : "", size: 22, color: TEAL, font: "Calibri" }),
        new TextRun({ text, bold: true, size: 26, color: DARK, font: "Calibri" }),
      ],
    });

    const spacer = () => new Paragraph({ spacing: { before: 80, after: 80 }, children: [] });
    const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

    // ══════════════════════════════════════════════════════════════════════
    // BUILD SECTIONS
    // ══════════════════════════════════════════════════════════════════════
    const children: (typeof Paragraph.prototype | typeof Table.prototype)[] = [];

    // ── COVER HEADER ──
    // Dark branded header bar (using a full-width table)
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [
          // Logo cell
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
            borders: noBorders,
            margins: { top: convertInchesToTwip(0.15), bottom: convertInchesToTwip(0.15), left: convertInchesToTwip(0.15), right: convertInchesToTwip(0.05) },
            children: logoBuffer ? [new Paragraph({
              children: [new ImageRun({ data: logoBuffer, transformation: { width: 70, height: 50 }, type: "png" })],
            })] : [new Paragraph({ children: [] })],
          }),
          // Title cell
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
            borders: noBorders,
            margins: { top: convertInchesToTwip(0.15), bottom: convertInchesToTwip(0.15), left: convertInchesToTwip(0.1) },
            verticalAlign: "center" as never,
            children: [
              new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "FOOD SAFETY AGENCY", bold: true, size: 32, color: WHITE, font: "Calibri" })] }),
              new Paragraph({ children: [new TextRun({ text: "Analytics Report", size: 20, color: GRAY_LIGHT, font: "Calibri" })] }),
            ],
          }),
          // Date/filter cell
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
            borders: noBorders,
            margins: { top: convertInchesToTwip(0.15), bottom: convertInchesToTwip(0.15), right: convertInchesToTwip(0.15) },
            verticalAlign: "center" as never,
            children: [
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: new Date().toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), size: 16, color: WHITE, font: "Calibri" })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: filterDesc, size: 14, color: GRAY_LIGHT, font: "Calibri", italics: true })] }),
            ],
          }),
        ],
      })],
    }));
    // Teal accent line under header
    children.push(new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL } }, children: [] }));

    // ── KPI CARDS ──
    children.push(kpiRow([
      { label: "Total Inspections", value: String(data!.totalInspections ?? 0), color: TEAL },
      { label: "Compliance Rate", value: `${Number(data!.complianceRate ?? 0).toFixed(1)}%`, color: GREEN },
      { label: "Active Inspectors", value: String(data!.activeInspectors ?? 0), color: AMBER },
      { label: "Total Hours", value: Number(data!.totalHours ?? 0).toFixed(1), color: "3B82F6" },
      { label: "Total Revenue", value: `R${Number(data!.financialSummary?.total_revenue ?? 0).toLocaleString("en-ZA")}`, color: GREEN },
    ]));

    // Secondary KPIs
    children.push(spacer());
    children.push(kpiRow([
      { label: "Occurrence Reports", value: String(data!.totalOccurrenceReports ?? 0), color: RED },
      { label: "Total KM Traveled", value: (data!.travelPerInspector ?? []).reduce((s, t) => s + (t.total_km || 0), 0).toLocaleString("en-ZA"), color: "3B82F6" },
      { label: "Days Worked", value: String((data! as unknown as Record<string, unknown>).daysWorked ?? 0), color: TEAL },
      { label: "Total Samples", value: String((data!.samplesByCommodity ?? []).reduce((s, d) => s + (d.count || 0), 0)), color: GREEN },
    ]));

    // ── COMPLIANCE VISUAL BARS ──
    if (data!.complianceByCommodity?.length) {
      children.push(sectionTitle("Compliance by Commodity"));
      const bars = complianceBars(data!.complianceByCommodity || []);
      bars.forEach(b => children.push(b));
    }

    // ── CHART IMAGES ──
    if (chartImages.length > 0) {
      children.push(pageBreak());
      children.push(sectionTitle("Charts & Trends"));
      for (let i = 0; i < Math.min(chartImages.length, 8); i++) {
        children.push(new Paragraph({
          spacing: { before: 100, after: 100 },
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: chartImages[i], transformation: { width: 680, height: 280 }, type: "png" })],
        }));
      }
    }

    // ── FINANCIAL TABLE ──
    children.push(pageBreak());
    const kmR = data!.financialSummary?.km_rate ?? 4.5;
    const finData = (data!.inspectorFinancials ?? []).map(r => {
      const sal = lookupSalary(salaries, r.inspector_name ?? "");
      const exp = expenseLog.filter(e => e.inspector === r.inspector_name).reduce((s, e) => s + (e.amount || 0), 0);
      const hrs = r.total_hours || 0; const km = r.total_km || 0;
      const revT = r.total_revenue || 0; const mgmt = (sal + exp) * 0.20;
      const cost = sal + exp + mgmt; const profit = Math.round(revT - cost);
      return [
        r.inspector_name ?? "", String(r.total_inspections ?? 0),
        hrs > 0 ? hrs.toFixed(1) : "-", km > 0 ? km.toLocaleString() : "-",
        `R${Math.round(r.revenue_hours || 0).toLocaleString()}`, `R${Math.round(r.revenue_km || 0).toLocaleString()}`,
        `R${Math.round(r.revenue_samples || 0).toLocaleString()}`, `R${Math.round(revT).toLocaleString()}`,
        sal > 0 ? `R${Math.round(sal).toLocaleString()}` : "-",
        exp > 0 ? `R${Math.round(exp).toLocaleString()}` : "-",
        `R${Math.round(cost).toLocaleString()}`,
        profit >= 0 ? `R${profit.toLocaleString()}` : `-R${Math.abs(profit).toLocaleString()}`,
      ];
    });
    if (finData.length) {
      children.push(sectionTitle("Revenue Per Inspector"));
      children.push(makeTable(
        ["Inspector", "Insp", "Hrs", "KM", "Rev(Hrs)", "Rev(KM)", "Rev(Sam)", "Revenue", "Salary", "Exp", "Cost", "Profit"],
        finData,
        { colWidths: [14, 5, 5, 6, 8, 8, 8, 9, 8, 7, 8, 8], highlightCol: 11 },
      ));
    }

    // ── INSPECTOR PERFORMANCE ──
    if (data!.inspectorPerformance?.length) {
      children.push(sectionTitle("Inspector Performance"));
      children.push(makeTable(
        ["Inspector", "Total Inspections", "Compliant", "Non-Compliant", "Compliance %"],
        (data!.inspectorPerformance || []).map(p => [
          p.inspector_name, String(p.total_inspections), String(p.compliant), String(p.non_compliant),
          p.total_inspections > 0 ? `${((p.compliant / p.total_inspections) * 100).toFixed(1)}%` : "0%",
        ]),
        { colWidths: [28, 18, 18, 18, 18] },
      ));
    }

    // ── TRAVEL ──
    if (data!.travelPerInspector?.length) {
      children.push(sectionTitle("Travel Per Inspector"));
      children.push(makeTable(
        ["Inspector", "Total KM", "Total Hours", "Inspections", "Avg KM/Inspection"],
        (data!.travelPerInspector || []).map(t => [
          t.inspector_name ?? "", (t.total_km ?? 0).toLocaleString(),
          (t.total_hours ?? 0).toFixed(1), String(t.inspection_count ?? 0), (t.avg_km ?? 0).toFixed(1),
        ]),
        { colWidths: [28, 18, 18, 17, 19] },
      ));
    }

    // ── APPROVAL STATUS ──
    if (data!.approvalPerInspector?.length) {
      children.push(sectionTitle("Approval Status Per Inspector"));
      children.push(makeTable(
        ["Inspector", "Total", "Approved", "Pending", "Approval Rate"],
        (data!.approvalPerInspector || []).map(a => [
          a.inspector_name, String(a.total), String(a.approved), String(a.pending),
          a.total > 0 ? `${((a.approved / a.total) * 100).toFixed(1)}%` : "0%",
        ]),
        { colWidths: [28, 15, 18, 17, 22], highlightCol: 4 },
      ));
    }

    // ── COMPLIANCE TABLE (detailed) ──
    if (data!.complianceByCommodity?.length) {
      children.push(sectionTitle("Compliance Breakdown"));
      children.push(makeTable(
        ["Commodity", "Total Inspections", "Compliant", "Non-Compliant", "Compliance Rate"],
        (data!.complianceByCommodity || []).map(c => [
          c.commodity ?? "", String(c.total ?? 0), String(c.compliant ?? 0),
          String(c.non_compliant ?? 0), `${(c.compliance_rate ?? 0).toFixed(1)}%`,
        ]),
        { colWidths: [25, 20, 18, 19, 18], highlightCol: 4 },
      ));
    }

    children.push(spacer());

    // ── Confidential footer note ──
    children.push(new Paragraph({
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" } },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "This document is confidential and intended for authorized personnel only.", size: 14, color: GRAY_LIGHT, italics: true, font: "Calibri" })],
    }));

    const doc = new Document({
      styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
      sections: [{
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: convertInchesToTwip(0.5), bottom: convertInchesToTwip(0.5), left: convertInchesToTwip(0.6), right: convertInchesToTwip(0.6) },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "Food Safety Agency", bold: true, size: 14, color: TEAL, font: "Calibri" }),
                new TextRun({ text: "  |  Confidential", size: 14, color: GRAY_LIGHT, italics: true, font: "Calibri" }),
              ],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" } },
              children: [
                new TextRun({ text: "Food Safety Agency (Pty) Ltd  |  Analytics Report  |  ", size: 13, color: GRAY_LIGHT, font: "Calibri" }),
                new TextRun({ text: new Date().toLocaleDateString("en-ZA"), size: 13, color: GRAY_LIGHT, font: "Calibri" }),
              ],
            })],
          }),
        },
        children: children as (typeof Paragraph.prototype)[],
      }],
    });

    return await Packer.toBlob(doc);
  };

  // ── Export: PDF (builds Word doc in background → sends to backend for conversion) ──
  const [pdfLoading, setPdfLoading] = useState(false);
  const handleExportPdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const blob = await buildWordDoc();
      const formData = new FormData();
      formData.append("file", blob, "report.docx");
      const res = await fetch("/api/convert-docx-to-pdf", { method: "POST", body: formData });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server error ${res.status}`);
      }
      const pdfBlob = await res.blob();
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Analytics_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPdfLoading(false);
    }
  };

  const dateRangeSet = filters.date_from !== "" || filters.date_to !== "";

  // ── Derived data ───────────────────────────────────────────────────────────

  const totalKm = useMemo(() => data?.travelPerInspector?.reduce((s, t) => s + t.total_km, 0) ?? 0, [data]);
  const avgDocSend = useMemo(() => avg(data?.docSendTime?.map(d => d.avg_days) ?? []), [data]);
  const avgApproval = useMemo(() => avg(data?.approvalTime?.map(d => d.avg_days) ?? []), [data]);
  const totalSamples = useMemo(() => data?.samplesByCommodity?.filter(d => isSampleCommodity(d.commodity)).reduce((s, d) => s + d.count, 0) ?? 0, [data]);

  // ── Render ─────────────────────────────────────────────────────────────────

  // Don't render until role is known (prevents flash of wrong UI)
  if (!user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", color: "#6b7280" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", borderTop: "3px solid #007890", borderRight: "3px solid #e5e7eb", borderBottom: "3px solid #e5e7eb", borderLeft: "3px solid #e5e7eb", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        Loading...
      </div>
    </div>
  );

  // Inspectors see their personal dashboard
  if (isInspector) return <InspectorDashboard />;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, borderTop: "3px solid #007890", borderRight: "3px solid #e2e8f0", borderBottom: "3px solid #e2e8f0", borderLeft: "3px solid #e2e8f0", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div className="analytics-page" style={{ padding: "28px 20px 32px", minHeight: "100vh", position: "relative", overflowX: "hidden", maxWidth: "100vw" }}>
      {/* Background image matching Django */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh", background: "url('/background.jpg') no-repeat center center fixed", backgroundSize: "cover", opacity: 1, zIndex: -2, pointerEvents: "none" }} />
      {/* Panel Tabs */}
      <div className="analytics-tabs flex flex-wrap" style={{ gap: 6, marginBottom: "1rem" }}>
        {visiblePanels.map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePanel(p.key)}
            className="flex items-center transition-all duration-200"
            style={{
              gap: 10,
              padding: "7px 12px",
              borderRadius: 6,
              border: "none",
              borderLeft: activePanel === p.key ? "3px solid #fff" : "3px solid transparent",
              background: activePanel === p.key ? "#007890" : "#ffffff",
              color: activePanel === p.key ? "#ffffff" : "#64748b",
              fontWeight: activePanel === p.key ? 600 : 500,
              fontSize: "0.875rem",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              minHeight: 36,
            }}
          >
            <i className={p.icon} style={{ width: 18, textAlign: "center", fontSize: "0.85rem" }} />
            {p.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-md border border-gray-200" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
        <div className="analytics-filter-bar flex flex-wrap items-end" style={{ gap: "0.75rem" }}>
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Date From</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", width: "100%" }} />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Date To</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", width: "100%" }} />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Year</label>
            <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", width: "100%" }}>
              <option value="">All Years</option>
              {rawData?.filterOptions?.years?.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Month</label>
            <select value={filters.month} disabled={dateRangeSet}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", width: "100%", ...(dateRangeSet ? { background: "#f3f4f6", color: "#9ca3af" } : {}) }}>
              <option value="">All Months</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          {/* Inspector filter — hidden for inspector/admin roles (they see only own data) */}
          {!isInspector && !isAdmin && (
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Inspector</label>
              <MultiSelectDropdown
                label="Inspector"
                options={rawData?.filterOptions?.inspectors ?? []}
                selected={filters.inspector}
                onChange={(v) => setFilters({ ...filters, inspector: v })}
                placeholder="All Inspectors"
              />
            </div>
          )}
          {(isInspector || isAdmin) && userFullName && (
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Inspector</label>
              <div style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f3f4f6", color: "#374151", fontWeight: 500 }}>
                <i className="fas fa-user" style={{ marginRight: 6, color: "#007890" }} />{userFullName}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Commodity</label>
            <MultiSelectDropdown
              label="Commodity"
              options={rawData?.filterOptions?.commodities ?? []}
              selected={filters.commodity}
              onChange={(v) => setFilters({ ...filters, commodity: v })}
              placeholder="All Commodities"
            />
          </div>
          <div className="analytics-filter-btns" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexShrink: 0 }}>
            <button onClick={handleApply}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#007890", color: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <i className="fas fa-filter" /> Apply
            </button>
            <button onClick={handleReset}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#6b7280", color: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <i className="fas fa-undo" /> Reset
            </button>
            <button onClick={handleExtractExcel}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#007890", color: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <i className="fas fa-file-excel" /> Export Excel
            </button>
            <button onClick={handleExportPdf} disabled={pdfLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: pdfLoading ? "wait" : "pointer", background: pdfLoading ? "#9ca3af" : "#d13438", color: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", opacity: pdfLoading ? 0.7 : 1 }}>
              <i className={pdfLoading ? "fas fa-spinner fa-spin" : "fas fa-file-pdf"} /> {pdfLoading ? "Generating..." : "Export PDF"}
            </button>
            <button onClick={() => { /* TODO: toggle info panel */ }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#6366f1", color: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <i className="fas fa-info-circle" /> Info
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 12, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", padding: "1rem" }}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-[#007890] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500 font-medium">Loading analytics...</span>
          </div>
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">Failed to load analytics data.</div>
      ) : (
        <div style={{ animation: "panel-in 0.2s ease" }}>
          <style>{`
            @keyframes panel-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            .info-tooltip { position: relative; display: inline-block; margin-left: 6px; cursor: help; }
            .info-tooltip-text { visibility: hidden; opacity: 0; position: absolute; z-index: 9999; top: calc(100% + 8px); left: 0; background: #1e293b; color: #fff; padding: 10px 14px; border-radius: 6px; font-size: 12px; font-weight: 400; line-height: 1.5; white-space: normal; width: 260px; transition: opacity 0.2s; pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
            .info-tooltip:hover .info-tooltip-text { visibility: visible; opacity: 1; }
            .info-tooltip-text::before { content: ''; position: absolute; bottom: 100%; left: 16px; border-width: 6px; border-style: solid; border-color: transparent transparent #1e293b transparent; }
            @media (max-width: 768px) {
              .md\\:grid-cols-2 { grid-template-columns: 1fr !important; }
              .md\\:grid-cols-3 { grid-template-columns: 1fr !important; }
              .analytics-page { padding: 10px 8px 20px !important; overflow-x: hidden; }
              .analytics-page h1 { font-size: 1.2rem !important; }
              .analytics-filter-bar { flex-direction: column !important; gap: 8px !important; }
              .analytics-filter-bar > div { min-width: 100% !important; flex: unset !important; }
              .analytics-filter-btns { flex-wrap: wrap !important; width: 100% !important; gap: 6px !important; }
              .analytics-filter-btns button { flex: 1 1 45%; min-width: 0; padding: 8px 10px !important; font-size: 0.7rem !important; }
              .analytics-tabs { gap: 3px !important; overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap !important; padding-bottom: 4px; }
              .analytics-tabs button { font-size: 0.7rem !important; padding: 6px 8px !important; min-height: 30px !important; white-space: nowrap; flex-shrink: 0; }
              .analytics-tabs button i { display: none; }
              .analytics-modal { width: 95% !important; max-height: 85vh !important; }
              .analytics-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
              .analytics-card { overflow: hidden !important; }
              .analytics-card > div:last-child { padding: 10px !important; overflow-x: auto; }
              .analytics-card > div:first-child { padding: 10px 12px !important; }
              .analytics-card > div:first-child h3 { font-size: 0.85rem !important; }
              .analytics-card table { font-size: 0.7rem !important; }
              .analytics-card table th, .analytics-card table td { padding: 6px 4px !important; }
              .analytics-chart-wrap { min-height: 180px !important; height: 220px !important; }
              .analytics-radar-wrap { height: 320px !important; min-height: 300px !important; }
              .grid { gap: 10px !important; }
            }
            @media (max-width: 480px) {
              .analytics-page { padding: 6px 4px 16px !important; }
              .analytics-tabs button { font-size: 0.6rem !important; padding: 5px 6px !important; }
              .analytics-kpi-grid { grid-template-columns: 1fr 1fr !important; }
              .analytics-filter-btns button { flex: 1 1 100%; }
              .analytics-chart-wrap { height: 180px !important; }
              .analytics-card > div:last-child { padding: 8px !important; }
            }
          `}</style>
          {activePanel === "overview" && <OverviewPanel data={data} totalKm={totalKm} avgDocSend={avgDocSend} avgApproval={avgApproval} totalSamples={totalSamples} />}
          {activePanel === "inspectors" && <InspectorsPanel data={data} inspectorMetric={inspectorMetric} setInspectorMetric={setInspectorMetric} quarterlyTargets={quarterlyTargets} targetYear={targetYear} targetQuarter={targetQuarter} setTargetYear={setTargetYear} setTargetQuarter={setTargetQuarter} onSetTargets={() => setShowTargetsModal(true)} filterInspector={filters.inspector.length === 1 ? filters.inspector[0] : ""} />}
          {activePanel === "compliance" && <CompliancePanel data={data} />}
          {activePanel === "operations" && <OperationsPanel data={data} />}
          {activePanel === "timelines" && <TimelinesPanel data={data} />}
          {activePanel === "financial" && <FinancialPanel data={data} salaries={salaries} expenseLog={expenseLog} xeroStatus={xeroStatus} xeroInvoices={xeroInvoices} xeroPage={xeroPage} setXeroPage={setXeroPage} xeroSyncing={xeroSyncing} onXeroSync={handleXeroSync} onXeroConnect={handleXeroConnect} onXeroDisconnect={handleXeroDisconnect} onOpenSalaryModal={openSalaryModal} onOpenExpenseModal={() => setShowExpenseModal(true)} userRole={userRole} userFullName={userFullName} />}

          {/* Salary Modal */}
          {showSalaryModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSalaryModal(false)}>
              <div style={{ background: "white", borderRadius: 12, padding: 24, maxWidth: 600, width: "90%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 600 }}><i className="fas fa-edit" style={{ marginRight: 8, color: "#007890" }} />Edit Salaries (CTC)</h3>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={{ textAlign: "left", padding: "6px 8px", fontSize: "0.8rem", borderBottom: "2px solid #e5e7eb" }}>Inspector</th><th style={{ textAlign: "right", padding: "6px 8px", fontSize: "0.8rem", borderBottom: "2px solid #e5e7eb" }}>Monthly Salary (R)</th></tr></thead>
                  <tbody>
                    {Object.entries(editingSalaries).map(([name, val]) => (
                      <tr key={name}><td style={{ padding: "4px 8px", fontSize: "0.85rem" }}>{name}</td><td style={{ padding: "4px 8px" }}><input type="number" value={val} onChange={e => setEditingSalaries({ ...editingSalaries, [name]: Number(e.target.value) })} style={{ width: "100%", textAlign: "right", padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: "0.85rem" }} /></td></tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                  <button onClick={() => setShowSalaryModal(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: "0.85rem" }}>Cancel</button>
                  <button onClick={saveSalaries} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#007890", color: "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}>Save</button>
                </div>
              </div>
            </div>
          )}

          {/* Expense Modal */}
          {showExpenseModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowExpenseModal(false)}>
              <div style={{ background: "white", borderRadius: 14, maxWidth: 620, width: "92%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #f59e0b, #d97706)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="fas fa-receipt" style={{ color: "white", fontSize: 16 }} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1f2937" }}>Log Expense</h3>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>{expenseLog.length} expense{expenseLog.length !== 1 ? "s" : ""} logged</p>
                    </div>
                  </div>
                  <button onClick={() => setShowExpenseModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, padding: 4, lineHeight: 1 }}><i className="fas fa-times" /></button>
                </div>

                {/* Form */}
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>Inspector</label>
                      <select value={newExpense.inspector} onChange={e => setNewExpense({ ...newExpense, inspector: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.85rem", color: newExpense.inspector ? "#1f2937" : "#9ca3af", background: "white", outline: "none", transition: "border-color 0.15s" }} onFocus={e => e.target.style.borderColor = "#f59e0b"} onBlur={e => e.target.style.borderColor = "#e5e7eb"}>
                        <option value="">Select inspector...</option>
                        {data?.filterOptions?.inspectors?.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>Amount</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "0.85rem", fontWeight: 500 }}>R</span>
                        <input type="number" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} style={{ width: "100%", padding: "9px 12px 9px 28px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.85rem", outline: "none", transition: "border-color 0.15s" }} onFocus={e => e.target.style.borderColor = "#f59e0b"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>Date</label>
                      <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.85rem", outline: "none", transition: "border-color 0.15s" }} onFocus={e => e.target.style.borderColor = "#f59e0b"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>Description</label>
                      <input type="text" placeholder="e.g. Fuel, equipment, travel..." value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.85rem", outline: "none", transition: "border-color 0.15s" }} onFocus={e => e.target.style.borderColor = "#f59e0b"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
                    </div>
                  </div>
                  <button onClick={() => {
                    if (!newExpense.inspector || !newExpense.amount) return;
                    const entry = { id: Date.now().toString(), inspector: newExpense.inspector, amount: Number(newExpense.amount), description: newExpense.description, date: newExpense.date || new Date().toISOString().slice(0, 10) };
                    saveExpenses([...expenseLog, entry]);
                    setNewExpense({ inspector: "", amount: "", description: "", date: "" });
                  }} disabled={!newExpense.inspector || !newExpense.amount} style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "none", background: !newExpense.inspector || !newExpense.amount ? "#e5e7eb" : "linear-gradient(135deg, #f59e0b, #d97706)", color: !newExpense.inspector || !newExpense.amount ? "#9ca3af" : "white", cursor: !newExpense.inspector || !newExpense.amount ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
                    <i className="fas fa-plus" /> Add Expense
                  </button>
                </div>

                {/* Expense List */}
                {expenseLog.length > 0 && (
                  <div style={{ borderTop: "1px solid #f0f0f0", padding: "16px 24px 20px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}>Logged Expenses</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {expenseLog.map(e => (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#fafafa", borderRadius: 8, border: "1px solid #f0f0f0" }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <i className="fas fa-receipt" style={{ color: "#d97706", fontSize: 13 }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1f2937" }}>{e.inspector}</span>
                              <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{e.date}</span>
                            </div>
                            {e.description && <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</div>}
                          </div>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#d97706", flexShrink: 0 }}>{fmtRand(e.amount)}</span>
                          <button onClick={() => saveExpenses(expenseLog.filter(x => x.id !== e.id))} style={{ background: "none", border: "none", color: "#d1d5db", cursor: "pointer", padding: 4, fontSize: 13, lineHeight: 1, borderRadius: 4, transition: "color 0.15s" }} onMouseEnter={e => (e.target as HTMLElement).style.color = "#ef4444"} onMouseLeave={e => (e.target as HTMLElement).style.color = "#d1d5db"}>
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1f2937" }}>Total: <span style={{ color: "#d97706" }}>{fmtRand(expenseLog.reduce((s, e) => s + (e.amount || 0), 0))}</span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Targets Modal */}
          {showTargetsModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowTargetsModal(false)}>
              <div style={{ background: "white", borderRadius: 12, padding: 24, maxWidth: 550, width: "90%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 600 }}><i className="fas fa-bullseye" style={{ marginRight: 8, color: "#007890" }} />Quarterly Inspector Targets</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <select value={editingTarget.inspector_name} onChange={e => {
                    const name = e.target.value;
                    const existing = quarterlyTargets[name];
                    if (existing) setEditingTarget({ ...existing });
                    else setEditingTarget(t => ({ ...t, inspector_name: name }));
                  }} style={{ flex: 1, padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem" }}>
                    <option value="">-- Select Inspector --</option>
                    {data?.filterOptions?.inspectors?.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <select value={editingTarget.year} onChange={e => setEditingTarget(t => ({ ...t, year: Number(e.target.value) }))} style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem" }}>
                    {(data?.filterOptions?.years ?? [new Date().getFullYear()]).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={editingTarget.quarter} onChange={e => setEditingTarget(t => ({ ...t, quarter: Number(e.target.value) }))} style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem" }}>
                    {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>Inspection Targets</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {([["eggs", "Egg Inspections", 51], ["poultry", "Poultry Inspections", 59], ["raw", "RAW Inspections", 63], ["pmp", "PMP Inspections", 54], ["raw_samples", "RAW Samples", 58], ["pmp_samples", "PMP Samples", 12]] as [string, string, number][]).map(([key, label, def]) => (
                    <div key={key}>
                      <label style={{ fontSize: "0.7rem", color: "#6b7280", display: "block", marginBottom: 2 }}>{label}</label>
                      <input type="number" min={0} value={(editingTarget as unknown as Record<string, number>)[key] ?? def}
                        onChange={e => setEditingTarget(t => ({ ...t, [key]: Number(e.target.value) }))}
                        style={{ width: "100%", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <button onClick={applyTargetToAll} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#f59e0b", color: "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}>
                    <i className="fas fa-users" style={{ marginRight: 6 }} />Apply to All Inspectors
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowTargetsModal(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: "0.85rem" }}>Cancel</button>
                    <button onClick={saveQuarterlyTarget} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#007890", color: "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}>Save Target</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL 1: Overview
// ════════════════════════════════════════════════════════════════════════════════

function OverviewPanel({ data, totalKm, avgDocSend, avgApproval, totalSamples }: { data: AnalyticsData; totalKm: number; avgDocSend: number; avgApproval: number; totalSamples: number }) {
  // Daily compliance trend
  console.log("[OverviewPanel] dailyComplianceTrend received:", data.dailyComplianceTrend?.length, "items, first 3:", (data.dailyComplianceTrend || []).slice(0, 3));
  const dailyDays = [...new Set((data.dailyComplianceTrend || []).map((d) => d.day))].sort();
  const dailyCommodities = [...new Set((data.dailyComplianceTrend || []).map((d) => d.commodity))];
  console.log("[OverviewPanel] dailyDays:", dailyDays, "dailyCommodities:", dailyCommodities);
  const dailyChartData = {
    labels: dailyDays.map(fmtDay),
    datasets: dailyCommodities.map((c, i) => ({
      label: c,
      data: dailyDays.map((day) => {
        const row = (data.dailyComplianceTrend || []).find((r) => r.day === day && r.commodity === c);
        return row ? row.compliance_rate : 0;
      }),
      borderColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
      backgroundColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
      ...lineDefaults,
    })),
  };

  // Monthly inspections
  const miLabels = (data.monthlyInspectionsTrend || []).map((d) => fmtMonth(d.month));
  const miData = {
    labels: miLabels,
    datasets: [{ label: "Inspections", data: (data.monthlyInspectionsTrend || []).map((d) => d.count), backgroundColor: "#007890", borderRadius: 4 }],
  };

  // Weekly compliance (aggregated) for Approval Rate chart
  const wcWeeks = (data.weeklyComplianceTrend || []).map((d) => d.week).sort();
  const wcRates = (data.weeklyComplianceTrend || []).sort((a, b) => a.week.localeCompare(b.week)).map((d) => d.compliance_rate);
  const wcIsSingle = wcWeeks.length <= 1;
  const wcData = {
    labels: wcWeeks.map((w) => { try { return new Date(w).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }); } catch { return w; } }),
    datasets: [{
      label: "Approval Rate %",
      data: wcRates,
      ...(wcIsSingle
        ? { backgroundColor: "#10b981", borderRadius: 4 }
        : { borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", ...lineDefaults, fill: true }),
    }],
  };

  // Occurrence trend
  const occData = {
    labels: (data.monthlyOccurrenceTrend || []).map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Occurrences", data: (data.monthlyOccurrenceTrend || []).map((d) => d.count), backgroundColor: "#EC343C", borderRadius: 4 }],
  };

  // Facility types bar chart
  const ftSorted = [...(data.facilityTypeDistribution || [])].sort((a, b) => b.count - a.count);
  const ftData = {
    labels: ftSorted.map((d) => d.facility_type),
    datasets: [{
      label: "Inspections",
      data: ftSorted.map((d) => d.count),
      backgroundColor: ftSorted.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
      borderRadius: 4,
    }],
  };

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      {/* Primary KPIs */}
      <div className="analytics-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        <KpiCard label="Total Inspections" value={data.totalInspections} />
        <KpiCard label="Compliance Rate" value={`${data.complianceRate.toFixed(1)}%`} color="#10b981" />
        <KpiCard label="Active Inspectors" value={data.activeInspectors} color="#f59e0b" />
        <KpiCard label="Total Revenue" value={fmtRand(data.financialSummary?.total_revenue ?? 0)} color="#10b981" />
      </div>

      {/* Secondary KPIs */}
      <div className="analytics-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        <KpiCard label="Occurrence Reports" value={data.totalOccurrenceReports} color="#ef4444" icon="fas fa-exclamation-circle" />
        <KpiCard label="Total KM Traveled" value={totalKm.toLocaleString("en-ZA")} color="#3b82f6" icon="fas fa-road" />
        <KpiCard label="Avg Days: Doc Send" value={avgDocSend.toFixed(1)} color="#f59e0b" icon="fas fa-paper-plane" />
        <KpiCard label="Avg Days: Approval" value={avgApproval.toFixed(1)} color="#8764b8" icon="fas fa-hourglass-half" />
        <KpiCard label="Total Samples Taken" value={totalSamples} color="#10b981" icon="fas fa-vial" />
      </div>

      {/* Compliance per commodity */}
      <Card title="Compliance Per Commodity" icon="fas fa-shield-alt" tooltip="Approval rate breakdown by commodity type (RAW, PMP, EGGS, POULTRY) for the selected period.">
        <div className="space-y-3">
          {(data.complianceByCommodity || []).map((c) => (
            <div key={c.commodity} className="flex items-center gap-3">
              <span className="font-semibold text-sm text-gray-800 w-20 flex-shrink-0">{c.commodity}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden relative">
                <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(c.compliance_rate, 3)}%`, backgroundColor: colorForCommodity(c.commodity) }}>
                  {c.compliance_rate > 15 && <span className="text-white text-[11px] font-bold" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>{c.compliance_rate.toFixed(1)}%</span>}
                </div>
              </div>
              <span className="text-xs text-gray-500 w-[80px] text-right flex-shrink-0">{c.compliance_rate.toFixed(1)}% ({c.compliant}/{c.total})</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily compliance trend */}
      <Card title="Daily Compliance Trend by Commodity" icon="fas fa-chart-line" tooltip="Daily compliance percentage trends across all commodity types over time.">
        <ChartWrap height="260px">
          <DLLine data={dailyChartData} options={baseChartOptions(undefined, "Compliance %", { datalabels: false }) as never} />
        </ChartWrap>
      </Card>

      {/* 3-col: Monthly Inspections, Approval Rate, Occurrence Trend */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Monthly Inspections" icon="fas fa-chart-bar" tooltip="Total number of inspections completed each month.">
          <ChartWrap height="200px"><DLBar data={miData} options={baseChartOptions(undefined, undefined, { datalabels: true, datalabelColor: "#1f2937" }) as never} /></ChartWrap>
        </Card>
        <Card title="Approval Rate (Weekly)" icon="fas fa-check-double" tooltip="Percentage of inspections approved per week.">
          <ChartWrap height="200px">
            {wcIsSingle
              ? <DLBar data={wcData} options={baseChartOptions(undefined, "Approval %", { datalabels: true, datalabelColor: "#1f2937", datalabelSuffix: "%" }) as never} />
              : <DLLine data={wcData} options={baseChartOptions(undefined, "Approval %", { datalabels: false }) as never} />
            }
          </ChartWrap>
        </Card>
        <Card title="Occurrence Trend" icon="fas fa-exclamation-triangle" tooltip="Monthly trend of occurrence reports (non-compliance incidents) filed.">
          <ChartWrap height="200px"><DLBar data={occData} options={baseChartOptions(undefined, undefined, { datalabels: true, datalabelColor: "#1f2937" }) as never} /></ChartWrap>
        </Card>
      </div>

      {/* Facility Types — unique to Overview */}
      <Card title="Facility Types" icon="fas fa-building" tooltip="Distribution of inspections across different facility types (e.g. abattoir, farm, processor).">
        <ChartWrap height="220px"><DLBar data={ftData} options={{
          ...baseChartOptions(undefined, undefined, { datalabels: true, datalabelColor: "#1f2937" }),
          indexAxis: "y" as const,
          scales: { x: { beginAtZero: true, ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 10 } } } },
        } as never} /></ChartWrap>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL 2: Inspectors
// ════════════════════════════════════════════════════════════════════════════════

function InspectorsPanel({ data, inspectorMetric, setInspectorMetric, quarterlyTargets, targetYear, targetQuarter, setTargetYear, setTargetQuarter, onSetTargets, filterInspector }: {
  data: AnalyticsData;
  inspectorMetric: "count" | "total_km" | "total_hours" | "samples";
  setInspectorMetric: (v: "count" | "total_km" | "total_hours" | "samples") => void;
  quarterlyTargets: Record<string, QuarterlyTarget>;
  targetYear: number;
  targetQuarter: number;
  setTargetYear: (y: number) => void;
  setTargetQuarter: (q: number) => void;
  onSetTargets: () => void;
  filterInspector?: string;
}) {
  const [radarInspector, setRadarInspector] = useState(filterInspector || "all");
  useEffect(() => { setRadarInspector(filterInspector || "all"); }, [filterInspector]);
  const metricLabel: Record<string, string> = { count: "Inspections", total_km: "KM Traveled", total_hours: "Hours", samples: "Samples" };

  // Inspector totals for selected metric — ranked bar chart
  const inspectorTotals = [...new Set((data.monthlyInspectorTrend || []).map((d) => d.inspector_name))]
    .map((name) => {
      const rows = (data.monthlyInspectorTrend || []).filter((r) => r.inspector_name === name);
      const total = rows.reduce((s, r) => s + (Number(r[inspectorMetric]) || 0), 0);
      return { name, total };
    })
    .sort((a, b) => b.total - a.total);
  const rankData = {
    labels: inspectorTotals.map((d) => d.name),
    datasets: [{
      label: metricLabel[inspectorMetric],
      data: inspectorTotals.map((d) => Math.round(d.total * 10) / 10),
      backgroundColor: inspectorTotals.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
      borderRadius: 4,
    }],
  };
  const rankOpts = {
    ...baseChartOptions(),
    indexAxis: "y" as const,
    plugins: {
      ...((baseChartOptions() as Record<string, unknown>).plugins as Record<string, unknown>),
      legend: { display: false },
      datalabels: { anchor: "end" as const, align: "right" as const, font: { size: 10, weight: "bold" as const }, color: "#374151", formatter: (v: number) => v === 0 ? "" : String(v) },
    },
    layout: { padding: { right: 40 } },
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: "#f3f4f6" } },
      y: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };

  // Compliance per inspector (horizontal stacked bar)
  const compData = {
    labels: (data.inspectorPerformance || []).map((d) => d.inspector_name),
    datasets: [
      { label: "Compliant", data: (data.inspectorPerformance || []).map((d) => d.compliant), backgroundColor: "#10b981" },
      { label: "Non-Compliant", data: (data.inspectorPerformance || []).map((d) => d.non_compliant), backgroundColor: "#ef4444" },
    ],
  };
  const stackedOpts = {
    ...baseChartOptions(),
    indexAxis: "y" as const,
    plugins: {
      ...((baseChartOptions() as Record<string, unknown>).plugins as Record<string, unknown>),
      datalabels: { anchor: "center" as const, align: "center" as const, font: { size: 9, weight: "bold" as const }, color: "#fff", formatter: (v: number) => v === 0 ? "" : String(v) },
    },
    scales: {
      x: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 } } },
      y: { stacked: true, ticks: { font: { size: 10 } } },
    },
  };

  // Use quarterly targets (from DB) or fall back to inspectorTargets
  const allInspectors = data.filterOptions?.inspectors ?? [];
  const commodityList = ["EGG", "POULTRY", "RAW", "PMP"];

  function getActual(inspector: string, commodity: string): number {
    const c = commodity === "EGG" ? "EGGS" : commodity;
    const row = (data.inspectorCommodityMatrix || []).find(
      (r) => r.inspector_name === inspector && r.commodity.toUpperCase() === c
    );
    return row?.count ?? 0;
  }

  function getQTarget(inspector: string, commodity: string): number {
    const qt = quarterlyTargets[inspector];
    if (!qt) return 0;
    // Map commodity to QuarterlyTarget key: EGG->eggs, POULTRY->poultry, RAW->raw, PMP->pmp
    const keyMap: Record<string, keyof QuarterlyTarget> = { EGG: "eggs", EGGS: "eggs", POULTRY: "poultry", RAW: "raw", PMP: "pmp" };
    const key = keyMap[commodity.toUpperCase()] ?? (commodity.toLowerCase() as keyof QuarterlyTarget);
    return (qt[key] as number) ?? 0;
  }

  function getSampleActual(inspector: string, commodity: string): number {
    return (data.inspectorSampleMatrix || []).find(r => r.inspector_name === inspector && r.commodity.toUpperCase().includes(commodity))?.count ?? 0;
  }

  // Radar chart data — use quarterly targets for target ring, actuals for data
  const quarterLabel = `Q${targetQuarter}: ${["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"][targetQuarter - 1]}`;
  const radarLabels = ["EGG", "POULTRY", "RAW", "PMP", "Raw Samples", "PMP Samples"];
  const radarInspectors = radarInspector === "all" ? allInspectors : [radarInspector];
  const radarDatasets = radarInspectors.map((inspector, i) => ({
    label: inspector,
    data: [
      getActual(inspector, "EGG"),
      getActual(inspector, "POULTRY"),
      getActual(inspector, "RAW"),
      getActual(inspector, "PMP"),
      getSampleActual(inspector, "RAW"),
      getSampleActual(inspector, "PMP"),
    ],
    borderColor: CHART_PALETTE[i % CHART_PALETTE.length],
    backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] + "22",
    pointBackgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
    borderWidth: 2,
  }));

  // Add target ring if a single inspector is selected and has targets
  if (radarInspector !== "all" && quarterlyTargets[radarInspector]) {
    const qt = quarterlyTargets[radarInspector];
    radarDatasets.push({
      label: "Target",
      data: [qt.eggs, qt.poultry, qt.raw, qt.pmp, qt.raw_samples, qt.pmp_samples],
      borderColor: "#ef4444",
      backgroundColor: "rgba(239,68,68,0.08)",
      pointBackgroundColor: "#ef4444",
      borderWidth: 2,
    });
  }

  const radarChartData = { labels: radarLabels, datasets: radarDatasets };
  const radarOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" as const, labels: { boxWidth: 12, font: { size: 11 }, padding: 16 } }, datalabels: { display: false } },
    layout: { padding: { top: 50 } },
    scales: { r: { beginAtZero: true, ticks: { font: { size: 10 } }, pointLabels: { font: { size: 11 } } } },
  };

  // Targets table: show all inspectors (not just those with targets)
  const targetInspectors = allInspectors.filter(n => !data.nonInspectorNames?.includes(n));

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      {/* Inspector Radar Chart */}
      <Card title={`Inspector Performance vs Targets (${quarterLabel})`} icon="fas fa-bullseye" tooltip="Radar chart comparing each inspector's actual performance against quarterly targets across all metrics."
        headerRight={
          <select value={radarInspector} onChange={e => setRadarInspector(e.target.value)}
            style={{ fontSize: 12, padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb", minWidth: 160 }}>
            <option value="all">All Inspectors</option>
            {allInspectors.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        }
      >
        <div className="analytics-radar-wrap" style={{ position: "relative", height: "380px", minHeight: 300 }}>
          <DLRadar data={radarChartData} options={radarOpts as never} />
        </div>
      </Card>

      {/* Quarterly Targets */}
      <Card title="Inspector Quarterly Targets & Activity" icon="fas fa-clipboard-check" tooltip="Table showing each inspector's progress toward quarterly commodity targets with actual vs target counts."
        headerRight={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))} style={{ fontSize: 11, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6 }}>
              {(data.filterOptions?.years ?? [new Date().getFullYear()]).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={targetQuarter} onChange={e => setTargetQuarter(Number(e.target.value))} style={{ fontSize: 11, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6 }}>
              {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select>
            <button onClick={onSetTargets} style={{ fontSize: 12, padding: "6px 14px", border: "none", borderRadius: 6, background: "#007890", color: "white", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="fas fa-bullseye" /> Set Targets
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
            <thead>
              <tr>
                <th style={{ background: "#e6f3f7", padding: "0.6rem 0.75rem", fontWeight: 600, fontSize: "0.75rem", textAlign: "center", whiteSpace: "nowrap", borderBottom: "2px solid #e5e7eb", textTransform: "uppercase", letterSpacing: "0.3px" }}>Inspector</th>
                {commodityList.map((c) => (
                  <th key={c} style={{ background: "#e6f3f7", padding: "0.6rem 0.75rem", fontWeight: 600, fontSize: "0.75rem", textAlign: "center", whiteSpace: "nowrap", borderBottom: "2px solid #e5e7eb", textTransform: "uppercase", letterSpacing: "0.3px" }} colSpan={2}>{c}</th>
                ))}
              </tr>
              <tr>
                <th style={{ borderBottom: "1px solid #e5e7eb" }}></th>
                {commodityList.map((c) => (
                  <Fragment key={c}>
                    <th style={{ padding: "4px 6px", textAlign: "center", fontSize: "0.65rem", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>Actual</th>
                    <th style={{ padding: "4px 6px", textAlign: "center", fontSize: "0.65rem", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>Target</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {targetInspectors.map((inspector) => (
                <tr key={inspector} style={{ borderBottom: "1px solid #e5e7eb" }} className="hover:bg-gray-50">
                  <td style={{ padding: "0.5rem 0.75rem", fontWeight: 500, textAlign: "center" }}>{inspector}</td>
                  {commodityList.map((c) => {
                    const actual = getActual(inspector, c);
                    const target = getQTarget(inspector, c);
                    const met = actual >= target && target > 0;
                    return (
                      <Fragment key={c}>
                        <td style={{ padding: "0.5rem 0.5rem", textAlign: "center", fontWeight: 600, color: target > 0 ? (met ? "#059669" : "#ef4444") : "#374151" }}>{actual}</td>
                        <td style={{ padding: "0.5rem 0.5rem", textAlign: "center", color: "#ef4444", fontWeight: 500 }}>{target}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspector Performance Ranking */}
      <Card title="Inspector Performance Ranking" icon="fas fa-ranking-star" tooltip="Ranked comparison of all inspectors by selected metric — switch between inspections, KM, hours, or samples."
        headerRight={
          <select value={inspectorMetric} onChange={(e) => setInspectorMetric(e.target.value as typeof inspectorMetric)}
            style={{ fontSize: "12px", padding: "6px 28px 6px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb", color: "#374151", fontWeight: 500, cursor: "pointer" }}>
            {Object.entries(metricLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        }>
        <ChartWrap height={`${Math.max(250, inspectorTotals.length * 36)}px`}>
          <DLBar data={rankData} options={rankOpts as never} />
        </ChartWrap>
      </Card>

    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL 3: Compliance
// ════════════════════════════════════════════════════════════════════════════════

function CompliancePanel({ data }: { data: AnalyticsData }) {
  const [trendView, setTrendView] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [trendOffset, setTrendOffset] = useState(0); // 0 = latest, negative = back in time

  // Build trend data based on selected view
  const buildTrendData = () => {
    if (trendView === "monthly") {
      const months = [...new Set((data.monthlyComplianceTrend || []).map((d) => d.month))].sort();
      const windowSize = 6;
      const end = months.length + trendOffset;
      const start = Math.max(0, end - windowSize);
      const visibleMonths = months.slice(start, end > 0 ? end : months.length);
      const commodities = [...new Set((data.monthlyComplianceTrend || []).map((d) => d.commodity))];
      return {
        labels: visibleMonths.map(fmtMonth),
        datasets: commodities.map((c, i) => ({
          label: c,
          data: visibleMonths.map((m) => {
            const row = (data.monthlyComplianceTrend || []).find((r) => r.month === m && r.commodity === c);
            return row ? row.compliance_rate : 0;
          }),
          borderColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
          backgroundColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
          ...lineDefaults,
        })),
        canBack: start > 0,
        canForward: trendOffset < 0,
      };
    } else if (trendView === "daily") {
      const days = [...new Set((data.dailyComplianceTrend || []).map((d) => d.day))].sort();
      const windowSize = 14;
      const end = days.length + trendOffset;
      const start = Math.max(0, end - windowSize);
      const visibleDays = days.slice(start, end > 0 ? end : days.length);
      const commodities = [...new Set((data.dailyComplianceTrend || []).map((d) => d.commodity))];
      return {
        labels: visibleDays.map(d => { const dt = new Date(d + "T12:00:00"); return `${dt.getDate()}/${dt.getMonth()+1}`; }),
        datasets: commodities.map((c, i) => ({
          label: c,
          data: visibleDays.map((day) => {
            const row = (data.dailyComplianceTrend || []).find((r) => r.day === day && r.commodity === c);
            return row ? row.compliance_rate : 0;
          }),
          borderColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
          backgroundColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
          ...lineDefaults,
        })),
        canBack: start > 0,
        canForward: trendOffset < 0,
      };
    } else {
      // Weekly: group daily data by week
      const days = [...new Set((data.dailyComplianceTrend || []).map((d) => d.day))].sort();
      const commodities = [...new Set((data.dailyComplianceTrend || []).map((d) => d.commodity))];
      const weekMap: Record<string, Record<string, { total: number; compliant: number }>> = {};
      (data.dailyComplianceTrend || []).forEach(d => {
        const dt = new Date(d.day + "T12:00:00");
        const weekStart = new Date(dt);
        weekStart.setDate(dt.getDate() - dt.getDay());
        const key = weekStart.toISOString().split("T")[0];
        if (!weekMap[key]) weekMap[key] = {};
        if (!weekMap[key][d.commodity]) weekMap[key][d.commodity] = { total: 0, compliant: 0 };
        weekMap[key][d.commodity].total += d.total;
        weekMap[key][d.commodity].compliant += d.compliant;
      });
      const weeks = Object.keys(weekMap).sort();
      const windowSize = 8;
      const end = weeks.length + trendOffset;
      const start = Math.max(0, end - windowSize);
      const visibleWeeks = weeks.slice(start, end > 0 ? end : weeks.length);
      return {
        labels: visibleWeeks.map(w => { const dt = new Date(w + "T12:00:00"); return `W${Math.ceil(dt.getDate()/7)} ${dt.toLocaleString("en", {month:"short"})}`; }),
        datasets: commodities.map((c, i) => ({
          label: c,
          data: visibleWeeks.map(w => {
            const d = weekMap[w]?.[c];
            return d && d.total > 0 ? Math.round((d.compliant / d.total) * 100 * 10) / 10 : 0;
          }),
          borderColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
          backgroundColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
          ...lineDefaults,
        })),
        canBack: start > 0,
        canForward: trendOffset < 0,
      };
    }
  };

  const trendData = buildTrendData();
  const compTrend = { labels: trendData.labels, datasets: trendData.datasets };


  // Weekly compliance trend using real compliance percentages from monthlyComplianceTrend
  const compMonths = [...new Set((data.monthlyComplianceTrend || []).map((d) => d.month))].sort();
  const compCommodities = [...new Set((data.monthlyComplianceTrend || []).map((d) => d.commodity))];
  const weeklyData = {
    labels: compMonths.map(fmtMonth),
    datasets: compCommodities.map((c, i) => ({
      label: c,
      data: compMonths.map((m) => {
        const row = (data.monthlyComplianceTrend || []).find((r) => r.month === m && r.commodity === c);
        return row ? row.compliance_rate : 0;
      }),
      backgroundColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
    })),
  };
  const stackedOpts = {
    ...baseChartOptions(undefined, "Compliance %", { datalabelFormatter: (v: unknown) => { const n = Number(v); return !n || isNaN(n) ? "" : n.toFixed(1) + "%"; } }),
    scales: {
      x: { stacked: false, ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 }, callback: (v: unknown) => v + "%" } },
    },
  };

  // Samples (exclude Eggs & Poultry)
  const filteredSamples = (data.samplesByCommodity || []).filter(d => isSampleCommodity(d.commodity));
  const samplesData = {
    labels: filteredSamples.map((d) => d.commodity),
    datasets: [{ label: "Samples", data: filteredSamples.map((d) => d.count), backgroundColor: filteredSamples.map((d) => colorForCommodity(d.commodity)) }],
  };

  // Time allocation (horizontal bar)
  const taData = {
    labels: (data.timeAllocation || []).map((d) => d.inspector_name),
    datasets: [{ label: "Hours", data: (data.timeAllocation || []).map((d) => d.total_hours), backgroundColor: "#007890" }],
  };
  const hBarOpts = {
    ...baseChartOptions(),
    indexAxis: "y" as const,
    plugins: {
      ...((baseChartOptions() as Record<string, unknown>).plugins as Record<string, unknown>),
      datalabels: { anchor: "end" as const, align: "right" as const, font: { size: 9, weight: "bold" as const }, color: "#374151", formatter: (v: unknown) => { const n = Number(v); return !n || isNaN(n) ? "" : n.toFixed(1); } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 10 } } },
      y: { ticks: { font: { size: 10 } } },
    },
  };

  // Occurrence reports per inspector
  const orData = {
    labels: (data.occurrenceReports || []).map((d) => d.inspector_name),
    datasets: [{ label: "Reports", data: (data.occurrenceReports || []).map((d) => d.count), backgroundColor: "#EC343C", borderRadius: 4 }],
  };

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      <Card title="Commodity Compliance Trend (%)" icon="fas fa-chart-line" tooltip="Compliance rate trend for each commodity. Toggle between daily, weekly, and monthly views. Use arrows to scroll through time."
        headerRight={
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button onClick={() => { setTrendOffset(o => o - 1); }} disabled={!trendData.canBack}
              style={{ padding: "3px 8px", border: "1px solid #e5e7eb", borderRadius: 4, background: trendData.canBack ? "#fff" : "#f3f4f6", cursor: trendData.canBack ? "pointer" : "default", fontSize: 12, color: trendData.canBack ? "#374151" : "#d1d5db" }}>
              <i className="fas fa-chevron-left" />
            </button>
            {(["daily", "weekly", "monthly"] as const).map(v => (
              <button key={v} onClick={() => { setTrendView(v); setTrendOffset(0); }}
                style={{ padding: "3px 10px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 11, fontWeight: trendView === v ? 700 : 400, background: trendView === v ? "#007890" : "#fff", color: trendView === v ? "#fff" : "#374151", cursor: "pointer" }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <button onClick={() => { setTrendOffset(o => Math.min(o + 1, 0)); }} disabled={!trendData.canForward}
              style={{ padding: "3px 8px", border: "1px solid #e5e7eb", borderRadius: 4, background: trendData.canForward ? "#fff" : "#f3f4f6", cursor: trendData.canForward ? "pointer" : "default", fontSize: 12, color: trendData.canForward ? "#374151" : "#d1d5db" }}>
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        }
      >
        <div style={{ overflowX: "auto", overflowY: "hidden" }}>
          <div style={{ minWidth: Math.max(600, compTrend.labels.length * 80), height: 240, position: "relative" }}>
            <DLLine data={compTrend} options={{ ...baseChartOptions(undefined, "Compliance %", { datalabels: false }), maintainAspectRatio: false } as never} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Monthly Compliance %" icon="fas fa-chart-line" tooltip="Monthly compliance rate per commodity — uses real approval percentages.">
          <ChartWrap height="280px"><DLBar data={weeklyData} options={{
            ...baseChartOptions(undefined, "Compliance %", { datalabels: false }),
            scales: { x: { stacked: false, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 }, callback: (v: unknown) => v + "%" } } },
          } as never} /></ChartWrap>
        </Card>
        <Card title="Samples Taken" icon="fas fa-vial" tooltip="Total lab samples collected per commodity type.">
          <ChartWrap height="280px"><DLBar data={samplesData} options={baseChartOptions() as never} /></ChartWrap>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Time Allocation (Billable Hours)" icon="fas fa-clock" tooltip="Distribution of billable hours worked across all inspectors.">
          <ChartWrap height="280px">
            <DLBar data={taData} options={hBarOpts as never} />
          </ChartWrap>
        </Card>
        <Card title={`Occurrence Reports (${data.totalOccurrenceReports})`} icon="fas fa-file-alt" tooltip="Number of occurrence reports filed per inspector.">
          <ChartWrap height="280px"><DLBar data={orData} options={baseChartOptions() as never} /></ChartWrap>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL 4: Operations
// ════════════════════════════════════════════════════════════════════════════════

function OperationsPanel({ data }: { data: AnalyticsData }) {
  // Monthly travel distance (area)
  const mtdData = {
    labels: (data.monthlyTravelTrend || []).map((d) => fmtMonth(d.month)),
    datasets: [{ label: "KM", data: (data.monthlyTravelTrend || []).map((d) => d.total_km), borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.15)", ...lineDefaults, fill: true }],
  };

  // Travel hours trend
  const thtData = {
    labels: (data.monthlyTravelHoursTrend || []).map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Hours", data: (data.monthlyTravelHoursTrend || []).map((d) => d.total_hours), borderColor: "#8764b8", backgroundColor: "rgba(135,100,184,0.1)", ...lineDefaults, fill: true }],
  };

  // Travel distance per inspector (horizontal bar)
  const tdpData = {
    labels: (data.travelPerInspector || []).map((d) => d.inspector_name),
    datasets: [{ label: "KM", data: (data.travelPerInspector || []).map((d) => d.total_km), backgroundColor: "#0078d4" }],
  };
  const hBarOpts = {
    ...baseChartOptions(),
    indexAxis: "y" as const,
    plugins: {
      ...((baseChartOptions() as Record<string, unknown>).plugins as Record<string, unknown>),
      datalabels: { anchor: "end" as const, align: "right" as const, font: { size: 9, weight: "bold" as const }, color: "#374151", formatter: (v: unknown) => { const n = Number(v); return !n || isNaN(n) ? "" : (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1)); } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 10 } } },
      y: { ticks: { font: { size: 10 } } },
    },
  };

  // Travel time per inspector (horizontal bar)
  const ttpData = {
    labels: (data.travelTimePerInspector || []).map((d) => d.inspector_name),
    datasets: [{ label: "Hours", data: (data.travelTimePerInspector || []).map((d) => d.total_hours), backgroundColor: "#8764b8" }],
  };

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Monthly Travel Distance (km)" icon="fas fa-chart-area" tooltip="Total kilometres driven by all inspectors each month.">
          <ChartWrap height="180px"><DLLine data={mtdData} options={baseChartOptions(undefined, "KM", { datalabels: false }) as never} /></ChartWrap>
        </Card>
        <Card title="Travel Hours Trend (Monthly)" icon="fas fa-chart-line" tooltip="Monthly trend of hours spent travelling by all inspectors.">
          <ChartWrap height="180px"><DLLine data={thtData} options={baseChartOptions(undefined, "Hours", { datalabels: false }) as never} /></ChartWrap>
        </Card>
      </div>
      <Card title="Travel Distance Per Inspector" icon="fas fa-route" tooltip="Total kilometres driven by each inspector for the selected period.">
        <ChartWrap height="300px">
          <DLBar data={tdpData} options={hBarOpts as never} />
        </ChartWrap>
      </Card>
      <Card title="Travel Time Per Inspector (Hours)" icon="fas fa-car" tooltip="Total travel hours logged by each inspector.">
        <ChartWrap height="300px">
          <DLBar data={ttpData} options={hBarOpts as never} />
        </ChartWrap>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL 5: Timelines
// ════════════════════════════════════════════════════════════════════════════════

function TimelinesPanel({ data }: { data: AnalyticsData }) {
  const [timelineView, setTimelineView] = useState<"weekly" | "monthly">("weekly");
  const lineOpts = baseChartOptions(undefined, "Avg Days");

  const isWeekly = timelineView === "weekly";

  const docSendTrend = isWeekly ? {
    labels: (data.weeklyDocSendTrend || []).map((d) => d.week),
    datasets: [{ label: "Avg Days", data: (data.weeklyDocSendTrend || []).map((d) => d.avg_days), borderColor: "#0078d4", backgroundColor: "rgba(0,120,212,0.1)", ...lineDefaults, fill: true }],
  } : {
    labels: (data.monthlyDocSendTrend || []).map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Avg Days", data: (data.monthlyDocSendTrend || []).map((d) => d.avg_days), borderColor: "#0078d4", backgroundColor: "rgba(0,120,212,0.1)", ...lineDefaults, fill: true }],
  };
  const invoiceTrend = isWeekly ? {
    labels: (data.weeklyInvoiceTrend || []).map((d) => d.week),
    datasets: [{ label: "Avg Days", data: (data.weeklyInvoiceTrend || []).map((d) => d.avg_days), borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.1)", ...lineDefaults, fill: true }],
  } : {
    labels: (data.monthlyInvoiceTrend || []).map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Avg Days", data: (data.monthlyInvoiceTrend || []).map((d) => d.avg_days), borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.1)", ...lineDefaults, fill: true }],
  };
  const coaTrend = isWeekly ? {
    labels: (data.weeklyCoaTrend || []).map((d) => d.week),
    datasets: [{ label: "Avg Days", data: (data.weeklyCoaTrend || []).map((d) => d.avg_days), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", ...lineDefaults, fill: true }],
  } : {
    labels: (data.monthlyCoaTrend || []).map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Avg Days", data: (data.monthlyCoaTrend || []).map((d) => d.avg_days), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", ...lineDefaults, fill: true }],
  };
  const approvalTrend = isWeekly ? {
    labels: (data.weeklyApprovalTrend || []).map((d) => d.week),
    datasets: [{ label: "Avg Days", data: (data.weeklyApprovalTrend || []).map((d) => d.avg_days), borderColor: "#8764b8", backgroundColor: "rgba(135,100,184,0.1)", ...lineDefaults, fill: true }],
  } : {
    labels: (data.monthlyApprovalTrend || []).map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Avg Days", data: (data.monthlyApprovalTrend || []).map((d) => d.avg_days), borderColor: "#8764b8", backgroundColor: "rgba(135,100,184,0.1)", ...lineDefaults, fill: true }],
  };

  const hBarOpts = {
    ...baseChartOptions(),
    indexAxis: "y" as const,
    plugins: {
      ...((baseChartOptions() as Record<string, unknown>).plugins as Record<string, unknown>),
      datalabels: { anchor: "end" as const, align: "right" as const, font: { size: 9, weight: "bold" as const }, color: "#374151", formatter: (v: unknown) => { const n = Number(v); return !n || isNaN(n) ? "" : n.toFixed(1); } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 10 } }, title: { display: true, text: "Avg Days", font: { size: 11 } } },
      y: { ticks: { font: { size: 10 } } },
    },
  };

  const docSendBar = {
    labels: (data.docSendTime || []).map((d) => d.name),
    datasets: [{ label: "Avg Days", data: (data.docSendTime || []).map((d) => d.avg_days), backgroundColor: "#0078d4" }],
  };
  const invoiceBar = {
    labels: (data.invoiceUploadTime || []).map((d) => d.name),
    datasets: [{ label: "Avg Days", data: (data.invoiceUploadTime || []).map((d) => d.avg_days), backgroundColor: "#f59e0b" }],
  };
  const coaBar = {
    labels: (data.coaAnalysisTime || []).map((d) => d.commodity),
    datasets: [{ label: "Avg Days", data: (data.coaAnalysisTime || []).map((d) => d.avg_days), backgroundColor: "#10b981" }],
  };
  const approvalBar = {
    labels: (data.approvalTime || []).map((d) => d.inspector_name),
    datasets: [{ label: "Avg Days", data: (data.approvalTime || []).map((d) => d.avg_days), backgroundColor: "#8764b8" }],
  };

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      {/* Weekly / Monthly toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid #d1d5db" }}>
          <button onClick={() => setTimelineView("weekly")}
            style={{ padding: "5px 14px", fontSize: 12, fontWeight: timelineView === "weekly" ? 700 : 400, background: timelineView === "weekly" ? "#007890" : "#fff", color: timelineView === "weekly" ? "#fff" : "#374151", border: "none", cursor: "pointer" }}>
            <i className="fas fa-calendar-week" style={{ marginRight: 4 }} />Weekly
          </button>
          <button onClick={() => setTimelineView("monthly")}
            style={{ padding: "5px 14px", fontSize: 12, fontWeight: timelineView === "monthly" ? 700 : 400, background: timelineView === "monthly" ? "#007890" : "#fff", color: timelineView === "monthly" ? "#fff" : "#374151", border: "none", cursor: "pointer", borderLeft: "1px solid #d1d5db" }}>
            <i className="fas fa-calendar-alt" style={{ marginRight: 4 }} />Monthly
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title={`Doc Send Time Trend (${isWeekly ? "Weekly" : "Monthly"})`} icon="fas fa-chart-line" tooltip={`${isWeekly ? "Weekly" : "Monthly"} average days between inspection and document dispatch.`}>
          <ChartWrap height="180px"><DLLine data={docSendTrend} options={lineOpts as never} /></ChartWrap>
        </Card>
        <Card title={`Invoice Upload Time Trend (${isWeekly ? "Weekly" : "Monthly"})`} icon="fas fa-chart-line" tooltip={`${isWeekly ? "Weekly" : "Monthly"} average days between inspection and invoice upload.`}>
          <ChartWrap height="180px"><DLLine data={invoiceTrend} options={lineOpts as never} /></ChartWrap>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title={`COA Upload Time Trend (${isWeekly ? "Weekly" : "Monthly"})`} icon="fas fa-chart-line" tooltip={`${isWeekly ? "Weekly" : "Monthly"} average days from sample collection to Certificate of Analysis upload.`}>
          <ChartWrap height="180px"><DLLine data={coaTrend} options={lineOpts as never} /></ChartWrap>
        </Card>
        <Card title={`Approval Time Trend (${isWeekly ? "Weekly" : "Monthly"})`} icon="fas fa-chart-line" tooltip={`${isWeekly ? "Weekly" : "Monthly"} average days from document submission to final approval.`}>
          <ChartWrap height="180px"><DLLine data={approvalTrend} options={lineOpts as never} /></ChartWrap>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Avg Days to Send Documents" icon="fas fa-paper-plane" tooltip="Average days each inspector takes to send documents after an inspection.">
          <ChartWrap height="280px"><DLBar data={docSendBar} options={hBarOpts as never} /></ChartWrap>
        </Card>
        <Card title="Avg Days to Upload Invoice" icon="fas fa-file-invoice-dollar" tooltip="Average days each inspector takes to upload their invoice.">
          <ChartWrap height="280px"><DLBar data={invoiceBar} options={hBarOpts as never} /></ChartWrap>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Avg Days: Sample to COA Upload" icon="fas fa-flask" tooltip="Average days from sample collection to COA upload per inspector.">
          <ChartWrap height="280px"><DLBar data={coaBar} options={hBarOpts as never} /></ChartWrap>
        </Card>
        <Card title="Avg Days to Approval" icon="fas fa-hourglass-half" tooltip="Average days from submission to approval per inspector.">
          <ChartWrap height="280px"><DLBar data={approvalBar} options={hBarOpts as never} /></ChartWrap>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL 6: Financial
// ════════════════════════════════════════════════════════════════════════════════

interface FinancialPanelProps {
  data: AnalyticsData;
  salaries: Record<string, { salary: number; employee_number: string }>;
  expenseLog: Array<{ id: string; inspector: string; amount: number; description: string; date: string }>;
  xeroStatus: { connected: boolean; org_name?: string };
  xeroInvoices: { invoices: Array<Record<string, unknown>>; aging: Record<string, number>; total_count?: number };
  xeroPage: number;
  setXeroPage: (p: number) => void;
  xeroSyncing: boolean;
  onXeroSync: () => void;
  onXeroConnect: () => void;
  onXeroDisconnect: () => void;
  onOpenSalaryModal: () => void;
  onOpenExpenseModal: () => void;
  userRole?: string;
  userFullName?: string;
}

function FinancialPanel({ data, salaries, expenseLog, xeroStatus, xeroInvoices, xeroPage, setXeroPage, xeroSyncing, onXeroSync, onXeroConnect, onXeroDisconnect, onOpenSalaryModal, onOpenExpenseModal, userRole, userFullName }: FinancialPanelProps) {
  const kmRate = data.financialSummary?.km_rate ?? 4.5;
  const isInspectorRole = userRole === "inspector";
  const isAdminRole = userRole === "admin";

  // Filter financial data: inspectors see only their own row, admins see only their row
  const allFin = data.inspectorFinancials ?? [];
  const fin = (isInspectorRole || isAdminRole) && userFullName
    ? allFin.filter(r => r.inspector_name.toLowerCase().includes(userFullName.toLowerCase()) || userFullName.toLowerCase().includes(r.inspector_name.toLowerCase()))
    : allFin;

  const [finPeriod, setFinPeriod] = useState("all");
  const [perfMetric, setPerfMetric] = useState("total_profit");

  // Get expense total for an inspector
  const getExpenses = (name: string) => expenseLog.filter(e => e.inspector === name).reduce((s, e) => s + e.amount, 0);
  // Get salary for an inspector
  const getSalary = (name: string) => lookupSalary(salaries, name);

  // Build enriched rows
  const rows = fin.map(r => {
    const salary = getSalary(r.inspector_name);
    const expenses = getExpenses(r.inspector_name);
    const mgmtFees = (salary + expenses) * 0.20; // 20% of (salary + expenses)
    const totalCost = salary + expenses + mgmtFees;
    const revPerHr = r.total_hours > 0 ? Math.round(r.total_revenue / r.total_hours) : 0;
    const costPerHr = r.total_hours > 0 ? Math.round(totalCost / r.total_hours) : 0;
    const profit = r.total_revenue - totalCost;
    return { ...r, salary, expenses, mgmtFees, totalCost, revPerHr, costPerHr, profit };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      inspections: acc.inspections + r.total_inspections,
      hours: acc.hours + r.total_hours,
      km: acc.km + r.total_km,
      samples: acc.samples + r.total_samples,
      inspection_time: acc.inspection_time + r.inspection_time,
      revenue_hours: acc.revenue_hours + r.revenue_hours,
      revenue_km: acc.revenue_km + r.revenue_km,
      revenue_samples: acc.revenue_samples + r.revenue_samples,
      total_revenue: acc.total_revenue + r.total_revenue,
      salary: acc.salary + r.salary,
      expenses: acc.expenses + r.expenses,
      mgmtFees: acc.mgmtFees + r.mgmtFees,
      totalCost: acc.totalCost + r.totalCost,
      profit: acc.profit + r.profit,
    }),
    { inspections: 0, hours: 0, km: 0, samples: 0, inspection_time: 0, revenue_hours: 0, revenue_km: 0, revenue_samples: 0, total_revenue: 0, salary: 0, expenses: 0, mgmtFees: 0, totalCost: 0, profit: 0 }
  );
  const totalRevPerHr = totals.hours > 0 ? Math.round(totals.total_revenue / totals.hours) : 0;
  const totalCostPerHr = totals.hours > 0 ? Math.round(totals.totalCost / totals.hours) : 0;

  // Revenue sources stacked bar — sorted by total revenue descending
  const sortedFin = [...fin].sort((a, b) => b.total_revenue - a.total_revenue);
  const revSourceData = {
    labels: sortedFin.map((d) => d.inspector_name),
    datasets: [
      { label: "Rev (Hours)", data: sortedFin.map((d) => d.revenue_hours), backgroundColor: "#0078d4" },
      { label: "Rev (KM)", data: sortedFin.map((d) => d.revenue_km), backgroundColor: "#f59e0b" },
      { label: "Rev (Samples)", data: sortedFin.map((d) => d.revenue_samples), backgroundColor: "#10b981" },
    ],
  };
  const stackedOpts = {
    ...baseChartOptions(),
    plugins: {
      ...((baseChartOptions() as Record<string, unknown>).plugins as Record<string, unknown>),
      datalabels: {
        display: (ctx: { datasetIndex: number; chart: { data: { datasets: unknown[] } } }) => ctx.datasetIndex === ctx.chart.data.datasets.length - 1,
        anchor: "end" as const,
        align: "top" as const,
        font: { size: 8, weight: "bold" as const },
        color: "#1f2937",
        formatter: (_v: number, ctx: { dataIndex: number; chart: { data: { datasets: Array<{ data: number[] }> } } }) => {
          const total = ctx.chart.data.datasets.reduce((s, ds) => s + (ds.data[ctx.dataIndex] || 0), 0);
          return "R" + Math.round(total).toLocaleString();
        },
      },
    },
    scales: {
      x: { stacked: true, ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: { stacked: true, beginAtZero: true, ticks: { font: { size: 9 }, callback: (v: unknown) => "R" + Number(v).toLocaleString() } },
    },
  };

  // Inspector performance - metric selector
  const perfMetricLabel: Record<string, string> = {
    total_profit: "Profit", total_revenue: "Revenue", revenue_hours: "Revenue (Hours)",
    revenue_km: "Revenue (KM)", revenue_samples: "Revenue (Samples)",
    total_hours: "Billable Hours", total_km: "KM Traveled",
    inspection_time: "On-Site Hours", total_inspections: "Inspections",
  };
  const perfValues = rows.map(r => {
    if (perfMetric === "total_profit") return r.profit;
    return (r as Record<string, unknown>)[perfMetric] as number ?? 0;
  });
  const perfData = {
    labels: rows.map(r => r.inspector_name),
    datasets: [{
      label: perfMetricLabel[perfMetric] ?? perfMetric,
      data: perfValues,
      backgroundColor: perfValues.map(v => v >= 0 ? "#10b981" : "#ef4444"),
    }],
  };
  const perfOpts = {
    ...baseChartOptions(),
    plugins: {
      ...((baseChartOptions() as Record<string, unknown>).plugins as Record<string, unknown>),
      datalabels: { display: false },
    },
    scales: {
      x: { ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: { beginAtZero: true, ticks: { font: { size: 9 }, callback: (v: unknown) => perfMetric.includes("revenue") || perfMetric.includes("profit") || perfMetric.includes("cost") ? "R" + Number(v).toLocaleString() : String(v) } },
    },
  };

  // Xero
  const XERO_PER_PAGE = 50;
  const xeroTotal = xeroInvoices.total_count ?? xeroInvoices.invoices.length;
  const xeroTotalPages = Math.max(1, Math.ceil(xeroTotal / XERO_PER_PAGE));
  const xeroSlice = xeroInvoices.invoices.slice((xeroPage - 1) * XERO_PER_PAGE, xeroPage * XERO_PER_PAGE);
  const aging = xeroInvoices.aging ?? {};
  const agingBuckets = [
    { label: "Current", key: "current", color: "#10b981" },
    { label: "1-30 Days", key: "1_30", color: "#3b82f6" },
    { label: "31-60 Days", key: "31_60", color: "#f59e0b" },
    { label: "61-90 Days", key: "61_90", color: "#f97316" },
    { label: "91-120 Days", key: "91_120", color: "#ef4444" },
    { label: "120+ Days", key: "120_plus", color: "#991b1b" },
  ];

  const fmtR = (v: unknown) => { const n = Number(v); return isNaN(n) ? "—" : "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  const fmtRInt = (v: number) => v === 0 ? "—" : "R" + v.toLocaleString("en-ZA");

  const thStyle: React.CSSProperties = { background: "#e6f3f7", padding: "0.25rem 0.2rem", fontWeight: 600, fontSize: "0.55rem", textAlign: "center", whiteSpace: "nowrap", borderBottom: "2px solid #e5e7eb", textTransform: "uppercase", letterSpacing: "0.1px" };
  const tdStyle: React.CSSProperties = { padding: "0.2rem 0.2rem", fontSize: "0.6rem", borderBottom: "1px solid #e5e7eb", textAlign: "center", fontVariantNumeric: "tabular-nums" };
  const totalStyle: React.CSSProperties = { ...tdStyle, fontWeight: 700, background: "#e6f3f7", borderTop: "2px solid #007890" };
  const costThStyle: React.CSSProperties = { ...thStyle, background: "#fff7ed" };
  const profitThStyle: React.CSSProperties = { ...thStyle, background: "#f0fdf4" };

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      {/* Revenue Table */}
      <Card title="Revenue Per Inspector" icon="fas fa-money-bill-wave" tooltip="Detailed revenue, cost, and profit breakdown per inspector including hours, KM, and samples revenue."
        headerRight={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select value={finPeriod} onChange={e => setFinPeriod(e.target.value)} style={{ fontSize: 11, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", color: "#374151", cursor: "pointer", minWidth: 130 }}>
              <option value="all">All Time</option>
              <option value="daily">Today</option>
              <option value="weekly">This Week</option>
              <option value="30">Last 30 Days</option>
              <option value="60">Last 60 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="120">Last 120 Days</option>
              <option value="120+">120+ Days</option>
            </select>
            {!isInspectorRole && (
              <button onClick={onOpenExpenseModal} style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #f59e0b", borderRadius: 6, background: "#f59e0b", color: "white", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="fas fa-receipt" /> Log Expense
              </button>
            )}
            {!isInspectorRole && (
              <button onClick={onOpenSalaryModal} style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #007890", borderRadius: 6, background: "#007890", color: "white", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="fas fa-edit" /> Edit Salaries
              </button>
            )}
          </div>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left", position: "sticky", left: 0, zIndex: 1 }}>Inspector</th>
                <th style={thStyle} title="Total number of inspections completed">Insp</th>
                <th style={thStyle} title="Total billable hours">Bill Hrs</th>
                <th style={thStyle} title="Total kilometers traveled">KM</th>
                <th style={thStyle} title="Revenue from KM">R/km</th>
                <th style={thStyle} title="On-site hours at facility">Site Hrs</th>
                <th style={thStyle} title="Revenue from hours">Rev(Hrs)</th>
                <th style={thStyle} title="Revenue from KM">Rev(KM)</th>
                <th style={thStyle} title="Revenue from samples">Rev(Smp)</th>
                <th style={thStyle} title="Total Revenue">Tot Rev</th>
                <th style={costThStyle} title="Monthly salary CTC">Salary</th>
                <th style={costThStyle} title="Logged expenses">Exp</th>
                <th style={costThStyle} title="Management Fees = 20% × (Salary+Expenses)">Mgmt</th>
                <th style={costThStyle} title="Total Cost">Tot Cost</th>
                <th style={profitThStyle} title="Revenue per hour">R/Hr</th>
                <th style={profitThStyle} title="Cost per hour">C/Hr</th>
                <th style={profitThStyle} title="Profit = Revenue − Cost">Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.inspector_name} className="hover:bg-[rgba(0,120,144,0.05)]">
                  <td style={{ ...tdStyle, textAlign: "left", fontWeight: 500, position: "sticky", left: 0, background: "white", zIndex: 1 }}>{r.inspector_name}</td>
                  <td style={tdStyle}>{r.total_inspections}</td>
                  <td style={tdStyle}>{r.total_hours > 0 ? r.total_hours.toFixed(1) : "-"}</td>
                  <td style={tdStyle}>{r.total_km > 0 ? r.total_km.toLocaleString("en-ZA") : "-"}</td>
                  <td style={tdStyle}>{r.total_km > 0 ? fmtRInt(Math.round(r.total_km * kmRate)) : "—"}</td>
                  <td style={tdStyle}>{r.inspection_time > 0 ? r.inspection_time.toFixed(1) : "-"}</td>
                  <td style={tdStyle}>{fmtRInt(Math.round(r.revenue_hours))}</td>
                  <td style={tdStyle}>{fmtRInt(Math.round(r.revenue_km))}</td>
                  <td style={tdStyle}>{fmtRInt(Math.round(r.revenue_samples))}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#059669" }}>{fmtRInt(Math.round(r.total_revenue))}</td>
                  <td style={{ ...tdStyle, color: "#dc2626" }}>{r.salary > 0 ? fmtRInt(Math.round(r.salary)) : "—"}</td>
                  <td style={{ ...tdStyle, color: r.expenses > 0 ? "#dc2626" : undefined }}>{r.expenses > 0 ? fmtRInt(Math.round(r.expenses)) : "—"}</td>
                  <td style={{ ...tdStyle, color: "#dc2626" }}>{r.mgmtFees > 0 ? fmtRInt(Math.round(r.mgmtFees)) : "—"}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#dc2626" }}>{r.totalCost > 0 ? fmtRInt(Math.round(r.totalCost)) : "—"}</td>
                  <td style={{ ...tdStyle, color: "#059669" }}>{r.revPerHr > 0 ? fmtRInt(r.revPerHr) : "—"}</td>
                  <td style={{ ...tdStyle, color: "#dc2626" }}>{r.costPerHr > 0 ? fmtRInt(r.costPerHr) : "—"}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: r.profit >= 0 ? "#059669" : "#dc2626" }}>{r.total_revenue > 0 || r.totalCost > 0 ? fmtRInt(Math.round(r.profit)) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...totalStyle, textAlign: "left", position: "sticky", left: 0, zIndex: 1 }}>Total</td>
                <td style={totalStyle}>{totals.inspections}</td>
                <td style={totalStyle}>{totals.hours.toFixed(1)}</td>
                <td style={totalStyle}>{totals.km.toLocaleString("en-ZA")}</td>
                <td style={totalStyle}>{fmtRInt(Math.round(totals.km * kmRate))}</td>
                <td style={totalStyle}>{totals.inspection_time.toFixed(1)}</td>
                <td style={totalStyle}>{fmtRInt(Math.round(totals.revenue_hours))}</td>
                <td style={totalStyle}>{fmtRInt(Math.round(totals.revenue_km))}</td>
                <td style={totalStyle}>{fmtRInt(Math.round(totals.revenue_samples))}</td>
                <td style={{ ...totalStyle, color: "#059669" }}>{fmtRInt(Math.round(totals.total_revenue))}</td>
                <td style={{ ...totalStyle, color: "#dc2626" }}>{fmtRInt(Math.round(totals.salary))}</td>
                <td style={{ ...totalStyle, color: "#dc2626" }}>{totals.expenses > 0 ? fmtRInt(Math.round(totals.expenses)) : "R0"}</td>
                <td style={{ ...totalStyle, color: "#dc2626" }}>{fmtRInt(Math.round(totals.mgmtFees))}</td>
                <td style={{ ...totalStyle, color: "#dc2626" }}>{fmtRInt(Math.round(totals.totalCost))}</td>
                <td style={{ ...totalStyle, color: "#059669" }}>{fmtRInt(totalRevPerHr)}</td>
                <td style={{ ...totalStyle, color: "#dc2626" }}>{fmtRInt(totalCostPerHr)}</td>
                <td style={{ ...totalStyle, fontWeight: 700, color: totals.profit >= 0 ? "#059669" : "#dc2626" }}>{fmtRInt(Math.round(totals.profit))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Xero Outstanding Invoices — hidden from inspectors */}
      {!isInspectorRole && <Card title="Xero - Outstanding Invoices" icon="fas fa-file-invoice-dollar" tooltip="Outstanding invoices synced from Xero accounting, with aging summary."
        headerRight={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {xeroStatus.connected && <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, fontWeight: 500, background: "#dcfce7", color: "#166534" }}>{xeroStatus.org_name || "Connected"}</span>}
            {xeroStatus.connected ? (
              <>
                <button onClick={onXeroDisconnect} style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #ef4444", borderRadius: 6, background: "#ef4444", color: "white", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fas fa-unlink" /> Disconnect
                </button>
                <button onClick={onXeroSync} disabled={xeroSyncing} style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #10b981", borderRadius: 6, background: "#10b981", color: "white", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: xeroSyncing ? 0.6 : 1 }}>
                  <i className={`fas fa-sync-alt ${xeroSyncing ? "fa-spin" : ""}`} /> Sync Invoices
                </button>
              </>
            ) : (
              <button onClick={onXeroConnect} style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #13b5ea", borderRadius: 6, background: "#13b5ea", color: "white", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="fas fa-plug" /> Connect to Xero
              </button>
            )}
          </div>
        }
      >
        {/* Aging Summary */}
        {xeroInvoices.invoices.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {agingBuckets.map(b => (
              <div key={b.key} style={{ flex: 1, minWidth: 120, padding: "10px 14px", borderRadius: 8, background: b.color + "12", borderLeft: `4px solid ${b.color}` }}>
                <div style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{b.label}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: b.color }}>{fmtR(aging[b.key] ?? 0)}</div>
              </div>
            ))}
          </div>
        )}

        {xeroInvoices.invoices.length > 0 ? (
          <>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: 8 }}>
              Showing {(xeroPage - 1) * XERO_PER_PAGE + 1}–{Math.min(xeroPage * XERO_PER_PAGE, xeroTotal)} of {xeroTotal} outstanding invoices
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Invoice #", "Client", "Reference", "Total", "Paid", "Outstanding", "Due Date", "Days Overdue", "Status"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {xeroSlice.map((inv, i) => (
                    <tr key={i} className="hover:bg-[rgba(0,120,144,0.05)]">
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{String(inv.invoice_number ?? "")}</td>
                      <td style={{ ...tdStyle, textAlign: "left" }}>{String(inv.contact_name ?? "")}</td>
                      <td style={tdStyle}>{String(inv.reference ?? "")}</td>
                      <td style={tdStyle}>{fmtR(inv.total)}</td>
                      <td style={tdStyle}>{fmtR(inv.amount_paid)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtR(inv.amount_due)}</td>
                      <td style={tdStyle}>{String(inv.due_date ?? "").slice(0, 10)}</td>
                      <td style={{ ...tdStyle, color: Number(inv.days_overdue ?? 0) > 90 ? "#dc2626" : "#f59e0b" }}>{inv.days_overdue ? `${inv.days_overdue} days` : "—"}</td>
                      <td style={tdStyle}><span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, background: "#e0f2fe", color: "#0369a1", fontWeight: 500 }}>{String(inv.status ?? "")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {xeroTotalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 }}>
                <button disabled={xeroPage <= 1} onClick={() => setXeroPage(xeroPage - 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #e5e7eb", background: "white", cursor: xeroPage <= 1 ? "default" : "pointer", opacity: xeroPage <= 1 ? 0.4 : 1, fontSize: "0.8rem" }}>&laquo; Prev</button>
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Page {xeroPage} of {xeroTotalPages}</span>
                <button disabled={xeroPage >= xeroTotalPages} onClick={() => setXeroPage(xeroPage + 1)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #e5e7eb", background: "white", cursor: xeroPage >= xeroTotalPages ? "default" : "pointer", opacity: xeroPage >= xeroTotalPages ? 0.4 : 1, fontSize: "0.8rem" }}>Next &raquo;</button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 20, color: "#9ca3af" }}>
            <i className="fas fa-plug" style={{ fontSize: "2rem", marginBottom: 8, display: "block" }} />
            {xeroStatus.connected ? "No outstanding invoices found. Try syncing." : "Connect to Xero to see outstanding invoices"}
          </div>
        )}
      </Card>}

      {/* 2-col: Revenue Sources, Performance Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Revenue Sources" icon="fas fa-chart-bar" tooltip="Shows where each inspector's revenue comes from: hours billed, kilometres driven, and samples collected.">
          <ChartWrap height="350px">
            <DLBar data={revSourceData} options={stackedOpts as never} />
          </ChartWrap>
        </Card>
        <Card title="Inspector Performance" icon="fas fa-chart-line" tooltip="Compare inspectors side by side on any metric: profit, revenue, hours, kilometres, or inspections."
          headerRight={
            <select value={perfMetric} onChange={e => setPerfMetric(e.target.value)} style={{ minWidth: 160, fontSize: 11, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, background: "white" }}>
              {Object.entries(perfMetricLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          }
        >
          <ChartWrap height="350px">
            <DLBar data={perfData} options={perfOpts as never} />
          </ChartWrap>
        </Card>
      </div>

      {/* Profit Overview */}
      <Card title="Profit" icon="fas fa-coins" tooltip="Profit breakdown per inspector: Revenue minus Total Cost.">
        <ChartWrap height="300px">
          <Bar
            data={{
              labels: rows.map(r => r.inspector_name),
              datasets: [{
                label: "Profit",
                data: rows.map(r => r.profit),
                backgroundColor: rows.map(r => r.profit >= 0 ? "#10b981" : "#ef4444"),
              }],
            }}
            options={{
              ...baseChartOptions(),
              scales: {
                x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
                y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: (v: unknown) => "R" + Number(v).toLocaleString() } },
              },
            } as never}
          />
        </ChartWrap>
      </Card>
    </div>
  );
}
