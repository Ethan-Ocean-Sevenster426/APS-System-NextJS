"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ClientRecord {
  client_id: string;
  name: string;
  facility_type: string;
  town: string;
  corporate_group: string;
  internal_account_code: string;
  email: string;
  phone_number: string;
  group_type: string;
}

interface ApiResponse {
  clients: ClientRecord[];
  total_count: number;
  page: number;
  num_pages: number;
  per_page: number;
  filters: {
    corporate_groups: string[];
    facility_types: string[];
    group_types: string[];
    provinces: string[];
  };
  error?: string;
}

interface DropdownOptionItem {
  value: string;
  count: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  client: ClientRecord | null;
}

/* ------------------------------------------------------------------ */
/*  Multi-select dropdown component (mirrors cas-ms-btn / cas-ms-drop) */
/* ------------------------------------------------------------------ */
function MultiSelect({
  label,
  placeholder,
  options,
  selected,
  onChange,
  labels,
}: {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  labels?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (val: string) => {
    onChange(
      selected.includes(val)
        ? selected.filter((v) => v !== val)
        : [...selected, val]
    );
  };

  const display = selected.length > 0 ? `${selected.length} selected` : placeholder;

  return (
    <div>
      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#1f2937", marginBottom: "0.5rem" }}>
        {label}
      </label>
      <div ref={ref} style={{ position: "relative", width: "100%", fontSize: "0.875rem" }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            background: "#fff",
            fontSize: "0.875rem",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.25rem",
            color: "#374151",
            boxSizing: "border-box",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{display}</span>
          <i className="fas fa-chevron-down" style={{ fontSize: "0.7rem", flexShrink: 0 }} />
        </button>
        {open && (
          <div
            className="cas-ms-drop"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              zIndex: 9999,
              maxHeight: 220,
              overflowY: "auto",
              padding: "0.25rem 0",
              minWidth: 0,
            }}
          >
            {options.map((opt) => (
              <label
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "0.5rem",
                  padding: "0.35rem 0.75rem",
                  cursor: "pointer",
                  color: "#374151",
                  userSelect: "none",
                  fontSize: "0.8rem",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  style={{ cursor: "pointer", accentColor: "#007890" }}
                />
                {labels?.[opt] ?? opt}
              </label>
            ))}
            {options.length === 0 && (
              <div style={{ padding: "0.4rem 0.75rem", color: "#9ca3af", fontSize: "0.8rem" }}>No options</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Province options                                                    */
/* ------------------------------------------------------------------ */
const PROVINCE_OPTIONS = [
  "TBC", "Gauteng", "North West", "Eastern Cape", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "Northern Cape", "Western Cape", "Free State",
  "Unknown/Other", "To be declared",
];

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
export default function ClientsPage() {
  /* --- state: data --- */
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [loading, setLoading] = useState(true);

  /* --- state: filter options from API --- */
  const [corporateGroupOptions, setCorporateGroupOptions] = useState<string[]>([]);
  const [facilityTypeOptions, setFacilityTypeOptions] = useState<string[]>([]);
  const [groupTypeOptions, setGroupTypeOptions] = useState<string[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);

  /* --- state: active filter values --- */
  const [filterClientId, setFilterClientId] = useState("");
  const [filterClientName, setFilterClientName] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const allClientNames = Array.from(new Set(clients.map(c => c.name).filter(Boolean))).sort();
  const [filterCorporateGroup, setFilterCorporateGroup] = useState<string[]>([]);
  const [filterCommodity, setFilterCommodity] = useState<string[]>([]);
  const [filterFacilityType, setFilterFacilityType] = useState<string[]>([]);
  const [filterFacilityCode, setFilterFacilityCode] = useState<string[]>([]);
  const [filterProvince, setFilterProvince] = useState<string[]>([]);
  const [filterAccountCode, setFilterAccountCode] = useState("");
  const [filterGroupType, setFilterGroupType] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [perPage, setPerPage] = useState(100);

  /* --- state: modals --- */
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDropdownModal, setShowDropdownModal] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);

  /* --- state: add/edit form --- */
  const [formBusinessName, setFormBusinessName] = useState("");
  const [formFacilityType, setFormFacilityType] = useState("");
  const [formGroupType, setFormGroupType] = useState("");
  const [formCommodity, setFormCommodity] = useState("");
  const [formProvince, setFormProvince] = useState("");
  const [formCorporateGroup, setFormCorporateGroup] = useState("");
  const [formAllocated, setFormAllocated] = useState("no");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formActiveStatus, setFormActiveStatus] = useState("Active");
  const [editClientId, setEditClientId] = useState("");

  /* --- state: context menu --- */
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    client: null,
  });

  /* --- state: dropdown options modal --- */
  const [ddTab, setDdTab] = useState<"facility_type" | "corporate_group" | "group_type">("facility_type");
  const [ddFacilityTypes, setDdFacilityTypes] = useState<DropdownOptionItem[]>([]);
  const [ddCorporateGroups, setDdCorporateGroups] = useState<DropdownOptionItem[]>([]);
  const [ddGroupTypes, setDdGroupTypes] = useState<DropdownOptionItem[]>([]);
  const [ddNewValue, setDdNewValue] = useState("");
  const [ddLoading, setDdLoading] = useState(false);

  /* ---- fetch data ---- */
  const fetchClients = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClientId) params.set("client_id", filterClientId);
      if (filterClientName) params.set("client_name", filterClientName);
      if (filterCorporateGroup.length) params.set("corporate_group", filterCorporateGroup.join(","));
      if (filterCommodity.length) params.set("commodity", filterCommodity.join(","));
      if (filterFacilityType.length) params.set("facility_type", filterFacilityType.join(","));
      if (filterFacilityCode.length) params.set("facility_code", filterFacilityCode.join(","));
      if (filterProvince.length) params.set("province", filterProvince.join(","));
      if (filterAccountCode) params.set("account_code", filterAccountCode);
      if (filterGroupType.length) params.set("group_type", filterGroupType.join(","));
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);
      params.set("per_page", String(perPage));
      params.set("page", String(pageNum));

      try {
        console.log(`[Clients] Fetching: /api/clients?${params.toString()}`);
        const res = await fetch(`/api/clients?${params.toString()}`);
        const data: ApiResponse = await res.json();
        console.log(`[Clients] Response:`, { total: data.total_count, clients: data.clients?.length, error: data.error });
        if (data.clients?.length) console.log(`[Clients] First 3:`, data.clients.slice(0, 3).map(c => c.name));
        setClients(data.clients || []);
        setTotalCount(data.total_count || 0);
        setPage(data.page || 1);
        setNumPages(data.num_pages || 1);
        if (data.filters) {
          setCorporateGroupOptions(data.filters.corporate_groups || []);
          setFacilityTypeOptions(data.filters.facility_types || []);
          setGroupTypeOptions(data.filters.group_types || []);
          setProvinceOptions(data.filters.provinces || []);
        }
      } catch {
        setClients([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [filterClientId, filterClientName, filterCorporateGroup, filterCommodity, filterFacilityType, filterFacilityCode, filterProvince, filterAccountCode, filterGroupType, sortBy, sortOrder, perPage]
  );

  /* initial load */
  useEffect(() => {
    fetchClients(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* close context menu on click outside */
  useEffect(() => {
    function handleClick() {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Auto-search when client name changes (debounced)
  useEffect(() => {
    if (!filterClientName) return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchClients(1);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterClientName]);

  /* ---- handlers ---- */
  const applyFilters = () => {
    setPage(1);
    fetchClients(1);
  };

  const clearFilters = () => {
    setFilterClientId("");
    setFilterClientName("");
    setFilterCorporateGroup([]);
    setFilterCommodity([]);
    setFilterFacilityType([]);
    setFilterFacilityCode([]);
    setFilterProvince([]);
    setFilterAccountCode("");
    setFilterGroupType([]);
    setSortBy("name");
    setSortOrder("asc");
    setPerPage(100);
    // We need to fetch after clearing - use a timeout so state updates first
    setTimeout(() => {
      (async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/clients?sort_by=name&sort_order=asc&per_page=100&page=1");
          const data: ApiResponse = await res.json();
          setClients(data.clients || []);
          setTotalCount(data.total_count || 0);
          setPage(data.page || 1);
          setNumPages(data.num_pages || 1);
          if (data.filters) {
            setCorporateGroupOptions(data.filters.corporate_groups || []);
            setFacilityTypeOptions(data.filters.facility_types || []);
            setGroupTypeOptions(data.filters.group_types || []);
            setProvinceOptions(data.filters.provinces || []);
          }
        } catch {
          /* ignore */
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > numPages) return;
    setPage(p);
    fetchClients(p);
  };

  /* row offset for numbering */
  const startIndex = (page - 1) * perPage;

  /* ------------------------------------------------------------------ */
  /*  Commodity & Facility Code static options                           */
  /* ------------------------------------------------------------------ */
  const commodityOptions = ["EGG", "PMP", "RAW", "PLT"];
  const facilityCodeOptions = [
    { value: "AB", label: "AB - Abattoir" },
    { value: "BU", label: "BU - Butchery" },
    { value: "FA", label: "FA - Farm" },
    { value: "PR", label: "PR - Production Plant" },
    { value: "RE", label: "RE - Retailer/Re-Packer" },
  ];

  /* ------------------------------------------------------------------ */
  /*  Add Client                                                         */
  /* ------------------------------------------------------------------ */
  const resetForm = () => {
    setFormBusinessName("");
    setFormFacilityType("");
    setFormGroupType("");
    setFormCommodity("");
    setFormProvince("");
    setFormCorporateGroup("");
    setFormAllocated("no");
    setFormEmail("");
    setFormPhone("");
    setFormActiveStatus("Active");
    setEditClientId("");
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleAddClient = async () => {
    if (!formBusinessName.trim()) {
      alert("Business Name is required.");
      return;
    }
    setModalSaving(true);
    try {
      const res = await fetch("/api/clients/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: formBusinessName,
          facility_type: formFacilityType,
          group_type: formGroupType,
          commodity: formCommodity,
          province: formProvince,
          corporate_group: formCorporateGroup,
          allocated: formAllocated,
          representative_email: formEmail,
          phone_number: formPhone,
        }),
      });
      const data = await res.json();
      console.log(`[AddClient] Response:`, data);
      if (data.success) {
        setShowAddModal(false);
        fetchClients(page);
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(`[AddClient] Error:`, e);
      alert("Network error: " + String(e));
    } finally {
      setModalSaving(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Edit Client                                                        */
  /* ------------------------------------------------------------------ */
  const openEditModal = (client: ClientRecord) => {
    setEditClientId(client.client_id);
    setFormBusinessName(client.name || "");
    setFormFacilityType(client.facility_type || "");
    setFormGroupType(client.group_type || "");
    setFormCommodity(""); // Not shown in the list; leave default
    setFormProvince(client.town || "");
    setFormCorporateGroup(client.corporate_group || "");
    setFormAllocated("no"); // Default
    setFormEmail(client.email || "");
    setFormPhone(client.phone_number || "");
    setFormActiveStatus("Active");
    setShowEditModal(true);
  };

  const handleEditClient = async () => {
    if (!formBusinessName.trim()) {
      alert("Business Name is required.");
      return;
    }
    setModalSaving(true);
    try {
      const res = await fetch("/api/clients/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: editClientId,
          business_name: formBusinessName,
          facility_type: formFacilityType,
          group_type: formGroupType,
          commodity: formCommodity,
          province: formProvince,
          corporate_group: formCorporateGroup,
          allocated: formAllocated,
          representative_email: formEmail,
          phone_number: formPhone,
          active_status: formActiveStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Client updated successfully!");
        setShowEditModal(false);
        fetchClients(page);
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error: " + String(e));
    } finally {
      setModalSaving(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Delete Client                                                      */
  /* ------------------------------------------------------------------ */
  const handleDeleteClient = async (client: ClientRecord) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete client ${client.client_id} - ${client.name}?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/clients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.client_id }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Client deleted successfully!");
        fetchClients(page);
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error: " + String(e));
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Context Menu                                                       */
  /* ------------------------------------------------------------------ */
  const handleContextMenu = (e: React.MouseEvent, client: ClientRecord) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      client,
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Dropdown Options Modal                                             */
  /* ------------------------------------------------------------------ */
  const fetchDropdownOptions = async () => {
    setDdLoading(true);
    try {
      const res = await fetch("/api/clients/dropdown-options");
      const data = await res.json();
      setDdFacilityTypes(data.facility_types || []);
      setDdCorporateGroups(data.corporate_groups || []);
      setDdGroupTypes(data.group_types || []);
    } catch {
      /* ignore */
    } finally {
      setDdLoading(false);
    }
  };

  const openDropdownModal = () => {
    setDdTab("facility_type");
    setDdNewValue("");
    fetchDropdownOptions();
    setShowDropdownModal(true);
  };

  const handleAddDropdownOption = async () => {
    if (!ddNewValue.trim()) return;
    try {
      const res = await fetch("/api/clients/dropdown-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_type: ddTab, value: ddNewValue.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setDdNewValue("");
        fetchDropdownOptions();
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error: " + String(e));
    }
  };

  const handleDeleteDropdownOption = async (fieldType: string, value: string) => {
    const confirmed = window.confirm(
      `Delete "${value}" from ${fieldType.replace("_", " ")}?\n\nThis will also clear this value from all clients that use it.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/clients/dropdown-options/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_type: fieldType, value }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDropdownOptions();
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error: " + String(e));
    }
  };

  /* get current tab items */
  const ddCurrentItems =
    ddTab === "facility_type"
      ? ddFacilityTypes
      : ddTab === "corporate_group"
        ? ddCorporateGroups
        : ddGroupTypes;

  /* ------------------------------------------------------------------ */
  /*  Facility type options for forms (combine API + static defaults)    */
  /* ------------------------------------------------------------------ */
  const formFacilityTypeOptions = Array.from(
    new Set([
      "Retailer", "Butchery", "Re-Packer", "Production Plant", "Farm", "Abattoir",
      ...facilityTypeOptions,
    ])
  ).sort();

  const formGroupTypeOptionsList = Array.from(
    new Set([
      "Individual/Independent Owner", "Corporate Store", "Franchise Store",
      ...groupTypeOptions,
    ])
  ).sort();

  const formCorporateGroupOptions = Array.from(
    new Set([
      "Not Applicable (None)", "Pick n Pay - Franchise", "Pick n Pay - Corporate",
      "Fruit & Veg", "OK Foods", "Checkers", "Spar", "SuperSpar", "Spar - Northrand",
      "Shoprite", "Massmart", "Chester Butcheries", "Boxer", "Food Lovers Market",
      "Cambridge", "Woolworths", "Jwayelani", "Usave", "OBC", "Roots", "Meat World",
      "Quantum Foods Nulaid", "Bluff Meat Supply", "Eat Sum Meat",
      "Waltloo Meat and Chicken", "Choppies", "Econo Foods", "Makro",
      "Boma Vleismark", "Eskort", "Nesta Foods", "Other (Unlisted Group)",
      ...corporateGroupOptions,
    ])
  ).sort();

  /* ------------------------------------------------------------------ */
  /*  Render helper: Client Form (shared between Add and Edit modals)    */
  /* ------------------------------------------------------------------ */
  const renderClientForm = () => (
    <div className="cas-modal-body">
      {/* Row 1 */}
      <div className="cas-form-row">
        <div className="cas-form-group">
          <label>Business Name *</label>
          <input
            type="text"
            value={formBusinessName}
            onChange={(e) => setFormBusinessName(e.target.value)}
            placeholder="Enter business name"
          />
        </div>
        <div className="cas-form-group">
          <label>Facility Type</label>
          <select value={formFacilityType} onChange={(e) => setFormFacilityType(e.target.value)}>
            <option value="">-- Select --</option>
            {formFacilityTypeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2 */}
      <div className="cas-form-row">
        <div className="cas-form-group">
          <label>Group Type</label>
          <select value={formGroupType} onChange={(e) => setFormGroupType(e.target.value)}>
            <option value="">-- Select --</option>
            {formGroupTypeOptionsList.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="cas-form-group">
          <label>Commodity</label>
          <select value={formCommodity} onChange={(e) => setFormCommodity(e.target.value)}>
            <option value="">-- Select --</option>
            {commodityOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3 */}
      <div className="cas-form-row">
        <div className="cas-form-group">
          <label>Province</label>
          <select value={formProvince} onChange={(e) => setFormProvince(e.target.value)}>
            <option value="">-- Select --</option>
            {PROVINCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="cas-form-group">
          <label>Corporate Group</label>
          <select value={formCorporateGroup} onChange={(e) => setFormCorporateGroup(e.target.value)}>
            <option value="">-- Auto-detect from name --</option>
            {formCorporateGroupOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 4 */}
      <div className="cas-form-row">
        <div className="cas-form-group">
          <label>Allocated</label>
          <select value={formAllocated} onChange={(e) => setFormAllocated(e.target.value)}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        {showEditModal && (
          <div className="cas-form-group">
            <label>Active Status</label>
            <select value={formActiveStatus} onChange={(e) => setFormActiveStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>
        )}
        {!showEditModal && <div />}
      </div>

      {/* Row 5 */}
      <div className="cas-form-row">
        <div className="cas-form-group">
          <label>Representative Email</label>
          <input
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div className="cas-form-group">
          <label>Phone Number</label>
          <input
            type="text"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="+27..."
          />
        </div>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
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
      {/* ---- Scoped styles ---- */}
      <style>{`
        .cas-header { text-align: center; margin-bottom: 2rem; }
        .cas-header h1 { font-size: 1.875rem; font-weight: bold; color: white; margin: 0 0 0.5rem; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
        .cas-header h2 { font-size: 1.25rem; color: white; margin: 0 0 0.5rem; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
        .cas-header p { font-size: 0.875rem; color: white; margin: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }

        .cas-action-bar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }

        .cas-btn {
          padding: 0.625rem 1.25rem; border-radius: 0.375rem; font-size: 0.875rem;
          font-weight: 500; display: inline-flex; align-items: center; gap: 0.5rem;
          cursor: pointer; border: none; text-decoration: none; transition: all 0.2s;
        }
        .cas-btn-primary { background: #007890; color: white; border: 1px solid #007890; }
        .cas-btn-primary:hover { background: #005a6b; border-color: #004a57; }
        .cas-btn-secondary { background: #6b7280; color: white; border: 1px solid #6b7280; }
        .cas-btn-secondary:hover { background: #4b5563; border-color: #374151; }
        .cas-btn-danger { background: #dc2626; color: white; border: 1px solid #dc2626; }
        .cas-btn-danger:hover { background: #b91c1c; border-color: #991b1b; }

        .cas-filter-section {
          background: #ffffff; padding: 1.5rem; margin-bottom: 1.5rem;
          border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }
        .cas-filter-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem; margin-bottom: 1rem;
        }
        .cas-filter-grid > div > label {
          display: block; font-size: 0.875rem; font-weight: 600;
          color: #1f2937; margin-bottom: 0.5rem;
        }
        .cas-filter-grid > div > input, .cas-filter-grid > div > select {
          width: 100%; padding: 0.5rem; border: 1px solid #d1d5db;
          border-radius: 0.375rem; font-size: 0.875rem; box-sizing: border-box;
        }
        .cas-filter-buttons { display: flex; gap: 0.75rem; }

        .cas-table-container {
          overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb;
          width: 100%; background: white;
        }
        .cas-table {
          width: 100%; border-collapse: collapse; font-size: 0.7rem;
          min-width: 800px; background: white;
        }
        .cas-table th {
          background-color: #111827; color: #f9fafb; text-align: left;
          padding: 10px 12px; font-weight: 600; white-space: nowrap;
          border-bottom: 1px solid #374151; font-size: 0.75rem;
          position: sticky; top: 0; z-index: 10;
        }
        .cas-table th.row-number {
          background-color: #111827; color: #9ca3af; font-weight: 600;
          min-width: 50px; width: 50px; text-align: center;
        }
        .cas-table tr:nth-child(even) { background-color: #fafafa; }
        .cas-table tr:nth-child(odd) { background-color: white; }
        .cas-table tbody tr:hover { background-color: rgba(0, 115, 135, 0.04); }
        .cas-table tbody tr { cursor: pointer; transition: background-color 0.15s ease; }
        .cas-table td {
          padding: 10px 12px; border-bottom: 1px solid #f3f4f6;
          font-size: 0.75rem; white-space: nowrap; max-width: 120px;
          overflow: hidden; text-overflow: ellipsis; color: #374151;
        }
        .cas-table td.row-number {
          background: transparent; color: #9ca3af; font-weight: 500;
          text-align: center; min-width: 50px; width: 50px; font-size: 0.7rem;
        }
        .cas-table td.account-code-cell {
          font-family: 'Courier New', monospace; font-size: 0.7rem; font-weight: 500;
        }
        .cas-table td.email-cell { font-size: 0.75rem; }

        .cas-pagination {
          margin-top: 2rem; margin-bottom: 2rem; padding: 1rem;
          display: flex; justify-content: center; align-items: center; gap: 0.5rem;
        }
        .cas-pagination .page-info {
          display: inline-block; padding: 0.5rem 0.75rem; font-weight: 600;
        }
        .cas-page-btn {
          padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem;
          font-weight: 500; cursor: pointer; border: 1px solid #6b7280;
          background: #6b7280; color: white; text-decoration: none; transition: all 0.2s;
        }
        .cas-page-btn:hover { background: #4b5563; border-color: #374151; }
        .cas-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .cas-loading {
          display: flex; justify-content: center; align-items: center;
          padding: 3rem; color: #6b7280; font-size: 1rem;
          background: white; border-radius: 0.5rem; border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem;
        }

        /* ---- Modal styles ---- */
        .cas-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          z-index: 10000; display: flex; align-items: center; justify-content: center;
        }
        .cas-modal-content {
          background: white; border-radius: 8px; max-width: 700px; width: 90%;
          max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .cas-modal-header {
          background: linear-gradient(135deg, #007890 0%, #005a6b 100%);
          padding: 16px 24px; border-bottom: 3px solid #EC343C;
          border-radius: 8px 8px 0 0; display: flex; justify-content: space-between;
          align-items: center; color: white;
        }
        .cas-modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; }
        .cas-modal-header button {
          background: none; border: none; color: white; font-size: 1.5rem;
          cursor: pointer; line-height: 1; padding: 0; opacity: 0.8;
        }
        .cas-modal-header button:hover { opacity: 1; }
        .cas-modal-body { padding: 24px; }
        .cas-modal-footer {
          padding: 16px 24px; border-top: 1px solid #e5e7eb;
          display: flex; justify-content: flex-end; gap: 12px;
        }
        .cas-form-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
        }
        .cas-form-group label {
          display: block; font-size: 0.875rem; font-weight: 600;
          color: #374151; margin-bottom: 4px;
        }
        .cas-form-group input, .cas-form-group select {
          width: 100%; padding: 8px 12px; border: 1px solid #d1d5db;
          border-radius: 6px; font-size: 0.875rem; box-sizing: border-box;
        }
        .cas-form-group input:focus, .cas-form-group select:focus {
          outline: none; border-color: #007890; box-shadow: 0 0 0 2px rgba(0,120,144,0.15);
        }

        /* ---- Context Menu ---- */
        .cas-context-menu {
          position: fixed; z-index: 10001; background: white;
          border: 1px solid #d1d5db; border-radius: 6px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15); min-width: 180px;
          padding: 4px 0; font-size: 0.875rem;
        }
        .cas-context-menu-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; cursor: pointer; color: #374151;
          transition: background 0.1s;
        }
        .cas-context-menu-item:hover { background: #f3f4f6; }
        .cas-context-menu-item.danger { color: #dc2626; }
        .cas-context-menu-item.danger:hover { background: #fef2f2; }
        .cas-context-menu-divider {
          height: 1px; background: #e5e7eb; margin: 4px 0;
        }

        /* ---- Dropdown Options Modal tabs ---- */
        .cas-dd-tabs {
          display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 16px;
        }
        .cas-dd-tab {
          padding: 8px 20px; cursor: pointer; font-size: 0.875rem;
          font-weight: 500; color: #6b7280; border-bottom: 2px solid transparent;
          margin-bottom: -2px; transition: all 0.2s; background: none; border-top: none;
          border-left: none; border-right: none;
        }
        .cas-dd-tab:hover { color: #007890; }
        .cas-dd-tab.active { color: #007890; border-bottom-color: #007890; font-weight: 600; }
        .cas-dd-add-row {
          display: flex; gap: 8px; margin-bottom: 16px;
        }
        .cas-dd-add-row input {
          flex: 1; padding: 8px 12px; border: 1px solid #d1d5db;
          border-radius: 6px; font-size: 0.875rem;
        }
        .cas-dd-add-row input:focus {
          outline: none; border-color: #007890;
        }
        .cas-dd-list {
          max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        .cas-dd-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 12px; border-bottom: 1px solid #f3f4f6;
          font-size: 0.85rem;
        }
        .cas-dd-item:last-child { border-bottom: none; }
        .cas-dd-item:hover { background: #f9fafb; }
        .cas-dd-item-name { color: #374151; }
        .cas-dd-item-count { color: #9ca3af; font-size: 0.75rem; margin-left: 4px; }
        .cas-dd-item-delete {
          background: none; border: none; color: #dc2626; cursor: pointer;
          font-size: 0.8rem; padding: 2px 6px; border-radius: 4px;
        }
        .cas-dd-item-delete:hover { background: #fef2f2; }

        @media (max-width: 768px) {
          .cas-header h1 { font-size: 1.1rem !important; }
          .cas-header h2 { font-size: 0.85rem !important; }
          .cas-action-bar { flex-direction: column; gap: 6px !important; }
          .cas-btn { width: 100%; justify-content: center; font-size: 0.8rem !important; padding: 8px 12px !important; }
          .cas-filter-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .cas-filter-grid > div > label { font-size: 0.75rem; margin-bottom: 2px; }
          .cas-filter-grid > div > input, .cas-filter-grid > div > select { padding: 8px; font-size: 0.8rem; }
          .cas-filter-buttons { flex-direction: column; }
          .cas-filter-buttons .cas-btn { width: 100%; }
          .cas-filter-section { padding: 12px !important; margin-bottom: 12px !important; }
          .cas-form-row { grid-template-columns: 1fr; }
          .cas-table { min-width: 600px; }
          .cas-table-container { border-radius: 4px; -webkit-overflow-scrolling: touch; }
          .cas-card { overflow-x: auto; }
          .cas-modal-content { width: 95% !important; max-height: 90vh !important; padding: 0 !important; }
          .cas-modal-body { padding: 16px !important; }
          .cas-ms-drop { max-height: 200px; }
        }
        @media (max-width: 480px) {
          .cas-filter-grid { grid-template-columns: 1fr !important; }
          .cas-header h1 { font-size: 0.95rem !important; }
          .cas-header h2 { font-size: 0.75rem !important; }
          .cas-table { min-width: 500px; font-size: 0.65rem; }
          .cas-table th, .cas-table td { padding: 6px 8px; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ padding: 5 }}>
        {/* Header */}
        <div className="cas-header">
          <h1>Food Safety Agency (Pty) Ltd</h1>
          <h2>Client Allocation Sheet</h2>
          {totalCount > 0 && (
            <p>
              <i className="fas fa-database" /> Displaying {clients.length} of {totalCount} total record{totalCount !== 1 ? "s" : ""} (Latest {perPage})
            </p>
          )}
        </div>

        {/* Action Bar */}
        <div className="cas-action-bar">
          <a href="/" className="cas-btn cas-btn-primary">
            <i className="fas fa-home" /> Home
          </a>
          <button type="button" className="cas-btn cas-btn-primary" onClick={openAddModal}>
            <i className="fas fa-plus" /> Add New Client
          </button>
          <button type="button" className="cas-btn cas-btn-secondary" onClick={openDropdownModal}>
            <i className="fas fa-cog" /> Manage Dropdown Options
          </button>
        </div>


        {/* Filter Section */}
        <div className="cas-filter-section">
          <div className="cas-filter-grid">
            {/* Client Name with autocomplete */}
            <div style={{ position: "relative" }}>
              <label>Client Name</label>
              <input
                type="text"
                placeholder="Search or select client..."
                value={filterClientName}
                onChange={(e) => setFilterClientName(e.target.value)}
                onFocus={() => setClientDropdownOpen(true)}
                onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
              />
              {clientDropdownOpen && filterClientName.length > 0 && (() => {
                const matches = allClientNames.filter(n =>
                  n.toLowerCase().includes(filterClientName.toLowerCase())
                ).slice(0, 15);
                if (matches.length === 0) return null;
                return (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0,
                    background: "#fff", border: "1px solid #d1d5db", borderRadius: "0 0 6px 6px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)", zIndex: 9999,
                    maxHeight: 200, overflowY: "auto",
                  }}>
                    {matches.map(name => (
                      <div key={name}
                        style={{ padding: "6px 10px", cursor: "pointer", fontSize: "0.8rem", borderBottom: "1px solid #f3f4f6" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#e6f3f7")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        onClick={() => { setFilterClientName(name); setClientDropdownOpen(false); }}>
                        {name}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Corporate Group */}
            <MultiSelect
              label="Corporate Group"
              placeholder="All Corporate Groups"
              options={corporateGroupOptions}
              selected={filterCorporateGroup}
              onChange={setFilterCorporateGroup}
            />

            {/* Commodity */}
            <MultiSelect
              label="Commodity"
              placeholder="All Commodities"
              options={commodityOptions}
              selected={filterCommodity}
              onChange={setFilterCommodity}
            />

            {/* Facility Type */}
            <MultiSelect
              label="Facility Type"
              placeholder="All Facility Types"
              options={facilityTypeOptions}
              selected={filterFacilityType}
              onChange={setFilterFacilityType}
            />

            {/* Town */}
            <MultiSelect
              label="Town"
              placeholder="All Towns"
              options={provinceOptions}
              selected={filterProvince}
              onChange={setFilterProvince}
            />

            {/* Group Type */}
            <MultiSelect
              label="Group Type"
              placeholder="All Group Types"
              options={groupTypeOptions}
              selected={filterGroupType}
              onChange={setFilterGroupType}
            />

            {/* Sort By */}
            <div>
              <label>Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="facility_type">Facility Type</option>
                <option value="corporate_group">Corporate Group</option>
                <option value="town">Town</option>
              </select>
            </div>

            {/* Per Page */}
            <div>
              <label>Per Page</label>
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div className="cas-filter-buttons">
            <button type="button" className="cas-btn cas-btn-primary" style={{ padding: "0.5rem 1rem" }} onClick={applyFilters}>
              <i className="fas fa-filter" /> Apply Filters
            </button>
            <button type="button" className="cas-btn cas-btn-secondary" style={{ padding: "0.5rem 1rem" }} onClick={clearFilters}>
              <i className="fas fa-times" /> Clear All Filters
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="cas-loading">
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", marginRight: 10, flexShrink: 0 }} /> Loading clients...
          </div>
        ) : (
          <div className="cas-table-container">
            <table className="cas-table">
              <thead>
                <tr>
                  <th className="row-number">#</th>
                  <th>Client ID</th>
                  <th>Business Name</th>
                  <th>Facility Type</th>
                  <th>Town</th>
                  <th>Corporate Group</th>
                  <th>Account Code</th>
                  <th>Allocated</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr
                    key={c.client_id}
                    onContextMenu={(e) => handleContextMenu(e, c)}
                  >
                    <td className="row-number">{startIndex + i + 1}</td>
                    <td style={{ textAlign: "center", padding: "0.5rem", fontWeight: 500 }}>{c.client_id}</td>
                    <td style={{ padding: "0.5rem" }}>{c.name || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>{c.facility_type || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>{c.town || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>{c.corporate_group || "-"}</td>
                    <td className="account-code-cell">{c.internal_account_code || "-"}</td>
                    <td style={{ textAlign: "center", padding: "0.5rem" }}>
                      <span style={{ color: "#6b7280" }}>-</span>
                    </td>
                    <td className="email-cell" style={{ padding: "0.5rem", fontSize: "0.75rem" }}>{c.email || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>{c.phone_number || "-"}</td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                      No clients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && numPages > 1 && (
          <div className="cas-pagination">
            {page > 1 && (
              <>
                <button className="cas-page-btn" onClick={() => goToPage(1)}>First</button>
                <button className="cas-page-btn" onClick={() => goToPage(page - 1)}>Previous</button>
              </>
            )}
            <span className="page-info">
              Page {page} of {numPages}
            </span>
            {page < numPages && (
              <>
                <button className="cas-page-btn" onClick={() => goToPage(page + 1)}>Next</button>
                <button className="cas-page-btn" onClick={() => goToPage(numPages)}>Last</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/*  Context Menu                                                     */}
      {/* ================================================================ */}
      {contextMenu.visible && contextMenu.client && (
        <div
          className="cas-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div
            className="cas-context-menu-item"
            onClick={() => {
              openEditModal(contextMenu.client!);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          >
            <i className="fas fa-edit" /> Edit Client
          </div>
          <div
            className="cas-context-menu-item"
            onClick={() => {
              console.log("Export to Excel:", contextMenu.client);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          >
            <i className="fas fa-file-excel" /> Export to Excel
          </div>
          <div className="cas-context-menu-divider" />
          <div
            className="cas-context-menu-item danger"
            onClick={() => {
              handleDeleteClient(contextMenu.client!);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          >
            <i className="fas fa-trash" /> Delete Client
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Add Client Modal                                                 */}
      {/* ================================================================ */}
      {showAddModal && (
        <div className="cas-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="cas-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cas-modal-header">
              <h3><i className="fas fa-plus" style={{ marginRight: 8 }} />Add New Client</h3>
              <button onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            {renderClientForm()}
            <div className="cas-modal-footer">
              <button
                type="button"
                className="cas-btn cas-btn-secondary"
                onClick={() => setShowAddModal(false)}
                disabled={modalSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cas-btn cas-btn-primary"
                onClick={handleAddClient}
                disabled={modalSaving}
              >
                {modalSaving ? (
                  <><div style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 0.8s linear infinite", verticalAlign: "middle" }} /> Adding...</>
                ) : (
                  <><i className="fas fa-plus" /> Add Client</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Edit Client Modal                                                */}
      {/* ================================================================ */}
      {showEditModal && (
        <div className="cas-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="cas-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cas-modal-header">
              <h3><i className="fas fa-edit" style={{ marginRight: 8 }} />Edit Client (ID: {editClientId})</h3>
              <button onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            {renderClientForm()}
            <div className="cas-modal-footer">
              <button
                type="button"
                className="cas-btn cas-btn-secondary"
                onClick={() => setShowEditModal(false)}
                disabled={modalSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cas-btn cas-btn-primary"
                onClick={handleEditClient}
                disabled={modalSaving}
              >
                {modalSaving ? (
                  <><div style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 0.8s linear infinite", verticalAlign: "middle" }} /> Updating...</>
                ) : (
                  <><i className="fas fa-save" /> Update Client</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Manage Dropdown Options Modal                                    */}
      {/* ================================================================ */}
      {showDropdownModal && (
        <div className="cas-modal-overlay" onClick={() => setShowDropdownModal(false)}>
          <div className="cas-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cas-modal-header">
              <h3><i className="fas fa-cog" style={{ marginRight: 8 }} />Manage Dropdown Options</h3>
              <button onClick={() => setShowDropdownModal(false)}>&times;</button>
            </div>
            <div className="cas-modal-body">
              {/* Tabs */}
              <div className="cas-dd-tabs">
                <button
                  className={`cas-dd-tab${ddTab === "facility_type" ? " active" : ""}`}
                  onClick={() => { setDdTab("facility_type"); setDdNewValue(""); }}
                >
                  Facility Types
                </button>
                <button
                  className={`cas-dd-tab${ddTab === "corporate_group" ? " active" : ""}`}
                  onClick={() => { setDdTab("corporate_group"); setDdNewValue(""); }}
                >
                  Corporate Groups
                </button>
                <button
                  className={`cas-dd-tab${ddTab === "group_type" ? " active" : ""}`}
                  onClick={() => { setDdTab("group_type"); setDdNewValue(""); }}
                >
                  Group Types
                </button>
              </div>

              {/* Add new */}
              <div className="cas-dd-add-row">
                <input
                  type="text"
                  value={ddNewValue}
                  onChange={(e) => setDdNewValue(e.target.value)}
                  placeholder={`Add new ${ddTab.replace("_", " ")}...`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddDropdownOption();
                  }}
                />
                <button
                  type="button"
                  className="cas-btn cas-btn-primary"
                  style={{ padding: "8px 16px", whiteSpace: "nowrap" }}
                  onClick={handleAddDropdownOption}
                >
                  <i className="fas fa-plus" /> Add
                </button>
              </div>

              {/* List */}
              {ddLoading ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", border: "4px solid #e5e7eb", borderTopColor: "#007890", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
                  Loading...
                </div>
              ) : (
                <div className="cas-dd-list">
                  {ddCurrentItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "1.5rem", color: "#9ca3af" }}>
                      No options found.
                    </div>
                  ) : (
                    ddCurrentItems.map((item) => (
                      <div className="cas-dd-item" key={item.value}>
                        <span>
                          <span className="cas-dd-item-name">{item.value}</span>
                          <span className="cas-dd-item-count">({item.count} client{item.count !== 1 ? "s" : ""})</span>
                        </span>
                        <button
                          className="cas-dd-item-delete"
                          title={`Delete "${item.value}"`}
                          onClick={() => handleDeleteDropdownOption(ddTab, item.value)}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="cas-modal-footer">
              <button
                type="button"
                className="cas-btn cas-btn-secondary"
                onClick={() => setShowDropdownModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
