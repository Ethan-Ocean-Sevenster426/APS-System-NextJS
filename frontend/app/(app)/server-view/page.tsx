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

const PRIMARY = "#007890";

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
        if (Array.isArray(data?.services)) {
          setServices(data.services);
        }
        setServicesLoading(false);
      })
      .catch(() => setServicesLoading(false));
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchServices();
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

  const displayServices: ServiceInfo[] = Array.isArray(services) ? services : [];

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
      className="sv-node-row sv-file-row"
      style={{ paddingLeft: `calc(var(--sv-indent) * ${level} + 0.5rem)`, marginLeft: level > 0 ? `calc(var(--sv-indent) * ${level - 1} + 0.5rem)` : "0", borderLeft: level > 0 ? "1px solid #e5e7eb" : "none" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span className="sv-toggle-icon" />
      <span className="sv-icon">
        <i className="fa fa-file-pdf" style={{ color: "#ef4444" }} />
      </span>
      <span className="sv-file-name">{file.name}</span>
      <span className="sv-file-size">{formatFileSize(file.size)}</span>
      {filePath && (
        <span className="sv-file-actions">
          <a href={`/api/serve-file?file=${encodeURIComponent(filePath)}&action=view`}
            target="_blank" rel="noopener noreferrer"
            className="sv-file-btn sv-file-btn-view">
            <i className="fas fa-eye" /> <span className="sv-btn-label">View</span>
          </a>
          <a href={`/api/serve-file?file=${encodeURIComponent(filePath)}&action=download`}
            download={file.name}
            className="sv-file-btn sv-file-btn-download">
            <i className="fas fa-download" /> <span className="sv-btn-label">Download</span>
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
          className="sv-node-row"
          style={{ paddingLeft: `calc(var(--sv-indent) * ${level} + 0.5rem)`, marginLeft: level > 0 ? `calc(var(--sv-indent) * ${level - 1} + 0.5rem)` : "0", borderLeft: level > 0 ? "1px solid #e5e7eb" : "none" }}
          onClick={() => toggle(k)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span className="sv-toggle-icon">
            <i className={`fa ${isOpen ? "fa-chevron-down" : "fa-chevron-right"}`} />
          </span>
          <span className="sv-icon">
            <i className={`fa ${isOpen ? "fa-folder-open" : "fa-folder"}`} style={{ color: "#f59e0b" }} />
          </span>
          <span className="sv-folder-name">{cat.name}</span>
          <span className="sv-badge">{cat.files.length} files</span>
        </div>
        {isOpen && cat.files.map((file, idx) => renderFile(file, level + 1, idx, file.path))}
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
          className="sv-node-row"
          style={{ paddingLeft: `calc(var(--sv-indent) * ${level} + 0.5rem)`, marginLeft: level > 0 ? `calc(var(--sv-indent) * ${level - 1} + 0.5rem)` : "0", borderLeft: level > 0 ? "1px solid #e5e7eb" : "none" }}
          onClick={() => toggle(k)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span className="sv-toggle-icon">
            <i className={`fa ${isOpen ? "fa-chevron-down" : "fa-chevron-right"}`} />
          </span>
          <span className="sv-icon">
            <i className={`fa ${isOpen ? "fa-folder-open" : "fa-folder"}`} style={{ color: "#f59e0b" }} />
          </span>
          <span className="sv-folder-name">{insp.name}</span>
        </div>
        {isOpen && insp.children.map((cat) => renderCategory(cat, clientName, insp.name, level + 1))}
      </div>
    );
  };

  const renderClient = (client: ClientNode) => {
    const k = key(client.name);
    const isOpen = effectiveExpanded.has(k);
    return (
      <div key={k}>
        <div
          className="sv-node-row sv-client-row"
          onClick={() => toggle(k)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span className="sv-toggle-icon">
            <i className={`fa ${isOpen ? "fa-chevron-down" : "fa-chevron-right"}`} />
          </span>
          <span className="sv-icon">
            <i className={`fa ${isOpen ? "fa-folder-open" : "fa-folder"}`} style={{ color: "#f59e0b" }} />
          </span>
          <span className="sv-folder-name" style={{ fontSize: "0.95rem" }}>{client.name}</span>
        </div>
        {isOpen && client.children.map((insp) => renderInspection(insp, client.name, 1))}
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
      <style>{`
/* Server View - CSS Variables */
:root { --sv-indent: 1.5rem; }

/* Container */
.sv-container { width: 100%; max-width: 100%; padding: 1.5rem; box-sizing: border-box; min-height: 100vh; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }

/* Header */
.sv-header { font-size: 1.4rem; font-weight: 700; color: #fff; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }

/* Cards row (health + services) */
.sv-cards-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }

/* Card */
.sv-card { background: #ffffff; border-radius: 8px; padding: 1rem 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
.sv-card-title { font-size: 0.8125rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.375rem; }

/* Metrics grid */
.sv-metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
.sv-metric-item { display: flex; flex-direction: column; gap: 0.35rem; }
.sv-metric-label { font-size: 0.7rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
.sv-metric-value { font-size: 1.5rem; font-weight: 700; color: #1f2937; line-height: 1.1; }
.sv-metric-sub { font-size: 0.7rem; color: #9ca3af; font-weight: 500; }
.sv-progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 0.2rem; }

/* Service row */
.sv-service-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6; }
.sv-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.sv-service-name { flex: 1; font-size: 0.825rem; font-weight: 500; color: #374151; }
.sv-service-status { font-size: 0.7rem; font-weight: 600; }

/* Service buttons */
.sv-svc-btn-group { display: flex; gap: 0.4rem; }
.sv-svc-btn { padding: 0.4rem 1rem; color: #fff; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; font-weight: 600; transition: opacity 0.2s; }
.sv-svc-btn:hover { opacity: 0.85; }
.sv-svc-btn-start { background: #22c55e; }
.sv-svc-btn-stop { background: #ef4444; }

/* Filter row */
.sv-filter-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end; }
.sv-search-wrapper { position: relative; flex: 1; min-width: 200px; }
.sv-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #6b7280; font-size: 14px; pointer-events: none; }
.sv-search-input { width: 100%; padding: 0.5rem 2rem 0.5rem 2.25rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.8rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; color: #1f2937; box-sizing: border-box; }
.sv-search-input:focus { border-color: #007890; box-shadow: 0 0 0 3px #e6f3f7; }
.sv-date-input { padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.8rem; }
.sv-filter-label { font-size: 0.7rem; font-weight: 600; color: #6b7280; display: block; margin-bottom: 2px; }
.sv-clear-btn { padding: 0.5rem 1rem; background: #6b7280; color: #fff; border: none; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }

/* Control buttons */
.sv-control-row { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
.sv-ctrl-btn { padding: 0.4rem 0.85rem; color: #fff; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; font-weight: 500; transition: opacity 0.2s; }
.sv-ctrl-btn:hover { opacity: 0.85; }

/* Tree container */
.sv-tree-card { background: #ffffff; border-radius: 8px; padding: 1.5rem; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.sv-tree-heading { display: flex; align-items: center; font-size: 1.15rem; font-weight: 600; color: #1f2937; margin-bottom: 1rem; gap: 0.75rem; }
.sv-tree-font { font-family: 'Courier New', monospace; font-size: 0.875rem; color: #374151; }

/* Node row */
.sv-node-row { display: flex; align-items: center; padding: 0.45rem 0.5rem; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.15s; gap: 0.5rem; }
.sv-client-row { border-bottom: 1px solid #e5e7eb; }
.sv-folder-name { flex: 1; font-weight: 600; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sv-file-name { flex: 1; font-weight: 400; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sv-badge { margin-left: auto; background: #f3f4f6; color: #6b7280; font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 9999px; font-weight: 500; white-space: nowrap; }
.sv-file-size { margin-left: 0.75rem; color: #9ca3af; font-size: 0.8rem; white-space: nowrap; }
.sv-icon { margin-right: 0.6rem; width: 1.1rem; text-align: center; flex-shrink: 0; }
.sv-toggle-icon { width: 1rem; text-align: center; margin-right: 0.35rem; color: #9ca3af; flex-shrink: 0; }

/* File action buttons */
.sv-file-actions { display: flex; gap: 4px; flex-shrink: 0; }
.sv-file-btn { padding: 2px 8px; color: #fff; border-radius: 4px; font-size: 0.65rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
.sv-file-btn-view { background: #007890; }
.sv-file-btn-download { background: #3b82f6; }

/* Search dropdown */
.sv-search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #d1d5db; border-radius: 0 0 6px 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); z-index: 9999; max-height: 200px; overflow-y: auto; }
.sv-search-dropdown-item { padding: 6px 10px; cursor: pointer; font-size: 0.8rem; border-bottom: 1px solid #f3f4f6; }
.sv-search-dropdown-item:hover { background: #e6f3f7; }

/* Loading / Error */
.sv-loading { text-align: center; padding: 3rem; color: #9ca3af; }
.sv-empty { text-align: center; padding: 3rem; color: #9ca3af; }

/* Service title row */
.sv-svc-title-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.8125rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem; gap: 0.375rem; }

/* Responsive breakpoints */
@media (max-width: 768px) {
  :root { --sv-indent: 1rem; }
  .sv-container { padding: 0.75rem; }
  .sv-header { font-size: 1.15rem; }
  .sv-cards-row { grid-template-columns: 1fr; }
  .sv-metrics-grid { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .sv-metric-value { font-size: 1.25rem; }
  .sv-filter-row { flex-direction: column; }
  .sv-search-wrapper { min-width: 0; width: 100%; }
  .sv-control-row { width: 100%; }
  .sv-ctrl-btn { flex: 1; justify-content: center; }
  .sv-tree-card { padding: 0.75rem; }
  .sv-tree-heading { font-size: 0.95rem; }
  .sv-tree-font { font-size: 0.75rem; }
  .sv-node-row { padding: 0.35rem 0.25rem; }
  .sv-folder-name { font-size: 0.8rem; }
  .sv-file-name { font-size: 0.7rem; }
  .sv-file-size { font-size: 0.65rem; margin-left: 0.35rem; }
  .sv-file-btn { padding: 2px 5px; font-size: 0.6rem; }
  .sv-btn-label { display: none; }
  .sv-svc-btn { padding: 0.3rem 0.6rem; font-size: 0.7rem; }
  .sv-svc-title-row { flex-wrap: wrap; gap: 6px; }
  .sv-card { padding: 0.75rem; }
}
@media (max-width: 480px) {
  :root { --sv-indent: 0.75rem; }
  .sv-container { padding: 0.5rem; }
  .sv-header { font-size: 1rem; }
  .sv-metrics-grid { grid-template-columns: 1fr; }
  .sv-svc-btn-group { flex-direction: column; width: 100%; }
  .sv-svc-btn { justify-content: center; width: 100%; }
  .sv-svc-title-row { flex-direction: column; align-items: stretch; }
  .sv-file-actions { flex-direction: column; gap: 2px; }
  .sv-icon { margin-right: 0.3rem; width: 0.9rem; }
  .sv-badge { font-size: 0.6rem; padding: 0.1rem 0.35rem; }
}
      `}</style>

      <div className="sv-container">
        <div style={{ width: "100%" }}>
        {/* Page Title */}
        <h1 className="sv-header">
          <i className="fa fa-database" style={{ color: "#5ee8ff" }} />
          Server View
        </h1>

        {/* Server Health & Service Status */}
        <div className="sv-cards-row">
          {/* ── Server Health Card ── */}
          <div className="sv-card">
            <div className="sv-card-title">
              <i className="fa fa-heartbeat" style={{ color: "#ef4444" }} />
              Server Health
            </div>

            {healthLoading && !health ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#9ca3af", fontSize: "0.8rem" }}>
                <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />
                Loading metrics...
              </div>
            ) : (
              <div className="sv-metrics-grid">
                {/* CPU Usage */}
                <div className="sv-metric-item">
                  <span className="sv-metric-label">
                    <i className="fa fa-microchip" style={{ marginRight: 4 }} />
                    CPU Usage
                  </span>
                  <span className="sv-metric-value">
                    {health?.cpu_percent != null ? `${health.cpu_percent}%` : "--"}
                  </span>
                  <div className="sv-progress-bar">
                    <div style={{ width: `${health?.cpu_percent ?? 0}%`, height: "100%", borderRadius: "4px", background: barColor(health?.cpu_percent ?? 0), transition: "width 0.5s ease" }} />
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="sv-metric-item">
                  <span className="sv-metric-label">
                    <i className="fa fa-memory" style={{ marginRight: 4 }} />
                    Memory Usage
                  </span>
                  <span className="sv-metric-value">
                    {health?.memory_percent != null ? `${health.memory_percent}%` : "--"}
                  </span>
                  <div className="sv-progress-bar">
                    <div style={{ width: `${health?.memory_percent ?? 0}%`, height: "100%", borderRadius: "4px", background: barColor(health?.memory_percent ?? 0), transition: "width 0.5s ease" }} />
                  </div>
                  <span className="sv-metric-sub">
                    {health?.memory_available_gb != null ? `${health.memory_available_gb} GB available` : ""}
                  </span>
                </div>

                {/* Disk Usage */}
                <div className="sv-metric-item">
                  <span className="sv-metric-label">
                    <i className="fa fa-hard-drive" style={{ marginRight: 4 }} />
                    Disk Usage
                  </span>
                  <span className="sv-metric-value">
                    {health?.disk_percent != null ? `${health.disk_percent}%` : "--"}
                  </span>
                  <div className="sv-progress-bar">
                    <div style={{ width: `${health?.disk_percent ?? 0}%`, height: "100%", borderRadius: "4px", background: barColor(health?.disk_percent ?? 0), transition: "width 0.5s ease" }} />
                  </div>
                  <span className="sv-metric-sub">
                    {health?.disk_free_gb != null ? `${health.disk_free_gb} GB free` : ""}
                  </span>
                </div>

                {/* Totals */}
                <div className="sv-metric-item">
                  <span className="sv-metric-label">
                    <i className="fa fa-database" style={{ marginRight: 4 }} />
                    Records
                  </span>
                  <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.15rem" }}>
                    <div>
                      <span className="sv-metric-value" style={{ fontSize: "1.25rem" }}>
                        {health?.total_inspections != null ? health.total_inspections.toLocaleString() : "--"}
                      </span>
                      <div className="sv-metric-sub">Inspections</div>
                    </div>
                    <div>
                      <span className="sv-metric-value" style={{ fontSize: "1.25rem" }}>
                        {health?.total_clients != null ? health.total_clients.toLocaleString() : "--"}
                      </span>
                      <div className="sv-metric-sub">Clients</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Service Status Card ── */}
          <div className="sv-card">
            <div className="sv-svc-title-row">
              <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <i className="fa fa-server" style={{ color: PRIMARY }} />
                Service Status
              </span>
              <div className="sv-svc-btn-group">
                <button
                  className="sv-svc-btn sv-svc-btn-start"
                  disabled={serviceActionLoading}
                  onClick={() => handleServiceAction("start-all")}
                >
                  <i className={serviceActionLoading ? "fa fa-spinner fa-spin" : "fa fa-play"} />
                  Start All
                </button>
                <button
                  className="sv-svc-btn sv-svc-btn-stop"
                  disabled={serviceActionLoading}
                  onClick={() => handleServiceAction("stop-all")}
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
            ) : displayServices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#9ca3af", fontSize: "0.8rem" }}>
                No services found
              </div>
            ) : (
              <div>
                {displayServices.map((svc) => (
                  <div key={svc.name} className="sv-service-row">
                    <div className="sv-status-dot" style={{ background: svc.running ? "#22c55e" : "#ef4444", boxShadow: svc.running ? "0 0 6px rgba(34,197,94,0.4)" : "0 0 6px rgba(239,68,68,0.4)" }} />
                    <span className="sv-service-name">{svc.name}</span>
                    <span className="sv-service-status" style={{ color: svc.running ? "#16a34a" : "#dc2626" }}>
                      {svc.running ? "Running" : "Stopped"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search & Controls */}
        <div className="sv-card" style={{ marginBottom: "1rem" }}>
          <div className="sv-card-title">
            <i className="fa fa-filter" />
            Filter Files &amp; Folders
          </div>

          <div className="sv-filter-row">
            <div className="sv-search-wrapper">
              <label className="sv-filter-label">Search</label>
              <i className="fa fa-search sv-search-icon" />
              <input
                type="text"
                placeholder="Search files and folders..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchDropdownOpen(true); }}
                onFocus={() => setSearchDropdownOpen(true)}
                onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 200)}
                className="sv-search-input"
              />
              {searchDropdownOpen && search.length > 0 && (() => {
                const matches = tree.map(c => c.name).filter(n => n.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
                if (matches.length === 0) return null;
                return (
                  <div className="sv-search-dropdown">
                    {matches.map(name => (
                      <div key={name} className="sv-search-dropdown-item"
                        onMouseDown={() => { setSearch(name.split(" — ")[0]); setSearchDropdownOpen(false); }}>
                        {name}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="sv-filter-label">Date From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="sv-date-input" />
            </div>
            <div>
              <label className="sv-filter-label">Date To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="sv-date-input" />
            </div>
            {(dateFrom || dateTo || search) && (
              <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }} className="sv-clear-btn">
                <i className="fas fa-times" style={{ marginRight: 4 }} /> Clear
              </button>
            )}
          </div>

          <div className="sv-control-row">
            <button className="sv-ctrl-btn" style={{ background: PRIMARY }} onClick={expandAll}>
              <i className="fa fa-plus-square" /> Expand All
            </button>
            <button className="sv-ctrl-btn" style={{ background: "#475569" }} onClick={collapseAll}>
              <i className="fa fa-minus-square" /> Collapse All
            </button>
          </div>
        </div>

        {/* Directory Tree */}
        <div className="sv-tree-card">
          <div className="sv-tree-heading">
            <i className="fa fa-sitemap" />
            Media Directory Structure
          </div>

          <div className="sv-tree-font">
            {loading && (
              <div className="sv-loading">
                <i className="fa fa-spinner fa-spin" style={{ fontSize: "2rem", marginBottom: "0.75rem" }} />
                <p>Loading directory structure...</p>
              </div>
            )}

            {error && (
              <div className="sv-loading">
                <i className="fa fa-exclamation-triangle" style={{ fontSize: "2rem", color: "#f59e0b", marginBottom: "0.75rem" }} />
                <p>Error loading directory structure</p>
                <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>{error}</p>
              </div>
            )}

            {!loading && !error && filteredTree.length === 0 && (
              <div className="sv-empty">
                <i className="fa fa-folder-open" style={{ fontSize: "2rem", marginBottom: "0.75rem", opacity: 0.5 }} />
                <p>{search ? "No results matching your search." : "No files found."}</p>
              </div>
            )}

            {!loading && !error && filteredTree.map((client) => renderClient(client))}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
