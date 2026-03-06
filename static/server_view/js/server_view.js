// Load background image after page loads for better performance
window.addEventListener('load', function() {
    document.body.classList.add('bg-loaded');
});

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function toggleSidebar() {
        sidebar.classList.toggle('show');
        sidebarOverlay.classList.toggle('show');

        const icon = mobileMenuBtn.querySelector('i');
        if (sidebar.classList.contains('show')) {
            icon.className = 'fas fa-times text-xl';
        } else {
            icon.className = 'fas fa-bars text-xl';
        }
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    const navLinks = sidebar.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 1024) {
                toggleSidebar();
            }
        });
    });

    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
            if (mobileMenuBtn) {
                const icon = mobileMenuBtn.querySelector('i');
                icon.className = 'fas fa-bars text-xl';
            }
        }
    });

    initTheme();
    loadDirectoryTree();
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

// Load directory tree via AJAX
function loadDirectoryTree() {
    fetch(window.DJANGO_CONFIG.urls.serverDirectoryTree)
        .then(response => response.json())
        .then(data => {
            renderDirectoryTree(data);
        })
        .catch(error => {
            console.error('Error loading directory tree:', error);
            document.getElementById('directoryTree').innerHTML = `
                <div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.7);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #f59e0b;"></i>
                    <p>Error loading directory structure</p>
                </div>
            `;
        });
}

let globalTree = null;
let searchTerm = '';
let categoryFilter = 'all';
let docTypeFilter = 'all';

function renderDirectoryTree(tree) {
    globalTree = tree;
    const container = document.getElementById('directoryTree');
    container.innerHTML = renderNode(tree, 0);
    updateStats();
    initializeSearchAndFilters();
}

function renderNode(node, level) {
    let html = '';
    const indent = '\u2502   '.repeat(level);

    if (node.type === 'folder') {
        const hasChildren = node.children && node.children.length > 0;
        const toggleIcon = hasChildren ? '<i class="fas fa-chevron-down"></i>' : '<i class="fas fa-minus"></i>';

        html += `
            <div class="folder-item folder-expanded" data-level="${level}">
                <div class="tree-item folder-row" onclick="toggleFolder(this.parentElement)">
                    <span class="toggle-icon">${hasChildren ? toggleIcon : ''}</span>
                    <span class="tree-icon"><i class="fas fa-folder" style="color: #f59e0b;"></i></span>
                    <span class="tree-name">${node.name}</span>
                    <span class="tree-count">${node.file_count} files</span>
                </div>
                <div class="tree-children">
        `;

        if (hasChildren) {
            node.children.forEach(child => {
                html += renderNode(child, level + 1);
            });
        }

        html += `
                </div>
            </div>
        `;
    } else {
        const iconColor = getFileIconColor(node.extension);
        const icon = getFileIcon(node.extension);

        html += `
            <div class="tree-item" data-level="${level}">
                <span class="toggle-icon"></span>
                <span class="tree-icon"><i class="${icon}" style="color: ${iconColor};"></i></span>
                <span class="tree-name">${node.name}</span>
                <span class="tree-size">${node.size}</span>
            </div>
        `;
    }

    return html;
}

function toggleFolder(folderElement) {
    folderElement.classList.toggle('folder-expanded');
    folderElement.classList.toggle('folder-collapsed');

    const toggleIcon = folderElement.querySelector('.toggle-icon i');
    if (toggleIcon) {
        if (folderElement.classList.contains('folder-expanded')) {
            toggleIcon.className = 'fas fa-chevron-down';
        } else {
            toggleIcon.className = 'fas fa-chevron-right';
        }
    }
}

function getFileIcon(extension) {
    const ext = extension.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
        return 'fas fa-image';
    } else if (ext === '.pdf') {
        return 'fas fa-file-pdf';
    } else if (['.doc', '.docx'].includes(ext)) {
        return 'fas fa-file-word';
    } else if (['.xls', '.xlsx'].includes(ext)) {
        return 'fas fa-file-excel';
    } else if (['.zip', '.rar', '.7z'].includes(ext)) {
        return 'fas fa-file-archive';
    } else if (['.txt', '.log'].includes(ext)) {
        return 'fas fa-file-alt';
    } else {
        return 'fas fa-file';
    }
}

function getFileIconColor(extension) {
    const ext = extension.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
        return '#ec4899';
    } else if (ext === '.pdf') {
        return '#dc2626';
    } else if (['.doc', '.docx'].includes(ext)) {
        return '#2563eb';
    } else if (['.xls', '.xlsx'].includes(ext)) {
        return '#059669';
    } else if (['.zip', '.rar', '.7z'].includes(ext)) {
        return '#7c3aed';
    } else {
        return '#6b7280';
    }
}

// Search and Filter Functions
function initializeSearchAndFilters() {
    const searchBox = document.getElementById('searchBox');
    const clearSearch = document.getElementById('clearSearch');
    const categoryFilterEl = document.getElementById('categoryFilter');
    const docTypeFilterEl = document.getElementById('docTypeFilter');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const collapseAllBtn = document.getElementById('collapseAllBtn');

    // Search functionality
    searchBox.addEventListener('input', function(e) {
        searchTerm = e.target.value.toLowerCase();
        if (searchTerm) {
            clearSearch.classList.add('show');
        } else {
            clearSearch.classList.remove('show');
        }
        applyFilters();
    });

    clearSearch.addEventListener('click', function() {
        searchBox.value = '';
        searchTerm = '';
        clearSearch.classList.remove('show');
        applyFilters();
    });

    // Category filter dropdown
    categoryFilterEl.addEventListener('change', function() {
        categoryFilter = this.value;
        applyFilters();
    });

    // Document type filter dropdown
    docTypeFilterEl.addEventListener('change', function() {
        docTypeFilter = this.value;
        applyFilters();
    });

    // Expand/Collapse all
    expandAllBtn.addEventListener('click', expandAll);
    collapseAllBtn.addEventListener('click', collapseAll);
}

