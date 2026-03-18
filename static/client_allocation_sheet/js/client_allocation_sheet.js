        // Theme management - compatible with settings page
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

            // Handle window resize
            window.addEventListener('resize', function() {
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
            });
        });

        // Listen for theme changes from settings page
        window.addEventListener('storage', function(e) {
            if (e.key === 'theme') {
                document.documentElement.setAttribute('data-theme', e.newValue || 'light');
            }
        });

        // Selected row tracking
        let selectedRow = null;
        let contextMenuRow = null;

        function selectRow(row) {
            if (selectedRow) {
                selectedRow.classList.remove('selected');
            }
            row.classList.add('selected');
            selectedRow = row;
        }

        function showContextMenu(event, row) {
            event.preventDefault();
            contextMenuRow = row;

            const contextMenu = document.getElementById('contextMenu');
            contextMenu.style.display = 'block';

            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = event.clientX;
            let top = event.clientY;

            if (left + menuWidth > viewportWidth) {
                left = viewportWidth - menuWidth - 5;
            }

            if (top + menuHeight > viewportHeight) {
                top = viewportHeight - menuHeight - 5;
            }

            contextMenu.style.left = left + 'px';
            contextMenu.style.top = top + 'px';

            return false;
        }

        // Mobile card selection and context menu
        function selectCard(card) {
            // Remove selection from all cards and rows
            document.querySelectorAll('.client-card.selected').forEach(c => {
                c.classList.remove('selected');
            });
            if (selectedRow) {
                selectedRow.classList.remove('selected');
            }

            // Select the clicked card
            card.classList.add('selected');
            selectedRow = card; // Use the same variable for consistency
        }

        function showContextMenuCard(event, card) {
            event.preventDefault();

            // Select the card
            selectCard(card);
            contextMenuRow = card;

            const contextMenu = document.getElementById('contextMenu');
            contextMenu.style.display = 'block';

            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = event.clientX;
            let top = event.clientY;

            if (left + menuWidth > viewportWidth) {
                left = viewportWidth - menuWidth - 5;
            }

            if (top + menuHeight > viewportHeight) {
                top = viewportHeight - menuHeight - 5;
            }

            contextMenu.style.left = left + 'px';
            contextMenu.style.top = top + 'px';

            return false;
        }

        function hideContextMenu() {
            document.getElementById('contextMenu').style.display = 'none';
        }

        function editClientFromContext() {
            if (contextMenuRow) {
                selectedRow = contextMenuRow;
                selectedRow.classList.add('selected');
                openEditClientModal();
            }
            hideContextMenu();
        }

        function exportClientFromContext() {
            if (!contextMenuRow) {
                hideContextMenu();
                return;
            }

            const clientId = contextMenuRow.dataset.clientId;
            const businessName = contextMenuRow.dataset.businessName;

            const exportUrl = window.DJANGO_CONFIG.urls.exportClientAllocations + '?client_id=' + encodeURIComponent(clientId);
            window.location.href = exportUrl;

            hideContextMenu();
        }

        function deleteClientFromContext() {
            if (!contextMenuRow) {
                hideContextMenu();
                return;
            }

            const clientId = contextMenuRow.dataset.clientId;
            const businessName = contextMenuRow.dataset.businessName;

            if (!confirm(`Are you sure you want to delete "${businessName}" (Client ID: ${clientId})?\n\nThis action cannot be undone.`)) {
                hideContextMenu();
                return;
            }

            fetch(window.DJANGO_CONFIG.urls.deleteClientAllocation, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.DJANGO_CONFIG.csrfToken
                },
                body: JSON.stringify({
                    client_id: clientId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    contextMenuRow.style.transition = 'opacity 0.3s';
                    contextMenuRow.style.opacity = '0';

                    setTimeout(() => {
                        contextMenuRow.remove();

                        const rows = document.querySelectorAll('tbody tr');
                        rows.forEach((row, index) => {
                            const rowNumberCell = row.querySelector('.row-number');
                            if (rowNumberCell) {
                                rowNumberCell.textContent = index + 1;
                            }
                        });

                        selectedRow = null;
                        contextMenuRow = null;
                    }, 300);
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error deleting client');
            });

            hideContextMenu();
        }

        document.addEventListener('click', function(event) {
            if (!event.target.closest('.context-menu')) {
                hideContextMenu();
            }
        });

        function openAddClientModal() {
            document.getElementById('addClientModal').style.display = 'block';
            loadDropdownOptionsForForms();
        }

        function closeAddClientModal() {
            document.getElementById('addClientModal').style.display = 'none';
            document.getElementById('addClientForm').reset();
        }

        function openEditClientModal() {
            if (!selectedRow) {
                alert('Please select a client row to edit');
                return;
            }

            document.getElementById('edit_client_id').value = selectedRow.dataset.clientId;
            document.getElementById('edit_business_name').value = selectedRow.dataset.businessName || '';
            document.getElementById('edit_facility_type').value = selectedRow.dataset.facilityType || '';
            document.getElementById('edit_group_type').value = selectedRow.dataset.groupType || '';
            document.getElementById('edit_commodity').value = selectedRow.dataset.commodity || '';
            document.getElementById('edit_province').value = selectedRow.dataset.province || '';
            document.getElementById('edit_corporate_group').value = selectedRow.dataset.corporateGroup || '';
            document.getElementById('edit_allocated').value = selectedRow.dataset.allocated || '';
            document.getElementById('edit_representative_email').value = selectedRow.dataset.email || '';
            document.getElementById('edit_phone_number').value = selectedRow.dataset.phone || '';
            document.getElementById('edit_active_status').value = selectedRow.dataset.activeStatus || '';

            document.getElementById('editClientModal').style.display = 'block';
            loadDropdownOptionsForForms();
        }

        function closeEditClientModal() {
            document.getElementById('editClientModal').style.display = 'none';
            document.getElementById('editClientForm').reset();
        }

        function openManageOptionsModal() {
            document.getElementById('manageOptionsModal').style.display = 'block';
            loadDropdownOptions();
        }

        function closeManageOptionsModal() {
            document.getElementById('manageOptionsModal').style.display = 'none';
        }

        function loadDropdownOptions() {
            fetch(window.DJANGO_CONFIG.urls.getDropdownOptions)
                .then(r => r.json())
                .then(data => {
                    renderOptionList('facilityTypesList', 'facility_type', data.facility_types || []);
                    renderOptionList('corporateGroupsList', 'corporate_group', data.corporate_groups || []);
                    renderOptionList('groupTypesList', 'group_type', data.group_types || []);
                })
                .catch(() => alert('Error loading options'));
        }

        function renderOptionList(containerId, fieldType, items) {
            const el = document.getElementById(containerId);
            if (!el) return;
            if (!items.length) {
                el.innerHTML = '<p style="color:#9ca3af;font-size:0.875rem;">No options yet.</p>';
                return;
            }
            el.innerHTML = items.map(item => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px;">
                    <div>
                        <span style="font-weight:500; font-size:0.875rem;">${item.value}</span>
                        <span style="color:#9ca3af; font-size:0.75rem; margin-left:8px;">${item.count} client${item.count !== 1 ? 's' : ''}</span>
                    </div>
                    <button type="button" onclick="deleteOption('${fieldType}','${item.value.replace(/'/g,"\\'")}',${item.count})" style="padding:4px 10px; font-size:0.75rem; background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:4px; cursor:pointer;"><i class="fas fa-trash"></i> Delete</button>
                </div>`).join('');
        }

        function moSwitchTab(btn, panelId) {
            document.querySelectorAll('.mo-tab').forEach(t => {
                t.style.color = '#6b7280';
                t.style.borderBottomColor = 'transparent';
            });
            document.querySelectorAll('.mo-panel').forEach(p => p.style.display = 'none');
            btn.style.color = '#007890';
            btn.style.borderBottomColor = '#007890';
            document.getElementById(panelId).style.display = 'block';
        }

        function moAddOption(fieldType, inputId) {
            const input = document.getElementById(inputId);
            const value = input.value.trim();
            if (!value) { alert('Please enter a value'); return; }
            fetch(window.DJANGO_CONFIG.urls.addDropdownOption, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.DJANGO_CONFIG.csrfToken },
                body: JSON.stringify({ field_type: fieldType, value: value })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    input.value = '';
                    loadDropdownOptions();
                } else {
                    alert(data.error || 'Error adding option');
                }
            })
            .catch(() => alert('Error adding option'));
        }

        function deleteOption(fieldType, value, count) {
            if (count > 0) {
                if (!confirm(`This ${fieldType.replace('_', ' ')} is used by ${count} client(s). Deleting it will set those clients to empty. Continue?`)) {
                    return;
                }
            } else {
                if (!confirm(`Delete "${value}"?`)) {
                    return;
                }
            }

            fetch(window.DJANGO_CONFIG.urls.deleteDropdownOption, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.DJANGO_CONFIG.csrfToken
                },
                body: JSON.stringify({
                    field_type: fieldType,
                    value: value
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadDropdownOptions();
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error deleting option');
            });
        }

        function loadDropdownOptionsForForms() {
            fetch(window.DJANGO_CONFIG.urls.getDropdownOptions)
                .then(response => response.json())
                .then(data => {
                    updateCustomDropdown('facility_type_dropdown', data.facility_types);
                    updateCustomDropdown('edit_facility_type_dropdown', data.facility_types);

                    updateCustomDropdown('commodity_dropdown', data.commodities);
                    updateCustomDropdown('edit_commodity_dropdown', data.commodities);

                    updateCustomDropdown('corporate_group_dropdown', data.corporate_groups);
                    updateCustomDropdown('edit_corporate_group_dropdown', data.corporate_groups);
                })
                .catch(error => {
                    console.error('Error loading dropdown options:', error);
                });
        }

        function updateCustomDropdown(dropdownId, options) {
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) return;

            dropdown.innerHTML = '';

            (options || []).forEach(option => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.textContent = option.value;

                const inputId = dropdownId.replace('_dropdown', '');
                div.onclick = function() {
                    selectDropdownItem(inputId, option.value, dropdownId);
                };

                dropdown.appendChild(div);
            });
        }

        function showDropdown(dropdownId) {
            document.querySelectorAll('.custom-dropdown-menu').forEach(menu => {
                if (menu.id !== dropdownId) {
                    menu.classList.remove('show');
                }
            });
            document.getElementById(dropdownId).classList.add('show');
        }

        function hideDropdown(dropdownId) {
            document.getElementById(dropdownId).classList.remove('show');
        }

        function selectDropdownItem(inputId, value, dropdownId) {
            document.getElementById(inputId).value = value;
            hideDropdown(dropdownId);
        }

        function filterDropdown(inputId, dropdownId) {
            const input = document.getElementById(inputId);
            const filter = input.value.toUpperCase();
            const dropdown = document.getElementById(dropdownId);
            const items = dropdown.getElementsByClassName('custom-dropdown-item');

            for (let i = 0; i < items.length; i++) {
                const txtValue = items[i].textContent || items[i].innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    items[i].style.display = '';
                } else {
                    items[i].style.display = 'none';
                }
            }
        }

        document.addEventListener('click', function(event) {
            if (!event.target.closest('.custom-dropdown')) {
                document.querySelectorAll('.custom-dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });

        window.onclick = function(event) {
            const addModal = document.getElementById('addClientModal');
            const editModal = document.getElementById('editClientModal');
            if (event.target == addModal) {
                closeAddClientModal();
            } else if (event.target == editModal) {
                closeEditClientModal();
            }
        }

        // FORCE FORM TO SUBMIT NORMALLY - Override any interfering handlers
        document.addEventListener('DOMContentLoaded', function() {
            const filterForm = document.getElementById('filterForm');
            if (filterForm) {
                // Remove any onclick handlers from submit button
                const submitBtn = filterForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.onclick = null;
                    submitBtn.addEventListener('click', function(e) {
                        console.log('Submit button clicked - form will submit naturally');
                    });
                }

                // Ensure form submits normally
                filterForm.addEventListener('submit', function(e) {
                    console.log('Form submitting with method:', this.method, 'to:', this.action);
                    // Don't prevent default - let it submit naturally
                });

                console.log('Filter form configured for normal submission');
            }
        });

        // Disable any applyClientFilters function if it exists
        if (typeof applyClientFilters !== 'undefined') {
            console.warn('Disabling applyClientFilters function');
            window.applyClientFilters = function() {
                console.log('applyClientFilters called but disabled - use form submission instead');
            };
        }
