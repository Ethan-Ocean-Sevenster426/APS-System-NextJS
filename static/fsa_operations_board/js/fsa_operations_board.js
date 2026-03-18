/**
 * FSA Operations Board - Support Tickets JS
 */

// ================================================================
// THEME
// ================================================================
(function() {
    const t = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
})();
window.addEventListener('storage', e => {
    if (e.key === 'theme') document.documentElement.setAttribute('data-theme', e.newValue || 'light');
});
window.addEventListener('load', () => document.body.classList.add('bg-loaded'));

// ================================================================
// MOBILE SIDEBAR
// ================================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btn = document.getElementById('mobile-menu-btn');
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
    btn.querySelector('i').className = sidebar.classList.contains('show') ? 'fas fa-times' : 'fas fa-bars';
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebar-overlay').classList.remove('show');
    const btn = document.getElementById('mobile-menu-btn');
    if (btn) btn.querySelector('i').className = 'fas fa-bars';
}
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#sidebar-overlay')?.addEventListener('click', closeSidebar);
    document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleSidebar);
    document.querySelectorAll('#sidebar a').forEach(a => a.addEventListener('click', () => { if (window.innerWidth < 1024) closeSidebar(); }));
    setupFilters();
    applyFilters();
});
window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeSidebar(); });

// ================================================================
// HELPERS
// ================================================================
function url(template, id) { return template.replace('{id}', id); }
function csrf() { return window.DJANGO_CONFIG.csrfToken; }

function priorityBadge(p) {
    const map = { low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };
    return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:${map[p]||'#9ca3af'}20;color:${map[p]||'#9ca3af'};border:1px solid ${map[p]||'#9ca3af'}40;">${p.charAt(0).toUpperCase()+p.slice(1)}</span>`;
}
function statusLabel(s) {
    const map = { open: ['#007890', 'Open'], 'in-progress': ['#f59e0b', 'In Progress'], resolved: ['#10b981', 'Resolved'], closed: ['#6b7280', 'Closed'] };
    const [c, l] = map[s] || ['#9ca3af', s];
    return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:${c}20;color:${c};border:1px solid ${c}40;">${l}</span>`;
}
function detailRow(label, value) {
    if (!value) return '';
    return `<div class="detail-row"><div class="detail-label">${label}</div><div class="detail-value">${value}</div></div>`;
}

