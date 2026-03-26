"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────
interface FileEntry {
  name: string;
  size: number;
  path?: string;
}

interface CategoryNode {
  name: string;
  type: "category";
  files: FileEntry[];
}

interface InspectionNode {
  name: string;
  type: "inspection";
  children: CategoryNode[];
}

interface ClientNode {
  name: string;
  type: "client";
  children: InspectionNode[];
}

interface ServerViewResponse {
  success: boolean;
  tree: ClientNode[];
  total_folders: number;
  total_files: number;
}

interface ServerHealth {
  cpu_percent?: number;
  memory_percent?: number;
  memory_available_gb?: number;
  disk_percent?: number;
  disk_free_gb?: number;
  total_inspections?: number;
  total_clients?: number;
}

interface ServiceInfo {
  name: string;
  running: boolean;
}

interface ServiceStatusResponse {
  success?: boolean;
  services?: ServiceInfo[];
}

// ── Helpers ────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  filterCard: {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    marginBottom: "1rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb",
  } as React.CSSProperties,

  filterTitle: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: "0.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
  } as React.CSSProperties,

  searchWrapper: {
    position: "relative" as const,
    flex: 1,
    minWidth: "200px",
  } as React.CSSProperties,

  searchIcon: {
    position: "absolute" as const,
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#6b7280",
    fontSize: "14px",
    pointerEvents: "none" as const,
  } as React.CSSProperties,

  searchInput: {
    width: "100%",
    padding: "0.5rem 2rem 0.5rem 2.25rem",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "0.8rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    color: "#1f2937",
  } as React.CSSProperties,

  clearBtn: {
    position: "absolute" as const,
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: "14px",
    padding: "2px",
  } as React.CSSProperties,

  controlBtnRow: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.75rem",
  } as React.CSSProperties,

  controlBtn: {
    padding: "0.4rem 0.85rem",
    background: PRIMARY,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.8rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontWeight: 500,
    transition: "opacity 0.2s",
  } as React.CSSProperties,

  treeContainer: {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "1.5rem",
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  } as React.CSSProperties,

  treeHeading: {
    display: "flex",
    alignItems: "center",
    fontSize: "1.15rem",
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: "1rem",
    gap: "0.75rem",
  } as React.CSSProperties,

  treeFont: {
    fontFamily: "'Courier New', monospace",
    fontSize: "0.875rem",
    color: "#374151",
  } as React.CSSProperties,

  nodeRow: (level: number) =>
    ({
      display: "flex",
      alignItems: "center",
      padding: "0.45rem 0.5rem",
      paddingLeft: `${level * 1.5 + 0.5}rem`,
      borderBottom: "1px solid #f3f4f6",
      cursor: "pointer",
      transition: "background 0.15s",
      borderLeft:
        level > 0 ? "1px solid #e5e7eb" : "none",
      marginLeft: level > 0 ? `${(level - 1) * 1.5 + 0.5}rem` : "0",
    }) as React.CSSProperties,

  folderName: {
    flex: 1,
    fontWeight: 600,
    color: "#1f2937",
  } as React.CSSProperties,

  fileName: {
    flex: 1,
    fontWeight: 400,
    color: "#6b7280",
  } as React.CSSProperties,

  badge: {
    marginLeft: "auto",
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.6)",
    fontSize: "0.7rem",
    padding: "0.15rem 0.5rem",
    borderRadius: "9999px",
    fontWeight: 500,
  } as React.CSSProperties,

  fileSize: {
    marginLeft: "0.75rem",
    color: "rgba(255,255,255,0.4)",
    fontSize: "0.8rem",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  icon: {
    marginRight: "0.6rem",
    width: "1.1rem",
    textAlign: "center" as const,
    flexShrink: 0,
  } as React.CSSProperties,

  toggleIcon: {
    width: "1rem",
    textAlign: "center" as const,
    marginRight: "0.35rem",
    color: "rgba(255,255,255,0.5)",
    flexShrink: 0,
  } as React.CSSProperties,

  spinner: {
    textAlign: "center" as const,
    padding: "3rem",
    color: "rgba(255,255,255,0.7)",
  } as React.CSSProperties,

  errorBox: {
    textAlign: "center" as const,
    padding: "3rem",
    color: "rgba(255,255,255,0.7)",
  } as React.CSSProperties,

  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
  } as React.CSSProperties,

  metricItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.35rem",
  } as React.CSSProperties,

  metricLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  } as React.CSSProperties,

  metricValue: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#1f2937",
    lineHeight: 1.1,
  } as React.CSSProperties,

  metricSub: {
    fontSize: "0.7rem",
    color: "#9ca3af",
    fontWeight: 500,
  } as React.CSSProperties,

  progressBarOuter: {
    width: "100%",
    height: "8px",
    background: "#e5e7eb",
    borderRadius: "4px",
    overflow: "hidden",
    marginTop: "0.2rem",
  } as React.CSSProperties,

  serviceRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.5rem 0",
    borderBottom: "1px solid #f3f4f6",
  } as React.CSSProperties,

  statusDot: (running: boolean) =>
    ({
      width: "10px",
      height: "10px",
      borderRadius: "50%",
      background: running ? "#22c55e" : "#ef4444",
      flexShrink: 0,
      boxShadow: running
        ? "0 0 6px rgba(34,197,94,0.4)"
        : "0 0 6px rgba(239,68,68,0.4)",
    }) as React.CSSProperties,

  serviceName: {
    flex: 1,
    fontSize: "0.825rem",
    fontWeight: 500,
    color: "#374151",
  } as React.CSSProperties,

  serviceStatusText: (running: boolean) =>
    ({
      fontSize: "0.7rem",
      fontWeight: 600,
      color: running ? "#16a34a" : "#dc2626",
    }) as React.CSSProperties,

  serviceBtn: (variant: "start" | "stop") =>
    ({
      padding: "0.4rem 1rem",
      background: variant === "start" ? "#22c55e" : "#ef4444",
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      fontSize: "0.8rem",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
      fontWeight: 600,
      transition: "opacity 0.2s",
    }) as React.CSSProperties,

  cardsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1rem",
  } as React.CSSProperties,
};

