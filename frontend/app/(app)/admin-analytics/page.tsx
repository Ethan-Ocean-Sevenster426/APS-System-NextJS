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

const TEAL = "#007890";
const TEAL_LIGHT = "#e6f7f9";

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

function StatCard({ icon, label, value, sub, color = TEAL, tip }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string; tip?: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "18px 20px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%", background: TEAL_LIGHT,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <i className={icon} style={{ color, fontSize: "1.1rem" }} />
      </div>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1f2937", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 600, marginTop: 2 }}>
          {label}{tip && <InfoTip text={tip} />}
        </div>
        {sub && <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function BarChart({ data, valueKey, labelKey, color = TEAL }: {
  data: Record<string, number | string>[]; valueKey: string; labelKey: string; color?: string;
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey])), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 130, fontSize: "0.7rem", color: "#374151", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {String(d[labelKey])}
          </div>
          <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 18, overflow: "hidden" }}>
            <div style={{
              width: `${(Number(d[valueKey]) / max) * 100}%`,
              background: color, height: "100%", borderRadius: 4,
              transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#374151", width: 28, textAlign: "right" }}>
            {d[valueKey]}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ monthly }: { monthly: MonthEntry[] }) {
  const max = Math.max(...monthly.map(m => m.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
      {monthly.map((m, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#374151" }}>{m.count}</div>
          <div style={{
            width: "100%", background: TEAL, borderRadius: "3px 3px 0 0",
            height: `${(m.count / max) * 72}px`, minHeight: m.count > 0 ? 4 : 0,
            transition: "height 0.4s ease",
          }} />
          <div style={{ fontSize: "0.58rem", color: "#6b7280", textAlign: "center", lineHeight: 1.1 }}>
            {m.month.split(" ")[0]}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
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

  const sentRate = data.total_groups > 0
    ? Math.round((data.total_sent / data.total_groups) * 100)
    : 0;
  const approvedRate = data.total_groups > 0
    ? Math.round((data.total_approved / data.total_groups) * 100)
    : 0;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .aa-wrap { padding: 24px; max-width: 1300px; }
        .aa-grid4 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 20px; }
        .aa-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .aa-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .aa-card { background: #fff; border-radius: 12px; padding: 18px 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
        .aa-card-title { font-size: 0.82rem; font-weight: 700; color: #1f2937; margin: 0 0 14px; }
        @media (max-width: 900px) {
          .aa-grid4 { grid-template-columns: repeat(2, 1fr); }
          .aa-grid2 { grid-template-columns: 1fr; }
          .aa-grid3 { grid-template-columns: 1fr; }
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

        {/* Stat cards */}
        <div className="aa-grid4">
          <StatCard icon="fas fa-users" label="Total Clients" value={data.total_clients.toLocaleString()} tip="Total number of client facilities registered in the system." />
          <StatCard icon="fas fa-folder-open" label="Total Inspection Groups" value={data.total_groups.toLocaleString()} sub={`${data.this_month_groups} this month`} tip="Each inspection visit to a client is one group. A group can contain multiple commodities." />
          <StatCard icon="fas fa-paper-plane" label="Sent" value={`${data.total_sent.toLocaleString()} (${sentRate}%)`} color="#2563eb" tip="How many inspection groups have had their documents emailed to the client." />
          <StatCard icon="fas fa-check-circle" label="Approved" value={`${data.total_approved.toLocaleString()} (${approvedRate}%)`} color="#16a34a" tip="How many inspection groups have been approved by management." />
          <StatCard icon="fas fa-file-invoice" label="Total Inspections" value={data.total_inspections.toLocaleString()} color={TEAL} tip="Total individual product inspections across all groups (each commodity in a group is one inspection)." />
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

        {/* Monthly trend + Sent monthly */}
        <div className="aa-grid2">
          <div className="aa-card">
            <p className="aa-card-title">Inspections per Month <InfoTip text="Total inspection groups created each month over the last 6 months." /></p>
            <MonthlyChart monthly={data.monthly} />
          </div>
          <div className="aa-card">
            <p className="aa-card-title">Documents Sent per Month <InfoTip text="How many inspection groups had their documents emailed to clients each month." /></p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
              {data.sent_monthly.map((m, i) => {
                const maxSent = Math.max(...data.sent_monthly.map(x => x.sent), 1);
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#374151" }}>{m.sent}</div>
                    <div style={{
                      width: "100%", background: "#2563eb", borderRadius: "3px 3px 0 0",
                      height: `${(m.sent / maxSent) * 72}px`, minHeight: m.sent > 0 ? 4 : 0,
                    }} />
                    <div style={{ fontSize: "0.58rem", color: "#6b7280", textAlign: "center", lineHeight: 1.1 }}>
                      {m.month.split(" ")[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Corporate Group */}
        <div style={{ marginTop: 16 }}>
          <div className="aa-card">
            <p className="aa-card-title">By Corporate Group <InfoTip text="Breakdown of inspection groups by the corporate group the client belongs to (e.g., Spar, Boxer, Pick n Pay)." /></p>
            <BarChart
              data={data.corporate_data.map(d => ({ label: d.corporate_group, value: d.count }))}
              labelKey="label" valueKey="value" color="#ea580c"
            />
            {data.corporate_data.length === 0 && <p style={{ color: "#9ca3af", fontSize: "0.75rem" }}>No data</p>}
          </div>
        </div>
      </div>
    </>
  );
}
