"use client";

import { useState, useEffect, useCallback } from "react";

interface BackupFile {
  filename: string;
  created: string;
  size: number;
}

interface SettingsData {
  backup_status: string;
  database_backups: BackupFile[];
  excel_exports: BackupFile[];
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-ZA", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

const PRIMARY = "#007890";
const BORDER = "#e5e7eb";
const TEXT = "#1f2937";
const TEXT_LIGHT = "#6b7280";

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "10px 16px", fontSize: "0.78rem", fontWeight: 600,
  color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.05em",
  borderBottom: `2px solid ${BORDER}`, background: "#f9fafb",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: "0.88rem", color: "#374151",
  borderBottom: `1px solid #f3f4f6`,
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"database" | "excel">("database");
  const [runningBackup, setRunningBackup] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const d = await res.json();
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRunBackup = async () => {
    setRunningBackup(true);
    try {
      const res = await fetch("/api/settings", { method: "POST" });
      const d = await res.json();
      if (d.success) {
        showToast(d.message || "Backup completed successfully");
        fetchData();
      } else {
        showToast(d.message || d.error || "Backup failed", false);
      }
    } catch {
      showToast("Failed to trigger backup", false);
    } finally {
      setRunningBackup(false);
    }
  };

  const handleDownload = async (filename: string) => {
    setDownloadingFile(filename);
    try {
      const res = await fetch(
        `/api/settings/download-backup/?file=${encodeURIComponent(filename)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast(`Failed to download ${filename}`, false);
    } finally {
      setDownloadingFile(null);
    }
  };

  const backups = activeTab === "database"
    ? (data?.database_backups ?? [])
    : (data?.excel_exports ?? []);

  const isRunning = data?.backup_status === "running";

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      {/* Toast */}
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
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "white", display: "inline-flex", alignItems: "center", gap: 12, margin: "0 0 6px", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            <i className="fas fa-sliders-h" style={{ color: "#5ee8ff" }} />
            Settings
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.4)", fontSize: 14 }}>
            Manage system settings and data backups.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "white" }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: "1.5rem", marginBottom: 12, display: "block" }} />
            Loading settings...
          </div>
        )}

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "16px 24px", color: "#991b1b", marginBottom: 24, maxWidth: 800, margin: "0 auto 24px" }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
            {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{
            background: "#fff", borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: "28px 32px",
            width: "100%",
          }}>
            {/* Section Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: TEXT, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="fas fa-database" style={{ color: PRIMARY }} />
                  Data Backup
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: isRunning ? "#22c55e" : "#94a3b8", display: "inline-block" }} />
                  <span style={{ fontSize: "0.82rem", color: isRunning ? "#16a34a" : TEXT_LIGHT, fontWeight: 500 }}>
                    {isRunning ? "Service Running" : "Service Stopped"}
                  </span>
                </div>
              </div>
              <button
                onClick={handleRunBackup}
                disabled={runningBackup}
                style={{
                  padding: "9px 20px", background: runningBackup ? "#94a3b8" : PRIMARY,
                  color: "#fff", border: "none", borderRadius: 8, fontWeight: 600,
                  fontSize: "0.85rem", cursor: runningBackup ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s",
                }}
              >
                <i className={`fas ${runningBackup ? "fa-spinner fa-spin" : "fa-play"}`} />
                {runningBackup ? "Running..." : "Run Backup Now"}
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${BORDER}`, marginBottom: 20 }}>
              {(["database", "excel"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "10px 24px", border: "none", background: "none", fontWeight: 600,
                    fontSize: "0.88rem", cursor: "pointer",
                    color: activeTab === tab ? PRIMARY : TEXT_LIGHT,
                    borderBottom: activeTab === tab ? `2px solid ${PRIMARY}` : "2px solid transparent",
                    marginBottom: -2, transition: "all 0.15s",
                  }}
                >
                  <i className={`fas ${tab === "database" ? "fa-database" : "fa-file-excel"}`} style={{ marginRight: 8 }} />
                  {tab === "database" ? `Database Backups (${data?.database_backups?.length ?? 0})` : `Excel Exports (${data?.excel_exports?.length ?? 0})`}
                </button>
              ))}
            </div>

            {/* Table */}
            {backups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
                <i className="fas fa-folder-open" style={{ fontSize: "2rem", display: "block", marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  No {activeTab === "database" ? "database backups" : "excel exports"} found.
                </p>
                {activeTab === "database" && (
                  <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "#cbd5e1" }}>
                    Click "Run Backup Now" to create your first backup.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Filename</th>
                      <th style={thStyle}>Created</th>
                      <th style={thStyle}>Size</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f9fafb")}>
                        <td style={tdStyle}>
                          <i className={`fas ${activeTab === "database" ? "fa-database" : "fa-file-excel"}`} style={{ color: PRIMARY, marginRight: 8 }} />
                          {b.filename}
                        </td>
                        <td style={tdStyle}>{formatDate(b.created)}</td>
                        <td style={tdStyle}>{formatSize(b.size)}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <button
                            onClick={() => handleDownload(b.filename)}
                            disabled={downloadingFile === b.filename}
                            style={{
                              padding: "6px 16px", background: "#f0f9ff", color: PRIMARY,
                              border: "1px solid #bae6fd", borderRadius: 6, fontWeight: 500,
                              fontSize: "0.8rem", cursor: downloadingFile === b.filename ? "not-allowed" : "pointer",
                              display: "inline-flex", alignItems: "center", gap: 6, opacity: downloadingFile === b.filename ? 0.6 : 1,
                            }}
                          >
                            <i className={`fas ${downloadingFile === b.filename ? "fa-spinner fa-spin" : "fa-download"}`} />
                            {downloadingFile === b.filename ? "Downloading..." : "Download"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
