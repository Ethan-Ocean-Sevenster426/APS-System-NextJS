"use client";

import { useState, useEffect } from "react";

interface Mapping {
  id: number;
  inspector_id: number;
  inspector_name: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

const PRIMARY = "#007890";
const BORDER = "#e5e7eb";
const TEXT = "#1f2937";
const TEXT_LIGHT = "#6b7280";

export default function InspectorMappingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ inspector_id: "", inspector_name: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMappings = async () => {
    try {
      const res = await fetch("/api/inspector-mappings");
      const data = await res.json();
      if (data.success && data.mappings) setMappings(data.mappings);
    } catch {
      showToast("Failed to load mappings", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMappings(); }, []);

  const handleSave = async () => {
    if (!form.inspector_id || !form.inspector_name.trim()) {
      showToast("Inspector ID and name are required", false);
      return;
    }
    setSaving(true);
    try {
      const body = editId
        ? { action: "edit", id: editId, inspector_id: Number(form.inspector_id), inspector_name: form.inspector_name.trim(), is_active: form.is_active }
        : { action: "add", inspector_id: Number(form.inspector_id), inspector_name: form.inspector_name.trim(), is_active: form.is_active };
      const res = await fetch("/api/inspector-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editId ? "Mapping updated" : "Mapping added");
        setShowAdd(false);
        setEditId(null);
        setForm({ inspector_id: "", inspector_name: "", is_active: true });
        fetchMappings();
      } else {
        showToast(data.error || "Failed to save", false);
      }
    } catch {
      showToast("Failed to save mapping", false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this mapping?")) return;
    try {
      const res = await fetch("/api/inspector-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Mapping deleted");
        fetchMappings();
      } else {
        showToast(data.error || "Failed to delete", false);
      }
    } catch {
      showToast("Failed to delete mapping", false);
    }
  };

  const startEdit = (m: Mapping) => {
    setForm({ inspector_id: String(m.inspector_id), inspector_name: m.inspector_name, is_active: m.is_active });
    setEditId(m.id);
    setShowAdd(true);
  };

  const cancelForm = () => {
    setShowAdd(false);
    setEditId(null);
    setForm({ inspector_id: "", inspector_name: "", is_active: true });
  };

  const filtered = mappings.filter(m =>
    m.inspector_name.toLowerCase().includes(search.toLowerCase()) ||
    String(m.inspector_id).includes(search)
  );

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", fontSize: "0.85rem", border: `1px solid ${BORDER}`,
    borderRadius: 6, color: TEXT, outline: "none", width: "100%", boxSizing: "border-box",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: PRIMARY, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 10000,
          background: toast.ok ? "#059669" : "#dc2626", color: "#fff",
          padding: "12px 22px", borderRadius: 8, fontSize: 14, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`fas ${toast.ok ? "fa-check-circle" : "fa-exclamation-circle"}`} />
          {toast.msg}
        </div>
      )}

      <div style={{ padding: "32px", background: "transparent", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: "1.6rem", fontWeight: 700, color: "white",
            display: "inline-flex", alignItems: "center", gap: 12,
            margin: "0 0 6px", textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}>
            <i className="fas fa-id-badge" style={{ color: "#5ee8ff" }} />
            Inspector Mappings
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.4)", fontSize: 14 }}>
            Map inspector IDs to names for data synchronisation.
          </p>
        </div>

        {/* Toolbar */}
        <div style={{
          background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
            <i className="fas fa-search" style={{ color: TEXT_LIGHT, fontSize: 13 }} />
            <input
              type="text" placeholder="Search by name or ID..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, border: "none", padding: "6px 0", flex: 1 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: TEXT_LIGHT }}>{mappings.length} mappings</span>
            <button onClick={() => { cancelForm(); setShowAdd(true); }} style={{
              padding: "8px 16px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 6,
              fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              <i className="fas fa-plus" /> Add Mapping
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAdd && (
          <div style={{
            background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            padding: "20px 24px", marginBottom: 16, borderLeft: `4px solid ${PRIMARY}`,
          }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: TEXT, margin: "0 0 14px" }}>
              <i className={`fas ${editId ? "fa-edit" : "fa-plus-circle"}`} style={{ marginRight: 8, color: PRIMARY }} />
              {editId ? "Edit Mapping" : "Add New Mapping"}
            </h3>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: TEXT_LIGHT, marginBottom: 4 }}>Inspector ID</label>
                <input type="number" value={form.inspector_id} onChange={e => setForm({ ...form, inspector_id: e.target.value })} style={inputStyle} placeholder="e.g. 12345" />
              </div>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: TEXT_LIGHT, marginBottom: 4 }}>Inspector Name</label>
                <input type="text" value={form.inspector_name} onChange={e => setForm({ ...form, inspector_name: e.target.value })} style={inputStyle} placeholder="e.g. Lwandile Dlamini" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 2 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} id="isActive" />
                <label htmlFor="isActive" style={{ fontSize: "0.82rem", color: TEXT }}>Active</label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSave} disabled={saving} style={{
                  padding: "8px 16px", background: saving ? "#94a3b8" : PRIMARY, color: "#fff", border: "none", borderRadius: 6,
                  fontWeight: 600, fontSize: "0.82rem", cursor: saving ? "not-allowed" : "pointer",
                }}>
                  {saving ? "Saving..." : editId ? "Update" : "Add"}
                </button>
                <button onClick={cancelForm} style={{
                  padding: "8px 16px", background: "#fff", color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 6,
                  fontSize: "0.82rem", cursor: "pointer",
                }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{
          background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ background: "#f8fafc", padding: "10px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `2px solid ${BORDER}` }}>#</th>
                <th style={{ background: "#f8fafc", padding: "10px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `2px solid ${BORDER}` }}>Inspector ID</th>
                <th style={{ background: "#f8fafc", padding: "10px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `2px solid ${BORDER}` }}>Inspector Name</th>
                <th style={{ background: "#f8fafc", padding: "10px 16px", textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `2px solid ${BORDER}` }}>Status</th>
                <th style={{ background: "#f8fafc", padding: "10px 16px", textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `2px solid ${BORDER}` }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: "center", color: TEXT_LIGHT, fontSize: 14 }}>
                    {search ? "No mappings match your search." : "No inspector mappings found. Click \"Add Mapping\" to create one."}
                  </td>
                </tr>
              ) : filtered.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${BORDER}` }} onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                  <td style={{ padding: "10px 16px", fontSize: "0.85rem", color: TEXT_LIGHT }}>{i + 1}</td>
                  <td style={{ padding: "10px 16px", fontSize: "0.85rem", color: TEXT, fontWeight: 500, fontFamily: "monospace" }}>{m.inspector_id}</td>
                  <td style={{ padding: "10px 16px", fontSize: "0.85rem", color: TEXT, fontWeight: 500 }}>{m.inspector_name}</td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 600,
                      background: m.is_active ? "#dcfce7" : "#fee2e2", color: m.is_active ? "#166534" : "#991b1b",
                    }}>
                      {m.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}>
                    <button onClick={() => startEdit(m)} style={{ background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontSize: 14, marginRight: 8 }} title="Edit">
                      <i className="fas fa-edit" />
                    </button>
                    <button onClick={() => handleDelete(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14 }} title="Delete">
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