// ── Component ──────────────────────────────────────────────────────
export default function ServerViewPage() {
  const [tree, setTree] = useState<ClientNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Health & service state
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceActionLoading, setServiceActionLoading] = useState(false);

  // Fetch data
  useEffect(() => {
    fetch("/api/server-view")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ServerViewResponse) => {
        if (!data.success) throw new Error("API returned success=false");
        setTree(data.tree);

        // Expand all client nodes by default
        const initial = new Set<string>();
        data.tree.forEach((c) => initial.add(c.name));
        setExpanded(initial);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fetch server health
  const fetchHealth = useCallback(() => {
    setHealthLoading(true);
    fetch("/api/server-status")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.html) {
          setHealth(data);
        } else {
          // Fallback: parse from HTML or set defaults
          setHealth(null);
        }
        setHealthLoading(false);
      })
      .catch(() => setHealthLoading(false));
  }, []);

  // Fetch service status
  const fetchServices = useCallback(() => {
    setServicesLoading(true);
    fetch("/api/service-status")
      .then((r) => r.json())
      .then((data: ServiceStatusResponse) => {
        if (data.services) {
          setServices(data.services);
        }
        setServicesLoading(false);
      })
      .catch(() => setServicesLoading(false));
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchServices();
    // Refresh health every 30s
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchServices]);

  // Service control action
  const handleServiceAction = useCallback(
    async (action: "start-all" | "stop-all") => {
      setServiceActionLoading(true);
      try {
        await fetch("/api/service-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        // Re-fetch service status after action
        setTimeout(() => {
          fetchServices();
          setServiceActionLoading(false);
        }, 1500);
      } catch {
        setServiceActionLoading(false);
      }
    },
    [fetchServices]
  );

  // Progress bar color helper
  const barColor = (pct: number): string => {
    if (pct < 60) return "#22c55e";
    if (pct < 80) return "#f59e0b";
    return "#ef4444";
  };

  // Default service list when API hasn't responded
  const displayServices: ServiceInfo[] =
    services.length > 0
      ? services
      : [
          { name: "Daily Compliance Sync", running: false },
          { name: "Scheduled Sync", running: false },
          { name: "Scheduled Backup", running: false },
          { name: "OneDrive Upload", running: false },
        ];

  // Build a key for every expandable node
  const key = useCallback(
    (...parts: string[]) => parts.join("///"),
    []
  );

  const toggle = useCallback((nodeKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
  }, []);

  // Collect all expandable keys
  const allKeys = useMemo(() => {
    const keys: string[] = [];
    tree.forEach((client) => {
      keys.push(key(client.name));
      client.children.forEach((insp) => {
        keys.push(key(client.name, insp.name));
        insp.children.forEach((cat) => {
          keys.push(key(client.name, insp.name, cat.name));
        });
      });
    });
    return keys;
  }, [tree, key]);

  const expandAll = () => setExpanded(new Set(allKeys));
  const collapseAll = () => setExpanded(new Set());

  // Filter tree by search
  const lowerSearch = search.toLowerCase();

  const matchesSearch = useCallback(
    (name: string) => !lowerSearch || name.toLowerCase().includes(lowerSearch),
    [lowerSearch]
  );

  const filteredTree = useMemo(() => {
    // Extract date from inspection name like "[10 Mar 2026]"
    const extractDate = (name: string): string | null => {
      const m = name.match(/\[(\d{1,2}) (\w{3}) (\d{4})\]/);
      if (!m) return null;
      const mo: Record<string, string> = { Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12" };
      return `${m[3]}-${mo[m[2]] || "01"}-${m[1].padStart(2, "0")}`;
    };

    const checkDate = (inspName: string): boolean => {
      if (!dateFrom && !dateTo) return true;
      const d = extractDate(inspName);
      if (!d) return true;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    };

    if (!lowerSearch && !dateFrom && !dateTo) return tree;

    return tree
      .map((client) => {
        const filteredInspections = client.children
          .map((insp) => {
            const filteredCategories = insp.children
              .map((cat) => {
                const filteredFiles = cat.files.filter((f) =>
                  matchesSearch(f.name)
                );
                if (
                  matchesSearch(cat.name) ||
                  filteredFiles.length > 0
                ) {
                  return {
                    ...cat,
                    files: matchesSearch(cat.name)
                      ? cat.files
                      : filteredFiles,
                  };
                }
                return null;
              })
              .filter(Boolean) as CategoryNode[];

            if (!checkDate(insp.name)) return null;
            if (
              matchesSearch(insp.name) ||
              filteredCategories.length > 0 ||
              (!lowerSearch)
            ) {
              return {
                ...insp,
                children: matchesSearch(insp.name) || !lowerSearch
                  ? insp.children
                  : filteredCategories,
              };
            }
            return null;
          })
          .filter(Boolean) as InspectionNode[];

        const hasDateFilter = !!(dateFrom || dateTo);
        const useChildren = hasDateFilter
          ? filteredInspections
          : (matchesSearch(client.name) ? client.children : filteredInspections);

        if (useChildren.length > 0 || (!hasDateFilter && matchesSearch(client.name))) {
          return { ...client, children: useChildren };
        }
        return null;
      })
      .filter(Boolean) as ClientNode[];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, lowerSearch, matchesSearch, dateFrom, dateTo]);

  // When searching, auto-expand everything so results are visible
  const effectiveExpanded = useMemo(() => {
    if (lowerSearch) return new Set(allKeys);
    return expanded;
  }, [lowerSearch, allKeys, expanded]);

  // ── Render tree ────────────────────────────────────────────────────
  const renderFile = (
    file: FileEntry,
    level: number,
    idx: number,
    filePath?: string
  ) => (
    <div
      key={`file-${idx}-${file.name}`}
      style={{ ...styles.nodeRow(level), gap: "0.5rem" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "#f9fafb")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
    >
      <span style={styles.toggleIcon} />
      <span style={styles.icon}>
        <i className="fa fa-file-pdf" style={{ color: "#ef4444" }} />
      </span>
      <span style={styles.fileName}>{file.name}</span>
      <span style={styles.fileSize}>{formatFileSize(file.size)}</span>
      {filePath && (
        <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <a href={`/api/serve-file?file=${encodeURIComponent(filePath)}&action=view`}
            target="_blank" rel="noopener noreferrer"
            style={{ padding: "2px 8px", background: "#007890", color: "#fff", borderRadius: 4, fontSize: "0.65rem", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>
            <i className="fas fa-eye" /> View
          </a>
          <a href={`/api/serve-file?file=${encodeURIComponent(filePath)}&action=download`}
            download={file.name}
            style={{ padding: "2px 8px", background: "#3b82f6", color: "#fff", borderRadius: 4, fontSize: "0.65rem", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>
            <i className="fas fa-download" /> Download
          </a>
        </span>
      )}
    </div>
  );

  const renderCategory = (
    cat: CategoryNode,
    clientName: string,
    inspName: string,
    level: number
  ) => {
    const k = key(clientName, inspName, cat.name);
    const isOpen = effectiveExpanded.has(k);
    return (
      <div key={k}>
        <div
          style={styles.nodeRow(level)}
          onClick={() => toggle(k)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <span style={styles.toggleIcon}>
            <i
              className={`fa ${
                isOpen ? "fa-chevron-down" : "fa-chevron-right"
              }`}
            />
          </span>
          <span style={styles.icon}>
            <i
              className={`fa ${isOpen ? "fa-folder-open" : "fa-folder"}`}
              style={{ color: "#f59e0b" }}
            />
          </span>
          <span style={styles.folderName}>{cat.name}</span>
          <span style={styles.badge}>{cat.files.length} files</span>
        </div>
        {isOpen &&
          cat.files.map((file, idx) =>
            renderFile(file, level + 1, idx, file.path)
          )}
      </div>
    );
  };

  const renderInspection = (
    insp: InspectionNode,
    clientName: string,
    level: number
  ) => {
    const k = key(clientName, insp.name);
    const isOpen = effectiveExpanded.has(k);
    return (
      <div key={k}>
        <div
          style={styles.nodeRow(level)}
          onClick={() => toggle(k)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <span style={styles.toggleIcon}>
            <i
              className={`fa ${
                isOpen ? "fa-chevron-down" : "fa-chevron-right"
              }`}
            />
          </span>
          <span style={styles.icon}>
            <i
              className={`fa ${isOpen ? "fa-folder-open" : "fa-folder"}`}
              style={{ color: "#f59e0b" }}
            />
          </span>
          <span style={styles.folderName}>{insp.name}</span>
        </div>
        {isOpen &&
          insp.children.map((cat) =>
            renderCategory(cat, clientName, insp.name, level + 1)
          )}
      </div>
    );
  };

  const renderClient = (client: ClientNode) => {
    const k = key(client.name);
    const isOpen = effectiveExpanded.has(k);
    return (
      <div key={k}>
        <div
          style={{
            ...styles.nodeRow(0),
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
          onClick={() => toggle(k)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <span style={styles.toggleIcon}>
            <i
              className={`fa ${
                isOpen ? "fa-chevron-down" : "fa-chevron-right"
              }`}
            />
          </span>
          <span style={styles.icon}>
            <i
              className={`fa ${isOpen ? "fa-folder-open" : "fa-folder"}`}
              style={{ color: "#f59e0b" }}
            />
          </span>
          <span style={{ ...styles.folderName, fontSize: "0.95rem" }}>
            {client.name}
          </span>
        </div>
        {isOpen &&
          client.children.map((insp) =>
            renderInspection(insp, client.name, 1)
          )}
      </div>
    );
  };

  // ── Page ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#007890", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <>
      {/* Font Awesome CDN */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />

      <div style={styles.page}>
        <div style={{ width: "100%" }}>
        {/* Page Title */}
        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "#fff",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          <i className="fa fa-database" style={{ color: "#5ee8ff" }} />
          Server View
        </h1>

        {/* Server Health & Service Status */}
        <div style={styles.cardsRow}>
          {/* ── Server Health Card ── */}
          <div style={styles.filterCard}>
            <div style={styles.filterTitle}>
              <i className="fa fa-heartbeat" style={{ color: "#ef4444" }} />
              Server Health
            </div>

            {healthLoading && !health ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#9ca3af", fontSize: "0.8rem" }}>
                <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />
                Loading metrics...
              </div>
            ) : (
              <div style={styles.metricsGrid}>
                {/* CPU Usage */}
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>
                    <i className="fa fa-microchip" style={{ marginRight: 4 }} />
                    CPU Usage
                  </span>
                  <span style={styles.metricValue}>
                    {health?.cpu_percent != null ? `${health.cpu_percent}%` : "--"}
                  </span>
                  <div style={styles.progressBarOuter}>
                    <div
                      style={{
                        width: `${health?.cpu_percent ?? 0}%`,
                        height: "100%",
                        borderRadius: "4px",
                        background: barColor(health?.cpu_percent ?? 0),
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Memory Usage */}
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>
                    <i className="fa fa-memory" style={{ marginRight: 4 }} />
                    Memory Usage
                  </span>
                  <span style={styles.metricValue}>
                    {health?.memory_percent != null ? `${health.memory_percent}%` : "--"}
                  </span>
                  <div style={styles.progressBarOuter}>
                    <div
                      style={{
                        width: `${health?.memory_percent ?? 0}%`,
                        height: "100%",
                        borderRadius: "4px",
                        background: barColor(health?.memory_percent ?? 0),
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <span style={styles.metricSub}>
                    {health?.memory_available_gb != null
                      ? `${health.memory_available_gb} GB available`
                      : ""}
                  </span>
                </div>

                {/* Disk Usage */}
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>
                    <i className="fa fa-hard-drive" style={{ marginRight: 4 }} />
                    Disk Usage
                  </span>
                  <span style={styles.metricValue}>
                    {health?.disk_percent != null ? `${health.disk_percent}%` : "--"}
                  </span>
                  <div style={styles.progressBarOuter}>
                    <div
                      style={{
                        width: `${health?.disk_percent ?? 0}%`,
                        height: "100%",
                        borderRadius: "4px",
                        background: barColor(health?.disk_percent ?? 0),
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <span style={styles.metricSub}>
                    {health?.disk_free_gb != null
                      ? `${health.disk_free_gb} GB free`
                      : ""}
                  </span>
                </div>

                {/* Totals */}
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>
                    <i className="fa fa-database" style={{ marginRight: 4 }} />
                    Records
                  </span>
                  <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.15rem" }}>
                    <div>
                      <span style={{ ...styles.metricValue, fontSize: "1.25rem" }}>
                        {health?.total_inspections != null
                          ? health.total_inspections.toLocaleString()
                          : "--"}
                      </span>
                      <div style={styles.metricSub}>Inspections</div>
                    </div>
                    <div>
                      <span style={{ ...styles.metricValue, fontSize: "1.25rem" }}>
                        {health?.total_clients != null
                          ? health.total_clients.toLocaleString()
                          : "--"}
                      </span>
                      <div style={styles.metricSub}>Clients</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Service Status Card ── */}
          <div style={styles.filterCard}>
            <div style={{ ...styles.filterTitle, justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <i className="fa fa-server" style={{ color: PRIMARY }} />
                Service Status
              </span>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  style={styles.serviceBtn("start")}
                  disabled={serviceActionLoading}
                  onClick={() => handleServiceAction("start-all")}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <i className={serviceActionLoading ? "fa fa-spinner fa-spin" : "fa fa-play"} />
                  Start All
                </button>
                <button
                  style={styles.serviceBtn("stop")}
                  disabled={serviceActionLoading}
                  onClick={() => handleServiceAction("stop-all")}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <i className={serviceActionLoading ? "fa fa-spinner fa-spin" : "fa fa-stop"} />
                  Stop All
                </button>
              </div>
            </div>

            {servicesLoading && services.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#9ca3af", fontSize: "0.8rem" }}>
                <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />
                Loading services...
              </div>
            ) : (
              <div>
                {displayServices.map((svc) => (
                  <div key={svc.name} style={styles.serviceRow}>
                    <div style={styles.statusDot(svc.running)} />
                    <span style={styles.serviceName}>{svc.name}</span>
                    <span style={styles.serviceStatusText(svc.running)}>
                      {svc.running ? "Running" : "Stopped"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search & Controls */}
        <div style={styles.filterCard}>
          <div style={styles.filterTitle}>
            <i className="fa fa-filter" />
            Filter Files &amp; Folders
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ ...styles.searchWrapper, position: "relative" }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 2 }}>Search</label>
              <i className="fa fa-search" style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search files and folders..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchDropdownOpen(true); }}
                onFocus={() => setSearchDropdownOpen(true)}
                onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 200)}
                style={styles.searchInput}
              />
              {searchDropdownOpen && search.length > 0 && (() => {
                const matches = tree.map(c => c.name).filter(n => n.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
                if (matches.length === 0) return null;
                return (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #d1d5db", borderRadius: "0 0 6px 6px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 200, overflowY: "auto" }}>
                    {matches.map(name => (
                      <div key={name} style={{ padding: "6px 10px", cursor: "pointer", fontSize: "0.8rem", borderBottom: "1px solid #f3f4f6" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#e6f3f7")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        onMouseDown={() => { setSearch(name.split(" — ")[0]); setSearchDropdownOpen(false); }}>
                        {name}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 2 }}>Date From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ padding: "0.5rem", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.8rem" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 2 }}>Date To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ padding: "0.5rem", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.8rem" }} />
            </div>
            {(dateFrom || dateTo || search) && (
              <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
                style={{ padding: "0.5rem 1rem", background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                <i className="fas fa-times" style={{ marginRight: 4 }} /> Clear
              </button>
            )}
          </div>

          <div style={styles.controlBtnRow}>
            <button
              style={styles.controlBtn}
              onClick={expandAll}
              onMouseEnter={(e) =>
                (e.currentTarget.style.opacity = "0.85")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.opacity = "1")
              }
            >
              <i className="fa fa-plus-square" /> Expand All
            </button>
            <button
              style={{
                ...styles.controlBtn,
                background: "#475569",
              }}
              onClick={collapseAll}
              onMouseEnter={(e) =>
                (e.currentTarget.style.opacity = "0.85")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.opacity = "1")
              }
            >
              <i className="fa fa-minus-square" /> Collapse All
            </button>
          </div>
        </div>

        {/* Directory Tree */}
        <div style={styles.treeContainer}>
          <div style={styles.treeHeading}>
            <i className="fa fa-sitemap" />
            Media Directory Structure
          </div>

          <div style={styles.treeFont}>
            {loading && (
              <div style={styles.spinner}>
                <i
                  className="fa fa-spinner fa-spin"
                  style={{ fontSize: "2rem", marginBottom: "0.75rem" }}
                />
                <p>Loading directory structure...</p>
              </div>
            )}

            {error && (
              <div style={styles.errorBox}>
                <i
                  className="fa fa-exclamation-triangle"
                  style={{
                    fontSize: "2rem",
                    color: "#f59e0b",
                    marginBottom: "0.75rem",
                  }}
                />
                <p>Error loading directory structure</p>
                <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                  {error}
                </p>
              </div>
            )}

            {!loading && !error && filteredTree.length === 0 && (
              <div style={styles.spinner}>
                <i
                  className="fa fa-folder-open"
                  style={{
                    fontSize: "2rem",
                    marginBottom: "0.75rem",
                    opacity: 0.5,
                  }}
                />
                <p>
                  {search
                    ? "No results matching your search."
                    : "No files found."}
                </p>
              </div>
            )}

            {!loading &&
              !error &&
              filteredTree.map((client) => renderClient(client))}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
