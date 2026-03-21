"use client";

import { useState, FormEvent } from "react";

const issueTypes = [
  {
    group: "System Issues",
    options: ["Bug Report", "Performance Issue", "Login / Authentication"],
  },
  {
    group: "Inspections",
    options: ["Upload Issue", "Missing Data", "Sync Problem"],
  },
  {
    group: "Invoicing",
    options: ["Export Issue", "Fee Calculation"],
  },
  {
    group: "Other",
    options: ["Feature Request", "Other"],
  },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: "0.9rem",
  outline: "none",
  transition: "border 0.15s",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

export default function SubmitTicketPage() {
  const [issueType, setIssueType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [browserInfo, setBrowserInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const resetForm = () => {
    setIssueType("");
    setTitle("");
    setDescription("");
    setBrowserInfo("");
    setNotes("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_type: issueType,
          title: title.trim(),
          description: description.trim(),
          browser_info: browserInfo.trim(),
          notes: notes.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      showToast("Ticket submitted successfully!");
      resetForm();
    } catch {
      showToast("Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            background: toast.includes("success") ? "#059669" : "#dc2626",
            color: "#fff",
            padding: "14px 24px",
            borderRadius: 10,
            fontSize: "0.9rem",
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <i className={`fas ${toast.includes("success") ? "fa-check-circle" : "fa-exclamation-circle"}`} />
          {toast}
        </div>
      )}

      {/* Form Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          padding: "36px",
          width: "100%",
          maxWidth: 680,
        }}
      >
      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", display: "inline-flex", alignItems: "center", gap: 10, margin: "0 0 6px" }}>
          <i className="fas fa-ticket-alt" style={{ color: "#007890" }} />
          Submit Support Ticket
        </h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>
          Describe your issue and our team will get back to you.
        </p>
      </div>
        <form onSubmit={handleSubmit}>
          {/* Issue Type */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Issue Type</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">-- Select an issue type --</option>
              {issueTypes.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Title <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              style={inputStyle}
            />
            <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>
              {title.length}/200
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Description <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the issue..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Browser / Device */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Browser / Device Info</label>
            <input
              type="text"
              value={browserInfo}
              onChange={(e) => setBrowserInfo(e.target.value)}
              placeholder="e.g. Chrome on Windows 10"
              style={inputStyle}
            />
          </div>

          {/* Additional Notes */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Additional Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context or screenshots links..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 28px",
                background: submitting ? "#94a3b8" : "#007890",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane" /> Submit Ticket
                </>
              )}
            </button>
            <a
              href="/"
              style={{
                padding: "10px 28px",
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
