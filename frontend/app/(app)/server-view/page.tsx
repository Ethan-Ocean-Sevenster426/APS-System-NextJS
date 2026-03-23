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
};

// ── Component ──────────────────────────────────────────────────────
export default function ServerViewPage() {
  const [tree, setTree] = useState<ClientNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
    if (!lowerSearch) return tree;

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

            if (
              matchesSearch(insp.name) ||
              filteredCategories.length > 0
            ) {
              return {
                ...insp,
                children: matchesSearch(insp.name)
                  ? insp.children
                  : filteredCategories,
              };
            }
            return null;
          })
          .filter(Boolean) as InspectionNode[];

        if (
          matchesSearch(client.name) ||
          filteredInspections.length > 0
        ) {
          return {
            ...client,
            children: matchesSearch(client.name)
              ? client.children
              : filteredInspections,
          };
        }
        return null;
      })
      .filter(Boolean) as ClientNode[];
  }, [tree, lowerSearch, matchesSearch]);

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

        {/* Search & Controls */}
        <div style={styles.filterCard}>
          <div style={styles.filterTitle}>
            <i className="fa fa-filter" />
            Filter Files &amp; Folders
          </div>

          <div style={styles.searchWrapper}>
            <i className="fa fa-search" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = PRIMARY;
                e.currentTarget.style.boxShadow = `0 0 0 3px #e6f3f7`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {search && (
              <button
                style={styles.clearBtn}
                onClick={() => setSearch("")}
                title="Clear search"
              >
                <i className="fa fa-times" />
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