// ================================================================
// VIEW TICKET MODAL
// ================================================================
function viewTicket(id) {
    document.getElementById('viewTitle').textContent = `Ticket #${id}`;
    document.getElementById('viewModalBody').innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    document.getElementById('viewTicketModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    fetch(url(window.DJANGO_CONFIG.urls.getDetails, id))
        .then(r => r.json())
        .then(data => {
            if (!data.success) { document.getElementById('viewModalBody').innerHTML = `<p style="color:#ef4444;padding:20px;">${data.error}</p>`; return; }
            const t = data.ticket;
            document.getElementById('viewTitle').textContent = `#${t.id} — ${t.title}`;
            document.getElementById('viewModalBody').innerHTML = `
                <div style="padding:20px;">
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
                        ${statusLabel(t.status)}
                        ${priorityBadge(t.priority)}
                        ${t.affected_area ? `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.75rem;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;">${t.affected_area}</span>` : ''}
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Description</div>
                        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;font-size:0.875rem;white-space:pre-wrap;">${t.description}</div>
                    </div>

                    ${t.steps_to_reproduce ? `<div class="detail-section"><div class="detail-section-title">Steps to Reproduce</div><div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;font-size:0.875rem;white-space:pre-wrap;">${t.steps_to_reproduce}</div></div>` : ''}
                    ${t.expected_behavior ? `<div class="detail-section"><div class="detail-section-title">Expected vs Actual</div>${detailRow('Expected', t.expected_behavior)}${detailRow('Actual', t.actual_behavior)}</div>` : ''}
                    ${t.additional_notes ? `<div class="detail-section"><div class="detail-section-title">Additional Notes</div><div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px;font-size:0.875rem;">${t.additional_notes}</div></div>` : ''}

                    <div class="detail-section">
                        <div class="detail-section-title">Details</div>
                        ${detailRow('Submitted by', t.created_by)}
                        ${detailRow('Assigned to', t.assigned_to || 'Unassigned')}
                        ${detailRow('Issue type', t.issue_type)}
                        ${detailRow('Affected area', t.affected_area)}
                        ${detailRow('Impact', t.impact_users)}
                        ${detailRow('Blocking', t.is_blocking)}
                        ${detailRow('Browser', t.browser_info)}
                        ${detailRow('Due date', t.due_date)}
                        ${detailRow('Created', t.created_at)}
                        ${detailRow('Last updated', t.updated_at)}
                    </div>
                </div>`;
        })
        .catch(() => { document.getElementById('viewModalBody').innerHTML = '<p style="color:#ef4444;padding:20px;">Failed to load ticket details.</p>'; });
}
function closeViewModal(e) {
    if (e && e.target !== document.getElementById('viewTicketModal')) return;
    document.getElementById('viewTicketModal').style.display = 'none';
    document.body.style.overflow = '';
}

// ================================================================
// CREATE TICKET
// ================================================================
function openCreateModal() {
    document.getElementById('newTitle').value = '';
    document.getElementById('newDescription').value = '';
    document.getElementById('newStatus').value = 'open';
    document.getElementById('newPriority').value = 'medium';
    document.getElementById('newAssignee').value = '';
    document.getElementById('newDueDate').value = '';
    document.getElementById('createTicketModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeCreateModal(e) {
    if (e && e.target !== document.getElementById('createTicketModal')) return;
    document.getElementById('createTicketModal').style.display = 'none';
    document.body.style.overflow = '';
}
function saveNewTicket() {
    const title = document.getElementById('newTitle').value.trim();
    const description = document.getElementById('newDescription').value.trim();
    if (!title || !description) { alert('Title and description are required.'); return; }

    const btn = document.querySelector('#createTicketModal .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    fetch(window.DJANGO_CONFIG.urls.createTicket, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
        body: JSON.stringify({
            title,
            description,
            status: document.getElementById('newStatus').value,
            priority: document.getElementById('newPriority').value,
            assigned_to: document.getElementById('newAssignee').value,
            due_date: document.getElementById('newDueDate').value,
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            closeCreateModal();
            location.reload();
        } else {
            alert(data.error || 'Failed to create ticket');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Create Ticket';
        }
    })
    .catch(() => { alert('Error creating ticket'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Create Ticket'; });
}

// ================================================================
// DELETE TICKET
// ================================================================
function deleteTicket(id, title) {
    if (!confirm(`Delete ticket #${id} "${title}"?\n\nThis cannot be undone.`)) return;
    fetch(url(window.DJANGO_CONFIG.urls.deleteTicket, id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const row = document.querySelector(`tr[data-ticket-id="${id}"]`);
            if (row) row.remove();
            updateTicketCount();
        } else {
            alert(data.error || 'Failed to delete ticket');
        }
    })
    .catch(() => alert('Error deleting ticket'));
}

// ================================================================
// UPDATE STATUS
// ================================================================
function updateTicketStatus(id, newStatus) {
    const sel = document.querySelector(`select.status-select[data-ticket-id="${id}"]`);
    if (sel) { sel.style.border = '2px solid #f59e0b'; sel.className = `status-select status-${newStatus}`; }

    fetch(url(window.DJANGO_CONFIG.urls.updateStatus, id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
        body: JSON.stringify({ status: newStatus })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            if (sel) {
                sel.style.border = '2px solid #10b981';
                const row = sel.closest('tr');
                if (row) {
                    row.dataset.status = newStatus;
                    // update last updated cell (index 6)
                    if (row.cells[6]) row.cells[6].textContent = data.updated_at ? data.updated_at.split(' ')[0] : '';
                }
                setTimeout(() => { sel.style.border = ''; applyFilters(); }, 800);
            }
        } else {
            alert(data.error || 'Failed to update status');
            if (sel) sel.style.border = '2px solid #ef4444';
        }
    })
    .catch(() => { alert('Error updating status'); if (sel) sel.style.border = '2px solid #ef4444'; });
}

// ================================================================
// FILTERS
// ================================================================
function setupFilters() {
    ['searchFilter','statusFilter','priorityFilter','assigneeFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', applyFilters);
    });
}
function applyFilters() {
    const search = (document.getElementById('searchFilter')?.value || '').toLowerCase();
    const status = document.getElementById('statusFilter')?.value || '';
    const priority = document.getElementById('priorityFilter')?.value || '';
    const assignee = document.getElementById('assigneeFilter')?.value || '';

    let visible = 0;
    document.querySelectorAll('#ticketTableBody tr[data-ticket-id]').forEach(row => {
        let show = true;
        if (search && !row.dataset.search?.includes(search)) show = false;
        if (status && row.dataset.status !== status) show = false;
        if (priority && row.dataset.priority !== priority) show = false;
        if (assignee) {
            if (assignee === 'unassigned' && row.dataset.assignee !== 'unassigned') show = false;
            else if (assignee !== 'unassigned' && row.dataset.assignee !== assignee) show = false;
        }
        row.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    updateTicketCount(visible);
}
function clearFilters() {
    ['searchFilter','statusFilter','priorityFilter','assigneeFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    applyFilters();
}
function updateTicketCount(n) {
    const badge = document.getElementById('ticketCount');
    if (!badge) return;
    if (n === undefined) {
        n = document.querySelectorAll('#ticketTableBody tr[data-ticket-id]').length;
    }
    badge.textContent = `${n} ticket${n !== 1 ? 's' : ''}`;
}

// Escape key closes modals
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.getElementById('viewTicketModal').style.display = 'none';
        document.getElementById('createTicketModal').style.display = 'none';
        document.body.style.overflow = '';
    }
});

// ================================================================
// NOTIFICATION SYSTEM
// ================================================================
if (window.DJANGO_CONFIG.userRole === 'super_admin' || window.DJANGO_CONFIG.userRole === 'developer') {
    async function fetchNotifications() {
        try {
            const r = await fetch('/api/notifications/');
            const d = await r.json();
            if (d.success) updateNotificationBadge(d.unread_count);
        } catch(e) {}
    }
    function updateNotificationBadge(count) {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;
        if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.classList.remove('hidden'); }
        else badge.classList.add('hidden');
    }
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('notification-bell')?.addEventListener('click', () => fetchNotifications());
        fetchNotifications();
        setInterval(fetchNotifications, 30000);
    });
}
