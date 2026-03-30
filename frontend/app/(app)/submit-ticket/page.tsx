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
      <style>{`
.st-page { min-height: 100vh; background: transparent; display: flex; align-items: center; justify-content: center; padding: 32px 16px; box-sizing: border-box; }
.st-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); padding: 36px; width: 100%; max-width: 680px; box-sizing: border-box; }
.st-header { margin-bottom: 28px; text-align: center; }
.st-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; display: inline-flex; align-items: center; gap: 10px; margin: 0 0 6px; }
.st-header p { color: #64748b; margin: 0; font-size: 0.9rem; }
.st-label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
.st-input { width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; outline: none; transition: border 0.15s; box-sizing: border-box; font-family: inherit; }
.st-input:focus { border-color: #007890; box-shadow: 0 0 0 3px rgba(0,120,144,0.1); }
.st-field { margin-bottom: 20px; }
.st-char-count { text-align: right; font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }
.st-btn-row { display: flex; gap: 12px; justify-content: center; }
.st-btn-submit { padding: 10px 28px; background: #007890; color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.st-btn-submit:disabled { background: #94a3b8; cursor: not-allowed; }
.st-btn-cancel { padding: 10px 28px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; text-decoration: none; display: flex; align-items: center; gap: 8px; }
.st-toast { position: fixed; top: 24px; right: 24px; color: #fff; padding: 14px 24px; border-radius: 10px; font-size: 0.9rem; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; display: flex; align-items: center; gap: 10px; }

@media (max-width: 768px) {
  .st-page { padding: 16px 10px; align-items: flex-start; }
  .st-card { padding: 24px 18px; }
  .st-header h1 { font-size: 1.2rem; }
  .st-header p { font-size: 0.8rem; }
  .st-header { margin-bottom: 20px; }
  .st-input { padding: 9px 12px; font-size: 0.85rem; }
  .st-btn-row { flex-direction: column; }
  .st-btn-submit, .st-btn-cancel { width: 100%; justify-content: center; }
  .st-toast { right: 12px; left: 12px; font-size: 0.8rem; padding: 12px 16px; }
}
@media (max-width: 480px) {
  .st-page { padding: 10px 6px; }
  .st-card { padding: 18px 14px; }
  .st-header h1 { font-size: 1.05rem; }
  .st-label { font-size: 0.8rem; }
}
      `}</style>

      <div className="st-page">
        {/* Toast */}
        {toast && (
          <div className="st-toast" style={{ background: toast.includes("success") ? "#059669" : "#dc2626" }}>
            <i className={`fas ${toast.includes("success") ? "fa-check-circle" : "fa-exclamation-circle"}`} />
            {toast}
          </div>
        )}

        {/* Form Card */}
        <div className="st-card">
          <div className="st-header">
            <h1>
              <i className="fas fa-ticket-alt" style={{ color: "#007890" }} />
              Submit Support Ticket
            </h1>
            <p>Describe your issue and our team will get back to you.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="st-field">
              <label className="st-label">Issue Type</label>
              <select value={issueType} onChange={e => setIssueType(e.target.value)} className="st-input" style={{ cursor: "pointer" }}>
                <option value="">-- Select an issue type --</option>
                {issueTypes.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="st-field">
              <label className="st-label">Title <span style={{ color: "#dc2626" }}>*</span></label>
              <input type="text" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief summary of the issue" className="st-input" />
              <div className="st-char-count">{title.length}/200</div>
            </div>

            <div className="st-field">
              <label className="st-label">Description <span style={{ color: "#dc2626" }}>*</span></label>
              <textarea required rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide details about the issue..." className="st-input" style={{ resize: "vertical" }} />
            </div>

            <div className="st-field">
              <label className="st-label">Browser / Device Info</label>
              <input type="text" value={browserInfo} onChange={e => setBrowserInfo(e.target.value)} placeholder="e.g. Chrome on Windows 10" className="st-input" />
            </div>

            <div className="st-field" style={{ marginBottom: 28 }}>
              <label className="st-label">Additional Notes</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional context or screenshots links..." className="st-input" style={{ resize: "vertical" }} />
            </div>

            <div className="st-btn-row">
              <button type="submit" disabled={submitting} className="st-btn-submit">
                {submitting ? <><i className="fas fa-spinner fa-spin" /> Submitting...</> : <><i className="fas fa-paper-plane" /> Submit Ticket</>}
              </button>
              <a href="/" className="st-btn-cancel">Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
