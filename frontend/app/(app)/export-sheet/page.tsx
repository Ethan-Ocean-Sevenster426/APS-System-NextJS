"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

interface ExportItem {
  client_name: string;
  inspector_name: string;
  invoice_date: string;
  item_code: string;
  description: string;
  quantity: number;
  unit_amount: number;
  total: number;
  account_code: string;
  city: string;
  corporate_group?: string;
  country?: string;
  invoice_number?: string;
  invoice_ref?: string;
  rfi_ref?: string;
  tax_rate?: string;
  id?: number;
}

interface Fee {
  id: number;
  fee_code: string;
  fee_name: string;
  rate: number;
  description: string;
  last_updated: string | null;
  effective_date: string | null;
  has_history: boolean;
  history_count: number;
}

interface FeeHistory {
  fee_code: string;
  fee_name: string;
  rate: number;
  effective_date: string;
  created_by?: string;
  notes?: string;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmtCurrency(amount: number) { return `R${amount.toFixed(2)}`; }
function fmtCode(code: string) { return code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function getDefaultFrom() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; }
function getDefaultTo() { return new Date().toISOString().split("T")[0]; }

function buildMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let y = now.getFullYear() + 1; y >= 2025; y--) {
    for (let m = 11; m >= 0; m--) {
      const val = `${y}-${String(m + 1).padStart(2, "0")}`;
      opts.push({ value: val, label: `${MONTHS[m]} ${y}` });
    }
  }
  return opts;
}

