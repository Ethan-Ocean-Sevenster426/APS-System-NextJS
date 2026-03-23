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
import { Bar, Line, Doughnut, Radar } from "react-chartjs-2";

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
  monthlyInvoiceTrend: { month: string; avg_days: number; count: number }[];
  monthlyInspectionsTrend: { month: string; count: number }[];
  monthlyCoaTrend: { month: string; avg_days: number; count: number }[];
  monthlyApprovalTrend: { month: string; avg_days: number; count: number }[];
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

const lineDefaults = { tension: 0.3, fill: false, pointRadius: 2, borderWidth: 2 };

function baseChartOptions(title?: string, yLabel?: string): Record<string, unknown> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, labels: { boxWidth: 12, font: { size: 11 } } },
      title: title ? { display: true, text: title, font: { size: 13 } } : { display: false },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { beginAtZero: true, ticks: { font: { size: 10 } }, title: yLabel ? { display: true, text: yLabel, font: { size: 11 } } : undefined },
    },
  };
}

function doughnutOptions(title?: string): Record<string, unknown> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const, labels: { boxWidth: 12, font: { size: 11 } } },
      title: title ? { display: true, text: title, font: { size: 13 } } : { display: false },
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
    <div className={`bg-white rounded-md border border-gray-200 ${className}`} style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", marginBottom: 5 }}>
      <div className="border-b border-gray-200 flex items-center justify-between" style={{ padding: "12px 16px" }}>
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
  return <div style={{ position: "relative", height }}>{children}</div>;
}

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
  const isFullAccess = userRole === "developer" || userRole === "super_admin";
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics`);
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
      if (filters.year && !m.startsWith(filters.year)) return false;
      if (filters.month) {
        const mm = filters.month.padStart(2, "0");
        if (!m.endsWith(`-${mm}`)) return false;
      }
      if (filters.date_from && m < filters.date_from.substring(0, 7)) return false;
      if (filters.date_to && m > filters.date_to.substring(0, 7)) return false;
      return true;
    };

    const matchDay = (d: string) => {
      if (!d) return true;
      if (filters.date_from && d < filters.date_from) return false;
      if (filters.date_to && d > filters.date_to) return false;
      if (filters.year && !d.startsWith(filters.year)) return false;
      if (filters.month) {
        const part = `-${filters.month.padStart(2, "0")}-`;
        if (!d.includes(part)) return false;
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
      totalInspections: filteredList.length,
      complianceRate: totalForRate > 0 ? (totalCompliant / totalForRate) * 100 : 0,
      activeInspectors: new Set(filteredList.map(s => s.inspector_name)).size,
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
      dailyComplianceTrend: fc(rawData.dailyComplianceTrend ?? []).filter(r => matchDay(r.day)),
      monthlyOccurrenceTrend: (rawData.monthlyOccurrenceTrend ?? []).filter(r => matchMonth(r.month)),
      monthlyTravelTrend: (rawData.monthlyTravelTrend ?? []).filter(r => matchMonth(r.month)),
      monthlyDocSendTrend: (rawData.monthlyDocSendTrend ?? []).filter(r => matchMonth(r.month)),
      monthlyInvoiceTrend: (rawData.monthlyInvoiceTrend ?? []).filter(r => matchMonth(r.month)),
      monthlyInspectionsTrend: (rawData.monthlyInspectionsTrend ?? []).filter(r => matchMonth(r.month)),
      monthlyCoaTrend: (rawData.monthlyCoaTrend ?? []).filter(r => matchMonth(r.month)),
      monthlyApprovalTrend: (rawData.monthlyApprovalTrend ?? []).filter(r => matchMonth(r.month)),
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

  const handleApply = () => { /* filters applied live via useMemo — no API call needed */ };
  const handleReset = () => {
    setFilters({ date_from: "", date_to: "", year: "", month: "", inspector: [], commodity: [] });
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
        const mgmt = (sal + exp) * 0.2;
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

  // ── Export: PDF ─────────────────────────────────────────────────────────────
  const handleExportPdf = () => {
    if (!data) return;
    import("jspdf").then(mod => {
      const jsPDF = mod.default || mod.jsPDF;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = 0;

      // Helper: draw a table
      const drawTable = (headers: string[], rows: string[][], startY: number, colWidths: number[], opts?: { headerBg?: number[]; fontSize?: number }) => {
        const fs = opts?.fontSize ?? 6;
        const hBg = opts?.headerBg ?? [0, 120, 144];
        const rowH = fs * 0.8 + 3;
        const headerH = rowH + 1;
        let cy = startY;

        // Header
        doc.setFillColor(hBg[0], hBg[1], hBg[2]);
        doc.rect(margin, cy, colWidths.reduce((a, b) => a + b, 0), headerH, "F");
        doc.setFontSize(fs);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        let cx = margin;
        headers.forEach((h, i) => {
          doc.text(h, cx + 1.5, cy + headerH / 2 + fs * 0.15, { baseline: "middle" });
          cx += colWidths[i];
        });
        cy += headerH;

        // Body rows
        doc.setFont("helvetica", "normal");
        rows.forEach((row, ri) => {
          if (cy + rowH > pageH - 10) {
            doc.addPage();
            cy = 14;
            // Redraw header on new page
            doc.setFillColor(hBg[0], hBg[1], hBg[2]);
            doc.rect(margin, cy, colWidths.reduce((a, b) => a + b, 0), headerH, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            let hx = margin;
            headers.forEach((h, i) => { doc.text(h, hx + 1.5, cy + headerH / 2 + fs * 0.15, { baseline: "middle" }); hx += colWidths[i]; });
            cy += headerH;
            doc.setFont("helvetica", "normal");
          }
          // Alternating row bg
          if (ri % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(margin, cy, colWidths.reduce((a, b) => a + b, 0), rowH, "F"); }
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(fs);
          cx = margin;
          row.forEach((cell, i) => {
            const txt = String(cell ?? "");
            doc.text(txt, i === 0 ? cx + 1.5 : cx + colWidths[i] - 1.5, cy + rowH / 2 + fs * 0.15, { baseline: "middle", align: i === 0 ? "left" : "right" });
            cx += colWidths[i];
          });
          // Row border
          doc.setDrawColor(220, 220, 220);
          doc.line(margin, cy + rowH, margin + colWidths.reduce((a, b) => a + b, 0), cy + rowH);
          cy += rowH;
        });
        return cy;
      };

      // ── PAGE 1: Header & KPI Summary ──
      // Header bar
      doc.setFillColor(0, 120, 144);
      doc.rect(0, 0, pageW, 22, "F");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Food Safety Agency", margin, 10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Analytics Report", margin, 17);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-ZA")}`, pageW - 55, 10);
      const filterDesc = [
        filters.year && `Year: ${filters.year}`,
        filters.month && `Month: ${MONTHS[Number(filters.month) - 1]}`,
        filters.inspector.length > 0 && `Inspector: ${filters.inspector.join(", ")}`,
        filters.commodity.length > 0 && `Commodity: ${filters.commodity.join(", ")}`,
        filters.date_from && `From: ${filters.date_from}`,
        filters.date_to && `To: ${filters.date_to}`,
      ].filter(Boolean).join("  |  ");
      doc.text(filterDesc || "All Time — No Filters Applied", pageW - 55, 17);

      y = 30;

      // KPI Cards
      const kpis = [
        { label: "Total Inspections", value: String(data.totalInspections) },
        { label: "Compliance Rate", value: `${data.complianceRate?.toFixed(1)}%` },
        { label: "Active Inspectors", value: String(data.activeInspectors) },
        { label: "Total Hours", value: data.totalHours?.toFixed(1) ?? "0" },
        { label: "Total Revenue", value: `R${(data.financialSummary?.total_revenue ?? 0).toLocaleString("en-ZA")}` },
      ];
      const cardW = (pageW - margin * 2 - 4 * 4) / 5;
      kpis.forEach((kpi, i) => {
        const cx = margin + i * (cardW + 4);
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(cx, y, cardW, 16, 2, 2, "F");
        doc.setDrawColor(0, 120, 144);
        doc.roundedRect(cx, y, cardW, 16, 2, 2, "S");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 120, 144);
        doc.text(kpi.value, cx + cardW / 2, y + 7, { align: "center" });
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(kpi.label.toUpperCase(), cx + cardW / 2, y + 13, { align: "center" });
      });
      y += 24;

      // ── FINANCIAL TABLE ──
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 120, 144);
      doc.text("Revenue Per Inspector", margin, y);
      y += 5;

      const kmR = data.financialSummary?.km_rate ?? 4.5;
      const finHeaders = ["Inspector", "Insp", "Hrs", "KM", "R/km", "On-Site", "Rev(Hrs)", "Rev(KM)", "Rev(Sam)", "Revenue", "Salary", "Exp", "Mgmt", "Cost", "R/Hr", "C/Hr", "Profit"];
      const finColW = [30, 10, 10, 13, 14, 11, 14, 14, 13, 15, 14, 10, 13, 14, 10, 10, 14];
      const finRows = (data.inspectorFinancials ?? []).map(r => {
        const sal = lookupSalary(salaries, r.inspector_name);
        const exp = expenseLog.filter(e => e.inspector === r.inspector_name).reduce((s, e) => s + e.amount, 0);
        const mgmt = (sal + exp) * 0.2;
        const cost = sal + exp + mgmt;
        const rph = r.total_hours > 0 ? Math.round(r.total_revenue / r.total_hours) : 0;
        const cph = r.total_hours > 0 ? Math.round(cost / r.total_hours) : 0;
        const profit = Math.round(r.total_revenue - cost);
        return [
          r.inspector_name, String(r.total_inspections), r.total_hours > 0 ? r.total_hours.toFixed(1) : "-",
          r.total_km > 0 ? r.total_km.toLocaleString() : "-", r.total_km > 0 ? `R${Math.round(r.total_km * kmR).toLocaleString()}` : "—",
          r.inspection_time > 0 ? r.inspection_time.toFixed(1) : "-",
          `R${Math.round(r.revenue_hours).toLocaleString()}`, `R${Math.round(r.revenue_km).toLocaleString()}`,
          `R${Math.round(r.revenue_samples).toLocaleString()}`, `R${Math.round(r.total_revenue).toLocaleString()}`,
          sal > 0 ? `R${Math.round(sal).toLocaleString()}` : "—", exp > 0 ? `R${Math.round(exp).toLocaleString()}` : "—",
          mgmt > 0 ? `R${Math.round(mgmt).toLocaleString()}` : "—", cost > 0 ? `R${Math.round(cost).toLocaleString()}` : "—",
          rph > 0 ? `R${rph.toLocaleString()}` : "—", cph > 0 ? `R${cph.toLocaleString()}` : "—",
          profit !== 0 ? `R${profit.toLocaleString()}` : "—",
        ];
      });
      y = drawTable(finHeaders, finRows, y, finColW);

      // ── PAGE: COMPLIANCE ──
      if (data.complianceByCommodity?.length) {
        doc.addPage();
        y = 14;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 120, 144);
        doc.text("Compliance by Commodity", margin, y);
        y += 5;
        const compHeaders = ["Commodity", "Total", "Compliant", "Non-Compliant", "Compliance Rate"];
        const compColW = [50, 30, 30, 30, 35];
        const compRows = data.complianceByCommodity.map(c => [c.commodity, String(c.total), String(c.compliant), String(c.non_compliant), `${c.compliance_rate.toFixed(1)}%`]);
        y = drawTable(compHeaders, compRows, y, compColW, { fontSize: 8 });
      }

      // ── PAGE: INSPECTOR PERFORMANCE ──
      if (data.inspectorPerformance?.length) {
        doc.addPage();
        y = 14;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 120, 144);
        doc.text("Inspector Performance", margin, y);
        y += 5;
        const perfHeaders = ["Inspector", "Total Inspections", "Compliant", "Non-Compliant"];
        const perfColW = [60, 35, 35, 35];
        const perfRows = data.inspectorPerformance.map(p => [p.inspector_name, String(p.total_inspections), String(p.compliant), String(p.non_compliant)]);
        y = drawTable(perfHeaders, perfRows, y, perfColW, { fontSize: 8 });
      }

      // ── PAGE: TRAVEL ──
      if (data.travelPerInspector?.length) {
        doc.addPage();
        y = 14;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 120, 144);
        doc.text("Travel Per Inspector", margin, y);
        y += 5;
        const tHeaders = ["Inspector", "Total KM", "Total Hours", "Inspections", "Avg KM"];
        const tColW = [55, 30, 30, 30, 30];
        const tRows = data.travelPerInspector.map(t => [t.inspector_name, t.total_km.toLocaleString(), t.total_hours.toFixed(1), String(t.inspection_count), t.avg_km.toFixed(1)]);
        y = drawTable(tHeaders, tRows, y, tColW, { fontSize: 8 });
      }

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 6, { align: "center" });
        doc.text("Food Safety Agency — Confidential", margin, pageH - 6);
      }

      doc.save(`Analytics_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    });
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
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        Loading...
      </div>
    </div>
  );

  // Inspectors see their personal dashboard
  if (isInspector) return <InspectorDashboard />;

  return (
    <div style={{ padding: "28px 20px 32px", minHeight: "100vh", position: "relative" }}>
      {/* Background image matching Django */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh", background: "url('/background.jpg') no-repeat center center fixed", backgroundSize: "cover", opacity: 1, zIndex: -2, pointerEvents: "none" }} />
      {/* Panel Tabs */}
      <div className="flex flex-wrap" style={{ gap: 6, marginBottom: "1rem" }}>
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
              background: activePanel === p.key ? "#007890" : "rgba(255,255,255,0.9)",
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
        <div className="flex flex-wrap items-end" style={{ gap: "0.75rem" }}>
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
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexShrink: 0 }}>
            <button onClick={handleReset}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#6b7280", color: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <i className="fas fa-undo" /> Reset
            </button>
            <button onClick={handleExtractExcel}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#007890", color: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <i className="fas fa-file-download" /> Extract
            </button>
            <button onClick={handleExportPdf}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#d13438", color: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <i className="fas fa-file-pdf" /> PDF
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
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowExpenseModal(false)}>
              <div style={{ background: "white", borderRadius: 12, padding: 24, maxWidth: 550, width: "90%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 600 }}><i className="fas fa-receipt" style={{ marginRight: 8, color: "#f59e0b" }} />Log Expense</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <select value={newExpense.inspector} onChange={e => setNewExpense({ ...newExpense, inspector: e.target.value })} style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem" }}>
                    <option value="">Select Inspector</option>
                    {data?.filterOptions?.inspectors?.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <input type="number" placeholder="Amount (R)" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem" }} />
                  <input type="text" placeholder="Description" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem" }} />
                  <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.85rem" }} />
                  <button onClick={() => {
                    if (!newExpense.inspector || !newExpense.amount) return;
                    const entry = { id: Date.now().toString(), inspector: newExpense.inspector, amount: Number(newExpense.amount), description: newExpense.description, date: newExpense.date || new Date().toISOString().slice(0, 10) };
                    saveExpenses([...expenseLog, entry]);
                    setNewExpense({ inspector: "", amount: "", description: "", date: "" });
                  }} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#f59e0b", color: "white", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem" }}>Add Expense</button>
                </div>
                {expenseLog.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead><tr><th style={{ textAlign: "left", padding: 4, borderBottom: "1px solid #e5e7eb" }}>Inspector</th><th style={{ textAlign: "right", padding: 4, borderBottom: "1px solid #e5e7eb" }}>Amount</th><th style={{ textAlign: "left", padding: 4, borderBottom: "1px solid #e5e7eb" }}>Desc</th><th style={{ padding: 4, borderBottom: "1px solid #e5e7eb" }}></th></tr></thead>
                    <tbody>
                      {expenseLog.map(e => (
                        <tr key={e.id}><td style={{ padding: 4 }}>{e.inspector}</td><td style={{ padding: 4, textAlign: "right" }}>{fmtRand(e.amount)}</td><td style={{ padding: 4 }}>{e.description}</td><td style={{ padding: 4 }}><button onClick={() => saveExpenses(expenseLog.filter(x => x.id !== e.id))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><i className="fas fa-trash" /></button></td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button onClick={() => setShowExpenseModal(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: "0.85rem" }}>Close</button>
                </div>
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
  const dailyDays = [...new Set(data.dailyComplianceTrend.map((d) => d.day))].sort();
  const dailyCommodities = [...new Set(data.dailyComplianceTrend.map((d) => d.commodity))];
  const dailyChartData = {
    labels: dailyDays.map(fmtDay),
    datasets: dailyCommodities.map((c, i) => ({
      label: c,
      data: dailyDays.map((day) => {
        const row = data.dailyComplianceTrend.find((r) => r.day === day && r.commodity === c);
        return row ? row.compliance_rate : 0;
      }),
      borderColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
      backgroundColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
      ...lineDefaults,
    })),
  };

  // Monthly inspections
  const miLabels = data.monthlyInspectionsTrend.map((d) => fmtMonth(d.month));
  const miData = {
    labels: miLabels,
    datasets: [{ label: "Inspections", data: data.monthlyInspectionsTrend.map((d) => d.count), backgroundColor: "#007890", borderRadius: 4 }],
  };

  // Monthly compliance (aggregated)
  const mcMonths = [...new Set(data.monthlyComplianceTrend.map((d) => d.month))].sort();
  const mcAgg = mcMonths.map((m) => {
    const rows = data.monthlyComplianceTrend.filter((r) => r.month === m);
    const totalCompliant = rows.reduce((s, r) => s + r.compliant, 0);
    const totalAll = rows.reduce((s, r) => s + r.total, 0);
    return totalAll > 0 ? (totalCompliant / totalAll) * 100 : 0;
  });
  const mcData = {
    labels: mcMonths.map(fmtMonth),
    datasets: [{ label: "Approval Rate %", data: mcAgg, borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", ...lineDefaults, fill: true }],
  };

  // Occurrence trend
  const occData = {
    labels: data.monthlyOccurrenceTrend.map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Occurrences", data: data.monthlyOccurrenceTrend.map((d) => d.count), backgroundColor: "#EC343C", borderRadius: 4 }],
  };

  // Samples by commodity (exclude Eggs & Poultry)
  const filteredSamples = data.samplesByCommodity.filter(d => isSampleCommodity(d.commodity));
  const samplesData = {
    labels: filteredSamples.map((d) => d.commodity),
    datasets: [{ label: "Samples", data: filteredSamples.map((d) => d.count), backgroundColor: filteredSamples.map((d) => colorForCommodity(d.commodity)) }],
  };

  // Facility types doughnut
  const ftData = {
    labels: data.facilityTypeDistribution.map((d) => d.facility_type),
    datasets: [{
      data: data.facilityTypeDistribution.map((d) => d.count),
      backgroundColor: data.facilityTypeDistribution.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
    }],
  };

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      {/* Primary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        <KpiCard label="Total Inspections" value={data.totalInspections} />
        <KpiCard label="Compliance Rate" value={`${data.complianceRate.toFixed(1)}%`} color="#10b981" />
        <KpiCard label="Active Inspectors" value={data.activeInspectors} color="#f59e0b" />
        <KpiCard label="Total Revenue" value={fmtRand(data.financialSummary?.total_revenue ?? 0)} color="#10b981" />
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        <KpiCard label="Occurrence Reports" value={data.totalOccurrenceReports} color="#ef4444" icon="fas fa-exclamation-circle" />
        <KpiCard label="Total KM Traveled" value={totalKm.toLocaleString("en-ZA")} color="#3b82f6" icon="fas fa-road" />
        <KpiCard label="Avg Days: Doc Send" value={avgDocSend.toFixed(1)} color="#f59e0b" icon="fas fa-paper-plane" />
        <KpiCard label="Avg Days: Approval" value={avgApproval.toFixed(1)} color="#8764b8" icon="fas fa-hourglass-half" />
        <KpiCard label="Total Samples Taken" value={totalSamples} color="#10b981" icon="fas fa-vial" />
      </div>

      {/* Compliance per commodity */}
      <Card title="Compliance Per Commodity" icon="fas fa-shield-alt" tooltip="Approval rate breakdown by commodity type (RAW, PMP, EGGS, POULTRY) for the selected period.">
        <div className="space-y-3">
          {data.complianceByCommodity.map((c) => (
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
          <Line data={dailyChartData} options={baseChartOptions(undefined, "Compliance %") as never} />
        </ChartWrap>
      </Card>

      {/* 3-col: Monthly Inspections, Approval Rate, Occurrence Trend */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Monthly Inspections" icon="fas fa-chart-bar" tooltip="Total number of inspections completed each month.">
          <ChartWrap height="200px"><Bar data={miData} options={baseChartOptions() as never} /></ChartWrap>
        </Card>
        <Card title="Approval Rate" icon="fas fa-check-double" tooltip="Percentage of inspections approved per month.">
          <ChartWrap height="200px"><Line data={mcData} options={baseChartOptions() as never} /></ChartWrap>
        </Card>
        <Card title="Occurrence Trend" icon="fas fa-exclamation-triangle" tooltip="Monthly trend of occurrence reports (non-compliance incidents) filed.">
          <ChartWrap height="200px"><Bar data={occData} options={baseChartOptions() as never} /></ChartWrap>
        </Card>
      </div>

      {/* 2-col: Samples, Facility Types */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Samples Taken by Commodity" icon="fas fa-vial" tooltip="Number of laboratory samples collected, broken down by commodity type.">
          <ChartWrap height="220px"><Bar data={samplesData} options={baseChartOptions() as never} /></ChartWrap>
        </Card>
        <Card title="Facility Types" icon="fas fa-building" tooltip="Distribution of inspections across different facility types (e.g. abattoir, farm, processor).">
          <ChartWrap height="220px"><Doughnut data={ftData} options={doughnutOptions() as never} /></ChartWrap>
        </Card>
      </div>
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

  // Inspector trend
  const days = [...new Set(data.monthlyInspectorTrend.map((d) => d.day))].sort();
  const inspectors = [...new Set(data.monthlyInspectorTrend.map((d) => d.inspector_name))];
  const trendData = {
    labels: days.map(fmtDay),
    datasets: inspectors.map((name, i) => ({
      label: name,
      data: days.map((day) => {
        const row = data.monthlyInspectorTrend.find((r) => r.day === day && r.inspector_name === name);
        return row ? row[inspectorMetric] : 0;
      }),
      borderColor: CHART_PALETTE[i % CHART_PALETTE.length],
      backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
      ...lineDefaults,
    })),
  };

  // Compliance per inspector (stacked bar)
  const dirData = {
    labels: data.directionsPerInspector.map((d) => d.inspector_name),
    datasets: [
      { label: "Directions", data: data.directionsPerInspector.map((d) => d.directions), backgroundColor: "#f59e0b" },
      { label: "Non-Compliant Products", data: data.directionsPerInspector.map((d) => d.non_compliant_products), backgroundColor: "#ef4444" },
    ],
  };
  const stackedOpts = {
    ...baseChartOptions(),
    scales: {
      x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 } } },
    },
  };

  // Use quarterly targets (from DB) or fall back to inspectorTargets
  const allInspectors = data.filterOptions?.inspectors ?? [];
  const commodityList = ["EGG", "POULTRY", "RAW", "PMP"];

  function getActual(inspector: string, commodity: string): number {
    const c = commodity === "EGG" ? "EGGS" : commodity;
    const row = data.inspectorCommodityMatrix.find(
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
    return data.inspectorSampleMatrix.find(r => r.inspector_name === inspector && r.commodity.toUpperCase().includes(commodity))?.count ?? 0;
  }

  // Radar chart data — use quarterly targets for target ring, actuals for data
  const quarterLabel = `Q${targetQuarter}: ${["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"][targetQuarter - 1]}`;
  const radarLabels = ["EGG", "POULTRY", "RAW", "PMP", "Raw Samples", "PMP Samples"];
  const radarInspectors = radarInspector === "all" ? allInspectors.slice(0, 6) : [radarInspector];
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
      borderColor: "#9ca3af",
      backgroundColor: "rgba(156,163,175,0.08)",
      pointBackgroundColor: "#9ca3af",
      borderWidth: 2,
    });
  }

  const radarChartData = { labels: radarLabels, datasets: radarDatasets };
  const radarOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" as const, labels: { boxWidth: 12, font: { size: 11 } } } },
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
        <ChartWrap height="380px">
          <Radar data={radarChartData} options={radarOpts as never} />
        </ChartWrap>
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
                        <td style={{ padding: "0.5rem 0.5rem", textAlign: "center", color: "#9ca3af" }}>{target}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspector Performance Trend */}
      <Card title="Inspector Performance Trend" icon="fas fa-chart-line" tooltip="Monthly trend of inspector activity — toggle between inspections, KM, hours, or samples."
        headerRight={
          <select value={inspectorMetric} onChange={(e) => setInspectorMetric(e.target.value as typeof inspectorMetric)}
            style={{ fontSize: "12px", padding: "6px 28px 6px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb", color: "#374151", fontWeight: 500, cursor: "pointer" }}>
            {Object.entries(metricLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        }>
        <ChartWrap height="600px">
          <Line data={trendData} options={baseChartOptions(undefined, metricLabel[inspectorMetric]) as never} />
        </ChartWrap>
      </Card>

      {/* Compliance Per Inspector */}
      <Card title="Compliance Per Inspector" icon="fas fa-exclamation-triangle" tooltip="Directions issued and non-compliance findings per inspector. More directions = more thorough inspections."
        subtitle="Directions issued = good inspector work identifying client issues">
        <ChartWrap height="280px">
          <Bar data={dirData} options={stackedOpts as never} />
        </ChartWrap>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL 3: Compliance
// ════════════════════════════════════════════════════════════════════════════════

function CompliancePanel({ data }: { data: AnalyticsData }) {
  // Commodity compliance trend
  const months = [...new Set(data.monthlyComplianceTrend.map((d) => d.month))].sort();
  const commodities = [...new Set(data.monthlyComplianceTrend.map((d) => d.commodity))];
  const compTrend = {
    labels: months.map(fmtMonth),
    datasets: commodities.map((c, i) => ({
      label: c,
      data: months.map((m) => {
        const row = data.monthlyComplianceTrend.find((r) => r.month === m && r.commodity === c);
        return row ? row.compliance_rate : 0;
      }),
      borderColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
      backgroundColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
      ...lineDefaults,
    })),
  };

  // Weekly/monthly commodity trends (stacked bar)
  const trendMonths = [...new Set(data.monthlyCommodityTrends.map((d) => d.month))].sort();
  const trendCommodities = [...new Set(data.monthlyCommodityTrends.map((d) => d.commodity))];
  const weeklyData = {
    labels: trendMonths.map(fmtMonth),
    datasets: trendCommodities.map((c, i) => ({
      label: c,
      data: trendMonths.map((m) => data.monthlyCommodityTrends.find((r) => r.month === m && r.commodity === c)?.count ?? 0),
      backgroundColor: colorForCommodity(c) || CHART_PALETTE[i % CHART_PALETTE.length],
    })),
  };
  const stackedOpts = {
    ...baseChartOptions(),
    scales: {
      x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 } } },
    },
  };

  // Samples (exclude Eggs & Poultry)
  const filteredSamples = data.samplesByCommodity.filter(d => isSampleCommodity(d.commodity));
  const samplesData = {
    labels: filteredSamples.map((d) => d.commodity),
    datasets: [{ label: "Samples", data: filteredSamples.map((d) => d.count), backgroundColor: filteredSamples.map((d) => colorForCommodity(d.commodity)) }],
  };

  // Facility types
  const ftData = {
    labels: data.facilityTypeDistribution.map((d) => d.facility_type),
    datasets: [{ data: data.facilityTypeDistribution.map((d) => d.count), backgroundColor: data.facilityTypeDistribution.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]) }],
  };

  // Time allocation (horizontal bar)
  const taData = {
    labels: data.timeAllocation.map((d) => d.inspector_name),
    datasets: [{ label: "Hours", data: data.timeAllocation.map((d) => d.total_hours), backgroundColor: "#007890" }],
  };
  const hBarOpts = {
    ...baseChartOptions(),
    indexAxis: "y" as const,
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 10 } } },
      y: { ticks: { font: { size: 10 } } },
    },
  };

  // Occurrence reports per inspector
  const orData = {
    labels: data.occurrenceReports.map((d) => d.inspector_name),
    datasets: [{ label: "Reports", data: data.occurrenceReports.map((d) => d.count), backgroundColor: "#EC343C", borderRadius: 4 }],
  };

  // Commodity count doughnut
  const caData = {
    labels: data.commodityAnalysis.map((d) => d.commodity),
    datasets: [{ data: data.commodityAnalysis.map((d) => d.total_inspections), backgroundColor: data.commodityAnalysis.map((d) => colorForCommodity(d.commodity)) }],
  };

  // Occurrence monthly trend
  const omtData = {
    labels: data.monthlyOccurrenceTrend.map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Occurrences", data: data.monthlyOccurrenceTrend.map((d) => d.count), borderColor: "#EC343C", backgroundColor: "rgba(236,52,60,0.1)", ...lineDefaults, fill: true }],
  };

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      <Card title="Commodity Compliance Trend (%)" icon="fas fa-chart-line" tooltip="Monthly compliance rate trend for each commodity type as a percentage.">
        <ChartWrap height="240px">
          <Line data={compTrend} options={baseChartOptions(undefined, "Compliance %") as never} />
        </ChartWrap>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Weekly Compliance Trend" icon="fas fa-chart-line" tooltip="Weekly inspection breakdown by commodity showing compliance trends over time.">
          <ChartWrap height="280px"><Bar data={weeklyData} options={stackedOpts as never} /></ChartWrap>
        </Card>
        <Card title="Samples Taken" icon="fas fa-vial" tooltip="Total lab samples collected per commodity type.">
          <ChartWrap height="280px"><Bar data={samplesData} options={baseChartOptions() as never} /></ChartWrap>
        </Card>
        <Card title="Facility Types" icon="fas fa-building" tooltip="Breakdown of inspections by facility type.">
          <ChartWrap height="280px"><Doughnut data={ftData} options={doughnutOptions() as never} /></ChartWrap>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Time Allocation (Billable Hours)" icon="fas fa-clock" tooltip="Distribution of billable hours worked across all inspectors.">
          <ChartWrap height="280px">
            <Bar data={taData} options={hBarOpts as never} />
          </ChartWrap>
        </Card>
        <Card title={`Occurrence Reports (${data.totalOccurrenceReports})`} icon="fas fa-file-alt" tooltip="Number of occurrence reports filed per inspector.">
          <ChartWrap height="280px"><Bar data={orData} options={baseChartOptions() as never} /></ChartWrap>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Commodity Count" icon="fas fa-chart-pie" tooltip="Total inspection count per commodity type.">
          <ChartWrap height="280px"><Doughnut data={caData} options={doughnutOptions() as never} /></ChartWrap>
        </Card>
        <Card title="Occurrence Reports Monthly Trend" icon="fas fa-chart-line" tooltip="Monthly trend showing how occurrence report volume changes over time.">
          <ChartWrap height="240px"><Line data={omtData} options={baseChartOptions() as never} /></ChartWrap>
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
    labels: data.monthlyTravelTrend.map((d) => fmtMonth(d.month)),
    datasets: [{ label: "KM", data: data.monthlyTravelTrend.map((d) => d.total_km), borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.15)", ...lineDefaults, fill: true }],
  };

  // Travel hours trend
  const thtData = {
    labels: data.monthlyTravelHoursTrend.map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Hours", data: data.monthlyTravelHoursTrend.map((d) => d.total_hours), borderColor: "#8764b8", backgroundColor: "rgba(135,100,184,0.1)", ...lineDefaults, fill: true }],
  };

  // Travel distance per inspector (horizontal bar)
  const tdpData = {
    labels: data.travelPerInspector.map((d) => d.inspector_name),
    datasets: [{ label: "KM", data: data.travelPerInspector.map((d) => d.total_km), backgroundColor: "#0078d4" }],
  };
  const hBarOpts = {
    ...baseChartOptions(),
    indexAxis: "y" as const,
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 10 } } },
      y: { ticks: { font: { size: 10 } } },
    },
  };

  // Travel time per inspector (horizontal bar)
  const ttpData = {
    labels: data.travelTimePerInspector.map((d) => d.inspector_name),
    datasets: [{ label: "Hours", data: data.travelTimePerInspector.map((d) => d.total_hours), backgroundColor: "#8764b8" }],
  };

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Monthly Travel Distance (km)" icon="fas fa-chart-area" tooltip="Total kilometres driven by all inspectors each month.">
          <ChartWrap height="180px"><Line data={mtdData} options={baseChartOptions(undefined, "KM") as never} /></ChartWrap>
        </Card>
        <Card title="Travel Hours Trend (Monthly)" icon="fas fa-chart-line" tooltip="Monthly trend of hours spent travelling by all inspectors.">
          <ChartWrap height="180px"><Line data={thtData} options={baseChartOptions(undefined, "Hours") as never} /></ChartWrap>
        </Card>
      </div>
      <Card title="Travel Distance Per Inspector" icon="fas fa-route" tooltip="Total kilometres driven by each inspector for the selected period.">
        <ChartWrap height="300px">
          <Bar data={tdpData} options={hBarOpts as never} />
        </ChartWrap>
      </Card>
      <Card title="Travel Time Per Inspector (Hours)" icon="fas fa-car" tooltip="Total travel hours logged by each inspector.">
        <ChartWrap height="300px">
          <Bar data={ttpData} options={hBarOpts as never} />
        </ChartWrap>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL 5: Timelines
// ════════════════════════════════════════════════════════════════════════════════

function TimelinesPanel({ data }: { data: AnalyticsData }) {
  const lineOpts = baseChartOptions(undefined, "Avg Days");

  const docSendTrend = {
    labels: data.monthlyDocSendTrend.map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Avg Days", data: data.monthlyDocSendTrend.map((d) => d.avg_days), borderColor: "#0078d4", backgroundColor: "rgba(0,120,212,0.1)", ...lineDefaults, fill: true }],
  };
  const invoiceTrend = {
    labels: data.monthlyInvoiceTrend.map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Avg Days", data: data.monthlyInvoiceTrend.map((d) => d.avg_days), borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.1)", ...lineDefaults, fill: true }],
  };
  const coaTrend = {
    labels: data.monthlyCoaTrend.map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Avg Days", data: data.monthlyCoaTrend.map((d) => d.avg_days), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", ...lineDefaults, fill: true }],
  };
  const approvalTrend = {
    labels: data.monthlyApprovalTrend.map((d) => fmtMonth(d.month)),
    datasets: [{ label: "Avg Days", data: data.monthlyApprovalTrend.map((d) => d.avg_days), borderColor: "#8764b8", backgroundColor: "rgba(135,100,184,0.1)", ...lineDefaults, fill: true }],
  };

  const hBarOpts = {
    ...baseChartOptions(),
    indexAxis: "y" as const,
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 10 } }, title: { display: true, text: "Avg Days", font: { size: 11 } } },
      y: { ticks: { font: { size: 10 } } },
    },
  };

  const docSendBar = {
    labels: data.docSendTime.map((d) => d.name),
    datasets: [{ label: "Avg Days", data: data.docSendTime.map((d) => d.avg_days), backgroundColor: "#0078d4" }],
  };
  const invoiceBar = {
    labels: data.invoiceUploadTime.map((d) => d.name),
    datasets: [{ label: "Avg Days", data: data.invoiceUploadTime.map((d) => d.avg_days), backgroundColor: "#f59e0b" }],
  };
  const coaBar = {
    labels: data.coaAnalysisTime.map((d) => d.commodity),
    datasets: [{ label: "Avg Days", data: data.coaAnalysisTime.map((d) => d.avg_days), backgroundColor: "#10b981" }],
  };
  const approvalBar = {
    labels: data.approvalTime.map((d) => d.inspector_name),
    datasets: [{ label: "Avg Days", data: data.approvalTime.map((d) => d.avg_days), backgroundColor: "#8764b8" }],
  };

  return (
    <div className="flex flex-col" style={{ gap: "1rem", marginBottom: "1rem" }}>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Doc Send Time Trend (Monthly)" icon="fas fa-chart-line" tooltip="Monthly average days between inspection and document dispatch.">
          <ChartWrap height="180px"><Line data={docSendTrend} options={lineOpts as never} /></ChartWrap>
        </Card>
        <Card title="Invoice Upload Time Trend (Monthly)" icon="fas fa-chart-line" tooltip="Monthly average days between inspection and invoice upload.">
          <ChartWrap height="180px"><Line data={invoiceTrend} options={lineOpts as never} /></ChartWrap>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="COA Upload Time Trend (Monthly)" icon="fas fa-chart-line" tooltip="Monthly average days from sample collection to Certificate of Analysis upload.">
          <ChartWrap height="180px"><Line data={coaTrend} options={lineOpts as never} /></ChartWrap>
        </Card>
        <Card title="Approval Time Trend (Monthly)" icon="fas fa-chart-line" tooltip="Monthly average days from document submission to final approval.">
          <ChartWrap height="180px"><Line data={approvalTrend} options={lineOpts as never} /></ChartWrap>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Avg Days to Send Documents" icon="fas fa-paper-plane" tooltip="Average days each inspector takes to send documents after an inspection.">
          <ChartWrap height="280px"><Bar data={docSendBar} options={hBarOpts as never} /></ChartWrap>
        </Card>
        <Card title="Avg Days to Upload Invoice" icon="fas fa-file-invoice-dollar" tooltip="Average days each inspector takes to upload their invoice.">
          <ChartWrap height="280px"><Bar data={invoiceBar} options={hBarOpts as never} /></ChartWrap>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <Card title="Avg Days: Sample to COA Upload" icon="fas fa-flask" tooltip="Average days from sample collection to COA upload per inspector.">
          <ChartWrap height="280px"><Bar data={coaBar} options={hBarOpts as never} /></ChartWrap>
        </Card>
        <Card title="Avg Days to Approval" icon="fas fa-hourglass-half" tooltip="Average days from submission to approval per inspector.">
          <ChartWrap height="280px"><Bar data={approvalBar} options={hBarOpts as never} /></ChartWrap>
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
  const hourlyRate = data.financialSummary?.hourly_rate ?? 510;
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
    const mgmtFees = (salary + expenses) * 0.2;
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

  // Revenue sources stacked bar
  const revSourceData = {
    labels: fin.map((d) => d.inspector_name),
    datasets: [
      { label: "Rev (Hours)", data: fin.map((d) => d.revenue_hours), backgroundColor: "#0078d4" },
      { label: "Rev (KM)", data: fin.map((d) => d.revenue_km), backgroundColor: "#f59e0b" },
      { label: "Rev (Samples)", data: fin.map((d) => d.revenue_samples), backgroundColor: "#10b981" },
    ],
  };
  const stackedOpts = {
    ...baseChartOptions(),
    scales: {
      x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 }, callback: (v: unknown) => "R" + Number(v).toLocaleString() } },
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
    scales: {
      x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: (v: unknown) => perfMetric.includes("revenue") || perfMetric.includes("profit") || perfMetric.includes("cost") ? "R" + Number(v).toLocaleString() : String(v) } },
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

  const thStyle: React.CSSProperties = { background: "#e6f3f7", padding: "0.6rem 0.75rem", fontWeight: 600, fontSize: "0.75rem", textAlign: "center", whiteSpace: "nowrap", borderBottom: "2px solid #e5e7eb", textTransform: "uppercase", letterSpacing: "0.3px" };
  const tdStyle: React.CSSProperties = { padding: "0.5rem 0.75rem", fontSize: "0.8rem", borderBottom: "1px solid #e5e7eb", textAlign: "center", fontVariantNumeric: "tabular-nums" };
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
                <th style={thStyle}>Inspections</th>
                <th style={thStyle}>Billable Hrs</th>
                <th style={thStyle}>KM</th>
                <th style={thStyle}>R/km</th>
                <th style={thStyle}>On-Site Hrs</th>
                <th style={thStyle}>Rev (Hours)</th>
                <th style={thStyle}>Rev (KM)</th>
                <th style={thStyle}>Rev (Samples)</th>
                <th style={thStyle}>Total Revenue</th>
                <th style={costThStyle}>Salary (CTC)</th>
                <th style={costThStyle}>Expenses</th>
                <th style={costThStyle}>Management Fees</th>
                <th style={costThStyle}>Total Cost</th>
                <th style={profitThStyle}>Rev/Hr</th>
                <th style={profitThStyle}>Cost/Hr</th>
                <th style={profitThStyle}>Profit</th>
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
                  <td style={tdStyle}>{r.salary > 0 ? fmtRInt(Math.round(r.salary)) : "—"}</td>
                  <td style={tdStyle}>{r.expenses > 0 ? fmtRInt(Math.round(r.expenses)) : "—"}</td>
                  <td style={tdStyle}>{r.mgmtFees > 0 ? fmtRInt(Math.round(r.mgmtFees)) : "—"}</td>
                  <td style={tdStyle}>{r.totalCost > 0 ? fmtRInt(Math.round(r.totalCost)) : "—"}</td>
                  <td style={tdStyle}>{r.revPerHr > 0 ? fmtRInt(r.revPerHr) : "—"}</td>
                  <td style={tdStyle}>{r.costPerHr > 0 ? fmtRInt(r.costPerHr) : "—"}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: r.profit >= 0 ? "#059669" : "#dc2626" }}>{r.total_revenue > 0 || r.totalCost > 0 ? fmtRInt(Math.round(r.profit)) : "—"}</td>
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
                <td style={totalStyle}>{fmtRInt(Math.round(totals.salary))}</td>
                <td style={totalStyle}>{totals.expenses > 0 ? fmtRInt(Math.round(totals.expenses)) : "R0"}</td>
                <td style={totalStyle}>{fmtRInt(Math.round(totals.mgmtFees))}</td>
                <td style={totalStyle}>{fmtRInt(Math.round(totals.totalCost))}</td>
                <td style={totalStyle}>{fmtRInt(totalRevPerHr)}</td>
                <td style={totalStyle}>{fmtRInt(totalCostPerHr)}</td>
                <td style={{ ...totalStyle, color: totals.profit >= 0 ? "#059669" : "#dc2626" }}>{fmtRInt(Math.round(totals.profit))}</td>
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
            <Bar data={revSourceData} options={stackedOpts as never} />
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
            <Bar data={perfData} options={perfOpts as never} />
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
