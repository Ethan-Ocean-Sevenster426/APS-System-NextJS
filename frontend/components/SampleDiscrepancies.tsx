"use client";

import { useState, useEffect, useCallback } from "react";

interface Discrepancy {
  id: number;
  inspector_name: string;
  client_name: string;
  date_of_inspection: string;
  note: string;
  reported_by: string;
  created_at: string;
  rectified: boolean;
  rectified_by: string;
}

const ALLOWED = ["super_admin", "lab_technician", "developer"];

const cardShadow = "0 0 0 1px rgba(17,24,39,0.05), 0 1px 2px 0 rgba(0,0,0,0.05)";
const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, fontSize: "0.82rem", color: "#374151", background: "#fff", border: "none", boxShadow: "0 0 0 1px #d1d5db", boxSizing: "border-box", width: "100%", outline: "none" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.68rem", fontWeight: 600, color: "#374151", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" };

export default function SampleDiscrepancies() {
  const [role, setRole] = useState<string | null>(null);
  const [items, setItems] = useState<Discrepancy[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ inspector_name: "", client_name: "", date_of_inspection: "", note: "" });

  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then(r => r.json())
      .then(d => setRole(d.authenticated ? (d.role || "") : "")).catch(() => setRole(""));
  }, []);

  const load = useCallback(() => {
    fetch("/api/sample-discrepancies", { cache: "no-store" })
      .then(r => r.json()).then(d => setItems(Array.isArray(d.discrepancies) ? d.discrepancies : [])).catch(() => {});
  }, []);

  useEffect(() => { if (role && ALLOWED.includes(role)) load(); }, [role, load]);

  if (role === null || !ALLOWED.includes(role)) return null;

  const openCount = items.filter(i => !i.rectified).length;

  const submit = async () => {
    if (!form.inspector_name.trim()) { setMsg({ ok: false, text: "Inspector name is required." }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/sample-discrepancies", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) {
        setMsg({ ok: true, text: "Flag added — it will appear in the KPI report." });
        setForm({ inspector_name: "", client_name: "", date_of_inspection: "", note: "" });
        setShowForm(false); load();
      } else setMsg({ ok: false, text: d.error || "Failed to add." });
    } catch (e) { setMsg({ ok: false, text: String(e) }); }
    finally { setBusy(false); }
  };

  const toggleRectify = async (id: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, rectified: !i.rectified } : i));
    try { await fetch(`/api/sample-discrepancies/${id}/rectify`, { method: "POST" }); } catch {}
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: cardShadow, marginBottom: 16 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", borderBottom: "1px solid #f3f4f6", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#111827" }}>
            <i className="fas fa-vial-circle-check" style={{ color: "#007890", marginRight: 8 }} />Missing Samples
            {openCount > 0 && <span style={{ marginLeft: 8, fontSize: "0.65rem", fontWeight: 700, background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: 10 }}>{openCount} open</span>}
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#6b7280" }}>Mark an inspection visit (group) where you received a sample in the lab but the inspector recorded none. These appear in the KPI report.</p>
        </div>
        <button onClick={() => { setShowForm(s => !s); setMsg(null); }}
          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: showForm ? "#6b7280" : "#007890", color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          <i className={`fas ${showForm ? "fa-xmark" : "fa-plus"}`} /> {showForm ? "Cancel" : "Mark missing sample"}
        </button>
      </div>

      <div style={{ padding: 20 }}>
        {msg && (
          <div style={{ padding: "9px 12px", borderRadius: 8, marginBottom: 12, fontSize: "0.8rem", background: msg.ok ? "#f0fdf4" : "#fef2f2", color: msg.ok ? "#166534" : "#b91c1c", boxShadow: `0 0 0 1px ${msg.ok ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)"}` }}>
            <i className={`fas ${msg.ok ? "fa-circle-check" : "fa-circle-exclamation"}`} style={{ marginRight: 6 }} />{msg.text}
          </div>
        )}

        {/* form */}
        {showForm && (
          <div style={{ background: "#f9fafb", borderRadius: 10, padding: 16, marginBottom: 16, boxShadow: "0 0 0 1px #f3f4f6" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
              <div><label style={labelStyle}>Inspector *</label><input style={inputStyle} value={form.inspector_name} onChange={e => setForm({ ...form, inspector_name: e.target.value })} placeholder="Inspector name" /></div>
              <div><label style={labelStyle}>Client / Facility</label><input style={inputStyle} value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Client (the visit)" /></div>
              <div><label style={labelStyle}>Visit Date</label><input type="date" style={inputStyle} value={form.date_of_inspection} onChange={e => setForm({ ...form, date_of_inspection: e.target.value })} /></div>
            </div>
            <label style={labelStyle}>Note (optional)</label>
            <input style={{ ...inputStyle, marginBottom: 12 }} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Received a sample in the lab but no sample recorded for this visit" />
            <button onClick={submit} disabled={busy} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: busy ? "#9ca3af" : "#007890", color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: busy ? "wait" : "pointer" }}>
              <i className="fas fa-flag" style={{ marginRight: 6 }} />{busy ? "Adding…" : "Add flag"}
            </button>
          </div>
        )}

        {/* list */}
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 12px", color: "#9ca3af", fontSize: "0.85rem" }}>
            <i className="fas fa-flask" style={{ fontSize: "1.5rem", display: "block", marginBottom: 8, opacity: 0.5 }} />No sample discrepancies reported.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, background: d.rectified ? "#f9fafb" : "#fff", boxShadow: `0 0 0 1px ${d.rectified ? "#f3f4f6" : "rgba(220,38,38,0.12)"}`, opacity: d.rectified ? 0.7 : 1 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: d.rectified ? "#dcfce7" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`fas ${d.rectified ? "fa-check" : "fa-triangle-exclamation"}`} style={{ color: d.rectified ? "#16a34a" : "#dc2626", fontSize: "0.85rem" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#111827", textDecoration: d.rectified ? "line-through" : "none" }}>{d.inspector_name}</span>
                    {d.client_name && <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>· {d.client_name}</span>}
                    {d.rectified && <span style={{ fontSize: "0.62rem", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "1px 7px", borderRadius: 6 }}>RECTIFIED</span>}
                  </div>
                  {d.note && <div style={{ fontSize: "0.8rem", color: "#4b5563", marginTop: 3 }}>{d.note}</div>}
                  <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: 4 }}>
                    {d.date_of_inspection && <span>Inspection {new Date(d.date_of_inspection).toLocaleDateString()} · </span>}
                    Reported by {d.reported_by || "—"}{d.rectified && d.rectified_by ? ` · rectified by ${d.rectified_by}` : ""}
                  </div>
                </div>
                <button onClick={() => toggleRectify(d.id)} title={d.rectified ? "Reopen" : "Mark rectified"}
                  style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: "none", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", background: d.rectified ? "#fff" : "#007890", color: d.rectified ? "#374151" : "#fff", boxShadow: d.rectified ? "0 0 0 1px #d1d5db" : "none", whiteSpace: "nowrap" }}>
                  {d.rectified ? "Reopen" : "Mark rectified"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
