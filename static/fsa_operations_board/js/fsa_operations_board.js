/**
 * FSA Operations Board - Support Tickets
 * External JavaScript module
 *
 * Requires window.DJANGO_CONFIG to be set before loading:
 *   - csrfToken: CSRF token string
 *   - userRole: current user's role
 */

// ================================================================
// THEME INITIALIZATION
// ================================================================

// Initialize theme from localStorage
(function() {
    const savedTheme = localStorage.getItem('theme');
    const activeTheme = savedTheme ? savedTheme : 'light';
    document.documentElement.setAttribute('data-theme', activeTheme);
})();

// Listen for theme changes from other tabs/windows
window.addEventListener('storage', function(e) {
    if (e.key === 'theme') {
        document.documentElement.setAttribute('data-theme', e.newValue || 'light');
    }
});

// Load background image after page loads for better performance
window.addEventListener('load', function() {
    document.body.classList.add('bg-loaded');
});

// ================================================================
// MOBILE SIDEBAR
// ================================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mobileBtn = document.getElementById('mobile-menu-btn');

    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');

    const icon = mobileBtn.querySelector('i');
    if (sidebar.classList.contains('show')) {
        icon.className = 'fas fa-times';
    } else {
        icon.className = 'fas fa-bars';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mobileBtn = document.getElementById('mobile-menu-btn');

    sidebar.classList.remove('show');
    overlay.classList.remove('show');

    const icon = mobileBtn.querySelector('i');
    icon.className = 'fas fa-bars';
}

// Close sidebar when clicking on a link (mobile)
document.addEventListener('DOMContentLoaded', function() {
    const sidebarLinks = document.querySelectorAll('#sidebar a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 1024) {
                closeSidebar();
            }
        });
    });

    // Mobile menu functionality
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mobileBtn = document.getElementById('mobile-menu-btn');

    if (window.innerWidth >= 1024) {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');

        if (mobileBtn) {
            const icon = mobileBtn.querySelector('i');
            icon.className = 'fas fa-bars';
        }
    }
});

// ================================================================
// TICKET MODAL FUNCTIONS
// ================================================================

function openTicketModal(ticketId) {
    ticketId = ticketId || null;
    const modal = document.getElementById('ticketModal');
    const modalTitle = document.getElementById('modalTitle');

    if (ticketId) {
        modalTitle.textContent = 'Edit Ticket';
        // In a real implementation, load ticket data here
    } else {
        modalTitle.textContent = 'Create New Ticket';
        document.getElementById('ticketForm').reset();
    }

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeTicketModal() {
    const modal = document.getElementById('ticketModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

function saveTicket() {
    const title = document.getElementById('ticketTitle').value;
    const description = document.getElementById('ticketDescription').value;
    const status = document.getElementById('ticketStatus').value;
    const priority = document.getElementById('ticketPriority').value;
    const assignee = document.getElementById('ticketAssignee').value;
    const dueDate = document.getElementById('ticketDueDate').value;

    if (!title || !description) {
        alert('Please fill in all required fields');
        return;
    }

    // In a real implementation, this would send data to the server via AJAX
    console.log('Saving ticket:', {
        title,
        description,
        status,
        priority,
        assignee,
        dueDate
    });

    // Show success message
    alert('Ticket saved successfully! (This is a demo - backend integration needed)');
    closeTicketModal();
}

function viewTicket(ticketId) {
    alert('Viewing ticket #' + ticketId + '\n\nThis feature will show detailed ticket information including:\n- Full description\n- Comments/notes\n- Activity history\n- Attachments\n\n(Backend integration needed)');
}

function editTicket(ticketId) {
    openTicketModal(ticketId);
}

function deleteTicket(ticketId) {
    if (confirm('Are you sure you want to delete ticket #' + ticketId + '?')) {
        alert('Ticket #' + ticketId + ' deleted!\n\n(This is a demo - backend integration needed)');
        // In a real implementation, remove the row from the table
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('ticketModal');
    if (event.target === modal) {
        closeTicketModal();
    }
});

// Handle Escape key to close modal
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('ticketModal');
        if (modal.classList.contains('show')) {
            closeTicketModal();
        }
    }
});

// ================================================================
// CSRF TOKEN HELPER
// ================================================================

// Get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ================================================================
// TICKET STATUS UPDATE
// ================================================================

