"use client";

import { useState, useEffect } from "react";

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

function StatCard({ label, value, icon, color, loading }: { label: string; value: number; icon: string; color: string; loading: boolean }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`fas ${icon}`} style={{ fontSize: "1.3rem", color }} />
      </div>
      <div>
        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#111827", lineHeight: 1, marginBottom: 4 }}>
          {loading ? <Spinner /> : value.toLocaleString()}
        </div>
        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      </div>
    </div>
  );
}

export default function LabAnalyticsPage() {
  const [data, setData] = useState<LabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/lab-analytics")
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        else setError(d.error || "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  const maxMonthly = data ? Math.max(...data.monthly.map(m => m.count), 1) : 1;
  const maxLab     = data ? Math.max(...data.labs.map(l => l.n), 1) : 1;

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
        @keyframes spin { to { transform: rotate(360deg) } }
        .la-wrap { padding: 28px 28px 40px; max-width: 1300px; }
        .la-section-title {
          font-size: 0.7rem; font-weight: 700; color: #6b7280;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin: 0 0 12px; padding-bottom: 8px;
          border-bottom: 2px solid #f3f4f6;
        }
        .la-card { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); border: 1px solid #e5e7eb; }
        .la-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        .la-mid-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px; }
        .la-test-row  { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .la-test-row:last-child { border-bottom: none; }
        .la-bar-bg    { flex: 1; height: 8px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
        .la-bar-fill  { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
        .la-lab-row   { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .la-lab-row:last-child { margin-bottom: 0; }
        .la-month-bar-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; }
        .la-month-chart { display: flex; align-items: flex-end; gap: 6px; height: 100px; padding: 0 4px; }
        .la-month-bar { flex: 1; border-radius: 4px 4px 0 0; background: #007890; transition: height 0.4s ease; min-width: 0; }
        .la-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        .la-table th { text-align: left; padding: 8px 12px; color: #6b7280; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; background: #f9fafb; border-bottom: 2px solid #e5e7eb; }
        .la-table td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle; }
        .la-table tr:last-child td { border-bottom: none; }
        .la-table tr:hover td { background: #f9fafb; }
        .la-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-size: 0.65rem; font-weight: 600; }
        .la-retest-yes { background: #fef2f2; color: #dc2626; }
        .la-retest-no  { background: #f0fdf4; color: #16a34a; }
        .la-test-tag { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; background: #eff6ff; color: #2563eb; margin-right: 3px; }
        @media (max-width: 900px) {
          .la-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .la-mid-grid  { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .la-wrap { padding: 16px 12px 32px; }
          .la-stat-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="la-wrap">
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#fff" }}>Lab Analytics</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", marginTop: 4 }}>Sample testing overview and results</p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 18px", color: "#dc2626", marginBottom: 20, fontSize: "0.85rem" }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />{error}
          </div>
        )}

        {/* Stat cards */}
        <div className="la-stat-grid">
          <StatCard label="Total Inspections" value={data?.total_inspections ?? 0} icon="fa-clipboard-list"  color="#64748b" loading={loading} />
          <StatCard label="Total Samples"      value={data?.total_samples ?? 0}    icon="fa-vial"            color="#007890" loading={loading} />
          <StatCard label="Tests Run"          value={data?.total_tests ?? 0}      icon="fa-flask"           color="#8b5cf6" loading={loading} />
          <StatCard label="Needs COA Upload"   value={data?.needs_coa ?? 0}        icon="fa-file-upload"     color="#f97316" loading={loading} />
          <StatCard label="Needs Retest"       value={data?.needs_retest ?? 0}     icon="fa-redo-alt"        color="#ef4444" loading={loading} />
        </div>

        {/* Mid row: Tests breakdown + Monthly trend */}
        <div className="la-mid-grid">

          {/* Test type breakdown */}
          <div className="la-card">
            <p className="la-section-title">Tests by Type</p>
            {loading ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}><Spinner /></div>
            ) : data ? (
              <div>
                {TEST_CONFIG.map(t => {
                  const count = data[t.key as keyof LabData] as number;
                  const pct = data.total_samples ? Math.round((count / data.total_samples) * 100) : 0;
                  return (
                    <div key={t.key} className="la-test-row">
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: t.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className={`fas ${t.icon}`} style={{ fontSize: "0.75rem", color: t.color }} />
                      </div>
                      <div style={{ width: 56, fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>{t.label}</div>
                      <div className="la-bar-bg">
                        <div className="la-bar-fill" style={{ width: `${pct}%`, background: t.color }} />
                      </div>
                      <div style={{ width: 36, textAlign: "right", fontSize: "0.78rem", fontWeight: 700, color: "#111827", flexShrink: 0 }}>{count}</div>
                      <div style={{ width: 36, textAlign: "right", fontSize: "0.68rem", color: "#9ca3af", flexShrink: 0 }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Monthly trend */}
          <div className="la-card">
            <p className="la-section-title">Samples per Month (Last 6 Months)</p>
            {loading ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}><Spinner /></div>
            ) : data ? (
              <div>
                <div className="la-month-chart">
                  {data.monthly.map(m => (
                    <div key={m.month} className="la-month-bar-wrap">
                      <div className="la-month-bar" style={{ height: `${(m.count / maxMonthly) * 90}px` }} title={`${m.count} samples`} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {data.monthly.map(m => (
                    <div key={m.month} style={{ flex: 1, textAlign: "center", fontSize: "0.6rem", color: "#9ca3af", lineHeight: 1.2 }}>
                      {m.month.split(" ")[0]}<br />{m.count}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom row: Labs + Commodity */}
        <div className="la-mid-grid">

          {/* Labs */}
          <div className="la-card">
            <p className="la-section-title">By Lab</p>
            {loading ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}><Spinner /></div>
            ) : data && data.labs.length > 0 ? (
              data.labs.map((l, i) => {
                const pct = Math.round((l.n / maxLab) * 100);
                const colors = ["#007890","#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#64748b","#6366f1"];
                const col = colors[i % colors.length];
                return (
                  <div key={l.lab} className="la-lab-row">
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }} />
                    <div style={{ width: 140, fontSize: "0.78rem", color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.lab}</div>
                    <div className="la-bar-bg" style={{ flex: 1 }}>
                      <div className="la-bar-fill" style={{ width: `${pct}%`, background: col }} />
                    </div>
                    <div style={{ width: 30, textAlign: "right", fontSize: "0.78rem", fontWeight: 700, color: "#111827", flexShrink: 0 }}>{l.n}</div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "#9ca3af", fontSize: "0.8rem", textAlign: "center", padding: "20px 0" }}>No lab data</div>
            )}
          </div>

          {/* Commodity */}
          <div className="la-card">
            <p className="la-section-title">By Commodity</p>
            {loading ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}><Spinner /></div>
            ) : data && data.commodities.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.commodities.map(c => {
                  const pct = data.total_samples ? Math.round((c.n / data.total_samples) * 100) : 0;
                  const col = COMMODITY_COLOR[c.commodity] ?? "#64748b";
                  return (
                    <div key={c.commodity}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>
                          {COMMODITY_LABEL[c.commodity] ?? c.commodity}
                        </span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: col }}>{c.n} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({pct}%)</span></span>
                      </div>
                      <div className="la-bar-bg" style={{ height: 10 }}>
                        <div className="la-bar-fill" style={{ width: `${pct}%`, background: col }} />
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
        <div className="la-card">
          <p className="la-section-title">Recent Samples (Last 50)</p>
          {loading ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}><Spinner /></div>
          ) : data && data.recent.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
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
                      <td style={{ whiteSpace: "nowrap", color: "#6b7280" }}>
                        {r.date ? new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td style={{ fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.client_name || "—"}</td>
                      <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product_name || "—"}</td>
                      <td>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: (COMMODITY_COLOR[r.commodity] ?? "#64748b") + "18", color: COMMODITY_COLOR[r.commodity] ?? "#64748b" }}>
                          {(COMMODITY_LABEL[r.commodity] ?? r.commodity) || "—"}
                        </span>
                      </td>
                      <td style={{ color: "#6b7280" }}>{r.lab || <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td>
                        {r.tests.length > 0
                          ? r.tests.map(t => <span key={t} className="la-test-tag">{t.toUpperCase()}</span>)
                          : <span style={{ color: "#d1d5db", fontSize: "0.72rem" }}>None</span>}
                      </td>
                      <td>
                        <span className={`la-badge ${r.needs_retest === "YES" ? "la-retest-yes" : "la-retest-no"}`}>
                          <i className={`fas fa-${r.needs_retest === "YES" ? "exclamation-circle" : "check-circle"}`} />
                          {r.needs_retest === "YES" ? "Retest" : "OK"}
                        </span>
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
    </>
  );
}
