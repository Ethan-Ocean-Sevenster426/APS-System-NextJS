/* Weekly Inspectorate Performance Report — PDF builder.
 *
 * One source of truth for the PDF design. Used in two places:
 *  - the Export PDF button on the weekly report page (browser)
 *  - /api/weekly-report/pdf on the Next.js server, which the automatic
 *    Monday email uses to attach the exact same document.
 * Change the design here and both stay identical.
 */

/* ── Report data types (shared with the page) ────────────────────────────── */
export interface PerformanceRow {
  inspector_name: string;
  quarter_target: number;
  weekly_inspections: number;
  prev_inspections: number;
  cumulative_inspections: number;
  cumulative_approved: number;
  cumulative_pending: number;
  target_pct: number | null;
  rank: number;
  rank_change: number | null;
}
export interface TrendPoint { week: string; inspections?: number; rate?: number | null; }
export interface SampleRow { inspector_name: string; inspections: number; taken: number; no_sample: number; completed: number; waiting: number; overdue: number; outstanding: number; rank: number; }
export interface OutstandingSample {
  inspector_name: string; client_name: string; commodity: string;
  sample_date: string; age_days: number; overdue: boolean;
}
export interface ApprovalRow {
  inspector_name: string; total_records: number; captured_on_time: number;
  approved: number; pending: number; approval_rate: number; capture_rate: number; rank: number;
}
export interface OccurrenceRow { inspector_name: string; count: number; rank: number; }
export interface OccurrenceDetail {
  inspector_name: string; client_name: string; town: string;
  date_of_inspection: string | null; submitted: string | null; status: string;
}
export interface ComplianceRow {
  inspector_name: string; inspections: number; compliant: number; non_compliant: number;
  not_assessed: number; rate: number; prev_rate: number | null; change: number | null; rank: number;
}
export interface CommodityInspectorRow {
  inspector_name: string; inspections: number; compliant: number; non_compliant: number;
  not_assessed: number; rate: number;
}
export interface CommodityComplianceRow {
  commodity: string; inspections: number; compliant: number; non_compliant: number;
  not_assessed: number; rate: number; inspectors?: CommodityInspectorRow[];
}
export interface TravelRow {
  inspector_name: string; km: number; hours: number; inspections: number;
  avg_km_per_inspection: number; new_facilities: number; rank: number;
}
export interface InspectionDetailRow {
  date: string | null; client: string; commodity: string;
  result: "Pass" | "Fail" | "Not recorded" | string;
  approved: boolean; sample_taken: boolean; sample_result_back: boolean;
}
export interface InspectorDetail {
  name: string;
  daily: { date: string; count: number }[];
  inspections: InspectionDetailRow[];
}
export interface ReportResponse {
  success: boolean;
  inspector_detail?: InspectorDetail | null;
  week_start: string; week_end: string; is_single_week: boolean; quarter: string;
  admin_lag_days: number; sample_overdue_days: number;
  totals: {
    inspections: number; prev_inspections: number; active_inspectors: number;
    samples: number; occurrences: number; approved: number; pending: number;
    overall_compliance: number | null; prev_overall_compliance: number | null;
    total_km: number; total_hours: number;
  };
  /* Back-office turnaround per stage. Timing only — never invoice amounts. */
  turnaround?: Record<string, {
    avg: number | null; count: number; prev_avg: number | null;
    target: number; label: string;
  }>;
  /* Administration throughput this period vs last. Counts + timing only. */
  throughput?: {
    sent: { count: number; prev: number };
    invoices_uploaded: { count: number; prev: number };
    coas_uploaded: { count: number; prev: number };
    invoice_time: { avg: number | null; prev_avg: number | null; count: number };
    top_senders: { name: string; count: number; prev: number }[];
  };
  performance: PerformanceRow[];
  inspection_trend: TrendPoint[];
  samples: SampleRow[];
  sample_status: { completed: number; waiting: number; overdue: number };
  outstanding_samples: OutstandingSample[];
  approvals: ApprovalRow[];
  occurrences: OccurrenceRow[];
  occurrence_detail: OccurrenceDetail[];
  compliance: ComplianceRow[];
  commodity_compliance?: CommodityComplianceRow[];
  compliance_trend: TrendPoint[];
  travel: TravelRow[];
  error?: string;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + (iso.length === 10 ? "T12:00:00" : ""))
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtWeekLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/* ── PDF builder — returns the jsPDF document ────────────────────────────── */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function buildWeeklyReportPdf(data: ReportResponse, logo: string | null): Promise<any> {
  const jsPDFModule: any = await import("jspdf");
  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
  const autoTableModule: any = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule.autoTable || autoTableModule;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, ML = 14, MR = 14, CW = W - ML - MR;
  const TEAL: [number, number, number] = [0, 120, 144];
  const DARK: [number, number, number] = [17, 24, 39];
  const GRAY: [number, number, number] = [107, 114, 128];
  const GREEN: [number, number, number] = [21, 128, 61];
  const RED: [number, number, number] = [220, 38, 38];
  const t2 = data.totals;
  const periodLabel = data.is_single_week
    ? `Monday ${fmtDate(data.week_start)} — Sunday ${fmtDate(data.week_end)}`
    : `${fmtDate(data.week_start)} — ${fmtDate(data.week_end)}`;
  const mv = (n: number | null, suffix = "") =>
    n === null || n === undefined ? "new" : n === 0 ? "-" : `${n > 0 ? "+" : ""}${n}${suffix}`;

  let y = 0;
  const header = (title: string) => {
    doc.setFillColor(...TEAL);
    doc.rect(ML, y, CW, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(title, ML + 3, y + 6);
    doc.setFont("helvetica", "normal");
    y += 13;
  };
  const table = (head: string[], body: (string | number)[][], redRows: number[] = [], centerCols: number[] = []) => {
    const centerSet = new Set(centerCols);
    autoTable(doc, {
      startY: y + 1,
      head: [head],
      body,
      rowPageBreak: "avoid",
      margin: { left: ML, right: MR },
      styles: { fontSize: 7.5, cellPadding: 2.2, textColor: DARK },
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (h: any) => {
        if (centerSet.has(h.column.index)) h.cell.styles.halign = "center";
        if (h.section === "body" && redRows.includes(h.row.index)) h.cell.styles.textColor = RED;
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  };
  const needPage = (space: number) => {
    if (y + space > 283) { doc.addPage(); y = 16; }
  };
  // Sections flow on — a new page only when barely any room is left, so pages
  // never end in big blank gaps (long tables continue onto the next page)
  const sectionPage = () => {
    if (y > 215) { doc.addPage(); y = 16; } else if (y > 20) { y += 4; }
  };

  /* ── Chart drawing helpers (match the on-screen visuals) ── */
  const AMBER: [number, number, number] = [217, 119, 6];
  const BLUE: [number, number, number] = [37, 99, 235];
  const HAIR: [number, number, number] = [243, 244, 246];

  const chartTitle = (txt: string) => {
    doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(txt, ML, y + 3);
    doc.setFont("helvetica", "normal");
    y += 8;
  };

  // Shared bar geometry so every bar chart lines up on the same edges
  const BAR_STEP = 6.4, BAR_H = 4.3, LABEL_W = 44, VAL_W = 14;

  // Two measures side by side in ONE chart — each half is scaled to its own maximum
  const drawDualBars = (title: string, rows: { label: string; a: number; b: number }[], aLabel: string, bLabel: string, aColor: [number, number, number], bColor: [number, number, number]) => {
    needPage(Math.min(21 + rows.length * BAR_STEP, 260));
    chartTitle(title);
    const halfW = (CW - LABEL_W - 4) / 2;
    const aX = ML + LABEL_W + 2, bX = aX + halfW + 4;
    const aBarW = halfW - VAL_W - 2, bBarW = halfW - VAL_W - 2;
    doc.setFontSize(6.8); doc.setTextColor(...GRAY);
    doc.setFillColor(...aColor); doc.rect(aX, y, 3.2, 3.2, "F");
    doc.text(aLabel, aX + 4.6, y + 2.6);
    doc.setFillColor(...bColor); doc.rect(bX, y, 3.2, 3.2, "F");
    doc.text(bLabel, bX + 4.6, y + 2.6);
    y += 7;
    const aMax = Math.max(...rows.map(r => r.a), 1);
    const bMax = Math.max(...rows.map(r => r.b), 1);
    rows.forEach(r => {
      needPage(BAR_STEP + 2);
      doc.setFontSize(7.4); doc.setTextColor(55, 65, 81);
      doc.text(String(r.label).substring(0, 30), ML, y + 3.4);
      doc.setFillColor(...HAIR); doc.roundedRect(aX, y, aBarW, BAR_H, 1, 1, "F");
      const aw = Math.max((r.a / aMax) * aBarW, r.a > 0 ? 1.4 : 0);
      if (aw > 0) { doc.setFillColor(...aColor); doc.roundedRect(aX, y, aw, BAR_H, 1, 1, "F"); }
      doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK); doc.setFontSize(7.4);
      doc.text(r.a.toLocaleString("en-ZA"), aX + aBarW + VAL_W, y + 3.4, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFillColor(...HAIR); doc.roundedRect(bX, y, bBarW, BAR_H, 1, 1, "F");
      const bw = Math.max((r.b / bMax) * bBarW, r.b > 0 ? 1.4 : 0);
      if (bw > 0) { doc.setFillColor(...bColor); doc.roundedRect(bX, y, bw, BAR_H, 1, 1, "F"); }
      doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK); doc.setFontSize(7.4);
      doc.text(r.b.toLocaleString("en-ZA"), W - MR, y + 3.4, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += BAR_STEP;
    });
    y += 6;
  };

  const drawHBars = (title: string, rows: { label: string; value: number }[], color: [number, number, number], unit = "") => {
    needPage(Math.min(14 + rows.length * BAR_STEP, 260)); // keep title + whole chart on one page
    chartTitle(title);
    const max = Math.max(...rows.map(r => r.value), 1);
    const barX = ML + LABEL_W + 2, barW = CW - LABEL_W - VAL_W - 4;
    rows.forEach(r => {
      needPage(BAR_STEP + 2);
      doc.setFontSize(7.4); doc.setTextColor(55, 65, 81);
      doc.text(String(r.label).substring(0, 30), ML, y + 3.4);
      doc.setFillColor(...HAIR);
      doc.roundedRect(barX, y, barW, BAR_H, 1, 1, "F");
      const bw = Math.max((r.value / max) * barW, r.value > 0 ? 1.4 : 0);
      if (bw > 0) { doc.setFillColor(...color); doc.roundedRect(barX, y, bw, BAR_H, 1, 1, "F"); }
      doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK); doc.setFontSize(7.4);
      doc.text(`${r.value.toLocaleString("en-ZA")}${unit}`, W - MR, y + 3.4, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += BAR_STEP;
    });
    y += 6;
  };

  const drawStackedBars = (title: string, rows: { label: string; a: number; b: number }[], aLabel: string, bLabel: string, aColor: [number, number, number], bColor: [number, number, number]) => {
    needPage(Math.min(21 + rows.length * BAR_STEP, 260));
    chartTitle(title);
    // Legend sits against the right edge of the chart
    doc.setFontSize(6.8);
    const bTextW = doc.getTextWidth(bLabel), aTextW = doc.getTextWidth(aLabel);
    let lx = W - MR - bTextW;
    doc.setTextColor(...GRAY);
    doc.text(bLabel, lx, y + 2.6);
    doc.setFillColor(...bColor); doc.rect(lx - 4.6, y, 3.2, 3.2, "F");
    lx = lx - 4.6 - 7 - aTextW;
    doc.text(aLabel, lx, y + 2.6);
    doc.setFillColor(...aColor); doc.rect(lx - 4.6, y, 3.2, 3.2, "F");
    y += 7;
    const max = Math.max(...rows.map(r => r.a + r.b), 1);
    const barX = ML + LABEL_W + 2, barW = CW - LABEL_W - VAL_W - 4;
    rows.forEach(r => {
      needPage(BAR_STEP + 2);
      doc.setFontSize(7.4); doc.setTextColor(55, 65, 81);
      doc.text(String(r.label).substring(0, 30), ML, y + 3.4);
      doc.setFillColor(...HAIR);
      doc.roundedRect(barX, y, barW, BAR_H, 1, 1, "F");
      const aw = (r.a / max) * barW, bw2 = (r.b / max) * barW;
      if (aw > 0) { doc.setFillColor(...aColor); doc.roundedRect(barX, y, Math.max(aw, 1), BAR_H, 1, 1, "F"); }
      if (bw2 > 0) { doc.setFillColor(...bColor); doc.roundedRect(barX + aw, y, Math.max(bw2, 1), BAR_H, 1, 1, "F"); }
      doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK); doc.setFontSize(7.4);
      doc.text(`${r.a}/${r.a + r.b}`, W - MR, y + 3.4, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += BAR_STEP;
    });
    y += 6;
  };

  const drawTrend = (title: string, points: { label: string; value: number | null }[], color: [number, number, number], unit = "", chH = 34) => {
    needPage(11 + chH + 15);
    chartTitle(title);
    const vals = points.map(p => p.value).filter((v): v is number => v !== null);
    if (!vals.length) return;
    const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
    const chX = ML + 4, chW = CW - 8, yTop = y + 2;
    const xs = (i: number) => chX + (i * chW) / Math.max(points.length - 1, 1);
    const ys = (v: number) => yTop + chH - ((v - min) / span) * chH;
    doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2);
    doc.line(ML, yTop + chH, ML + CW, yTop + chH);
    doc.setDrawColor(...color); doc.setLineWidth(0.7);
    let prev: [number, number] | null = null;
    points.forEach((p, i) => {
      if (p.value === null) { prev = null; return; }
      const X = xs(i), Y = ys(p.value);
      if (prev) doc.line(prev[0], prev[1], X, Y);
      prev = [X, Y];
    });
    points.forEach((p, i) => {
      if (p.value === null) return;
      doc.setFillColor(...color); doc.circle(xs(i), ys(p.value), 1.1, "F");
    });
    points.forEach((p, i) => {
      doc.setFontSize(6.2); doc.setTextColor(...GRAY);
      doc.text(fmtWeekLabel(p.label), xs(i), yTop + chH + 4.5, { align: "center" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...DARK);
      doc.text(`${p.value === null ? "-" : p.value}${unit}`, xs(i), yTop + chH + 8.2, { align: "center" });
      doc.setFont("helvetica", "normal");
    });
    y = yTop + chH + 14;
  };

  const drawDoughnut = (parts: { label: string; value: number; color: [number, number, number] }[]) => {
    const total = parts.reduce((s, p) => s + p.value, 0);
    if (!total) return;
    const r = 21;
    needPage(2 * r + 14);
    // The chart itself sits on the page centre line; the legend hangs to its right
    doc.setFontSize(7.5);
    const legendTexts = parts.map(p => `${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`);
    const cx = W / 2, cy = y + r + 2;
    let angle = -Math.PI / 2;
    parts.forEach(p => {
      if (p.value <= 0) return;
      const sweep = (p.value / total) * Math.PI * 2;
      const steps = Math.max(2, Math.ceil(sweep / 0.12));
      const poly: [number, number][] = [[cx, cy]];
      for (let i = 0; i <= steps; i++) {
        const a = angle + (sweep * i) / steps;
        poly.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      const rel: [number, number][] = [];
      for (let i = 1; i < poly.length; i++) rel.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
      doc.setFillColor(...p.color);
      doc.lines(rel, cx, cy, [1, 1], "F", true);
      angle += sweep;
    });
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, r * 0.55, "F");
    doc.setTextColor(...DARK); doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(String(total), cx, cy + 0.5, { align: "center" });
    doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
    doc.text("samples", cx, cy + 4.5, { align: "center" });
    // legend — vertically centred beside the chart
    let ly = cy - (parts.length * 7) / 2 + 1;
    parts.forEach((p, i) => {
      doc.setFillColor(...p.color); doc.rect(cx + r + 10, ly, 3.6, 3.6, "F");
      doc.setTextColor(...DARK); doc.setFontSize(7.5);
      doc.text(legendTexts[i], cx + r + 15.5, ly + 2.9);
      ly += 7;
    });
    y = cy + r + 8;
  };

  /* ══ PAGE 1: COVER — same design as the Inspector Analytics PDF ══ */
  const H = 297;
  const WHITE: [number, number, number] = [255, 255, 255];
  const GRAY_LIGHT: [number, number, number] = [156, 163, 175];
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, H, "F");
  // Subtle decorative accent lines
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.8);
  doc.line(ML, 42, W - MR, 42);
  doc.line(ML, H - 62, W - MR, H - 62);
  // Logo
  if (logo) { try { doc.addImage(logo, "PNG", W / 2 - 18, 58, 36, 32); } catch { /* skip */ } }
  const logoBottom = logo ? 102 : 80;
  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text("FOOD SAFETY AGENCY (PTY) LTD", W / 2, logoBottom, { align: "center" });
  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(...TEAL);
  doc.text("Weekly Inspectorate Performance Report", W / 2, logoBottom + 11, { align: "center" });
  // Decorative teal bar
  doc.setFillColor(...TEAL);
  doc.rect(W / 2 - 30, logoBottom + 16.5, 60, 1.2, "F");
  // Period + quarter
  doc.setFontSize(11);
  doc.setTextColor(...GRAY_LIGHT);
  doc.text(`Reporting period: ${periodLabel}`, W / 2, logoBottom + 27, { align: "center" });
  doc.setFontSize(10);
  doc.text(data.quarter, W / 2, logoBottom + 34, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("This report contains no financial information.", W / 2, logoBottom + 43, { align: "center" });
  // Contents list — fills the middle of the cover and tells the reader what's inside
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text("IN THIS REPORT", W / 2, logoBottom + 58, { align: "center" });
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY_LIGHT);
  [
    "This Week's Winners",
    "This Week's Watch-Outs",
    "Action Points This Week",
    "1. Inspection Performance",
    "2. Sample Tracking",
    "3. Approval versus Capturing",
    "4. Weekly Compliance",
    "5. Travel Activity",
    "6. Administration & Throughput",
    "7. Turnaround Times",
  ].forEach((s, i) => {
    doc.text(s, W / 2, logoBottom + 66 + i * 7, { align: "center" });
  });
  // Confidential badge at bottom
  doc.setFontSize(8);
  doc.text("CONFIDENTIAL — For authorized personnel only", W / 2, H - 42, { align: "center" });

  /* ══ PAGE 2: KEY PERFORMANCE INDICATORS — analytics-style cards ══ */
  doc.addPage();
  const drawKpiCard = (x: number, cy: number, w: number, h: number, label: string, value: string, color: [number, number, number]) => {
    doc.setFillColor(246, 248, 250);
    doc.roundedRect(x, cy, w, h, 2, 2, "F");
    doc.setFillColor(...color);
    doc.rect(x, cy, w, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.setTextColor(...color);
    doc.text(value, x + w / 2, cy + h / 2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(doc.splitTextToSize(label.toUpperCase(), w - 6), x + w / 2, cy + h / 2 + 9, { align: "center" });
  };
  y = 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text("Key Performance Indicators", ML, y);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.7);
  doc.line(ML, y + 2.5, ML + 78, y + 2.5);
  y += 12;

  const AMBER0: [number, number, number] = [217, 119, 6];
  const compColor: [number, number, number] = t2.overall_compliance !== null && t2.overall_compliance >= 70 ? GREEN : AMBER0;
  const cardH = 38, gap = 5;
  const w3 = (CW - 2 * gap) / 3;
  drawKpiCard(ML, y, w3, cardH, `Inspections (${mv(t2.inspections - t2.prev_inspections)} vs previous)`, String(t2.inspections), TEAL);
  drawKpiCard(ML + w3 + gap, y, w3, cardH, "Active inspectors", String(t2.active_inspectors), [37, 99, 235]);
  drawKpiCard(ML + 2 * (w3 + gap), y, w3, cardH, "Samples taken", String(t2.samples), AMBER0);
  y += cardH + gap;
  const w2 = (CW - gap) / 2;
  drawKpiCard(ML, y, w2, cardH,
    `Overall compliance (${t2.overall_compliance !== null && t2.prev_overall_compliance !== null ? mv(Math.round((t2.overall_compliance - t2.prev_overall_compliance) * 10) / 10, "pt") : "n/a"} vs previous)`,
    t2.overall_compliance === null ? "-" : `${t2.overall_compliance}%`, compColor);
  drawKpiCard(ML + w2 + gap, y, w2, cardH, "Kilometres travelled", t2.total_km.toLocaleString("en-ZA"), TEAL);
  y += cardH + 14;

  /* ══ THIS WEEK'S WINNERS — the good news first. Every winner is computed
     straight from the week's numbers; categories with no data are skipped. ══ */
  const winners: { label: string; name: string; value: string }[] = [];
  const topPerf = data.performance[0];
  if (topPerf && topPerf.weekly_inspections > 0) winners.push({ label: "Most Inspections", name: topPerf.inspector_name, value: `${topPerf.weekly_inspections} inspections` });
  const topAppr = [...data.approvals].sort((a, b) => b.approved - a.approved)[0];
  if (topAppr && topAppr.approved > 0) winners.push({ label: "Most Approved", name: topAppr.inspector_name, value: `${topAppr.approved} approved` });
  const topComp = [...data.compliance].filter(c => c.compliant + c.non_compliant > 0).sort((a, b) => b.rate - a.rate || (b.inspections ?? 0) - (a.inspections ?? 0))[0];
  if (topComp) winners.push({ label: "Best Compliance", name: topComp.inspector_name, value: `${topComp.rate}% of ${topComp.inspections} inspections` });
  if (winners.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...DARK);
    doc.text("This Week's Winners", ML, y);
    doc.setDrawColor(...AMBER0);
    doc.setLineWidth(0.7);
    doc.line(ML, y + 2.5, ML + 60, y + 2.5);
    y += 8;
    const wc = (CW - 2 * gap) / 3, wch = 24;
    winners.slice(0, 6).forEach((w0, i) => {
      const x = ML + (i % 3) * (wc + gap), yy = y + Math.floor(i / 3) * (wch + 5);
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(x, yy, wc, wch, 2, 2, "F");
      doc.setFillColor(...AMBER0);
      doc.rect(x, yy, wc, 2.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8); doc.setTextColor(...GRAY);
      doc.text(w0.label.toUpperCase(), x + wc / 2, yy + 8.5, { align: "center" });
      doc.setFontSize(10); doc.setTextColor(...DARK);
      doc.text(w0.name, x + wc / 2, yy + 14.8, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5); doc.setTextColor(...GRAY);
      doc.text(w0.value, x + wc / 2, yy + 20, { align: "center" });
    });
    y += Math.ceil(Math.min(winners.length, 6) / 3) * (wch + 5) + 10;
  }

  /* ══ WATCH-OUTS — the mirror of the winners block, red instead of amber, so
     the bad news sits beside the good news instead of hiding inside it.
     Categories with nothing to report are skipped, same as the winners. ══ */
  const watchOuts: { label: string; name: string; value: string }[] = [];
  const worstPending = [...data.approvals]
    .sort((a, b) => b.pending - a.pending || b.total_records - a.total_records)[0];
  if (worstPending && worstPending.pending > 0) watchOuts.push({
    label: "Most Not Approved",
    name: worstPending.inspector_name,
    value: `${worstPending.pending} of ${worstPending.total_records} not approved`,
  });
  if (watchOuts.length > 0) {
    const wch2 = 24;
    needPage(8 + Math.ceil(Math.min(watchOuts.length, 6) / 3) * (wch2 + 5) + 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...DARK);
    doc.text("This Week's Watch-Outs", ML, y);
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.7);
    doc.line(ML, y + 2.5, ML + 60, y + 2.5);
    y += 8;
    const wc = (CW - 2 * gap) / 3;
    watchOuts.slice(0, 6).forEach((w0, i) => {
      const x = ML + (i % 3) * (wc + gap), yy = y + Math.floor(i / 3) * (wch2 + 5);
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(x, yy, wc, wch2, 2, 2, "F");
      doc.setFillColor(...RED);
      doc.rect(x, yy, wc, 2.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8); doc.setTextColor(...GRAY);
      doc.text(w0.label.toUpperCase(), x + wc / 2, yy + 8.5, { align: "center" });
      doc.setFontSize(10); doc.setTextColor(...DARK);
      doc.text(w0.name, x + wc / 2, yy + 14.8, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5); doc.setTextColor(...GRAY);
      doc.text(w0.value, x + wc / 2, yy + 20, { align: "center" });
    });
    y += Math.ceil(Math.min(watchOuts.length, 6) / 3) * (wch2 + 5) + 10;
  }

  /* ══ ACTION POINTS — turned automatically from this week's numbers into
     instructions, so the report tells management what to DO. Shares the KPI
     page so the whole "what happened + what to do" story is one page. ══ */
  const actions: { sev: "red" | "amber"; text: string }[] = [];
  const backlog = data.approvals.filter(a => a.pending > 0);
  const backlogTotal = backlog.reduce((s, a) => s + a.pending, 0);
  if (backlogTotal > 0) {
    const worst = [...backlog].sort((a, b) => b.pending - a.pending).slice(0, 3)
      .map(a => `${a.inspector_name} (${a.pending} waiting)`).join(", ");
    actions.push({
      sev: backlogTotal >= 50 ? "red" : "amber",
      text: `Approve the backlog: ${backlogTotal} inspections are still waiting for office approval. Largest backlogs: ${worst}. Every day they wait, the ${data.admin_lag_days}-day standard slips further.`,
    });
  }
  const lateCap = data.approvals.filter(a => a.capture_rate < 80 && a.total_records >= 5);
  if (lateCap.length > 0) {
    actions.push({
      sev: "amber",
      text: `Chase late capturing: ${lateCap.map(a => `${a.inspector_name} captured only ${a.capture_rate}% of inspections within ${data.admin_lag_days} days`).join("; ")}. Remind them to capture on the day of the inspection.`,
    });
  }
  const lowComp = data.compliance.filter(c => c.rate < 50 && (c.compliant + c.non_compliant) >= 10);
  if (lowComp.length > 0) {
    actions.push({
      sev: "red",
      text: `Follow up on low pass rates: ${lowComp.map(c => `${c.inspector_name} at ${c.rate}%${c.change !== null ? ` (${c.change > 0 ? "+" : ""}${c.change}pt vs last week)` : ""}`).join("; ")}. Look at which clients and products are failing and whether intervention is needed.`,
    });
  }
  const noOutcome = data.compliance.reduce((s, c) => s + (c.not_assessed ?? 0), 0);
  if (noOutcome >= 20) {
    const worstNo = [...data.compliance].sort((a, b) => (b.not_assessed ?? 0) - (a.not_assessed ?? 0)).slice(0, 3)
      .map(c => `${c.inspector_name} (${c.not_assessed})`).join(", ");
    actions.push({
      sev: "red",
      text: `Get outcomes recorded: ${noOutcome} of this week's inspections have no compliant / non-compliant outcome recorded, so nobody knows whether those clients are safe. Most outcomes missing: ${worstNo}. An inspection without an outcome cannot count as compliant.`,
    });
  }
  if (data.sample_status.overdue > 0) {
    actions.push({
      sev: "red",
      text: `Chase ${data.sample_status.overdue} overdue sample${data.sample_status.overdue === 1 ? "" : "s"}: more than ${data.sample_overdue_days} days with no lab result. The list is in Section 2 — find out if each one is stuck with the inspector, the courier or the laboratory.`,
    });
  }
  const noTarget = data.performance.filter(p => !p.quarter_target).length;
  if (noTarget > 0) {
    actions.push({
      sev: "amber",
      text: `Set quarterly targets: ${noTarget} of ${data.performance.length} inspectors have no ${data.quarter} target captured, so their target progress cannot be measured. Capture the targets so next week's report can track them.`,
    });
  }
  const dropPct = t2.prev_inspections > 0 ? Math.round(((t2.inspections - t2.prev_inspections) * 100) / t2.prev_inspections) : 0;
  if (dropPct <= -15) {
    actions.push({
      sev: "amber",
      text: `Inspections dropped ${Math.abs(dropPct)}% (${t2.prev_inspections} last week to ${t2.inspections} this week). Check leave, planning and routes for the coming week so the volume recovers.`,
    });
  }

  needPage(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text("Action Points This Week", ML, y);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.7);
  doc.line(ML, y + 2.5, ML + 70, y + 2.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text("Created automatically from this week's numbers. Red = act now, amber = needs attention.", ML, y + 9);
  y += 17;
  if (actions.length === 0) {
    doc.setFillColor(...GREEN);
    doc.circle(ML + 2, y + 1.5, 2.1, "F");
    doc.setTextColor(...DARK); doc.setFontSize(10.5);
    doc.text("Nothing needs urgent attention this week — all measures are within limits.", ML + 8, y + 3);
  } else {
    doc.setFontSize(10);
    actions.forEach((a, i) => {
      const lines = doc.splitTextToSize(a.text, CW - 15) as string[];
      const blockH = lines.length * 5.1 + 8;
      needPage(blockH);
      doc.setFillColor(...(a.sev === "red" ? RED : AMBER0));
      doc.circle(ML + 2.4, y + 2.2, 2.1, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK);
      doc.text(`${i + 1}.`, ML + 8, y + 3.6);
      doc.setFont("helvetica", "normal");
      doc.text(lines, ML + 15, y + 3.6);
      y += blockH;
    });
  }

  sectionPage();

  /* ── 1. Inspection performance ── */
  header("1. Inspection Performance");
  const apprOf = (name: string) => data.approvals.find(a => a.inspector_name === name);
  const perfTotals = {
    week: data.performance.reduce((s, p) => s + p.weekly_inspections, 0),
    approved: data.approvals.reduce((s, a) => s + a.approved, 0),
    pending: data.approvals.reduce((s, a) => s + a.pending, 0),
    cum: data.performance.reduce((s, p) => s + p.cumulative_inspections, 0),
  };
  autoTable(doc, {
    startY: y + 1,
    head: [["Rank", "Inspector", "Quarterly Target", data.is_single_week ? "This Week" : "This Period", "Approved", "Waiting Approval", "vs Last Week", "Quarter So Far", "% of Target", "Rank Change"]],
    body: data.performance.map(p => [p.rank, p.inspector_name, p.quarter_target || "No target set", p.weekly_inspections, apprOf(p.inspector_name)?.approved ?? 0, apprOf(p.inspector_name)?.pending ?? 0, mv(p.weekly_inspections - (p.prev_inspections ?? 0)), p.cumulative_inspections, p.target_pct === null ? "-" : `${p.target_pct}%`, mv(p.rank_change)]),
    foot: [["", "Whole team — grand total", "", perfTotals.week, perfTotals.approved, perfTotals.pending, "", perfTotals.cum, "", ""]],
    margin: { left: ML, right: MR },
    styles: { fontSize: 7, cellPadding: 2.2, textColor: DARK },
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
    footStyles: { fillColor: DARK, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" },
      6: { halign: "center" }, 7: { halign: "center" }, 8: { halign: "center" }, 9: { halign: "center" },
    },
    didParseCell: (h: any) => {
      if (h.section !== "body") {
        if (h.column.index !== 1 && h.column.index !== 2) h.cell.styles.halign = "center";
        return;
      }
      const raw = String(h.cell.raw);
      // Podium — gold, silver, bronze tints for the top three
      if (h.row.index === 0) h.cell.styles.fillColor = [254, 243, 199];
      else if (h.row.index === 1) h.cell.styles.fillColor = [226, 232, 240];
      else if (h.row.index === 2) h.cell.styles.fillColor = [255, 237, 213];
      if (h.column.index === 0) { h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = TEAL; }
      if (h.column.index === 1) h.cell.styles.fontStyle = "bold";
      if (h.column.index === 3) h.cell.styles.fontStyle = "bold";
      if (h.column.index === 2 && raw === "No target set") h.cell.styles.textColor = GRAY;
      // This week's approvals — approved green, waiting red when something waits
      if (h.column.index === 4) { h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = GREEN; }
      if (h.column.index === 5) { h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = raw !== "0" ? RED : GRAY; }
      // Movement columns — green up, red down, gray unchanged
      if (h.column.index === 6 || h.column.index === 9) {
        h.cell.styles.fontStyle = "bold";
        if (raw.startsWith("+")) h.cell.styles.textColor = GREEN;
        else if (raw.startsWith("-") && raw.length > 1) h.cell.styles.textColor = RED;
        else h.cell.styles.textColor = GRAY;
      }
      if (h.column.index === 8 && raw !== "-") h.cell.styles.fontStyle = "bold";
    },
  });
  y = (doc as any).lastAutoTable.finalY + 3;
  doc.setTextColor(...GRAY); doc.setFontSize(7.5);
  doc.text(`Approved + Waiting Approval = this week's inspections. "Quarter So Far" = all inspections this quarter (${data.quarter}) up to the end of this reporting week.`, ML, y + 2);
  y += 8;
  drawStackedBars(
    `Inspections this ${data.is_single_week ? "week" : "period"} — normal inspections vs occurrence reports`,
    data.performance.map(p => {
      const occ = data.occurrences.find(o => o.inspector_name === p.inspector_name)?.count ?? 0;
      return { label: p.inspector_name, a: p.weekly_inspections - occ, b: occ };
    }),
    "Normal inspections", "Occurrence reports", TEAL, AMBER,
  );
  drawStackedBars(
    "Of those inspections — approved vs still waiting for approval",
    data.performance
      .map(p => {
        const a = data.approvals.find(x => x.inspector_name === p.inspector_name);
        return { label: p.inspector_name, a: a?.approved ?? 0, b: a?.pending ?? 0 };
      })
      .sort((x, z) => z.a - x.a || (z.a + z.b) - (x.a + x.b)),
    "Approved", "Waiting approval", BLUE, RED,
  );
  /* Travel effort behind the inspections — covering ground fast is good,
     many hours for little distance is a slow day worth asking about */
  if (data.travel.length > 0) {
    const effRows = [...data.travel]
      .map(t => ({ ...t, kmPerHour: t.hours > 0 ? Math.round((t.km / t.hours) * 10) / 10 : 0 }))
      .sort((a, b) => b.km - a.km);
    needPage(70);
    doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("The travel effort behind these inspections:", ML, y);
    doc.setFont("helvetica", "normal");
    y += 3;
    autoTable(doc, {
      startY: y + 1,
      head: [["Inspector", "Inspections", "KM Travelled", "Hours on the Road"]],
      body: effRows.map(t => [t.inspector_name, t.inspections, t.km.toLocaleString("en-ZA"), t.hours]),
      margin: { left: ML, right: MR },
      styles: { fontSize: 7.5, cellPadding: 2.2, textColor: DARK },
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } },
      didParseCell: (h: any) => {
        if (h.section === "head" && h.column.index > 0) h.cell.styles.halign = "center";
        if (h.section !== "body") return;
        if (h.column.index === 0) h.cell.styles.fontStyle = "bold";
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  /* ── 2. Samples ── */
  sectionPage();
  header("2. Sample Tracking");
  doc.setTextColor(...DARK); doc.setFontSize(8.5);
  doc.text(`Status: ${data.sample_status.completed} completed (COA received)  ·  ${data.sample_status.waiting} waiting  ·  ${data.sample_status.overdue} overdue (> ${data.sample_overdue_days} days)`, ML, y + 2);
  y += 6;
  drawDoughnut([
    { label: "Completed (COA received)", value: data.sample_status.completed, color: GREEN },
    { label: "Waiting for results", value: data.sample_status.waiting, color: AMBER },
    { label: `Overdue (> ${data.sample_overdue_days} days)`, value: data.sample_status.overdue, color: RED },
  ]);
  doc.setTextColor(...GRAY); doc.setFontSize(7.5);
  doc.text(`"Result Back" — the laboratory certificate (COA) has been received and uploaded for the sample.`, ML, y);
  doc.text(`"Still Waiting" — the sample is on its way to the laboratory or is still being tested.`, ML, y + 4);
  doc.text(`"No Sample Taken" — the inspection was completed without collecting a sample.`, ML, y + 8);
  y += 11;
  autoTable(doc, {
    startY: y + 1,
    head: [["Rank", "Inspector", "Inspections", "Samples Taken", "No Sample Taken", "Result Back", "Still Waiting", `Waiting > ${data.sample_overdue_days} Days`]],
    body: data.samples.map(s => [s.rank, s.inspector_name, s.inspections ?? "-", s.taken, s.no_sample ?? "-", s.completed, s.waiting, s.overdue]),
    margin: { left: ML, right: MR },
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: DARK },
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" },
      4: { halign: "center" }, 5: { halign: "center" }, 6: { halign: "center" }, 7: { halign: "center" },
    },
    didParseCell: (h: any) => {
      if (h.section === "head" && h.column.index === 1) h.cell.styles.halign = "left";
      if (h.section !== "body") return;
      const raw = String(h.cell.raw);
      if (h.column.index === 1) h.cell.styles.fontStyle = "bold";
      if (h.column.index === 3) h.cell.styles.fontStyle = "bold";
      if (h.column.index === 4) { h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = raw !== "0" ? AMBER : GRAY; }
      if (h.column.index === 5 && raw !== "0") h.cell.styles.textColor = GREEN;
      if (h.column.index === 7 && raw !== "0") { h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = RED; }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (data.outstanding_samples.length) {
    // Grouped per inspector — one row per person to phone, not a long flat list
    const groups = new Map<string, { count: number; maxDays: number; clients: string[] }>();
    data.outstanding_samples.forEach(s => {
      const g = groups.get(s.inspector_name) || { count: 0, maxDays: 0, clients: [] };
      g.count += 1;
      g.maxDays = Math.max(g.maxDays, s.age_days);
      if (!g.clients.includes(s.client_name)) g.clients.push(s.client_name);
      groups.set(s.inspector_name, g);
    });
    const grouped = [...groups.entries()].sort((a, b) => b[1].maxDays - a[1].maxDays || b[1].count - a[1].count);
    // Keep the whole table together so its header never repeats across a page split
    needPage(Math.min(18 + grouped.length * 12, 250));
    doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Samples awaiting laboratory results", ML, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY); doc.setFontSize(7.5);
    doc.text(`A sample normally waits a few days while it travels to the laboratory and is tested. A row in red has a sample waiting longer than ${data.sample_overdue_days} days.`, ML, y + 4.5);
    y += 6.5;
    autoTable(doc, {
      startY: y + 1,
      head: [["Inspector", "Samples Waiting", "Longest Waiting", "Clients"]],
      body: grouped.map(([name, g]) => [name, g.count, `${g.maxDays} days`, g.clients.join(", ")]),
      rowPageBreak: "avoid",
      margin: { left: ML, right: MR },
      styles: { fontSize: 7.5, cellPadding: 2.2, textColor: DARK, valign: "middle" },
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 34, fontStyle: "bold" },
        1: { cellWidth: 24, halign: "center" },
        2: { cellWidth: 24, halign: "center" },
      },
      didParseCell: (h: any) => {
        if (h.section === "head" && (h.column.index === 1 || h.column.index === 2)) h.cell.styles.halign = "center";
        if (h.section !== "body") return;
        const g = grouped[h.row.index]?.[1];
        if (g && g.maxDays > data.sample_overdue_days) h.cell.styles.textColor = RED;
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  /* ── 3. Approvals ── */
  sectionPage();
  header("3. Approval versus Capturing");
  doc.setTextColor(...GRAY); doc.setFontSize(7.5);
  doc.text(`Green = approved, or captured within ${data.admin_lag_days} days of the inspection. Red = still waiting for office approval, or captured later than ${data.admin_lag_days} days.`, ML, y);
  y += 4;
  autoTable(doc, {
    startY: y + 1,
    head: [["Rank", "Inspector", "Inspections", `Captured Within ${data.admin_lag_days} Days`, "Approved", "Waiting Approval"]],
    body: data.approvals.map(a => [a.rank, a.inspector_name, a.total_records, a.captured_on_time, a.approved, a.pending]),
    margin: { left: ML, right: MR },
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: DARK },
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" } },
    didParseCell: (h: any) => {
      if (h.section === "head" && h.column.index !== 1) h.cell.styles.halign = "center";
      if (h.section !== "body") return;
      const a = data.approvals[h.row.index];
      if (!a) return;
      const raw = String(h.cell.raw);
      if (h.column.index === 1) h.cell.styles.fontStyle = "bold";
      if (h.column.index === 3) {
        h.cell.styles.fontStyle = "bold";
        const ratio = a.total_records > 0 ? a.captured_on_time / a.total_records : 0;
        h.cell.styles.textColor = ratio >= 0.9 ? GREEN : ratio >= 0.5 ? AMBER : RED;
      }
      if (h.column.index === 4 && raw !== "0") { h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = GREEN; }
      if (h.column.index === 5) { h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = raw !== "0" ? RED : GRAY; }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  /* ── 4. Compliance ── */
  sectionPage();
  header("4. Weekly Compliance");
  doc.setTextColor(...DARK); doc.setFontSize(8.5);
  doc.text("% Compliant counts EVERY inspection the inspector did this week — all commodities. An inspection with no recorded", ML, y + 1);
  doc.text("outcome cannot count as compliant, so missing outcomes pull the percentage down. Exact to one decimal.", ML, y + 5.5);
  y += 10;
  const compTotals = data.compliance.reduce(
    (t, c) => ({ insp: t.insp + (c.inspections ?? 0), c: t.c + c.compliant, nc: t.nc + c.non_compliant, na: t.na + (c.not_assessed ?? 0) }),
    { insp: 0, c: 0, nc: 0, na: 0 },
  );
  const compTotalRate = compTotals.insp > 0 ? Math.round((compTotals.c * 100 / compTotals.insp) * 10) / 10 : 0;
  autoTable(doc, {
    startY: y + 1,
    head: [["Rank", "Inspector", "Inspections", "Compliant", "Non-Compliant", "No Outcome Recorded", "% Compliant"]],
    body: data.compliance.map(c => [c.rank, c.inspector_name, c.inspections ?? (c.compliant + c.non_compliant), c.compliant, c.non_compliant, c.not_assessed ?? 0, `${c.rate}%`]),
    foot: [["", "Whole team — grand total", compTotals.insp, compTotals.c, compTotals.nc, compTotals.na, `${compTotalRate}%`]],
    margin: { left: ML, right: MR },
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: DARK },
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
    footStyles: { fillColor: DARK, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" },
      5: { halign: "center" }, 6: { halign: "center" },
    },
    didParseCell: (h: any) => {
      if (h.section !== "body") {
        if (h.column.index !== 1) h.cell.styles.halign = "center";
        return;
      }
      const raw = String(h.cell.raw);
      if (h.column.index === 1) h.cell.styles.fontStyle = "bold";
      if (h.column.index === 3 && raw !== "0") h.cell.styles.textColor = GREEN;
      if (h.column.index === 4 && raw !== "0") h.cell.styles.textColor = RED;
      if (h.column.index === 5 && raw !== "0") { h.cell.styles.textColor = AMBER; h.cell.styles.fontStyle = "bold"; }
      if (h.column.index === 6) h.cell.styles.fontStyle = "bold";
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  /* Compliance per commodity — ONE table: inspectors down the side, one
     column per commodity, each cell = % compliant (compliant / inspections) */
  const comms = (data.commodity_compliance ?? []).filter(c => (c.inspectors ?? []).length > 0);
  if (comms.length > 0) {
    type CellData = { n: number; c: number; nc: number; rate: number } | null;
    const dataFor = (name: string, colIdx: number): CellData => {
      if (colIdx < comms.length) {
        const p = (comms[colIdx].inspectors ?? []).find(x => x.inspector_name === name);
        return p ? { n: p.inspections, c: p.compliant, nc: p.non_compliant, rate: p.rate } : null;
      }
      let n = 0, c = 0, nc = 0;
      comms.forEach(cm => {
        const p = (cm.inspectors ?? []).find(x => x.inspector_name === name);
        if (p) { n += p.inspections; c += p.compliant; nc += p.non_compliant; }
      });
      return n > 0 ? { n, c, nc, rate: Math.round((c * 100 / n) * 10) / 10 } : null;
    };
    const cellText = (d: CellData) => {
      if (!d || d.n === 0) return "0";
      if (d.c === 0 && d.nc === 0) return "no outcomes";
      return `${d.rate}%`;
    };
    const teamCombined = comms.reduce((t, c) => ({ n: t.n + c.inspections, c: t.c + c.compliant }), { n: 0, c: 0 });
    const teamCombinedRate = teamCombined.n > 0 ? Math.round((teamCombined.c * 100 / teamCombined.n) * 10) / 10 : 0;
    needPage(50);
    doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Compliance per commodity:", ML, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY); doc.setFontSize(7.5);
    doc.text(`Each cell shows the % compliant for that commodity. "0" = no inspections of that commodity.`, ML, y + 4.5);
    doc.text(`"no outcomes" = the inspections were done, but no compliant / non-compliant outcome has been captured for them yet.`, ML, y + 8.5);
    doc.text(`Green = 75% or better. Orange = 50% to 74.9%. Red = below 50%, or no outcomes captured yet.`, ML, y + 12.5);
    y += 15;
    autoTable(doc, {
      startY: y + 1,
      head: [["Inspector", ...comms.map(c => c.commodity), "All Commodities Combined"]],
      body: data.compliance.map(ci => [
        ci.inspector_name,
        ...comms.map((c, i) => cellText(dataFor(ci.inspector_name, i))),
        cellText(dataFor(ci.inspector_name, comms.length)),
      ]),
      foot: [["Whole team", ...comms.map(c => `${c.rate}%`), `${teamCombinedRate}%`]],
      rowPageBreak: "avoid",
      margin: { left: ML, right: MR },
      styles: { fontSize: 7, cellPadding: 2, textColor: DARK },
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
      footStyles: { fillColor: DARK, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (h: any) => {
        if (h.column.index !== 0) h.cell.styles.halign = "center";
        if (h.section !== "body") return;
        if (h.column.index === 0) { h.cell.styles.fontStyle = "bold"; return; }
        const ci = data.compliance[h.row.index];
        if (!ci) return;
        const d = dataFor(ci.inspector_name, h.column.index - 1);
        if (!d || d.n === 0) { h.cell.styles.textColor = GRAY; return; }
        if (d.c === 0 && d.nc === 0) { h.cell.styles.fillColor = [254, 226, 226]; h.cell.styles.textColor = RED; return; }
        h.cell.styles.fontStyle = "bold";
        if (d.rate >= 75) { h.cell.styles.fillColor = [220, 252, 231]; h.cell.styles.textColor = GREEN; }
        else if (d.rate >= 50) { h.cell.styles.fillColor = [254, 243, 199]; h.cell.styles.textColor = AMBER; }
        else { h.cell.styles.fillColor = [254, 226, 226]; h.cell.styles.textColor = RED; }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  /* ── 5. Travel ── */
  sectionPage();
  header("5. Travel Activity");
  autoTable(doc, {
    startY: y + 1,
    head: [["Rank", "Inspector", "KM Travelled", "Hours on the Road", "Inspections", "KM per Inspection (Rough Estimate)"]],
    body: data.travel.map(v => [v.rank, v.inspector_name, v.km.toLocaleString("en-ZA"), v.hours, v.inspections, v.avg_km_per_inspection]),
    foot: [["", "Whole team — grand total", data.totals.total_km.toLocaleString("en-ZA"), data.totals.total_hours, data.travel.reduce((s, v) => s + v.inspections, 0), ""]],
    rowPageBreak: "avoid",
    margin: { left: ML, right: MR },
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: DARK },
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
    footStyles: { fillColor: DARK, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" } },
    didParseCell: (h: any) => {
      if (h.section !== "body") {
        if (h.column.index !== 1) h.cell.styles.halign = "center";
        return;
      }
      // Podium — gold, silver, bronze tints for the top three travellers
      if (h.row.index === 0) h.cell.styles.fillColor = [254, 243, 199];
      else if (h.row.index === 1) h.cell.styles.fillColor = [226, 232, 240];
      else if (h.row.index === 2) h.cell.styles.fillColor = [255, 237, 213];
      if (h.column.index === 0) { h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = TEAL; }
      if (h.column.index === 1) h.cell.styles.fontStyle = "bold";
      if (h.column.index === 2) h.cell.styles.fontStyle = "bold";
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  /* ══ 6. ADMINISTRATION & THROUGHPUT — what the office actually got through
     this period vs the previous one: reports sent, invoices and COAs uploaded,
     who sent the most, and the average capture->invoice-upload time. Counted by
     when each action happened. Timing only; no invoice amounts. ══ */
  const tp = data.throughput;
  if (tp) {
    sectionPage();
    header("6. Administration & Throughput");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      "How much the office got done in the last completed week (Monday to Sunday), next to the week before it. \"Change\" is the difference between the two weeks. How long invoices take to upload is shown separately, in the Turnaround Times section.",
      ML, y, { maxWidth: CW });
    y += 9;
    const mvCount = (n: number) => n === 0 ? "no change" : n > 0 ? `${n} more` : `${n} fewer`;
    autoTable(doc, {
      startY: y,
      head: [["Measure", "This Week", "Week Before", "Change vs the Week Before"]],
      body: [
        ["Inspection documents sent to clients", String(tp.sent.count), String(tp.sent.prev), mvCount(tp.sent.count - tp.sent.prev)],
        ["Invoices uploaded", String(tp.invoices_uploaded.count), String(tp.invoices_uploaded.prev), mvCount(tp.invoices_uploaded.count - tp.invoices_uploaded.prev)],
        ["COAs uploaded", String(tp.coas_uploaded.count), String(tp.coas_uploaded.prev), mvCount(tp.coas_uploaded.count - tp.coas_uploaded.prev)],
      ],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: ML, right: MR },
      didParseCell: (d: any) => {
        if (d.section === "body" && d.column.index === 3) {
          const t = String(d.cell.raw || "");
          if (t.includes("more")) d.cell.styles.textColor = GREEN;
          else if (t.includes("fewer")) d.cell.styles.textColor = RED;
          d.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    if (tp.top_senders && tp.top_senders.length > 0) {
      needPage(16 + tp.top_senders.length * 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text("Who sent the most documents to clients (last completed week)", ML, y);
      y += 1;
      autoTable(doc, {
        startY: y + 1,
        head: [["Rank", "Sent by", "This Week", "Week Before", "Change vs the Week Before"]],
        body: tp.top_senders.map((s, i) => {
          const diff = s.count - s.prev;
          const chg = diff === 0 ? "no change" : diff > 0 ? `${diff} more` : `${diff} fewer`;
          return [String(i + 1), s.name, String(s.count), String(s.prev), chg];
        }),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        columnStyles: { 0: { halign: "center", cellWidth: 16 }, 2: { halign: "right" }, 3: { halign: "right" } },
        margin: { left: ML, right: MR },
        didParseCell: (d: any) => {
          if (d.section === "body" && d.column.index === 0) {
            d.cell.styles.fontStyle = "bold"; d.cell.styles.textColor = TEAL;
          }
          if (d.section === "body" && d.column.index === 4) {
            const t = String(d.cell.raw || "");
            if (t.includes("more")) d.cell.styles.textColor = GREEN;
            else if (t.includes("fewer")) d.cell.styles.textColor = RED;
            d.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  /* ══ 7. TURNAROUND TIMES — how long work sits at each back-office stage, and
     which direction it is moving. Placed last. Timing only; no invoice amounts.
     "Change" compares the last completed week with the week before it. Empty
     cells are filled with a short reason rather than left blank. ══ */
  const TURN_ORDER = ["send_docs", "invoice", "sample_to_coa", "approval"];
  const turnRows = TURN_ORDER
    .map(k => ({ key: k, ...(data.turnaround || {})[k] }))
    .filter(r => r.label && r.avg !== null && r.avg !== undefined);
  if (turnRows.length > 0) {
    sectionPage();
    header("7. Turnaround Times");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      "The average number of days each step took for last week's inspections. \"Change\" compares that with the week before: fewer days (green) means the step is getting faster; more days (red) means it is slowing down.",
      ML, y, { maxWidth: CW });
    y += 9;
    let _anyNoTarget = false;
    const change = (r: { avg?: number | null; prev_avg?: number | null; count?: number }) => {
      if (r.prev_avg === null || r.prev_avg === undefined) {
        // Explain WHY there is nothing to compare, rather than leaving it blank.
        return r.count ? "no figure the week before" : "no data either week";
      }
      const diff = Math.round(((r.avg as number) - (r.prev_avg as number)) * 10) / 10;
      if (diff === 0) return "no change";
      return diff < 0 ? `${Math.abs(diff)} days faster` : `${diff} days slower`;
    };
    autoTable(doc, {
      startY: y,
      head: [["Stage", "This Week (avg days)", "Week Before (avg days)", "Target", "Jobs", "Change vs the Week Before"]],
      body: turnRows.map(r => {
        let target: string;
        if (r.target === null || r.target === undefined) { target = "not set"; _anyNoTarget = true; }
        else target = `${r.target} days`;
        const prev = (r.prev_avg === null || r.prev_avg === undefined) ? "no data" : String(r.prev_avg);
        return [r.label as string, String(r.avg), prev, target, String(r.count), change(r)];
      }),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      margin: { left: ML, right: MR },
      didParseCell: (d: any) => {
        const GREEN_BG: [number, number, number] = [220, 252, 231];
        const RED_BG: [number, number, number] = [254, 226, 226];
        // This Week avg: shade green when at/under target, red when over —
        // a colour block reads faster than a number. Neutral if no target.
        if (d.section === "body" && d.column.index === 1) {
          const row = turnRows[d.row.index];
          if (row.target !== null && row.target !== undefined) {
            d.cell.styles.fillColor = (row.avg as number) > (row.target as number) ? RED_BG : GREEN_BG;
          }
          d.cell.styles.fontStyle = "bold";
        }
        if (d.section === "body" && d.column.index === 3 && String(d.cell.raw) === "not set") {
          d.cell.styles.textColor = GRAY; d.cell.styles.fontStyle = "italic";
        }
        // Change: shade green when the step got faster, red when slower.
        if (d.section === "body" && d.column.index === 5) {
          const t = String(d.cell.raw || "");
          if (t.includes("faster")) d.cell.styles.fillColor = GREEN_BG;
          else if (t.includes("slower")) d.cell.styles.fillColor = RED_BG;
          d.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
    if (_anyNoTarget) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(
        "\"not set\" means no target has been agreed for that step yet. \"Capture to invoice uploaded\" is the average for invoices uploaded during the week. We don't show a separate \"documents sent to invoice\" time because invoices are usually uploaded before, or without, a recorded send date — so that figure would be empty.",
        ML, y, { maxWidth: CW });
      doc.setFont("helvetica", "normal");
      y = y + 10;
    }
  }

  /* ── Footer on every page ── */
  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) { // cover page stays clean
    doc.setPage(i);
    doc.setTextColor(...GRAY); doc.setFontSize(7);
    doc.text(`Food Safety Agency — Weekly Inspectorate Performance Report · ${periodLabel}`, ML, 292);
    doc.text(`Page ${i - 1} of ${pages - 1}`, W - MR, 292, { align: "right" });
  }

  return doc;
}

/* ── Personal report for ONE inspector — only their own numbers ──────────── */
export async function buildInspectorReportPdf(data: ReportResponse, inspectorName: string, logo: string | null): Promise<any> {
  const jsPDFModule: any = await import("jspdf");
  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
  const autoTableModule: any = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule.autoTable || autoTableModule;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, ML = 14, MR = 14, CW = W - ML - MR;
  const TEAL: [number, number, number] = [0, 120, 144];
  const DARK: [number, number, number] = [17, 24, 39];
  const GRAY: [number, number, number] = [107, 114, 128];
  const GREEN: [number, number, number] = [21, 128, 61];
  const RED: [number, number, number] = [220, 38, 38];
  const AMBER: [number, number, number] = [217, 119, 6];
  const BLUE: [number, number, number] = [37, 99, 235];

  const HAIR: [number, number, number] = [243, 244, 246];
  const low = inspectorName.trim().toLowerCase();
  const byName = <T extends { inspector_name: string }>(rows: T[]): T | undefined =>
    rows.find(r => r.inspector_name.trim().toLowerCase() === low);
  const detail = data.inspector_detail && data.inspector_detail.name.trim().toLowerCase() === low
    ? data.inspector_detail : null;
  const dayLabel = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" });
  const perf = byName(data.performance);
  const samp = byName(data.samples);
  const appr = byName(data.approvals);
  const comp = byName(data.compliance);
  const trav = byName(data.travel);
  const myOutstanding = data.outstanding_samples.filter(s => s.inspector_name.trim().toLowerCase() === low);
  const myOccurrences = data.occurrence_detail.filter(o => o.inspector_name.trim().toLowerCase() === low);

  const periodLabel = data.is_single_week
    ? `Monday ${fmtDate(data.week_start)} — Sunday ${fmtDate(data.week_end)}`
    : `${fmtDate(data.week_start)} — ${fmtDate(data.week_end)}`;

  let y = 0;

  /* ══ PAGE 1: COVER — same design as the other FSA reports ══ */
  const H = 297;
  const GRAY_LIGHT: [number, number, number] = [156, 163, 175];
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.8);
  doc.line(ML, 42, W - MR, 42);
  doc.line(ML, H - 62, W - MR, H - 62);
  if (logo) { try { doc.addImage(logo, "PNG", W / 2 - 18, 58, 36, 32); } catch { /* skip */ } }
  const logoBottom = logo ? 102 : 80;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("FOOD SAFETY AGENCY (PTY) LTD", W / 2, logoBottom, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(...TEAL);
  doc.text("Your Weekly Performance Report", W / 2, logoBottom + 11, { align: "center" });
  doc.setFillColor(...TEAL);
  doc.rect(W / 2 - 30, logoBottom + 16.5, 60, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(inspectorName, W / 2, logoBottom + 28, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GRAY_LIGHT);
  doc.text(periodLabel, W / 2, logoBottom + 37, { align: "center" });
  doc.setFontSize(10);
  doc.text(data.quarter, W / 2, logoBottom + 44, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("This report is about YOUR work only. It contains no financial information.", W / 2, logoBottom + 53, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text("IN THIS REPORT", W / 2, logoBottom + 68, { align: "center" });
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY_LIGHT);
  [
    "1. Your week at a glance",
    "2. The race — where everyone stands",
    "3. Your inspections",
    "4. Your capturing and approvals",
    "5. Your compliance results",
    "6. Your samples",
    "7. Your occurrence reports",
    "8. Your travel",
  ].forEach((s, i) => {
    doc.text(s, W / 2, logoBottom + 76 + i * 7, { align: "center" });
  });
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("CONFIDENTIAL — For you and management only", W / 2, H - 42, { align: "center" });

  /* ══ PAGE 2: YOUR WEEK AT A GLANCE ══ */
  doc.addPage();
  y = 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text("1. Your week at a glance", ML, y);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.7);
  doc.line(ML, y + 2.5, ML + 70, y + 2.5);
  doc.setFont("helvetica", "normal");
  y += 12;

  /* KPI cards — this inspector only */
  const card = (x: number, cy: number, w: number, h: number, label: string, value: string, color: [number, number, number]) => {
    doc.setFillColor(246, 248, 250);
    doc.roundedRect(x, cy, w, h, 2, 2, "F");
    doc.setFillColor(...color);
    doc.rect(x, cy, w, 2.2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...color);
    doc.text(value, x + w / 2, cy + h / 2 + 1, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.setTextColor(...GRAY);
    doc.text(doc.splitTextToSize(label.toUpperCase(), w - 5), x + w / 2, cy + h / 2 + 8, { align: "center" });
  };
  const gap = 5, w3 = (CW - 2 * gap) / 3, cardH = 28;
  const compColor: [number, number, number] = comp ? (comp.rate >= 70 ? GREEN : AMBER) : GRAY;
  card(ML, y, w3, cardH, "Inspections this week", String(perf?.weekly_inspections ?? 0), TEAL);
  card(ML + w3 + gap, y, w3, cardH, `Your rank (of ${data.performance.length} inspectors)`, perf ? `#${perf.rank}` : "—", BLUE);
  card(ML + 2 * (w3 + gap), y, w3, cardH, "Compliance rate", comp ? `${comp.rate}%` : "—", compColor);
  y += cardH + gap;
  card(ML, y, w3, cardH, "Samples taken", String(samp?.taken ?? 0), AMBER);
  card(ML + w3 + gap, y, w3, cardH, "Kilometres travelled", trav ? trav.km.toLocaleString("en-ZA") : "0", TEAL);
  card(ML + 2 * (w3 + gap), y, w3, cardH, "Hours on the road", trav ? String(trav.hours) : "0", BLUE);
  y += cardH + 12;

  const needPage = (space: number) => { if (y + space > 283) { doc.addPage(); y = 16; } };
  const sectionTitle = (txt: string) => {
    needPage(20);
    doc.setFillColor(...TEAL);
    doc.rect(ML, y, CW, 8, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(txt, ML + 3, y + 5.5);
    doc.setFont("helvetica", "normal");
    y += 12;
  };
  const table = (head: string[], body: (string | number)[][], redRows: number[] = []) => {
    autoTable(doc, {
      startY: y, head: [head], body,
      margin: { left: ML, right: MR },
      styles: { fontSize: 8, cellPadding: 2.2, textColor: DARK },
      headStyles: { fillColor: [241, 245, 249], textColor: DARK, fontSize: 8, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 251, 253] },
      didParseCell: (h: any) => {
        if (h.section === "body" && redRows.includes(h.row.index)) h.cell.styles.textColor = RED;
      },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  };
  const factRows = (rows: [string, string][]) => {
    autoTable(doc, {
      startY: y, body: rows,
      margin: { left: ML, right: MR },
      styles: { fontSize: 8.5, cellPadding: 2, textColor: DARK },
      alternateRowStyles: { fillColor: [250, 251, 253] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 85 } },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  };

  /* The race — full standings, stock-market style */
  sectionTitle("2. The race — who did the most inspections this week");
  doc.setTextColor(...GRAY); doc.setFontSize(8.5);
  doc.text("Position 1 did the most inspections this week. The last column shows how many more (green) or fewer (red)", ML, y);
  doc.text("inspections each person did compared with last week. Your row is highlighted.", ML, y + 4);
  y += 9;
  const myIdx = data.performance.findIndex(p => p.inspector_name.trim().toLowerCase() === low);
  autoTable(doc, {
    startY: y,
    head: [["Position", "Inspector", "Inspections This Week", "Inspections Last Week", "More or Fewer"]],
    body: data.performance.map(p => {
      const diff = p.weekly_inspections - (p.prev_inspections ?? 0);
      return [
        `#${p.rank}`, p.inspector_name, p.weekly_inspections, p.prev_inspections ?? 0,
        diff > 0 ? `+${diff}` : String(diff),
      ];
    }),
    margin: { left: ML, right: MR },
    styles: { fontSize: 8, cellPadding: 2.2, textColor: DARK },
    headStyles: { fillColor: [241, 245, 249], textColor: DARK, fontSize: 8, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    didParseCell: (h: any) => {
      if (h.section !== "body") return;
      if (h.row.index === myIdx) {
        h.cell.styles.fillColor = [230, 247, 249];
        h.cell.styles.fontStyle = "bold";
      }
      if (h.column.index === 4) {
        const v = String(h.cell.raw);
        if (v.startsWith("+")) h.cell.styles.textColor = GREEN;
        else if (v.startsWith("-")) h.cell.styles.textColor = RED;
        h.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  /* Your inspections */
  sectionTitle("3. Your inspections");
  factRows([
    ["Inspections you did this week", String(perf?.weekly_inspections ?? 0)],
    ["Your total for this quarter so far", String(perf?.cumulative_inspections ?? 0)],
    ["Your target for this quarter", perf?.quarter_target ? String(perf.quarter_target) : "No target set yet"],
    ["How much of your target is done", perf?.target_pct === null || !perf ? "—" : `${perf.target_pct}%`],
  ]);

  /* Day-by-day bars */
  if (detail && detail.daily.length > 0 && detail.daily.length <= 14) {
    needPage(48);
    doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Your inspections day by day:", ML, y);
    doc.setFont("helvetica", "normal");
    y += 6;
    const maxC = Math.max(...detail.daily.map(d => d.count), 1);
    const n = detail.daily.length;
    const bw = Math.min(20, (CW - (n - 1) * 6) / n);
    const gap2 = (CW - n * bw) / Math.max(n - 1, 1);
    const chartH = 24, baseY = y + chartH + 4;
    detail.daily.forEach((d, i) => {
      const x = ML + i * (bw + gap2);
      doc.setFillColor(...HAIR);
      doc.roundedRect(x, y + 4, bw, chartH, 1, 1, "F");
      const h = Math.max((d.count / maxC) * chartH, d.count > 0 ? 1.2 : 0);
      if (h > 0) { doc.setFillColor(...TEAL); doc.roundedRect(x, baseY - h, bw, h, 1, 1, "F"); }
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.6); doc.setTextColor(...DARK);
      doc.text(String(d.count), x + bw / 2, y + 1.5, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.4); doc.setTextColor(...GRAY);
      doc.text(dayLabel(d.date), x + bw / 2, baseY + 4.5, { align: "center" });
    });
    y = baseY + 11;
  }

  /* Full list of the week's inspections */
  if (detail && detail.inspections.length > 0) {
    needPage(36);
    doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Every inspection you did this week:", ML, y);
    doc.setFont("helvetica", "normal");
    y += 4;
    table(
      ["Date", "Client", "Commodity", "Approved?"],
      detail.inspections.map(r => [
        fmtDate(r.date), r.client, r.commodity, r.approved ? "Yes" : "Waiting",
      ]),
    );
  }

  /* Capturing & approvals */
  sectionTitle("4. Your capturing and approvals");
  factRows([
    ["Inspections you captured", String(appr?.total_records ?? 0)],
    [`Captured on time (within ${data.admin_lag_days} days)`, appr ? `${appr.captured_on_time} (${appr.capture_rate}%)` : "0"],
    ["Approved by the office", String(appr?.approved ?? 0)],
    ["Still waiting for approval", String(appr?.pending ?? 0)],
  ]);

  /* Compliance */
  sectionTitle("5. Your compliance results");
  factRows([
    ["Products that passed (compliant)", String(comp?.compliant ?? 0)],
    ["Products that failed (non-compliant)", String(comp?.non_compliant ?? 0)],
    ["Inspections with no outcome recorded yet", String(comp?.not_assessed ?? 0)],
    ["Your pass rate — out of ALL your inspections", comp ? `${comp.rate}%` : "No recorded results this week"],
    ["Compared to last week", comp?.change === null || !comp ? "—" : `${comp.change > 0 ? `${comp.change}pt better` : `${Math.abs(comp.change)}pt worse`}`],
  ]);

  /* Samples */
  sectionTitle("6. Your samples");
  factRows([
    ["Samples you took", String(samp?.taken ?? 0)],
    ["Results back from the lab", String(samp?.completed ?? 0)],
    ["Still waiting for results", String(samp?.waiting ?? 0)],
    [`Waiting more than ${data.sample_overdue_days} days — needs follow-up`, String(samp?.overdue ?? 0)],
  ]);
  const mySamples = detail ? detail.inspections.filter(r => r.sample_taken) : [];
  if (mySamples.length > 0) {
    needPage(30);
    doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("The samples you took this week:", ML, y);
    doc.setFont("helvetica", "normal");
    y += 4;
    table(
      ["Date", "Client", "Commodity", "Lab result back?"],
      mySamples.map(r => [fmtDate(r.date), r.client, r.commodity, r.sample_result_back ? "Yes" : "Not yet"]),
    );
  }
  if (myOutstanding.length) {
    needPage(30);
    doc.setTextColor(...RED); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("These samples of yours have no lab result yet — please follow them up:", ML, y);
    doc.setFont("helvetica", "normal");
    y += 4;
    table(
      ["Client", "Commodity", "Sample Date", "Days Waiting"],
      myOutstanding.map(s => [s.client_name, s.commodity, fmtDate(s.sample_date), s.age_days]),
      myOutstanding.map((s, i) => s.overdue ? i : -1).filter(i => i >= 0),
    );
  }

  /* Occurrences */
  sectionTitle("7. Your occurrence reports");
  factRows([
    ["Occurrence reports you submitted", String(myOccurrences.length)],
    ["Out of inspections you did", String(perf?.weekly_inspections ?? 0)],
  ]);
  if (myOccurrences.length === 0) {
    doc.setTextColor(...GRAY); doc.setFontSize(9);
    doc.text("You submitted no occurrence reports this week.", ML, y);
    y += 10;
  } else {
    table(
      ["Facility", "Area", "Status", "Inspection Date", "Submitted On"],
      myOccurrences.map(o => [o.client_name, o.town || "-", o.status, fmtDate(o.date_of_inspection), fmtDate(o.submitted)]),
    );
  }

  /* Travel */
  sectionTitle("8. Your travel");
  factRows([
    ["Kilometres you travelled", trav ? trav.km.toLocaleString("en-ZA") : "0"],
    ["Hours on the road", trav ? String(trav.hours) : "0"],
    ["Kilometres per inspection", trav ? String(trav.avg_km_per_inspection) : "—"],
    ["New clients you found", String(trav?.new_facilities ?? 0)],
  ]);

  /* Footer — cover page stays clean */
  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(...GRAY); doc.setFontSize(7);
    doc.text(`Food Safety Agency — Weekly Performance Report · ${inspectorName} · ${periodLabel}`, ML, 292);
    doc.text(`Page ${i - 1} of ${pages - 1}`, W - MR, 292, { align: "right" });
  }

  return doc;
}