function updateTicketStatus(ticketId, newStatus) {
    console.log('Updating ticket ' + ticketId + ' to status: ' + newStatus);

    const statusSelect = document.querySelector('select.status-select[data-ticket-id="' + ticketId + '"]');

    // Show loading indicator
    if (statusSelect) {
        statusSelect.style.border = '2px solid #f59e0b';
    }

    // Get CSRF token from the DOM
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send AJAX request to backend
    fetch('/tickets/' + ticketId + '/update-status/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Status updated successfully:', data);

            // Update UI with new timestamp
            const row = statusSelect.closest('tr');
            if (row) {
                // Update "Last Updated" column (6th column, index 5)
                const lastUpdatedCell = row.cells[5];
                if (lastUpdatedCell) {
                    lastUpdatedCell.textContent = data.updated_at;
                }
            }

            // Show success indicator
            statusSelect.style.border = '2px solid #10b981';
            setTimeout(() => {
                statusSelect.style.border = '';

                // If status is resolved, hide the row after a brief delay
                if (newStatus === 'resolved') {
                    setTimeout(() => {
                        if (row) row.style.display = 'none';
                    }, 500);
                }
            }, 1000);
        } else {
            console.error('Failed to update status:', data.error);
            alert('Failed to update ticket status: ' + data.error);
            statusSelect.style.border = '2px solid #ef4444';
            setTimeout(() => statusSelect.style.border = '', 2000);
        }
    })
    .catch(error => {
        console.error('Error updating ticket status:', error);
        alert('Error updating ticket status. Please try again.');
        statusSelect.style.border = '2px solid #ef4444';
        setTimeout(() => statusSelect.style.border = '', 2000);
    });
}

// ================================================================
// FILTER FUNCTIONALITY
// ================================================================

function applyFilters() {
    const searchValue = document.getElementById('searchFilter').value.toLowerCase();
    const statusValue = document.getElementById('statusFilter').value;
    const priorityValue = document.getElementById('priorityFilter').value;
    const assigneeValue = document.getElementById('assigneeFilter').value;

    const rows = document.querySelectorAll('#ticketTableBody tr');

    rows.forEach(row => {
        const title = row.cells[0].textContent.toLowerCase();
        const statusSelect = row.querySelector('.status-select');
        const status = statusSelect ? statusSelect.value : '';
        const priorityBadge = row.cells[2].textContent.toLowerCase();
        const assignee = row.cells[3].textContent;

        let showRow = true;

        // Search filter
        if (searchValue && !title.includes(searchValue)) {
            showRow = false;
        }

        // Status filter
        if (statusValue && status !== statusValue) {
            showRow = false;
        }

        // Priority filter
        if (priorityValue && !priorityBadge.includes(priorityValue)) {
            showRow = false;
        }

        // Assignee filter
        if (assigneeValue) {
            if (assigneeValue === 'unassigned' && assignee.toLowerCase() !== 'unassigned') {
                showRow = false;
            } else if (assigneeValue !== 'unassigned' && !assignee.includes(assigneeValue)) {
                showRow = false;
            }
        }

        // Show or hide the row
        row.style.display = showRow ? '' : 'none';
    });
}

// Clear all filters (reset to default view: Open tickets only)
function clearFilters() {
    document.getElementById('searchFilter').value = '';
    document.getElementById('statusFilter').value = 'open';
    document.getElementById('priorityFilter').value = '';
    document.getElementById('assigneeFilter').value = '';
    applyFilters();
}

