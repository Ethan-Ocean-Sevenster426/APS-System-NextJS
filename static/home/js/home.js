// Load background image after page loads for better performance
window.addEventListener('load', function () {
    document.body.classList.add('bg-loaded');
});

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function toggleSidebar() {
        sidebar.classList.toggle('show');
        sidebarOverlay.classList.toggle('show');

        const icon = mobileMenuBtn.querySelector('i');
        if (sidebar.classList.contains('show')) {
            icon.className = 'fas fa-times';
        } else {
            icon.className = 'fas fa-bars';
        }
    }

    mobileMenuBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    const navLinks = sidebar.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            if (window.innerWidth <= 1024) {
                toggleSidebar();
            }
        });
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 1024) {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
            const icon = mobileMenuBtn.querySelector('i');
            icon.className = 'fas fa-bars';
        }
    });

    initTheme();
    clearStuckSyncStatus();
});

// Sync Functions
function syncClients() {
    const btn = document.getElementById('sync-clients-btn');
    const text = document.getElementById('sync-clients-text');
    const statusDiv = document.getElementById('sync-status');

    btn.disabled = true;
    text.textContent = 'Syncing...';
    btn.style.opacity = '0.7';

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;

    fetch(window.DJANGO_CONFIG.urls.refreshClients, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            if (response.status === 302 || response.status === 401 || response.status === 403) {
                throw new Error('Authentication required. Please refresh the page and log in again.');
            }

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    throw new Error('Session expired. Please refresh the page and log in again.');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            if (data.success) {
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                statusDiv.innerHTML = `
                <div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    Sync failed: ${data.error || 'Unknown error occurred'}
                </div>
            `;
            }
            resetClientButton();
        })
        .catch(error => {
            console.error('Error syncing clients:', error);
            statusDiv.innerHTML = `
            <div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                <i class="fas fa-exclamation-circle mr-2"></i>
                Error: ${error.message}
            </div>
        `;
            resetClientButton();
        });

    function resetClientButton() {
        btn.disabled = false;
        text.textContent = 'Sync Clients';
        btn.style.opacity = '1';
    }
}

function syncInspections() {
    const btn = document.getElementById('sync-inspections-btn');
    const text = document.getElementById('sync-inspections-text');
    const statusDiv = document.getElementById('sync-status');

    // Check if background sync is running
    if (text.textContent.includes('Data Refresh in Progress')) {
        alert('A background data refresh is currently in progress. Please wait for it to complete.');
        return;
    }

    if (text.textContent.includes('Syncing')) {
        const userConfirm = confirm('The sync button appears to be stuck. Would you like to reset it and try again?');
        if (userConfirm) {
            resetButton();
            return;
        } else {
            return;
        }
    }

    btn.disabled = true;
    text.textContent = 'Syncing Everything...';
    btn.style.opacity = '0.7';
    statusDiv.innerHTML = `
        <div class="bg-blue-50 border-l-4 border-primary p-4 rounded">
            <p class="text-sm text-primary font-semibold">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Step 1/3: Syncing SQL Server clients...
            </p>
        </div>
    `;

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;

    // Step 1: Sync clients from SQL Server first
    fetch(window.DJANGO_CONFIG.urls.refreshClients, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (response.status === 302 || response.status === 401 || response.status === 403) {
            throw new Error('Authentication required. Please refresh the page and log in again.');
        }
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                throw new Error('Session expired. Please refresh the page and log in again.');
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    })
    .then(data => {
        console.log('Client sync response:', data);

        if (!data.success) {
            throw new Error(data.error || 'Failed to sync clients');
        }

        console.log('Client sync successful, transitioning to inspection sync...');

        // Clients synced successfully, now sync inspections
        statusDiv.innerHTML = `
            <div class="bg-blue-50 border-l-4 border-primary p-4 rounded">
                <p class="text-sm text-primary font-semibold">
                    <i class="fas fa-check-circle mr-2"></i>
                    Step 1/3: Clients synced successfully!
                </p>
                <p class="text-sm text-primary font-semibold mt-2">
                    <i class="fas fa-spinner fa-spin mr-2"></i>
                    Step 2/3: Now syncing inspections...
                </p>
            </div>
        `;

        // Continue with inspection sync
        console.log('About to call startInspectionSync()...');
        startInspectionSync();
        console.log('startInspectionSync() called successfully');
    })
    .catch(error => {
        console.error('Error syncing clients:', error);
        statusDiv.innerHTML = `
            <div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                <i class="fas fa-exclamation-circle mr-2"></i>
                Error syncing clients: ${error.message}
            </div>
        `;
        resetButton();
    });
}