export default function ExportSheetPage() {
  // ── Date range (triggers re-fetch) ─────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState(getDefaultFrom());
  const [dateTo, setDateTo] = useState(getDefaultTo());

  // ── Client-side filters ─────────────────────────────────────────────────────
  const [clientFilter, setClientFilter] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [inspectorFilter, setInspectorFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  // ── Data ────────────────────────────────────────────────────────────────────
  const [allItems, setAllItems] = useState<ExportItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [inspectionsProcessed, setInspectionsProcessed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Export dropdown ─────────────────────────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false);

  // ── Manage Fees modal ───────────────────────────────────────────────────────
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [fees, setFees] = useState<Fee[]>([]);
  const [editingFees, setEditingFees] = useState<Record<number, number>>({});
  const [feesSaving, setFeesSaving] = useState(false);
  const [feesMsg, setFeesMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [feeHistory, setFeeHistory] = useState<FeeHistory[]>([]);

  // ── Abort controller ref — cancels previous request when new one starts ──────
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch invoice items ─────────────────────────────────────────────────────
  const fetchData = useCallback(async (from: string, to: string) => {
    // Cancel any in-flight request first
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    console.log("[ExportSheet] fetchData start", { from, to });
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      const url = `/api/export-sheet?${params.toString()}`;
      console.log("[ExportSheet] fetching", url);
      const res = await fetch(url, { signal: controller.signal });
      console.log("[ExportSheet] response status", res.status, res.ok);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("[ExportSheet] data received", { success: data.success, itemCount: data.items?.length, total: data.total_items });
      if (data.success) {
        setAllItems(data.items || []);
        setTotalItems(data.total_items || 0);
        setInspectionsProcessed(data.inspections_processed || 0);
      } else throw new Error(data.error || "API returned success=false");
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") {
        // Silently ignore — a new request was started or component unmounted
        console.log("[ExportSheet] request cancelled (superseded or unmounted)");
        return;
      }
      console.error("[ExportSheet] fetch error", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setAllItems([]);
    } finally {
      if (!controller.signal.aborted) {
        console.log("[ExportSheet] fetchData done, setting loading=false");
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData(dateFrom, dateTo);
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch fees ──────────────────────────────────────────────────────────────
  const fetchFees = async () => {
    try {
      const res = await fetch("/api/fees/get");
      const data = await res.json();
      if (data.fees) {
        setFees(data.fees);
        const map: Record<number, number> = {};
        data.fees.forEach((f: Fee) => { map[f.id] = f.rate; });
        setEditingFees(map);
      }
    } catch { /* ignore */ }
  };

  const openFeesModal = () => { fetchFees(); setShowFeesModal(true); setFeesMsg(null); };

  const saveFees = async () => {
    setFeesSaving(true); setFeesMsg(null);
    try {
      const payload = { fees: fees.map(f => ({ id: f.id, rate: editingFees[f.id] ?? f.rate })) };
      const res = await fetch("/api/fees/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { setFeesMsg({ type: "success", text: `Updated ${data.updated_count} fee(s).` }); fetchFees(); }
      else setFeesMsg({ type: "error", text: data.error || "Failed to save fees." });
    } catch { setFeesMsg({ type: "error", text: "Network error." }); }
    setFeesSaving(false);
  };

  const openHistory = async () => {
    try {
      const res = await fetch("/api/fees/history");
      const data = await res.json();
      setFeeHistory(data.history || []);
    } catch { setFeeHistory([]); }
    setShowHistoryModal(true);
  };

  // ── Close export dropdown on outside click ─────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-export-dropdown]")) setExportOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  // ── Derived filter options ──────────────────────────────────────────────────
  const inspectors = useMemo(() => [...new Set(allItems.map(i => i.inspector_name).filter(Boolean))].sort(), [allItems]);
  const groups = useMemo(() => [...new Set(allItems.map(i => i.corporate_group || "").filter(Boolean))].sort(), [allItems]);

  // ── Client-side filtered items ──────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (clientFilter && !item.client_name?.toLowerCase().includes(clientFilter.toLowerCase())) return false;
      if (inspectorFilter && item.inspector_name !== inspectorFilter) return false;
      if (groupFilter && (item.corporate_group || "") !== groupFilter) return false;
      if (monthFilter) {
        // invoice_date is "DD/MM/YYYY"
        const parts = item.invoice_date?.split("/");
        if (parts?.length === 3) {
          const itemMonth = `${parts[2]}-${parts[1]}`;
          if (itemMonth !== monthFilter) return false;
        }
      }
      return true;
    });
  }, [allItems, clientFilter, inspectorFilter, groupFilter, monthFilter]);

  // ── Grand total ─────────────────────────────────────────────────────────────
  const grandTotal = useMemo(() => filteredItems.reduce((s, i) => s + (i.total || 0), 0), [filteredItems]);

  // ── Clear filters ───────────────────────────────────────────────────────────
  const handleClear = () => {
    setClientFilter(""); setInspectorFilter(""); setGroupFilter(""); setMonthFilter("");
    const from = getDefaultFrom(); const to = getDefaultTo();
    setDateFrom(from); setDateTo(to);
    fetchData(from, to);
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = (excelCompatible = false) => {
    const bom = excelCompatible ? "\uFEFF" : "";
    const sep = excelCompatible ? "\t" : ",";
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ["Client","Inspector","City","Date","Item Code","Description","Qty","Rate","Total","Account","Status"];
    const rows = filteredItems.map(i => [
      q(i.client_name || ""), q(i.inspector_name || ""), q(i.city || ""),
      q(i.invoice_date || ""), q(i.item_code || ""), q(i.description || ""),
      i.quantity?.toFixed(2) ?? "0", i.unit_amount?.toFixed(2) ?? "0",
      i.total?.toFixed(2) ?? "0", q(i.account_code || ""),
      q(i.invoice_number ? "Done" : "Open"),
    ].join(sep));
    const csv = bom + [headers.join(sep), ...rows].join("\n");
    const ext = excelCompatible ? "csv" : "csv";
    const mime = excelCompatible ? "text/tab-separated-values" : "text/csv";
    const blob = new Blob([csv], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `ExportSheet_${dateFrom}_to_${dateTo}.${ext}`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Export Excel ────────────────────────────────────────────────────────────
  const exportExcel = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "Food Safety Agency";
      const ws = wb.addWorksheet("Invoice Line Items");

      const teal = "007890"; const lightTeal = "E6F3F7"; const lightGray = "F8FAFC";
      const headers = ["#","Client","Inspector","City","Date","Item Code","Description","Qty","Rate (R)","Total (R)","Account","Status"];
      const widths = [5, 30, 22, 15, 14, 12, 55, 8, 12, 12, 14, 10];

      ws.columns = headers.map((h, i) => ({ header: h, key: h, width: widths[i] }));

      // Style header row
      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + teal } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { bottom: { style: "medium", color: { argb: "FF" + teal } } };
      });
      headerRow.height = 20;

      // Add data rows
      filteredItems.forEach((item, idx) => {
        const isEven = idx % 2 === 0;
        const row = ws.addRow([
          idx + 1,
          item.client_name || "", item.inspector_name || "", item.city || "",
          item.invoice_date || "", item.item_code || "", item.description || "",
          item.quantity || 0, item.unit_amount || 0, item.total || 0,
          item.account_code || "", item.invoice_number ? "Done" : "Open",
        ]);
        row.eachCell((cell, colNum) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FF" + lightTeal : "FFFFFFFF" } };
          cell.font = { size: 9 };
          cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
          if (colNum >= 9 && colNum <= 10) { // rate, total
            cell.numFmt = '"R"#,##0.00';
            cell.alignment = { horizontal: "right" };
          }
          if (colNum === 12) { // status
            const isDone = item.invoice_number;
            cell.font = { size: 9, bold: true, color: { argb: isDone ? "FF059669" : "FFF59E0B" } };
          }
        });
        row.height = 15;
      });

      // Total row
      const totalRow = ws.addRow(["", "TOTAL", "", "", "", "", "", "", "", grandTotal, "", ""]);
      totalRow.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + lightGray } };
        cell.font = { bold: true, size: 10, color: { argb: "FF" + teal } };
        cell.border = { top: { style: "medium", color: { argb: "FF" + teal } } };
      });
      const totalAmtCell = totalRow.getCell(10);
      totalAmtCell.numFmt = '"R"#,##0.00';
      totalAmtCell.alignment = { horizontal: "right" };

      // Auto-filter
      ws.autoFilter = { from: "A1", to: `L1` };

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `ExportSheet_${dateFrom}_to_${dateTo}.xlsx`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
      alert("Excel export failed: " + String(e));
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const th: React.CSSProperties = { background: "#f8fafc", padding: "8px 6px", textAlign: "left", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase" as const, color: "#64748b", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" as const };
  const td = (even: boolean): React.CSSProperties => ({ padding: "6px 6px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top", background: even ? "#f0f9ff" : "#ffffff", fontSize: "0.8rem" });
  const tdR = (even: boolean): React.CSSProperties => ({ ...td(even), textAlign: "right", whiteSpace: "nowrap" as const });
  const tdC = (even: boolean): React.CSSProperties => ({ ...td(even), textAlign: "center", whiteSpace: "nowrap" as const });
  const inp: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: "0.8rem", background: "#fff", color: "#1f2937", outline: "none" };
  const btnP: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 500, fontSize: "0.8rem", cursor: "pointer", background: "#007890", color: "white" };
  const btnS: React.CSSProperties = { ...btnP, background: "#6b7280" };
  const btnW: React.CSSProperties = { ...btnP, background: "#f59e0b" };
  const btnG: React.CSSProperties = { ...btnP, background: "#10b981" };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}>
      <img src="/logo.png" alt="FSA" style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        .export-tr:hover td { background: rgba(0,120,144,0.06) !important; }
        .fee-inp:focus { outline: 2px solid #007890; outline-offset: 1px; border-color: #007890; }
      `}</style>

      <div style={{ padding: 24, fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", color: "#1f2937" }}>

        {/* Header */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "white", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.5)", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <i className="fas fa-file-export" style={{ color: "#5ee8ff", fontSize: "1.2rem" }} />
            Food Safety Agency (Pty) Ltd
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", margin: "4px 0 0", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>Export Sheet</p>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fas fa-file-export" style={{ color: "#007890" }} />
              Invoice Line Items Dashboard
            </div>
          </div>

          <div style={{ padding: 16, background: "#f9fafb" }}>
            {/* Filters */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 500, color: "#64748b", display: "block", marginBottom: 2 }}>Client</label>
                <input type="text" placeholder="Search or select client..." value={clientFilter}
                  onChange={e => { setClientFilter(e.target.value); setClientDropdownOpen(true); }}
                  onFocus={() => setClientDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                  style={inp} />
                {clientDropdownOpen && clientFilter.length > 0 && (() => {
                  const clientNames = Array.from(new Set(allItems.map(i => i.client_name).filter(Boolean))).sort();
                  const matches = clientNames.filter(n => n.toLowerCase().includes(clientFilter.toLowerCase())).slice(0, 15);
                  if (matches.length === 0) return null;
                  return (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0,
                      background: "#fff", border: "1px solid #d1d5db", borderRadius: "0 0 6px 6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)", zIndex: 9999,
                      maxHeight: 200, overflowY: "auto",
                    }}>
                      {matches.map(name => (
                        <div key={name}
                          style={{ padding: "6px 10px", cursor: "pointer", fontSize: "0.8rem", borderBottom: "1px solid #f3f4f6" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#e6f3f7")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          onMouseDown={() => { setClientFilter(name); setClientDropdownOpen(false); }}>
                          {name}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", fontWeight: 500, color: "#64748b", display: "block", marginBottom: 2 }}>Inspector</label>
                <select value={inspectorFilter} onChange={e => setInspectorFilter(e.target.value)} style={inp}>
                  <option value="">All Inspectors</option>
                  {inspectors.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", fontWeight: 500, color: "#64748b", display: "block", marginBottom: 2 }}>Month</label>
                <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={inp}>
                  <option value="">All Months</option>
                  {buildMonthOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", fontWeight: 500, color: "#64748b", display: "block", marginBottom: 2 }}>Date From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", fontWeight: 500, color: "#64748b", display: "block", marginBottom: 2 }}>Date To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 20 }}>
              <button onClick={() => fetchData(dateFrom, dateTo)} style={btnP}><i className="fas fa-filter" /> Apply</button>
              <button onClick={handleClear} style={btnS}><i className="fas fa-times" /> Clear</button>
              <button onClick={openFeesModal} style={btnW}><i className="fas fa-dollar-sign" /> Fees</button>

              {/* Export Dropdown */}
              <div style={{ position: "relative", display: "inline-block" }} data-export-dropdown="">
                <button style={btnG} onClick={e => { e.stopPropagation(); setExportOpen(p => !p); }}>
                  <i className="fas fa-file-export" /> Export <i className="fas fa-chevron-down" style={{ fontSize: "0.7rem" }} />
                </button>
                {exportOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: 200, zIndex: 1000, marginTop: 4 }}>
                    {[
                      { icon: "fas fa-file-excel", label: "Export to Excel (.xlsx)", action: () => { setExportOpen(false); exportExcel(); } },
                      null,
                      { icon: "fas fa-file-csv", label: "Export as CSV", action: () => { setExportOpen(false); exportCSV(false); } },
                      { icon: "fas fa-file-excel", label: "Export as Excel CSV", action: () => { setExportOpen(false); exportCSV(true); } },
                    ].map((item, i) =>
                      item === null ? <div key={i} style={{ height: 1, background: "#e5e7eb", margin: "4px 0" }} /> :
                      <button key={i} onClick={item.action}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", fontSize: "0.875rem", color: "#1f2937", background: "transparent", border: "none", width: "100%", textAlign: "left" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#e6f3f7"; (e.currentTarget as HTMLElement).style.color = "#007890"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#1f2937"; }}>
                        <i className={item.icon} /><span>{item.label}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
                <div style={{ display: "inline-block", width: 40, height: 40, border: "4px solid #e5e7eb", borderTopColor: "#007890", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ marginTop: 16, fontSize: "0.875rem" }}>Loading invoice line items...</p>
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: "2rem", marginBottom: 8, display: "block" }} />
                <p>Error: {error}</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                <i className="fas fa-inbox" style={{ fontSize: "2rem", marginBottom: 8, display: "block" }} />
                <p>{allItems.length > 0 ? "No items match the current filters." : "No invoice items found. Complete inspections with hours, travel, and test data."}</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e5e7eb", background: "white" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: 36, textAlign: "center" }}>#</th>
                      <th style={th}>Client / Inspector</th>
                      <th style={th}>City</th>
                      <th style={{ ...th, textAlign: "center" }}>Date</th>
                      <th style={th}>Code</th>
                      <th style={{ ...th, width: "100%" }}>Description</th>
                      <th style={{ ...th, textAlign: "right" }}>Qty</th>
                      <th style={{ ...th, textAlign: "right" }}>Rate</th>
                      <th style={{ ...th, textAlign: "right" }}>Total</th>
                      <th style={th}>Account</th>
                      <th style={{ ...th, textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => {
                      const even = idx % 2 === 0;
                      const isDone = !!item.invoice_number;
                      return (
                        <tr key={idx} className="export-tr">
                          <td style={{ ...tdC(even), color: "#94a3b8", fontSize: "0.7rem" }}>{idx + 1}</td>
                          <td style={td(even)}>
                            <div style={{ fontWeight: 500, color: "#1e293b", whiteSpace: "nowrap" }}>{(item.client_name || "-").substring(0, 35)}</div>
                            <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: 2 }}>{item.inspector_name || ""}{item.city ? ` | ${item.city}` : ""}</div>
                          </td>
                          <td style={{ ...td(even), whiteSpace: "nowrap" }}>{item.city || "-"}</td>
                          <td style={tdC(even)}>{item.invoice_date || "-"}</td>
                          <td style={{ ...td(even), whiteSpace: "nowrap" }}>{item.item_code || "-"}</td>
                          <td style={td(even)}>
                            <div style={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.3 }}>
                              {(item.description || "-").substring(0, 100)}{(item.description || "").length > 100 ? "..." : ""}
                            </div>
                          </td>
                          <td style={tdR(even)}>{item.quantity != null ? item.quantity.toFixed(2) : "-"}</td>
                          <td style={tdR(even)}>{item.unit_amount != null ? fmtCurrency(item.unit_amount) : "-"}</td>
                          <td style={{ ...tdR(even), fontWeight: 600 }}>{item.total != null ? fmtCurrency(item.total) : "-"}</td>
                          <td style={{ ...td(even), whiteSpace: "nowrap" }}>{item.account_code || "-"}</td>
                          <td style={tdC(even)}>
                            <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, fontWeight: 600, background: isDone ? "#dcfce7" : "#fef3c7", color: isDone ? "#059669" : "#d97706", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isDone ? "#059669" : "#f59e0b", display: "inline-block" }} />
                              {isDone ? "Done" : "Open"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={8} style={{ padding: "8px 6px", fontWeight: 700, textAlign: "right", background: "#e6f3f7", borderTop: "2px solid #007890", color: "#007890", fontSize: "0.85rem" }}>Grand Total</td>
                      <td style={{ padding: "8px 6px", fontWeight: 700, textAlign: "right", background: "#e6f3f7", borderTop: "2px solid #007890", color: "#007890", fontSize: "0.85rem" }}>{fmtCurrency(grandTotal)}</td>
                      <td colSpan={2} style={{ background: "#e6f3f7", borderTop: "2px solid #007890" }} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Manage Fees Modal ─────────────────────────────────────────────────── */}
      {showFeesModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowFeesModal(false)}>
          <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", maxWidth: 550, width: "92%", maxHeight: "95vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}><i className="fas fa-dollar-sign" style={{ marginRight: 8, color: "#f59e0b" }} />Manage Inspection Fees</h3>
              <button onClick={() => setShowFeesModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>&times;</button>
            </div>

            {feesMsg && (
              <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 6, background: feesMsg.type === "success" ? "#dcfce7" : "#fee2e2", color: feesMsg.type === "success" ? "#166534" : "#991b1b", fontSize: "0.85rem" }}>
                <i className={`fas ${feesMsg.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`} style={{ marginRight: 6 }} />
                {feesMsg.text}
              </div>
            )}

            {fees.length === 0 ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>Loading fees...</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 6px", fontWeight: 600, borderBottom: "2px solid #e5e7eb", color: "#374151", fontSize: "0.72rem" }}>Fee</th>
                    <th style={{ textAlign: "left", padding: "4px 6px", fontWeight: 600, borderBottom: "2px solid #e5e7eb", color: "#374151", fontSize: "0.72rem" }}>Code</th>
                    <th style={{ textAlign: "right", padding: "4px 6px", fontWeight: 600, borderBottom: "2px solid #e5e7eb", color: "#374151", fontSize: "0.72rem", width: 90 }}>Rate (R)</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map(f => (
                    <tr key={f.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "3px 6px", fontWeight: 500 }}>{f.fee_name}</td>
                      <td style={{ padding: "3px 6px", color: "#6b7280" }}>{fmtCode(f.fee_code)}</td>
                      <td style={{ padding: "3px 6px" }}>
                        <input type="number" step="0.01" min="0"
                          value={editingFees[f.id] ?? f.rate}
                          onChange={e => setEditingFees(p => ({ ...p, [f.id]: parseFloat(e.target.value) || 0 }))}
                          style={{ width: "100%", textAlign: "right", padding: "2px 6px", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: "0.78rem" }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 8 }}>
              <button onClick={openHistory} style={{ ...btnW, fontSize: "0.8rem" }}><i className="fas fa-history" /> View Changes</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowFeesModal(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: "0.85rem" }}>Close</button>
                <button onClick={saveFees} disabled={feesSaving} style={{ ...btnP, opacity: feesSaving ? 0.7 : 1, fontSize: "0.85rem" }}>
                  {feesSaving
                    ? <div style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 0.8s linear infinite", verticalAlign: "middle" }} />
                    : <i className="fas fa-save" />
                  } Save All Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Fee History Modal ─────────────────────────────────────────────────── */}
      {showHistoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowHistoryModal(false)}>
          <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", maxWidth: 700, width: "95%", maxHeight: "95vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}><i className="fas fa-history" style={{ marginRight: 8, color: "#f59e0b" }} />Fee Change History</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>&times;</button>
            </div>
            {feeHistory.length === 0 ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>No fee history found.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                <thead>
                  <tr>
                    {["Fee", "Code", "Rate (R)", "Date", "Changed By", "Notes"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "3px 5px", fontWeight: 600, borderBottom: "2px solid #e5e7eb", color: "#374151", fontSize: "0.68rem" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feeHistory.map((h, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fafafa" : "white" }}>
                      <td style={{ padding: "3px 5px", fontWeight: 500 }}>{h.fee_name}</td>
                      <td style={{ padding: "3px 5px", color: "#6b7280" }}>{fmtCode(h.fee_code)}</td>
                      <td style={{ padding: "3px 5px", textAlign: "right" }}>R{Number(h.rate).toFixed(2)}</td>
                      <td style={{ padding: "3px 5px" }}>{h.effective_date}</td>
                      <td style={{ padding: "3px 5px" }}>{h.created_by || "-"}</td>
                      <td style={{ padding: "3px 5px", color: "#6b7280" }}>{h.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowHistoryModal(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: "0.85rem" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
