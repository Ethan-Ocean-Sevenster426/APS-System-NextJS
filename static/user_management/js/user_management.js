        // Generate random secure password
        function generateRandomPassword() {
            const length = 10;
            const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
            let password = '';
            
            // Ensure at least one of each type
            const lowercase = 'abcdefghijklmnopqrstuvwxyz';
            const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const numbers = '0123456789';
            const special = '!@#$%';
            
            password += lowercase[Math.floor(Math.random() * lowercase.length)];
            password += uppercase[Math.floor(Math.random() * uppercase.length)];
            password += numbers[Math.floor(Math.random() * numbers.length)];
            password += special[Math.floor(Math.random() * special.length)];
            
            // Fill the rest randomly
            for (let i = password.length; i < length; i++) {
                password += charset[Math.floor(Math.random() * charset.length)];
            }
            
            // Shuffle the password
            password = password.split('').sort(() => Math.random() - 0.5).join('');
            
            // Set both fields
            document.getElementById('new_password').value = password;
            document.getElementById('confirm_password').value = password;
            
            // Show the password (make visible)
            document.getElementById('new_password').type = 'text';
            document.getElementById('confirm_password').type = 'text';
            
            // Update eye icons
            document.querySelectorAll('#resetPasswordModal .password-toggle').forEach(btn => {
                btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
            });
            
            // Show success message
            const successDiv = document.getElementById('password_success');
            successDiv.textContent = 'Random password generated! Password is now visible. You can copy it or modify it.';
            successDiv.classList.add('show');
            
            // Hide error if showing
            document.getElementById('password_error').classList.remove('show');
            
            // Auto-hide success after 5 seconds
            setTimeout(() => {
                successDiv.classList.remove('show');
            }, 5000);
        }

        // Toggle password visibility
        function togglePasswordVisibility(fieldId, button) {
            const field = document.getElementById(fieldId);
            const icon = button.querySelector('i');
            
            if (field.type === 'password') {
                field.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                field.type = 'password';
                icon.className = 'fas fa-eye';
            }
        }

        // Open reset password modal
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.reset-password-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const userId = this.getAttribute('data-user-id');
                    const username = this.getAttribute('data-username');
                    
                    document.getElementById('reset_user_id').value = userId;
                    document.getElementById('reset_username').textContent = username;
                    document.getElementById('new_password').value = '';
                    document.getElementById('confirm_password').value = '';
                    document.getElementById('password_error').classList.remove('show');
                    document.getElementById('password_success').classList.remove('show');
                    
                    // Reset password visibility
                    document.getElementById('new_password').type = 'password';
                    document.getElementById('confirm_password').type = 'password';
                    document.querySelectorAll('#resetPasswordModal .password-toggle').forEach(btn => {
                        btn.innerHTML = '<i class="fas fa-eye"></i>';
                    });
                    
                    document.getElementById('resetPasswordModal').classList.add('show');
                });
            });
        });

        // Close modal
        function closeResetPasswordModal() {
            document.getElementById('resetPasswordModal').classList.remove('show');
        }

        // Close modal when clicking outside
        document.getElementById('resetPasswordModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeResetPasswordModal();
            }
        });

        // Form validation
        document.getElementById('resetPasswordForm').addEventListener('submit', function(e) {
            const password = document.getElementById('new_password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            const errorDiv = document.getElementById('password_error');
            const successDiv = document.getElementById('password_success');
            
            // Clear previous messages
            errorDiv.classList.remove('show');
            successDiv.classList.remove('show');
            errorDiv.textContent = '';
            
            // Validate password length
            if (password.length < 8) {
                e.preventDefault();
                errorDiv.textContent = 'Password must be at least 8 characters long.';
                errorDiv.classList.add('show');
                return false;
            }
            
            // Validate passwords match
            if (password !== confirmPassword) {
                e.preventDefault();
                errorDiv.textContent = 'Passwords do not match.';
                errorDiv.classList.add('show');
                return false;
            }
            
            return true;
        });

        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeResetPasswordModal();
                closeEditUserModal();
                closeAddUserModal();
            }
        });

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

        // Mobile Menu Toggle
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

        // Lazy load background image
        window.addEventListener('load', function() {
            document.body.classList.add('bg-loaded');
        });

        // Apply theme on load
        document.addEventListener('DOMContentLoaded', function() {
            initTheme();

            // Mobile menu functionality
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const sidebarOverlay = document.getElementById('sidebar-overlay');

            if (mobileMenuBtn) {
                mobileMenuBtn.addEventListener('click', toggleSidebar);
            }

            if (sidebarOverlay) {
                sidebarOverlay.addEventListener('click', toggleSidebar);
            }

            // Close sidebar when clicking on nav links on mobile
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth <= 1024) {
                        toggleSidebar();
                    }
                });
            });

            // Handle edit user buttons
            const editBtns = document.querySelectorAll('.edit-user-btn');
            editBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const userId = this.getAttribute('data-user-id');
                    const username = this.getAttribute('data-username');
                    const email = this.getAttribute('data-email');
                    const firstName = this.getAttribute('data-first-name');
                    const lastName = this.getAttribute('data-last-name');
                    const role = this.getAttribute('data-role');
                    showEditUserModal(userId, username, email, firstName, lastName, role);
                });
            });

            // Show/hide inspector allocation section when role changes
            document.getElementById('edit_role').addEventListener('change', function() {
                const userId = parseInt(document.getElementById('edit_user_id').value);
                buildInspectorCheckboxes(userId, this.value);
            });

            // Handle window resize
            window.addEventListener('resize', handleResize);
        });

        // Listen for theme changes
        window.addEventListener('storage', function(e) {
            if (e.key === 'theme') {
                document.documentElement.setAttribute('data-theme', e.newValue || 'light');
            }
        });

        // Multi-select dropdown helpers
        function toggleMultiSelect(type) {
            const panel = document.getElementById(type + 'DropdownPanel');
            const arrow = document.getElementById(type + 'Arrow');
            const isOpen = panel.classList.contains('open');
            // Close all panels first
            document.querySelectorAll('.multi-select-panel').forEach(p => p.classList.remove('open'));
            document.querySelectorAll('.multi-select-arrow').forEach(a => a.classList.remove('open'));
            if (!isOpen) {
                panel.classList.add('open');
                arrow.classList.add('open');
            }
        }

        function updateMultiSelectLabel(type) {
            const panel = document.getElementById(type + 'DropdownPanel');
            const checked = Array.from(panel.querySelectorAll('input[type=checkbox]:checked'));
            const label = document.getElementById(type + 'DropdownLabel');
            if (checked.length === 0) {
                label.textContent = type === 'role' ? 'All Roles' : 'All Status';
            } else if (checked.length === 1) {
                label.textContent = checked[0].parentElement.textContent.trim();
            } else {
                label.textContent = checked.length + ' selected';
            }
        }

        function getMultiSelectValues(type) {
            const panel = document.getElementById(type + 'DropdownPanel');
            return Array.from(panel.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.multi-select-wrapper')) {
                document.querySelectorAll('.multi-select-panel').forEach(p => p.classList.remove('open'));
                document.querySelectorAll('.multi-select-arrow').forEach(a => a.classList.remove('open'));
            }
        });

        // User Management Functions
        function filterTable() {
            const roleFilters = getMultiSelectValues('role');
            const statusFilters = getMultiSelectValues('status');
            const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
            const table = document.getElementById('usersTable');
            const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const role = row.getAttribute('data-role') || '';
                const status = row.getAttribute('data-status') || '';
                const searchText = row.getAttribute('data-search') || '';

                let showRow = true;

                if (roleFilters.length > 0 && !roleFilters.includes(role)) {
                    showRow = false;
                }

                if (statusFilters.length > 0 && !statusFilters.includes(status)) {
                    showRow = false;
                }

                if (searchFilter && !searchText.includes(searchFilter)) {
                    showRow = false;
                }

                row.style.display = showRow ? '' : 'none';
            }
        }

        function clearFilters() {
            document.querySelectorAll('#roleDropdownPanel input[type=checkbox], #statusDropdownPanel input[type=checkbox]').forEach(cb => cb.checked = false);
            updateMultiSelectLabel('role');
            updateMultiSelectLabel('status');
            document.getElementById('searchFilter').value = '';
            filterTable();
        }

        function showAddUserModal() {
            document.getElementById('addUserModal').classList.add('show');
        }

        function closeAddUserModal() {
            document.getElementById('addUserModal').classList.remove('show');
            document.getElementById('addUserForm').reset();
        }

        function buildInspectorCheckboxes(userId, selectedRole) {
            const section = document.getElementById('inspectorAllocationSection');
            const list = document.getElementById('inspectorCheckboxList');
            if (selectedRole !== 'inspector_manager') {
                section.style.display = 'none';
                return;
            }
            section.style.display = 'block';
            const mappings = window.DJANGO_CONFIG.inspectorMappings || [];
            const allocated = (window.DJANGO_CONFIG.managerAllocations || {})[userId] || [];
            if (mappings.length === 0) {
                list.innerHTML = '<p style="color: var(--text-light); font-style: italic; margin: 0;">No inspector users found. Add users with the Inspector role first.</p>';
                return;
            }
            list.innerHTML = mappings.map(m => `
                <label style="display:flex; align-items:center; gap:8px; padding:4px 0; cursor:pointer;">
                    <input type="checkbox" name="allocated_inspector_ids" value="${m.id}" ${allocated.includes(m.id) ? 'checked' : ''}>
                    <span>${m.name}</span>
                </label>
            `).join('');
        }

        function showEditUserModal(userId, username, email, firstName, lastName, role) {
            document.getElementById('edit_user_id').value = userId;
            document.getElementById('edit_username').value = username;
            document.getElementById('edit_email').value = email;
            document.getElementById('edit_first_name').value = firstName;
            document.getElementById('edit_last_name').value = lastName;
            document.getElementById('edit_role').value = role;
            buildInspectorCheckboxes(parseInt(userId), role);
            document.getElementById('editUserModal').classList.add('show');
        }

        function closeEditUserModal() {
            document.getElementById('editUserModal').classList.remove('show');
        }

        // Handle window resize
        function handleResize() {
            if (window.innerWidth > 1024) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                const mobileBtn = document.getElementById('mobile-menu-btn');

                sidebar.classList.remove('show');
                overlay.classList.remove('show');

                if (mobileBtn) {
                    const icon = mobileBtn.querySelector('i');
                    icon.className = 'fas fa-bars';
                }
            }
        }

        // Context Menu functionality
        const contextMenu = document.getElementById('contextMenu');
        let currentRow = null;

        // Show context menu on right-click
        document.addEventListener('DOMContentLoaded', function() {
            const tableRows = document.querySelectorAll('#usersTable tbody tr');

            tableRows.forEach(row => {
                row.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    currentRow = this;

                    // Get user data from row
                    const userId = this.querySelector('.edit-user-btn')?.getAttribute('data-user-id');
                    const username = this.querySelector('.edit-user-btn')?.getAttribute('data-username');
                    const isActive = this.getAttribute('data-status') === 'active';
                    const isCurrentUser = this.querySelector('form[action*="delete_user"] button') === null;

                    // Update toggle status text and icon
                    const toggleText = document.getElementById('contextToggleText');
                    const toggleIcon = document.querySelector('#contextToggleStatus i');
                    if (isActive) {
                        toggleText.textContent = 'Deactivate';
                        toggleIcon.className = 'fas fa-user-slash';
                    } else {
                        toggleText.textContent = 'Activate';
                        toggleIcon.className = 'fas fa-user-check';
                    }

                    // Always show delete option
                    const deleteOption = document.getElementById('contextDelete');
                    const deleteDivider = document.getElementById('contextDeleteDivider');
                    deleteOption.style.display = 'flex';
                    deleteDivider.style.display = 'block';

                    // Position and show context menu
                    contextMenu.classList.add('show');

                    // Get menu dimensions
                    const menuWidth = contextMenu.offsetWidth;
                    const menuHeight = contextMenu.offsetHeight;
                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;

                    // Calculate position (prevent going off-screen)
                    // Use clientX/clientY since position is fixed
                    let left = e.clientX;
                    let top = e.clientY;

                    if (left + menuWidth > windowWidth) {
                        left = windowWidth - menuWidth - 10;
                    }

                    if (top + menuHeight > windowHeight) {
                        top = windowHeight - menuHeight - 10;
                    }

                    contextMenu.style.left = left + 'px';
                    contextMenu.style.top = top + 'px';
                });
            });
        });

        // Hide context menu on click outside
        document.addEventListener('click', function(e) {
            if (!contextMenu.contains(e.target)) {
                contextMenu.classList.remove('show');
            }
        });

        // Handle context menu item clicks
        document.getElementById('contextEdit').addEventListener('click', function() {
            if (currentRow) {
                const editBtn = currentRow.querySelector('.edit-user-btn');
                if (editBtn) editBtn.click();
            }
            contextMenu.classList.remove('show');
        });

        document.getElementById('contextResetPassword').addEventListener('click', function() {
            if (currentRow) {
                const resetBtn = currentRow.querySelector('.reset-password-btn');
                if (resetBtn) resetBtn.click();
            }
            contextMenu.classList.remove('show');
        });

        document.getElementById('contextSendResetEmail').addEventListener('click', function() {
            if (currentRow) {
                const userId = currentRow.querySelector('.edit-user-btn')?.getAttribute('data-user-id');
                const username = currentRow.querySelector('.edit-user-btn')?.getAttribute('data-username');
                const email = currentRow.querySelector('.edit-user-btn')?.getAttribute('data-email');

                if (!email || email === '' || email === 'None') {
                    alert('This user does not have an email address configured. Please add an email address first.');
                    contextMenu.classList.remove('show');
                    return;
                }

                if (confirm(`Send password reset email to ${email}?`)) {
                    // Send AJAX request to backend
                    fetch(window.DJANGO_CONFIG.urls.sendPasswordResetEmail, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': window.DJANGO_CONFIG.csrfToken
                        },
                        body: JSON.stringify({
                            user_id: userId
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert(`Password reset email sent successfully to ${email}`);
                        } else {
                            alert(`Error: ${data.error || 'Failed to send email'}`);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Failed to send password reset email. Please try again.');
                    });
                }
            }
            contextMenu.classList.remove('show');
        });

        document.getElementById('contextToggleStatus').addEventListener('click', function() {
            if (currentRow) {
                const toggleBtn = currentRow.querySelector('form[action*="toggle_user_status"] button');
                if (toggleBtn && confirm('Are you sure you want to change this user\'s status?')) {
                    toggleBtn.click();
                }
            }
            contextMenu.classList.remove('show');
        });

        document.getElementById('contextDelete').addEventListener('click', function() {
            if (currentRow) {
                const deleteBtn = currentRow.querySelector('form[action*="delete_user"] button');
                const username = currentRow.querySelector('.edit-user-btn')?.getAttribute('data-username');
                if (deleteBtn && confirm(`Are you sure you want to delete user ${username}? This action cannot be undone.`)) {
                    deleteBtn.click();
                }
            }
            contextMenu.classList.remove('show');
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