// Setup filter event listeners
document.addEventListener('DOMContentLoaded', function() {
    const searchFilter = document.getElementById('searchFilter');
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const assigneeFilter = document.getElementById('assigneeFilter');

    if (searchFilter) searchFilter.addEventListener('input', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (priorityFilter) priorityFilter.addEventListener('change', applyFilters);
    if (assigneeFilter) assigneeFilter.addEventListener('change', applyFilters);

    // Apply default filter on page load (Open tickets only)
    applyFilters();
});

// ================================================================
// NOTIFICATION SYSTEM
// ================================================================

if (window.DJANGO_CONFIG.userRole === 'super_admin' || window.DJANGO_CONFIG.userRole === 'developer') {

    let notificationModal = null;

    // Fetch notifications and update badge
    async function fetchNotifications() {
        try {
            const response = await fetch('/api/notifications/');
            const data = await response.json();

            if (data.success) {
                updateNotificationBadge(data.unread_count);
                return data.notifications;
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
        return [];
    }

    // Update notification badge
    function updateNotificationBadge(count) {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    // Show notification modal
    async function showNotificationModal() {
        const notifications = await fetchNotifications();

        // Create modal HTML
        const modalHTML =
            '<div id="notification-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0, 0, 0, 0.5);">' +
                '<div class="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" style="background-color: var(--card-bg);">' +
                    '<div class="flex items-center justify-between p-4" style="border-bottom: 1px solid var(--border);">' +
                        '<h3 class="text-lg font-semibold" style="color: var(--text);">' +
                            'Notifications' +
                        '</h3>' +
                        '<div class="flex items-center gap-2">' +
                            '<button onclick="markAllAsRead()" class="text-sm" style="color: var(--info);">' +
                                'Mark All Read' +
                            '</button>' +
                            '<button onclick="closeNotificationModal()" class="text-xl" style="color: var(--text-light);">' +
                                '\u00d7' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="overflow-y-auto max-h-[75vh]" id="notification-list">' +
                        (notifications.length === 0 ?
                            '<div class="p-8 text-center" style="color: var(--text-light);">' +
                                '<p>No notifications</p>' +
                            '</div>'
                        : notifications.map(notif => createNotificationHTML(notif)).join('')) +
                    '</div>' +
                '</div>' +
            '</div>';

        // Remove existing modal if any
        const existing = document.getElementById('notification-modal');
        if (existing) existing.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    // Create HTML for a single notification
    function createNotificationHTML(notif) {
        const timeAgo = getTimeAgo(notif.created_at);
        const opacity = notif.is_read ? 'opacity-60' : '';

        return '<div class="p-4 ' + opacity + '" data-notification-id="' + notif.id + '" style="border-bottom: 1px solid var(--border);">' +
            '<div class="flex items-start gap-3">' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="flex items-center justify-between mb-1">' +
                        '<h4 class="text-sm font-semibold" style="color: var(--text);">' + notif.title + '</h4>' +
                        (!notif.is_read ? '<span style="background: var(--info); width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>' : '') +
                    '</div>' +
                    '<p class="text-sm mb-2" style="color: var(--text-light);">' + notif.message + '</p>' +
                    '<div class="flex items-center justify-between text-xs" style="color: var(--text-light);">' +
                        '<span>' + timeAgo + '</span>' +
                        '<div class="flex gap-2">' +
                            (!notif.is_read ? '<button onclick="markAsRead(' + notif.id + ')" style="color: var(--info);">Mark Read</button>' : '') +
                            '<button onclick="deleteNotification(' + notif.id + ')" style="color: var(--danger);">Delete</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    // Get time ago string
    function getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
        return date.toLocaleDateString();
    }

    // Close notification modal
    function closeNotificationModal() {
        const modal = document.getElementById('notification-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }

    // Mark notification as read
    async function markAsRead(notificationId) {
        try {
            const response = await fetch('/api/notifications/' + notificationId + '/read/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': window.DJANGO_CONFIG.csrfToken,
                }
            });

            if (response.ok) {
                // Refresh the modal
                closeNotificationModal();
                showNotificationModal();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    // Mark all notifications as read
    async function markAllAsRead() {
        try {
            const response = await fetch('/api/notifications/mark-all-read/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': window.DJANGO_CONFIG.csrfToken,
                }
            });

            if (response.ok) {
                closeNotificationModal();
                updateNotificationBadge(0);
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    // Delete notification
    async function deleteNotification(notificationId) {
        if (!confirm('Are you sure you want to delete this notification?')) return;

        try {
            const response = await fetch('/api/notifications/' + notificationId + '/delete/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': window.DJANGO_CONFIG.csrfToken,
                }
            });

            if (response.ok) {
                // Refresh the modal
                closeNotificationModal();
                showNotificationModal();
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }

    // Initialize notification system
    document.addEventListener('DOMContentLoaded', function() {
        const notificationBell = document.getElementById('notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', function(e) {
                e.preventDefault();
                showNotificationModal();
            });

            // Fetch notifications every 30 seconds
            fetchNotifications();
            setInterval(fetchNotifications, 30000);
        }
    });

} // end notification system role check
