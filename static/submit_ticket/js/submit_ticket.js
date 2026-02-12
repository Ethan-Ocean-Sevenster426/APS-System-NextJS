            // Initialize theme from localStorage
            (function () {
                const savedTheme = localStorage.getItem('theme');
                const activeTheme = savedTheme ? savedTheme : 'light';
                document.documentElement.setAttribute('data-theme', activeTheme);
            })();

        // Listen for theme changes from other tabs/windows
        window.addEventListener('storage', function (e) {
            if (e.key === 'theme') {
                document.documentElement.setAttribute('data-theme', e.newValue || 'light');
            }
        });

        // Load background image after page loads for better performance
        window.addEventListener('load', function () {
            document.body.classList.add('bg-loaded');
        });

        // Mobile sidebar functions
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
        document.addEventListener('DOMContentLoaded', function () {
            const sidebarLinks = document.querySelectorAll('#sidebar a');
            sidebarLinks.forEach(link => {
                link.addEventListener('click', function () {
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
        window.addEventListener('resize', function () {
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
                <div id="notification-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0, 0, 0, 0.5);">
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                <i class="fas fa-bell text-yellow-400 mr-2"></i>
                                Notifications
                            </h3>
                            <div class="flex items-center gap-2">
                                <button onclick="markAllAsRead()" class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                    <i class="fas fa-check-double mr-1"></i>Mark All Read
                                </button>
                                <button onclick="closeNotificationModal()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                    <i class="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                        <div class="overflow-y-auto max-h-[60vh]" id="notification-list">
                            ${notifications.length === 0 ? `
                                <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <i class="fas fa-bell-slash text-4xl mb-2"></i>
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
            const typeColors = {
                'error': 'bg-red-100 border-red-500 text-red-900 dark:bg-red-900 dark:text-red-100',
                'warning': 'bg-yellow-100 border-yellow-500 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
                'info': 'bg-blue-100 border-blue-500 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
                'success': 'bg-green-100 border-green-500 text-green-900 dark:bg-green-900 dark:text-green-100',
                'sync': 'bg-purple-100 border-purple-500 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
                'system': 'bg-gray-100 border-gray-500 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
            };

            const typeIcons = {
                'error': 'fa-exclamation-circle',
                'warning': 'fa-exclamation-triangle',
                'info': 'fa-info-circle',
                'success': 'fa-check-circle',
                'sync': 'fa-sync',
                'system': 'fa-cog',
            };

            const bgColor = typeColors[notif.type] || typeColors['info'];
            const icon = typeIcons[notif.type] || typeIcons['info'];
            const timeAgo = getTimeAgo(notif.created_at);
            const opacity = notif.is_read ? 'opacity-60' : '';

            return `
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 ${opacity}" data-notification-id="${notif.id}">
                    <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full ${bgColor} flex items-center justify-center">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between mb-1">
                                <h4 class="text-sm font-semibold text-gray-900 dark:text-white">${notif.title}</h4>
                                ${!notif.is_read ? '<span class="bg-blue-500 w-2 h-2 rounded-full"></span>' : ''}
                            </div>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">${notif.message}</p>
                            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span><i class="far fa-clock mr-1"></i>${timeAgo}</span>
                                <div class="flex gap-2">
                                    ${!notif.is_read ? `<button onclick="markAsRead(${notif.id})" class="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                        <i class="fas fa-check mr-1"></i>Mark Read
                                    </button>` : ''}
                                    <button onclick="deleteNotification(${notif.id})" class="text-red-600 hover:text-red-800 dark:text-red-400">
                                        <i class="fas fa-trash mr-1"></i>Delete
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

        // Character counters for form fields
        document.addEventListener('DOMContentLoaded', function () {
            const titleInput = document.getElementById('ticketTitle');
            const titleCounter = document.getElementById('titleCounter');
            const descriptionInput = document.getElementById('ticketDescription');
            const descCounter = document.getElementById('descCounter');

            if (titleInput && titleCounter) {
                titleInput.addEventListener('input', function () {
                    titleCounter.textContent = this.value.length;
                });
            }

            if (descriptionInput && descCounter) {
                descriptionInput.addEventListener('input', function () {
                    descCounter.textContent = this.value.length;
                });
            }

            // Form validation feedback
            const form = document.getElementById('ticketForm');
            if (form) {
                form.addEventListener('submit', function (e) {
                    const requiredFields = form.querySelectorAll('[required]');
                    let allFilled = true;

                    requiredFields.forEach(field => {
                        if (!field.value.trim()) {
                            allFilled = false;
                            field.style.borderColor = '#ef4444';
                        } else {
                            field.style.borderColor = '';
                        }
                    });

                    if (!allFilled) {
                        e.preventDefault();
                        alert('Please fill in all required fields (marked with *)');
                        // Scroll to first empty required field
                        const firstEmpty = Array.from(requiredFields).find(f => !f.value.trim());
                        if (firstEmpty) {
                            firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            firstEmpty.focus();
                        }
                    }
                });
            }
        });
