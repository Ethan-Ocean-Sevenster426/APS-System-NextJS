"use client";

import { useState, useEffect, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Invoice {
  invoice_number: string;
  reference: string;
  date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  days_outstanding: number;
}

interface Aging {
  current: number;
  "1_30": number;
  "31_60": number;
  "61_90": number;
  "91_120": number;
  "120_plus": number;
}

interface Client {
  contact_name: string;
  invoice_count: number;
  outstanding_count: number;
  paid_count: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  overdue_amount: number;
  aging: Aging;
  invoices: Invoice[];
}

interface DebtorsData {
  success: boolean;
  clients: Client[];
  grand_invoiced: number;
  grand_paid: number;
  grand_outstanding: number;
  grand_overdue: number;
  client_count: number;
  xero_connected: boolean;
  tenant_name: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const PRIMARY = "#007890";
const PRIMARY_LIGHT = "#e6f3f7";
const PRIMARY_DARK = "#005a6b";
const BORDER = "#e5e7eb";
const TEXT = "#1f2937";
const TEXT_LIGHT = "#6b7280";
const SHADOW = "0 1px 3px rgba(0,0,0,0.05)";

function R(n: number | null | undefined): string {
  if (n == null) return "R 0.00";
  return (
    "R " +
    n.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function R0(n: number | null | undefined): string {
  if (n == null || n === 0) return "";
  return (
    "R " +
    n.toLocaleString("en-ZA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "\u2014";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "\u2014";
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Badge helpers                                                      */
/* ------------------------------------------------------------------ */
const badgeBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: "9999px",
  fontSize: "10px",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const badges: Record<string, React.CSSProperties> = {
  green: { ...badgeBase, background: "#dcfce7", color: "#166534" },
  red: { ...badgeBase, background: "#fee2e2", color: "#991b1b" },
  amber: { ...badgeBase, background: "#fef3c7", color: "#92400e" },
  orange: { ...badgeBase, background: "#fff7ed", color: "#9a3412" },
  gray: { ...badgeBase, background: "#f3f4f6", color: "#6b7280" },
  "dark-red": { ...badgeBase, background: "#fecaca", color: "#7f1d1d" },
  blue: { ...badgeBase, background: "#dbeafe", color: "#1e40af" },
};

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  if (s === "PAID")
    return (
      <span style={badges.green}>
        <i className="fas fa-check" style={{ fontSize: 8, marginRight: 2 }} /> PAID
      </span>
    );
  if (s === "AUTHORISED") return <span style={badges.blue}>AUTHORISED</span>;
  if (s === "OVERDUE") return <span style={badges.red}>OVERDUE</span>;
  if (s === "DRAFT") return <span style={badges.gray}>DRAFT</span>;
  if (s === "SUBMITTED") return <span style={badges.gray}>SUBMITTED</span>;
  return <span style={badges.gray}>{s}</span>;
}

function AgingBadge({ value, color }: { value: number; color: string }) {
  if (!value || value <= 0) return <span style={{ color: "#d1d5db" }}>{"\u2014"}</span>;
  return <span style={badges[color]}>{R0(value)}</span>;
}

function DaysBadge({ days, status }: { days: number; status: string }) {
  if ((status || "").toUpperCase() === "PAID")
    return <span style={{ color: "#d1d5db" }}>{"\u2014"}</span>;
  if (days <= 0) return <span style={badges.green}>Current</span>;
  if (days <= 30) return <span style={badges.amber}>{days}d</span>;
  if (days <= 60) return <span style={badges.orange}>{days}d</span>;
  if (days <= 90) return <span style={badges.red}>{days}d</span>;
  return <span style={badges["dark-red"]}>{days}d</span>;
}

function ClientStatusBadge({ client }: { client: Client }) {
  if (client.total_outstanding === 0)
    return (
      <span style={badges.green}>
        <i className="fas fa-check" style={{ fontSize: 8, marginRight: 2 }} /> Paid
      </span>
    );
  const worst = getWorstBucket(client);
  if (worst === "Current") return <span style={badges.green}>Current</span>;
  if (worst === "1-30") return <span style={badges.amber}>1-30d Late</span>;
  if (worst === "31-60") return <span style={badges.orange}>31-60d Late</span>;
  if (worst === "61-90") return <span style={badges.red}>61-90d Late</span>;
  if (worst === "91-120") return <span style={badges["dark-red"]}>91-120d Late</span>;
  return <span style={badges["dark-red"]}>120+d Late</span>;
}

function getWorstBucket(client: Client): string {
  const a = client.aging;
  if (a["120_plus"] > 0) return "120+";
  if (a["91_120"] > 0) return "91-120";
  if (a["61_90"] > 0) return "61-90";
  if (a["31_60"] > 0) return "31-60";
  if (a["1_30"] > 0) return "1-30";
  return "Current";
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function DebtorsPage() {
  const [data, setData] = useState<DebtorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/debtors")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: DebtorsData) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const filteredClients = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.clients;
    const q = search.toLowerCase();
    return data.clients.filter((c) =>
      c.contact_name.toLowerCase().includes(q)
    );
  }, [data, search]);

  const toggleRow = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const expandAll = () =>
    setExpanded(new Set(filteredClients.map((_, i) => i)));
  const collapseAll = () => setExpanded(new Set());

  /* ---------- Render ---------- */
  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: 16 }}>
      {/* ---- Action Bar ---- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={expandAll}
            disabled={loading}
            style={{ padding: "5px 12px", fontSize: 12, fontWeight: 500, color: loading ? "#9ca3af" : TEXT, background: "white", border: `1px solid ${BORDER}`, borderRadius: 5, cursor: loading ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: "0.01em" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = PRIMARY; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}
          >
            <i className="fas fa-chevron-down" style={{ fontSize: 10 }} /> Expand All
          </button>
          <button
            onClick={collapseAll}
            disabled={loading}
            style={{ padding: "5px 12px", fontSize: 12, fontWeight: 500, color: loading ? "#9ca3af" : TEXT, background: "white", border: `1px solid ${BORDER}`, borderRadius: 5, cursor: loading ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: "0.01em" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = PRIMARY; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}
          >
            <i className="fas fa-chevron-right" style={{ fontSize: 10 }} /> Collapse All
          </button>
        </div>
        {loading && <span style={{ fontSize: 12, color: TEXT_LIGHT, display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${BORDER}`, borderTopColor: PRIMARY, animation: "spin 0.8s linear infinite", flexShrink: 0 }} /> Fetching data…</span>}
        {error && <span style={{ fontSize: 12, color: "#dc2626" }}><i className="fas fa-exclamation-triangle" style={{ marginRight: 5 }} />Failed to load: {error}</span>}
      </div>

      {/* ---- Summary Stats ---- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <StatCard
          label="Total Invoiced"
          value={loading ? "—" : R(data?.grand_invoiced)}
          color={PRIMARY}
          sub={loading ? "" : `${data?.client_count} client${data?.client_count === 1 ? "" : "s"}`}
        />
        <StatCard label="Total Paid" value={loading ? "—" : R(data?.grand_paid)} color="#16a34a" />
        <StatCard label="Outstanding" value={loading ? "—" : R(data?.grand_outstanding)} color="#ea580c" />
        <StatCard label="Overdue" value={loading ? "—" : R(data?.grand_overdue)} color="#dc2626" />
      </div>

      {/* ---- Filter / Search ---- */}
      <div
        style={{
          background: "white",
          borderRadius: 6,
          boxShadow: SHADOW,
          border: `1px solid ${BORDER}`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 700,
            color: TEXT,
          }}
        >
          <i className="fas fa-filter" style={{ color: PRIMARY }} /> Filters
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: TEXT_LIGHT,
                textTransform: "uppercase",
              }}
            >
              Client Search
            </label>
            <input
              type="text"
              placeholder="Search client name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                fontSize: 12,
                color: TEXT,
                background: "white",
                minWidth: 140,
                maxWidth: 320,
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = PRIMARY;
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(0,120,144,0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
        </div>
      </div>

      {/* ---- Debtors Table Card ---- */}
      <div
        style={{
          background: "white",
          borderRadius: 6,
          boxShadow: SHADOW,
          border: `1px solid ${BORDER}`,
          marginBottom: 16,
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: TEXT,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="fas fa-users" style={{ color: PRIMARY }} />
            Debtors List
            <span style={{ fontSize: 11, fontWeight: 400, color: TEXT_LIGHT }}>
              {loading ? "" : `(${filteredClients.length} client${filteredClients.length === 1 ? "" : "s"})`}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: TEXT_LIGHT }}>
              <div style={{ display: "inline-block", width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: PRIMARY, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ marginTop: 14, fontSize: 13 }}>Loading invoice data…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <i
                className="fas fa-check-circle"
                style={{ fontSize: 40, color: "#22c55e", marginBottom: 12, display: "block" }}
              />
              <p style={{ fontWeight: 600, color: TEXT, fontSize: 14 }}>
                No debtors found
              </p>
              <p
                style={{
                  color: TEXT_LIGHT,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {search
                  ? "Try changing your search"
                  : "Sync invoices from Xero to get started"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1200,
                }}
              >
                <thead>
                  <tr
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 100,
                      backgroundColor: PRIMARY_LIGHT,
                    }}
                  >
                    {[
                      { label: "", w: 30, align: "center" as const },
                      { label: "Client", align: "left" as const },
                      { label: "Invoices", align: "center" as const },
                      { label: "Total Invoiced", align: "right" as const },
                      { label: "Paid", align: "right" as const },
                      { label: "Outstanding", align: "right" as const },
                      { label: "Overdue", align: "right" as const },
                      { label: "Current", align: "center" as const },
                      { label: "1-30d", align: "center" as const },
                      { label: "31-60d", align: "center" as const },
                      { label: "61-90d", align: "center" as const },
                      { label: "91-120d", align: "center" as const },
                      { label: "120+d", align: "center" as const },
                      { label: "Status", align: "center" as const },
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "8px 12px",
                          textAlign: h.align,
                          fontSize: 11,
                          fontWeight: 600,
                          color: TEXT,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                          width: h.w,
                        }}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client, idx) => (
                    <ClientRow
                      key={idx}
                      client={client}
                      idx={idx}
                      isExpanded={expanded.has(idx)}
                      onToggle={() => toggleRow(idx)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 10,
        padding: 16,
        border: `1px solid ${BORDER}`,
        boxShadow: SHADOW,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: TEXT_LIGHT,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  border: `1px solid ${BORDER}`,
  background: "white",
  color: TEXT_LIGHT,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

/* ------------------------------------------------------------------ */
/*  Client Row (group + detail)                                        */
/* ------------------------------------------------------------------ */
function ClientRow({
  client,
  idx,
  isExpanded,
  onToggle,
}: {
  client: Client;
  idx: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Group Row */}
      <tr
        onClick={onToggle}
        style={{
          background: "white",
          borderLeft: `3px solid ${PRIMARY}`,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = PRIMARY_LIGHT)
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
      >
        <td style={{ textAlign: "center", padding: "8px 12px" }}>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: PRIMARY,
              fontSize: 12,
              padding: 2,
            }}
          >
            <i
              className={`fas fa-chevron-${isExpanded ? "down" : "right"}`}
            />
          </button>
        </td>
        <td
          style={{
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 700,
            color: TEXT,
            whiteSpace: "nowrap",
          }}
        >
          <i
            className="fas fa-building"
            style={{ color: PRIMARY, marginRight: 6, fontSize: 11 }}
          />
          {client.contact_name}
          <span
            style={{
              fontSize: 10,
              color: TEXT_LIGHT,
              fontWeight: 400,
              marginLeft: 4,
            }}
          >
            ({client.outstanding_count} outstanding, {client.paid_count} paid)
          </span>
        </td>
        <td
          style={{
            textAlign: "center",
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {client.invoice_count}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {R(client.total_invoiced)}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 700,
            color: "#16a34a",
            whiteSpace: "nowrap",
          }}
        >
          {R(client.total_paid)}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 700,
            color: client.total_outstanding > 0 ? "#ea580c" : "#16a34a",
            whiteSpace: "nowrap",
          }}
        >
          {R(client.total_outstanding)}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 700,
            color: client.overdue_amount > 0 ? "#dc2626" : TEXT_LIGHT,
            whiteSpace: "nowrap",
          }}
        >
          {R(client.overdue_amount)}
        </td>
        {/* Aging columns */}
        <td style={{ textAlign: "center", padding: "8px 12px" }}>
          <AgingBadge value={client.aging.current} color="green" />
        </td>
        <td style={{ textAlign: "center", padding: "8px 12px" }}>
          <AgingBadge value={client.aging["1_30"]} color="amber" />
        </td>
        <td style={{ textAlign: "center", padding: "8px 12px" }}>
          <AgingBadge value={client.aging["31_60"]} color="orange" />
        </td>
        <td style={{ textAlign: "center", padding: "8px 12px" }}>
          <AgingBadge value={client.aging["61_90"]} color="red" />
        </td>
        <td style={{ textAlign: "center", padding: "8px 12px" }}>
          <AgingBadge value={client.aging["91_120"]} color="dark-red" />
        </td>
        <td style={{ textAlign: "center", padding: "8px 12px" }}>
          <AgingBadge value={client.aging["120_plus"]} color="dark-red" />
        </td>
        <td style={{ textAlign: "center", padding: "8px 12px" }}>
          <ClientStatusBadge client={client} />
        </td>
      </tr>

      {/* Detail Row */}
      {isExpanded && (
        <tr style={{ background: "#f8f9fa" }}>
          <td colSpan={14} style={{ padding: 0 }}>
            <div style={{ background: "#f8fafc", padding: "8px 12px" }}>
              {/* Detail Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{ fontSize: 12, fontWeight: 700, color: TEXT }}
                >
                  <i
                    className="fas fa-file-invoice"
                    style={{ color: PRIMARY, marginRight: 4 }}
                  />
                  Invoices for {client.contact_name}
                </div>
              </div>

              {/* Invoice Headers */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "4px 12px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: TEXT_LIGHT,
                  textTransform: "uppercase",
                  borderBottom: "2px solid #e5e7eb",
                }}
              >
                <div style={{ flex: "0 0 120px" }}>Invoice #</div>
                <div style={{ flex: "0 0 120px" }}>Reference</div>
                <div style={{ flex: "0 0 100px" }}>Date</div>
                <div style={{ flex: "0 0 100px" }}>Due Date</div>
                <div style={{ flex: "0 0 110px", textAlign: "right" }}>
                  Total
                </div>
                <div style={{ flex: "0 0 110px", textAlign: "right" }}>
                  Paid
                </div>
                <div style={{ flex: "0 0 110px", textAlign: "right" }}>
                  Amount Due
                </div>
                <div style={{ flex: "0 0 70px", textAlign: "center" }}>
                  Days
                </div>
                <div style={{ flex: "0 0 90px", textAlign: "center" }}>
                  Status
                </div>
              </div>

              {/* Invoice Rows */}
              {client.invoices.map((inv, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "6px 12px",
                    borderBottom: "1px solid #eee",
                    fontSize: 12,
                    alignItems: "center",
                    opacity:
                      (inv.status || "").toUpperCase() === "PAID"
                        ? 0.6
                        : 1,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f0f4f8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      flex: "0 0 120px",
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 600,
                      color: PRIMARY,
                      fontSize: 11,
                    }}
                  >
                    {inv.invoice_number || "\u2014"}
                  </div>
                  <div
                    style={{
                      flex: "0 0 120px",
                      color: TEXT_LIGHT,
                      fontSize: 11,
                    }}
                  >
                    {inv.reference || "\u2014"}
                  </div>
                  <div style={{ flex: "0 0 100px", fontSize: 11 }}>
                    {fmtDate(inv.date)}
                  </div>
                  <div
                    style={{
                      flex: "0 0 100px",
                      fontSize: 11,
                      ...(inv.due_date &&
                        new Date(inv.due_date) < new Date() &&
                        (inv.status || "").toUpperCase() !== "PAID"
                        ? { color: "#dc2626", fontWeight: 700 }
                        : {}),
                    }}
                  >
                    {fmtDate(inv.due_date)}
                  </div>
                  <div
                    style={{
                      flex: "0 0 110px",
                      textAlign: "right",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {R(inv.total)}
                  </div>
                  <div
                    style={{
                      flex: "0 0 110px",
                      textAlign: "right",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#16a34a",
                    }}
                  >
                    {R(inv.amount_paid)}
                  </div>
                  <div
                    style={{
                      flex: "0 0 110px",
                      textAlign: "right",
                      fontSize: 11,
                      fontWeight: 700,
                      color: inv.amount_due > 0 ? "#dc2626" : "#16a34a",
                    }}
                  >
                    {R(inv.amount_due)}
                  </div>
                  <div style={{ flex: "0 0 70px", textAlign: "center" }}>
                    <DaysBadge
                      days={inv.days_outstanding}
                      status={inv.status}
                    />
                  </div>
                  <div style={{ flex: "0 0 90px", textAlign: "center" }}>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}

              {/* Client Total Row */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "8px 12px",
                  fontSize: 11,
                  fontWeight: 800,
                  borderTop: `2px solid ${PRIMARY}`,
                  background: PRIMARY_LIGHT,
                }}
              >
                <div style={{ flex: "0 0 120px", color: TEXT }}>TOTAL</div>
                <div style={{ flex: "0 0 120px" }} />
                <div style={{ flex: "0 0 100px" }} />
                <div style={{ flex: "0 0 100px" }} />
                <div style={{ flex: "0 0 110px", textAlign: "right" }}>
                  {R(client.total_invoiced)}
                </div>
                <div
                  style={{
                    flex: "0 0 110px",
                    textAlign: "right",
                    color: "#16a34a",
                  }}
                >
                  {R(client.total_paid)}
                </div>
                <div
                  style={{
                    flex: "0 0 110px",
                    textAlign: "right",
                    color:
                      client.total_outstanding > 0 ? "#dc2626" : "#16a34a",
                  }}
                >
                  {R(client.total_outstanding)}
                </div>
                <div style={{ flex: "0 0 70px" }} />
                <div style={{ flex: "0 0 90px" }} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