function applyFilters() {
    const allItems = document.querySelectorAll('.folder-item, .tree-item');

    // First pass: Determine which items match the filters
    allItems.forEach(item => {
        const isFolder = item.classList.contains('folder-item');
        const treeName = item.querySelector('.tree-name');

        if (!treeName) return;

        const itemName = treeName.textContent.toLowerCase();
        let matches = true;

        // Apply search filter
        if (searchTerm && !itemName.includes(searchTerm)) {
            matches = false;
        }

        // Apply category filter (EGGS, RAW, PMP, POULTRY, Compliance)
        if (categoryFilter !== 'all' && matches) {
            const folderName = treeName.textContent.trim();
            if (!folderName.includes(categoryFilter)) {
                matches = false;
            }
        }

        // Apply document type filter (RFI, Invoice, Lab, Retest, Form, Other)
        if (docTypeFilter !== 'all' && matches) {
            const itemNameLower = treeName.textContent.toLowerCase();
            const docTypeLower = docTypeFilter.toLowerCase();

            if (docTypeFilter === 'Other') {
                // Show files that don't contain any of the known types
                const knownTypes = ['rfi', 'invoice', 'lab', 'retest', 'form'];
                const hasKnownType = knownTypes.some(type => itemNameLower.includes(type));
                if (hasKnownType) {
                    matches = false;
                }
            } else {
                // Show files that contain the selected type
                if (!itemNameLower.includes(docTypeLower)) {
                    matches = false;
                }
            }
        }

        // Store the match result as a data attribute
        item.dataset.matches = matches;
    });

    // Second pass: Show items that match OR are folders containing matching items
    allItems.forEach(item => {
        const isFolder = item.classList.contains('folder-item');
        const matches = item.dataset.matches === 'true';

        let shouldShow = matches;

        if (isFolder) {
            // For folders: show if they match OR if they contain any matching descendants
            const childrenContainer = item.querySelector('.tree-children');
            if (childrenContainer) {
                const descendants = childrenContainer.querySelectorAll('.folder-item, .tree-item');
                const hasMatchingDescendants = Array.from(descendants).some(
                    descendant => descendant.dataset.matches === 'true'
                );

                if (hasMatchingDescendants || matches) {
                    shouldShow = true;
                }
            }

            // If searching for a folder name and it matches, show all its children
            if (searchTerm && matches) {
                const childrenContainer = item.querySelector('.tree-children');
                if (childrenContainer) {
                    const allChildren = childrenContainer.querySelectorAll('.folder-item, .tree-item');
                    allChildren.forEach(child => {
                        child.dataset.showAsChild = 'true';
                    });
                }
            }
        }

        // If this item is marked to be shown as a child of a matching folder, show it
        if (item.dataset.showAsChild === 'true') {
            shouldShow = true;
        }

        // Show/hide item
        if (shouldShow) {
            item.classList.remove('hidden-item');
        } else {
            item.classList.add('hidden-item');
        }
    });

    // Third pass: Expand folders that contain matching items
    if (searchTerm || categoryFilter !== 'all') {
        document.querySelectorAll('.folder-item').forEach(folder => {
            if (folder.classList.contains('hidden-item')) return;

            const childrenContainer = folder.querySelector('.tree-children');
            if (childrenContainer) {
                const visibleChildren = Array.from(
                    childrenContainer.querySelectorAll('.folder-item, .tree-item')
                ).filter(child => !child.classList.contains('hidden-item'));

                if (visibleChildren.length > 0) {
                    folder.classList.add('folder-expanded');
                    folder.classList.remove('folder-collapsed');
                    const toggleIcon = folder.querySelector('.toggle-icon i');
                    if (toggleIcon) {
                        toggleIcon.className = 'fas fa-chevron-down';
                    }
                }
            }
        });
    }

    // Clean up temporary data attributes
    allItems.forEach(item => {
        delete item.dataset.showAsChild;
    });

    updateStats();
}

function updateStats() {
    const allFolders = document.querySelectorAll('.folder-item').length;
    const allFiles = document.querySelectorAll('.tree-item:not(.folder-row)').length;

    // Update stat cards at the top
    document.getElementById('folderCountCard').textContent = allFolders;
    document.getElementById('fileCountCard').textContent = allFiles;
}

function expandAll() {
    document.querySelectorAll('.folder-item').forEach(folder => {
        if (!folder.classList.contains('hidden-item')) {
            folder.classList.add('folder-expanded');
            folder.classList.remove('folder-collapsed');
            const toggleIcon = folder.querySelector('.toggle-icon i');
            if (toggleIcon) {
                toggleIcon.className = 'fas fa-chevron-down';
            }
        }
    });
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

function collapseAll() {
    document.querySelectorAll('.folder-item').forEach(folder => {
        folder.classList.add('folder-collapsed');
        folder.classList.remove('folder-expanded');
        const toggleIcon = folder.querySelector('.toggle-icon i');
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-chevron-right';
        }
    });
}
