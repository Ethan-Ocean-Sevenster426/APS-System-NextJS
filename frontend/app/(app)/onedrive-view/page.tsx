"use client";

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────
interface OneDriveFolder {
  name: string;
  file_count: number;
}

interface OneDriveData {
  connected: boolean;
  folders: OneDriveFolder[];
  total_files: number;
  error: string | null;
  token_refreshed: boolean;
  html_response?: boolean;
}

// ── Styles ─────────────────────────────────────────────────────────
const PRIMARY = "#007890";

const styles = {
  page: {
    minHeight: "100vh",
    background: "transparent",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    color: "#1f2937",
    padding: "1.5rem",
    width: "100%",
    maxWidth: "100%",
  } as React.CSSProperties,

  card: {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "1.25rem 1.5rem",
    marginBottom: "1rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb",
  } as React.CSSProperties,

  cardTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: "0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  } as React.CSSProperties,

  statRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap" as const,
    marginBottom: "1rem",
  } as React.CSSProperties,

  statCard: {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb",
    flex: "1 1 180px",
    minWidth: "180px",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  } as React.CSSProperties,

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: "1rem",
    color: "#ffffff",
  } as React.CSSProperties,

  statValue: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#1f2937",
    lineHeight: 1.2,
  } as React.CSSProperties,

  statLabel: {
    fontSize: "0.7rem",
    color: "#6b7280",
    fontWeight: 500,
  } as React.CSSProperties,

  badge: (color: string) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem",
      padding: "0.25rem 0.65rem",
      borderRadius: "9999px",
      fontSize: "0.75rem",
      fontWeight: 600,
      color: "#ffffff",
      background: color,
    }) as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.8125rem",
  } as React.CSSProperties,

  th: {
    textAlign: "left" as const,
    padding: "0.6rem 0.75rem",
    borderBottom: "2px solid #e5e7eb",
    fontWeight: 600,
    color: "#374151",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  } as React.CSSProperties,

  td: {
    padding: "0.55rem 0.75rem",
    borderBottom: "1px solid #f3f4f6",
    color: "#4b5563",
  } as React.CSSProperties,

  trHover: {
    transition: "background 0.15s",
  } as React.CSSProperties,

  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    marginBottom: "1rem",
    color: "#991b1b",
    fontSize: "0.8125rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
  } as React.CSSProperties,

  infoBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    color: "#1e40af",
    fontSize: "0.8rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  } as React.CSSProperties,
};

// ── Component ──────────────────────────────────────────────────────
export default function OneDriveViewPage() {
  const [data, setData] = useState<OneDriveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onedrive-view")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: OneDriveData) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Sort folders by file count descending
  const sortedFolders = data?.folders
    ? [...data.folders].sort((a, b) => b.file_count - a.file_count)
    : [];

  // ── Loading state ───────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid #e2e8f0",
              borderTopColor: PRIMARY,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <div style={{ fontSize: 14, color: "#64748b" }}>
            Loading OneDrive status...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Page ────────────────────────────────────────────────────────
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />

      <div style={styles.page}>
        <div style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
          {/* Page Title */}
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#fff",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            }}
          >
            <i className="fab fa-microsoft" style={{ color: "#5ee8ff" }} />
            OneDrive View
          </h1>

          {/* Fetch error */}
          {error && (
            <div style={styles.errorBox}>
              <i
                className="fas fa-exclamation-triangle"
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <strong>Failed to load OneDrive data</strong>
                <div style={{ marginTop: 4 }}>{error}</div>
              </div>
            </div>
          )}

          {data && (
            <>
              {/* HTML response notice */}
              {data.html_response && (
                <div style={styles.infoBox}>
                  <i className="fas fa-info-circle" style={{ flexShrink: 0 }} />
                  <span>
                    The Django endpoint returned HTML instead of JSON. Folder
                    details are not available. A JSON API endpoint is required
                    for full functionality.
                  </span>
                </div>
              )}

              {/* Token refreshed notice */}
              {data.token_refreshed && (
                <div style={styles.infoBox}>
                  <i className="fas fa-sync-alt" style={{ flexShrink: 0 }} />
                  <span>OneDrive access token was refreshed during this request.</span>
                </div>
              )}

              {/* Stat cards row */}
              <div style={styles.statRow}>
                {/* Connection Status */}
                <div style={styles.statCard}>
                  <div
                    style={{
                      ...styles.statIcon,
                      background: data.connected ? "#16a34a" : "#dc2626",
                    }}
                  >
                    <i
                      className={`fas ${
                        data.connected ? "fa-cloud" : "fa-cloud-slash"
                      }`}
                    />
                  </div>
                  <div>
                    <div style={styles.statValue}>
                      <span
                        style={styles.badge(
                          data.connected ? "#16a34a" : "#dc2626"
                        )}
                      >
                        <i
                          className={`fas ${
                            data.connected ? "fa-check-circle" : "fa-times-circle"
                          }`}
                        />
                        {data.connected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    <div style={styles.statLabel}>Connection Status</div>
                  </div>
                </div>

                {/* Total Files */}
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIcon, background: PRIMARY }}>
                    <i className="fas fa-file-alt" />
                  </div>
                  <div>
                    <div style={styles.statValue}>
                      {data.total_files.toLocaleString()}
                    </div>
                    <div style={styles.statLabel}>Total Files</div>
                  </div>
                </div>

                {/* Total Folders */}
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIcon, background: "#f59e0b" }}>
                    <i className="fas fa-folder" />
                  </div>
                  <div>
                    <div style={styles.statValue}>{sortedFolders.length}</div>
                    <div style={styles.statLabel}>Folders</div>
                  </div>
                </div>
              </div>

              {/* Error from OneDrive */}
              {data.error && (
                <div style={styles.errorBox}>
                  <i
                    className="fas fa-exclamation-circle"
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div>
                    <strong>OneDrive Error</strong>
                    <div style={{ marginTop: 4 }}>{data.error}</div>
                  </div>
                </div>
              )}

              {/* Folders table */}
              {sortedFolders.length > 0 && (
                <div style={styles.card}>
                  <div style={styles.cardTitle}>
                    <i
                      className="fas fa-folder-open"
                      style={{ color: "#f59e0b" }}
                    />
                    Folders
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Folder Name</th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                          File Count
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFolders.map((folder, idx) => (
                        <tr
                          key={folder.name}
                          style={styles.trHover}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f9fafb")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <td
                            style={{
                              ...styles.td,
                              color: "#9ca3af",
                              width: 40,
                            }}
                          >
                            {idx + 1}
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                              }}
                            >
                              <i
                                className="fas fa-folder"
                                style={{
                                  color: "#f59e0b",
                                  fontSize: "0.75rem",
                                }}
                              />
                              {folder.name}
                            </span>
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              textAlign: "right",
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {folder.file_count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty state when connected but no folders */}
              {data.connected &&
                sortedFolders.length === 0 &&
                !data.html_response && (
                  <div style={{ ...styles.card, textAlign: "center" as const, padding: "2rem" }}>
                    <i
                      className="fas fa-folder-open"
                      style={{
                        fontSize: "2rem",
                        color: "#d1d5db",
                        marginBottom: "0.75rem",
                      }}
                    />
                    <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                      No folders found in OneDrive.
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
