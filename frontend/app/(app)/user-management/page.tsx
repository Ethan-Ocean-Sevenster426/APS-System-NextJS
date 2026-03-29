"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface UserRecord {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  allocated_inspectors?: number[];
}

interface Message {
  text: string;
  type: "success" | "error";
  id: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  user: UserRecord | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const ROLE_OPTIONS = [
  { value: "inspector", label: "Inspector" },
  { value: "inspector_manager", label: "Inspector Manager" },
  { value: "admin", label: "Administrator" },
  { value: "super_admin", label: "Super Admin" },
  { value: "financial", label: "Financial Administrator" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "developer", label: "Developer" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ROLE_COLORS: Record<string, string> = {
  inspector: "#3730a3",
  inspector_manager: "#3730a3",
  admin: "#d97706",
  super_admin: "#dc2626",
  financial: "#059669",
  lab_technician: "#7c3aed",
  developer: "#1e40af",
};

const ROLE_LABELS: Record<string, string> = {
  inspector: "Inspector",
  inspector_manager: "Inspector Manager",
  admin: "Administrator",
  super_admin: "Super Admin",
  financial: "Financial Admin",
  lab_technician: "Lab Technician",
  developer: "Developer",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function generateRandomPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  let pw =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 10; i++) {
    pw += all[Math.floor(Math.random() * all.length)];
  }
  return pw
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/* ------------------------------------------------------------------ */
/*  Multi-Select Component                                             */
/* ------------------------------------------------------------------ */
function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    onChange(
      selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]
    );
  };

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} selected`;

  return (
    <div className="um-multi-select-wrapper" ref={ref}>
      <div className="um-multi-select-btn" onClick={() => setOpen(!open)}>
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      {open && (
        <div className="um-multi-select-panel">
          {options.map((o) => (
            <label
              key={o.value}
              className="um-multi-select-option"
              onClick={() => toggle(o.value)}
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                readOnly
                style={{ accentColor: "#007890" }}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function UserManagementPage() {
  // Data
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterRoles, setFilterRoles] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [appliedRoles, setAppliedRoles] = useState<string[]>([]);
  const [appliedStatuses, setAppliedStatuses] = useState<string[]>([]);
  const [appliedSearch, setAppliedSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [resetUser, setResetUser] = useState<{ id: number; username: string } | null>(null);

  // Add form
  const [addForm, setAddForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    role: "inspector",
    monthly_salary: "",
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "",
    allocated_inspectors: [] as number[],
  });

  // Reset password form
  const [resetForm, setResetForm] = useState({
    new_password: "",
    confirm_password: "",
    generated: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    user: null,
  });

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const msgIdRef = useRef(0);

  // ---- helpers ----
  const addMessage = useCallback((text: string, type: "success" | "error") => {
    const id = ++msgIdRef.current;
    setMessages((prev) => [...prev, { text, type, id }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 5000);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      addMessage("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [addMessage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu((c) => ({ ...c, visible: false }));
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ---- filtered users (client-side) ----
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (appliedRoles.length > 0 && !appliedRoles.includes(u.role)) return false;
      if (appliedStatuses.length > 0) {
        const status = u.is_active ? "active" : "inactive";
        if (!appliedStatuses.includes(status)) return false;
      }
      if (appliedSearch) {
        const s = appliedSearch.toLowerCase();
        if (
          !u.username.toLowerCase().includes(s) &&
          !u.email.toLowerCase().includes(s) &&
          !(u.first_name + " " + u.last_name).toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [users, appliedRoles, appliedStatuses, appliedSearch]);

  // ---- API helpers ----
  const postAction = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  // ---- Handlers ----
  const handleApplyFilters = () => {
    setAppliedRoles([...filterRoles]);
    setAppliedStatuses([...filterStatuses]);
    setAppliedSearch(searchText);
  };

  const handleClearFilters = () => {
    setFilterRoles([]);
    setFilterStatuses([]);
    setSearchText("");
    setAppliedRoles([]);
    setAppliedStatuses([]);
    setAppliedSearch("");
  };

  const handleAddUser = async () => {
    if (addForm.password !== addForm.confirm_password) {
      addMessage("Passwords do not match", "error");
      return;
    }
    if (!addForm.username || !addForm.email || !addForm.password || !addForm.role) {
      addMessage("Please fill in all required fields", "error");
      return;
    }
    const data = await postAction({ action: "add_user", ...addForm });
    if (data.success) {
      addMessage(data.message || "User added successfully", "success");
      setShowAddModal(false);
      setAddForm({
        username: "",
        email: "",
        password: "",
        confirm_password: "",
        first_name: "",
        last_name: "",
        role: "inspector",
        monthly_salary: "",
      });
      fetchUsers();
    } else {
      addMessage(data.error || "Failed to add user", "error");
    }
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    const data = await postAction({
      action: "edit_user",
      user_id: editUser.id,
      ...editForm,
    });
    if (data.success) {
      addMessage(data.message || "User updated successfully", "success");
      setShowEditModal(false);
      fetchUsers();
    } else {
      addMessage(data.error || "Failed to update user", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    const pw = resetForm.generated || resetForm.new_password;
    if (!resetForm.generated && resetForm.new_password !== resetForm.confirm_password) {
      addMessage("Passwords do not match", "error");
      return;
    }
    if (!pw) {
      addMessage("Please enter a password or generate one", "error");
      return;
    }
    const data = await postAction({
      action: "reset_password",
      user_id: resetUser.id,
      new_password: pw,
    });
    if (data.success) {
      addMessage(data.message || "Password reset successfully", "success");
      setShowResetPasswordModal(false);
      setResetForm({ new_password: "", confirm_password: "", generated: "" });
    } else {
      addMessage(data.error || "Failed to reset password", "error");
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    const data = await postAction({
      action: user.is_active ? "deactivate_user" : "activate_user",
      user_id: user.id,
    });
    if (data.success) {
      addMessage(
        data.message || `User ${user.is_active ? "deactivated" : "activated"} successfully`,
        "success"
      );
      fetchUsers();
    } else {
      addMessage(data.error || "Failed to toggle user status", "error");
    }
  };

  const handleDeleteUser = async (user: UserRecord) => {
    if (!confirm(`Are you sure you want to delete user "${user.username}"? This cannot be undone.`))
      return;
    const data = await postAction({ action: "delete_user", user_id: user.id });
    if (data.success) {
      addMessage(data.message || "User deleted successfully", "success");
      fetchUsers();
    } else {
      addMessage(data.error || "Failed to delete user", "error");
    }
  };

  const handleSendResetEmail = async (user: UserRecord) => {
    const data = await postAction({ action: "send_reset_email", user_id: user.id });
    if (data.success) {
      addMessage(data.message || "Password reset email sent", "success");
    } else {
      addMessage(data.error || "Failed to send reset email", "error");
    }
  };

  const handleSendKPIEmails = async () => {
    const data = await postAction({ action: "send_kpi_emails" });
    if (data.success) {
      addMessage(data.message || "KPI emails sent successfully", "success");
    } else {
      addMessage(data.error || "Failed to send KPI emails", "error");
    }
  };

  const handleTestKPIEmail = async () => {
    const data = await postAction({ action: "send_kpi_emails", test_email: "ethansevenster5@gmail.com" });
    if (data.success) {
      addMessage(data.message || "Test KPI email sent to ethansevenster5@gmail.com", "success");
    } else {
      addMessage(data.error || "Failed to send test KPI email", "error");
    }
  };

  const openEditModal = (user: UserRecord) => {
    setEditUser(user);
    setEditForm({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      allocated_inspectors: user.allocated_inspectors ?? [],
    });
    setShowEditModal(true);
  };

  const openResetModal = (user: UserRecord) => {
    setResetUser({ id: user.id, username: user.username });
    setResetForm({ new_password: "", confirm_password: "", generated: "" });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowResetPasswordModal(true);
  };

  const handleContextMenu = (e: React.MouseEvent, user: UserRecord) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, user });
  };

  // Get list of inspectors for the edit modal inspector_manager allocation
  const inspectors = useMemo(
    () => users.filter((u) => u.role === "inspector"),
    [users]
  );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
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
/* Card styles */
.um-card { background: #ffffff; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); margin-bottom: 10px; border: 1px solid #e5e7eb; width: 100%; }
.um-card-header { padding: 0.625rem 0.875rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; min-height: 44px; }
.um-card-title { font-size: 0.8125rem; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 0.375rem; }
.um-card-body { padding: 0.875rem 1rem; }

/* Button styles */
.um-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; padding: 0.35rem 0.65rem; border-radius: 4px; border: none; font-weight: 500; font-size: 0.6875rem; cursor: pointer; transition: all 0.15s ease; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.um-btn:hover { opacity: 0.9; }
.um-btn-primary { background: #007890; color: white; }
.um-btn-secondary { background: #6b7280; color: white; }
.um-btn-success { background: #10b981; color: white; }
.um-btn-warning { background: #f59e0b; color: white; }
.um-btn-danger { background: #EC343C; color: white; }
.um-btn-info { background: #3b82f6; color: white; }
.um-btn-purple { background: #7c3aed; color: white; }
.um-btn-xs { padding: 4px 8px; font-size: 0.7rem; width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; }

/* Table styles */
.um-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; background: white; }
.um-table th { background-color: #fafafa; color: #1f2937; text-align: left; padding: 10px 12px; font-weight: 600; white-space: nowrap; border-bottom: 1px solid #e5e7eb; font-size: 0.75rem; position: sticky; top: 0; z-index: 10; }
.um-table tr:nth-child(even) { background-color: #fafafa; }
.um-table tr:nth-child(odd) { background-color: white; }
.um-table tbody tr:hover { background-color: rgba(0, 115, 135, 0.04); }
.um-table tbody tr { cursor: pointer; transition: background-color 0.15s ease; }
.um-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 0.75rem; white-space: nowrap; color: #374151; }

/* Role badges */
.um-role-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.2); display: inline-block; }

/* Status badges */
.um-status-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 4px; }
.um-status-active { background-color: rgba(16, 185, 129, 0.12); color: #059669; }
.um-status-inactive { background-color: rgba(239, 68, 68, 0.12); color: #dc2626; }

/* Form styles */
.um-form-group { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; width: 100%; }
.um-form-label { font-size: 0.75rem; font-weight: 600; color: #374151; margin-bottom: 0.35rem; display: block; }
.um-form-control { padding: 0.5rem 0.75rem; border: 1.5px solid #e5e7eb; border-radius: 6px; font-size: 0.85rem; transition: all 0.2s ease; color: #1f2937; background-color: #ffffff; width: 100%; box-sizing: border-box; }
.um-form-control:focus { outline: none; border-color: #007890; box-shadow: 0 0 0 3px #e6f3f7; }

/* Modal styles */
.um-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; }
.um-modal-content { background: #ffffff; padding: 1.5rem 2rem; border-radius: 12px; max-width: 600px; width: 92%; box-shadow: 0 20px 60px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; }
.um-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e5e7eb; }
.um-modal-title { font-size: 1.2rem; font-weight: 700; color: #1f2937; margin: 0; display: flex; align-items: center; gap: 8px; }
.um-modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.um-modal-close:hover { background: #f3f4f6; }
.um-modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }

/* Context Menu */
.um-context-menu { position: fixed; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 180px; z-index: 10001; padding: 4px 0; }
.um-context-menu-item { padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: #1f2937; transition: background-color 0.15s ease; }
.um-context-menu-item:hover { background-color: #e6f3f7; }
.um-context-menu-item.danger { color: #EC343C; }
.um-context-menu-item.danger:hover { background-color: rgba(236, 52, 60, 0.1); }
.um-context-menu-divider { height: 1px; background-color: #e5e7eb; margin: 4px 0; }

/* Multi-select filter */
.um-multi-select-wrapper { position: relative; }
.um-multi-select-btn { display: flex; align-items: center; justify-content: space-between; cursor: pointer; text-align: left; background-color: #ffffff; user-select: none; padding: 0.4rem 0.55rem; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 0.75rem; width: 100%; }
.um-multi-select-panel { position: absolute; top: calc(100% + 4px); left: 0; min-width: 100%; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); z-index: 200; padding: 4px 0; }
.um-multi-select-option { display: flex; align-items: center; gap: 8px; padding: 5px 10px; font-size: 0.75rem; color: #1f2937; cursor: pointer; white-space: nowrap; }
.um-multi-select-option:hover { background: #e6f3f7; }

/* Password reset modal */
.um-password-generate { margin-bottom: 1.5rem; padding: 1rem; background: #f3f4f6; border-radius: 4px; }
.um-password-divider { text-align: center; margin: 1rem 0; color: #6b7280; font-weight: 600; font-size: 0.875rem; }
.um-password-input-wrapper { position: relative; }
.um-password-toggle { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #6b7280; padding: 0.25rem; }

/* Header */
.um-header { text-align: center; margin-bottom: 1.25rem; padding: 1.5rem 0 1rem; }
.um-header h1 { color: white; font-size: 1.75rem; font-weight: 600; margin-bottom: 8px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
.um-header h2 { color: white; font-size: 1rem; font-weight: 400; opacity: 0.9; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }

/* Form actions */
.um-form-actions { display: flex; gap: 0.5rem; align-items: center; padding-top: 0.625rem; border-top: 1px solid #e5e7eb; margin-top: 0.75rem; flex-wrap: wrap; }

/* Button group */
.um-btn-group { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }

/* Loading */
.um-loading { display: flex; justify-content: center; align-items: center; padding: 3rem; color: #6b7280; font-size: 1rem; background: white; border-radius: 0.5rem; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }

/* Table responsive */
.um-table-responsive { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; width: 100%; background: white; }

/* Container */
.um-container { width: 100%; max-width: 1400px; margin: 0 auto; padding: 0 1.25rem 1.5rem; box-sizing: border-box; }

/* Mobile card view toggle */
.um-mobile-only { display: none !important; }
.um-desktop-only { display: block; }

/* Responsive breakpoints */
@media (max-width: 768px) {
  .um-mobile-only { display: block !important; }
  .um-desktop-only { display: none !important; }
  .um-container { padding: 0 0.75rem 1.25rem; }
  .um-header h1 { font-size: 1.35rem; }
  .um-header h2 { font-size: 0.875rem; }
  .um-header { padding: 1rem 0 0.75rem; margin-bottom: 1rem; }
  .um-form-group { grid-template-columns: 1fr; }
  .um-card-header { padding: 0.5rem 0.75rem; flex-direction: column !important; gap: 8px; align-items: stretch !important; }
  .um-card-title { justify-content: center; }
  .um-btn-group { flex-wrap: wrap; width: 100%; }
  .um-btn-group .um-btn { flex: 1 1 45%; min-width: 0; justify-content: center; }
  .um-card-body { padding: 0.75rem; }
  .um-modal-content { width: 95% !important; max-height: 90vh !important; }
  .um-modal-body { padding: 16px !important; }
  .um-form-actions { justify-content: stretch; }
  .um-form-actions .um-btn { flex: 1; justify-content: center; }
}
@media (max-width: 480px) {
  .um-container { padding: 0 0.5rem 1rem; }
  .um-header h1 { font-size: 1.1rem; }
  .um-header h2 { font-size: 0.75rem; }
  .um-btn-group { flex-direction: column; }
  .um-btn-group .um-btn { flex: unset; width: 100%; }
  .um-btn { font-size: 0.65rem; padding: 0.35rem 0.5rem; }
}

/* Alert boxes */
.um-alert-box { padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
.um-alert-error { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
.um-alert-success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }

/* Messages container */
.um-messages { position: fixed; top: 1rem; right: 1rem; z-index: 20000; display: flex; flex-direction: column; gap: 0.5rem; }
      `}</style>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="um-messages">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`um-alert-box ${
                m.type === "success" ? "um-alert-success" : "um-alert-error"
              }`}
              style={{ minWidth: 280, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            >
              {m.text}
            </div>
          ))}
        </div>
      )}

      <div style={{ width: "100%", minHeight: "100%", boxSizing: "border-box" }}>
      <div className="um-container">
        {/* Header */}
        <div className="um-header">
          <h1>User Management</h1>
          <h2>Manage user accounts, roles, and permissions</h2>
        </div>

        {/* Filter Card */}
        <div className="um-card">
          <div className="um-card-header">
            <div className="um-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
            </div>
          </div>
          <div className="um-card-body">
            <div className="um-form-group">
              <div>
                <label className="um-form-label">Role</label>
                <MultiSelect
                  options={ROLE_OPTIONS}
                  selected={filterRoles}
                  onChange={setFilterRoles}
                  placeholder="All Roles"
                />
              </div>
              <div>
                <label className="um-form-label">Status</label>
                <MultiSelect
                  options={STATUS_OPTIONS}
                  selected={filterStatuses}
                  onChange={setFilterStatuses}
                  placeholder="All Statuses"
                />
              </div>
              <div>
                <label className="um-form-label">Search</label>
                <input
                  type="text"
                  className="um-form-control"
                  placeholder="Search by name, email, username..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>
            <div className="um-form-actions">
              <button
                className="um-btn um-btn-primary"
                onClick={handleApplyFilters}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Apply
              </button>
              <button
                className="um-btn um-btn-secondary"
                onClick={handleClearFilters}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Users Table Card */}
        {loading ? (
          <div className="um-loading">Loading users...</div>
        ) : (
          <div className="um-card">
            <div className="um-card-header">
              <div className="um-card-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Users
                <span
                  style={{
                    background: "#007890",
                    color: "white",
                    borderRadius: "10px",
                    padding: "1px 8px",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                  }}
                >
                  {filteredUsers.length}
                </span>
              </div>
              <div className="um-btn-group">
                <button className="um-btn um-btn-purple" onClick={handleSendKPIEmails}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Send KPI Emails
                </button>
                <button className="um-btn" style={{ background: "#0f766e", color: "white" }} onClick={handleTestKPIEmail} title="Send a test KPI email to ethansevenster5@gmail.com">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Test KPI Email
                </button>
                <button
                  className="um-btn um-btn-success"
                  onClick={() => setShowAddModal(true)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add User
                </button>
              </div>
            </div>
            {/* Desktop Table */}
            <div className="um-table-responsive um-desktop-only">
              <table className="um-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th className="um-col-email">Email</th>
                    <th className="um-col-fullname">Full Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        onContextMenu={(e) => handleContextMenu(e, user)}
                      >
                        <td style={{ fontWeight: 600 }}>{user.username}</td>
                        <td className="um-col-email">{user.email}</td>
                        <td className="um-col-fullname">
                          {user.first_name || user.last_name ? (
                            `${user.first_name} ${user.last_name}`.trim()
                          ) : (
                            <em style={{ color: "#9ca3af" }}>Not provided</em>
                          )}
                        </td>
                        <td>
                          <span
                            className="um-role-badge"
                            style={{
                              backgroundColor: ROLE_COLORS[user.role] || "#6b7280",
                            }}
                          >
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`um-status-badge ${
                              user.is_active ? "um-status-active" : "um-status-inactive"
                            }`}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: user.is_active ? "#059669" : "#dc2626",
                                display: "inline-block",
                              }}
                            />
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              className="um-btn um-btn-info um-btn-xs"
                              title="Edit"
                              onClick={() => openEditModal(user)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              className="um-btn um-btn-info um-btn-xs"
                              title="Reset Password"
                              onClick={() => openResetModal(user)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                              </svg>
                            </button>
                            <button
                              className={`um-btn um-btn-xs ${
                                user.is_active ? "um-btn-warning" : "um-btn-success"
                              }`}
                              title={user.is_active ? "Deactivate" : "Activate"}
                              onClick={() => handleToggleActive(user)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {user.is_active ? (
                                  <>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                  </>
                                ) : (
                                  <>
                                    <polyline points="20 6 9 17 4 12" />
                                  </>
                                )}
                              </svg>
                            </button>
                            {user.role !== "developer" && (
                              <button
                                className="um-btn um-btn-danger um-btn-xs"
                                title="Delete"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="um-mobile-only" style={{ display: "none" }}>
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No users found</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px" }}>
                  {filteredUsers.map((user) => (
                    <div key={user.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1f2937" }}>{user.username}</div>
                          {(user.first_name || user.last_name) && (
                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{`${user.first_name} ${user.last_name}`.trim()}</div>
                          )}
                          {user.email && <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 2 }}>{user.email}</div>}
                        </div>
                        <span className={`um-status-badge ${user.is_active ? "um-status-active" : "um-status-inactive"}`}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: user.is_active ? "#059669" : "#dc2626", display: "inline-block" }} />
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="um-role-badge" style={{ backgroundColor: ROLE_COLORS[user.role] || "#6b7280" }}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="um-btn um-btn-info um-btn-xs" title="Edit" onClick={() => openEditModal(user)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button className="um-btn um-btn-info um-btn-xs" title="Reset Password" onClick={() => openResetModal(user)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                          </button>
                          <button className={`um-btn um-btn-xs ${user.is_active ? "um-btn-warning" : "um-btn-success"}`} title={user.is_active ? "Deactivate" : "Activate"} onClick={() => handleToggleActive(user)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {user.is_active ? <><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></> : <polyline points="20 6 9 17 4 12" />}
                            </svg>
                          </button>
                          {user.role !== "developer" && (
                            <button className="um-btn um-btn-danger um-btn-xs" title="Delete" onClick={() => handleDeleteUser(user)}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.user && (
        <div
          className="um-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y, display: "block" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="um-context-menu-item"
            onClick={() => {
              openEditModal(contextMenu.user!);
              setContextMenu((c) => ({ ...c, visible: false }));
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit User
          </div>
          <div
            className="um-context-menu-item"
            onClick={() => {
              openResetModal(contextMenu.user!);
              setContextMenu((c) => ({ ...c, visible: false }));
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Reset Password
          </div>
          <div
            className="um-context-menu-item"
            onClick={() => {
              handleSendResetEmail(contextMenu.user!);
              setContextMenu((c) => ({ ...c, visible: false }));
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Send Reset Email
          </div>
          <div className="um-context-menu-divider" />
          <div
            className="um-context-menu-item"
            onClick={() => {
              handleToggleActive(contextMenu.user!);
              setContextMenu((c) => ({ ...c, visible: false }));
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {contextMenu.user.is_active ? (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </>
              ) : (
                <polyline points="20 6 9 17 4 12" />
              )}
            </svg>
            {contextMenu.user.is_active ? "Deactivate" : "Activate"}
          </div>
          <div className="um-context-menu-divider" />
          {contextMenu.user.role !== "developer" && (
            <div
              className="um-context-menu-item danger"
              onClick={() => {
                handleDeleteUser(contextMenu.user!);
                setContextMenu((c) => ({ ...c, visible: false }));
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete User
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="um-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <h3 className="um-modal-title">Add New User</h3>
              <button className="um-modal-close" onClick={() => setShowAddModal(false)}>
                &times;
              </button>
            </div>
            <div>
              <div className="um-form-group">
                <div>
                  <label className="um-form-label">Username *</label>
                  <input
                    className="um-form-control"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="um-form-label">Email *</label>
                  <input
                    className="um-form-control"
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="um-form-group">
                <div>
                  <label className="um-form-label">Password *</label>
                  <input
                    className="um-form-control"
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="um-form-label">Confirm Password *</label>
                  <input
                    className="um-form-control"
                    type="password"
                    value={addForm.confirm_password}
                    onChange={(e) =>
                      setAddForm({ ...addForm, confirm_password: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="um-form-group">
                <div>
                  <label className="um-form-label">First Name</label>
                  <input
                    className="um-form-control"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="um-form-label">Last Name</label>
                  <input
                    className="um-form-control"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="um-form-group">
                <div>
                  <label className="um-form-label">Role *</label>
                  <select
                    className="um-form-control"
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="um-form-label">Monthly Salary</label>
                  <input
                    className="um-form-control"
                    type="number"
                    value={addForm.monthly_salary}
                    onChange={(e) =>
                      setAddForm({ ...addForm, monthly_salary: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="um-modal-actions">
              <button className="um-btn um-btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="um-btn um-btn-success" onClick={handleAddUser}>
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div className="um-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <h3 className="um-modal-title">Edit User</h3>
              <button className="um-modal-close" onClick={() => setShowEditModal(false)}>
                &times;
              </button>
            </div>
            <div>
              <div className="um-form-group">
                <div>
                  <label className="um-form-label">Username</label>
                  <input
                    className="um-form-control"
                    value={editUser.username}
                    readOnly
                    style={{ backgroundColor: "#f3f4f6" }}
                  />
                </div>
                <div>
                  <label className="um-form-label">Email</label>
                  <input
                    className="um-form-control"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="um-form-group">
                <div>
                  <label className="um-form-label">First Name</label>
                  <input
                    className="um-form-control"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="um-form-label">Last Name</label>
                  <input
                    className="um-form-control"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="um-form-group">
                <div>
                  <label className="um-form-label">Role</label>
                  <select
                    className="um-form-control"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {editForm.role === "inspector_manager" && inspectors.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <label className="um-form-label">Allocated Inspectors</label>
                  <div
                    style={{
                      maxHeight: 150,
                      overflowY: "auto",
                      border: "1px solid #e5e7eb",
                      borderRadius: 4,
                      padding: "0.5rem",
                    }}
                  >
                    {inspectors.map((ins) => (
                      <label
                        key={ins.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 0",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editForm.allocated_inspectors.includes(ins.id)}
                          onChange={() => {
                            setEditForm((prev) => ({
                              ...prev,
                              allocated_inspectors: prev.allocated_inspectors.includes(ins.id)
                                ? prev.allocated_inspectors.filter((id) => id !== ins.id)
                                : [...prev.allocated_inspectors, ins.id],
                            }));
                          }}
                          style={{ accentColor: "#007890" }}
                        />
                        {ins.username}
                        {ins.first_name || ins.last_name
                          ? ` (${ins.first_name} ${ins.last_name})`.trim()
                          : ""}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="um-modal-actions">
              <button className="um-btn um-btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="um-btn um-btn-primary" onClick={handleEditUser}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetUser && (
        <div className="um-modal-backdrop" onClick={() => setShowResetPasswordModal(false)}>
          <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <h3 className="um-modal-title">Reset Password</h3>
              <button
                className="um-modal-close"
                onClick={() => setShowResetPasswordModal(false)}
              >
                &times;
              </button>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
              Resetting password for <strong>{resetUser.username}</strong>
            </p>

            {/* Generate random */}
            <div className="um-password-generate">
              <button
                className="um-btn um-btn-primary"
                style={{ width: "100%", marginBottom: resetForm.generated ? "0.75rem" : 0 }}
                onClick={() => {
                  const pw = generateRandomPassword();
                  setResetForm({ new_password: "", confirm_password: "", generated: pw });
                }}
              >
                Generate Random Password
              </button>
              {resetForm.generated && (
                <div
                  style={{
                    background: "#d1fae5",
                    border: "1px solid #10b981",
                    borderRadius: 4,
                    padding: "0.75rem",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    wordBreak: "break-all",
                    color: "#065f46",
                  }}
                >
                  {resetForm.generated}
                </div>
              )}
            </div>

            <div className="um-password-divider">OR</div>

            {/* Manual entry */}
            <div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label className="um-form-label">New Password</label>
                <div className="um-password-input-wrapper">
                  <input
                    className="um-form-control"
                    type={showPassword ? "text" : "password"}
                    value={resetForm.new_password}
                    onChange={(e) =>
                      setResetForm({
                        ...resetForm,
                        new_password: e.target.value,
                        generated: "",
                      })
                    }
                  />
                  <button
                    className="um-password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="um-form-label">Confirm Password</label>
                <div className="um-password-input-wrapper">
                  <input
                    className="um-form-control"
                    type={showConfirmPassword ? "text" : "password"}
                    value={resetForm.confirm_password}
                    onChange={(e) =>
                      setResetForm({
                        ...resetForm,
                        confirm_password: e.target.value,
                        generated: "",
                      })
                    }
                  />
                  <button
                    className="um-password-toggle"
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {showConfirmPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="um-modal-actions">
              <button
                className="um-btn um-btn-secondary"
                onClick={() => setShowResetPasswordModal(false)}
              >
                Cancel
              </button>
              <button className="um-btn um-btn-primary" onClick={handleResetPassword}>
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