function startInspectionSync() {
    console.log('startInspectionSync() called');

    try {
        const text = document.getElementById('sync-inspections-text');
        const statusDiv = document.getElementById('sync-status');

        console.log('Updating status to show Step 2/3...');
        statusDiv.innerHTML = `
            <div class="bg-blue-50 border-l-4 border-primary p-4 rounded">
                <p class="text-sm text-primary font-semibold">
                    <i class="fas fa-spinner fa-spin mr-2"></i>
                    Step 2/3: Syncing SQL Server inspections...
                </p>
            </div>
        `;

        // Show and initialize progress bar
        console.log('Initializing progress bar elements...');
        const progressContainer = document.getElementById('sync-progress-container');
        const progressBar = document.getElementById('sync-progress-bar');
        const progressText = document.getElementById('sync-progress-text');
        const progressDetails = document.getElementById('sync-progress-details');

        if (!progressContainer || !progressBar || !progressText || !progressDetails) {
            throw new Error('Progress bar elements not found in DOM');
        }

        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        progressDetails.textContent = 'Starting sync...';

        let pollCount = 0;
        const maxPolls = 1800;

        const maxTimeout = setTimeout(() => {
            console.log('Sync timeout reached - resetting button');
            resetButton();
    }, 3600000);

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;

    console.log('Calling refresh_inspections endpoint...');
    fetch(window.DJANGO_CONFIG.urls.refreshInspections, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            console.log('Received response from refresh_inspections:', response.status, response.statusText);

            if (response.status === 302 || response.status === 401 || response.status === 403) {
                throw new Error('Authentication required. Please refresh the page and log in again.');
            }

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                console.log('Response content-type:', contentType);

                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    throw new Error('Session expired. Please refresh the page and log in again.');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            console.log('Parsed inspection sync response:', data);
            console.log('data.success:', data.success, 'data.status:', data.status);

            if (data.success && data.status === 'started') {
                console.log('Sync started successfully, beginning to poll status...');
                pollSyncStatus();
            } else if (data.success) {
                console.log('Sync completed immediately (no polling needed)');
                resetButton();
            } else {
                console.log('Sync failed with error:', data.error);
                statusDiv.innerHTML = `
                <div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    ${data.error || 'Failed to start sync'}
                </div>
            `;
                resetButton();
            }
        })
        .catch(error => {
            console.error('Error in fetch chain for refresh_inspections:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            statusDiv.innerHTML = `
            <div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                <i class="fas fa-exclamation-circle mr-2"></i>
                Error: ${error.message}
            </div>
        `;
            resetButton();
        });

    function pollSyncStatus() {
        pollCount++;
        if (pollCount > maxPolls) {
            resetButton();
            return;
        }

        if (pollCount % 5 === 0) {
            fetch(window.DJANGO_CONFIG.urls.sessionStatus, { method: 'GET', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).catch(() => { });
        }

        fetch(window.DJANGO_CONFIG.urls.checkSyncStatus, { method: 'GET', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            })
            .then(data => {
                console.log(`[POLL ${pollCount}] Sync status:`, data);

                if (data.success && data.message) {
                    // Sync completed successfully
                    const progressContainer = document.getElementById('sync-progress-container');
                    const progressBar = document.getElementById('sync-progress-bar');
                    const progressText = document.getElementById('sync-progress-text');

                    // Set to 100% before hiding
                    progressBar.style.width = '100%';
                    progressText.textContent = '100%';

                    statusDiv.innerHTML = `
                    <div class="p-4 mt-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
                        <i class="fas fa-check-circle mr-2"></i>
                        ${data.message}
                        <br>Deleted: ${data.deleted_count || 0} old inspections
                        <br>Created: ${data.created_count || 0} new inspections
                        <br>Total processed: ${data.total_processed || 0} records
                    </div>
                `;

                    // Hide progress bar after a short delay
                    setTimeout(() => {
                        progressContainer.classList.add('hidden');
                    }, 1000);

                    clearTimeout(maxTimeout);
                    resetButton();
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else if (data.success === false && data.error) {
                    // Sync failed
                    const progressContainer = document.getElementById('sync-progress-container');
                    progressContainer.classList.add('hidden');

                    statusDiv.innerHTML = `
                    <div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        Sync failed: ${data.error}
                    </div>
                `;
                    clearTimeout(maxTimeout);
                    resetButton();
                } else if (data.status === 'running' || data.message === 'Sync is still running...') {
                    // Sync still running - update progress bar
                    text.textContent = 'Syncing...';

                    const progressContainer = document.getElementById('sync-progress-container');
                    const progressBar = document.getElementById('sync-progress-bar');
                    const progressText = document.getElementById('sync-progress-text');
                    const progressDetails = document.getElementById('sync-progress-details');

                    // Show progress bar container
                    progressContainer.classList.remove('hidden');

                    // Update progress if available
                    if (data.progress) {
                        const percent = data.progress.percent || 0;
                        const message = data.progress.message || 'Processing...';

                        console.log(`[POLL ${pollCount}] Progress: ${percent}% - ${message}`);

                        // Update progress bar width
                        progressBar.style.width = percent + '%';

                        // Update percentage text
                        progressText.textContent = percent + '%';

                        // Update details message
                        progressDetails.textContent = message;

                        // Update status div with current step
                        statusDiv.innerHTML = `
                        <div class="bg-blue-50 border-l-4 border-primary p-4 rounded">
                            <p class="text-sm text-primary font-semibold">
                                <i class="fas fa-spinner fa-spin mr-2"></i>
                                ${message}
                            </p>
                        </div>
                    `;
                    } else {
                        // No progress data yet - show waiting message but keep progress bar visible
                        console.log(`[POLL ${pollCount}] No progress data yet, keeping progress bar at current state`);
                        progressDetails.textContent = data.message || 'Starting sync...';
                    }

                    setTimeout(pollSyncStatus, 2000);
                } else {
                    resetButton();
                }
            })
            .catch(error => {
                console.error('Error polling sync status:', error);
                resetButton();
            });
    }
    } catch (error) {
        console.error('Error in startInspectionSync():', error);
        const statusDiv = document.getElementById('sync-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    Error starting inspection sync: ${error.message}
                </div>
            `;
        }
        resetButton();
    }
}

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const serverTheme = window.DJANGO_CONFIG.serverTheme;

    let activeTheme = 'light';
    if (savedTheme) {
        activeTheme = savedTheme;
    } else if (serverTheme) {
        activeTheme = serverTheme;
    }

    document.documentElement.setAttribute('data-theme', activeTheme);
}

