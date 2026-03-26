"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface LabData {
  total_samples:      number;
  total_inspections:  number;
  needs_coa:          number;
  needs_retest:       number;
  total_tests:        number;
  fat_count:          number;
  protein_count:      number;
  calcium_count:      number;
  dna_count:          number;
  labs:           { lab: string; n: number }[];
  commodities:    { commodity: string; n: number }[];
  monthly:        { month: string; count: number }[];
  recent:         {
    client_name:  string;
    product_name: string;
    commodity:    string;
    lab:          string;
    needs_retest: string;
    tests:        string[];
    date:         string;
  }[];
}

const COMMODITY_LABEL: Record<string, string> = {
  RAW:     "Raw Meat",
  PMP:     "PMP (Processed)",
  POULTRY: "Poultry",
  EGGS:    "Eggs",
};

const COMMODITY_COLOR: Record<string, string> = {
  RAW:     "#ef4444",
  PMP:     "#f97316",
  POULTRY: "#eab308",
  EGGS:    "#84cc16",
};

const TEST_CONFIG = [
  { key: "fat_count",     label: "Fat",     color: "#3b82f6", icon: "fa-tint"     },
  { key: "protein_count", label: "Protein", color: "#8b5cf6", icon: "fa-dna"      },
  { key: "calcium_count", label: "Calcium", color: "#10b981", icon: "fa-atom"     },
  { key: "dna_count",     label: "DNA",     color: "#f59e0b", icon: "fa-dna"      },
] as const;

function Spinner() {
  return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", border: "4px solid rgba(0,120,144,0.2)", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
  );
}

function StatCard({ label, value, icon, color, borderColor, loading }: { label: string; value: number; icon: string; color: string; borderColor: string; loading: boolean }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 8,
      padding: "12px 14px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      border: "1px solid #e5e7eb",
      borderLeft: `3px solid ${borderColor}`,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: `${color}12`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <i className={`fas ${icon}`} style={{ fontSize: "0.85rem", color }} />
      </div>
      <div>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", lineHeight: 1, marginBottom: 2 }}>
          {loading ? <Spinner /> : value.toLocaleString()}
        </div>
        <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      </div>
    </div>
  );
}

