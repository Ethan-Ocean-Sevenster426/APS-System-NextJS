"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";

interface Product {
  id: number;
  commodity: string;
  product_name: string;
  product_class: string;
  dna: boolean;
  fat: boolean;
  protein: boolean;
  calcium: boolean;
  is_direction_present_for_this_inspection: boolean;
  is_product_compliant: boolean;
  is_sample_taken: boolean;
  needs_retest: string;
  coa_uploaded: boolean;
  composition_uploaded: boolean;
  occurrence_uploaded: boolean;
  retest_uploaded: boolean;
  other_uploaded: boolean;
  lab_form_uploaded: boolean;
  lab?: string;
}

interface FileItem {
  name: string;
  path: string;
  url: string;
  download_url?: string;
  relative_path?: string;
  size: number;
  type?: string;
  category?: string;
}

interface Inspection {
  id: number;
  client_name: string;
  town?: string;
  inspector_name?: string;
  date_of_inspection: string;
  approved_status?: string;
  sent_date?: string;
  has_rfi?: boolean;
  has_invoice?: boolean;
  has_lab?: boolean;
  has_compliance?: boolean;
  is_occurrence_report?: boolean;
  inspection_compliance_status?: string;
  email?: string;
  group_id?: string;
  km_traveled?: number;
  hours?: number;
  group_type?: string;
  facility_type?: string;
  corporate_group?: string;
  internal_account_code?: string;
  registration_code?: string;
  physical_address?: string;
  telephone?: string;
  time_of_visit?: string;
  has_lab_form?: boolean;
  products?: Product[];
}

function ClientSearchInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const filtered = value
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options;
  const showDropdown = open && filtered.length > 0;

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <i className="fas fa-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focused ? "#007890" : "#6b7280", fontSize: 14, pointerEvents: "none" }} />
        <input
          type="text"
          className="ir-form-control"
          placeholder="Search or select client..."
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          style={{ paddingLeft: 35, paddingRight: 32 }}
          autoComplete="off"
        />
        {value ? (
          <button onClick={() => { onChange(""); setOpen(false); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, padding: 2 }}>
            <i className="fas fa-times" />
          </button>
        ) : (
          <i className="fas fa-chevron-down" onClick={() => setOpen(o => !o)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 11, cursor: "pointer" }} />
        )}
      </div>
      {showDropdown && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 220, overflowY: "auto" }}>
          {filtered.slice(0, 50).map(opt => (
            <div
              key={opt}
              onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false); }}
              style={{ padding: "8px 12px", fontSize: "0.78rem", color: "#374151", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0f9fb")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {opt}
            </div>
          ))}
          {filtered.length > 50 && (
            <div style={{ padding: "6px 12px", fontSize: "0.7rem", color: "#9ca3af", textAlign: "center" }}>
              {filtered.length - 50} more — type to narrow
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IrMultiSelect({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="ir-filter-field">
      <label className="ir-form-label">{label}</label>
      <MultiSelectDropdown label={label} options={options} selected={selected} onChange={onChange} />
    </div>
  );
}

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clientSearch, setClientSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateGroupsCount, setDuplicateGroupsCount] = useState(0);
  const [undeliverableCount, setUndeliverableCount] = useState(0);

  // Filter values (arrays for multi-select)
  const [inspectorFilter, setInspectorFilter] = useState<string[]>([]);
  const [corpGroupFilter, setCorpGroupFilter] = useState<string[]>([]);
  const [groupTypeFilter, setGroupTypeFilter] = useState<string[]>([]);
  const [sentStatusFilter, setSentStatusFilter] = useState<string[]>([]);
  const [complianceFilter, setComplianceFilter] = useState<string[]>([]);
  const [approvedFilter, setApprovedFilter] = useState<string[]>([]);
  const [fileStatusFilter, setFileStatusFilter] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);

  // Lab-tech specific filters
  const [retestFilter, setRetestFilter] = useState<string[]>([]);
  const [coaStatusFilter, setCoaStatusFilter] = useState<string[]>([]);
  const [labFilter, setLabFilter] = useState<string[]>([]);
  const [testTypeFilter, setTestTypeFilter] = useState<string[]>([]);

  // Upload state
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{
    inspectionId: number;
    groupId: string;
    documentType: string;
    productId: number;
    complianceStatus?: string;
  } | null>(null);

  // Compliance modal state
  const [complianceModal, setComplianceModal] = useState<{
    show: boolean;
    type: 'product' | 'coa';
    inspectionId: number;
    groupId: string;
    productId: number;
    documentType: string;
  } | null>(null);

  // Filesystem file info cache per group (keyed by group_id)
  const [groupFiles, setGroupFiles] = useState<Record<string, Record<string, FileItem[]>>>({});

  // Files modal state
  const [filesModal, setFilesModal] = useState<{
    visible: boolean;
    clientName: string;
    inspectionDate: string;
    groupId: string;
    files: Record<string, FileItem[]>;
    loading: boolean;
  }>({ visible: false, clientName: "", inspectionDate: "", groupId: "", files: {}, loading: false });

  const fetchInspections = useCallback((duplicates?: boolean, from?: string, to?: string) => {
    setLoading(true);
    const p = new URLSearchParams();
    if (duplicates) p.set("show_duplicates", "true");
    if (from) p.set("date_from", from);
    if (to) p.set("date_to", to);
    const qs = p.toString() ? `?${p.toString()}` : "";
    fetch(`/api/inspections${qs}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        const results = data.results || data || [];
        console.log("[Inspections] Loaded", results.length, "inspections");
        // Log file status for first 5 inspections
        results.slice(0, 5).forEach((insp: Inspection) => {
          console.log(`[Inspection] ${insp.client_name} (group ${insp.group_id}):`, {
            has_rfi: insp.has_rfi, has_invoice: insp.has_invoice,
            has_lab: insp.has_lab, has_compliance: insp.has_compliance,
            products: insp.products?.map(p => ({
              id: p.id, product: p.product_name,
              coa: p.coa_uploaded, composition: p.composition_uploaded,
              other: p.other_uploaded, retest: p.retest_uploaded,
            })),
          });
        });
        setInspections(results);
        setTotal(data.count || results.length);
        if (data.duplicate_groups_count !== undefined) {
          setDuplicateGroupsCount(data.duplicate_groups_count);
        }
        if (data.undeliverable_count !== undefined) {
          setUndeliverableCount(data.undeliverable_count);
        }
      })
      .catch(err => console.error("Fetch inspections failed:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInspections(false, dateFrom, dateTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) {
          window.location.href = "/login";
          return;
        }
        setRole(d.role || "inspector");
      })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  const roleLoaded = role !== null;
  const isLabTech = role === "lab_technician";
  const isAdmin = role === "admin";

  // Show toast notification
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Core upload function
  const performUpload = useCallback(async (file: File, inspectionId: number, groupId: string, documentType: string, productId: number, complianceStatus?: string) => {
    const key = `${documentType}-${productId}`;
    setUploadingKey(key);
    console.log(`[Upload] Starting: type=${documentType}, file=${file.name}, inspectionId=${inspectionId}, groupId=${groupId}, productId=${productId}, compliance=${complianceStatus}`);

    try {
      // Validate PDF
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('Only PDF files are allowed. Please select a PDF document.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      if (groupId) formData.append('group_id', groupId);
      if (inspectionId) formData.append('inspection_id', String(inspectionId));
      if (complianceStatus) formData.append('compliance_status', complianceStatus);
      if (complianceStatus) formData.append('product_compliance_status', complianceStatus);

      console.log(`[Upload] Sending to /api/upload-document:`, Object.fromEntries(formData.entries()));
      const res = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      console.log(`[Upload] Response:`, data);

      if (data.success) {
        showToast(data.message || `${documentType} uploaded successfully!`);

        // Update local state to reflect the upload
        setInspections(prev => prev.map(insp => {
          if (insp.group_id !== groupId && insp.id !== inspectionId) return insp;

          const updated = { ...insp };

          // Update group-level flags
          if (documentType === 'rfi') updated.has_rfi = true;
          if (documentType === 'invoice') updated.has_invoice = true;
          if (documentType === 'lab' || documentType === 'coa') updated.has_lab = true;
          if (documentType === 'compliance' || documentType === 'composition') updated.has_compliance = true;
          if (documentType === 'lab_form') updated.has_lab_form = true;

          // Update product-level flags
          if (updated.products) {
            updated.products = updated.products.map(p => {
              if (p.id !== productId) return p;
              const up = { ...p };
              if (documentType === 'coa' || documentType === 'lab') up.coa_uploaded = true;
              if (documentType === 'composition') up.composition_uploaded = true;
              if (documentType === 'occurrence') up.occurrence_uploaded = true;
              if (documentType === 'retest') up.retest_uploaded = true;
              if (documentType === 'other') up.other_uploaded = true;
              if (documentType === 'lab_form') up.lab_form_uploaded = true;
              if (complianceStatus) {
                up.is_product_compliant = complianceStatus === 'compliant';
              }
              return up;
            });
          }

          return updated;
        }));
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Upload error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploadingKey(null);
    }
  }, [showToast]);

  // Handle file input change
  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const pending = pendingUploadRef.current;
    if (file && pending) {
      performUpload(file, pending.inspectionId, pending.groupId, pending.documentType, pending.productId, pending.complianceStatus);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
    pendingUploadRef.current = null;
  }, [performUpload]);

  // Send inspection documents via email
  const [sendingId, setSendingId] = useState<number | null>(null);
  const handleSendDocuments = useCallback(async (inspection: Inspection) => {
    if (!inspection.group_id) {
      alert('No group ID found for this inspection.');
      return;
    }
    if (sendingId) return; // prevent double-click
    console.log(`[Send] Starting for inspection ${inspection.id}, group_id=${inspection.group_id}`, inspection);
    setSendingId(inspection.id);
    try {
      const res = await fetch('/api/send-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: inspection.group_id,
          inspection_group_id: inspection.group_id,
          client_name: inspection.client_name,
          inspection_date: inspection.date_of_inspection,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Documents sent successfully!');
        setInspections(prev => prev.map(item =>
          item.group_id === inspection.group_id
            ? { ...item, sent_date: new Date().toISOString() }
            : item
        ));
      } else {
        alert('Send failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Send error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSendingId(null);
    }
  }, [sendingId, showToast]);

  // Trigger file picker for a specific upload
  const triggerUpload = useCallback((inspectionId: number, groupId: string, documentType: string, productId: number) => {
    // For compliance and composition uploads, show compliance status modal first
    if (documentType === 'compliance' || documentType === 'composition') {
      setComplianceModal({
        show: true, type: 'product',
        inspectionId, groupId, productId, documentType,
      });
      return;
    }

    // For COA/Lab uploads, show COA compliance modal first
    if (documentType === 'lab') {
      setComplianceModal({
        show: true, type: 'coa',
        inspectionId, groupId, productId, documentType,
      });
      return;
    }

    // Direct upload for other types
    pendingUploadRef.current = { inspectionId, groupId, documentType, productId };
    fileInputRef.current?.click();
  }, []);

  // Handle compliance status selection from modal
  const handleComplianceSelect = useCallback((status: string) => {
    if (!complianceModal) return;
    const { inspectionId, groupId, productId, documentType } = complianceModal;
    setComplianceModal(null);

    // Now trigger the file picker with the compliance status stored
    pendingUploadRef.current = { inspectionId, groupId, documentType, productId, complianceStatus: status };
    fileInputRef.current?.click();
  }, [complianceModal]);

  // Open files modal for an inspection group
  const openFilesModal = useCallback(async (groupId: string, clientName: string, inspectionDate: string) => {
    setFilesModal({ visible: true, clientName, inspectionDate, groupId, files: {}, loading: true });
    try {
      const res = await fetch("/api/inspection-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId, client_name: clientName, inspection_date: inspectionDate }),
      });
      const data = await res.json();
      if (data.success) {
        setFilesModal(prev => ({ ...prev, files: data.files || {}, loading: false }));
      } else {
        setFilesModal(prev => ({ ...prev, loading: false }));
        console.error("Failed to load files:", data.error);
      }
    } catch (err) {
      setFilesModal(prev => ({ ...prev, loading: false }));
      console.error("Error loading files:", err);
    }
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Fetch filesystem file info when expanding (if not already cached)
        const insp = inspections.find(s => String(s.id) === id);
        if (insp && !groupFiles[insp.group_id || id]) {
          const gid = insp.group_id || String(insp.id);
          fetch("/api/inspection-files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ group_id: gid, client_name: insp.client_name, inspection_date: insp.date_of_inspection }),
          })
            .then(r => r.json())
            .then(data => {
              if (data.success && data.files) {
                setGroupFiles(prev => ({ ...prev, [gid]: data.files }));
                // Update inspection flags based on filesystem
                const f = data.files;
                setInspections(prev => prev.map(s => {
                  if (String(s.id) !== id) return s;
                  return {
                    ...s,
                    has_rfi: s.has_rfi || (f.rfi && f.rfi.length > 0),
                    has_invoice: s.has_invoice || (f.invoice && f.invoice.length > 0),
                    has_lab: s.has_lab || (f.coa && f.coa.length > 0) || (f.lab && f.lab.length > 0),
                    has_compliance: s.has_compliance || (f.compliance && f.compliance.length > 0) || (f.composition && f.composition.length > 0),
                    has_lab_form: s.has_lab_form || (f.lab_form && f.lab_form.length > 0),
                    products: s.products?.map(p => ({
                      ...p,
                      coa_uploaded: p.coa_uploaded || (f.coa && f.coa.length > 0) || (f.lab && f.lab.length > 0),
                      composition_uploaded: p.composition_uploaded || (f.composition && f.composition.length > 0),
                      occurrence_uploaded: p.occurrence_uploaded || (f.occurrence && f.occurrence.length > 0),
                      retest_uploaded: p.retest_uploaded || (f.retest && f.retest.length > 0),
                      other_uploaded: p.other_uploaded || (f.other && f.other.length > 0),
                      lab_form_uploaded: p.lab_form_uploaded || (f.lab_form && f.lab_form.length > 0),
                    })),
                  };
                }));
              }
            })
            .catch(err => console.error("Error fetching file info:", err));
        }
      }
      return next;
    });
  }, [inspections, groupFiles]);

  // Derived filter options
  const inspectorOptions = useMemo(() => [...new Set(inspections.map(i => i.inspector_name).filter(Boolean))].sort() as string[], [inspections]);
  const corpGroupOptions = useMemo(() => [...new Set(inspections.map(i => i.corporate_group).filter(Boolean))].sort() as string[], [inspections]);
  const groupTypeOptions = useMemo(() => [...new Set(inspections.map(i => i.group_type).filter(Boolean))].sort() as string[], [inspections]);
  const clientOptions = useMemo(() => [...new Set(inspections.map(i => i.client_name).filter(Boolean))].sort() as string[], [inspections]);


  // Client-side filtered list
  const filteredInspections = useMemo(() => {
    return inspections.filter(s => {
      // Lab tech: only show inspections with at least one sampled product
      if (isLabTech && !(s.products || []).some(p => p.is_sample_taken)) return false;
      if (clientSearch) {
        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
        if (!normalize(s.client_name || "").includes(normalize(clientSearch))) return false;
      }
      if (inspectorFilter.length > 0 && !inspectorFilter.includes(s.inspector_name || "")) return false;
      if (corpGroupFilter.length > 0 && !corpGroupFilter.includes(s.corporate_group || "")) return false;
      if (groupTypeFilter.length > 0 && !groupTypeFilter.includes(s.group_type || "")) return false;
      if (sentStatusFilter.length > 0) {
        const sent = !!s.sent_date;
        if (sentStatusFilter.includes("SENT") && sentStatusFilter.includes("NOT_SENT")) { /* both = no filter */ }
        else if (sentStatusFilter.includes("SENT") && !sent) return false;
        else if (sentStatusFilter.includes("NOT_SENT") && sent) return false;
      }
      if (complianceFilter.length > 0 && !complianceFilter.includes(s.inspection_compliance_status || "")) return false;
      if (approvedFilter.length > 0 && !approvedFilter.includes(s.approved_status || "")) return false;
      if (fileStatusFilter.length > 0) {
        const hasFiles = s.has_rfi || s.has_invoice || s.has_lab || s.has_compliance;
        if (fileStatusFilter.includes("HAS_FILES") && fileStatusFilter.includes("NO_FILES")) { /* both = no filter */ }
        else if (fileStatusFilter.includes("HAS_FILES") && !hasFiles) return false;
        else if (fileStatusFilter.includes("NO_FILES") && hasFiles) return false;
      }
      if (retestFilter.length > 0) {
        const prods = s.products || [];
        const needsRetest = prods.some(p => p.needs_retest && p.needs_retest !== "NO" && p.needs_retest !== "");
        if (retestFilter.includes("NEEDS_RETEST") && retestFilter.includes("NO_RETEST")) { /* both = no filter */ }
        else if (retestFilter.includes("NEEDS_RETEST") && !needsRetest) return false;
        else if (retestFilter.includes("NO_RETEST") && needsRetest) return false;
      }
      if (coaStatusFilter.length > 0) {
        const hasCoa = !!s.has_lab;
        if (coaStatusFilter.includes("COA_UPLOADED") && coaStatusFilter.includes("NO_COA")) { /* both = no filter */ }
        else if (coaStatusFilter.includes("COA_UPLOADED") && !hasCoa) return false;
        else if (coaStatusFilter.includes("NO_COA") && hasCoa) return false;
      }
      if (labFilter.length > 0) {
        const prods = s.products || [];
        if (!prods.some(p => p.lab && labFilter.includes(p.lab))) return false;
      }
      if (testTypeFilter.length > 0) {
        const prods = s.products || [];
        const testMap: Record<string, keyof Product> = { DNA: "dna", FAT: "fat", PROTEIN: "protein", CALCIUM: "calcium" };
        if (!testTypeFilter.some(t => prods.some(p => p[testMap[t]] as boolean))) return false;
      }
      return true;
    });
  }, [inspections, isLabTech, clientSearch, inspectorFilter, corpGroupFilter, groupTypeFilter, sentStatusFilter, complianceFilter, approvedFilter, fileStatusFilter, retestFilter, coaStatusFilter, labFilter, testTypeFilter]);

  const expandAll = () => setExpandedGroups(new Set(filteredInspections.map(i => String(i.id))));
  const collapseAll = () => setExpandedGroups(new Set());

  const truncate = (str: string, len: number) =>
    str.length > len ? str.substring(0, len) + "..." : str;

  const isPoultryOrEggs = (commodity: string) => {
    const upper = (commodity || "").toUpperCase();
    return upper === "POULTRY" || upper === "EGGS";
  };

  const getSampleBadge = (product: Product, isOccurrence: boolean, _hasCompliance: boolean) => {
    if (isPoultryOrEggs(product.commodity)) return null;
    if (isOccurrence || !product.coa_uploaded) {
      return { label: "Sample: N/A", bg: "#9ca3af" };
    }
    if (product.is_sample_taken) {
      return product.is_direction_present_for_this_inspection
        ? { label: "Sample: Non-Compliant (Sampled)", bg: "#ef4444" }
        : { label: "Sample: Compliant (Sampled)", bg: "#22c55e" };
    }
    return product.is_direction_present_for_this_inspection
      ? { label: "Sample: Non-Compliant", bg: "#ef4444" }
      : { label: "Sample: Compliant", bg: "#22c55e" };
  };

  const getProductBadge = (product: Product, isOccurrence: boolean, hasCompliance: boolean) => {
    if (isOccurrence) {
      return { label: "Product: N/A", bg: "#9ca3af" };
    }
    if (hasCompliance || product.composition_uploaded) {
      return product.is_product_compliant
        ? { label: "Product: Compliant", bg: "#22c55e" }
        : { label: "Product: Non-Compliant", bg: "#ef4444" };
    }
    return { label: "Product: N/A", bg: "#9ca3af" };
  };

  const getRetestBadge = (product: Product) => {
    if (isPoultryOrEggs(product.commodity)) return null;
    const val = (product.needs_retest || "").toUpperCase();
    if (val === "YES") return { label: "Needs Retest: Yes", bg: "#22c55e" };
    if (val === "NO") return { label: "Needs Retest: No", bg: "#ef4444" };
    return { label: "Needs Retest: N/A", bg: "#9ca3af" };
  };

  const UploadBtn = ({ label, uploaded, onClick, uploadKey }: { label: string; uploaded: boolean; onClick: () => void; uploadKey?: string }) => {
    const isUploading = uploadKey ? uploadingKey === uploadKey : false;
    return (
      <button
        style={{
          padding: "6px 14px",
          background: isUploading ? "#f59e0b" : uploaded ? "#22c55e" : "#6c757d",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: isUploading ? "wait" : "pointer",
          fontSize: 9,
          opacity: isUploading ? 0.8 : 1,
        }}
        disabled={isUploading}
        onClick={e => { e.stopPropagation(); onClick(); }}
      >
        {isUploading ? "Uploading..." : label}
      </button>
    );
  };

  const DisabledBtn = ({ label }: { label: string }) => (
    <button
      style={{
        padding: "6px 14px",
        background: "#d1d5db",
        color: "#9ca3af",
        border: "none",
        borderRadius: 4,
        cursor: "not-allowed",
        fontSize: 9,
      }}
      disabled
    >
      {label}
    </button>
  );

  const renderDetailRow = (s: Inspection) => {
    const products = s.products || [];
    const isOccurrence = !!s.is_occurrence_report;

    return (
      <div className="ir-detail-content" style={{ background: "#f8fafc" }}>
        {/* Main Layout: Facility info on left, Products list on right */}
        <div style={{ display: "flex", gap: 12, padding: 8, alignItems: "flex-start" }}>

          {/* LEFT PANEL - Facility Info */}
          <div style={{
            flex: "0 0 180px",
            background: "white",
            borderRadius: 8,
            padding: 10,
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            borderLeft: "3px solid #007890",
          }}>
            <div style={{ fontSize: 11, color: "#007890", fontWeight: 600, marginBottom: 4 }}>Facility</div>
            <div style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>
              {truncate(s.client_name || "", 22)}
            </div>

            {s.group_type && (
              <div style={{ fontSize: 8, color: "#6b7280", marginBottom: 2 }}>
                <span style={{ padding: "1px 4px", background: "#e5e7eb", borderRadius: 2 }}>{s.group_type}</span>
              </div>
            )}
            {s.facility_type && (
              <div style={{ fontSize: 8, color: "#6b7280", marginBottom: 2 }}>
                <span style={{ padding: "1px 4px", background: "#dbeafe", color: "#1e40af", borderRadius: 2 }}>{s.facility_type}</span>
              </div>
            )}
            {s.internal_account_code && (
              <div style={{ fontSize: 8, color: "#6b7280", marginBottom: 2 }}>
                <i className="fas fa-id-badge" style={{ width: 10, color: "#007890" }} />
                <span style={{ fontWeight: 500 }}>{s.internal_account_code}</span>
              </div>
            )}

            {isOccurrence && (
              <>
                <div style={{ margin: "4px 0" }}>
                  <span style={{ fontSize: 8, padding: "2px 6px", background: "#fef3c7", color: "#92400e", borderRadius: 3, fontWeight: 600 }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: 2 }} />OCCURRENCE REPORT
                  </span>
                </div>
                {/* Occurrence Report Details */}
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #fcd34d" }}>
                  {s.registration_code && (
                    <div style={{ fontSize: 8, color: "#6b7280", marginBottom: 3 }}>
                      <i className="fas fa-id-card" style={{ width: 12, color: "#f59e0b" }} />
                      <span style={{ fontWeight: 500 }}>Reg:</span> {s.registration_code}
                    </div>
                  )}
                  {s.physical_address && (
                    <div style={{ fontSize: 8, color: "#6b7280", marginBottom: 3 }}>
                      <i className="fas fa-map-marker-alt" style={{ width: 12, color: "#f59e0b" }} />
                      {truncate(s.physical_address, 30)}
                    </div>
                  )}
                  {s.telephone && (
                    <div style={{ fontSize: 8, color: "#6b7280", marginBottom: 3 }}>
                      <i className="fas fa-phone" style={{ width: 12, color: "#f59e0b" }} />
                      {s.telephone}
                    </div>
                  )}
                  {s.time_of_visit && (
                    <div style={{ fontSize: 8, color: "#6b7280", marginBottom: 3 }}>
                      <i className="fas fa-clock" style={{ width: 12, color: "#f59e0b" }} />
                      <span style={{ fontWeight: 500 }}>Time:</span> {s.time_of_visit}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Emails */}
            <div style={{ marginBottom: 6 }}>
              {s.email ? (
                <div style={{ fontSize: 8, color: "#3b82f6", wordBreak: "break-all" }}>{s.email}</div>
              ) : (
                <div style={{ fontSize: 8, color: "#6b7280" }}>-</div>
              )}
            </div>

            {/* Km + Hours (not for occurrence, not for lab tech) */}
            {!isOccurrence && roleLoaded && !isLabTech && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, color: "#374151", fontWeight: 500, minWidth: 40 }}>Km:</span>
                  <input
                    type="number"
                    style={{ width: 65, fontSize: 9, padding: 3, border: "1px solid #e5e7eb", borderRadius: 3 }}
                    defaultValue={s.km_traveled || ""}
                    placeholder="0"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, color: "#374151", fontWeight: 500, minWidth: 40 }}>Hours:</span>
                  <input
                    type="number"
                    style={{ width: 65, fontSize: 9, padding: 3, border: "1px solid #e5e7eb", borderRadius: 3 }}
                    defaultValue={s.hours || ""}
                    placeholder="0"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* RFI + Invoice buttons (not for lab tech) */}
            {products.length > 0 && roleLoaded && !isLabTech && (
              <div style={{ display: "flex", gap: 4, marginTop: 8, borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
                {isOccurrence ? (
                  <>
                    <DisabledBtn label="RFI" />
                    <DisabledBtn label="Invoice" />
                  </>
                ) : (
                  <>
                    <UploadBtn
                      label="RFI"
                      uploaded={!!s.has_rfi}
                      uploadKey={`rfi-${products[0].id}`}
                      onClick={() => triggerUpload(products[0].id, s.group_id || '', 'rfi', products[0].id)}
                    />
                    <UploadBtn
                      label="Invoice"
                      uploaded={!!s.has_invoice}
                      uploadKey={`invoice-${products[0].id}`}
                      onClick={() => triggerUpload(products[0].id, s.group_id || '', 'invoice', products[0].id)}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANEL - Products List */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflowX: "auto" }}>
            {products.length > 0 ? (
              products.map((product, idx) => {
                // For occurrence reports, only show first product row
                if (isOccurrence && idx > 0) return null;

                const sampleBadge = getSampleBadge(product, isOccurrence, !!s.has_compliance);
                const productBadge = getProductBadge(product, isOccurrence, !!s.has_compliance);
                const retestBadge = getRetestBadge(product);
                const hidePoultryEggs = isPoultryOrEggs(product.commodity);

                return (
                  <div key={product.id} style={{
                    display: "flex", gap: 6, flexWrap: "nowrap", alignItems: "stretch",
                    background: "white", borderRadius: 6, padding: 6,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}>
                    {/* Product Info + Test Flags */}
                    <div style={{
                      flex: "0 0 180px",
                      background: product.is_direction_present_for_this_inspection ? "#fef2f2" : "#f0fdf4",
                      borderRadius: 4,
                      borderLeft: `3px solid ${product.is_direction_present_for_this_inspection ? "#ef4444" : "#22c55e"}`,
                      padding: 6,
                    }}>
                      <div style={{ fontSize: 9, color: "#6b7280" }}>
                        Commodity: <span style={{ fontWeight: 600, color: "#374151" }}>{truncate(product.commodity || "N/A", 12)}</span>
                      </div>
                      <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>
                        Product: <span style={{ fontWeight: 600, color: "#374151" }}>{truncate(product.product_name || "N/A", 16)}</span>
                      </div>
                      {!hidePoultryEggs && (
                        <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 4, wordBreak: "break-word" }}>
                          Class: <span style={{ fontWeight: 600, color: "#374151" }}>{product.product_class || "N/A"}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
                        {sampleBadge && (
                          <span style={{ fontSize: 7, padding: "2px 4px", background: sampleBadge.bg, color: "white", borderRadius: 2 }}>
                            {sampleBadge.label}
                          </span>
                        )}
                        {productBadge && (
                          <span style={{ fontSize: 7, padding: "2px 4px", background: productBadge.bg, color: "white", borderRadius: 2 }}>
                            {productBadge.label}
                          </span>
                        )}
                        {retestBadge && (
                          <span style={{ fontSize: 7, padding: "2px 4px", background: retestBadge.bg, color: "white", borderRadius: 2 }}>
                            {retestBadge.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DNA/Fat/Protein/Calcium Grid - hide for POULTRY/EGGS */}
                    {!hidePoultryEggs && (
                      <div style={{
                        flex: "0 0 135px",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 5,
                        fontSize: 11,
                        padding: 8,
                        background: "#f9fafb",
                        borderRadius: 4,
                      }}>
                        <div>
                          <span style={{ color: "#6b7280" }}>DNA:</span>{" "}
                          <span style={{ color: product.dna ? "#22c55e" : "#ef4444", fontWeight: 500 }}>{product.dna ? "Y" : "N"}</span>
                        </div>
                        <div>
                          <span style={{ color: "#6b7280" }}>Fat:</span>{" "}
                          <span style={{ color: product.fat ? "#22c55e" : "#ef4444", fontWeight: 500 }}>{product.fat ? "Y" : "N"}</span>
                        </div>
                        <div>
                          <span style={{ color: "#6b7280" }}>Pro:</span>{" "}
                          <span style={{ color: product.protein ? "#22c55e" : "#ef4444", fontWeight: 500 }}>{product.protein ? "Y" : "N"}</span>
                        </div>
                        <div>
                          <span style={{ color: "#6b7280" }}>Cal:</span>{" "}
                          <span style={{ color: product.calcium ? "#22c55e" : "#ef4444", fontWeight: 500 }}>{product.calcium ? "Y" : "N"}</span>
                        </div>
                      </div>
                    )}

                    {/* Upload Buttons */}
                    <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {isOccurrence ? (
                        <>
                          {roleLoaded && !isLabTech && <DisabledBtn label="Compliance" />}
                          {roleLoaded && !isLabTech && <DisabledBtn label="Composition" />}
                          <DisabledBtn label="COA/Lab" />
                          <DisabledBtn label="Lab Form" />
                          <DisabledBtn label="Retest" />
                          <UploadBtn
                            label="Occurrence"
                            uploaded={product.occurrence_uploaded}
                            uploadKey={`occurrence-${product.id}`}
                            onClick={() => triggerUpload(product.id, s.group_id || '', 'occurrence', product.id)}
                          />
                          <DisabledBtn label="Other" />
                        </>
                      ) : (
                        <>
                          {roleLoaded && !isLabTech && (
                            <UploadBtn
                              label="Compliance"
                              uploaded={!!s.has_compliance}
                              uploadKey={`compliance-${product.id}`}
                              onClick={() => triggerUpload(product.id, s.group_id || '', 'compliance', product.id)}
                            />
                          )}
                          {roleLoaded && !isLabTech && (
                            <UploadBtn
                              label="Composition"
                              uploaded={product.composition_uploaded}
                              uploadKey={`composition-${product.id}`}
                              onClick={() => triggerUpload(product.id, s.group_id || '', 'composition', product.id)}
                            />
                          )}
                          {!hidePoultryEggs && (
                            <>
                              <UploadBtn
                                label="COA/Lab"
                                uploaded={product.coa_uploaded}
                                uploadKey={`lab-${product.id}`}
                                onClick={() => triggerUpload(product.id, s.group_id || '', 'lab', product.id)}
                              />
                              <UploadBtn
                                label="Lab Form"
                                uploaded={!!s.has_lab_form}
                                uploadKey={`lab_form-${product.id}`}
                                onClick={() => triggerUpload(product.id, s.group_id || '', 'lab_form', product.id)}
                              />
                              <UploadBtn
                                label="Retest"
                                uploaded={product.retest_uploaded}
                                uploadKey={`retest-${product.id}`}
                                onClick={() => triggerUpload(product.id, s.group_id || '', 'retest', product.id)}
                              />
                            </>
                          )}
                          <UploadBtn
                            label="Other"
                            uploaded={product.other_uploaded}
                            uploadKey={`other-${product.id}`}
                            onClick={() => triggerUpload(product.id, s.group_id || '', 'other', product.id)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{
                flex: 1, background: "white", borderRadius: 4,
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)", padding: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#9ca3af", fontSize: 11 }}>No inspection records</span>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  };


  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div style={{
          position: "fixed", bottom: 20, right: 20,
          background: "#22c55e", color: "white",
          padding: "12px 20px", borderRadius: 6,
          zIndex: 9999, fontSize: 14,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          animation: "fadeIn 0.3s ease",
        }}>
          {toastMessage}
        </div>
      )}

      {/* Compliance Status Modal (for Compliance/Composition uploads) */}
      {complianceModal?.show && complianceModal.type === 'product' && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9999,
        }} onClick={() => setComplianceModal(null)}>
          <div style={{
            background: "white", borderRadius: 12, padding: 24,
            maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#1f2937" }}>Product Compliance Status</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>
              Select the compliance status for this {complianceModal.documentType} document:
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={{
                  flex: 1, padding: "12px 16px", background: "#22c55e", color: "white",
                  border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
                }}
                onClick={() => handleComplianceSelect('compliant')}
              >
                Compliant
              </button>
              <button
                style={{
                  flex: 1, padding: "12px 16px", background: "#ef4444", color: "white",
                  border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
                }}
                onClick={() => handleComplianceSelect('non-compliant')}
              >
                Non-Compliant
              </button>
            </div>
            <button
              style={{
                marginTop: 12, width: "100%", padding: "8px", background: "#e5e7eb",
                color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13,
              }}
              onClick={() => setComplianceModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* COA Compliance Status Modal (for COA/Lab uploads) */}
      {complianceModal?.show && complianceModal.type === 'coa' && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9999,
        }} onClick={() => setComplianceModal(null)}>
          <div style={{
            background: "white", borderRadius: 12, padding: 24,
            maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#1f2937" }}>COA/Lab Compliance Status</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>
              Select the compliance status for this COA/Lab result:
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={{
                  flex: 1, padding: "12px 16px", background: "#22c55e", color: "white",
                  border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
                }}
                onClick={() => handleComplianceSelect('compliant')}
              >
                Compliant
              </button>
              <button
                style={{
                  flex: 1, padding: "12px 16px", background: "#ef4444", color: "white",
                  border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
                }}
                onClick={() => handleComplianceSelect('non-compliant')}
              >
                Non-Compliant
              </button>
            </div>
            <button
              style={{
                marginTop: 12, width: "100%", padding: "8px", background: "#e5e7eb",
                color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13,
              }}
              onClick={() => setComplianceModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        :root {
          --primary: #007890;
          --primary-light: #e6f3f7;
          --border: #e5e7eb;
          --radius: 6px;
          --shadow-lg: 0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);
          --text: #1f2937;
          --text-light: #6b7280;
          --card-bg: #ffffff;
          --spacing: 5px;
        }
        .ir-container { width: 100%; padding: 5px 0; }
        .ir-header { padding: 10px 5px 20px; margin-bottom: 5px; width: 100%; text-align: center; }
        .ir-header h1 { color: white; font-size: 1.75rem; font-weight: 600; margin-bottom: 4px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
        .ir-header h2 { color: white; font-size: 1rem; font-weight: 400; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
        .ir-card { background: #fff; border-radius: 6px; box-shadow: var(--shadow-lg); margin-bottom: 5px; border: 1px solid #e5e7eb; width: 100%; }
        .ir-card-header { padding: 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; }
        .ir-card-title { font-size: 1rem; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px; }
        .ir-card-body { padding: 16px; overflow-x: auto; }
        .ir-action-bar { display: flex; gap: 12px; margin-bottom: 5px; width: 100%; flex-wrap: wrap; }
        .ir-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 6px; border: none; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.15s ease; text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .ir-btn-primary { background: #007890; color: white; }
        .ir-btn-primary:hover { background: #005a6b; }
        .ir-btn-secondary { background: #6b7280; color: white; }
        .ir-btn-secondary:hover { background: #4b5563; }
        .ir-btn-green { background: #22c55e; color: white; }
        .ir-btn-green:hover { background: #16a34a; }
        .ir-btn-purple { background: #7c3aed; color: white; }
        .ir-btn-purple:hover { background: #6d28d9; }
        .ir-filter-form { display: flex; flex-direction: column; gap: 15px; }
        .ir-filter-row { display: flex; gap: 15px; flex-wrap: wrap; }
        .ir-filter-field { flex: 1; min-width: 200px; }
        .ir-filter-actions { display: flex; gap: 10px; align-items: center; padding-top: 10px; border-top: 1px solid #e5e7eb; flex-wrap: wrap; }
        .ir-form-label { font-size: 0.875rem; font-weight: 500; color: #6b7280; display: block; margin-bottom: 4px; }
        .ir-form-control { padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.875rem; color: #1f2937; background: #fff; width: 100%; box-sizing: border-box; }
        .ir-form-control:focus { outline: none; border-color: #007890; box-shadow: 0 0 0 3px #e6f3f7; }
        .ir-table { min-width: 100%; border-collapse: collapse; }
        .ir-table thead { background: #f9fafb; }
        .ir-table th { padding: 8px 12px; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
        .ir-table th.center { text-align: center; }
        .ir-table td { padding: 8px 12px; font-size: 0.75rem; border-bottom: 1px solid #e5e7eb; color: #1f2937; vertical-align: middle; }
        .ir-table td.center { text-align: center; }
        .ir-badge { font-size: 9px; padding: 2px 4px; border-radius: 4px; font-weight: 600; display: inline-block; white-space: nowrap; }
        .ir-badge-green { background: #dcfce7; color: #166534; }
        .ir-badge-red { background: #fee2e2; color: #991b1b; }
        .ir-table-info { font-size: 0.875rem; color: #6b7280; margin-bottom: 12px; }
        .ir-approved-select { width: 72px; display: block; margin: 0 auto; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.75rem; }
        .ir-detail-content { padding: 0; background: #f8fafc; border-top: 2px solid #e6f3f7; }
        @media (max-width: 768px) {
          .ir-filter-row { flex-direction: column; gap: 10px; }
          .ir-filter-field { min-width: 100%; }
          .ir-filter-actions { flex-direction: column; align-items: stretch; }
        }
      `}</style>

      <div style={{ padding: "5px 5px" }}>
        <div className="ir-container">

          {/* Header */}
          <div className="ir-header">
            <h1>Food Safety Agency (Pty) Ltd</h1>
            <h2>Claims Records Management</h2>
          </div>

          {/* Action Bar */}
          <div className="ir-action-bar">
            <a href="/" className="ir-btn ir-btn-primary"><i className="fas fa-home" /> Home</a>
            {roleLoaded && !isLabTech && <a href="/export-sheet" className="ir-btn ir-btn-secondary"><i className="fas fa-file-export" /> Export Sheet</a>}
            <button type="button" className="ir-btn ir-btn-secondary" onClick={expandAll}><i className="fas fa-expand-alt" /> Expand All</button>
            <button type="button" className="ir-btn ir-btn-secondary" onClick={collapseAll}><i className="fas fa-compress-alt" /> Collapse All</button>
            {roleLoaded && !isLabTech && <a href="/inspections/add" className="ir-btn ir-btn-green"><i className="fas fa-plus" /> Add Inspection</a>}
            {roleLoaded && !isLabTech && <a href="/clients" className="ir-btn ir-btn-purple"><i className="fas fa-th-list" /> Client Allocation Sheet</a>}
            {roleLoaded && !isLabTech && <a href="/system-logs" className="ir-btn ir-btn-secondary"><i className="fas fa-list-alt" /> System Logs</a>}
          </div>

          {/* Filter Card */}
          <div className="ir-card">
            <div className="ir-card-header">
              <div className="ir-card-title"><i className="fas fa-filter" /> Filter Inspections</div>
            </div>
            <div className="ir-card-body" style={{ overflow: "visible" }}>
              {!roleLoaded ? (
                <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: 13 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #e5e7eb", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                  Loading filters...
                </div>
              ) : (
              <form className="ir-filter-form" onSubmit={e => e.preventDefault()}>

                {/* Row 1 */}
                <div className="ir-filter-row">
                  <div className="ir-filter-field">
                    <label className="ir-form-label">Client Search</label>
                    <ClientSearchInput value={clientSearch} onChange={setClientSearch} options={clientOptions} />
                  </div>
                  <IrMultiSelect label="Inspector" options={inspectorOptions} selected={inspectorFilter} onChange={setInspectorFilter} />
                  <IrMultiSelect label="Corporate Group" options={corpGroupOptions} selected={corpGroupFilter} onChange={setCorpGroupFilter} />
                  <IrMultiSelect label="Group Type" options={groupTypeOptions} selected={groupTypeFilter} onChange={setGroupTypeFilter} />
                </div>

                {/* Row 2 */}
                <div className="ir-filter-row">
                  <div className="ir-filter-field">
                    <label className="ir-form-label">Date From</label>
                    <input type="date" className="ir-form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  </div>
                  <div className="ir-filter-field">
                    <label className="ir-form-label">Date To</label>
                    <input type="date" className="ir-form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                  <IrMultiSelect label="Sent Status" options={["SENT", "NOT_SENT"]} selected={sentStatusFilter} onChange={setSentStatusFilter} />
                  <IrMultiSelect label="Compliance Status" options={["COMPLIANT", "NON_COMPLIANT"]} selected={complianceFilter} onChange={setComplianceFilter} />
                  <IrMultiSelect label="Approved Status" options={["APPROVED", "PENDING"]} selected={approvedFilter} onChange={setApprovedFilter} />
                  <IrMultiSelect label="File Status" options={["HAS_FILES", "NO_FILES"]} selected={fileStatusFilter} onChange={setFileStatusFilter} />
                </div>

                {/* Row 3 — lab tech only */}
                {roleLoaded && isLabTech && (
                  <div className="ir-filter-row">
                    <IrMultiSelect label="Lab" options={["Food Safety Laboratory", "Merieux NutriSciences", "AGRI Food Laboratory (SGS)", "SANBI", "SMT", "ARC"]} selected={labFilter} onChange={setLabFilter} />
                    <IrMultiSelect label="Test Type" options={["DNA", "FAT", "PROTEIN", "CALCIUM"]} selected={testTypeFilter} onChange={setTestTypeFilter} />
                    <IrMultiSelect label="Needs Retest" options={["NEEDS_RETEST", "NO_RETEST"]} selected={retestFilter} onChange={setRetestFilter} />
                    <IrMultiSelect label="COA Uploaded" options={["COA_UPLOADED", "NO_COA"]} selected={coaStatusFilter} onChange={setCoaStatusFilter} />
                  </div>
                )}

                {/* Filter Actions */}
                <div className="ir-filter-actions">
                  <button type="button" className="ir-btn ir-btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }}
                    onClick={() => { setClientSearch(""); setDateFrom(""); setDateTo(""); setInspectorFilter([]); setCorpGroupFilter([]); setGroupTypeFilter([]); setSentStatusFilter([]); setComplianceFilter([]); setApprovedFilter([]); setFileStatusFilter([]); setRetestFilter([]); setCoaStatusFilter([]); setLabFilter([]); setTestTypeFilter([]); }}>
                    <i className="fas fa-times" /> Clear All
                  </button>
                  <button type="button" className="ir-btn ir-btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }}>
                    <i className="fas fa-list" /> Show All ({total})
                  </button>
                  {roleLoaded && !isLabTech && (showDuplicates ? (
                    <button type="button" className="ir-btn" style={{ padding: "8px 16px", fontSize: 14, background: "#dc2626", color: "#fff", borderRadius: 6 }}
                      onClick={() => { setShowDuplicates(false); fetchInspections(false); }}>
                      <i className="fas fa-times" /> Clear Duplicates
                    </button>
                  ) : (
                    <button type="button" className="ir-btn" style={{ padding: "8px 16px", fontSize: 14, background: "#f59e0b", color: "#fff", borderRadius: 6 }}
                      onClick={() => { setShowDuplicates(true); fetchInspections(true); }}>
                      <i className="fas fa-copy" /> View Duplicates
                      {duplicateGroupsCount > 0 && (
                        <span style={{ background: "#fff", color: "#f59e0b", borderRadius: 999, padding: "1px 7px", fontWeight: 700, marginLeft: 4, fontSize: 12 }}>{duplicateGroupsCount}</span>
                      )}
                    </button>
                  ))}
                  {roleLoaded && !isLabTech && (
                    <button type="button" className="ir-btn" style={{ padding: "8px 16px", fontSize: 14, background: "#ef4444", color: "#fff", borderRadius: 6 }}>
                      <i className="fas fa-envelope-open-text" /> Undeliverable Emails
                      <span style={{ background: "#fff", color: "#ef4444", borderRadius: 999, padding: "1px 7px", fontWeight: 700, marginLeft: 4, fontSize: 12 }}>{undeliverableCount}</span>
                    </button>
                  )}
                </div>
              </form>
              )}
            </div>
          </div>

          {/* Table Card */}
          <div className="ir-card">
            <div className="ir-card-header">
              <div className="ir-card-title"><i className="fas fa-clipboard-check" /> Inspections List</div>
            </div>
            <div className="ir-card-body">
              <div className="ir-table-info">
                {loading ? "Loading..." : `Showing ${filteredInspections.length} of ${total} inspection${total !== 1 ? "s" : ""}`}
              </div>
              <div style={{ overflowX: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: 8 }}>
                <table className="ir-table" id="shipmentsTable" style={isLabTech ? { tableLayout: "fixed", width: "100%" } : undefined}>
                  <thead>
                    <tr>
                      <th style={isLabTech ? { width: "46%" } : undefined}>Facility</th>
                      <th className="center" style={isLabTech ? { width: "7%" } : { width: 50 }}>Files</th>
                      {roleLoaded && !isLabTech && <th className="center" style={{ width: 60 }}>RFI</th>}
                      {roleLoaded && !isLabTech && <th className="center" style={{ width: 60 }}>Invoice</th>}
                      <th className="center" style={isLabTech ? { width: "12%" } : { width: 60 }}>COA</th>
                      {roleLoaded && !isLabTech && <th className="center" style={{ width: 60 }}>Compliance</th>}
                      <th className="center" style={isLabTech ? { width: "20%", whiteSpace: "nowrap" } : { width: 180, whiteSpace: "nowrap" }}>Date</th>
                      <th className="center" style={isLabTech ? { width: "12%" } : { width: 80 }}>Approved</th>
                      {roleLoaded && !isLabTech && <th style={{ width: 160 }}>Email</th>}
                      <th className="center" style={isLabTech ? { width: "10%" } : { width: 80 }}>Sent</th>
                      {roleLoaded && !isLabTech && <th className="center" style={{ width: 90 }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={isLabTech ? 6 : 11} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>
                          <div style={{ display: "inline-block", width: 18, height: 18, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", verticalAlign: "middle", marginRight: 8 }} />Loading inspections...
                        </td>
                      </tr>
                    ) : filteredInspections.length === 0 ? (
                      <tr>
                        <td colSpan={isLabTech ? 6 : 11} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No inspections match the current filters</td>
                      </tr>
                    ) : filteredInspections.map(s => {
                      const gid = String(s.id);
                      const isExpanded = expandedGroups.has(gid);
                      return (
                        <React.Fragment key={s.id}>
                          <tr onClick={() => toggleGroup(gid)}
                            style={{ cursor: "pointer", background: "white" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                            onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                            <td>
                              <span style={{ fontWeight: 600, color: "#007890", fontSize: "0.75rem" }}>{s.client_name || "-"}</span>
                              {s.town && <span style={{ fontSize: "0.65rem", color: "#9ca3af", marginLeft: 4 }}>({s.town})</span>}
                              <span style={{ fontSize: "0.65rem", color: "#6b7280", marginLeft: 8 }}>{s.inspector_name || ""}</span>
                              {s.is_occurrence_report && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, marginLeft: 6 }}>OCCURRENCE REPORT</span>}
                              {showDuplicates && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, marginLeft: 6, verticalAlign: "middle", display: "inline-block" }}>DUPLICATE</span>}
                            </td>
                            <td className="center">
                              <button style={{ padding: "3px 6px", background: s.is_occurrence_report ? "#f97316" : "#007890", color: "white", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 11 }}
                                onClick={e => { e.stopPropagation(); openFilesModal(s.group_id || String(s.id), s.client_name, s.date_of_inspection); }}>
                                <i className="fas fa-folder-open" />
                              </button>
                            </td>
                            {roleLoaded && !isLabTech && (
                              <td className="center">
                                <span className={`ir-badge ${s.has_rfi ? "ir-badge-green" : "ir-badge-red"}`}>
                                  <i className={`fas fa-${s.has_rfi ? "check" : "times"}`} style={{ fontSize: 8 }} /> {s.has_rfi ? "File" : "No-File"}
                                </span>
                              </td>
                            )}
                            {roleLoaded && !isLabTech && (
                              <td className="center">
                                <span className={`ir-badge ${s.has_invoice ? "ir-badge-green" : "ir-badge-red"}`}>
                                  <i className={`fas fa-${s.has_invoice ? "check" : "times"}`} style={{ fontSize: 8 }} /> {s.has_invoice ? "File" : "No-File"}
                                </span>
                              </td>
                            )}
                            <td className="center">
                              <span className={`ir-badge ${s.has_lab ? "ir-badge-green" : "ir-badge-red"}`}>
                                <i className={`fas fa-${s.has_lab ? "check" : "times"}`} style={{ fontSize: 8 }} /> {s.has_lab ? "File" : "No-File"}
                              </span>
                            </td>
                            {roleLoaded && !isLabTech && (
                              <td className="center">
                                <span className={`ir-badge ${s.has_compliance ? "ir-badge-green" : "ir-badge-red"}`}>
                                  <i className={`fas fa-${s.has_compliance ? "check" : "times"}`} style={{ fontSize: 8 }} /> {s.has_compliance ? "File" : "No-File"}
                                </span>
                              </td>
                            )}
                            <td className="center" style={{ fontSize: "0.55rem", whiteSpace: "nowrap", color: "#6b7280" }}>
                              {s.date_of_inspection ? new Date(s.date_of_inspection + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "-"}
                            </td>
                            <td className="center">
                              {(isLabTech || isAdmin) ? (
                                <span className={`ir-badge ${s.approved_status === "APPROVED" ? "ir-badge-green" : "ir-badge-red"}`}>
                                  <i className={`fas fa-${s.approved_status === "APPROVED" ? "check" : "clock"}`} style={{ fontSize: 8 }} /> {s.approved_status === "APPROVED" ? "Approved" : "Pending"}
                                </span>
                              ) : (
                                <select className="ir-approved-select" onClick={e => e.stopPropagation()} defaultValue={s.approved_status || "PENDING"}>
                                  <option value="PENDING">Pending</option>
                                  <option value="APPROVED">Approved</option>
                                </select>
                              )}
                            </td>
                            {roleLoaded && !isLabTech && <td style={{ fontSize: "0.75rem", color: "#6b7280" }}>{s.email || "-"}</td>}
                            <td className="center">
                              {isLabTech ? (
                                <span className={`ir-badge ${s.sent_date ? "ir-badge-green" : "ir-badge-red"}`}>
                                  <i className={`fas fa-${s.sent_date ? "check" : "times"}`} style={{ fontSize: 8 }} /> {s.sent_date ? "Sent" : "Not Sent"}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (!s.sent_date) {
                                      handleSendDocuments(s);
                                    }
                                  }}
                                  disabled={sendingId === s.id}
                                  style={{
                                    padding: "4px 12px",
                                    border: "none",
                                    borderRadius: 4,
                                    cursor: s.sent_date ? "default" : sendingId === s.id ? "wait" : "pointer",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                    background: s.sent_date ? "#10b981" : sendingId === s.id ? "#f59e0b" : "#e5e7eb",
                                    color: s.sent_date ? "white" : sendingId === s.id ? "white" : "#6b7280",
                                    opacity: sendingId === s.id ? 0.8 : 1,
                                  }}
                                >
                                  {s.sent_date ? "Sent" : sendingId === s.id ? "Sending..." : "Send"}
                                </button>
                              )}
                            </td>
                            {roleLoaded && !isLabTech && (
                              <td className="center">
                                <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                  <a
                                    href={s.products && s.products.length > 0 ? `/inspections/edit-fsa/${s.products[0].id}/` : "#"}
                                    style={{ padding: "3px 6px", background: "#007890", color: "white", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 11, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                                    onClick={e => e.stopPropagation()} title="Edit">
                                    <i className="fas fa-edit" />
                                  </a>
                                  <button style={{ padding: "3px 6px", background: "#ef4444", color: "white", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 11 }}
                                    title="Delete"
                                    onClick={async e => {
                                      e.stopPropagation();
                                      if (!confirm(`Delete inspection for "${s.client_name}" on ${s.date_of_inspection ? new Date(s.date_of_inspection).toLocaleDateString("en-GB") : "unknown date"}?\n\nThis cannot be undone.`)) return;
                                      try {
                                        console.log(`[Delete] Deleting group_id=${s.group_id}, client=${s.client_name}, id=${s.id}`);
                                        const res = await fetch("/api/delete-inspection-group/", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ group_id: s.group_id }),
                                        });
                                        console.log(`[Delete] Response status: ${res.status}`);
                                        const data = await res.json();
                                        console.log(`[Delete] Response data:`, data);
                                        if (data.success) {
                                          showToast(`Deleted inspection for ${s.client_name}`);
                                          setInspections(prev => prev.filter(i => i.id !== s.id));
                                        } else {
                                          alert("Delete failed: " + (data.error || "Unknown error"));
                                        }
                                      } catch (err) {
                                        console.error(`[Delete] Error:`, err);
                                        alert("Delete error: " + (err instanceof Error ? err.message : String(err)));
                                      }
                                    }}>
                                    <i className="fas fa-trash" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={isLabTech ? 6 : 11} style={{ padding: 0 }}>
                                {renderDetailRow(s)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* Files Modal */}
      {filesModal.visible && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9999,
        }} onClick={() => setFilesModal(prev => ({ ...prev, visible: false }))}>
          <div style={{
            background: "white", borderRadius: 12, padding: 24,
            maxWidth: 700, width: "90%", maxHeight: "80vh", overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#1f2937" }}>
                <i className="fas fa-folder-open" style={{ marginRight: 8, color: "#007890" }} />
                Inspection Files - {filesModal.clientName}
              </h3>
              <button onClick={() => setFilesModal(prev => ({ ...prev, visible: false }))}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280", padding: "4px 8px" }}>
                &times;
              </button>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
              Date: {filesModal.inspectionDate ? new Date(filesModal.inspectionDate + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "-"}
            </p>

            {filesModal.loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "4px solid #e5e7eb", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                Loading files...
              </div>
            ) : (
              (() => {
                const categories: { key: string; label: string; color: string }[] = [
                  { key: "rfi", label: "RFI", color: "#3b82f6" },
                  { key: "invoice", label: "Invoice", color: "#8b5cf6" },
                  { key: "lab", label: "Lab", color: "#06b6d4" },
                  { key: "lab_form", label: "Lab Form", color: "#14b8a6" },
                  { key: "retest", label: "Retest", color: "#f59e0b" },
                  { key: "compliance", label: "Compliance", color: "#22c55e" },
                  { key: "occurrence", label: "Occurrence", color: "#ef4444" },
                  { key: "composition", label: "Composition", color: "#ec4899" },
                  { key: "other", label: "Other", color: "#6b7280" },
                ];
                const totalFiles = Object.values(filesModal.files).reduce((sum, arr) => sum + (arr?.length || 0), 0);
                return (
                  <>
                    {totalFiles === 0 && (
                      <div style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>
                        <i className="fas fa-folder-open" style={{ fontSize: 32, marginBottom: 8 }} /><br />
                        No files found for this inspection.
                      </div>
                    )}
                    {categories.map(cat => {
                      const files = filesModal.files[cat.key] || [];
                      if (files.length === 0) return null;
                      return (
                        <div key={cat.key} style={{ marginBottom: 12 }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 10px", background: "#f9fafb", borderRadius: 6, marginBottom: 4,
                          }}>
                            <span style={{
                              background: cat.color, color: "white", fontSize: 11, fontWeight: 700,
                              padding: "2px 8px", borderRadius: 4,
                            }}>{cat.label}</span>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>
                              {files.length} file{files.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {files.map((f, i) => {
                            const filePath = f.relative_path || f.path || "";
                            const viewUrl = `/api/serve-file?file=${encodeURIComponent(filePath)}&action=view`;
                            const downloadUrl = `/api/serve-file?file=${encodeURIComponent(filePath)}&action=download`;
                            const sizeLabel = f.size < 1024 ? `${f.size} B` : f.size < 1048576 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / 1048576).toFixed(1)} MB`;
                            return (
                              <div key={i} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "8px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13,
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                  <i className="fas fa-file-pdf" style={{ color: "#ef4444", flexShrink: 0 }} />
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                  <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{sizeLabel}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                                  <a href={viewUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#007890", color: "white", borderRadius: 4, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                                    <i className="fas fa-eye" />View
                                  </a>
                                  <a href={downloadUrl} download={f.name}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#3b82f6", color: "white", borderRadius: 4, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                                    <i className="fas fa-download" />Download
                                  </a>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete "${f.name}"?`)) return;
                                      const res = await fetch("/api/delete-file", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ file: filePath }),
                                      });
                                      const data = await res.json();
                                      if (data.success) {
                                        showToast(`Deleted: ${f.name}`);
                                        setFilesModal(prev => {
                                          const updated = { ...prev.files };
                                          Object.keys(updated).forEach(k => {
                                            updated[k] = updated[k].filter((_, fi) => !(k === cat.key && fi === i));
                                          });
                                          return { ...prev, files: updated };
                                        });
                                      } else {
                                        alert("Delete failed: " + (data.error || "Unknown error"));
                                      }
                                    }}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                    <i className="fas fa-trash" />Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                );
              })()
            )}

            <button
              style={{
                marginTop: 16, width: "100%", padding: "10px", background: "#e5e7eb",
                color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 500,
              }}
              onClick={() => setFilesModal(prev => ({ ...prev, visible: false }))}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