function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
}

async function saveThemeToServer(theme) {
    try {
        const response = await fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=save_theme&theme_mode=${theme === 'dark' ? 'on' : ''}`
        });
    } catch (error) {
        // Silent fail
    }
}

// Check if background sync is running and update UI accordingly
function checkBackgroundSync() {
    fetch(window.DJANGO_CONFIG.urls.checkSyncStatus, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        const btn = document.getElementById('sync-inspections-btn');
        const text = document.getElementById('sync-inspections-text');
        const progressContainer = document.getElementById('sync-progress-container');
        const progressBar = document.getElementById('sync-progress-bar');
        const progressText = document.getElementById('sync-progress-text');
        const progressDetails = document.getElementById('sync-progress-details');

        if (data.is_running) {
            // Background sync is running - update button and show progress
            if (btn && text) {
                btn.disabled = true;
                text.textContent = 'Data Refresh in Progress...';
                btn.style.opacity = '0.7';
            }

            // Show progress if available
            if (data.progress && Object.keys(data.progress).length > 0) {
                const progress = data.progress;

                if (progressContainer) {
                    progressContainer.classList.remove('hidden');
                }

                if (progressBar && progress.percent !== undefined) {
                    progressBar.style.width = progress.percent + '%';
                }

                if (progressText && progress.message) {
                    progressText.textContent = progress.message;
                }

                if (progressDetails) {
                    let details = '';
                    if (progress.current !== undefined && progress.total !== undefined) {
                        details += `Processing ${progress.current} of ${progress.total}`;
                    }
                    if (progress.elapsed !== undefined) {
                        details += ` • ${progress.elapsed}`;
                    }
                    progressDetails.textContent = details;
                }
            }

            // Continue checking while sync is running
            setTimeout(checkBackgroundSync, 2000);
        } else {
            // No sync running - reset button to normal state
            if (btn && text && text.textContent === 'Data Refresh in Progress...') {
                btn.disabled = false;
                text.textContent = 'Sync Everything';
                btn.style.opacity = '1';
            }

            // Hide progress bar
            if (progressContainer) {
                progressContainer.classList.add('hidden');
            }
        }
    })
    .catch(error => {
        console.error('Error checking sync status:', error);
        // On error, check again after a longer delay
        setTimeout(checkBackgroundSync, 5000);
    });
}

// Start checking for background sync on page load
document.addEventListener('DOMContentLoaded', function() {
    checkBackgroundSync();
});

function resetButton() {
    const inspectionsBtn = document.getElementById('sync-inspections-btn');
    const inspectionsText = document.getElementById('sync-inspections-text');
    const statusDiv = document.getElementById('sync-status');
    const progressContainer = document.getElementById('sync-progress-container');

    if (inspectionsBtn && inspectionsText) {
        inspectionsBtn.disabled = false;
        inspectionsText.textContent = 'Sync Everything';
        inspectionsBtn.style.opacity = '1';
    }

    if (statusDiv) {
        statusDiv.innerHTML = '';
    }

    // Hide progress bar
    if (progressContainer) {
        progressContainer.classList.add('hidden');
    }

    // Restart background sync checking
    checkBackgroundSync();
}

function resetClientsButton() {
    const clientsBtn = document.getElementById('sync-clients-btn');
    const clientsText = document.getElementById('sync-clients-text');

    if (clientsBtn && clientsText) {
        clientsBtn.disabled = false;
        clientsText.textContent = 'Sync Clients';
        clientsBtn.style.opacity = '1';
    }
}

function clearStuckSyncStatus() {
    const syncInspectionsBtn = document.getElementById('sync-inspections-text');
    const syncClientsBtn = document.getElementById('sync-clients-text');

    if (syncInspectionsBtn && syncInspectionsBtn.textContent === 'Syncing...') {
        resetButton();
    }

    if (syncClientsBtn && syncClientsBtn.textContent === 'Syncing...') {
        resetClientsButton();
    }
}

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
        const modalHTML = `
            <div id="notification-modal" class="fixed inset-0 z-50 flex items-start justify-center p-4" style="background: rgba(0, 0, 0, 0.5); padding-top: 60px;">
                <div class="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" style="background-color: var(--card-bg);">
                    <div class="flex items-center justify-between p-4" style="border-bottom: 1px solid var(--border);">
                        <h3 class="text-lg font-semibold" style="color: var(--text);">
                            Notifications
                        </h3>
                        <div class="flex items-center gap-2">
                            <button onclick="markAllAsRead()" class="text-sm" style="color: var(--info);">
                                Mark All Read
                            </button>
                            <button onclick="closeNotificationModal()" class="text-xl" style="color: var(--text-light);">
                                &times;
                            </button>
                        </div>
                    </div>
                    <div class="overflow-y-auto max-h-[75vh]" id="notification-list">
                        ${notifications.length === 0 ? `
                            <div class="p-8 text-center" style="color: var(--text-light);">
                                <p>No notifications</p>
                            </div>
                        ` : notifications.map(notif => createNotificationHTML(notif)).join('')}
                    </div>
                </div>
            </div>
        `;

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

        return `
            <div class="p-4 ${opacity}" data-notification-id="${notif.id}" style="border-bottom: 1px solid var(--border);">
                <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="text-sm font-semibold" style="color: var(--text);">${notif.title}</h4>
                            ${!notif.is_read ? '<span style="background: var(--info); width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>' : ''}
                        </div>
                        <p class="text-sm mb-2" style="color: var(--text-light);">${notif.message}</p>
                        <div class="flex items-center justify-between text-xs" style="color: var(--text-light);">
                            <span>${timeAgo}</span>
                            <div class="flex gap-2">
                                ${!notif.is_read ? `<button onclick="markAsRead(${notif.id})" style="color: var(--info);">
                                    Mark Read
                                </button>` : ''}
                                <button onclick="deleteNotification(${notif.id})" style="color: var(--danger);">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
            const response = await fetch(`/api/notifications/${notificationId}/read/`, {
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
            const response = await fetch(`/api/notifications/${notificationId}/delete/`, {
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

    // Make notification functions globally accessible (needed for onclick handlers)
    window.fetchNotifications = fetchNotifications;
    window.showNotificationModal = showNotificationModal;
    window.closeNotificationModal = closeNotificationModal;
    window.markAsRead = markAsRead;
    window.markAllAsRead = markAllAsRead;
    window.deleteNotification = deleteNotification;

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
}