export default function LabAnalyticsPage() {
  const [rawData, setRawData] = useState<LabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [labFilter, setLabFilter] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("");

  useEffect(() => {
    fetch("/api/lab-analytics")
      .then(r => r.json())
      .then(d => {
        if (d.success) setRawData(d);
        else setError(d.error || "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  // Client-side filtering
  const data = rawData ? (() => {
    let recent = rawData.recent;
    if (dateFrom) recent = recent.filter(r => r.date >= dateFrom);
    if (dateTo) recent = recent.filter(r => r.date <= dateTo);
    if (labFilter) recent = recent.filter(r => r.lab === labFilter);
    if (commodityFilter) recent = recent.filter(r => r.commodity === commodityFilter);

    const hasFilter = dateFrom || dateTo || labFilter || commodityFilter;
    if (!hasFilter) return rawData;

    // Recompute stats from filtered recent
    const total_samples = recent.length;
    const fat_count = recent.filter(r => (r.tests || []).includes("fat") || (r.tests || []).includes("FAT")).length;
    const protein_count = recent.filter(r => (r.tests || []).includes("protein") || (r.tests || []).includes("PROTEIN")).length;
    const calcium_count = recent.filter(r => (r.tests || []).includes("calcium") || (r.tests || []).includes("CALCIUM")).length;
    const dna_count = recent.filter(r => (r.tests || []).includes("dna") || (r.tests || []).includes("DNA")).length;
    const needs_retest = recent.filter(r => r.needs_retest === "Yes" || r.needs_retest === "YES").length;
    const total_tests = fat_count + protein_count + calcium_count + dna_count;

    // Recalculate labs
    const labCounts: Record<string, number> = {};
    recent.forEach(r => { if (r.lab) labCounts[r.lab] = (labCounts[r.lab] || 0) + 1; });
    const labs = Object.entries(labCounts).map(([lab, n]) => ({ lab, n })).sort((a, b) => b.n - a.n);

    // Recalculate commodities
    const comCounts: Record<string, number> = {};
    recent.forEach(r => { if (r.commodity) comCounts[r.commodity] = (comCounts[r.commodity] || 0) + 1; });
    const commodities = Object.entries(comCounts).map(([commodity, n]) => ({ commodity, n })).sort((a, b) => b.n - a.n);

    return {
      ...rawData,
      total_samples,
      total_tests,
      fat_count,
      protein_count,
      calcium_count,
      dna_count,
      needs_retest,
      labs,
      commodities,
      recent,
    };
  })() : null;

  const handleReset = () => { setDateFrom(""); setDateTo(""); setLabFilter(""); setCommodityFilter(""); };

  const handleExtractExcel = () => {
    if (!data) return;
    import("xlsx").then(XLSX => {
      const wb = XLSX.utils.book_new();
      // Summary sheet
      const summary = [
        { Metric: "Total Inspections", Value: data.total_inspections },
        { Metric: "Total Samples", Value: data.total_samples },
        { Metric: "Tests Run", Value: data.total_tests },
        { Metric: "Fat Tests", Value: data.fat_count },
        { Metric: "Protein Tests", Value: data.protein_count },
        { Metric: "Calcium Tests", Value: data.calcium_count },
        { Metric: "DNA Tests", Value: data.dna_count },
        { Metric: "Needs COA Upload", Value: data.needs_coa },
        { Metric: "Needs Retest", Value: data.needs_retest },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
      // Samples sheet
      if (data.recent.length) {
        const rows = data.recent.map(r => ({
          Date: r.date,
          Client: r.client_name,
          Product: r.product_name,
          Commodity: COMMODITY_LABEL[r.commodity] || r.commodity,
          Lab: r.lab,
          Tests: (r.tests || []).join(", "),
          "Needs Retest": r.needs_retest,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Samples");
      }
      XLSX.writeFile(wb, `Lab_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  };

  const handleExportPdf = () => {
    if (!data) return;
    import("jspdf").then(mod => {
      const jsPDF = mod.default || mod.jsPDF;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 0;

      // Header
      doc.setFillColor(0, 120, 144);
      doc.rect(0, 0, pageW, 20, "F");
      doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
      doc.text("Lab Analytics Report", margin, 10);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString("en-ZA")}`, pageW - 55, 10);
      y = 28;

      // KPIs
      const kpis = [
        `Inspections: ${data.total_inspections}`,
        `Samples: ${data.total_samples}`,
        `Tests: ${data.total_tests}`,
        `Needs COA: ${data.needs_coa}`,
        `Needs Retest: ${data.needs_retest}`,
      ];
      doc.setFontSize(9); doc.setTextColor(50, 50, 50); doc.setFont("helvetica", "bold");
      doc.text(kpis.join("   |   "), margin, y);
      y += 10;

      // Table
      const headers = ["Date", "Client", "Product", "Commodity", "Lab", "Tests", "Retest"];
      const colW = [22, 55, 45, 28, 45, 40, 16];
      const rowH = 5.5;
      // Header row
      doc.setFillColor(0, 120, 144);
      doc.rect(margin, y, colW.reduce((a, b) => a + b, 0), rowH + 1, "F");
      doc.setFontSize(6); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
      let cx = margin;
      headers.forEach((h, i) => { doc.text(h, cx + 1.5, y + rowH / 2 + 1.5, { baseline: "middle" }); cx += colW[i]; });
      y += rowH + 1;
      // Body
      doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
      data.recent.forEach((r, ri) => {
        if (y + rowH > doc.internal.pageSize.getHeight() - 10) { doc.addPage(); y = 14; }
        if (ri % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(margin, y, colW.reduce((a, b) => a + b, 0), rowH, "F"); }
        cx = margin;
        const vals = [r.date || "", r.client_name, r.product_name, COMMODITY_LABEL[r.commodity] || r.commodity, r.lab, (r.tests || []).join(", "), r.needs_retest || "No"];
        vals.forEach((v, i) => { doc.text(String(v).substring(0, 35), cx + 1.5, y + rowH / 2 + 1, { baseline: "middle" }); cx += colW[i]; });
        y += rowH;
      });
      doc.save(`Lab_Analytics_${new Date().toISOString().slice(0, 10)}.pdf`);
    });
  };

  const maxMonthly = data && data.monthly?.length ? Math.max(...data.monthly.map(m => m.count), 1) : 1;
  const maxLab     = data && data.labs?.length ? Math.max(...data.labs.map(l => l.n), 1) : 1;
  const maxCommodity = data && data.commodities?.length ? Math.max(...data.commodities.map(c => c.n), 1) : 1;

  // Unique labs and commodities for filter dropdowns
  const allLabs = rawData ? [...new Set(rawData.recent.map(r => r.lab).filter(Boolean))] : [];
  const allCommodities = rawData ? [...new Set(rawData.recent.map(r => r.commodity).filter(Boolean))] : [];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#007890", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes barGrow { from { width: 0; } }
        @keyframes barHeight { from { height: 0; } }
        .la-page-bg { min-height: 100vh; }
        .la-wrap { padding: 32px 32px 48px; max-width: 1340px; margin: 0 auto; }
        .la-section-title {
          font-size: 0.72rem; font-weight: 700; color: #6b7280;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin: 0 0 16px; padding-bottom: 10px;
          border-bottom: 2px solid #f0f1f3;
          display: flex; align-items: center; gap: 8px;
        }
        .la-card {
          background: #fff; border-radius: 14px; padding: 24px 28px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 14px rgba(0,0,0,0.04);
          border: 1px solid #e8eaed;
        }
        .la-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
        .la-mid-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
        .la-test-row  {
          display: flex; align-items: center; gap: 14px; padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .la-test-row:last-child { border-bottom: none; }
        .la-bar-bg    { flex: 1; height: 10px; background: #f1f3f5; border-radius: 99px; overflow: hidden; }
        .la-bar-fill  { height: 100%; border-radius: 99px; transition: width 0.6s ease; animation: barGrow 0.8s ease-out; }
        .la-lab-row   { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .la-lab-row:last-child { margin-bottom: 0; }
        .la-month-bar-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; }
        .la-month-chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; padding: 0 4px; }
        .la-month-bar {
          flex: 1; border-radius: 6px 6px 0 0;
          background: linear-gradient(180deg, #007890, #00a3b8);
          transition: height 0.4s ease; min-width: 0;
          animation: barHeight 0.6s ease-out;
          position: relative;
        }
        .la-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.8rem; }
        .la-table thead { position: sticky; top: 0; z-index: 1; }
        .la-table th {
          text-align: left; padding: 10px 14px; color: #4b5563; font-size: 0.7rem;
          font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
          background: #f1f5f9; border-bottom: 2px solid #e2e5ea;
        }
        .la-table th:first-child { border-radius: 8px 0 0 0; }
        .la-table th:last-child { border-radius: 0 8px 0 0; }
        .la-table td {
          padding: 11px 14px; border-bottom: 1px solid #f3f4f6;
          color: #374151; vertical-align: middle;
        }
        .la-table tr:last-child td { border-bottom: none; }
        .la-table tbody tr:nth-child(even) td { background: #f8fafc; }
        .la-table tbody tr:hover td { background: #eef2f7; }
        .la-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: 0.65rem; font-weight: 600; }
        .la-retest-yes { background: #fef2f2; color: #dc2626; }
        .la-retest-no  { background: #f0fdf4; color: #16a34a; }
        .la-test-tag {
          display: inline-block; padding: 2px 8px; border-radius: 6px;
          font-size: 0.65rem; font-weight: 600; background: #eff6ff;
          color: #2563eb; margin-right: 4px;
        }
        @media (max-width: 900px) {
          .la-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .la-mid-grid  { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .la-wrap { padding: 16px 12px 32px; }
          .la-stat-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="la-page-bg">
        <div className="la-wrap">
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ margin: 0, fontSize: "1.7rem", fontWeight: 800, color: "#fff" }}>Lab Analytics</h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", marginTop: 6 }}>Sample testing overview and results</p>
          </div>

          {/* Filter Bar */}
          <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 120px", minWidth: 120 }}>
                <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 120px", minWidth: 120 }}>
                <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 140px", minWidth: 140 }}>
                <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Lab</label>
                <select value={labFilter} onChange={e => setLabFilter(e.target.value)}
                  style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" }}>
                  <option value="">All Labs</option>
                  {allLabs.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 120px", minWidth: 120 }}>
                <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Commodity</label>
                <select value={commodityFilter} onChange={e => setCommodityFilter(e.target.value)}
                  style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" }}>
                  <option value="">All Commodities</option>
                  {allCommodities.map(c => <option key={c} value={c}>{COMMODITY_LABEL[c] || c}</option>)}
                </select>
              </div>
              <button onClick={handleReset}
                style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#6b7280", color: "white" }}>
                <i className="fas fa-undo" style={{ marginRight: 6 }} />Reset
              </button>
              <button onClick={handleExtractExcel}
                style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#007890", color: "white" }}>
                <i className="fas fa-file-download" style={{ marginRight: 6 }} />Extract
              </button>
              <button onClick={handleExportPdf}
                style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.75rem", cursor: "pointer", background: "#d13438", color: "white" }}>
                <i className="fas fa-file-pdf" style={{ marginRight: 6 }} />PDF
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", color: "#dc2626", marginBottom: 24, fontSize: "0.85rem" }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />{error}
            </div>
          )}

          {/* Stat cards */}
          <div className="la-stat-grid">
            <StatCard label="Total Inspections" value={data?.total_inspections ?? 0} icon="fa-clipboard-list" color="#0d9488" borderColor="#0d9488" loading={loading} />
            <StatCard label="Total Samples Collected" value={data?.total_samples ?? 0} icon="fa-vial" color="#8b5cf6" borderColor="#8b5cf6" loading={loading} />
            <StatCard label="Lab Tests Completed" value={data?.total_tests ?? 0} icon="fa-flask" color="#3b82f6" borderColor="#3b82f6" loading={loading} />
            <StatCard label="Awaiting COA Upload" value={data?.needs_coa ?? 0} icon="fa-file-upload" color="#f97316" borderColor="#f97316" loading={loading} />
            <StatCard label="Samples Needing Retest" value={data?.needs_retest ?? 0} icon="fa-redo-alt" color="#ef4444" borderColor="#ef4444" loading={loading} />
          </div>

          {/* Mid row: Tests breakdown + Monthly trend */}
          <div className="la-mid-grid">

            {/* Test type breakdown */}
            <div className="la-card">
              <p className="la-section-title">
                <i className="fas fa-chart-pie" style={{ fontSize: "0.8rem", color: "#9ca3af" }} />
                Lab Test Results by Type
              </p>
              {loading ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}><Spinner /></div>
              ) : data ? (
                <div>
                  {TEST_CONFIG.map(t => {
                    const count = data[t.key as keyof LabData] as number;
                    const pct = data.total_samples ? Math.round((count / data.total_samples) * 100) : 0;
                    return (
                      <div key={t.key} className="la-test-row">
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: `linear-gradient(135deg, ${t.color}15, ${t.color}28)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <i className={`fas ${t.icon}`} style={{ fontSize: "0.8rem", color: t.color }} />
                        </div>
                        <div style={{ width: 60, fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>{t.label}</div>
                        <div className="la-bar-bg" style={{ height: 12 }}>
                          <div className="la-bar-fill" style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${t.color}, ${t.color}cc)`,
                          }} />
                        </div>
                        <div style={{ width: 40, textAlign: "right", fontSize: "0.82rem", fontWeight: 700, color: "#111827", flexShrink: 0 }}>{count}</div>
                        <div style={{
                          width: 44,
                          textAlign: "right",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: t.color,
                          flexShrink: 0,
                          background: t.color + "12",
                          padding: "2px 6px",
                          borderRadius: 6,
                        }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Monthly trend */}
            <div className="la-card">
              <p className="la-section-title">
                <i className="fas fa-chart-bar" style={{ fontSize: "0.8rem", color: "#9ca3af" }} />
                Monthly Sample Collection (Last 6 Months)
              </p>
              {loading ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}><Spinner /></div>
              ) : data ? (
                <div style={{ position: "relative", height: 180 }}>
                  <Bar
                    data={{
                      labels: (data.monthly || []).map(m => m.month),
                      datasets: [{
                        label: "Samples",
                        data: (data.monthly || []).map(m => m.count),
                        backgroundColor: "rgba(0,120,144,0.75)",
                        borderRadius: 4,
                        barThickness: 28,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: unknown) => `${(ctx as { parsed: { y: number } }).parsed.y} samples` } },
                      },
                      scales: {
                        x: { ticks: { font: { size: 11 } }, grid: { display: false } },
                        y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: Math.ceil(maxMonthly / 5) } },
                      },
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Bottom row: Labs + Commodity */}
          <div className="la-mid-grid">

            {/* Labs */}
            <div className="la-card">
              <p className="la-section-title">
                <i className="fas fa-building" style={{ fontSize: "0.8rem", color: "#9ca3af" }} />
                Samples Processed per Laboratory
              </p>
              {loading ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}><Spinner /></div>
              ) : data && data.labs.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {data.labs.map((l, i) => {
                    const pct = Math.round((l.n / maxLab) * 100);
                    const colors = ["#007890","#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#64748b","#6366f1"];
                    const col = colors[i % colors.length];
                    return (
                      <div key={l.lab}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>{l.lab}</span>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: col }}>{l.n}</span>
                        </div>
                        <div className="la-bar-bg" style={{ height: 12 }}>
                          <div className="la-bar-fill" style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${col}, ${col}bb)`,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "#9ca3af", fontSize: "0.8rem", textAlign: "center", padding: "20px 0" }}>No lab data</div>
              )}
            </div>

            {/* Commodity */}
            <div className="la-card">
              <p className="la-section-title">
                <i className="fas fa-boxes" style={{ fontSize: "0.8rem", color: "#9ca3af" }} />
                Samples by Commodity Type
              </p>
              {loading ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}><Spinner /></div>
              ) : data && data.commodities.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {data.commodities.map(c => {
                    const pct = maxCommodity ? Math.round((c.n / maxCommodity) * 100) : 0;
                    const displayPct = data.total_samples ? Math.round((c.n / data.total_samples) * 100) : 0;
                    const col = COMMODITY_COLOR[c.commodity] ?? "#64748b";
                    return (
                      <div key={c.commodity}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>
                            {COMMODITY_LABEL[c.commodity] ?? c.commodity}
                          </span>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: col }}>
                            {c.n} <span style={{ fontWeight: 500, color: "#9ca3af", fontSize: "0.72rem" }}>({displayPct}%)</span>
                          </span>
                        </div>
                        <div className="la-bar-bg" style={{ height: 12 }}>
                          <div className="la-bar-fill" style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${col}, ${col}bb)`,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "#9ca3af", fontSize: "0.8rem", textAlign: "center", padding: "20px 0" }}>No data</div>
              )}
            </div>
          </div>

          {/* Recent Samples Table */}
          <div className="la-card" style={{ padding: "24px 0" }}>
            <p className="la-section-title" style={{ padding: "0 28px 10px", margin: "0 0 0" }}>
              <i className="fas fa-list-alt" style={{ fontSize: "0.8rem", color: "#9ca3af" }} />
              Recent Samples (Last 50)
            </p>
            {loading ? (
              <div style={{ padding: "32px 0", textAlign: "center" }}><Spinner /></div>
            ) : data && data.recent.length > 0 ? (
              <div style={{ overflowX: "auto", maxHeight: 520 }}>
                <table className="la-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Client</th>
                      <th>Product</th>
                      <th>Commodity</th>
                      <th>Lab</th>
                      <th>Tests</th>
                      <th>Retest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: "nowrap", color: "#6b7280", fontWeight: 500 }}>
                          {r.date ? new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014"}
                        </td>
                        <td style={{ fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1f2937" }}>{r.client_name || "\u2014"}</td>
                        <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product_name || "\u2014"}</td>
                        <td>
                          <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: (COMMODITY_COLOR[r.commodity] ?? "#64748b") + "18", color: COMMODITY_COLOR[r.commodity] ?? "#64748b" }}>
                            {(COMMODITY_LABEL[r.commodity] ?? r.commodity) || "\u2014"}
                          </span>
                        </td>
                        <td style={{ color: "#6b7280", fontWeight: 500 }}>{r.lab || <span style={{ color: "#d1d5db" }}>{"\u2014"}</span>}</td>
                        <td>
                          {(r.tests || []).length > 0
                            ? (r.tests || []).map(t => <span key={t} className="la-test-tag">{t.toUpperCase()}</span>)
                            : <span style={{ color: "#d1d5db", fontSize: "0.72rem" }}>None</span>}
                        </td>
                        <td>
                          {(() => {
                            const nr = (r.needs_retest || "").toUpperCase();
                            const isYes = nr === "YES" || nr === "Y";
                            return (
                              <span className={`la-badge ${isYes ? "la-retest-yes" : "la-retest-no"}`}>
                                <i className={`fas fa-${isYes ? "exclamation-circle" : "check-circle"}`} />
                                {isYes ? "Yes" : "No"}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", padding: "32px 0" }}>
                <i className="fas fa-flask" style={{ fontSize: "2rem", display: "block", marginBottom: 12, opacity: 0.3 }} />
                No sample records found
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
