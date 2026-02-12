                // CACHE BUST: 2025-10-28 - Email functions fix - MUST SEE THIS
                console.log('🚀 SCRIPT LOADED - Cache busted at:', new Date().toISOString());

                // Set global CSRF token for upload functions
                try {
                    window.csrfToken = window.DJANGO_CONFIG.csrfToken;
                    console.log('CSRF token set globally for upload functions');
                } catch (error) {
                    console.error('Error setting CSRF token:', error);
                }

                // DEBOUNCE HELPER FUNCTION - Must be defined early
                function debounce(func, wait) {
                    let timeout;
                    return function executedFunction(...args) {
                        const later = () => {
                            clearTimeout(timeout);
                            func(...args);
                        };
                        clearTimeout(timeout);
                        timeout = setTimeout(later, wait);
                    };
                }

                // EMAIL MANAGEMENT FUNCTIONS - lightweight stubs
                // The full, robust implementations are defined later in this file
                // to avoid duplicate definitions and to keep logic centralized.
                (function () {
                    function stub(name) {
                        return function () {
                            console.warn('[EMAIL-STUB]', name, 'called before real implementation is loaded.');
                        };
                    }

                    window.updateGroupAdditionalEmails = window.updateGroupAdditionalEmails || stub('updateGroupAdditionalEmails');
                    window.addEmailInput = window.addEmailInput || stub('addEmailInput');
                    window.removeEmailInput = window.removeEmailInput || stub('removeEmailInput');

                    // Inspector multi-select dropdown - all event listeners attached via JS
                    document.addEventListener('DOMContentLoaded', function() {
                        const dropdownBtn = document.getElementById('inspectorDropdownBtn');
                        const dropdown = document.getElementById('inspectorDropdown');
                        const selectAllCheckbox = document.getElementById('selectAllInspectors');
                        const textEl = document.getElementById('inspectorSelectText');

                        function updateInspectorText() {
                            const checkboxes = document.querySelectorAll('.inspector-checkbox');
                            const checked = document.querySelectorAll('.inspector-checkbox:checked');

                            if (checked.length === 0) {
                                if (textEl) textEl.textContent = 'All Inspectors';
                            } else if (checked.length === 1) {
                                if (textEl) textEl.textContent = checked[0].value;
                            } else {
                                if (textEl) textEl.textContent = checked.length + ' selected';
                            }

                            // Update "Select All" checkbox state
                            if (selectAllCheckbox) {
                                selectAllCheckbox.checked = checked.length === checkboxes.length;
                                selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
                            }
                        }

                        // Toggle dropdown on button click
                        if (dropdownBtn && dropdown) {
                            dropdownBtn.addEventListener('click', function(e) {
                                e.stopPropagation();
                                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                            });
                        }

                        // Select All checkbox
                        if (selectAllCheckbox) {
                            selectAllCheckbox.addEventListener('change', function() {
                                const checkboxes = document.querySelectorAll('.inspector-checkbox');
                                checkboxes.forEach(cb => cb.checked = this.checked);
                                updateInspectorText();
                            });
                        }

                        // Individual inspector checkboxes
                        document.querySelectorAll('.inspector-checkbox').forEach(cb => {
                            cb.addEventListener('change', updateInspectorText);
                        });

                        // Close dropdown when clicking outside
                        document.addEventListener('click', function(e) {
                            if (dropdown && dropdownBtn && !dropdown.contains(e.target) && !dropdownBtn.contains(e.target)) {
                                dropdown.style.display = 'none';
                            }
                        });

                        // Initialize from URL params
                        const params = new URLSearchParams(window.location.search);
                        const selectedInspectors = params.getAll('branch');
                        if (selectedInspectors.length > 0) {
                            selectedInspectors.forEach(inspector => {
                                const checkbox = document.querySelector(`.inspector-checkbox[value="${inspector}"]`);
                                if (checkbox) checkbox.checked = true;
                            });
                            updateInspectorText();
                        }

                        console.log('[INSPECTOR FILTER] Multi-select dropdown initialized');
                    });

                    // Basic safe initializer for existing inputs so inline handlers don't fail
                    document.addEventListener('DOMContentLoaded', function () {
                        // === DEBUG: Screen Size and Detail Table Styling ===
                        console.log('=== DETAIL TABLE DEBUG INFO ===');
                        console.log('Screen Width:', window.innerWidth + 'px');
                        console.log('Screen Height:', window.innerHeight + 'px');
                        console.log('Device Pixel Ratio:', window.devicePixelRatio);

                        // Log detail table styling
                        const detailTable = document.querySelector('.detail-table');
                        if (detailTable) {
                            const computedStyle = window.getComputedStyle(detailTable);
                            console.log('Detail Table Width:', detailTable.offsetWidth + 'px');
                            console.log('Detail Table Display:', computedStyle.display);
                            console.log('Detail Table Table Layout:', computedStyle.tableLayout);
                            console.log('Detail Table Min Width:', computedStyle.minWidth);
                        }

                        // Log detail table wrapper styling
                        const detailWrapper = document.querySelector('.detail-table-wrapper');
                        if (detailWrapper) {
                            const wrapperStyle = window.getComputedStyle(detailWrapper);
                            console.log('Wrapper Width:', detailWrapper.offsetWidth + 'px');
                            console.log('Wrapper Overflow-X:', wrapperStyle.overflowX);
                            console.log('Wrapper Max Width:', wrapperStyle.maxWidth);
                        }

                        // Log breakpoint info
                        if (window.innerWidth <= 640) {
                            console.log('Breakpoint: MOBILE (≤640px)');
                        } else if (window.innerWidth <= 1024) {
                            console.log('Breakpoint: TABLET (641-1024px)');
                        } else {
                            console.log('Breakpoint: DESKTOP (≥1025px)');
                        }
                        console.log('=== END DEBUG INFO ===');

                        // Listen for window resize
                        window.addEventListener('resize', function () {
                            console.log('Window Resized - New Width:', window.innerWidth + 'px');
                        });
                        // === END DEBUG ===

                        try {
                            const containers = document.querySelectorAll('.additional-emails-container');
                            containers.forEach(function (container) {
                                const emailInputs = container.querySelectorAll('.group-additional-email-input');
                                emailInputs.forEach(function (input) {
                                    // Ensure onchange/onblur attributes won't throw if functions not ready
                                    input.addEventListener('change', function () {
                                        if (typeof window.updateGroupAdditionalEmails === 'function') {
                                            window.updateGroupAdditionalEmails(this);
                                        }
                                    });
                                    input.addEventListener('blur', function () {
                                        if (typeof window.updateGroupAdditionalEmails === 'function') {
                                            window.updateGroupAdditionalEmails(this);
                                        }
                                    });
                                });
                            });
                        } catch (e) {
                            console.warn('[EMAIL-STUB] initialization error', e);
                        }
                    });
                })();

                // CLASS DROPDOWN FUNCTION - Must be defined early to avoid syntax errors
                window.filterClassOptions = function (dropdown) {
                    console.log('[CLASS] Populating dropdown - function called');
                    console.log('[CLASS] Dropdown element:', dropdown);
                    console.log('[CLASS] Dropdown classes:', dropdown.className);
                    const currentValue = dropdown.getAttribute('data-current-class') || dropdown.value;
                    console.log('[CLASS] Current value:', currentValue);

                    const allClassOptions = ['Raw species sausage / wors', 'Extra Lean Mince', 'Lean Mince', 'Regular Mince', 'Raw Flavoured Ground Meat', 'Raw Flavoured Ground Meat & Offal', 'Raw Flavoured mixed species Ground Meat', 'Raw Flavoured mixed species Ground Meat & Offal', 'Raw Boerewors', 'Raw mixed species sausage / wors', 'Ground Burger / Ground patty = Extra Lean', 'Ground Burger / Ground patty = Lean', 'Ground Burger / Ground patty = Regular', 'Burger / Patty / Hamburger Patty / Meatball / Frikkadel = Extra Lean', 'Burger / Patty / Hamburger Patty / Meatball / Frikkadel = Lean', 'Burger / Patty / Hamburger Patty / Meatball / Frikkadel = Regular', 'Value burger / Value patty / Value hamburger / Value meatball / Value frikkadel', 'Economy Burger / Econo Burger / Economy Patty / Econo Patty / Budget Burger', 'Raw Banger / Griller', 'Raw Bratwurst / Sizzler', 'Whole Muscle, uncured and heat / partial heat treated products', 'Whole muscle, uncured, no or partial heat treated and air dried products', 'Whole muscle, uncured, no or partial heat treated and air dried products undergoing a lengthy maturation period (minimum 21 days)', 'Whole muscle, dry cured, no or partial heat treated products', 'Whole muscle, cured and no or partial heat treated products', 'Whole muscle, cured, no or partial heat treated and air dried products', 'Whole muscle, dry cured, no or partial heat treated and dried products', 'Comminuted, cured and heat treated products', 'Comminuted, uncured, no or partial heat treated and dried products', 'Comminuted, cured, no or partial heat treated, dried and fermented products', 'Comminuted, uncured and heat treated products', 'Reformed, uncured and no or partial heat treated products', 'Reformed, cured, heat treated products from single species', 'Reformed, cured, heat treated products from mixed species', 'Reformed, cured and no or partial heat treated products', 'Liver spreads, pâté and terrines', 'Products in aspic: Brawn', 'Product in aspic: Souse, Other products containing cured meat pieces in aspic', 'Products made from blood', 'Coated Processed Meat Products', 'Unspecified processed meat products'];

                    dropdown.innerHTML = '';
                    const placeholder = document.createElement('option');
                    placeholder.value = '';
                    placeholder.textContent = 'Select Class...';
                    dropdown.appendChild(placeholder);

                    allClassOptions.forEach(optionText => {
                        const option = document.createElement('option');
                        option.value = optionText;
                        option.textContent = optionText;
                        if (optionText === currentValue) option.selected = true;
                        dropdown.appendChild(option);
                    });

                    if (currentValue && allClassOptions.includes(currentValue)) {
                        dropdown.value = currentValue;
                    }

                    // Apply border styling based on current value
                    console.log('[BORDER DEBUG] Dropdown value:', dropdown.value);
                    console.log('[BORDER DEBUG] Is empty?', !dropdown.value || dropdown.value === '');
                    console.log('[BORDER DEBUG] Is placeholder?', dropdown.value === 'Select Class...');

                    if (dropdown.value && dropdown.value !== '' && dropdown.value !== 'Select Class...') {
                        dropdown.classList.add('has-value');
                        console.log('[BORDER DEBUG] Added has-value class - should be GREEN');
                    } else {
                        dropdown.classList.remove('has-value');
                        console.log('[BORDER DEBUG] Removed has-value class - should be RED');
                    }

                    console.log('[CLASS] Dropdown now has', dropdown.options.length, 'options');
                    console.log('[CLASS] First few options:', Array.from(dropdown.options).slice(0, 5).map(opt => opt.textContent));
                    console.log('[CLASS] Dropdown value after population:', dropdown.value);
                };

                // Function to enforce mobile layout
                function enforceMobileLayout() {
                    if (window.innerWidth <= 1024) {
                        const table = document.getElementById('shipmentsTable');
                        if (table) {
                            const rows = table.querySelectorAll('tbody tr');
                            rows.forEach(row => {
                                if (!row.classList.contains('detail-row')) {
                                    row.style.display = 'block';
                                    const cells = row.querySelectorAll('td');
                                    cells.forEach(cell => {
                                        cell.style.display = 'block';
                                    });
                                }
                            });
                        }
                    }
                }

                // Initialize class dropdowns when DOM is ready
                document.addEventListener('DOMContentLoaded', function () {
                    console.log('[CLASS] Initializing class dropdowns...');
                    const dropdowns = document.querySelectorAll('select.product-class-select');
                    console.log('[CLASS] Found', dropdowns.length, 'dropdowns');
                    dropdowns.forEach(window.filterClassOptions);

                    // Observe the table for dynamic changes and re-apply filters
                    const table = document.getElementById('shipmentsTable');
                    if (table && 'MutationObserver' in window) {
                        console.log('[CLASS] Setting up MutationObserver...');
                        const observer = new MutationObserver(() => {
                            console.log('[CLASS] Table changed, re-filtering dropdowns...');
                            document.querySelectorAll('select.product-class-select').forEach(window.filterClassOptions);
                        });
                        observer.observe(table, { childList: true, subtree: true });
                    }

                    // Fallback: periodic re-filter shortly after load in case of late rendering
                    setTimeout(() => {
                        console.log('[CLASS] Fallback timeout - re-filtering dropdowns...');
                        const fallbackDropdowns = document.querySelectorAll('select.product-class-select');
                        console.log('[CLASS] Fallback found', fallbackDropdowns.length, 'dropdowns');
                        fallbackDropdowns.forEach(window.filterClassOptions);
                    }, 500);

                    // Re-populate after expand (for dynamically shown rows)
                    setTimeout(function () {
                        console.log('[CLASS] Re-checking dropdowns after delay...');
                        document.querySelectorAll('select.product-class-select').forEach(window.filterClassOptions);
                    }, 1000);
                });

                // Simple KM and Hours update functions - defined early
                window.updateGroupKmTraveled = function (input) {
                    const groupId = input.getAttribute('data-group-id');
                    const kmValue = input.value;

                    console.log('[STORAGE] Updating Group KM - Group ID:', groupId, 'Value:', kmValue);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('group_id', groupId);
                    formData.append('km_traveled', kmValue);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-group-km-traveled/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] KM saved successfully:', data);
                                // Show success feedback
                                input.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    input.style.backgroundColor = '';
                                }, 500);
                            } else {
                                console.error('[ERROR] Error saving KM:', data.error);
                                alert('Error updating KM: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('[ERROR] Network error saving KM:', error);
                            alert('Error updating KM: ' + error.message);
                        });
                };

                window.updateGroupHours = function (input) {
                    const groupId = input.getAttribute('data-group-id');
                    const hoursValue = input.value;

                    console.log('[STORAGE] Updating Group Hours - Group ID:', groupId, 'Value:', hoursValue);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('group_id', groupId);
                    formData.append('hours', hoursValue);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-group-hours/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] Hours saved successfully:', data);
                                // Show success feedback
                                input.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    input.style.backgroundColor = '';
                                }, 500);
                            } else {
                                console.error('[ERROR] Error saving Hours:', data.error);
                                alert('Error updating Hours: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('[ERROR] Network error saving Hours:', error);
                            alert('Error updating Hours: ' + error.message);
                        });
                };

                // Bought Sample function is now loaded from bought_sample.js

                // Group Bought Sample update function
                window.updateGroupBoughtSample = function (input) {
                    const groupId = input.getAttribute('data-group-id');
                    const boughtSampleValue = input.value;

                    console.log('[STORAGE] Updating Group Bought Sample - Group ID:', groupId, 'Value:', boughtSampleValue);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('group_id', groupId);
                    formData.append('bought_sample', boughtSampleValue);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-group-bought-sample/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] Bought Sample saved successfully:', data);
                                // Show success feedback
                                input.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    input.style.backgroundColor = '';
                                }, 500);
                            } else {
                                console.error('[ERROR] Error saving Bought Sample:', data.error);
                                alert('Error updating Bought Sample: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('[ERROR] Network error saving Bought Sample:', error);
                            alert('Error updating Bought Sample: ' + error.message);
                        });
                };

                // Backwards-compatible wrapper: delegate single-input updates to the consolidated function
                window.updateGroupAdditionalEmail = function (input) {
                    if (typeof window.updateGroupAdditionalEmails === 'function') {
                        return window.updateGroupAdditionalEmails(input);
                    }
                    // Fallback: do a direct POST (legacy behavior)
                    const groupId = input.getAttribute('data-group-id');
                    const emailValue = input.value.trim();
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
                    const formData = new FormData();
                    formData.append('group_id', groupId);
                    formData.append('additional_email', emailValue);
                    formData.append('csrfmiddlewaretoken', csrfToken);
                    fetch('/update-group-additional-email/', { method: 'POST', body: formData })
                        .then(r => r.json())
                        .then(data => {
                            if (data.success) {
                                input.style.backgroundColor = '#d4edda';
                                setTimeout(() => input.style.backgroundColor = '', 500);
                            } else {
                                console.error('Error saving additional email (fallback):', data.error);
                            }
                        })
                        .catch(err => console.error('Network error (fallback):', err));
                };

                // Debounce function moved to early in script (around line 7193)

                // Email management functions moved to early in script (around line 7206)
                // Duplicate definitions removed to prevent conflicts

                // Function to update input border colors based on value
                function updateInputBorderColor(input) {
                    if (input.value && input.value.trim() !== '') {
                        input.style.borderColor = '#28a745'; // Green when has value
                    } else {
                        input.style.borderColor = '#dc3545'; // Red when empty
                    }
                }

                // Add event listeners to all input fields for dynamic border updates
                document.addEventListener('DOMContentLoaded', function () {
                    // Update borders for all input fields
                    const allInputs = document.querySelectorAll('.km-input, .hours-input, .bought-sample-input, .group-km-input, .group-hours-input, .group-additional-email-input');
                    allInputs.forEach(input => {
                        // Set initial border color
                        updateInputBorderColor(input);

                        // Add event listeners for real-time updates
                        input.addEventListener('input', function () {
                            updateInputBorderColor(this);
                        });

                        input.addEventListener('blur', function () {
                            updateInputBorderColor(this);
                        });
                    });
                };

                // Function to update approved status
                window.updateGroupApproved = function (select) {
                    const groupId = select.getAttribute('data-group-id');
                    const approvedValue = select.value;

                    console.log('[STORAGE] Updating Group Approved Status - Group ID:', groupId, 'Value:', approvedValue);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('group_id', groupId);
                    formData.append('approved_status', approvedValue);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-group-approved/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('✅ Approved status saved successfully:', data);
                                // Show success feedback
                                select.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    select.style.backgroundColor = '';
                                }, 500);
                            } else {
                                console.error('❌ Error saving approved status:', data.error);
                                alert('Error updating approved status: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('❌ Network error saving approved status:', error);
                            alert('Error updating approved status: ' + error.message);
                        });
                };
                // ============================================
                // CRITICAL: Define core functions FIRST
                // These must be available immediately for onclick handlers
                // ============================================
                // Note: deleteInspectionGroup is defined in HEAD section

                // Files popup function (main implementation)
                window.openFilesPopup = window.openFilesPopup || function (groupId, clientName, inspectionDate) {
                    console.log('openFilesPopup called:', groupId, clientName, inspectionDate);
                    const modal = document.getElementById('filesModal');
                    if (modal) {
                        modal.style.display = 'block';
                        const modalTitle = document.getElementById('modalTitle');
                        if (modalTitle) modalTitle.textContent = 'Files for ' + clientName + ' - ' + inspectionDate;
                        window.currentFilesClient = clientName;
                        window.currentFilesDate = inspectionDate;
                        window.currentFilesGroupId = groupId;
                        if (typeof window.loadInspectionFiles === 'function') {
                            window.loadInspectionFiles(groupId, clientName, inspectionDate);
                        }
                    }
                };

                // View files alias
                window.viewFilesForGroup = window.viewFilesForGroup || function (groupId, clientName, inspectionDate) {
                    window.openFilesPopup(groupId, clientName, inspectionDate);
                };

                // Upload functions for inspection-level documents
                window.uploadComplianceForInspection = window.uploadComplianceForInspection || function (productId, groupId) {
                    console.log('Upload compliance for inspection:', productId, groupId);
                    alert('Please wait - upload functions loading...');
                };

                window.uploadCompositionForInspection = window.uploadCompositionForInspection || function (productId, groupId) {
                    console.log('Upload composition for inspection:', productId, groupId);
                    alert('Please wait - upload functions loading...');
                };

                window.uploadLabForInspection = window.uploadLabForInspection || function (productId, groupId) {
                    console.log('Upload lab for inspection:', productId, groupId);
                    alert('Please wait - upload functions loading...');
                };

                window.uploadOccurrenceForInspection = window.uploadOccurrenceForInspection || function (productId, groupId) {
                    console.log('Upload occurrence for inspection:', productId, groupId);
                    alert('Please wait - upload functions loading...');
                };

                window.uploadInvoiceForInspection = window.uploadInvoiceForInspection || function (productId, groupId) {
                    console.log('Upload invoice for inspection:', productId, groupId);
                    alert('Please wait - upload functions loading...');
                };

                window.uploadRfiForInspection = window.uploadRfiForInspection || function (productId, groupId) {
                    console.log('Upload RFI for inspection:', productId, groupId);
                    alert('Please wait - upload functions loading...');
                };

                window.uploadRetestForInspection = window.uploadRetestForInspection || function (productId, groupId) {
                    console.log('Upload Retest for inspection:', productId, groupId);
                    alert('Please wait - upload functions loading...');
                };

                window.uploadOtherForInspection = window.uploadOtherForInspection || function (productId, groupId) {
                    console.log('Upload other for inspection:', productId, groupId);
                    alert('Please wait - upload functions loading...');
                };

                window.uploadLabFormForInspection = window.uploadLabFormForInspection || function (productId, groupId) {
                    console.log('Upload lab form for inspection:', productId, groupId);
                    alert('Please wait - upload functions loading...');
                };

                window.viewDocForInspection = window.viewDocForInspection || function (productId, docType) {
                    console.log('View doc for inspection:', productId, docType);
                };

                window.deleteDocForInspection = window.deleteDocForInspection || function (productId, docType) {
                    console.log('Delete doc for inspection:', productId, docType);
                };

                console.log('✅ Critical functions defined early');

                // Global error handler to catch any uncaught exceptions
                window.addEventListener('error', function (event) {
                    console.error('Uncaught JavaScript error:', event.error);
                    console.error('Error details:', {
                        message: event.message,
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                        error: event.error
                    });
                    // Don't let errors break the page functionality
                    return true;
                });

                // Wrap all JavaScript in error handling to prevent uncaught exceptions
                console.log('Main JavaScript started loading...');

                // Hide invoice column for inspectors
                document.addEventListener('DOMContentLoaded', function () {
                    const userRole = window.DJANGO_CONFIG.userRole;
                    if (userRole === 'inspector') {
                        const table = document.getElementById('shipmentsTable');
                        if (table) {
                            table.classList.add('hide-invoice');
                        }

                        // Hide actions column in detail tables for inspectors
                        const detailTables = document.querySelectorAll('.detail-table');
                        detailTables.forEach(table => {
                            table.classList.add('hide-actions');
                        });
                    }
                });

                // Theme management (using same system as inspector settings)
                function initTheme() {
                    const savedTheme = localStorage.getItem('theme');

                    // Default to light mode first
                    let activeTheme = 'light';
                    if (savedTheme) {
                        activeTheme = savedTheme;
                    }

                    document.documentElement.setAttribute('data-theme', activeTheme);
                    console.log('Theme initialized:', activeTheme);
                }

                function toggleTheme() {
                    const themeMode = document.getElementById('theme_mode');
                    if (themeMode) {
                        const newTheme = themeMode.checked ? 'dark' : 'light';
                        console.log('Switching to theme:', newTheme);

                        document.documentElement.setAttribute('data-theme', newTheme);

                        try {
                            localStorage.setItem('theme', newTheme);
                            console.log('Theme saved to localStorage:', newTheme);
                        } catch (e) {
                            console.log('Could not save theme to localStorage:', e);
                        }
                    }
                }

                // Listen for theme changes from other pages
                function listenForThemeChanges() {
                    window.addEventListener('storage', function (e) {
                        if (e.key === 'theme') {
                            console.log('Theme changed from another page:', e.newValue);
                            document.documentElement.setAttribute('data-theme', e.newValue || 'light');
                        }
                    });
                }

                // Force theme application (can be called manually)
                function forceThemeApplication() {
                    const savedTheme = localStorage.getItem('theme') || 'light';
                    document.documentElement.setAttribute('data-theme', savedTheme);
                    console.log('Theme force applied:', savedTheme);
                }

                // Make theme functions globally available
                window.initTheme = initTheme;
                window.forceThemeApplication = forceThemeApplication;


                // Global expand/collapse functions
                function expandAll() {
                    const detailRows = document.querySelectorAll('.detail-row');
                    const expandBtns = document.querySelectorAll('.expand-btn');

                    detailRows.forEach(row => {
                        // Skip if this detail row belongs to a "New" client
                        const groupRow = row.previousElementSibling;
                        if (groupRow && groupRow.classList.contains('greyed-out-group')) {
                            return; // Skip "New" clients
                        }
                        row.style.display = 'table-row';
                    });

                    // Force mobile layout if screen is small
                    if (typeof enforceMobileLayout === 'function') {
                        enforceMobileLayout();
                    }

                    expandBtns.forEach(btn => {
                        // Skip if this button belongs to a "New" client
                        const row = btn.closest('tr.greyed-out-group');
                        if (row) {
                            return; // Skip "New" clients
                        }
                        btn.classList.add('expanded');
                        const icon = btn.querySelector('i');
                        if (icon) {
                            icon.classList.remove('fa-chevron-right');
                            icon.classList.add('fa-chevron-down');
                        }
                    });

                    // Also expand mobile cards
                    const mobileCards = document.querySelectorAll('.group-card .group-details');
                    const mobileExpandBtns = document.querySelectorAll('.group-card .expand-btn');

                    mobileCards.forEach(card => {
                        card.classList.add('expanded');
                    });

                    mobileExpandBtns.forEach(btn => {
                        btn.classList.add('expanded');
                        const icon = btn.querySelector('i');
                        if (icon) {
                            icon.style.transform = 'rotate(180deg)';
                        }
                    });
                };

                function collapseAll() {
                    const detailRows = document.querySelectorAll('.detail-row');
                    const expandBtns = document.querySelectorAll('.expand-btn');

                    detailRows.forEach(row => {
                        // Skip if this detail row belongs to a "New" client
                        const groupRow = row.previousElementSibling;
                        if (groupRow && groupRow.classList.contains('greyed-out-group')) {
                            return; // Skip "New" clients
                        }
                        row.style.display = 'none';
                    });

                    expandBtns.forEach(btn => {
                        // Skip if this button belongs to a "New" client
                        const row = btn.closest('tr.greyed-out-group');
                        if (row) {
                            return; // Skip "New" clients
                        }
                        btn.classList.remove('expanded');
                        const icon = btn.querySelector('i');
                        if (icon) {
                            icon.classList.remove('fa-chevron-down');
                            icon.classList.add('fa-chevron-right');
                        }
                    });

                    // Also collapse mobile cards
                    const mobileCards = document.querySelectorAll('.group-card .group-details');
                    const mobileExpandBtns = document.querySelectorAll('.group-card .expand-btn');

                    mobileCards.forEach(card => {
                        card.classList.remove('expanded');
                    });

                    mobileExpandBtns.forEach(btn => {
                        btn.classList.remove('expanded');
                        const icon = btn.querySelector('i');
                        if (icon) {
                            icon.style.transform = 'rotate(0deg)';
                        }
                    });
                };

                // Mobile card expand/collapse functionality
                function initMobileCards() {
                    const expandBtns = document.querySelectorAll('.group-card .expand-btn');

                    expandBtns.forEach(btn => {
                        btn.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();

                            const groupId = this.getAttribute('data-group-id');
                            const card = this.closest('.group-card');
                            const details = card.querySelector('.group-details');
                            const icon = this.querySelector('i');

                            console.log('Mobile card clicked, groupId:', groupId);
                            console.log('Details element:', details);
                            console.log('Current classes:', details.className);

                            if (details.classList.contains('expanded')) {
                                // Collapse
                                console.log('Collapsing card');
                                details.classList.remove('expanded');
                                this.classList.remove('expanded');
                                if (icon) {
                                    icon.style.transform = 'rotate(0deg)';
                                }
                            } else {
                                // Expand
                                console.log('Expanding card');
                                details.classList.add('expanded');
                                this.classList.add('expanded');
                                if (icon) {
                                    icon.style.transform = 'rotate(180deg)';
                                }
                            }
                        });
                    });
                }

                // Initialize mobile cards when DOM is loaded
                document.addEventListener('DOMContentLoaded', function () {
                    console.log('DOM loaded, initializing mobile cards');
                    initMobileCards();
                });

                // Also initialize when window loads (fallback)
                window.addEventListener('load', function () {
                    console.log('Window loaded, initializing mobile cards');
                    initMobileCards();
                });

                // Re-initialize mobile cards after any dynamic content changes
                function reinitMobileCards() {
                    console.log('Re-initializing mobile cards');
                    initMobileCards();
                }

                // Global toggle function
                function toggleGroup(e, groupId) {
                    console.log('[TOGGLE] Toggling group:', groupId);
                    e.preventDefault();
                    e.stopPropagation();

                    const detailRow = document.getElementById('detail-' + groupId);
                    console.log('[TOGGLE] Detail row found:', detailRow);
                    console.log('[TOGGLE] Detail row ID:', 'detail-' + groupId);

                    if (!detailRow) {
                        console.warn('No detail row for groupId:', groupId);
                        return;
                    }

                    // Find the expand button safely
                    let expandBtn = null;
                    if (e && e.target) {
                        expandBtn = e.target.closest('.expand-btn');
                    }
                    if (!expandBtn) {
                        const groupRow = document.querySelector('tr.group-row[data-group-id="' + groupId + '"]');
                        if (groupRow) {
                            expandBtn = groupRow.querySelector('.expand-btn');
                        }
                    }

                    const icon = expandBtn ? expandBtn.querySelector('i') : null;

                    const isHidden = detailRow.style.display === 'none' || detailRow.style.display === '';
                    if (isHidden) {
                        // Expand
                        detailRow.style.display = 'table-row';
                        if (expandBtn) expandBtn.classList.add('expanded');

                        // Force mobile layout if screen is small
                        if (typeof enforceMobileLayout === 'function') {
                            enforceMobileLayout();
                        }
                        if (icon) {
                            icon.classList.remove('fa-chevron-right');
                            icon.classList.add('fa-chevron-down');
                        }

                        // Populate class dropdowns when expanding
                        console.log('[TOGGLE] Expanding - populating class dropdowns...');
                        const classDropdowns = detailRow.querySelectorAll('select.product-class-select');
                        console.log('[TOGGLE] Found', classDropdowns.length, 'class dropdowns in expanded row');

                        if (classDropdowns.length > 0) {
                            console.log('[TOGGLE] Calling filterClassOptions for each dropdown...');
                            classDropdowns.forEach((dropdown, index) => {
                                console.log(`[TOGGLE] Processing dropdown ${index + 1}:`, dropdown);
                                console.log(`[TOGGLE] Dropdown classes:`, dropdown.className);
                                console.log(`[TOGGLE] Dropdown data attributes:`, {
                                    'data-inspection-id': dropdown.getAttribute('data-inspection-id'),
                                    'data-commodity': dropdown.getAttribute('data-commodity'),
                                    'data-current-class': dropdown.getAttribute('data-current-class')
                                });
                                window.filterClassOptions(dropdown);
                            });
                        } else {
                            console.log('[TOGGLE] No class dropdowns found in expanded row');
                            // Try to find any select elements
                            const allSelects = detailRow.querySelectorAll('select');
                            console.log('[TOGGLE] All select elements found:', allSelects.length);
                            allSelects.forEach((select, index) => {
                                console.log(`[TOGGLE] Select ${index + 1}:`, select.className, select);
                            });
                        }
                    } else {
                        // Collapse
                        detailRow.style.display = 'none';
                        if (expandBtn) expandBtn.classList.remove('expanded');
                        if (icon) {
                            icon.classList.remove('fa-chevron-down');
                            icon.classList.add('fa-chevron-right');
                        }
                    }
                }

                // Mobile Menu Toggle
                function toggleSidebar() {
                    console.log('🍔 ===== MENU TOGGLE STARTED =====');
                    console.log('🍔 Menu button clicked!');

                    const sidebar = document.getElementById('sidebar');
                    const overlay = document.getElementById('sidebar-overlay');
                    const mobileBtn = document.getElementById('mobile-menu-btn');

                    console.log('🍔 Elements found:', {
                        sidebar: !!sidebar,
                        overlay: !!overlay,
                        mobileBtn: !!mobileBtn
                    });

                    if (sidebar && overlay && mobileBtn) {
                        console.log('🍔 All elements found, proceeding with toggle...');

                        // Check current state before toggle
                        const wasOpen = sidebar.classList.contains('show');
                        console.log('🍔 Current state - Sidebar open:', wasOpen);
                        console.log('🍔 Current sidebar classes:', sidebar.className);
                        console.log('🍔 Current overlay classes:', overlay.className);

                        // Toggle classes
                        sidebar.classList.toggle('show');
                        overlay.classList.toggle('show');

                        console.log('🍔 After toggle - Sidebar classes:', sidebar.className);
                        console.log('🍔 After toggle - Overlay classes:', overlay.className);

                        // Check new state
                        const isNowOpen = sidebar.classList.contains('show');
                        console.log('🍔 New state - Sidebar open:', isNowOpen);

                        // Update icon
                        const icon = mobileBtn.querySelector('i');
                        console.log('🍔 Icon element found:', !!icon);
                        console.log('🍔 Current icon classes:', icon ? icon.className : 'N/A');

                        if (isNowOpen) {
                            icon.className = 'fas fa-times';
                            console.log('🍔 ✅ SIDEBAR OPENED - Icon changed to X');
                            console.log('🍔 New icon classes:', icon.className);

                            // Check computed styles
                            const sidebarStyles = getComputedStyle(sidebar);
                            console.log('🍔 Sidebar computed styles:', {
                                transform: sidebarStyles.transform,
                                display: sidebarStyles.display,
                                visibility: sidebarStyles.visibility,
                                opacity: sidebarStyles.opacity,
                                zIndex: sidebarStyles.zIndex
                            });

                            const overlayStyles = getComputedStyle(overlay);
                            console.log('🍔 Overlay computed styles:', {
                                display: overlayStyles.display,
                                visibility: overlayStyles.visibility,
                                opacity: overlayStyles.opacity,
                                zIndex: overlayStyles.zIndex
                            });
                        } else {
                            icon.className = 'fas fa-bars';
                            console.log('🍔 ❌ SIDEBAR CLOSED - Icon changed to hamburger');
                            console.log('🍔 New icon classes:', icon.className);
                        }

                        console.log('🍔 ===== MENU TOGGLE COMPLETED =====');
                    } else {
                        console.error('🍔 ❌ MISSING ELEMENTS FOR MENU TOGGLE');
                        console.error('🍔 Sidebar found:', !!sidebar);
                        console.error('🍔 Overlay found:', !!overlay);
                        console.error('🍔 Mobile button found:', !!mobileBtn);
                    }
                }

                // Handle window resize for responsive behavior
                function handleResize() {
                    console.log('🍔 ===== WINDOW RESIZE EVENT =====');
                    console.log('🍔 Window width:', window.innerWidth);

                    // Handle sidebar resize logic
                    if (window.innerWidth > 1024) {
                        console.log('🍔 Desktop size detected, closing mobile menu...');
                        const sidebar = document.getElementById('sidebar');
                        const overlay = document.getElementById('sidebar-overlay');
                        const mobileBtn = document.getElementById('mobile-menu-btn');

                        console.log('🍔 Elements found for resize:', {
                            sidebar: !!sidebar,
                            overlay: !!overlay,
                            mobileBtn: !!mobileBtn
                        });

                        if (sidebar) {
                            console.log('🍔 Sidebar classes before close:', sidebar.className);
                            sidebar.classList.remove('show');
                            console.log('🍔 Sidebar classes after close:', sidebar.className);
                        }

                        if (overlay) {
                            console.log('🍔 Overlay classes before close:', overlay.className);
                            overlay.classList.remove('show');
                            console.log('🍔 Overlay classes after close:', overlay.className);
                        }

                        if (mobileBtn) {
                            const icon = mobileBtn.querySelector('i');
                            if (icon) {
                                console.log('🍔 Icon classes before reset:', icon.className);
                                icon.className = 'fas fa-bars';
                                console.log('🍔 Icon classes after reset:', icon.className);
                            }
                        }

                        console.log('🍔 ✅ Mobile menu closed due to desktop resize');
                    } else {
                        console.log('🍔 Mobile size detected, menu should be available');
                    }

                    console.log('🍔 ===== WINDOW RESIZE COMPLETE =====');
                }

                document.addEventListener('DOMContentLoaded', function () {
                    console.log('🚀 DOM Content Loaded - Initializing...');
                    console.log('🚀 CACHE BUST: 2025-01-15 - Menu debugging version loaded');

                    // Initialize theme
                    if (typeof initTheme === 'function') initTheme();

                    // Mobile menu functionality
                    console.log('🍔 ===== SETTING UP MENU EVENT LISTENERS =====');
                    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
                    const sidebarOverlay = document.getElementById('sidebar-overlay');

                    console.log('🍔 Looking for menu elements...');
                    console.log('🍔 Mobile menu button found:', !!mobileMenuBtn);
                    console.log('🍔 Sidebar overlay found:', !!sidebarOverlay);

                    if (mobileMenuBtn) {
                        console.log('🍔 Mobile menu button element:', mobileMenuBtn);
                        console.log('🍔 Mobile menu button classes:', mobileMenuBtn.className);
                        console.log('🍔 Mobile menu button styles:', {
                            display: getComputedStyle(mobileMenuBtn).display,
                            visibility: getComputedStyle(mobileMenuBtn).visibility,
                            position: getComputedStyle(mobileMenuBtn).position,
                            zIndex: getComputedStyle(mobileMenuBtn).zIndex,
                            pointerEvents: getComputedStyle(mobileMenuBtn).pointerEvents
                        });

                        // Test if button is clickable
                        console.log('🍔 Testing button clickability...');
                        console.log('🍔 Button offsetParent:', mobileMenuBtn.offsetParent);
                        console.log('🍔 Button getBoundingClientRect:', mobileMenuBtn.getBoundingClientRect());

                        // Add event listener with debugging
                        mobileMenuBtn.addEventListener('click', function (e) {
                            console.log('🍔 EVENT LISTENER TRIGGERED!', e);
                            toggleSidebar();
                        });
                        console.log('🍔 ✅ Menu button event listener attached successfully');

                        // Test direct click simulation
                        setTimeout(() => {
                            console.log('🍔 Testing programmatic click...');
                            // Don't actually click, just test if we can
                            console.log('🍔 Button is ready for testing');
                        }, 1000);
                    } else {
                        console.error('🍔 ❌ Mobile menu button not found!');
                        console.error('🍔 Searching for button with ID "mobile-menu-btn"...');
                        const allButtons = document.querySelectorAll('button');
                        console.error('🍔 All buttons found:', allButtons.length);
                        allButtons.forEach((btn, index) => {
                            console.error(`🍔 Button ${index}:`, {
                                id: btn.id,
                                classes: btn.className,
                                text: btn.textContent.trim()
                            });
                        });
                    }

                    if (sidebarOverlay) {
                        console.log('🍔 Sidebar overlay element:', sidebarOverlay);
                        console.log('🍔 Sidebar overlay classes:', sidebarOverlay.className);
                        sidebarOverlay.addEventListener('click', toggleSidebar);
                        console.log('🍔 ✅ Sidebar overlay event listener attached successfully');
                    } else {
                        console.error('🍔 ❌ Sidebar overlay not found!');
                    }

                    console.log('🍔 ===== MENU EVENT LISTENERS SETUP COMPLETE =====');

                    // Close sidebar when clicking on nav links on mobile
                    const navLinks = document.querySelectorAll('.nav-link');
                    navLinks.forEach(link => {
                        link.addEventListener('click', function () {
                            if (window.innerWidth <= 1024) {
                                toggleSidebar();
                            }
                        });
                    });

                    // Handle window resize
                    window.addEventListener('resize', handleResize);

                    // Listen for theme changes from other pages
                    listenForThemeChanges();

                    // Expand buttons are handled by the global document click listener

                    // Clear any cached data and force immediate file status check on page load
                    setTimeout(() => {
                        console.log('🧹 [PAGE LOAD] Clearing cached data and forcing fresh file status check...');
                        // Clear any local storage cache
                        localStorage.removeItem('file_status_cache');
                        localStorage.removeItem('shipment_data_cache');
                        updateAllViewFilesButtonColors();
                    }, 1000);

                    // Additional file status check after a longer delay to catch any missed files
                    setTimeout(() => {
                        console.log('🔄 [PAGE LOAD] Running secondary file status check...');
                        updateAllViewFilesButtonColors();
                    }, 3000);

                });

                // CSRF functions now defined at top of script section

                // Download file function
                function downloadFile(url) {
                    if (!url || url === '#') {
                        console.error('Invalid download URL');
                        return;
                    }
                    // Open in new tab to trigger download
                    window.open(url, '_blank');
                }

                // Delete file function
                async function deleteFile(filePath, category) {
                    if (!confirm('Are you sure you want to delete this ' + category + ' file? This action cannot be undone.')) {
                        return;
                    }

                    try {
                        const response = await fetch('/delete-inspection-file/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                file_path: filePath,
                                client_name: window.currentFilesClient,
                                inspection_date: window.currentFilesDate
                            })
                        });

                        const result = await response.json();

                        if (result.success) {
                            // Show success message
                            console.log('✅ File deleted successfully:', filePath);

                            // After deletion, fetch updated file list to check remaining count
                            const filesResponse = await fetch('/inspections/files/', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': getCSRFToken()
                                },
                                body: JSON.stringify({
                                    client_name: window.currentFilesClient,
                                    inspection_date: window.currentFilesDate,
                                    _force_refresh: true
                                })
                            });

                            const filesData = await filesResponse.json();
                            const files = filesData.files || {};
                            const groupId = window.currentFilesGroupId;

                            // Helper function to update button to grey (enabled, no files)
                            function setButtonGrey(btn, label, uploadFn) {
                                btn.style.backgroundColor = '#6c757d';
                                btn.style.borderColor = '#6c757d';
                                btn.innerHTML = label;
                                btn.disabled = false;
                                btn.title = 'Upload ' + label;
                                if (uploadFn) btn.onclick = uploadFn;
                                console.log('✅ ' + label + ' button set to GREY (0 files remaining)');
                            }

                            // Check RFI file count - only go grey if count == 0
                            if (category === 'rfi') {
                                const rfiCount = (files.rfi || []).length;
                                console.log('📁 RFI files remaining after delete:', rfiCount);
                                if (rfiCount === 0) {
                                    const rfiBtn = document.getElementById('rfi-btn-' + groupId);
                                    const rfiMobileBtn = document.getElementById('rfi-mobile-' + groupId);
                                    // Get productId from data attribute
                                    const rfiProductId = rfiBtn ? (rfiBtn.getAttribute('data-upload-btn') || '').replace('rfi-', '') : groupId;
                                    if (rfiBtn) setButtonGrey(rfiBtn, 'RFI', function () { uploadRfiForInspection(rfiProductId, groupId); });
                                    if (rfiMobileBtn) {
                                        rfiMobileBtn.style.backgroundColor = '#6c757d';
                                        rfiMobileBtn.style.borderColor = '#6c757d';
                                        rfiMobileBtn.innerHTML = '<i class="fas fa-file-alt mr-1"></i> RFI';
                                        rfiMobileBtn.disabled = false;
                                        rfiMobileBtn.onclick = function () { uploadRfiForInspection(rfiProductId, groupId); };
                                    }
                                }
                            }

                            // Check Invoice file count - only go grey if count == 0
                            if (category === 'invoice') {
                                const invoiceCount = (files.invoice || []).length;
                                console.log('📁 Invoice files remaining after delete:', invoiceCount);
                                if (invoiceCount === 0) {
                                    const invoiceBtn = document.getElementById('invoice-btn-' + groupId);
                                    const invoiceMobileBtn = document.getElementById('invoice-mobile-' + groupId);
                                    // Get productId from data attribute
                                    const invoiceProductId = invoiceBtn ? (invoiceBtn.getAttribute('data-upload-btn') || '').replace('invoice-', '') : groupId;
                                    if (invoiceBtn) setButtonGrey(invoiceBtn, 'Invoice', function () { uploadInvoiceForInspection(invoiceProductId, groupId); });
                                    if (invoiceMobileBtn) {
                                        invoiceMobileBtn.style.backgroundColor = '#6c757d';
                                        invoiceMobileBtn.style.borderColor = '#6c757d';
                                        invoiceMobileBtn.innerHTML = '<i class="fas fa-file-invoice mr-1"></i> Invoice';
                                        invoiceMobileBtn.disabled = false;
                                        invoiceMobileBtn.onclick = function () { uploadInvoiceForInspection(invoiceProductId, groupId); };
                                    }
                                }
                            }

                            // Check Composition file count - only go grey if count == 0
                            if (category === 'composition') {
                                const compCount = (files.composition || []).length;
                                console.log('📁 Composition files remaining after delete:', compCount);
                                if (compCount === 0) {
                                    const allCompBtns = document.querySelectorAll('[data-upload-btn*="composition"]');
                                    allCompBtns.forEach(btn => {
                                        btn.style.background = '#6c757d';
                                        btn.innerHTML = 'Composition';
                                        btn.disabled = false;
                                    });
                                }
                            }

                            // Check Retest file count - only go grey if count == 0
                            if (category === 'retest') {
                                const retestCount = (files.retest || []).length;
                                console.log('📁 Retest files remaining after delete:', retestCount);
                                if (retestCount === 0) {
                                    const allRetestBtns = document.querySelectorAll('[data-upload-btn*="retest"]');
                                    allRetestBtns.forEach(btn => {
                                        btn.style.background = '#6c757d';
                                        btn.innerHTML = 'Retest';
                                        btn.disabled = false;
                                    });
                                }
                            }

                            // Check Lab/COA file count - only go grey if count == 0
                            if (category === 'lab' || category === 'coa') {
                                const labCount = (files.lab || []).length + (files.coa || []).length;
                                console.log('📁 Lab/COA files remaining after delete:', labCount);
                                if (labCount === 0) {
                                    const allLabBtns = document.querySelectorAll('[data-upload-btn*="lab"]');
                                    allLabBtns.forEach(btn => {
                                        btn.style.background = '#6c757d';
                                        btn.innerHTML = 'COA/Lab';
                                        btn.disabled = false;
                                    });
                                }
                            }

                            // Check Occurrence file count - only go grey if count == 0
                            if (category === 'occurrence') {
                                const occCount = (files.occurrence || []).length;
                                console.log('📁 Occurrence files remaining after delete:', occCount);
                                if (occCount === 0) {
                                    const allOccBtns = document.querySelectorAll('[data-upload-btn*="occurrence"]');
                                    allOccBtns.forEach(btn => {
                                        btn.style.background = '#6c757d';
                                        btn.innerHTML = 'Occurrence';
                                        btn.disabled = false;
                                    });
                                }
                            }

                            // Check Other file count - only go grey if count == 0
                            if (category === 'other') {
                                const otherCount = (files.other || []).length;
                                console.log('📁 Other files remaining after delete:', otherCount);
                                if (otherCount === 0) {
                                    const allOtherBtns = document.querySelectorAll('[data-upload-btn*="other"]');
                                    allOtherBtns.forEach(btn => {
                                        btn.style.background = '#6c757d';
                                        btn.innerHTML = 'Other';
                                        btn.disabled = false;
                                    });
                                }
                            }

                            // Check Compliance file count - only go grey if count == 0
                            if (category === 'compliance') {
                                const complianceCount = (files.compliance || []).length;
                                console.log('📁 Compliance files remaining after delete:', complianceCount);
                                if (complianceCount === 0) {
                                    const allComplianceBtns = document.querySelectorAll('[data-upload-btn*="compliance"]');
                                    allComplianceBtns.forEach(btn => {
                                        btn.style.background = '#6c757d';
                                        btn.innerHTML = 'Compliance';
                                        btn.disabled = false;
                                    });
                                }
                            }

                            // Update View Files button colors after deletion
                            updateAllViewFilesButtonColors();

                            // Also update RFI/Invoice button colors after deletion
                            if (window.currentFilesClient) {
                                updateRFIAndInvoiceButtonColorsForClient(window.currentFilesClient);
                            }

                            // Refresh the files display while preserving scroll position
                            if (window.currentFilesClient && window.currentFilesDate) {
                                // Save current scroll positions - both modal and main page
                                const modalBody = document.querySelector('#filesModal .modal-body');
                                const modalScrollTop = modalBody ? modalBody.scrollTop : 0;
                                const pageScrollTop = window.pageYOffset || document.documentElement.scrollTop;

                                openFilesPopup(window.currentFilesGroupId, window.currentFilesClient, window.currentFilesDate);

                                // Restore scroll positions after content loads
                                setTimeout(() => {
                                    // Restore modal scroll
                                    if (modalBody) {
                                        modalBody.scrollTop = modalScrollTop;
                                    }
                                    // Restore main page scroll
                                    window.scrollTo(0, pageScrollTop);
                                }, 100);
                            }
                        } else {
                            console.error('❌ Failed to delete file:', result.error);
                        }

                    } catch (error) {
                        console.error('❌ Error deleting file:', error);
                    }
                }

                // Function to re-enable upload buttons when files are deleted (legacy - main handling is done above)
                function reEnableUploadButtons(filePath, category) {
                    console.log('🔄 reEnableUploadButtons called for:', filePath, 'category:', category);
                    // Button resetting is now handled by immediate deletion handlers above
                    // This function just cleans up localStorage
                    const uploadStatus = JSON.parse(localStorage.getItem('uploadStatus') || '{}');
                    // Remove any entries matching this category
                    Object.keys(uploadStatus).forEach(key => {
                        if (key.toLowerCase().includes(category.toLowerCase())) {
                            delete uploadStatus[key];
                        }
                    });
                    localStorage.setItem('uploadStatus', JSON.stringify(uploadStatus));
                }

                // Client Autocomplete Functionality
                document.addEventListener('DOMContentLoaded', function () {
                    const clientSearchInput = document.getElementById('clientSearchInput');
                    const suggestionsDropdown = document.getElementById('clientSuggestions');
                    let currentSuggestions = [];
                    let selectedIndex = -1;
                    let debounceTimer;

                    if (!clientSearchInput || !suggestionsDropdown) {
                        console.log('Client autocomplete elements not found');
                        return;
                    }

                    // Debounced search function
                    function debounceSearch(query) {
                        clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            if (query.length >= 2) {
                                fetchClientSuggestions(query);
                            } else {
                                hideSuggestions();
                            }
                        }, 300);
                    }

                    // Fetch suggestions from API
                    async function fetchClientSuggestions(query) {
                        try {
                            const response = await fetch('/api/clients/autocomplete/?q=' + encodeURIComponent(query));
                            if (response.ok) {
                                const data = await response.json();
                                currentSuggestions = data.suggestions || [];
                                displaySuggestions(currentSuggestions);
                            } else {
                                hideSuggestions();
                            }
                        } catch (error) {
                            console.error('Error fetching client suggestions:', error);
                            hideSuggestions();
                        }
                    }

                    // Display suggestions in dropdown
                    function displaySuggestions(suggestions) {
                        if (suggestions.length === 0) {
                            hideSuggestions();
                            return;
                        }

                        suggestionsDropdown.innerHTML = '';
                        suggestions.forEach((suggestion, index) => {
                            const item = document.createElement('div');
                            item.className = 'autocomplete-item';
                            item.setAttribute('data-index', index);

                            // Simple client name only
                            item.textContent = suggestion.name;

                            // Click handler
                            item.addEventListener('click', () => {
                                selectSuggestion(suggestion);
                            });

                            // Hover handler
                            item.addEventListener('mouseenter', () => {
                                selectedIndex = index;
                                updateHighlight();
                            });

                            suggestionsDropdown.appendChild(item);
                        });

                        // Position the dropdown using absolute positioning relative to input
                        const inputRect = clientSearchInput.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const spaceBelow = viewportHeight - inputRect.bottom;
                        const spaceAbove = inputRect.top;

                        // Check if there's a table below that we would overlay
                        const tableElement = document.querySelector('#shipmentsTable, .table-responsive');
                        let tableTop = null;
                        if (tableElement) {
                            const tableRect = tableElement.getBoundingClientRect();
                            tableTop = tableRect.top;
                        }

                        suggestionsDropdown.style.display = 'block';
                        suggestionsDropdown.style.position = 'absolute';
                        suggestionsDropdown.style.left = '0px';
                        suggestionsDropdown.style.right = '0px';
                        suggestionsDropdown.style.width = 'auto';

                        // Calculate available space without overlaying table
                        let availableSpaceBelow = spaceBelow - 10;
                        if (tableTop && tableTop > inputRect.bottom) {
                            availableSpaceBelow = Math.min(availableSpaceBelow, tableTop - inputRect.bottom - 20);
                        }

                        let maxHeight = Math.min(300, availableSpaceBelow);

                        // If dropdown would be too small below or would overlay table, position above
                        if (maxHeight < 120 || (tableTop && inputRect.bottom + 200 > tableTop)) {
                            // Position above the input
                            const heightAbove = Math.min(250, spaceAbove - 20);
                            suggestionsDropdown.style.bottom = '100%';
                            suggestionsDropdown.style.top = 'auto';
                            suggestionsDropdown.style.borderRadius = 'var(--radius) var(--radius) 0 0';
                            suggestionsDropdown.style.borderTop = '1px solid var(--border)';
                            suggestionsDropdown.style.borderBottom = 'none';
                            maxHeight = heightAbove;
                        } else {
                            // Position below the input
                            suggestionsDropdown.style.top = '100%';
                            suggestionsDropdown.style.bottom = 'auto';
                            suggestionsDropdown.style.borderRadius = '0 0 var(--radius) var(--radius)';
                            suggestionsDropdown.style.borderTop = 'none';
                            suggestionsDropdown.style.borderBottom = '1px solid var(--border)';
                        }

                        suggestionsDropdown.style.maxHeight = maxHeight + 'px';
                        suggestionsDropdown.style.minHeight = Math.min(100, maxHeight) + 'px';

                        selectedIndex = -1;
                    }

                    // Hide suggestions dropdown
                    function hideSuggestions() {
                        suggestionsDropdown.style.display = 'none';
                        currentSuggestions = [];
                        selectedIndex = -1;
                    }

                    // Select a suggestion
                    function selectSuggestion(suggestion) {
                        clientSearchInput.value = suggestion.name;
                        hideSuggestions();
                        // Optionally trigger form submission or search
                        // clientSearchInput.form.submit();
                    }

                    // Update highlight for keyboard navigation
                    function updateHighlight() {
                        const items = suggestionsDropdown.querySelectorAll('.autocomplete-item');
                        items.forEach((item, index) => {
                            if (index === selectedIndex) {
                                item.style.backgroundColor = 'var(--primary-light)';
                            } else {
                                item.style.backgroundColor = '';
                            }
                        });
                    }

                    // Event listeners
                    clientSearchInput.addEventListener('input', (e) => {
                        const query = e.target.value.trim();
                        debounceSearch(query);
                    });

                    clientSearchInput.addEventListener('keydown', (e) => {
                        if (suggestionsDropdown.style.display === 'none') return;

                        switch (e.key) {
                            case 'ArrowDown':
                                e.preventDefault();
                                selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
                                updateHighlight();
                                break;
                            case 'ArrowUp':
                                e.preventDefault();
                                selectedIndex = Math.max(selectedIndex - 1, -1);
                                updateHighlight();
                                break;
                            case 'Enter':
                                e.preventDefault();
                                if (selectedIndex >= 0 && currentSuggestions[selectedIndex]) {
                                    selectSuggestion(currentSuggestions[selectedIndex]);
                                }
                                break;
                            case 'Escape':
                                hideSuggestions();
                                break;
                        }
                    });

                    // Hide suggestions when clicking outside
                    document.addEventListener('click', (e) => {
                        if (!clientSearchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
                            hideSuggestions();
                        }
                    });

                    // Hide suggestions when input loses focus (with delay to allow clicks)
                    clientSearchInput.addEventListener('blur', () => {
                        setTimeout(() => {
                            hideSuggestions();
                        }, 150);
                    });

                    // Reposition dropdown on window resize
                    window.addEventListener('resize', () => {
                        if (suggestionsDropdown.style.display === 'block' && currentSuggestions.length > 0) {
                            displaySuggestions(currentSuggestions);
                        }
                    });

                    // Hide dropdown on scroll for better UX
                    window.addEventListener('scroll', () => {
                        if (suggestionsDropdown.style.display === 'block') {
                            hideSuggestions();
                        }
                    });
                });

                // Show loading indicator for large datasets and check OneDrive status after page is fully loaded
                document.addEventListener('DOMContentLoaded', function () {
                    const totalRecords = parseInt(window.DJANGO_CONFIG.totalShipments) || 0;
                    if (totalRecords > 1000) {
                        const loadingOverlay = document.getElementById('loadingOverlay');
                        loadingOverlay.style.display = 'flex';

                        // Hide loading overlay after page is fully loaded
                        window.addEventListener('load', function () {
                            setTimeout(function () {
                                loadingOverlay.style.display = 'none';
                                // Re-enable pagination after overlay is hidden
                                enablePagination();
                            }, 1000); // Reduced delay to prevent pagination blocking
                        });
                    } else {
                        // For smaller datasets, enable pagination immediately
                        enablePagination();
                    }

                    // Check OneDrive processing status for background service

                });

                // Function to enable pagination functionality
                function enablePagination() {
                    // Ensure pagination links are clickable
                    const paginationLinks = document.querySelectorAll('.pagination a');
                    paginationLinks.forEach(link => {
                        link.style.pointerEvents = 'auto';
                        link.style.opacity = '1';

                        // Add click handler to ensure navigation works
                        link.addEventListener('click', function (e) {
                            // Allow default navigation behavior
                            console.log('Pagination link clicked:', this.href);
                        });
                    });

                    // Remove any blocking overlays
                    const blockingOverlays = document.querySelectorAll('.loading-overlay, .status-check-overlay');
                    blockingOverlays.forEach(overlay => {
                        if (overlay.id !== 'loadingOverlay') {
                            overlay.style.display = 'none';
                        }
                    });

                    console.log('Pagination enabled for', paginationLinks.length, 'links');

                    // Also handle page navigation
                    handlePageNavigation();
                }

                // Function to handle page navigation
                function handlePageNavigation() {
                    // Ensure all pagination links work properly
                    const paginationLinks = document.querySelectorAll('.pagination a');
                    paginationLinks.forEach(link => {
                        // Remove any existing event listeners to avoid duplicates
                        link.removeEventListener('click', handlePaginationClick);
                        // Add new event listener
                        link.addEventListener('click', handlePaginationClick);
                    });
                };

                // Handle pagination click
                function handlePaginationClick(e) {
                    console.log('Pagination clicked:', this.href);
                    // Allow default navigation - don't prevent default
                    // The page will reload with the new page number
                }
                // Function to check compliance documents in batch with completion tracking
                async function checkComplianceDocumentsBatch(inspections, overlay, messageElement) {
                    try {
                        console.log('🔄 OneDrive overlay: Starting batch compliance check...');

                        // Start the batch processing
                        const response = await fetch('/check-compliance-documents-batch/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                inspections: inspections
                            })
                        });

                        const result = await response.json();
                        console.log('🔄 OneDrive overlay: Batch compliance check completed:', result.success);

                        if (result.success) {
                            // Update the UI with compliance status
                            updateComplianceStatus(result.results);
                            console.log('🔄 OneDrive overlay: UI updated with compliance status');

                            // Now wait for OneDrive processing to complete
                            await waitForOneDriveCompletion(overlay, messageElement);
                        } else {
                            console.log('❌ OneDrive overlay: Batch compliance check failed:', result.error);
                            // Show error message
                            messageElement.textContent = '❌ Error processing files. Please try again.';

                            // Hide overlay after error
                            setTimeout(function () {
                                overlay.style.display = 'none';
                                console.log('❌ OneDrive overlay: Hidden due to batch check error');
                            }, 3000);
                        }
                    } catch (error) {
                        console.log('❌ OneDrive overlay: Batch compliance check network error:', error);

                        // Show error message
                        messageElement.textContent = '❌ Network error. Please try again.';

                        // Hide overlay after error
                        setTimeout(function () {
                            overlay.style.display = 'none';
                            console.log('❌ OneDrive overlay: Hidden due to network error');
                        }, 3000);
                    }
                }

                // Function to wait for OneDrive processing to complete
                async function waitForOneDriveCompletion(overlay, messageElement) {
                    let attempts = 0;
                    const maxAttempts = 60; // Wait up to 5 minutes (60 * 5 seconds)

                    console.log('🔄 OneDrive overlay: Starting OneDrive completion polling...');

                    while (attempts < maxAttempts) {
                        try {
                            console.log('🔄 OneDrive overlay: Polling attempt ' + attempts + 1 + '/' + maxAttempts);

                            const response = await fetch('/check-onedrive-status/', {
                                method: 'GET',
                                headers: {
                                    'X-CSRFToken': getCSRFToken()
                                }
                            });

                            const status = await response.json();
                            console.log('🔄 OneDrive overlay: Status response:', status);

                            if (status.success) {
                                // Check if OneDrive is still processing
                                if (status.is_processing) {
                                    messageElement.textContent = '🔄 Processing OneDrive files... (' + attempts + 1 + '/' + maxAttempts + ')';
                                    console.log('🔄 OneDrive overlay: Still processing... (' + attempts + 1 + '/' + maxAttempts + ');');
                                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                                    attempts++;
                                    continue;
                                } else {
                                    // OneDrive processing is complete
                                    console.log('✅ OneDrive overlay: Processing complete!');
                                    messageElement.textContent = '✅ All files processed successfully!';

                                    // Hide overlay after showing completion
                                    setTimeout(function () {
                                        overlay.style.display = 'none';
                                        console.log('✅ OneDrive overlay: Hidden after successful completion');
                                    }, 2000);
                                    return;
                                }
                            } else {
                                // Error checking status, assume completion
                                console.log('[WARNING] OneDrive overlay: Status check failed, assuming completion');
                                messageElement.textContent = '✅ Files processed successfully!';
                                setTimeout(function () {
                                    overlay.style.display = 'none';
                                    console.log('✅ OneDrive overlay: Hidden after status check failure');
                                }, 2000);
                                return;
                            }
                        } catch (error) {
                            console.log('❌ OneDrive overlay: Error checking OneDrive status:', error);
                            attempts++;
                            await new Promise(resolve => setTimeout(resolve, 5000));
                        }
                    }

                    // If we reach max attempts, assume completion
                    console.log('[TIMER] OneDrive overlay: Reached max attempts, assuming completion');
                    messageElement.textContent = '✅ Files processed successfully!';
                    setTimeout(function () {
                        overlay.style.display = 'none';
                        console.log('✅ OneDrive overlay: Hidden after max attempts reached');
                    }, 2000);
                }

                // Function to update compliance status in the UI
                function updateComplianceStatus(results) {
                    Object.keys(results).forEach(key => {
                        const [clientName, inspectionDate] = key.split('_', 2);
                        const hasCompliance = results[key];

                        // Find the corresponding row and update the button
                        const row = document.querySelector('[data-client-name="' + clientName + '"][data-inspection-date="' + inspectionDate + '"]');
                        if (row) {
                            const viewFilesBtn = row.querySelector('.btn-view-files');
                            if (viewFilesBtn) {
                                if (hasCompliance) {
                                    viewFilesBtn.classList.remove('btn-view-files-red');
                                    viewFilesBtn.classList.add('btn-view-files-blue');
                                }
                            }
                        }
                    });
                };

                // Function to initialize disabled rows for already sent items
                function initializeDisabledRows() {
                    console.log('[DEBUG] Initializing sent rows...');

                    // Find all rows with sent timestamps
                    const sentRows = document.querySelectorAll('.shipment-row[data-sent-timestamp]');
                    console.log('[DEBUG] Found', sentRows.length, 'rows with sent timestamps');

                    sentRows.forEach((row, index) => {
                        console.log(`[DEBUG] Processing sent row ${index + 1}:`, row);

                        const groupId = row.getAttribute('data-group-id');
                        const sentTimestamp = row.getAttribute('data-sent-timestamp');

                        // Store timestamp in localStorage for persistence
                        if (groupId && sentTimestamp) {
                            localStorage.setItem('sent_timestamp_' + groupId, sentTimestamp);
                            console.log(`[STORAGE] Stored sent timestamp for group ${groupId}:`, sentTimestamp);

                            // Check if 15 minutes have already passed
                            const sentDate = new Date(sentTimestamp);
                            const fifteenMinutesLater = new Date(sentDate.getTime() + (15 * 60 * 1000));
                            const now = new Date();
                            const remainingTime = fifteenMinutesLater.getTime() - now.getTime();

                            if (remainingTime <= 0) {
                                // 15 minutes have passed, disable the row (no countdown display, no green background)
                                console.log(`[LOCK] 15 minutes already passed for group ${groupId}, disabling row`);
                                disableRowAfterTimer(row, groupId);
                            } else {
                                // 15 minutes haven't passed yet, start countdown timer (no green background)
                                console.log(`[TIMER] 15 minutes not yet passed for group ${groupId}, starting countdown timer`);
                                startFifteenMinuteTimer(row, groupId, sentTimestamp);
                            }
                        } else {
                            // No timestamp available, keep as disabled (fallback)
                            console.log(`[WARNING] No timestamp available for group ${groupId}, keeping disabled`);
                            row.setAttribute('data-was-sent', 'true');
                        }
                    });

                    console.log('✅ Sent rows initialization complete');
                }


                // Initialize page on load
                document.addEventListener('DOMContentLoaded', function () {
                    loadUploadStatus();

                    // RFI status is now handled by file-based checking in the backend
                    // No need to call loadRFIStatus since template uses shipment.rfi_uploaded

                    // Load sent status immediately and then with delays
                    console.log('🚀 [SENT STATUS] Calling loadSentStatus immediately');
                    console.log('🚀 [SENT STATUS] ===========================================');
                    loadSentStatus();

                    // DISABLED: Row locking removed - users can always change sent status
                    // initializeDisabledRows();
                    // initializeFifteenMinuteTimers();
                    console.log('✅ Sent status loaded - no row locking enabled');

                    // Load sent status with a longer delay to ensure DOM is fully rendered and all other functions have run
                    setTimeout(() => {
                        console.log('🚀 [SENT STATUS] Calling loadSentStatus after 2s delay');
                        loadSentStatus();
                    }, 2000);

                    initializeButtonStates();

                    // Check for uploaded files that might not be in localStorage
                    // This catches cases where files exist but localStorage was cleared
                    setTimeout(() => {
                        checkAllUploadedFiles();
                    }, 2000); // Delay to let other checks complete

                    // Final check to ensure sent status styling is preserved after all other functions
                    setTimeout(() => {
                        console.log('[DEBUG] [SENT STATUS] Final check to preserve sent status styling');
                        loadSentStatus();
                    }, 3000);
                });

                // Also run when window is fully loaded
                window.addEventListener('load', function () {
                    console.log('🚀 [SENT STATUS] Window loaded, calling loadSentStatus');
                    setTimeout(() => {
                        loadSentStatus();
                    }, 1000);

                    // Set up a periodic check to ensure sent status styling is maintained
                    setInterval(() => {
                        const sentRows = document.querySelectorAll('tr[data-sent-status="yes"]');
                        sentRows.forEach(row => {
                            // Always ensure span colors are white for facility name
                            row.querySelectorAll('td span').forEach(span => {
                                span.classList.remove('text-primary', 'hover:text-primary-dark');
                                span.style.setProperty('color', 'white', 'important');
                            });

                            if (!row.classList.contains('inspection-complete') ||
                                row.style.backgroundColor !== 'rgb(34, 197, 94)') {
                                console.log('[DEBUG] [SENT STATUS] Re-applying styling to row:', row.getAttribute('data-group-id'));
                                row.classList.add('inspection-complete');
                                row.style.setProperty('background-color', '#22c55e', 'important');
                                row.style.setProperty('color', 'white', 'important');
                                row.style.setProperty('border-color', '#16a34a', 'important');

                                const tds = row.querySelectorAll('td');
                                tds.forEach(td => {
                                    td.style.setProperty('background-color', '#22c55e', 'important');
                                    td.style.setProperty('color', 'white', 'important');
                                    td.style.setProperty('border-color', '#16a34a', 'important');
                                });
                            }
                        });
                    }, 5000); // Check every 5 seconds

                    // Automatically check file status for all clients on page load
                    // Add a delay to ensure all buttons are fully rendered and prevent conflicts
                    console.log('🚀 [FRONTEND] Page loaded, starting automatic file status check...');
                    setTimeout(() => {
                        console.log('🔄 [FRONTEND] Starting delayed automatic file status check...');
                        checkAllClientFileStatus();
                    }, 1500); // Increased to 1500ms delay to ensure buttons are rendered

                    // Also enable pagination if needed
                    setTimeout(() => {
                        const paginationLinks = document.querySelectorAll('.pagination a');
                        if (paginationLinks.length > 0) {
                            enablePagination();
                        }
                    }, 100);
                });

                // Files popup management
                function openFilesPopup(groupId, clientName, inspectionDate) {
                    const modal = document.getElementById('filesModal');
                    const modalTitle = document.getElementById('modalTitle');
                    const filesLoading = document.getElementById('filesLoading');
                    const filesContent = document.getElementById('filesContent');
                    const downloadBtn = document.getElementById('downloadAllBtn');

                    // Store current client and date for download functionality
                    window.currentFilesClient = clientName;
                    window.currentFilesDate = inspectionDate;
                    window.currentFilesGroupId = groupId;

                    // Set title and show modal - shows files for specific inspection date
                    modalTitle.textContent = 'Files for ' + clientName + ' - ' + inspectionDate;
                    modal.style.display = 'block';

                    // Show download button
                    downloadBtn.style.display = 'flex';

                    // Show loading state
                    filesLoading.style.display = 'block';
                    filesContent.style.display = 'none';

                    console.log('🔄 File overlay: View Files clicked - Starting files fetch for', clientName, 'on', inspectionDate);

                    // Load files for this specific inspection date only
                    window.loadInspectionFiles(groupId, clientName, inspectionDate);
                }

                function closeFilesPopup() {
                    const modal = document.getElementById('filesModal');
                    modal.style.display = 'none';

                    // Hide download button
                    const downloadBtn = document.getElementById('downloadAllBtn');
                    downloadBtn.style.display = 'none';
                }

                // Download all files for current inspection group as ZIP folder
                async function downloadAllFiles() {
                    const downloadBtn = document.getElementById('downloadAllBtn');
                    const clientName = window.currentFilesClient;
                    const inspectionDate = window.currentFilesDate;
                    const groupId = window.currentFilesGroupId;

                    if (!clientName || !inspectionDate) {
                        alert('Error: Missing client or inspection date information');
                        return;
                    }

                    // Show loading state
                    const originalText = downloadBtn.innerHTML;
                    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
                    downloadBtn.disabled = true;

                    try {
                        console.log('🗂️ Starting download of all files for ' + clientName + ' on ' + inspectionDate);

                        const response = await fetch('/inspections/download-all-files/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                client_name: clientName,
                                inspection_date: inspectionDate,
                                group_id: groupId
                            })
                        });

                        if (response.ok) {
                            const blob = await response.blob();
                            const contentDisposition = response.headers.get('Content-Disposition');

                            let filename = clientName + '_' + inspectionDate + '_files.zip';
                            if (contentDisposition) {
                                const match = contentDisposition.match(/filename[^;=\n]*=([^;\n]*)/);
                                if (match && match[1]) {
                                    filename = match[1].replace(/["']/g, '');
                                }
                            }

                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);

                            console.log('✅ Download completed: ' + filename);
                        } else {
                            const errorData = await response.json();
                            alert('Download failed: ' + (errorData.error || 'Unknown error'));
                        }

                    } catch (error) {
                        console.error('❌ Download error:', error);
                        alert('Download failed: ' + error.message);
                    } finally {
                        // Reset button state
                        downloadBtn.innerHTML = originalText;
                        downloadBtn.disabled = false;
                    }
                }

                // Close modal when clicking outside
                window.onclick = function (event) {
                    const modal = document.getElementById('filesModal');
                    if (event.target === modal) {
                        closeFilesPopup();
                    }
                };

                window.loadInspectionFiles = async function loadInspectionFiles(groupId, clientName, inspectionDate) {
                    try {
                        console.log('🔄 File fetch: Starting file fetch request...');
                        console.log('[DEBUG] DEBUG: Group ID:', groupId);
                        console.log('[DEBUG] DEBUG: Client Name:', clientName);
                        console.log('[DEBUG] DEBUG: Inspection Date:', inspectionDate);

                        const requestData = {
                            group_id: groupId,
                            client_name: clientName,
                            inspection_date: inspectionDate,
                            _force_refresh: true
                        };
                        console.log('DEBUG: Request data being sent:', JSON.stringify(requestData, null, 2));

                        const response = await fetch('/inspections/files/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify(requestData)
                        });

                        console.log('[DEBUG] DEBUG: Response status:', response.status);
                        console.log('DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));

                        const result = await response.json();
                        console.log('🔄 File fetch: File fetch completed:', result.success);
                        console.log('DEBUG: Full server response:', JSON.stringify(result, null, 2));

                        const filesLoading = document.getElementById('filesLoading');
                        const filesContent = document.getElementById('filesContent');
                        const filesList = document.getElementById('filesList');

                        filesLoading.style.display = 'none';
                        filesContent.style.display = 'block';

                        if (result.success) {
                            try {
                                console.log('🔄 File fetch: Success - processing files...');
                                console.log('[DEBUG] Files object keys:', Object.keys(result.files || {}));

                                // Check if files exist - verify at least one category has files
                                const hasFiles = result.files && Object.values(result.files).some(fileList =>
                                    Array.isArray(fileList) && fileList.length > 0
                                );
                                console.log('[DEBUG] Has files:', hasFiles);

                                if (hasFiles) {
                                    console.log('📁 Files found - calling displayFiles...');
                                    displayFiles(result.files, result.message);
                                    console.log('📁 displayFiles completed');
                                } else {
                                    console.log('📁 No files found - showing empty message');
                                    filesList.innerHTML = '<div class="no-files-message">No files found for this inspection.</div>';
                                }
                            } catch (displayError) {
                                console.error('❌ ERROR in file display:', displayError);
                                console.error('❌ Error stack:', displayError.stack);
                                filesList.innerHTML = '<div class="error-message" style="color: red; padding: 20px;">Error displaying files: ' + displayError.message + '</div>';
                            }
                        } else {
                            console.error('❌ File fetch failed:', result.error);
                            console.log('[DEBUG] DEBUG: Error details:', {
                                success: result.success,
                                error: result.error,
                                fullResult: result
                            });
                            filesList.innerHTML = '<div class="error-message">Error loading files: ' + (result.error || 'Unknown error') + '</div>';
                        }

                    } catch (error) {
                        const filesLoading = document.getElementById('filesLoading');
                        const filesContent = document.getElementById('filesContent');
                        const filesList = document.getElementById('filesList');

                        console.log('❌ File fetch: File fetch error:', error);

                        filesLoading.style.display = 'none';
                        filesContent.style.display = 'block';
                        filesList.innerHTML = '<div class="empty-category">Network error: ' + error.message + '</div>';
                    }
                }

                function getCurrentPageClientNames() {
                    // Get all client names from the current page's shipment rows
                    const clientNames = [];
                    const shipmentRows = document.querySelectorAll('.shipment-row[data-client-name]');

                    shipmentRows.forEach(row => {
                        const clientName = row.getAttribute('data-client-name');
                        if (clientName && !clientNames.includes(clientName)) {
                            clientNames.push(clientName);
                        }
                    });

                    console.log('📄 Found ' + clientNames.length + ' unique clients on current page');
                    return clientNames;
                }

                function getCurrentPageClientData() {
                    // Get client names and their inspection dates from the current page
                    const clientData = {};
                    const groupRows = document.querySelectorAll('tr.group-row[data-client-name]');

                    groupRows.forEach(row => {
                        const clientName = row.getAttribute('data-client-name');
                        const inspectionDate = row.getAttribute('data-inspection-date');
                        if (clientName && inspectionDate) {
                            clientData[clientName] = inspectionDate;
                        }
                    });

                    console.log('📄 Found ' + Object.keys(clientData).length + ' clients with inspection dates on current page');
                    return clientData;
                }

                // Flag to prevent duplicate status checks
                if (typeof statusCheckInProgress === 'undefined') {
                    var statusCheckInProgress = false;
                }

                async function checkAllClientFileStatus() {
                    // Check file status for all clients on current page and update button colors
                    if (statusCheckInProgress) {
                        console.log('[WARNING] [FRONTEND] Status check already in progress, skipping...');
                        return;
                    }

                    statusCheckInProgress = true;

                    try {
                        const clientData = getCurrentPageClientData();
                        const clientNames = Object.keys(clientData);

                        if (clientNames.length === 0) {
                            console.log('📄 No clients found on current page');
                            return;
                        }

                        console.log('🔄 [FRONTEND] Checking file status for all clients on current page...');
                        console.log('📋 [FRONTEND] Client names:', clientNames);
                        console.log('📅 [FRONTEND] Inspection dates:', clientData);

                        // Debug: Check if New Poultry Retailer is in the list
                        if (clientNames.includes('New Poultry Retailer')) {
                            console.log('[DEBUG] [DEBUG] Found New Poultry Retailer in client list');
                            console.log('[DEBUG] [DEBUG] Inspection date for New Poultry Retailer:', clientData['New Poultry Retailer']);
                        } else {
                            console.log('❌ [DEBUG] New Poultry Retailer NOT found in client list');
                            console.log('[DEBUG] [DEBUG] Available client names:', clientNames);
                        }

                        // Debug: Check if buttons are available
                        const testButtons = document.querySelectorAll('button.btn-view-files, button[class*="btn-view-files"]');
                        const allButtons = document.querySelectorAll('button');
                        console.log('[DEBUG] [FRONTEND] Found ' + testButtons.length + ' View Files buttons on page (' + allButtons.length + ' total buttons)');

                        // If no buttons found, wait a bit more
                        if (testButtons.length === 0) {
                            console.log('[WARNING] [FRONTEND] No buttons found, waiting 500ms more...');
                            statusCheckInProgress = false; // Reset flag for retry
                            setTimeout(() => {
                                console.log('🔄 [FRONTEND] Retrying status check after button wait...');
                                checkAllClientFileStatus();
                            }, 500);
                            return;
                        }

                        // Show loading indicator
                        showStatusCheckProgress();

                        const response = await fetch('/page-clients-status/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                client_names: clientNames,
                                inspection_dates: clientData
                            })
                        });

                        const result = await response.json();

                        if (result.success) {
                            console.log('✅ File status check completed for all clients');
                            console.log('📊 Client statuses received:', result.client_statuses);

                            // Debug: Check specific client status
                            if (result.client_statuses['New Poultry Retailer']) {
                                console.log('[DEBUG] [DEBUG] New Poultry Retailer status:', result.client_statuses['New Poultry Retailer']);
                            } else {
                                console.log('❌ [DEBUG] New Poultry Retailer NOT found in response');
                                console.log('DEBUG: Available clients in response:', Object.keys(result.client_statuses));
                            }

                            // Update all button colors
                            const clientStatuses = result.client_statuses;
                            for (const [clientName, status] of Object.entries(clientStatuses)) {
                                console.log('🔄 Processing client: ' + clientName + ' with status: ' + status.file_status);
                                updateViewFilesButtonColor(clientName, status.file_status);
                            }

                            // Hide loading indicator
                            hideStatusCheckProgress();

                            console.log('🎨 Updated button colors for ' + Object.keys(clientStatuses).length + ' clients');
                        } else {
                            console.error('❌ Error checking file status:', result.error);
                            hideStatusCheckProgress();
                        }

                    } catch (error) {
                        console.error('❌ Error checking file status:', error);
                        hideStatusCheckProgress();
                    } finally {
                        statusCheckInProgress = false;
                    }
                }

                function showStatusCheckProgress() {
                    // Show a subtle progress indicator
                    const progressDiv = document.createElement('div');
                    progressDiv.id = 'statusCheckProgress';
                    progressDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 0.5rem 1rem; border-radius: 4px; z-index: 9999; font-size: 0.875rem;';
                    progressDiv.innerHTML = '<i class="fas fa-sync fa-spin"></i> Checking file status...';
                    document.body.appendChild(progressDiv);
                }

                function hideStatusCheckProgress() {
                    // Hide the progress indicator
                    const progressDiv = document.getElementById('statusCheckProgress');
                    if (progressDiv) {
                        progressDiv.remove();
                    }
                }
                async function loadClientAllFilesOptimized(clientName, currentPageClients) {
                    try {
                        console.log('🔄 Client files: Starting OPTIMIZED files fetch for client:', clientName);
                        console.log('📄 Using current page clients for optimization:', currentPageClients.length);

                        const response = await fetch('/page-clients-files/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                target_client: clientName,
                                client_names: currentPageClients
                            })
                        });

                        const result = await response.json();
                        console.log('🔄 Client files: OPTIMIZED files fetch completed:', result.success);

                        const filesLoading = document.getElementById('filesLoading');
                        const filesContent = document.getElementById('filesContent');
                        const filesList = document.getElementById('filesList');

                        filesLoading.style.display = 'none';
                        filesContent.style.display = 'block';

                        if (result.success) {
                            // Update button color based on file status
                            updateViewFilesButtonColor(clientName, result.file_status);

                            // Add optimization info to the display
                            const optimizationInfo = result.optimized ?
                                ' (Optimized: checked ' + result.clients_checked + ' clients from current page)' : ';';

                            displayClientAllFiles(
                                result.files,
                                result.categories,
                                result.total_files,
                                result.inspections_found,
                                result.message + optimizationInfo,
                                result.file_status
                            );
                        } else {
                            filesList.innerHTML = '<div class="empty-category">Error loading client files: ' + result.error + '</div>';
                        }

                    } catch (error) {
                        console.error('Error loading client files:', error);
                        const filesLoading = document.getElementById('filesLoading');
                        const filesContent = document.getElementById('filesContent');
                        const filesList = document.getElementById('filesList');

                        filesLoading.style.display = 'none';
                        filesContent.style.display = 'block';
                        filesList.innerHTML = '<div class="empty-category">Error loading client files: ' + error.message + '</div>';
                    }
                }

                async function loadClientAllFiles(clientName) {
                    try {
                        console.log('🔄 Client files: Starting ALL files fetch for client:', clientName);

                        const response = await fetch('/client-all-files/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                client_name: clientName
                            })
                        });

                        const result = await response.json();
                        console.log('🔄 Client files: ALL files fetch completed:', result.success);

                        const filesLoading = document.getElementById('filesLoading');
                        const filesContent = document.getElementById('filesContent');
                        const filesList = document.getElementById('filesList');

                        filesLoading.style.display = 'none';
                        filesContent.style.display = 'block';

                        if (result.success) {
                            displayClientAllFiles(result.files, result.categories, result.total_files, result.inspections_found, result.message);
                        } else {
                            filesList.innerHTML = '<div class="empty-category">Error loading client files: ' + result.error + '</div>';
                        }

                    } catch (error) {
                        console.error('Error loading client files:', error);
                        const filesLoading = document.getElementById('filesLoading');
                        const filesContent = document.getElementById('filesContent');
                        const filesList = document.getElementById('filesList');

                        filesLoading.style.display = 'none';
                        filesContent.style.display = 'block';
                        filesList.innerHTML = '<div class="empty-category">Error loading client files: ' + error.message + '</div>';
                    }
                }

                function updateViewFilesButtonColor(clientName, fileStatus) {
                    console.log('🎨 Updating button color for client: "' + clientName + '"');
                    console.log('   File status: ' + fileStatus);

                    // Find all View Files buttons for this client using multiple methods
                    let buttons = [];

                    // Method 1: Look for buttons with client name in onclick attribute
                    const buttonsByOnclick = document.querySelectorAll('button[onclick*="' + clientName + '"]');
                    buttonsByOnclick.forEach(btn => {
                        if (btn.textContent.includes('View Files') || btn.textContent.includes('Files')) {
                            buttons.push(btn);
                        }
                    });

                    // Method 2: Look for buttons in rows with matching client name
                    const groupRows = document.querySelectorAll('tr.group-row[data-client-name="' + clientName + '"]');
                    groupRows.forEach(row => {
                        const viewFilesBtn = row.querySelector('button[class*="btn-view-files"]');
                        if (viewFilesBtn && !buttons.includes(viewFilesBtn)) {
                            buttons.push(viewFilesBtn);
                        }
                    });

                    // Method 3: Look for buttons with client name in quotes in onclick
                    const buttonsWithQuotes = document.querySelectorAll('button[onclick*="\'' + clientName + '\'"]');
                    buttonsWithQuotes.forEach(btn => {
                        if ((btn.textContent.includes('View Files') || btn.textContent.includes('Files')) && !buttons.includes(btn)) {
                            buttons.push(btn);
                        }
                    });

                    console.log('   Found ' + buttons.length + ' View Files buttons for "' + clientName + '"');

                    buttons.forEach((button, index) => {
                        if (button.textContent.includes('View Files') || button.textContent.includes('Files')) {
                            console.log('   Button ' + (index + 1) + ': "' + button.textContent.trim() + '"');
                            // COMPLETE REDESIGN: Clear all existing classes and styles
                            button.className = 'files-button-custom';

                            // Clear any conflicting inline styles completely
                            button.removeAttribute('style');

                            // Icons removed - buttons now show only text

                            // Add appropriate color class and icon based on status
                            switch (fileStatus) {
                                case 'all_files':
                                    button.classList.add('status-green');
                                    button.title = 'All files available (RFI, Invoice, Lab Results, Compliance)';
                                    console.log('   ✅ Applied GREEN color to button');
                                    break;
                                case 'compliance_only':
                                    button.classList.add('status-orange');
                                    button.title = 'Only compliance documents available';
                                    console.log('   🟠 Applied ORANGE color to button');
                                    break;
                                case 'no_files':
                                    button.classList.add('status-red');
                                    button.title = 'No files found';
                                    console.log('   🔴 Applied RED color to button');
                                    break;
                                case 'partial_files':
                                    button.classList.add('status-orange');
                                    button.title = 'Some files available';
                                    console.log('   🟠 Applied ORANGE color to button');
                                    break;
                                default:
                                    button.classList.add('status-red');
                                    button.title = 'View Files';
                            }
                        }
                    });

                    // Also update RFI and Invoice button colors based on actual file existence
                    // Skip NEW inspections - they should not have any file buttons colored
                    if (!clientName.toUpperCase().includes('NEW')) {
                        updateRFIAndInvoiceButtonColorsForClient(clientName);
                    }
                }

                function updateRFIAndInvoiceButtonColorsForClient(clientName) {
                    console.log('[DEBUG] [BUTTON COLOR] Updating RFI/Invoice button colors for all rows of client:', clientName);

                    // Find all group rows for this client
                    const groupRows = document.querySelectorAll('tr.group-row[data-client-name="' + clientName + '"]');
                    console.log('[DEBUG] [BUTTON COLOR] Found', groupRows.length, 'rows for client:', clientName);

                    groupRows.forEach(row => {
                        const inspectionDate = row.getAttribute('data-inspection-date');
                        if (inspectionDate) {
                            console.log('[DEBUG] [BUTTON COLOR] Processing row for date:', inspectionDate);
                            updateRFIAndInvoiceButtonColors(clientName, inspectionDate);
                        }
                    });
                };

                function updateRFIAndInvoiceButtonColors(clientName, inspectionDate) {
                    // CRITICAL: Strip "mobile-" prefix if present (handles mobile button client names)
                    if (clientName && clientName.startsWith('mobile-')) {
                        clientName = clientName.replace('mobile-', '');
                    }

                    console.log('[DEBUG] [API] ===== CALLING API FOR BUTTON COLORS =====');
                    console.log('[DEBUG] [API] Client:', clientName);
                    console.log('[DEBUG] [API] Date:', inspectionDate);

                    // Make API call to check specifically for RFI and Invoice files
                    fetch('/inspections/files/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCSRFToken()
                        },
                        body: JSON.stringify({
                            client_name: clientName,
                            inspection_date: inspectionDate,
                            _force_refresh: true
                        })
                    })
                        .then(response => {
                            console.log('[DEBUG] [API] Response status:', response.status);
                            console.log('[DEBUG] [API] Response ok:', response.ok);
                            return response.json();
                        })
                        .then(data => {
                            console.log('[DEBUG] [API] Full response data:', data);

                            if (data.success && data.files) {
                                const rfiFiles = data.files.rfi || [];
                                const invoiceFiles = data.files.invoice || [];

                                console.log('[DEBUG] [API] ✅ SUCCESS - RFI files found:', rfiFiles.length);
                                console.log('[DEBUG] [API] ✅ SUCCESS - Invoice files found:', invoiceFiles.length);
                                console.log('[DEBUG] [API] RFI files:', rfiFiles);
                                console.log('[DEBUG] [API] Invoice files:', invoiceFiles);

                                // Find the group row for this client and date
                                const groupRows = document.querySelectorAll('tr.group-row');
                                let targetRow = null;

                                groupRows.forEach(row => {
                                    const rowClientName = row.getAttribute('data-client-name');
                                    const rowDate = row.getAttribute('data-inspection-date');
                                    if (rowClientName === clientName && rowDate === inspectionDate) {
                                        targetRow = row;
                                    }
                                });

                                if (targetRow) {
                                    // Update RFI button (desktop)
                                    const rfiButton = targetRow.querySelector('button[id^="rfi-"]');
                                    if (rfiButton) {
                                        if (rfiFiles.length > 0) {
                                            // RFI file exists - make it green
                                            rfiButton.className = 'btn btn-sm btn-success';
                                            rfiButton.innerHTML = 'RFI ✓';
                                            rfiButton.title = 'RFI file uploaded';
                                            rfiButton.style.backgroundColor = '#28a745';
                                            rfiButton.style.borderColor = '#28a745';
                                            rfiButton.style.color = 'white';
                                            rfiButton.disabled = true;
                                            rfiButton.onclick = null;
                                            console.log('✅ [RFI] Desktop button updated to GREEN (file exists)');
                                        } else {
                                            // No RFI file - make it RED
                                            rfiButton.className = 'btn btn-sm btn-danger';
                                            rfiButton.innerHTML = 'RFI';
                                            rfiButton.title = 'Upload RFI';
                                            rfiButton.style.backgroundColor = '#ef4444';
                                            rfiButton.style.borderColor = '#ef4444';
                                            rfiButton.style.color = 'white';
                                            rfiButton.disabled = false;
                                            // Re-enable onclick handler
                                            const groupId = rfiButton.id.replace('rfi-', '');
                                            rfiButton.onclick = function () { uploadRFI(groupId); };
                                            console.log('🔴 [RFI] Desktop button updated to RED (no file)');
                                        }
                                    }

                                    // Update Invoice button (desktop)
                                    const invoiceButton = targetRow.querySelector('button[id^="invoice-"]');
                                    if (invoiceButton) {
                                        if (invoiceFiles.length > 0) {
                                            // Invoice file exists - make it green
                                            invoiceButton.className = 'btn btn-sm btn-success';
                                            invoiceButton.innerHTML = 'Invoice ✓';
                                            invoiceButton.title = 'Invoice file uploaded';
                                            invoiceButton.style.backgroundColor = '#28a745';
                                            invoiceButton.style.borderColor = '#28a745';
                                            invoiceButton.style.color = 'white';
                                            invoiceButton.disabled = true;
                                            invoiceButton.onclick = null;
                                            console.log('✅ [INVOICE] Button updated to GREEN (file exists)');
                                        } else {
                                            // No Invoice file - make it RED
                                            invoiceButton.className = 'btn btn-sm btn-danger';
                                            invoiceButton.innerHTML = 'Invoice';
                                            invoiceButton.title = 'Upload Invoice';
                                            invoiceButton.style.backgroundColor = '#ef4444';
                                            invoiceButton.style.borderColor = '#ef4444';
                                            invoiceButton.style.color = 'white';
                                            invoiceButton.disabled = false;
                                            // Re-enable onclick handler
                                            const groupId = invoiceButton.id.replace('invoice-', '');
                                            invoiceButton.onclick = function () { uploadInvoice(groupId); };
                                            console.log('🔴 [INVOICE] Desktop button updated to RED (no file)');
                                        }
                                    }
                                }

                                // ALSO update mobile buttons with same logic
                                // Find mobile buttons by ID pattern
                                const groupId = targetRow ? targetRow.getAttribute('data-group-id') : null;
                                if (groupId) {
                                    const mobileRfiButton = document.getElementById('rfi-mobile-' + groupId);
                                    const mobileInvoiceButton = document.getElementById('invoice-mobile-' + groupId);

                                    // Update mobile RFI button
                                    if (mobileRfiButton) {
                                        if (rfiFiles.length > 0) {
                                            mobileRfiButton.className = 'btn btn-sm btn-success bg-green-500 text-white py-2 px-3 rounded-lg text-xs font-medium';
                                            mobileRfiButton.innerHTML = '<i class="fas fa-check mr-1"></i> RFI ✓';
                                            mobileRfiButton.title = 'RFI file exists';
                                            mobileRfiButton.style.backgroundColor = '#28a745';
                                            mobileRfiButton.style.borderColor = '#28a745';
                                            mobileRfiButton.style.color = 'white';
                                            mobileRfiButton.disabled = true;
                                            mobileRfiButton.onclick = null;
                                            console.log('✅ [RFI] Mobile button updated to GREEN (file exists)');
                                        } else {
                                            mobileRfiButton.className = 'btn btn-sm btn-danger bg-red-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-red-600 transition-colors duration-200';
                                            mobileRfiButton.innerHTML = '<i class="fas fa-file-alt mr-1"></i> RFI';
                                            mobileRfiButton.title = 'Upload RFI';
                                            mobileRfiButton.style.backgroundColor = '#ef4444';
                                            mobileRfiButton.style.borderColor = '#ef4444';
                                            mobileRfiButton.style.color = 'white';
                                            mobileRfiButton.disabled = false;
                                            mobileRfiButton.onclick = function () { uploadRFI(groupId); };
                                            console.log('🔴 [RFI] Mobile button updated to RED (no file)');
                                        }
                                    }

                                    // Update mobile Invoice button
                                    if (mobileInvoiceButton) {
                                        if (invoiceFiles.length > 0) {
                                            mobileInvoiceButton.className = 'btn btn-sm btn-success w-full bg-green-500 text-white py-2 px-3 rounded-lg text-xs font-medium';
                                            mobileInvoiceButton.innerHTML = '<i class="fas fa-check mr-1"></i> Invoice ✓';
                                            mobileInvoiceButton.title = 'Invoice file exists';
                                            mobileInvoiceButton.style.backgroundColor = '#28a745';
                                            mobileInvoiceButton.style.borderColor = '#28a745';
                                            mobileInvoiceButton.style.color = 'white';
                                            mobileInvoiceButton.disabled = true;
                                            mobileInvoiceButton.onclick = null;
                                            console.log('✅ [Invoice] Mobile button updated to GREEN (file exists)');
                                        } else {
                                            mobileInvoiceButton.className = 'btn btn-sm btn-danger w-full bg-red-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-red-600 transition-colors duration-200';
                                            mobileInvoiceButton.innerHTML = '<i class="fas fa-file-invoice mr-1"></i> Invoice';
                                            mobileInvoiceButton.title = 'Upload Invoice';
                                            mobileInvoiceButton.style.backgroundColor = '#ef4444';
                                            mobileInvoiceButton.style.borderColor = '#ef4444';
                                            mobileInvoiceButton.style.color = 'white';
                                            mobileInvoiceButton.disabled = false;
                                            mobileInvoiceButton.onclick = function () { uploadInvoice(groupId); };
                                        }
                                    }

                                    // Update composition, lab, and occurrence buttons based on API data
                                    const compositionFiles = data.files.composition || [];
                                    const labFiles = data.files.lab || [];
                                    const occurrenceFiles = data.files.occurrence || [];

                                    // Find all buttons with data-upload-btn in this row
                                    if (targetRow) {
                                        // Update Composition buttons - skip if just deleted
                                        if (!window.compositionJustDeleted) {
                                            const compositionBtns = targetRow.querySelectorAll('[data-upload-btn*="composition"]');
                                            compositionBtns.forEach(btn => {
                                                if (compositionFiles.length > 0) {
                                                    btn.style.background = '#22c55e';
                                                    btn.innerHTML = 'Composition ✓';
                                                } else {
                                                    btn.style.background = '#6c757d';
                                                    btn.innerHTML = 'Composition';
                                                }
                                            });
                                        }

                                        // Update Lab/COA buttons
                                        const labBtns = targetRow.querySelectorAll('[data-upload-btn*="lab"]');
                                        labBtns.forEach(btn => {
                                            if (labFiles.length > 0) {
                                                btn.style.background = '#22c55e';
                                                btn.innerHTML = 'COA/Lab ✓';
                                            } else {
                                                btn.style.background = '#6c757d';
                                                btn.innerHTML = 'COA/Lab';
                                            }
                                        });

                                        // Update Occurrence buttons
                                        const occurrenceBtns = targetRow.querySelectorAll('[data-upload-btn*="occurrence"]');
                                        occurrenceBtns.forEach(btn => {
                                            if (occurrenceFiles.length > 0) {
                                                btn.style.background = '#22c55e';
                                                btn.innerHTML = 'Occurrence ✓';
                                            } else {
                                                btn.style.background = '#6c757d';
                                                btn.innerHTML = 'Occurrence';
                                            }
                                        });
                                    }
                                }
                            }
                        } else {
                            console.log('[DEBUG] [API] ❌ API call failed or no files data');
                            console.log('[DEBUG] [API] Success:', data.success);
                            console.log('[DEBUG] [API] Error:', data.error);
                        }
            })
            .catch (error => {
                    console.error('❌ [API] Network error checking file status:', error);
                    console.error('❌ [API] Error details:', error.message);
                });
        };

                function displayClientAllFiles(files, categories, totalFiles, inspectionsFound, message = null, fileStatus = null) {
                    const filesList = document.getElementById('filesList');

                    let html = '';

                    // Show summary header with status indicator
                    const statusInfo = getFileStatusInfo(fileStatus);
                    html += `
                <div class="client-files-header" style="background: #f8fafc; padding: 1rem; margin-bottom: 1rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #1e293b;">
                        <i class="fas fa-folder-open" style="color: #3b82f6; margin-right: 0.5rem;"></i>
                        All Files for Client
                        ${statusInfo ? '<span style="margin-left: 1rem; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; ' + statusInfo.style + '">' + statusInfo.text + '</span>' : ''}
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; font-size: 0.875rem; color: #64748b;">
                        <div><strong>Total Files:</strong> ${totalFiles}</div>
                        <div><strong>Inspection Periods:</strong> ${inspectionsFound.length}</div>
                        <div><strong>Source:</strong> Local PC</div>
                    </div>
                </div>
            `;

                    // Show success message if provided
                    if (message) {
                        html += '<div class="success-message" style="background: #d4edda; color: #155724; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; border: 1px solid #c3e6cb;">' + message + '</div>';
                    }

                    // Display files by category
                    for (const [categoryKey, categoryName] of Object.entries(categories)) {
                        const categoryFiles = files[categoryKey] || [];

                        if (categoryFiles.length === 0) {
                            continue; // Skip empty categories
                        }

                        html += `
                    <div class="file-category" style="margin-bottom: 1.5rem;">
                        <h5 style="margin: 0 0 0.75rem 0; color: #374151; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-${getCategoryIcon(categoryKey)}" style="color: ${getCategoryColor(categoryKey)};"></i>
                            ${categoryName} (${categoryFiles.length})
                        </h5>
                        <div class="file-list" style="display: grid; gap: 0.5rem;">
                `;

                        // Group files by inspection period
                        const filesByPeriod = {};
                        categoryFiles.forEach(file => {
                            const period = file.inspection_period || 'Unknown';
                            if (!filesByPeriod[period]) {
                                filesByPeriod[period] = [];
                            }
                            filesByPeriod[period].push(file);
                        });

                        // Display files grouped by inspection period
                        for (const [period, periodFiles] of Object.entries(filesByPeriod)) {
                            // Set background and border colors based on category
                            const periodBackground = categoryKey === 'compliance' ? '#fef3c7' : '#f9fafb;'; // Yellow background for compliance
                            const periodBorderColor = categoryKey === 'compliance' ? '#fbbf24' : '#d1d5db;'; // Yellow border for compliance

                            html += `
                        <div class="inspection-period" style="background: ${periodBackground}; padding: 0.75rem; border-radius: 4px; border-left: 3px solid ${periodBorderColor};">
                            <div style="font-weight: 500; color: #6b7280; margin-bottom: 0.5rem; font-size: 0.875rem;">
                                📅 ${period}${categoryKey === 'compliance' ? ' - ' + (periodFiles[0].commodity || 'Unknown Commodity') : ''}
                            </div>
                    `;

                            periodFiles.forEach(file => {
                                const fileSize = formatFileSize(file.size);
                                const modifiedDate = new Date(file.modified_time * 1000).toLocaleDateString('en-GB');

                                // Set background color based on category
                                const backgroundColor = categoryKey === 'compliance' ? '#fef3c7' : 'white;'; // Yellow background for compliance
                                const borderColor = categoryKey === 'compliance' ? '#fbbf24' : '#e5e7eb;'; // Yellow border for compliance

                                html += `
                            <div class="file-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: ${backgroundColor}; border-radius: 4px; margin-bottom: 0.25rem; border: 1px solid ${borderColor};">
                                <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                                    <i class="fas fa-${getFileIcon(file.name)}" style="color: ${categoryKey === 'compliance' ? '#f59e0b' : '#6b7280'};"></i>
                                    <div>
                                        <div style="font-weight: 500; color: #374151;">${file.name}</div>
                                        <div style="font-size: 0.75rem; color: #6b7280;">
                                            ${fileSize} • Modified: ${modifiedDate}
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <a href="${'/inspections/download-file/?file=' + encodeURIComponent(file.relative_path || file.path || '') + '&source=' + (file.source || 'local') + '&action=download'}" download="${file.name || 'file'}" class="btn btn-sm" style="background: #3b82f6; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; text-decoration: none; display: inline-flex; align-items: center;">
                                        <i class="fas fa-download"></i>
                                    </a>
                                    <button class="btn btn-sm" onclick="deleteFile('${(file.relative_path || file.path || file.name).replace(/'/g, "\\'")}', '${categoryKey}')" style="background: #ef4444; color: white; width: 32px; height: 32px; border-radius: 50%; border: none; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4); transition: all 0.2s ease; cursor: pointer;" onmouseenter="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.5)';" onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(239, 68, 68, 0.4)';">
                                        <i class="fas fa-trash-alt" style="font-size: 12px;"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                            });

                            html += '</div>'; // Close inspection-period
                        }

                        html += '</div></div>'; // Close file-list and file-category
                    }

                    // Show message if no files found
                    if (totalFiles === 0) {
                        html = `
                    <div class="empty-state" style="text-align: center; padding: 2rem; color: #6b7280;">
                        <i class="fas fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; color: #d1d5db;"></i>
                        <h4 style="margin: 0 0 0.5rem 0; color: #374151;">No Files Found</h4>
                        <p style="margin: 0;">No files found for this client. Run the 4-month data pull to download files from Google Drive.</p>
                    </div>
                `;
                    }

                    filesList.innerHTML = html;
                }

                function getCategoryIcon(categoryKey) {
                    const icons = {
                        'rfi': 'file-alt',
                        'invoice': 'file-invoice',
                        'lab': 'flask',
                        'retest': 'redo',
                        'compliance': 'shield-alt'
                    };
                    return icons[categoryKey] || 'file';
                }

                function getCategoryColor(categoryKey) {
                    const colors = {
                        'rfi': '#f59e0b',
                        'invoice': '#10b981',
                        'lab': '#8b5cf6',
                        'retest': '#ef4444',
                        'compliance': '#fbbf24'  // Yellow color for compliance documents
                    };
                    return colors[categoryKey] || '#6b7280';
                }

                function getFileIcon(filename) {
                    if (!filename) return 'file';
                    const ext = String(filename).split('.').pop().toLowerCase();
                    const iconMap = {
                        'pdf': 'file-pdf',
                        'doc': 'file-word',
                        'docx': 'file-word',
                        'xls': 'file-excel',
                        'xlsx': 'file-excel',
                        'jpg': 'file-image',
                        'jpeg': 'file-image',
                        'png': 'file-image',
                        'gif': 'file-image',
                        'zip': 'file-archive',
                        'rar': 'file-archive'
                    };
                    return iconMap[ext] || 'file';
                }

                function formatFileSize(bytes) {
                    if (bytes === 0) return '0 Bytes';
                    const k = 1024;
                    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                }

                function getFileStatusInfo(fileStatus) {
                    switch (fileStatus) {
                        case 'all_files':
                            return {
                                text: '✅ All Files Available',
                                style: 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;'
                            };
                        case 'compliance_only':
                            return {
                                text: '🔵 Compliance Only',
                                style: 'background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;'
                            };
                        case 'no_files':
                            return {
                                text: '❌ No Files',
                                style: 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
                            };
                        case 'partial_files':
                            return {
                                text: '🟠 Partial Files',
                                style: 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;'
                            };
                        default:
                            return null;
                    }
                }

                function displayFiles(files, message = null) {
                    const filesList = document.getElementById('filesList');

                    // EXTENSIVE DEBUG LOGGING
                    console.log('[DEBUG] displayFiles called with files:', files);
                    console.log('[DEBUG] DEBUG: files type:', typeof files);
                    console.log('DEBUG: files keys:', Object.keys(files || {}));
                    console.log('DEBUG: files values:', Object.values(files || {}));
                    console.log('[DEBUG] DEBUG: message:', message);
                    console.log('[DEBUG] DEBUG: filesList element:', filesList);

                    // Detailed analysis of files object
                    if (files) {
                        console.log('[DEBUG] DEBUG: Files object analysis:');
                        console.log('  - Is array:', Array.isArray(files));
                        console.log('  - Is object:', typeof files === 'object');
                        console.log('  - Has length property:', 'length' in files);
                        console.log('  - Length value:', files.length);
                        console.log('  - Object.keys length:', Object.keys(files).length);
                        console.log('  - Object.values length:', Object.values(files).length);

                        // Check each category
                        Object.keys(files).forEach(category => {
                            const fileList = files[category];
                            console.log(`[DEBUG] DEBUG: Category "${category}":`, {
                                type: typeof fileList,
                                isArray: Array.isArray(fileList),
                                length: fileList ? fileList.length : 'N/A',
                                content: fileList
                            });
                        });
                    } else {
                        console.log('[DEBUG] DEBUG: Files is null/undefined');
                    }

                    // Show success message if provided
                    if (message) {
                        console.log('[DEBUG] DEBUG: Adding success message:', message);
                        filesList.innerHTML = `<div class="success-message" style="background: #d4edda; color: #155724; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; border: 1px solid #c3e6cb;">
                    <i class="fas fa-check-circle"></i> ${message}
                </div>`;
                    }

                    // Check if there are actually any files (not just empty arrays)
                    const hasFiles = files && Object.values(files).some(fileList => fileList && fileList.length > 0);
                    console.log('[DEBUG] DEBUG: hasFiles check result:', hasFiles);
                    console.log('[DEBUG] DEBUG: hasFiles breakdown:');
                    console.log('  - files exists:', !!files);
                    console.log('  - Object.values(files):', files ? Object.values(files) : 'N/A');
                    console.log('  - some() result:', files ? Object.values(files).some(fileList => fileList && fileList.length > 0) : 'N/A');

                    if (!hasFiles) {
                        console.log('[DEBUG] DEBUG: No files found - showing empty message');
                        filesList.innerHTML += '<div class="empty-category">No files found for this inspection</div>';
                        return;
                    }

                    let html = '';

                    // Define categories in order - handle both document types and commodity types
                    const documentCategories = [
                        { key: 'rfi', name: 'RFI Documents', icon: 'fas fa-file-alt' },
                        { key: 'invoice', name: 'Invoice Documents', icon: 'fas fa-file-invoice' },
                        { key: 'lab', name: 'COA', icon: 'fas fa-flask' },
                        { key: 'lab_form', name: 'Lab Form Documents', icon: 'fas fa-file-medical' },
                        { key: 'retest', name: 'Retest Documents', icon: 'fas fa-redo' },
                        { key: 'compliance', name: 'Compliance Documents', icon: 'fas fa-shield-alt' },
                        { key: 'composition', name: 'Composition Documents', icon: 'fas fa-vial' },
                        { key: 'occurrence', name: 'Occurrence Documents', icon: 'fas fa-exclamation-triangle' },
                        { key: 'other', name: 'Other Documents', icon: 'fas fa-folder' }
                    ];

                    // Check if files are categorized by commodity type (like POULTRY, MEAT, etc.)
                    const fileKeys = Object.keys(files);
                    const documentTypeKeys = ['rfi', 'invoice', 'lab', 'lab_form', 'coa', 'retest', 'compliance', 'composition', 'occurrence', 'other'];

                    // Debug logging
                    console.log('[DEBUG] fileKeys:', fileKeys);
                    console.log('[DEBUG] documentTypeKeys:', documentTypeKeys);

                    // Check if at least some keys are document types
                    const hasDocumentTypeKeys = fileKeys.some(key =>
                        documentTypeKeys.includes(key.toLowerCase())
                    );

                    // Check for commodity-based keys (like POULTRY, MEAT)
                    const commodityKeys = fileKeys.filter(key =>
                        !documentTypeKeys.includes(key.toLowerCase())
                    );

                    console.log('[DEBUG] hasDocumentTypeKeys:', hasDocumentTypeKeys);
                    console.log('[DEBUG] commodityKeys:', commodityKeys);

                    // ALWAYS use documentCategories for standard document types
                    // This ensures Lab Form Documents always appears
                    // Use spread operator to create a COPY, not a reference
                    let categories = [...documentCategories];

                    // If there are commodity-based categories, add them at the end
                    if (commodityKeys.length > 0) {
                        commodityKeys.forEach(key => {
                            categories.push({
                                key: key,
                                name: `${key} Documents`,
                                icon: 'fas fa-shield-alt'
                            });
                        });
                    }

                    console.log('[DEBUG] Final categories:', categories.map(c => c.key));
                    console.log('[DEBUG] documentCategories still has:', documentCategories.length, 'items');

                    categories.forEach(category => {
                        const categoryFiles = files[category.key] || [];
                        console.log(`📁 Processing category: ${category.key}`, categoryFiles);
                        console.log(`[DEBUG] Category key: "${category.key}", Is compliance: ${category.key === 'compliance'}`);
                        console.log(`📁 Files object for ${category.key}:`, files[category.key]);

                        html += `
                    <div class="file-category">
                        <div class="file-category-header">
                            <div class="category-title">
                                ${category.name}
                            </div>
                            <div class="file-count">${categoryFiles.length}</div>
                        </div>
                        <div class="file-list">
                `;

                        if (categoryFiles.length === 0) {
                            html += '<div class="empty-category">No files in this category</div>';
                        } else {
                            categoryFiles.forEach(file => {
                                console.log(`📄 File processing: ${file.name}, category.key: "${category.key}", file.category: "${file.category}"`);
                                html += `
                            <div class="file-item">
                                <div class="file-info">
                                    <i class="file-icon ${getFileIcon(file.filename || file.name)}"></i>
                                    <div class="file-details">
                                        <div class="file-name">${file.filename || file.name}</div>
                                        <div class="file-size">
                                            <span>${formatFileSize(file.size)}</span>
                                            <span>•</span>
                                            ${file.type ? `<span class="file-type">${file.type.toUpperCase()}</span>` : ''}
                                            <span>${file.modified || ''}</span>
                                        </div>
                                    </div>
                                <
                                /div>
                                <div class="file-actions" style="display: flex !important; gap: 8px !important; align-items: center;">
                                    ${getViewButton(file)}
                                    <a href="${'/inspections/download-file/?file=' + encodeURIComponent(file.relative_path || file.path) + '&source=' + (file.source || 'local') + '&action=download'}" download="${file.name || 'file'}" class="btn btn-file btn-secondary" style="background: #10b981 !important; color: white !important; padding: 6px 10px; border-radius: 6px; font-size: 12px;" title="Download File">
                                        <i class="fas fa-download"></i>
                                    </a>
                                    <button class="btn btn-file" style="background: #ef4444; color: white; width: 36px; height: 36px; border-radius: 50%; border: none; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4); transition: all 0.2s ease; cursor: pointer;" onclick="deleteFile('${(file.relative_path || file.path).replace(/'/g, "\\'")}', '${category.key}')" title="Delete File" onmouseenter="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.5)';" onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(239, 68, 68, 0.4)';">
                                        <i class="fas fa-trash-alt" style="font-size: 14px;"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                            });
                        }

                        html += '</div></div>';
                    });

                    filesList.innerHTML = html;
                }

                function getFileIcon(filename) {
                    if (!filename) return 'fas fa-file';
                    const ext = String(filename).split('.').pop().toLowerCase();
                    switch (ext) {
                        case 'pdf': return 'fas fa-file-pdf';
                        case 'xlsx': case 'xls': return 'fas fa-file-excel';
                        case 'docx': case 'doc': return 'fas fa-file-word';
                        case 'jpg': case 'jpeg': case 'png': return 'fas fa-file-image';
                        case 'zip': case 'rar': return 'fas fa-file-archive';
                        default: return 'fas fa-file';
                    }
                }

                function getViewButton(file) {
                    try {
                        const filename = file.filename || file.name || 'unknown';
                        const ext = filename.split('.').pop().toLowerCase();
                        const filePath = file.relative_path || file.path || '';

                        // If no valid file path, return empty string
                        if (!filePath) {
                            console.warn('[DEBUG] getViewButton: No valid file path for:', filename);
                            return '';
                        }

                        // For ZIP files, show extract/contents button instead of view
                        if (ext === 'zip' || ext === 'rar') {
                            return `<button class="btn btn-file btn-warning" onclick="showZipContents('${filePath}', '${file.source || 'local'}')" title="Show ZIP Contents" style="background: #f59e0b !important; color: white !important; padding: 6px 10px; border-radius: 6px; border: none;"><i class="fas fa-eye"></i></button>`;
                        }

                        // For viewable files (PDF, images, etc.), show view button
                        const viewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt'];
                        if (viewableTypes.includes(ext)) {
                            const viewUrl = '/inspections/download-file/?file=' + encodeURIComponent(filePath) + '&source=' + (file.source || 'local') + '&action=view';
                            return `<a href="${viewUrl}" class="btn btn-file btn-primary" target="_blank" title="View File" style="background: #3b82f6 !important; color: white !important; padding: 6px 10px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center;"><i class="fas fa-eye"></i></a>`;
                        }

                        // For other files (Excel, Word), show info button
                        return `<button class="btn btn-file btn-info" onclick="alert('This file type opens best when downloaded')" title="Download to View" style="background: #06b6d4 !important; color: white !important; padding: 6px 10px; border-radius: 6px; border: none;"><i class="fas fa-info"></i></button>`;
                    } catch (e) {
                        console.error('[DEBUG] getViewButton error:', e);
                        return '';
                    }
                }

                async function showZipContents(relativePath, source = 'local') {
                    try {
                        const response = await fetch('/inspections/zip-contents/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                file_path: relativePath,
                                source: source
                            })
                        });

                        const result = await response.json();

                        if (result.success) {
                            // Create styled ZIP contents popup matching shipment list design
                            let contentsHtml = `
                        <div class="file-category">
                            <div class="file-category-header">
                                <div class="category-title">
                                    <i class="fas fa-file-archive"></i>
                                    ZIP File Contents: ${result.zip_name}
                                </div>
                                <div class="file-count">${result.total_files}</div>
                            </div>
                            <div class="file-list">
                    ;`;

                            if (result.contents && result.contents.length > 0) {
                                result.contents.forEach(item => {
                                    contentsHtml += `
                                <div class="file-item">
                                    <div class="file-info">
                                        <i class="file-icon ${getFileIcon(item.name)}"></i>
                                        <div class="file-details">
                                            <div class="file-name">${item.name}</div>
                                            <div class="file-size">
                                                <span>${formatFileSize(item.size)}</span>
                                                <span>•</span>
                                                <span>Compressed: ${formatFileSize(item.compressed_size)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                                });
                            } else {
                                contentsHtml += '<div class="empty-category">No files found in ZIP</div>';
                            }

                            contentsHtml += '</div></div>';

                            // Create modal matching the main files popup style
                            const overlay = document.createElement('div');
                            overlay.className = 'modal';
                            overlay.style.zIndex = '10001';

                            const modalContent = document.createElement('div');
                            modalContent.className = 'modal-content';
                            modalContent.style.maxWidth = '700px';

                            modalContent.innerHTML =
                                '<div class="modal-header">' +
                                '<div class="modal-title">' +
                                '<i class="fas fa-archive"></i>' +
                                '<span>ZIP File Contents</span>' +
                                '</div>' +
                                '<button class="modal-close" onclick="this.closest(\'.modal\').remove()" title="Close">' +
                                '<i class="fas fa-times"></i>' +
                                '</button>' +
                                '</div>' +
                                '<div class="modal-body">' +
                                contentsHtml +
                                '</div>';

                            overlay.appendChild(modalContent);
                            document.body.appendChild(overlay);

                        } else {
                            alert('Error reading ZIP contents: ' + result.error);
                        }

                    } catch (error) {
                        alert('Network error: ' + error.message);
                    }
                }
                function formatFileSize(bytes) {
                    if (!bytes) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                }

                // Send group documents function
                async function sendGroupDocuments(groupId, clientName, inspectionDate) {
                    try {
                        // Show confirmation dialog
                        const confirmed = confirm('Send all documents for ' + clientName + ' - ' + inspectionDate + '?\n\nThis will send RFI, Invoice, Lab results, and other completed documents.');

                        if (!confirmed) {
                            return;
                        }

                        // Update button state
                        const sendButton = document.getElementById('send-' + groupId);
                        const originalText = sendButton.innerHTML;
                        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                        sendButton.disabled = true;

                        // Make API call to send documents
                        const response = await fetch('/inspections/send-documents/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                group_id: groupId,
                                client_name: clientName,
                                inspection_date: inspectionDate
                            })
                        });

                        const result = await response.json();

                        if (result.success) {
                            // Update button to show sent state
                            sendButton.innerHTML = '<i class="fas fa-check"></i> Sent';
                            sendButton.classList.add('sent');
                            sendButton.disabled = false;

                            // Show success message
                            alert('✅ Documents sent successfully!\n\nSent to: ' + result.recipients + '\nDocuments: ' + result.documents_sent + '\nEmail ID: ' + result.email_id || 'N/A');
                        } else {
                            // Restore button on error
                            sendButton.innerHTML = originalText;
                            sendButton.disabled = false;
                            alert('❌ Error sending documents: ' + result.error);
                        }

                    } catch (error) {
                        // Restore button on network error
                        const sendButton = document.getElementById('send-' + groupId);
                        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
                        sendButton.disabled = false;
                        alert('❌ Network error: ' + error.message);
                    }
                }

                // Upload status management
                function loadUploadStatus() {
                    // Load upload status from localStorage and update button colors
                    const uploadStatus = JSON.parse(localStorage.getItem('uploadStatus') || '{}');

                    // First, apply stored upload status immediately for better UX
                    Object.keys(uploadStatus).forEach(buttonId => {
                        const button = document.getElementById(buttonId);
                        if (button && uploadStatus[buttonId]) {
                            button.classList.add('uploaded');
                            console.log('Restored upload status for ' + buttonId);
                        }
                    });

                    // Then, verify file existence in the background
                    // This ensures buttons stay green if files actually exist
                    setTimeout(() => {
                        Object.keys(uploadStatus).forEach(buttonId => {
                            if (uploadStatus[buttonId]) {
                                checkFileExists(buttonId, uploadStatus[buttonId]);
                            }
                        });
                    }, 1000); // Small delay to let page fully load
                }

                // RFI status is now handled by file-based checking in the backend
                // No need for separate loadRFIStatus function since template uses shipment.rfi_uploaded

                // Load sent status from database on page load
                function loadSentStatus() {
                    console.log('🚀 [SENT STATUS] Starting loadSentStatus function');
                    console.log('🚀 [SENT STATUS] Function called at:', new Date().toISOString());

                    // Get all sent status dropdowns and restore their values from the template data
                    const sentDropdowns = document.querySelectorAll('.sent-status-dropdown');
                    console.log('[DEBUG] [SENT STATUS] Found ' + sentDropdowns.length + ' sent status dropdowns');

                    // Also check how many rows we have
                    const allRows = document.querySelectorAll('tr[data-group-id]');
                    console.log('[DEBUG] [SENT STATUS] Found ' + allRows.length + ' rows with data-group-id');

                    sentDropdowns.forEach((dropdown, index) => {
                        const groupId = dropdown.getAttribute('data-group-id');
                        const currentValue = dropdown.value;
                        console.log('[DEBUG] [SENT STATUS] Processing dropdown ' + index + 1 + '/' + sentDropdowns.length + ': groupId="' + groupId + '", value="' + currentValue + '"');

                        // Apply visual styling based on current value
                        if (currentValue === 'YES') {
                            console.log('✅ [SENT STATUS] Applying YES styling to dropdown for ' + groupId);
                            dropdown.style.backgroundColor = '#10b981';
                            dropdown.style.color = 'white';
                            dropdown.style.borderColor = '#059669';
                            dropdown.classList.remove('sent-no');
                            dropdown.classList.add('sent-yes');

                            // Also mark the row as complete
                            // Note: groupId from dropdown already has the correct format (with hyphens)
                            const groupRow = document.querySelector('tr[data-group-id="' + groupId + '"]');
                            console.log('[DEBUG] [SENT STATUS] Looking for row with data-group-id="' + groupId + '":', groupRow ? 'FOUND' : 'NOT FOUND');

                            // Debug: List all available rows with data-group-id
                            const allRows = document.querySelectorAll('tr[data-group-id]');
                            console.log('[DEBUG] [SENT STATUS] Available rows:', Array.from(allRows).map(row => row.getAttribute('data-group-id')));

                            if (groupRow) {
                                groupRow.classList.add('inspection-complete');
                                groupRow.classList.add('row-locked');
                                groupRow.setAttribute('data-locked', 'true');
                                groupRow.setAttribute('data-sent-status', 'yes');
                                groupRow.setAttribute('data-was-sent', 'true');
                                console.log('🎯 [SENT STATUS] SUCCESS: Marked group ' + groupId + ' as complete and LOCKED on page load');

                                // Set span colors to white for facility name and remove conflicting classes
                                groupRow.querySelectorAll('td span').forEach(span => {
                                    span.classList.remove('text-primary', 'hover:text-primary-dark');
                                    span.style.setProperty('color', 'white', 'important');
                                });

                                // Lock the entire row - disable all interactive elements
                                if (typeof lockRow === 'function') {
                                    lockRow(groupRow);
                                } else {
                                    console.log('[WARNING] [SENT STATUS] lockRow function not available, applying basic styling');
                                    // Fallback styling if lockRow function is not available
                                    groupRow.style.borderLeft = '4px solid #22c55e';
                                }

                                // Verify the class was added
                                if (groupRow.classList.contains('inspection-complete')) {
                                    console.log('✅ [SENT STATUS] VERIFIED: Row ' + groupId + ' has inspection-complete class and is LOCKED');
                                } else {
                                    console.log('❌ [SENT STATUS] ERROR: Row ' + groupId + ' does NOT have inspection-complete class');
                                }
                            } else {
                                console.log('❌ [SENT STATUS] ERROR: Could not find row for group ' + groupId);

                                // Let's see what rows we do have
                                const allGroupRows = document.querySelectorAll('tr[data-group-id]');
                                console.log('[DEBUG] [SENT STATUS] Available rows:', Array.from(allGroupRows).map(row => row.getAttribute('data-group-id')));
                            }
                        } else if (currentValue === 'NO') {
                            dropdown.style.backgroundColor = '#ef4444';
                            dropdown.style.color = 'white';
                            dropdown.style.borderColor = '#dc2626';
                            dropdown.classList.remove('sent-yes');
                            dropdown.classList.add('sent-no');

                            // Remove complete status from row and unlock it
                            const groupRow = document.querySelector('tr[data-group-id="' + groupId + '"]');
                            if (groupRow) {
                                groupRow.classList.remove('inspection-complete');
                                groupRow.classList.remove('row-locked');
                                groupRow.removeAttribute('data-locked');
                                groupRow.removeAttribute('data-sent-status');

                                // Unlock the row if lockRow function is available
                                if (typeof unlockRow === 'function') {
                                    unlockRow(groupRow);
                                } else {
                                    // Fallback: remove styling
                                    groupRow.style.borderLeft = '';
                                }
                            }
                        } else {
                            dropdown.style.backgroundColor = 'var(--card-bg)';
                            dropdown.style.color = 'var(--text)';
                            dropdown.style.borderColor = 'var(--border)';
                            dropdown.classList.remove('sent-yes', 'sent-no');

                            // Remove complete status from row and unlock it
                            const groupRow = document.querySelector('tr[data-group-id="' + groupId + '"]');
                            if (groupRow) {
                                groupRow.classList.remove('inspection-complete');
                                groupRow.classList.remove('row-locked');
                                groupRow.removeAttribute('data-locked');
                                groupRow.removeAttribute('data-sent-status');

                                // Unlock the row if lockRow function is available
                                if (typeof unlockRow === 'function') {
                                    unlockRow(groupRow);
                                } else {
                                    // Fallback: remove styling
                                    groupRow.style.borderLeft = '';
                                }
                            }
                        }

                        console.log('Restored sent status for group ' + groupId + ': ' + currentValue);
                    });

                    console.log('🏁 [SENT STATUS] Completed loadSentStatus function');
                    console.log('🚀 [SENT STATUS] ===========================================');
                }

                // Check all uploaded files on page load to ensure buttons are properly colored
                function checkAllUploadedFiles() {
                    console.log('[DEBUG] Checking all uploaded files on page load...');

                    // Get all upload buttons on the page
                    const uploadButtons = document.querySelectorAll('.btn-upload');

                    uploadButtons.forEach(button => {
                        const buttonId = button.i; d;
                        if (buttonId) {
                            // Check if this button is already marked as uploaded
                            if (!button.classList.contains('uploaded')) {
                                // Check if file actually exists
                                checkFileExists(buttonId, null);
                            }
                        }
                    });
                };

                function checkFileExists(buttonId, fileInfo) {
                    // Make a lightweight request to check if file exists
                    const parts = buttonId.split('-');
                    const docType = parts[0]; // Extract document type
                    const identifier = parts[1]; // Extract group ID or inspection ID

                    console.log('Checking file existence for: ' + buttonId + ' (' + docType + ' - ' + identifier + ')');

                    // Determine if this is a group upload or individual inspection upload
                    let url;
                    if (docType === 'rfi' || docType === 'invoice') {
                        url = '/list-uploaded-files/?group_id=' + identifier;
                    } else {
                        // For lab and retest, we need both group_id and inspection_id
                        // Get the group_id from the button's data attribute or parent row
                        const button = document.getElementById(buttonId);
                        let groupId = null;
                        if (button) {
                            // Try to get group_id from the button's data attribute
                            groupId = button.getAttribute('data-group-id');
                            if (!groupId) {
                                // Try to get it from the parent row
                                const row = button.closest('tr');
                                if (row) {
                                    const groupRow = row.previousElementSibling;
                                    if (groupRow && groupRow.classList.contains('group-row')) {
                                        const groupButton = groupRow.querySelector('.expand-btn');
                                        if (groupButton) {
                                            groupId = groupButton.getAttribute('data-group-id');
                                        }
                                    }
                                }
                            }
                        }

                        if (groupId) {
                            url = '/list-uploaded-files/?group_id=' + groupId + '&inspection_id=' + identifier;
                        } else {
                            url = '/list-uploaded-files/?inspection_id=' + identifier;
                        }
                    }

                    console.log('Making request to: ' + url);

                    fetch(url)
                        .then(response => response.json())
                        .then(data => {
                            console.log('Response for ' + buttonId + ':', data);
                            if (data.success) {
                                const files = data.files[docType] || [];
                                console.log('Files found for ' + docType + ':', files);
                                if (files.length === 0) {
                                    // File doesn't exist, reset button
                                    console.log('No files found for ' + buttonId + ', resetting button');
                                    const button = document.getElementById(buttonId);
                                    if (button) {
                                        button.classList.remove('uploaded');
                                        // Remove from localStorage
                                        const uploadStatus = JSON.parse(localStorage.getItem('uploadStatus') || '{}');
                                        delete uploadStatus[buttonId];
                                        localStorage.setItem('uploadStatus', JSON.stringify(uploadStatus));
                                        console.log('Removed ' + buttonId + ' from localStorage');
                                    }
                                } else {
                                    // File exists, mark button as uploaded
                                    console.log('Files found for ' + buttonId + ', marking button as uploaded');
                                    const button = document.getElementById(buttonId);
                                    if (button) {
                                        button.classList.add('uploaded');
                                        // Also save to localStorage for future page loads
                                        const uploadStatus = JSON.parse(localStorage.getItem('uploadStatus') || '{}');
                                        uploadStatus[buttonId] = true;
                                        localStorage.setItem('uploadStatus', JSON.stringify(uploadStatus));
                                        console.log('Added ' + buttonId + ' to localStorage');
                                    }
                                }
                            }
                        })
                        .catch(error => {
                            console.log('Error checking file existence:', error);
                            // On error, assume file doesn't exist and reset button
                            const button = document.getElementById(buttonId);
                            if (button) {
                                button.classList.remove('uploaded');
                                const uploadStatus = JSON.parse(localStorage.getItem('uploadStatus') || '{}');
                                delete uploadStatus[buttonId];
                                localStorage.setItem('uploadStatus', JSON.stringify(uploadStatus));
                            }
                        });
                };

                // Make markAsUploaded globally available
                window.markAsUploaded = function markAsUploaded(buttonId) {
                    // Mark button as uploaded and save to localStorage
                    console.log('[DEBUG] [DEBUG] markAsUploaded called for:', buttonId);
                    console.log('[DEBUG] [DEBUG] Button type:', buttonId.startsWith('rfi-') ? 'RFI' : buttonId.startsWith('invoice-') ? 'Invoice' : buttonId.startsWith('occurrence-') ? 'Occurrence' : 'Unknown');

                    const button = document.getElementById(buttonId);
                    console.log('[DEBUG] [DEBUG] Button element found:', button);
                    console.log('[DEBUG] [DEBUG] Button current innerHTML:', button ? button.innerHTML : 'N/A');
                    console.log('[DEBUG] [DEBUG] Button current disabled state:', button ? button.disabled : 'N/A');

                    if (button) {
                        console.log('[DEBUG] [DEBUG] Button found, updating to show uploaded state');

                        // Clear the file-deleted flag since a new file has been uploaded
                        button.removeAttribute('data-file-deleted');
                        console.log('[DEBUG] [DEBUG] Removed data-file-deleted attribute');

                        // Get current user first name from template context
                        const currentUserName = window.DJANGO_CONFIG.userName;
                        console.log('[DEBUG] [DEBUG] Current user first name from template:', currentUserName);
                        console.log('[DEBUG] [DEBUG] User name length:', currentUserName.length);
                        console.log('[DEBUG] [DEBUG] User name type:', typeof currentUserName);

                        const currentDate = new Date().toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        console.log('[DEBUG] [DEBUG] Current date:', currentDate);

                        // Store original button state for debugging
                        const originalInnerHTML = button.innerHTML;
                        const originalDisabled = button.disabled;
                        const originalStyle = button.style.cssText;

                        console.log('[DEBUG] [DEBUG] Original button state:');
                        console.log('  - innerHTML:', originalInnerHTML);
                        console.log('  - disabled:', originalDisabled);
                        console.log('  - style:', originalStyle);

                        // Update button to show uploaded state with user's name
                        console.log('[DEBUG] [DEBUG] Setting button.disabled = true');
                        button.disabled = true;

                        console.log('[DEBUG] [DEBUG] Setting button styles...');
                        // Force override any existing styles with !important
                        button.style.setProperty('background-color', '#d4edda', 'important');
                        button.style.setProperty('color', '#155724', 'important');
                        button.style.setProperty('border-color', '#c3e6cb', 'important');
                        button.style.setProperty('cursor', 'not-allowed', 'important');

                        // Remove conflicting classes and add proper classes
                        button.classList.remove('btn-success', 'btn-secondary', 'btn-sm');
                        button.classList.add('btn-rfi', 'uploaded');

                        console.log('[DEBUG] [DEBUG] Setting button.innerHTML to user first name:', currentUserName);
                        button.innerHTML = currentUserName;

                        // Verify the change was applied
                        console.log('[DEBUG] [DEBUG] After update - button.innerHTML:', button.innerHTML);
                        console.log('[DEBUG] [DEBUG] After update - button.disabled:', button.disabled);
                        console.log('[DEBUG] [DEBUG] After update - button.style.background:', button.style.background);

                        // Determine document type from button ID
                        let docType = 'document';
                        if (buttonId.startsWith('rfi-')) {
                            docType = 'RFI';
                        } else if (buttonId.startsWith('invoice-')) {
                            docType = 'Invoice';
                        } else if (buttonId.startsWith('occurrence-')) {
                            docType = 'Occurrence';
                        }
                        console.log('[DEBUG] [DEBUG] Document type:', docType);

                        const titleText = `${docType} uploaded by ${currentUserName} on ${currentDate}`;
                        console.log('[DEBUG] [DEBUG] Setting button.title to:', titleText);
                        button.title = titleText;

                        // Remove the onclick handler since button is now disabled
                        console.log('[DEBUG] [DEBUG] Removing onclick handler');
                        button.onclick = null;

                        // Add uploaded class for any CSS styling
                        console.log('[DEBUG] [DEBUG] Adding uploaded class');
                        button.classList.add('uploaded');

                        // Save to localStorage
                        const uploadStatus = JSON.parse(localStorage.getItem('uploadStatus') || '{}');
                        uploadStatus[buttonId] = true;
                        localStorage.setItem('uploadStatus', JSON.stringify(uploadStatus));

                        console.log('✅ [DEBUG] Button update completed. Final state:');
                        console.log('  - innerHTML:', button.innerHTML);
                        console.log('  - disabled:', button.disabled);
                        console.log('  - title:', button.title);
                        console.log('  - classList:', button.classList.toString());

                    } else {
                        console.error('❌ [DEBUG] Button not found for ID:', buttonId);
                        console.log('[DEBUG] [DEBUG] Available buttons on page:');
                        const allButtons = document.querySelectorAll('button[id]');
                        allButtons.forEach(btn => {
                            console.log('  - Button ID:', btn.id);
                        });
                    }
                };


                // INSTANT UPDATE: After file upload, immediately update button color without checking files
                function instantUpdateViewFilesButton(clientName, inspectionDate, fileType) {
                    console.log(`⚡ INSTANT UPDATE: ${fileType} uploaded for ${clientName} on ${inspectionDate}`);

                    // Find the View Files button for this client/date
                    const buttons = document.querySelectorAll('button.btn-view-files, button[class*="btn-view-files"]');

                    buttons.forEach(button => {
                        const btnClient = button.getAttribute('data-client-name');
                        const btnDate = button.getAttribute('data-inspection-date');

                        if (btnClient === clientName && btnDate === inspectionDate) {
                            console.log('✅ Found matching button, updating to partial/complete status');

                            // Remove old status classes
                            button.classList.remove('btn-files-none', 'btn-files-checking', 'btn-danger');

                            // Add partial status (orange) - we know at least one file exists
                            button.classList.add('btn-files-partial');

                            console.log(`🎨 Button updated instantly - no file checking needed!`);
                        }
                    });
                }

                // Function to automatically update all View Files button colors on page load
                async function updateAllViewFilesButtonColors() {
                    console.log('🎨 Starting automatic color update for all View Files buttons');

                    // Show loading state on all View Files buttons - use multiple detection methods
                    let allViewFilesButtons = [];

                    // Method 1: By class
                    allViewFilesButtons = document.querySelectorAll('button.btn-view-files, button[class*="btn-view-files"]');
                    console.log('[DEBUG] [FRONTEND] Method 1 - Found ' + allViewFilesButtons.length + ' buttons by class');

                    // Method 2: By onclick attribute (more reliable)
                    if (allViewFilesButtons.length === 0) {
                        allViewFilesButtons = document.querySelectorAll('button[onclick*="openFilesPopup"]');
                        console.log('[DEBUG] [FRONTEND] Method 2 - Found ' + allViewFilesButtons.length + ' buttons by onclick');
                    }

                    // Method 3: By text content as fallback
                    if (allViewFilesButtons.length === 0) {
                        const allButtons = document.querySelectorAll('button');
                        allViewFilesButtons = Array.from(allButtons).filter(btn =>
                            btn.textContent.includes('View Files') ||
                            btn.textContent.includes('Files') ||
                            btn.onclick && btn.onclick.toString().includes('openFilesPopup')
                        );
                        console.log('[DEBUG] [FRONTEND] Method 3 - Found ' + allViewFilesButtons.length + ' buttons by text/onclick');
                    }

                    allViewFilesButtons.forEach(button => {
                        const icon = button.querySelector('i');
                        if (icon) {
                            icon.className = 'fas fa-sync fa-spin';
                            icon.style.color = '#6b7280';
                        }
                        button.title = 'Checking file status...';
                    });

                    // Get all client data from the current page
                    const clientData = getCurrentPageClientData();
                    const clientNames = Object.keys(clientData);

                    console.log('📋 Found ' + clientNames.length + ' unique clients to check:', clientNames);
                    console.log('📅 Inspection dates:', clientData);

                    if (clientNames.length === 0) {
                        console.log('[WARNING] No clients found to check');
                        // Reset loading state
                        allViewFilesButtons.forEach(button => {
                            const icon = button.querySelector('i');
                            if (icon) {
                                icon.className = 'fas fa-download';
                                icon.style.color = '#6b7280';
                            }
                            button.title = 'View Files';
                        });
                        return;
                    }

                    if (allViewFilesButtons.length === 0) {
                        console.log('[WARNING] No View Files buttons found, skipping automatic color update');
                        return;
                    }

                    try {
                        // Call the bulk status check endpoint
                        const response = await fetch('/page-clients-status/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                client_names: clientNames,
                                inspection_dates: clientData
                            })
                        });

                        if (!response.ok) {
                            throw new Error('HTTP error! status: ' + response.status);
                        }

                        const result = await response.json();

                        if (result.success) {
                            console.log('✅ Received file status data for all clients');

                            // Update button colors for each client
                            Object.entries(result.client_statuses).forEach(([clientName, statusData]) => {
                                console.log('🎨 Updating colors for ' + clientName + ': ' + statusData.file_status);
                                updateViewFilesButtonColor(clientName, statusData.file_status);
                            });

                            console.log('🎨 Completed automatic color update for all buttons');
                        } else {
                            console.error('❌ Error getting file status:', result.error);
                        }

                    } catch (error) {
                        console.error('❌ Error updating View Files button colors:', error);

                        // Reset loading state on error
                        allViewFilesButtons.forEach(button => {
                            const icon = button.querySelector('i');
                            if (icon) {
                                icon.className = 'fas fa-download';
                                icon.style.color = '#6b7280';
                            }
                            button.title = 'View Files';
                        });
                    }
                }

                // Helper function to get CSRF token
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

                // Setup expand buttons function
                function setupExpandButtons() {
                    console.log('[DEBUG] Setting up expand button event listeners');
                    const expandButtons = document.querySelectorAll('.expand-btn');
                    console.log('[DEBUG] Found expand buttons:', expandButtons.length);

                    if (expandButtons.length === 0) {
                        console.warn('[WARNING] No expand buttons found!');
                        return;
                    }

                    expandButtons.forEach((button, index) => {
                        console.log('[DEBUG] Setting up button ' + index + ':', button);
                        console.log('[DEBUG] Button group ID:', button.getAttribute('data-group-id'));
                        // Remove any existing listeners to avoid duplicates
                        button.removeEventListener('click', handleExpandClick);
                        button.addEventListener('click', handleExpandClick);
                    });
                };

                // Handle expand button click
                function handleExpandClick(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Check if this is a "New" client row (greyed out)
                    const row = this.closest('tr.greyed-out-group');
                    if (row) {
                        console.log('🚫 Expand button clicked for "New" client - action blocked');
                        return; // Prevent expansion for "New" clients
                    }

                    const groupId = this.getAttribute('data-group-id');
                    console.log('Expand button clicked for group:', groupId);
                    toggleGroup(e, groupId);
                }

                // Simple, clean expand button functionality
                document.addEventListener('click', function (e) {
                    if (e.target.closest('.expand-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const button = e.target.closest('.expand-btn');
                        const groupId = button.getAttribute('data-group-id');
                        console.log('[DEBUG] Expand button clicked for group:', groupId);
                        toggleGroup(e, groupId);
                    }
                });

                // Initialize page functionality when DOM is ready
                document.addEventListener('DOMContentLoaded', function () {
                    console.log('🚀 [FRONTEND] DOM ready, initializing page functionality...');

                    // Update View Files button colors with delays
                    setTimeout(function () {
                        console.log('🎨 [FRONTEND] Starting initial automatic color update...');
                        updateAllViewFilesButtonColors();
                    }, 1000);

                    setTimeout(function () {
                        console.log('🔄 [FRONTEND] Retrying automatic color update...');
                        updateAllViewFilesButtonColors();
                    }, 3000);

                    // Fix header positions when expanding
                    setupHeaderPositionFix();
                });

                // Function to fix header positions when expanding/collapsing
                function setupHeaderPositionFix() {
                    console.log('[DEBUG] Setting up header position fix...');

                    // Add event listeners to all expand buttons
                    document.addEventListener('click', function (e) {
                        if (e.target.closest('.expand-btn')) {
                            console.log('🔄 Expand button clicked, fixing header positions...');
                            setTimeout(fixHeaderPositions, 100);
                        }
                    });

                    // Also fix on window resize
                    window.addEventListener('resize', function () {
                        setTimeout(fixHeaderPositions, 100);
                    });
                };

                // Function to force header positions to stay in place
                function fixHeaderPositions() {
                    const table = document.getElementById('shipmentsTable');
                    if (!table) return;

                    const thead = table.querySelector('thead');
                    if (!thead) return;

                    // Force the header to maintain its position
                    thead.style.position = 'sticky';
                    thead.style.top = '0';
                    thead.style.zIndex = '100';
                    thead.style.backgroundColor = '#f8f9fa';

                    // Force all header cells to maintain their width
                    const headerCells = thead.querySelectorAll('th');
                    headerCells.forEach((cell, index) => {
                        cell.style.position = 'sticky';
                        cell.style.top = '0';
                        cell.style.zIndex = '100';
                        cell.style.backgroundColor = '#f8f9fa';

                        // Force specific widths for problematic columns
                        if (cell.classList.contains('col-km')) {
                            cell.style.width = '120px';
                            cell.style.minWidth = '120px';
                            cell.style.maxWidth = '120px';
                        }
                        if (cell.classList.contains('col-hours')) {
                            cell.style.width = '120px';
                            cell.style.minWidth = '120px';
                            cell.style.maxWidth = '120px';
                        }
                    });

                    // Fix detail table width constraints to prevent main table shifting
                    const detailTables = document.querySelectorAll('.detail-table');
                    detailTables.forEach(detailTable => {
                        detailTable.style.maxWidth = '100%';
                        detailTable.style.minWidth = '100%';
                    });

                    const detailWrappers = document.querySelectorAll('.detail-table-wrapper');
                    detailWrappers.forEach(wrapper => {
                        wrapper.style.maxWidth = 'calc(100vw - 100px)';
                        wrapper.style.overflowX = 'auto';
                    });

                    console.log('✅ Header positions fixed and detail table constrained');
                }
                // Upload RFI function
                function uploadRFI(groupId) {
                    console.log('[DEBUG] uploadRFI called with groupId:', groupId);
                    console.log('[DEBUG] Function execution starting...');

                    // Validate that groupId is provided
                    if (!groupId) {
                        alert('Error: Unable to upload RFI - missing group ID. Please refresh the page and try again.');
                        console.error('[UPLOAD] Missing groupId for RFI upload');
                        return;
                    }

                    // Get button elements for loading state
                    const desktopBtn = document.getElementById('rfi-' + groupId);
                    const mobileBtn = document.getElementById('rfi-mobile-' + groupId);

                    // Store original button states
                    let desktopOriginalHTML = '';
                    let mobileOriginalHTML = '';

                    // Helper to show loading state
                    function showRFILoading() {
                        if (desktopBtn) {
                            desktopOriginalHTML = desktopBtn.innerHTML;
                            desktopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                            desktopBtn.disabled = true;
                            desktopBtn.style.cursor = 'not-allowed';
                        }
                        if (mobileBtn) {
                            mobileOriginalHTML = mobileBtn.innerHTML;
                            mobileBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Uploading...';
                            mobileBtn.disabled = true;
                            mobileBtn.style.cursor = 'not-allowed';
                        }
                    }

                    // Helper to hide loading state
                    function hideRFILoading(success) {
                        if (desktopBtn) {
                            desktopBtn.disabled = false;
                            desktopBtn.style.cursor = 'pointer';
                            if (!success) {
                                desktopBtn.innerHTML = desktopOriginalHTML || 'RFI';
                            }
                        }
                        if (mobileBtn) {
                            mobileBtn.disabled = false;
                            mobileBtn.style.cursor = 'pointer';
                            if (!success) {
                                mobileBtn.innerHTML = mobileOriginalHTML || '<i class="fas fa-file-alt mr-1"></i> RFI';
                            }
                        }
                    }

                    try {
                        // Create a file input element
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = '.pdf';
                        fileInput.style.display = 'none';

                        console.log('✅ File input element created successfully');

                        fileInput.onchange = function (e) {
                            const file = e.target.files[0];
                            if (file) {
                                // Additional client-side PDF validation
                                if (!file.name.toLowerCase().endsWith('.pdf')) {
                                    alert('Only PDF files are allowed. Please select a PDF document.');
                                    return;
                                }

                                // Show loading state
                                showRFILoading();

                                // Create form data
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('group_id', groupId);
                                formData.append('document_type', 'rfi');

                                // Get CSRF token
                                const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                                    window.DJANGO_CONFIG.csrfToken;
                                formData.append('csrfmiddlewaretoken', csrfToken);

                                // Upload file
                                fetch('/upload-document/', {
                                    method: 'POST',
                                    body: formData
                                })
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.success) {
                                            console.log('✅ RFI uploaded successfully!');
                                            hideRFILoading(true);
                                            markAsUploaded('rfi-' + groupId);

                                            // INSTANT UPDATE: Update View Files button immediately without checking files
                                            const button = document.getElementById('rfi-' + groupId);
                                            if (button) {
                                                const clientName = button.getAttribute('data-client-name');
                                                const inspectionDate = button.getAttribute('data-inspection-date');
                                                if (clientName && inspectionDate) {
                                                    instantUpdateViewFilesButton(clientName, inspectionDate, 'RFI');
                                                }
                                            }

                                            // Auto-open files popup after successful upload
                                            const button2 = document.getElementById('rfi-' + groupId);
                                            if (button2) {
                                                const clientName = button2.getAttribute('data-client-name');
                                                const inspectionDate = button2.getAttribute('data-inspection-date');
                                                if (clientName && inspectionDate) {
                                                    // Longer delay to ensure the upload is processed and indexed
                                                    setTimeout(() => {
                                                        openFilesPopup(groupId, clientName, inspectionDate);
                                                    }, 2500);
                                                }
                                            }
                                        } else {
                                            hideRFILoading(false);
                                            alert('Error uploading RFI: ' + data.error);
                                        }
                                    })
                                    .catch(error => {
                                        hideRFILoading(false);
                                        alert('Error uploading RFI: ' + error.message);
                                    });
                            }
                        };

                        console.log('✅ File input onchange handler set');

                        // Trigger file selection
                        document.body.appendChild(fileInput);
                        console.log('✅ File input appended to body');

                        fileInput.click();
                        console.log('✅ File input click() triggered - dialog should open now');

                        document.body.removeChild(fileInput);
                        console.log('✅ File input removed from body');

                    } catch (error) {
                        console.error('❌ Error in uploadRFI function:', error);
                        alert('Error in upload function: ' + error.message);
                    }
                }

                // Upload Occurrence function
                function uploadOccurrence(groupId) {
                    console.log('[DEBUG] uploadOccurrence called with groupId:', groupId);
                    console.log('[DEBUG] Function execution starting...');

                    // Validate that groupId is provided
                    if (!groupId) {
                        alert('Error: Unable to upload occurrence - missing group ID. Please refresh the page and try again.');
                        console.error('[UPLOAD] Missing groupId for occurrence upload');
                        return;
                    }

                    // Get button elements for loading state
                    const desktopBtn = document.getElementById('occurrence-' + groupId);
                    const mobileBtn = document.getElementById('occurrence-mobile-' + groupId);

                    // Store original button states
                    let desktopOriginalHTML = '';
                    let mobileOriginalHTML = '';

                    // Helper to show loading state
                    function showOccurrenceLoading() {
                        if (desktopBtn) {
                            desktopOriginalHTML = desktopBtn.innerHTML;
                            desktopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                            desktopBtn.disabled = true;
                            desktopBtn.style.cursor = 'not-allowed';
                        }
                        if (mobileBtn) {
                            mobileOriginalHTML = mobileBtn.innerHTML;
                            mobileBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Uploading...';
                            mobileBtn.disabled = true;
                            mobileBtn.style.cursor = 'not-allowed';
                        }
                    }

                    // Helper to hide loading state (only on error)
                    function hideOccurrenceLoading() {
                        if (desktopBtn) {
                            desktopBtn.disabled = false;
                            desktopBtn.style.cursor = 'pointer';
                            desktopBtn.innerHTML = desktopOriginalHTML || '<i class="fas fa-upload"></i>';
                        }
                        if (mobileBtn) {
                            mobileBtn.disabled = false;
                            mobileBtn.style.cursor = 'pointer';
                            mobileBtn.innerHTML = mobileOriginalHTML || '<i class="fas fa-upload mr-1"></i> Upload';
                        }
                    }

                    try {
                        // Create a file input element
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = '.pdf';
                        fileInput.style.display = 'none';

                        console.log('✅ File input element created successfully');

                        fileInput.onchange = function (e) {
                            const file = e.target.files[0];
                            if (file) {
                                // Additional client-side PDF validation
                                if (!file.name.toLowerCase().endsWith('.pdf')) {
                                    alert('Only PDF files are allowed. Please select a PDF document.');
                                    return;
                                }

                                // Show loading state
                                showOccurrenceLoading();

                                // Create form data
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('group_id', groupId);
                                formData.append('document_type', 'occurrence');

                                // Get CSRF token
                                const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                                    window.DJANGO_CONFIG.csrfToken;
                                formData.append('csrfmiddlewaretoken', csrfToken);

                                // Upload file
                                fetch('/upload-document/', {
                                    method: 'POST',
                                    body: formData
                                })
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.success) {
                                            console.log('✅ Occurrence uploaded successfully!');

                                            // CRITICAL: Update BOTH desktop and mobile Occurrence buttons
                                            const desktopButtonId = 'occurrence-' + groupId;
                                            const mobileButtonId = 'occurrence-mobile-' + groupId;
                                            const desktopButton = document.getElementById(desktopButtonId);
                                            const mobileButton = document.getElementById(mobileButtonId);

                                            const buttonsToUpdate = [];
                                            if (desktopButton) buttonsToUpdate.push({ button: desktopButton, type: 'desktop' });
                                            if (mobileButton) buttonsToUpdate.push({ button: mobileButton, type: 'mobile' });

                                            if (buttonsToUpdate.length > 0) {
                                                buttonsToUpdate.forEach(({ button, type }) => {
                                                    console.log(`✅ Marking ${type} Occurrence button as uploaded`);
                                                    // Update button to green success state
                                                    button.disabled = true;
                                                    button.className = 'btn btn-sm btn-success w-full bg-green-500 text-white py-2 px-3 rounded-lg text-xs font-medium';
                                                    button.style.backgroundColor = '#28a745';
                                                    button.style.borderColor = '#28a745';
                                                    button.style.color = 'white';
                                                    button.innerHTML = '<i class="fas fa-check mr-1"></i> Upload';
                                                    button.title = 'Occurrence file exists';
                                                });
                                                console.log(`✅ Updated ${buttonsToUpdate.length} Occurrence button(s) to green`);
                                            }

                                            // INSTANT UPDATE: Update View Files button immediately without checking files
                                            const buttonWithData = desktopButton || mobileButton;
                                            if (buttonWithData) {
                                                const clientName = buttonWithData.getAttribute('data-client-name');
                                                const inspectionDate = buttonWithData.getAttribute('data-inspection-date');
                                                if (clientName && inspectionDate) {
                                                    instantUpdateViewFilesButton(clientName, inspectionDate, 'Occurrence');
                                                }
                                            }

                                            // Auto-open files popup after successful upload
                                            const buttonWithData2 = desktopButton || mobileButton;
                                            if (buttonWithData2) {
                                                const clientName = buttonWithData2.getAttribute('data-client-name');
                                                const inspectionDate = buttonWithData2.getAttribute('data-inspection-date');
                                                if (clientName && inspectionDate) {
                                                    // Longer delay to ensure the upload is processed and indexed
                                                    setTimeout(() => {
                                                        openFilesPopup(groupId, clientName, inspectionDate);
                                                    }, 2500);
                                                }
                                            }
                                        } else {
                                            hideOccurrenceLoading();
                                            alert('Error uploading Occurrence: ' + data.error);
                                        }
                                    })
                                    .catch(error => {
                                        hideOccurrenceLoading();
                                        alert('Error uploading Occurrence: ' + error.message);
                                    });
                            }
                        };

                        console.log('✅ File input onchange handler set');

                        // Trigger file selection
                        document.body.appendChild(fileInput);
                        console.log('✅ File input appended to body');

                        fileInput.click();
                        console.log('✅ File input click() triggered - dialog should open now');

                        document.body.removeChild(fileInput);
                        console.log('✅ File input removed from body');

                    } catch (error) {
                        console.error('❌ Error in uploadOccurrence function:', error);
                        alert('Error in upload function: ' + error.message);
                    }
                }

                // Note: uploadComposition function is now in upload_functions.js

                // Upload Invoice function
                function uploadInvoice(groupId) {
                    // Get button elements for loading state
                    const desktopBtn = document.getElementById('invoice-' + groupId);
                    const mobileBtn = document.getElementById('invoice-mobile-' + groupId);

                    // Store original button states
                    let desktopOriginalHTML = '';
                    let mobileOriginalHTML = '';

                    // Helper to show loading state
                    function showInvoiceLoading() {
                        if (desktopBtn) {
                            desktopOriginalHTML = desktopBtn.innerHTML;
                            desktopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                            desktopBtn.disabled = true;
                            desktopBtn.style.cursor = 'not-allowed';
                        }
                        if (mobileBtn) {
                            mobileOriginalHTML = mobileBtn.innerHTML;
                            mobileBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Uploading...';
                            mobileBtn.disabled = true;
                            mobileBtn.style.cursor = 'not-allowed';
                        }
                    }

                    // Helper to hide loading state
                    function hideInvoiceLoading(success) {
                        if (desktopBtn) {
                            desktopBtn.disabled = false;
                            desktopBtn.style.cursor = 'pointer';
                            if (!success) {
                                desktopBtn.innerHTML = desktopOriginalHTML || 'Invoice';
                            }
                        }
                        if (mobileBtn) {
                            mobileBtn.disabled = false;
                            mobileBtn.style.cursor = 'pointer';
                            if (!success) {
                                mobileBtn.innerHTML = mobileOriginalHTML || '<i class="fas fa-file-invoice mr-1"></i> Invoice';
                            }
                        }
                    }

                    // Create a file input element
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            // Additional client-side PDF validation
                            if (!file.name.toLowerCase().endsWith('.pdf')) {
                                alert('Only PDF files are allowed. Please select a PDF document.');
                                return;
                            }

                            // Show loading state
                            showInvoiceLoading();

                            // Create form data
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('group_id', groupId);
                            formData.append('document_type', 'invoice');

                            // Get CSRF token
                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                                window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            // Upload file
                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        console.log('✅ Invoice uploaded successfully!');
                                        hideInvoiceLoading(true);
                                        console.log('[DEBUG] About to call markAsUploaded for invoice-' + groupId);
                                        markAsUploaded('invoice-' + groupId);
                                        console.log('[DEBUG] markAsUploaded called for invoice-' + groupId);

                                        // INSTANT UPDATE: Update View Files button immediately without checking files
                                        const button = document.getElementById('invoice-' + groupId);
                                        if (button) {
                                            const clientName = button.getAttribute('data-client-name');
                                            const inspectionDate = button.getAttribute('data-inspection-date');
                                            if (clientName && inspectionDate) {
                                                instantUpdateViewFilesButton(clientName, inspectionDate, 'Invoice');
                                            }
                                        }

                                        // Auto-open files popup after successful upload
                                        const button2 = document.getElementById('invoice-' + groupId);
                                        if (button2) {
                                            const clientName = button2.getAttribute('data-client-name');
                                            const inspectionDate = button2.getAttribute('data-inspection-date');
                                            if (clientName && inspectionDate) {
                                                // Longer delay to ensure the upload is processed and indexed
                                                setTimeout(() => {
                                                    openFilesPopup(groupId, clientName, inspectionDate);
                                                }, 2500);
                                            }
                                        }
                                    } else {
                                        hideInvoiceLoading(false);
                                        alert('Error uploading Invoice: ' + data.error);
                                    }
                                })
                                .catch(error => {
                                    hideInvoiceLoading(false);
                                    alert('Error uploading Invoice: ' + error.message);
                                });
                        }
                    };

                    // Trigger file selection
                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                }

                // Upload Lab function
                window.uploadLab = function uploadLab(inspectionId) {
                    // Create a file input element
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            // Additional client-side PDF validation
                            if (!file.name.toLowerCase().endsWith('.pdf')) {
                                alert('Only PDF files are allowed. Please select a PDF document.');
                                return;
                            }
                            // Get the group_id from the button's data attribute
                            const button = document.getElementById('lab-' + inspectionId);
                            let groupId = null;
                            if (button) {
                                groupId = button.getAttribute('data-group-id');
                            }

                            // Create form data
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('inspection_id', inspectionId);
                            formData.append('document_type', 'lab');
                            if (groupId) {
                                formData.append('group_id', groupId);
                            }

                            // Get CSRF token
                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                                window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            // Upload file
                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    console.log('Lab upload response:', data);
                                    if (data.success) {
                                        console.log('✅ Lab report uploaded successfully!');
                                        console.log('Marking lab button as uploaded:', 'lab-' + inspectionId);
                                        markAsUploaded('lab-' + inspectionId);

                                        // Auto-open files popup after successful upload
                                        const button = document.getElementById('lab-' + inspectionId);
                                        if (button) {
                                            const groupId = button.getAttribute('data-group-id');
                                            const clientName = button.getAttribute('data-client-name');
                                            const inspectionDate = button.getAttribute('data-inspection-date');
                                            if (groupId && clientName && inspectionDate) {
                                                // Longer delay to ensure the upload is processed and indexed
                                                setTimeout(() => {
                                                    openFilesPopup(groupId, clientName, inspectionDate);
                                                }, 2500);
                                            }
                                        }
                                    } else {
                                        console.error('❌ Error uploading Lab report:', data.error);
                                    }
                                })
                                .catch(error => {
                                    console.error('❌ Error uploading Lab report:', error.message);
                                });
                        }
                    };

                    // Trigger file selection
                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                }

                // Upload Lab Form function
                window.uploadLabForm = function uploadLabForm(inspectionId) {
                    // Create a file input element
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            // Additional client-side PDF validation
                            if (!file.name.toLowerCase().endsWith('.pdf')) {
                                alert('Only PDF files are allowed. Please select a PDF document.');
                                return;
                            }
                            // Get the group_id from the button's data attribute
                            const button = document.getElementById('lab-form-' + inspectionId);
                            let groupId = null;
                            if (button) {
                                groupId = button.getAttribute('data-group-id');
                            }

                            // Create form data
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('inspection_id', inspectionId);
                            formData.append('document_type', 'lab_form');
                            if (groupId) {
                                formData.append('group_id', groupId);
                            }

                            // Get CSRF token
                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                                window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            // Upload file
                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    console.log('Lab form upload response:', data);
                                    if (data.success) {
                                        console.log('✅ Lab form submission uploaded successfully!');
                                        console.log('Marking lab form button as uploaded:', 'lab-form-' + inspectionId);
                                        markAsUploaded('lab-form-' + inspectionId);

                                        // Auto-open files popup after successful upload
                                        const button = document.getElementById('lab-form-' + inspectionId);
                                        if (button) {
                                            const groupId = button.getAttribute('data-group-id');
                                            const clientName = button.getAttribute('data-client-name');
                                            const inspectionDate = button.getAttribute('data-inspection-date');
                                            if (groupId && clientName && inspectionDate) {
                                                // Longer delay to ensure the upload is processed and indexed
                                                setTimeout(() => {
                                                    openFilesPopup(groupId, clientName, inspectionDate);
                                                }, 2500);
                                            }
                                        }
                                    } else {
                                        console.error('❌ Error uploading Lab form submission:', data.error);
                                    }
                                })
                                .catch(error => {
                                    console.error('❌ Error uploading Lab form submission:', error.message);
                                });
                        }
                    };

                    // Trigger file selection
                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                }

                // Upload Retest function - accepts both groupId and inspectionId (same as other uploads)
                window.uploadRetest = function uploadRetest(groupId, inspectionId) {
                    console.log('window.uploadRetest called with groupId:', groupId, 'inspectionId:', inspectionId);

                    if (!groupId && !inspectionId) {
                        alert('Error: Group ID or Inspection ID is required');
                        return;
                    }

                    // Create a file input element
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            // Additional client-side PDF validation
                            if (!file.name.toLowerCase().endsWith('.pdf')) {
                                alert('Only PDF files are allowed. Please select a PDF document.');
                                return;
                            }

                            // Create form data - send both group_id and inspection_id (same as other uploads)
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('document_type', 'retest');
                            if (groupId) formData.append('group_id', groupId);
                            if (inspectionId) formData.append('inspection_id', inspectionId);

                            // Get CSRF token
                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                                window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            console.log('Uploading retest with group_id:', groupId);

                            // Upload file
                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    console.log('Retest upload response:', data);
                                    if (data.success) {
                                        alert(data.message || 'Retest document uploaded successfully!');
                                        console.log('✅ Retest report uploaded successfully!');

                                        // Update button to green
                                        const desktopBtn = document.getElementById('retest-btn-' + groupId);
                                        const mobileBtn = document.getElementById('retest-btn-' + groupId);

                                        [desktopBtn, mobileBtn].forEach(btn => {
                                            if (btn) {
                                                btn.style.backgroundColor = '#22c55e';
                                                btn.style.borderColor = '#22c55e';
                                                btn.disabled = true;
                                                btn.title = 'Retest file uploaded';
                                            }
                                        });

                                        // Refresh button colors
                                        if (typeof updateAllViewFilesButtonColors === 'function') {
                                            setTimeout(() => updateAllViewFilesButtonColors(), 2000);
                                        }
                                    } else {
                                        alert(data.error || 'Failed to upload retest document');
                                        console.error('❌ Error uploading Retest report:', data.error);
                                    }
                                })
                                .catch(error => {
                                    alert('Error uploading retest document. Please try again.');
                                    console.error('❌ Error uploading Retest report:', error.message);
                                });
                        }
                    };

                    // Trigger file selection
                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                }

                // ============================================
                // Inspection-level upload functions
                // ============================================

                // Upload Lab/COA for a specific inspection
                window.uploadLabForInspection = function (productId, groupId) {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            if (!file.name.toLowerCase().endsWith('.pdf')) {
                                alert('Only PDF files are allowed for lab/COA documents.');
                                return;
                            }

                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('inspection_id', productId);
                            formData.append('document_type', 'lab');
                            formData.append('group_id', groupId);

                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        console.log('✅ Lab/COA uploaded for inspection ' + productId);
                                        // Turn button green
                                        const btn = document.querySelector('.upload-btn[data-type="lab"][data-id="' + productId + '"]');
                                        if (btn) btn.style.background = '#22c55e';
                                        alert('Lab/COA document uploaded successfully!');
                                    } else {
                                        console.error('❌ Error uploading lab:', data.error);
                                        alert('Error uploading lab/COA: ' + (data.error || 'Unknown error'));
                                    }
                                })
                                .catch(error => {
                                    console.error('❌ Error uploading lab:', error);
                                    alert('Error uploading lab/COA: ' + error.message);
                                });
                        }
                    };

                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                };

                // Upload Invoice for a specific inspection
                window.uploadInvoiceForInspection = function (productId, groupId) {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf,.jpg,.jpeg,.png';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('inspection_id', productId);
                            formData.append('document_type', 'invoice');
                            formData.append('group_id', groupId);

                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        console.log('✅ Invoice uploaded for inspection ' + productId);
                                        // Turn button green
                                        const btn = document.querySelector('.upload-btn[data-type="invoice"][data-id="' + productId + '"]');
                                        if (btn) btn.style.background = '#22c55e';
                                        alert('Invoice uploaded successfully!');
                                    } else {
                                        console.error('❌ Error uploading invoice:', data.error);
                                        alert('Error uploading invoice: ' + (data.error || 'Unknown error'));
                                    }
                                })
                                .catch(error => {
                                    console.error('❌ Error uploading invoice:', error);
                                    alert('Error uploading invoice: ' + error.message);
                                });
                        }
                    };

                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                };

                // Upload Occurrence for a specific inspection
                window.uploadOccurrenceForInspection = function (productId, groupId) {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf,.jpg,.jpeg,.png';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('inspection_id', productId);
                            formData.append('document_type', 'occurrence');
                            formData.append('group_id', groupId);

                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        console.log('✅ Occurrence uploaded for inspection ' + productId);
                                        // Turn button green
                                        const btn = document.querySelector('.upload-btn[data-type="occurrence"][data-id="' + productId + '"]');
                                        if (btn) btn.style.background = '#22c55e';
                                        alert('Occurrence uploaded successfully!');
                                    } else {
                                        console.error('❌ Error uploading occurrence:', data.error);
                                        alert('Error uploading occurrence: ' + (data.error || 'Unknown error'));
                                    }
                                })
                                .catch(error => {
                                    console.error('❌ Error uploading occurrence:', error);
                                    alert('Error uploading occurrence: ' + error.message);
                                });
                        }
                    };

                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                };

                // Upload Lab Form for a specific inspection
                window.uploadLabFormForInspection = function (productId, groupId) {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf,.jpg,.jpeg,.png';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('inspection_id', productId);
                            formData.append('document_type', 'lab_form');
                            formData.append('group_id', groupId);

                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        console.log('✅ Lab Form uploaded for inspection ' + productId);
                                        // Turn ALL lab_form buttons green for this product
                                        const allLabFormBtns = document.querySelectorAll('[data-upload-btn="lab_form-' + productId + '"]');
                                        console.log('🟢 [LAB FORM] Found ' + allLabFormBtns.length + ' buttons to update for product ' + productId);
                                        allLabFormBtns.forEach(function (btn, idx) {
                                            btn.style.backgroundColor = '#22c55e';
                                            btn.style.borderColor = '#22c55e';
                                            btn.style.background = '#22c55e';
                                            btn.disabled = false;
                                            btn.style.cursor = 'pointer';
                                            btn.title = 'Lab Form file exists - click to upload more';
                                            console.log('🟢 [LAB FORM] Updated button ' + (idx + 1) + ' to GREEN');
                                        });
                                        // Also mark in localStorage to persist across page refreshes
                                        try {
                                            const uploadStatus = JSON.parse(localStorage.getItem('labFormUploadStatus') || '{}');
                                            uploadStatus['lab_form-' + productId] = true;
                                            localStorage.setItem('labFormUploadStatus', JSON.stringify(uploadStatus));
                                        } catch (e) {
                                            console.error('Error saving lab form upload status:', e);
                                        }
                                        alert('Lab Form uploaded successfully!');
                                    } else {
                                        console.error('❌ Error uploading lab form:', data.error);
                                        alert('Error uploading lab form: ' + (data.error || 'Unknown error'));
                                    }
                                })
                                .catch(error => {
                                    console.error('❌ Error uploading lab form:', error);
                                    alert('Error uploading lab form: ' + error.message);
                                });
                        }
                    };

                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                };

                // Upload Other file for a specific inspection
                window.uploadOtherForInspection = function (productId, groupId) {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('inspection_id', productId);
                            formData.append('document_type', 'other');
                            formData.append('group_id', groupId);

                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        console.log('✅ Other file uploaded for inspection ' + productId);
                                        // Turn button green but keep enabled for multiple uploads
                                        const btn = document.querySelector('[data-upload-btn="other-' + productId + '"]');
                                        if (btn) {
                                            btn.style.backgroundColor = '#22c55e';
                                            btn.style.borderColor = '#22c55e';
                                            btn.disabled = false;
                                            btn.style.cursor = 'pointer';
                                            btn.title = 'Other file exists - click to upload more';
                                        }
                                        alert('File uploaded successfully!');
                                    } else {
                                        console.error('❌ Error uploading file:', data.error);
                                        alert('Error uploading file: ' + (data.error || 'Unknown error'));
                                    }
                                })
                                .catch(error => {
                                    console.error('❌ Error uploading file:', error);
                                    alert('Error uploading file: ' + error.message);
                                });
                        }
                    };

                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                };

                // View document for a specific inspection by type
                window.viewDocForInspection = function (productId, docType) {
                    fetch('/list-uploaded-files/?inspection_id=' + productId)
                        .then(response => response.json())
                        .then(data => {
                            if (data.error) {
                                alert('Error: ' + data.error);
                                return;
                            }
                            // Check if we have files for this document type
                            const files = data.files || data;
                            const typeFiles = files[docType] || [];
                            if (typeFiles.length > 0) {
                                // Open the first file in a new tab
                                const file = typeFiles[0];
                                // Use download endpoint with action=view instead of direct /media/ URL
                                const filePath = file.relative_path || file.path;
                                const url = filePath ? '/inspections/download-file/?file=' + encodeURIComponent(filePath) + '&action=view' : null;
                                if (url) {
                                    window.open(url, '_blank');
                                } else {
                                    alert('No viewable URL for this document.');
                                }
                            } else {
                                alert('No ' + docType + ' document found for this inspection.');
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching document:', error);
                            alert('Error fetching document: ' + error.message);
                        });
                };

                // Delete document for a specific inspection by type
                window.deleteDocForInspection = function (productId, docType) {
                    if (!confirm('Are you sure you want to delete the ' + docType + ' document for this inspection?')) {
                        return;
                    }

                    // First get the files to find the file path
                    fetch('/list-uploaded-files/?inspection_id=' + productId)
                        .then(response => response.json())
                        .then(data => {
                            if (data.error) {
                                alert('Error: ' + data.error);
                                return;
                            }
                            const files = data.files || data;
                            const typeFiles = files[docType] || [];
                            if (typeFiles.length === 0) {
                                alert('No ' + docType + ' document found to delete.');
                                return;
                            }

                            // Get the file to delete
                            const file = typeFiles[0];
                            const filePath = file.relative_path || file.path;

                            if (!filePath) {
                                alert('Could not determine file path for deletion.');
                                return;
                            }

                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;

                            // Now delete the file
                            fetch('/delete-inspection-file/', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': csrfToken
                                },
                                body: JSON.stringify({
                                    file_path: filePath,
                                    client_name: file.client_name || '',
                                    inspection_date: file.inspection_date || ''
                                })
                            })
                                .then(response => response.json())
                                .then(deleteData => {
                                    if (deleteData.success) {
                                        console.log('✅ ' + docType + ' deleted for inspection ' + productId);
                                        // Turn button back to grey
                                        const btn = document.querySelector('.upload-btn[data-type="' + docType + '"][data-id="' + productId + '"]');
                                        if (btn) btn.style.background = '#6b7280';
                                        alert(docType.charAt(0).toUpperCase() + docType.slice(1) + ' document deleted successfully!');
                                    } else {
                                        console.error('❌ Error deleting ' + docType + ':', deleteData.error);
                                        alert('Error deleting ' + docType + ': ' + (deleteData.error || 'Unknown error'));
                                    }
                                })
                                .catch(error => {
                                    console.error('❌ Error deleting ' + docType + ':', error);
                                    alert('Error deleting ' + docType + ': ' + error.message);
                                });
                        })
                        .catch(error => {
                            console.error('❌ Error fetching files for deletion:', error);
                            alert('Error fetching files: ' + error.message);
                        });
                };

                // View files for a specific inspection
                window.viewFilesForInspection = function (productId, commodity) {
                    const modal = document.getElementById('filesModal');
                    const modalTitle = document.getElementById('modalTitle');
                    const filesLoading = document.getElementById('filesLoading');
                    const filesContent = document.getElementById('filesContent');
                    const downloadBtn = document.getElementById('downloadAllBtn');

                    modalTitle.textContent = 'Files for ' + commodity + ' (Inspection #' + productId + ')';
                    modal.style.display = 'block';
                    downloadBtn.style.display = 'none';

                    filesLoading.style.display = 'block';
                    filesContent.style.display = 'none';

                    // Load files for this specific inspection
                    fetch('/inspections/files/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCSRFToken()
                        },
                        body: JSON.stringify({
                            inspection_id: productId
                        })
                    })
                        .then(response => response.json())
                        .then(result => {
                            filesLoading.style.display = 'none';
                            filesContent.style.display = 'block';

                            const filesList = document.getElementById('filesList');
                            if (result.success && result.files) {
                                const hasFiles = Object.values(result.files).some(arr => arr && arr.length > 0);
                                if (hasFiles) {
                                    displayFiles(result.files);
                                } else {
                                    filesList.innerHTML = '<div style="text-align: center; padding: 30px; color: #6b7280;"><i class="fas fa-folder-open" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>No files uploaded for this inspection yet</div>';
                                }
                            } else {
                                filesList.innerHTML = '<div style="text-align: center; padding: 30px; color: #6b7280;">No files found</div>';
                            }
                        })
                        .catch(error => {
                            filesLoading.style.display = 'none';
                            filesContent.style.display = 'block';
                            document.getElementById('filesList').innerHTML = '<div style="text-align: center; padding: 30px; color: #ef4444;">Error loading files: ' + error.message + '</div>';
                        });
                };

                // View all files for a group (alias for openFilesPopup)
                window.viewFilesForGroup = function (groupId, clientName, inspectionDate) {
                    openFilesPopup(groupId, clientName, inspectionDate);
                };

                // Update sample taken status function
                window.updateSampleTaken = function (checkbox) {
                    const inspectionId = checkbox.getAttribute('data-inspection-id');
                    const isSampleTaken = checkbox.checked;

                    // Get CSRF token
                    const csrfToken = getCSRFToken();

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('is_sample_taken', isSampleTaken);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-sample-taken/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] Sample taken status updated successfully');
                                // Show success feedback
                                checkbox.style.backgroundColor = isSampleTaken ? '#d4edda' : '#f8f9fa';
                                setTimeout(() => {
                                    checkbox.style.backgroundColor = '';
                                }, 500);

                                // Update the label text next to the checkbox
                                const label = checkbox.parentElement.querySelector('span.text-xs');
                                if (label) {
                                    label.innerHTML = isSampleTaken ?
                                        '<span class="text-green-600">✓ Yes</span>' :
                                        '<span class="text-gray-500">No</span>';
                                }

                                // Enable/disable related fields based on sample taken status
                                const productCard = checkbox.closest('.bg-white');
                                if (productCard) {
                                    // Find all fields that depend on sample taken status
                                    const testCheckboxes = productCard.querySelectorAll('.test-checkbox');
                                    const boughtSampleInput = productCard.querySelector('.bought-sample-input');
                                    const labDropdown = productCard.querySelector('.lab-dropdown');
                                    const retestDropdown = productCard.querySelector('.needs-retest-dropdown');

                                    [testCheckboxes, boughtSampleInput, labDropdown, retestDropdown].forEach(elements => {
                                        if (elements) {
                                            if (elements.length !== undefined) {
                                                // It's a collection
                                                elements.forEach(el => {
                                                    el.disabled = !isSampleTaken;
                                                    el.style.opacity = isSampleTaken ? '1' : '0.5';
                                                    el.style.cursor = isSampleTaken ? 'pointer' : 'not-allowed';
                                                    el.title = isSampleTaken ? '' : 'No sample taken';
                                                });
                                            } else {
                                                // It's a single element
                                                elements.disabled = !isSampleTaken;
                                                elements.style.opacity = isSampleTaken ? '1' : '0.5';
                                                elements.style.cursor = isSampleTaken ? 'pointer' : 'not-allowed';
                                                elements.title = isSampleTaken ? '' : 'No sample taken - cannot enter';
                                            }
                                        }
                                    });
                                }
                            } else {
                                // Revert checkbox state on error
                                checkbox.checked = !isSampleTaken;
                                alert('Error updating sample taken status: ' + data.error);
                            }
                        })
                        .catch(error => {
                            // Revert checkbox state on error
                            checkbox.checked = !isSampleTaken;
                            alert('Error updating sample taken status: ' + error.message);
                        });
                };

                // Update test result function
                window.updateTestResult = function (checkbox) {
                    const inspectionId = checkbox.getAttribute('data-inspection-id');
                    const testType = checkbox.getAttribute('data-test-type');
                    const isChecked = checkbox.checked;

                    // Get CSRF token
                    const csrfToken = getCSRFToken();

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('test_type', testType);
                    formData.append('test_result', isChecked);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-test-result/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Show success feedback
                                checkbox.style.backgroundColor = isChecked ? '#d4edda' : '#f8f9fa';
                                setTimeout(() => {
                                    checkbox.style.backgroundColor = '';
                                }, 500);
                            } else {
                                // Revert checkbox state on error
                                checkbox.checked = !isChecked;
                                alert('Error updating test result: ' + data.error);
                            }
                        })
                        .catch(error => {
                            // Revert checkbox state on error
                            checkbox.checked = !isChecked;
                            alert('Error updating test result: ' + error.message);
                        });
                };

                // Update needs retest function
                window.updateNeedsRetest = function (dropdown) {
                    const inspectionId = dropdown.getAttribute('data-inspection-id');
                    const needsRetest = dropdown.value;

                    // Check if dropdown is disabled (no sample taken)
                    if (dropdown.disabled) {
                        return; // Don't allow changes if disabled
                    }

                    // Get CSRF token
                    const csrfToken = getCSRFToken();

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('needs_retest', needsRetest);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-needs-retest/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Show success feedback
                                dropdown.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    dropdown.style.backgroundColor = '';
                                }, 500);

                                // Update button states based on retest selection
                                updateButtonStates(inspectionId, needsRetest);
                            } else {
                                // Revert dropdown state on error
                                dropdown.value = '';
                                alert('Error updating needs retest: ' + data.error);
                            }
                        })
                        .catch(error => {
                            // Revert dropdown state on error
                            dropdown.value = '';
                            alert('Error updating needs retest: ' + error.message);
                        });
                };

                // Update Km Traveled function
                function updateKmTraveled(input) {
                    const inspectionId = input.getAttribute('data-inspection-id');
                    const kmValue = input.value;

                    // Get CSRF token
                    const csrfToken = getCSRFToken();

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('km_traveled', kmValue);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-km-traveled/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Show success feedback
                                input.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    input.style.backgroundColor = '';
                                }, 500);
                            } else {
                                alert('Error updating Km Traveled: ' + data.error);
                            }
                        })
                        .catch(error => {
                            alert('Error updating Km Traveled: ' + error.message);
                        });
                };

                // Update Group Km Traveled
                window.updateGroupKmTraveled = function (input) {
                    const groupId = input.getAttribute('data-group-id');
                    const kmValue = input.value;

                    // Get CSRF token
                    const csrfToken = getCSRFToken();

                    // Create form data
                    const formData = new FormData();
                    formData.append('group_id', groupId);
                    formData.append('km_traveled', kmValue);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-group-km-traveled/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Show success feedback
                                input.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    input.style.backgroundColor = '';
                                }, 500);
                            } else {
                                alert('Error updating Group Km Traveled: ' + data.error);
                            }
                        })
                        .catch(error => {
                            alert('Error updating Group Km Traveled: ' + error.message);
                        });
                };

                // Update Group Hours
                window.updateGroupHours = function (input) {
                    const groupId = input.getAttribute('data-group-id');
                    const hoursValue = input.value;

                    // Get CSRF token
                    const csrfToken = getCSRFToken();

                    // Create form data
                    const formData = new FormData();
                    formData.append('group_id', groupId);
                    formData.append('hours', hoursValue);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-group-hours/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Show success feedback
                                input.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    input.style.backgroundColor = '';
                                }, 500);
                            } else {
                                alert('Error updating Group Hours: ' + data.error);
                            }
                        })
                        .catch(error => {
                            alert('Error updating Group Hours: ' + error.message);
                        });
                };

                // Bought Sample function is now defined earlier in the file (line ~4942)

                // Get CSRF Token function
                function getCSRFToken() {
                    const token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                    if (!token) {
                        console.error('CSRF token not found');
                        return '';
                    }
                    return token;
                }

                // KM, Hours, and Bought Sample functions are now defined earlier in the file (lines 4861-4980)
                console.log('✅ KM, Hours, and Bought Sample update functions ready');
                console.log('[DEBUG] updateGroupKmTraveled:', typeof window.updateGroupKmTraveled);
                console.log('[DEBUG] updateGroupHours:', typeof window.updateGroupHours);
                console.log('[DEBUG] updateBoughtSample:', typeof window.updateBoughtSample);



                // Update Product Name
                window.updateProductName = function (input) {
                    // Check if field is disabled (no sample taken)
                    if (input.disabled) {
                        console.log('Product name update blocked - no sample taken');
                        return;
                    }

                    const inspectionId = input.getAttribute('data-inspection-id');
                    const value = input.value;
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('product_name', value);
                    fetch('/update-product-name/', {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken') || '',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: formData
                    }).then(r => r.json()).then(data => {
                        if (!data.success) alert('Error updating product name: ' + (data.error || 'Unknown error'));
                    }).catch(err => alert('Error updating product name: ' + (err?.message || err)));
                }

                // Update Product Class - Simplified to only handle RAW and PMP
                window.updateProductClass = function (dropdown) {
                    // Check if field is disabled (no sample taken)
                    if (dropdown.disabled) {
                        console.log('Product class update blocked - no sample taken');
                        return;
                    }

                    // If commodity is egg/poultry, block updates and reset to empty
                    const commodity = (dropdown.getAttribute('data-commodity') || '').toLowerCase();
                    if (['egg', 'eggs', 'poultry', 'chicken'].includes(commodity)) {
                        dropdown.value = '';
                        // Remove has-value class for disabled dropdowns
                        dropdown.classList.remove('has-value');
                        alert('Product class is not applicable for Egg/Poultry commodities.');
                        return;
                    }

                    // Update border styling based on selection
                    console.log('[BORDER DEBUG] updateProductClass - Dropdown value:', dropdown.value);
                    console.log('[BORDER DEBUG] updateProductClass - Is empty?', !dropdown.value || dropdown.value === '');
                    console.log('[BORDER DEBUG] updateProductClass - Is placeholder?', dropdown.value === 'Select Class...');

                    if (dropdown.value && dropdown.value !== '' && dropdown.value !== 'Select Class...') {
                        dropdown.classList.add('has-value');
                        console.log('[BORDER DEBUG] updateProductClass - Added has-value class - should be GREEN');
                    } else {
                        dropdown.classList.remove('has-value');
                        console.log('[BORDER DEBUG] updateProductClass - Removed has-value class - should be RED');
                    }

                    // Simplified logic: Only RAW and PMP are allowed
                    const inspectionId = dropdown.getAttribute('data-inspection-id');
                    const value = dropdown.value;

                    // Send update to server
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('product_class', value);

                    fetch('/update-product-class/', {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken') || '',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: formData
                    }).then(r => r.json()).then(data => {
                        if (!data.success) alert('Error updating product class: ' + (data.error || 'Unknown error'));
                    }).catch(err => alert('Error updating product class: ' + (err?.message || err)));
                }

                // Manual trigger function for class dropdown population
                window.populateAllClassDropdowns = function () {
                    console.log('[MANUAL] Manually populating all class dropdowns...');
                    const allDropdowns = document.querySelectorAll('select.product-class-select');
                    console.log('[MANUAL] Found', allDropdowns.length, 'class dropdowns');
                    allDropdowns.forEach(window.filterClassOptions);
                };

                // Debug function to test class dropdown population
                window.debugClassDropdowns = function () {
                    console.log('[DEBUG] === CLASS DROPDOWN DEBUG ===');
                    const allDropdowns = document.querySelectorAll('select.product-class-select');
                    console.log('[DEBUG] Total class dropdowns found:', allDropdowns.length);

                    allDropdowns.forEach((dropdown, index) => {
                        console.log(`[DEBUG] Dropdown ${index + 1}:`, {
                            element: dropdown,
                            classes: dropdown.className,
                            options: dropdown.options.length,
                            value: dropdown.value,
                            dataAttributes: {
                                'data-inspection-id': dropdown.getAttribute('data-inspection-id'),
                                'data-commodity': dropdown.getAttribute('data-commodity'),
                                'data-current-class': dropdown.getAttribute('data-current-class')
                            }
                        });
                    });

                    // Test populating all dropdowns
                    console.log('[DEBUG] Testing population...');
                    allDropdowns.forEach(window.filterClassOptions);
                };

                // Test function for border styling
                window.testBorderStyling = function () {
                    console.log('[TEST] === BORDER STYLING TEST ===');
                    const allDropdowns = document.querySelectorAll('select.product-class-select');
                    console.log('[TEST] Found', allDropdowns.length, 'class dropdowns');

                    allDropdowns.forEach((dropdown, index) => {
                        console.log(`[TEST] Testing dropdown ${index + 1}:`);
                        console.log(`[TEST] - Current value: "${dropdown.value}"`);
                        console.log(`[TEST] - Has has-value class: ${dropdown.classList.contains('has-value')}`);
                        console.log(`[TEST] - Computed border color:`, window.getComputedStyle(dropdown).borderColor);

                        // Test setting to empty
                        console.log(`[TEST] - Setting to empty...`);
                        dropdown.value = '';
                        window.updateProductClass(dropdown);
                        console.log(`[TEST] - After empty: has-value class = ${dropdown.classList.contains('has-value')}`);

                        // Test setting to placeholder
                        console.log(`[TEST] - Setting to placeholder...`);
                        dropdown.value = 'Select Class...';
                        window.updateProductClass(dropdown);
                        console.log(`[TEST] - After placeholder: has-value class = ${dropdown.classList.contains('has-value')}`);

                        // Test setting to real value
                        console.log(`[TEST] - Setting to real value...`);
                        dropdown.value = 'Raw species sausage / wors';
                        window.updateProductClass(dropdown);
                        console.log(`[TEST] - After real value: has-value class = ${dropdown.classList.contains('has-value')}`);

                        console.log(`[TEST] - Final computed border color:`, window.getComputedStyle(dropdown).borderColor);
                        console.log('---');
                    });
                };

                // Note: Duplicate filterClassOptions function removed - using window.filterClassOptions defined earlier

                // Update Lab function
                window.updateLab = function (dropdown) {
                    const inspectionId = dropdown.getAttribute('data-inspection-id');
                    const labValue = dropdown.value;

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('lab', labValue);

                    // Send update request with CSRF header
                    fetch('/update-lab/', {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken') || '',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: formData
                    })
                        .then(async (response) => {
                            if (!response.ok) {
                                const text = await response.text();
                                throw new Error(text || ('HTTP ' + response.status));
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (data.success) {
                                dropdown.style.backgroundColor = '#d4edda';
                                setTimeout(() => { dropdown.style.backgroundColor = ''; }, 500);
                            } else {
                                alert('Error updating Lab: ' + (data.error || 'Unknown error'));
                            }
                        })
                        .catch(error => {
                            alert('Error updating Lab: ' + (error?.message || error));
                        });
                };

                // Function to handle sample status changes and update retest accordingly
                function handleSampleStatusChange(inspectionId, isSampleTaken) {
                    const dropdown = document.querySelector('select[data-inspection-id="' + inspectionId + '"]');
                    if (dropdown) {
                        if (!isSampleTaken) {
                            // No sample taken - disable dropdown and set to NO
                            dropdown.disabled = true;
                            dropdown.style.opacity = '0.5';
                            dropdown.style.cursor = 'not-allowed';
                            dropdown.value = 'NO';

                            // Update the database
                            updateNeedsRetest(dropdown);

                            // Disable both buttons
                            updateButtonStates(inspectionId, 'NO');
                        } else {
                            // Sample taken - enable dropdown
                            dropdown.disabled = false;
                            dropdown.style.opacity = '';
                            dropdown.style.cursor = '';

                            // Update button states based on current retest value
                            updateButtonStates(inspectionId, dropdown.value);
                        }
                    }
                }

                // Function to update button states based on retest selection
                function updateButtonStates(inspectionId, needsRetest) {
                    const labButton = document.getElementById('lab-' + inspectionId);
                    const retestButton = document.getElementById('retest-btn-' + inspectionId);
                    const needsRetestDropdown = document.querySelector('select[data-inspection-id="' + inspectionId + '"]');
                    const labDropdown = document.querySelector('select.lab-dropdown[data-inspection-id="' + inspectionId + '"]');

                    if (labButton && retestButton) {
                        // Check if sample was taken
                        const isSampleTaken = needsRetestDropdown && !needsRetestDropdown.disabled;

                        if (!isSampleTaken) {
                            // No sample taken - disable both buttons and lab dropdown
                            labButton.disabled = true;
                            labButton.style.opacity = '0.5';
                            labButton.style.cursor = 'not-allowed';
                            labButton.onclick = null;
                            labButton.title = 'No sample taken - Lab upload disabled';

                            retestButton.disabled = true;
                            retestButton.style.opacity = '0.5';
                            retestButton.style.cursor = 'not-allowed';
                            retestButton.onclick = null;
                            retestButton.title = 'No sample taken - Retest upload disabled';

                            // Disable lab dropdown
                            if (labDropdown) {
                                labDropdown.disabled = true;
                                labDropdown.style.opacity = '0.5';
                                labDropdown.style.cursor = 'not-allowed';
                                labDropdown.title = 'No sample taken - Lab selection disabled';
                            }
                        } else {
                            // Sample taken - enable lab button and lab dropdown
                            labButton.disabled = false;
                            labButton.style.opacity = '';
                            labButton.style.cursor = '';
                            labButton.onclick = function () { uploadLab(inspectionId); };
                            labButton.title = 'Lab result upload available';

                            // Enable lab dropdown
                            if (labDropdown) {
                                labDropdown.disabled = false;
                                labDropdown.style.opacity = '';
                                labDropdown.style.cursor = '';
                                labDropdown.title = 'Select laboratory for sample testing';
                            }

                            // Retest button is enabled ONLY if sample taken AND retest is YES (must upload document)
                            if (isSampleTaken && (needsRetest === 'YES' || needsRetest === 'yes')) {
                                retestButton.disabled = false;
                                retestButton.style.opacity = '1';
                                retestButton.style.cursor = 'pointer';
                                // DON'T override the onclick - keep the original template onclick handler
                                // which already has the correct groupId. Just ensure button is enabled.
                                retestButton.title = 'Retest required - Please upload retest document';
                            } else {
                                retestButton.disabled = true;
                                retestButton.style.opacity = '0.5';
                                retestButton.style.cursor = 'not-allowed';
                                retestButton.onclick = null;
                                if (needsRetest === 'NO' || needsRetest === 'no') {
                                    retestButton.title = 'No retest required - Upload disabled';
                                } else if (needsRetest === 'PENDING' || needsRetest === 'pending') {
                                    retestButton.title = 'Needs retest is "Pending" - retest upload disabled';
                                } else {
                                    retestButton.title = 'Select retest status first';
                                }
                            }
                        }
                    }
                }

                // Function to calculate and display OneDrive auto-upload countdown
                function updateOneDriveCountdown() {
                    const countdownElements = document.querySelectorAll('.onedrive-countdown');

                    countdownElements.forEach((element, index) => {
                        const sentDateStr = element.getAttribute('data-sent-date');
                        const onedriveUploaded = element.getAttribute('data-onedrive-uploaded') === 'true;';
                        const onedriveUploadDate = element.getAttribute('data-onedrive-upload-date');
                        const delayDays = parseFloat(element.getAttribute('data-delay-days')) || ; 3;

                        const countdownText = element.querySelector('.countdown-text');
                        if (!countdownText) return;

                        // If no sent date, show default status
                        if (!sentDateStr) {
                            countdownText.textContent = 'Not sent';
                            countdownText.style.color = '#6b7280';
                            countdownText.style.fontWeight = 'normal';
                            return;
                        }

                        // Check if files have been uploaded to OneDrive
                        if (onedriveUploaded && onedriveUploadDate) {
                            countdownText.textContent = 'Uploaded to OneDrive';
                            countdownText.style.color = '#10b981';
                            countdownText.style.fontWeight = 'bold';
                            return;
                        }

                        try {
                            const sentDate = new Date(sentDateStr);
                            const now = new Date();

                            // Check if date is valid
                            if (isNaN(sentDate.getTime())) {
                                countdownText.textContent = 'Invalid date';
                                countdownText.style.color = '#ef4444';
                                return;
                            }

                            const timeDiff = now - sentDate;
                            const totalMinutesDiff = Math.floor(timeDiff / (1000 * 60));
                            const totalHoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
                            const totalDaysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

                            // Convert delay days to minutes for precise calculation
                            const delayMinutes = delayDays * 24 * 60;
                            const minutesLeft = Math.max(0, delayMinutes - totalMinutesDiff);

                            if (minutesLeft <= 0) {
                                countdownText.textContent = 'Ready for OneDrive upload';
                                countdownText.style.color = '#10b981';
                                countdownText.style.fontWeight = 'bold';
                            } else {
                                // Calculate remaining time in appropriate units
                                const daysLeft = Math.floor(minutesLeft / (24 * 60));
                                const hoursLeft = Math.floor((minutesLeft % (24 * 60)) / 60);
                                const minsLeft = minutesLeft % 60;

                                let displayText;
                                let color = '#6b7280'

                                if (daysLeft > 0) {
                                    if (daysLeft === 1) {
                                        displayText = '1 day left until upload';
                                        color = '#f59e0b';
                                    } else {
                                        displayText = daysLeft + ' days left until upload';
                                        color = '#6b7280';
                                    }
                                } else if (hoursLeft > 0) {
                                    if (hoursLeft === 1) {
                                        displayText = '1 hour left until upload';
                                        color = '#f59e0b';
                                    } else {
                                        displayText = hoursLeft + ' hours left until upload';
                                        color = '#f59e0b';
                                    }
                                } else {
                                    if (minsLeft <= 1) {
                                        displayText = 'Uploading soon...';
                                        color = '#ef4444';
                                    } else {
                                        displayText = minsLeft + ' minutes left until upload';
                                        color = '#ef4444';
                                    }
                                }

                                countdownText.textContent = displayText;
                                countdownText.style.color = color;
                                countdownText.style.fontWeight = 'normal';
                            }
                        } catch (error) {
                            console.error('Error calculating OneDrive countdown:', error);
                            countdownText.textContent = 'Error calculating';
                            countdownText.style.color = '#ef4444';
                        }
                    });
                };

                // Make updateOneDriveCountdown globally available
                window.updateOneDriveCountdown = updateOneDriveCountdown;

                // Call countdown function immediately if DOM is already loaded
                if (document.readyState === 'loading') {
                    // Will call on DOMContentLoaded
                } else {
                    updateOneDriveCountdown();
                }

                // Update countdown every minute for real-time updates
                setInterval(updateOneDriveCountdown, 60000); // 60 seconds

                // updateSentStatus function now defined at top of script section

                // Initialize sample status indicators and apply filtering
                function initializeSampleIndicators() {
                    console.log('🔬 Initializing sample indicators...');

                    // First, temporarily show all detail rows to read sample data
                    const detailRows = document.querySelectorAll('.detail-row');
                    const originalStates = new Map();

                    // Save original states and show all detail rows
                    detailRows.forEach(row => {
                        originalStates.set(row.id, row.style.display);
                        row.style.display = '';
                    });

                    // Process each row
                    detailRows.forEach(row => {
                        const groupId = row.id.replace('detail-', '');
                        const indicator = document.querySelector('.sample-indicator[data-group-id="' + groupId + '"]');

                        // Check if any product in this group has samples
                        const sampleBadges = row.querySelectorAll('.sampled-badge.sampled-yes');
                        const hasSamples = sampleBadges.length > 0;

                        console.log(`🔬 Processing ${groupId}: found ${sampleBadges.length} sampled products, hasSamples=${hasSamples}`);

                        if (indicator) {
                            if (hasSamples) {
                                indicator.innerHTML = '<span class="sampled-badge sampled-yes" style="padding: 1px 3px;" title="Has samples">S</span>';
                            } else {
                                indicator.innerHTML = '<span class="sampled-badge sampled-no" style="padding: 1px 3px;" title="No samples">N</span>';
                            }
                        }

                        // Store sample status as data attribute for filtering
                        const mainRow = document.querySelector('[data-group-id="' + groupId + '"]');
                        if (mainRow) {
                            mainRow.setAttribute('data-has-samples', hasSamples);
                            console.log(`🔬 Set data-has-samples="${hasSamples}" for ${mainRow.getAttribute('data-client-name')}`);
                        } else {
                            console.warn(`🔬 Could not find main row for group ID: ${groupId}`);
                        }
                    });

                    // Restore original states
                    detailRows.forEach(row => {
                        const originalState = originalStates.get(row.id);
                        row.style.display = originalState || 'none';
                    });

                    console.log('✅ Sample indicators initialized');

                    // Apply sample filter if one is selected
                    applySampleFilter();
                }

                // Apply sample status filtering
                function applySampleFilter() {
                    const urlParams = new URLSearchParams(window.location.search);
                    const sampleStatus = urlParams.get('sample_status');

                    console.log('🔬 Checking sample filter. URL param:', sampleStatus);

                    if (!sampleStatus) {
                        console.log('🔬 No sample filter applied, showing all');
                        return; // No filter applied
                    }

                    console.log('🔬 Applying sample filter:', sampleStatus);

                    const allRows = document.querySelectorAll('.group-row.shipment-row');
                    let visibleCount = 0;
                    let hiddenCount = 0;

                    allRows.forEach(row => {
                        const hasSamples = row.getAttribute('data-has-samples') === 'true';
                        const groupId = row.getAttribute('data-group-id');
                        const detailRow = document.getElementById('detail-' + groupId);
                        const clientName = row.getAttribute('data-client-name');

                        let shouldShow = false;

                        if (sampleStatus === 'SAMPLED' && hasSamples) {
                            shouldShow = true;
                        } else if (sampleStatus === 'NOT_SAMPLED' && !hasSamples) {
                            shouldShow = true;
                        } else if (sampleStatus === '' || !sampleStatus) {
                            shouldShow = true;
                        }

                        console.log(`🔬 ${clientName}: hasSamples=${hasSamples}, filter=${sampleStatus}, shouldShow=${shouldShow}`);

                        if (shouldShow) {
                            row.style.display = '';
                            if (detailRow) {
                                // Restore original detail row state (hidden by default)
                                if (!detailRow.style.display || detailRow.style.display === 'none') {
                                    detailRow.style.display = 'none';
                                }
                            }
                            visibleCount++;
                        } else {
                            row.style.display = 'none';
                            if (detailRow) detailRow.style.display = 'none';
                            hiddenCount++;
                        }
                    });

                    // Update the inspection count display
                    updateInspectionCount(visibleCount);

                    console.log(`✅ Sample filter applied: showing ${visibleCount}, hidden ${hiddenCount} inspections`);
                }

                // Update the inspection count display
                function updateInspectionCount(count) {
                    const countElement = document.querySelector('.table-info');
                    if (countElement) {
                        const currentText = countElement.textContent;
                        const newText = currentText.replace(/Showing \d+ of \d+ inspections/, `Showing ${count} of ${count} inspections`);
                        countElement.textContent = newText;
                    }
                }

                // Manual function to trigger sample filter (for debugging)
                function triggerSampleFilter() {
                    console.log('🔬 Manually triggering sample filter...');
                    initializeSampleIndicators();
                }
                // Debug function to check current page state
                function debugSampleFilter() {
                    console.log('🔬 DEBUGGING SAMPLE FILTER STATE');
                    console.log('================================');

                    // Check URL parameters
                    const urlParams = new URLSearchParams(window.location.search);
                    const sampleStatus = urlParams.get('sample_status');
                    console.log('📍 URL sample_status parameter:', sampleStatus);

                    // Check all rows
                    const allRows = document.querySelectorAll('.group-row.shipment-row');
                    console.log('📋 Total rows found:', allRows.length);

                    let sampledCount = 0;
                    let notSampledCount = 0;
                    let unknownCount = 0;

                    allRows.forEach((row, index) => {
                        const clientName = row.getAttribute('data-client-name');
                        const groupId = row.getAttribute('data-group-id');
                        const hasSamples = row.getAttribute('data-has-samples');
                        const isVisible = row.style.display !== 'none';

                        console.log(`[DEBUG] Row ${index + 1}: ${clientName}`);
                        console.log(`   group-id: ${groupId}`);
                        console.log(`   data-has-samples: ${hasSamples}`);
                        console.log(`   visible: ${isVisible}`);

                        // Check detail row for actual sample badges
                        const detailRow = document.getElementById('detail-' + groupId);
                        if (detailRow) {
                            const sampleBadges = detailRow.querySelectorAll('.sampled-badge.sampled-yes');
                            const totalBadges = detailRow.querySelectorAll('.sampled-badge');
                            console.log(`   sample badges: ${sampleBadges.length}/${totalBadges.length} "Yes"`);

                            if (sampleBadges.length > 0) {
                                sampledCount++;
                            } else if (totalBadges.length > 0) {
                                notSampledCount++;
                            } else {
                                unknownCount++;
                            }
                        } else {
                            console.log(`   [WARNING] No detail row found for group-id: ${groupId}`);
                            unknownCount++;
                        }
                        console.log('');
                    });

                    console.log('📊 SUMMARY:');
                    console.log(`   Sampled inspections: ${sampledCount}`);
                    console.log(`   Not sampled inspections: ${notSampledCount}`);
                    console.log(`   Unknown status: ${unknownCount}`);
                    console.log(`   Expected sampled (from test): 2 (Nesta Foods Factory, New RMP Producer)`);
                    console.log(`   Expected not sampled (from test): 23`);

                    // Check dropdown state
                    const dropdown = document.querySelector('select[name="sample_status"]');
                    if (dropdown) {
                        console.log(`📋 Dropdown current value: "${dropdown.value}"`);
                    }

                    return {
                        totalRows: allRows.length,
                        sampledCount,
                        notSampledCount,
                        unknownCount,
                        urlParam: sampleStatus,
                        dropdownValue: dropdown ? dropdown.value : null
                    });
                };

                // Function to force apply filter manually
                function forceApplyFilter(filterType) {
                    console.log(`[DEBUG] FORCING filter application: ${filterType}`);

                    // Update dropdown
                    const dropdown = document.querySelector('select[name="sample_status"]');
                    if (dropdown) {
                        dropdown.value = filterType || '';
                    }

                    // Update URL
                    const currentUrl = new URL(window.location);
                    if (filterType) {
                        currentUrl.searchParams.set('sample_status', filterType);
                    } else {
                        currentUrl.searchParams.delete('sample_status');
                    }
                    window.history.replaceState({}, '', currentUrl.toString());

                    // Apply filter
                    initializeSampleIndicators();
                }

                // Test function to verify JavaScript is working
                function testFunction() {
                    console.log('Test function is working');
                }

                // Update countdown on page load and every minute
                document.addEventListener('DOMContentLoaded', function () {
                    updateOneDriveCountdown();
                    setInterval(updateOneDriveCountdown, 60000); // Update every minute

                    // Initialize other functions
                    initializeButtonStates();

                    // Initialize sample indicators with delay to ensure DOM is ready
                    setTimeout(() => {
                        initializeSampleIndicators();
                    }, 1000);

                    // Sample filter now handled by backend - no client-side filtering needed
                    // Just let the form submit normally to reload with backend filtering

                    // Also add listener to the form submission to ensure compatibility
                    const filterForm = document.querySelector('form[method="get"]');
                    if (filterForm) {
                        filterForm.addEventListener('submit', function (e) {
                            // Let form submit normally but also apply client-side filter
                            setTimeout(() => {
                                initializeSampleIndicators();
                            }, 100);
                        });
                    }
                });

                // Function to handle Send button clicks with validation
                // DEBUG: Function to check Lab Form column positioning
                function debugLabFormColumn() {
                    console.log('=== DEBUG: Lab Form Column Positioning ===');

                    // Check body class for role
                    const bodyClass = document.body.className;
                    console.log('Body class:', bodyClass);
                    const isInspector = bodyClass.includes('user-role-inspector');
                    console.log('Is inspector:', isInspector);

                    // Find all detail tables
                    const detailTables = document.querySelectorAll('.detail-table');
                    console.log('Found detail tables:', detailTables.length);

                    detailTables.forEach((table, index) => {
                        console.log(`\n--- Detail Table ${index + 1} ---`);

                        // Check table dimensions
                        const tableRect = table.getBoundingClientRect();
                        console.log('Table width:', tableRect.width);
                        console.log('Table position:', tableRect.left, tableRect.top);

                        // Check column 15 (Lab Form/Actions)
                        const col15Headers = table.querySelectorAll('th:nth-child(15)');
                        const col15Cells = table.querySelectorAll('td:nth-child(15)');

                        console.log('Column 15 headers found:', col15Headers.length);
                        console.log('Column 15 cells found:', col15Cells.length);

                        col15Headers.forEach((header, i) => {
                            const rect = header.getBoundingClientRect();
                            console.log(`Header ${i}:`, {
                                text: header.textContent.trim(),
                                width: rect.width,
                                left: rect.left,
                                right: rect.right,
                                visible: rect.width > 0 && rect.height > 0
                            });
                        });

                        col15Cells.forEach((cell, i) => {
                            const rect = cell.getBoundingClientRect();
                            const computedStyle = window.getComputedStyle(cell);

                            // Check buttons inside this cell
                            const labBtn = cell.querySelector('.btn-lab');
                            const labFormBtn = cell.querySelector('.btn-lab-form');
                            const retestBtn = cell.querySelector('.btn-retest');

                            console.log(`Cell ${i}:`, {
                                content: cell.textContent.trim().substring(0, 30),
                                width: rect.width,
                                left: rect.left,
                                right: rect.right,
                                visible: rect.width > 0 && rect.height > 0,
                                overflow: computedStyle.overflow,
                                position: computedStyle.position,
                                zIndex: computedStyle.zIndex,
                                buttons: {
                                    labBtn: labBtn ? {
                                        exists: true,
                                        display: window.getComputedStyle(labBtn).display,
                                        visibility: window.getComputedStyle(labBtn).visibility
                                    } : 'not found',
                                    labFormBtn: labFormBtn ? {
                                        exists: true,
                                        display: window.getComputedStyle(labFormBtn).display,
                                        visibility: window.getComputedStyle(labFormBtn).visibility
                                    } : 'not found',
                                    retestBtn: retestBtn ? {
                                        exists: true,
                                        display: window.getComputedStyle(retestBtn).display,
                                        visibility: window.getComputedStyle(retestBtn).visibility
                                    } : 'not found'
                                }
                            });
                        });

                        // Check detail-content container
                        const detailContent = table.closest('.detail-content');
                        if (detailContent) {
                            const contentRect = detailContent.getBoundingClientRect();
                            const contentStyle = window.getComputedStyle(detailContent);
                            console.log('Detail-content container:', {
                                width: contentRect.width,
                                overflowX: contentStyle.overflowX,
                                scrollWidth: detailContent.scrollWidth,
                                clientWidth: detailContent.clientWidth,
                                canScroll: detailContent.scrollWidth > detailContent.clientWidth
                            });
                        }
                    });

                    console.log('=== END DEBUG ===');
                }

                // Run debug when a detail row is expanded
                document.addEventListener('click', function (e) {
                    if (e.target.closest('.expand-btn')) {
                        setTimeout(debugLabFormColumn, 500);
                    }
                });

                function handleSendButtonClick(groupId, clientName, inspectionDate, hasAllDocuments) {
                    if (!hasAllDocuments) {
                        console.warn('[WARNING] Cannot send: Missing required documents. Ensure all compliance documents are downloaded and RFI/Invoice are uploaded.');
                        return false;
                    }

                    // If all documents are present, proceed with sending
                    sendGroupDocuments(groupId, clientName, inspectionDate);
                    return true;
                }

                // Function to initialize button states on page load
                function initializeButtonStates() {
                    // Get all retest dropdowns
                    const dropdowns = document.querySelectorAll('.needs-retest-dropdown');

                    dropdowns.forEach(dropdown => {
                        const inspectionId = dropdown.getAttribute('data-inspection-id');
                        const needsRetest = dropdown.value;

                        // Update button states based on current dropdown value
                        updateButtonStates(inspectionId, needsRetest);
                    });

                    // BACKEND FILE CHECKING: File colors are now set on backend for instant display
                    // No need to check files via JavaScript after page load
                    // File colors are already correct from Django template rendering
                    console.log('[PERFORMANCE] File button colors set by backend - no JavaScript file checking needed');
                }

                function initializeRFIAndInvoiceButtonColors() {
                    console.log('[DEBUG] [INIT] ===== STARTING RFI/INVOICE BUTTON INITIALIZATION =====');
                    console.log('[PERFORMANCE] Starting background file checks now...');

                    // Get all unique client names from the page
                    const groupRows = document.querySelectorAll('tr.group-row[data-client-name]');
                    console.log('[DEBUG] [INIT] Found', groupRows.length, 'group rows with data-client-name');

                    const processedClients = new Set();
                    let delayMs = 0; // Start immediately, but stagger each request

                    groupRows.forEach((row, index) => {
                        const clientName = row.getAttribute('data-client-name');
                        const inspectionDate = row.getAttribute('data-inspection-date');
                        console.log(`[DEBUG] [INIT] Row ${index + 1}: client="${clientName}", date="${inspectionDate}"`);

                        if (clientName && !processedClients.has(clientName)) {
                            processedClients.add(clientName);

                            // Skip NEW inspections - they should not have any file buttons colored
                            if (clientName.toUpperCase().includes('NEW')) {
                                console.log('[DEBUG] [INIT] ⏭️ SKIPPING NEW inspection (disabled):', clientName);
                            } else {
                                // PERFORMANCE FIX: Stagger requests with 300ms delay between each
                                setTimeout(() => {
                                    console.log('[DEBUG] [INIT] ✅ Processing client:', clientName);
                                    updateRFIAndInvoiceButtonColorsForClient(clientName);
                                }, delayMs);
                                delayMs += 300; // 300ms between each request (slower, smoother)
                            }
                        } else if (clientName) {
                            console.log('[DEBUG] [INIT] ⏭️ SKIPPING already processed client:', clientName);
                        } else {
                            console.log('[DEBUG] [INIT] ❌ Row has no client name');
                        }
                    });

                    console.log('[DEBUG] [INIT] ===== FINISHED SCHEDULING', processedClients.size, 'UNIQUE CLIENTS =====');
                    console.log('[DEBUG] [INIT] Processed clients:', Array.from(processedClients));
                }
                async function saveManualEmail(clientName, email) {
                    try {
                        const resp = await fetch('/client/save-manual-email/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
                            },
                            body: JSON.stringify({ client_name: clientName, email })
                        });

                        // Check if response is JSON
                        const contentType = resp.headers.get('content-type');
                        if (!contentType || !contentType.includes('application/json')) {
                            // If not JSON, likely an HTML error page
                            if (resp.status === 403) {
                                alert('Session expired. Please refresh the page and try again.');
                                window.location.reload();
                                return;
                            } else if (resp.status === 500) {
                                alert('Server error. Please try again.');
                                return;
                            } else {
                                alert('Unexpected response format. Please refresh the page and try again.');
                                return;
                            }
                        }

                        const result = await resp.json();
                        if (result.success) {
                            alert('Email saved');
                            window.location.reload();
                        } else {
                            alert('Error: ' + result.error);
                        }
                    } catch (e) {
                        console.error('Network error:', e);
                        alert('Network error: ' + e.message);
                    }
                }
                async function deleteClientEmail(clientName, email) {
                    if (!confirm('Remove this email?')) return;
                    try {
                        const resp = await fetch('/client/delete-email/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
                            },
                            body: JSON.stringify({ client_name: clientName, email })
                        });

                        // Check if response is JSON
                        const contentType = resp.headers.get('content-type');
                        if (!contentType || !contentType.includes('application/json')) {
                            // If not JSON, likely an HTML error page
                            if (resp.status === 403) {
                                alert('Session expired. Please refresh the page and try again.');
                                window.location.reload();
                                return;
                            } else if (resp.status === 500) {
                                alert('Server error. Please try again.');
                                return;
                            } else {
                                alert('Unexpected response format. Please refresh the page and try again.');
                                return;
                            }
                        }

                        const result = await resp.json();
                        if (result.success) {
                            window.location.reload();
                        } else {
                            alert('Error: ' + result.error);
                        }
                    } catch (e) {
                        console.error('Network error:', e);
                        alert('Network error: ' + e.message);
                    }
                }

                // Inspection sync function for shipment list page
                function syncInspectionsFromShipmentList() {
                    const btn = document.querySelector('button[onclick="syncInspectionsFromShipmentList()"]');
                    const statusDiv = document.getElementById('inspection-sync-status') || createStatusDiv();

                    // Disable button and show loading state
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncing...';
                    btn.style.opacity = '0.7';
                    statusDiv.innerHTML = '';

                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CONFIG.csrfToken;

                    fetch(window.DJANGO_CONFIG.refreshUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'X-CSRFToken': csrfToken,
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                        .then(response => {
                            if (response.ok) {
                                return response.json();
                            } else {
                                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                            }
                        })
                        .then(data => {
                            if (data.success && data.status === 'started') {
                                // Background sync started - start polling
                                pollInspectionSyncStatus();
                            } else if (data.success) {
                                // Immediate success
                                updateInspectionPageAfterSync();
                                resetInspectionButton();
                            } else {
                                statusDiv.innerHTML =
                                    '<div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">' +
                                    '<i class="fas fa-exclamation-circle mr-2"></i>' +
                                    (data.error || 'Failed to start sync') +
                                    '</div>';
                                resetInspectionButton();
                            }
                        })
                        .catch(error => {
                            console.error('Error starting sync:', error);
                            statusDiv.innerHTML =
                                '<div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">' +
                                '<i class="fas fa-exclamation-circle mr-2"></i>' +
                                'Error: ' + error.message +
                                '</div>';
                            resetInspectionButton();
                        });

                    let pollCount = 0;
                    const maxPolls = 60; // 2 minutes max

                    function pollInspectionSyncStatus() {
                        pollCount++;
                        if (pollCount > maxPolls) {
                            statusDiv.innerHTML = `
                        <div class="p-4 mt-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Sync is taking longer than expected. Please check back later.
                        </div>
                    `;
                            resetInspectionButton();
                            return;
                        }

                        fetch(window.DJANGO_CONFIG.syncStatusUrl, {
                            method: 'GET',
                            headers: { 'X-Requested-With': 'XMLHttpRequest' }
                        })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success && data.message) {
                                    // Sync completed successfully
                                    updateInspectionPageAfterSync();
                                    resetInspectionButton();
                                } else if (data.status === 'running' || !data.success) {
                                    // Still running
                                    btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncing...';
                                    setTimeout(pollInspectionSyncStatus, 2000);
                                } else {
                                    // Error occurred
                                    statusDiv.innerHTML =
                                        '<div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">' +
                                        '<i class="fas fa-exclamation-circle mr-2"></i>' +
                                        (data.error || 'Sync failed') +
                                        '</div>';
                                    resetInspectionButton();
                                }
                            })
                            .catch(error => {
                                console.error('Error checking sync status:', error);
                                statusDiv.innerHTML =
                                    '<div class="p-4 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700">' +
                                    '<i class="fas fa-exclamation-circle mr-2"></i>' +
                                    'Error checking sync status: ' + error.message +
                                    '</div>';
                                resetInspectionButton();
                            });
                    }

                    function resetInspectionButton() {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Inspections';
                        btn.style.opacity = '1';
                    }

                    function createStatusDiv() {
                        // Create status div if it doesn't exist
                        let statusDiv = document.getElementById('inspection-sync-status');
                        if (!statusDiv) {
                            statusDiv = document.createElement('div');
                            statusDiv.id = 'inspection-sync-status';
                            statusDiv.className = 'mt-4';
                            // Insert after the sync button
                            const navItem = btn.closest('.nav-item');
                            if (navItem && navItem.parentNode) {
                                navItem.parentNode.insertBefore(statusDiv, navItem.nextSibling);
                            }
                        }
                        return statusDiv;
                    }

                    function updateInspectionPageAfterSync() {
                        // Reload the page to show updated inspection data
                        window.location.reload();
                    }

                    console.log('JavaScript finished loading successfully!');

                    // Test if timer functions are available
                    console.log('[DEBUG] Testing timer function availability...');
                    console.log('[DEBUG] initializeFifteenMinuteTimers available:', typeof initializeFifteenMinuteTimers);
                    console.log('[DEBUG] initializeDisabledRows available:', typeof initializeDisabledRows);

                    // Test if KM and Hours functions are available
                    console.log('[DEBUG] Testing KM and Hours function availability...');
                    console.log('[DEBUG] updateGroupKmTraveled available:', typeof updateGroupKmTraveled);
                    console.log('[DEBUG] updateGroupHours available:', typeof updateGroupHours);
                    console.log('[DEBUG] getCSRFToken available:', typeof getCSRFToken);

                    // Test window object functions
                    console.log('[DEBUG] Window functions - updateGroupKmTraveled:', typeof window.updateGroupKmTraveled);
                    console.log('[DEBUG] Window functions - updateGroupHours:', typeof window.updateGroupHours);
                    console.log('[DEBUG] Window functions - getCSRFToken:', typeof window.getCSRFToken);

                    // DISABLED: Row locking removed - users can always change sent status
                    // initializeFifteenMinuteTimers();
                    // initializeDisabledRows();
                    console.log('✅ Row locking disabled - sent status can be changed freely');
                }

                // Initialize theme on page load
                if (typeof window.initTheme === 'function') {
                    window.initTheme();
                }

                // Email function is now defined in km_hours_fix.js as updateGroupAdditionalEmail (singular)
                // No need for complex add/remove email row functions anymore

                // Manual class dropdown fix - run this in console if dropdowns don't work
                window.fixClassDropdowns = function () {
                    console.log('[FIX] Manually fixing class dropdowns...');
                    const allDropdowns = document.querySelectorAll('select.product-class-select');
                    console.log('[FIX] Found', allDropdowns.length, 'class dropdowns');

                    allDropdowns.forEach((dropdown, index) => {
                        console.log(`[FIX] Fixing dropdown ${index + 1}:`, dropdown);

                        // Clear existing options
                        dropdown.innerHTML = '';

                        // Add placeholder
                        const placeholder = document.createElement('option');
                        placeholder.value = '';
                        placeholder.textContent = 'Select Class...';
                        dropdown.appendChild(placeholder);

                        // Add all class options
                        const allClassOptions = [
                            'Raw species sausage / wors',
                            'Extra Lean Mince',
                            'Lean Mince',
                            'Regular Mince',
                            'Raw Flavoured Ground Meat',
                            'Raw Flavoured Ground Meat & Offal',
                            'Raw Flavoured mixed species Ground Meat',
                            'Raw Flavoured mixed species Ground Meat & Offal',
                            'Raw Boerewors',
                            'Raw mixed species sausage / wors',
                            'Ground Burger / Ground patty = Extra Lean',
                            'Ground Burger / Ground patty = Lean',
                            'Ground Burger / Ground patty = Regular',
                            'Burger / Patty / Hamburger Patty / Meatball / Frikkadel = Extra Lean',
                            'Burger / Patty / Hamburger Patty / Meatball / Frikkadel = Lean',
                            'Burger / Patty / Hamburger Patty / Meatball / Frikkadel = Regular',
                            'Value burger / Value patty / Value hamburger / Value meatball / Value frikkadel',
                            'Economy Burger / Econo Burger / Economy Patty / Econo Patty / Budget Burger',
                            'Raw Banger / Griller',
                            'Raw Bratwurst / Sizzler',
                            'Whole Muscle, uncured and heat / partial heat treated products',
                            'Whole muscle, uncured, no or partial heat treated and air dried products',
                            'Whole muscle, uncured, no or partial heat treated and air dried products undergoing a lengthy maturation period (minimum 21 days)',
                            'Whole muscle, dry cured, no or partial heat treated products',
                            'Whole muscle, cured and no or partial heat treated products',
                            'Whole muscle, cured, no or partial heat treated and air dried products',
                            'Whole muscle, dry cured, no or partial heat treated and dried products',
                            'Comminuted, cured and heat treated products',
                            'Comminuted, uncured, no or partial heat treated and dried products',
                            'Comminuted, cured, no or partial heat treated, dried and fermented products',
                            'Comminuted, uncured and heat treated products',
                            'Reformed, uncured and no or partial heat treated products',
                            'Reformed, cured, heat treated products from single species',
                            'Reformed, cured, heat treated products from mixed species',
                            'Reformed, cured and no or partial heat treated products',
                            'Liver spreads, pâté and terrines',
                            'Products in aspic: Brawn',
                            'Product in aspic: Souse, Other products containing cured meat pieces in aspic',
                            'Products made from blood',
                            'Coated Processed Meat Products',
                            'Unspecified processed meat products'
                        ];

                        allClassOptions.forEach(optionText => {
                            const option = document.createElement('option');
                            option.value = optionText;
                            option.textContent = optionText;
                            dropdown.appendChild(option);
                        });

                        console.log(`[FIX] Dropdown ${index + 1} now has ${dropdown.options.length} options`);
                    });

                    console.log('[FIX] Class dropdown fix completed!');
                };


            <!-- REBUILT CLASS DROPDOWN SYSTEM - Clean Implementation -->
                console.log('[CLASS DROPDOWN] Loading rebuilt class dropdown system...');

                // Class options array - complete list
                const CLASS_OPTIONS = [
                    'Raw species sausage / wors',
                    'Extra Lean Mince',
                    'Lean Mince',
                    'Regular Mince',
                    'Raw Flavoured Ground Meat',
                    'Raw Flavoured Ground Meat & Offal',
                    'Raw Flavoured mixed species Ground Meat',
                    'Raw Flavoured mixed species Ground Meat & Offal',
                    'Raw Boerewors',
                    'Raw mixed species sausage / wors',
                    'Ground Burger / Ground patty = Extra Lean',
                    'Ground Burger / Ground patty = Lean',
                    'Ground Burger / Ground patty = Regular',
                    'Burger / Patty / Hamburger Patty / Meatball / Frikkadel = Extra Lean',
                    'Burger / Patty / Hamburger Patty / Meatball / Frikkadel = Lean',
                    'Burger / Patty / Hamburger Patty / Meatball / Frikkadel = Regular',
                    'Value burger / Value patty / Value hamburger / Value meatball / Value frikkadel',
                    'Economy Burger / Econo Burger / Economy Patty / Econo Patty / Budget Burger',
                    'Raw Banger / Griller',
                    'Raw Bratwurst / Sizzler',
                    'Whole Muscle, uncured and heat / partial heat treated products',
                    'Whole muscle, uncured, no or partial heat treated and air dried products',
                    'Whole muscle, uncured, no or partial heat treated and air dried products undergoing a lengthy maturation period (minimum 21 days)',
                    'Whole muscle, dry cured, no or partial heat treated products',
                    'Whole muscle, cured and no or partial heat treated products',
                    'Whole muscle, cured, no or partial heat treated and air dried products',
                    'Whole muscle, dry cured, no or partial heat treated and dried products',
                    'Comminuted, cured and heat treated products',
                    'Comminuted, uncured, no or partial heat treated and dried products',
                    'Comminuted, cured, no or partial heat treated, dried and fermented products',
                    'Comminuted, uncured and heat treated products',
                    'Reformed, uncured and no or partial heat treated products',
                    'Reformed, cured, heat treated products from single species',
                    'Reformed, cured, heat treated products from mixed species',
                    'Reformed, cured and no or partial heat treated products',
                    'Liver spreads, pâté and terrines',
                    'Products in aspic: Brawn',
                    'Product in aspic: Souse, Other products containing cured meat pieces in aspic',
                    'Products made from blood',
                    'Coated Processed Meat Products',
                    'Unspecified processed meat products'
                ];

                // Function to populate a single dropdown
                function populateClassDropdown(dropdown) {
                    console.log('[CLASS DROPDOWN] Populating dropdown:', dropdown);

                    // Get the current class value from data attribute
                    const currentClass = dropdown.getAttribute('data-current-class');
                    console.log('[CLASS DROPDOWN] Current class value:', currentClass);

                    // Clear existing options
                    dropdown.innerHTML = '';

                    // Add placeholder
                    const placeholder = document.createElement('option');
                    placeholder.value = '';
                    placeholder.textContent = 'Select Class...';
                    dropdown.appendChild(placeholder);

                    // Add all class options
                    CLASS_OPTIONS.forEach(optionText => {
                        const option = document.createElement('option');
                        option.value = optionText;
                        option.textContent = optionText;

                        // Set as selected if it matches the current class
                        if (currentClass && currentClass === optionText) {
                            option.selected = true;
                            console.log('[CLASS DROPDOWN] Set option as selected:', optionText);
                        }

                        dropdown.appendChild(option);
                    });

                    // Set the dropdown value to the current class if it exists
                    if (currentClass && currentClass !== 'None' && currentClass.trim() !== '') {
                        dropdown.value = currentClass;
                        console.log('[CLASS DROPDOWN] Set dropdown value to:', currentClass);
                    } else {
                        dropdown.value = '';
                        console.log('[CLASS DROPDOWN] No current class, cleared selection');
                    }

                    console.log('[CLASS DROPDOWN] Dropdown populated with', dropdown.options.length, 'options');
                }

                // Function to populate all class dropdowns
                function populateAllClassDropdowns() {
                    console.log('[CLASS DROPDOWN] Populating all class dropdowns...');
                    const dropdowns = document.querySelectorAll('select.product-class-select');
                    console.log('[CLASS DROPDOWN] Found', dropdowns.length, 'class dropdowns');

                    dropdowns.forEach((dropdown, index) => {
                        console.log(`[CLASS DROPDOWN] Processing dropdown ${index + 1}`);
                        populateClassDropdown(dropdown);
                    });

                    console.log('[CLASS DROPDOWN] All dropdowns populated successfully!');
                }

                // Function to handle expand button clicks
                function handleExpandClick(groupId) {
                    console.log('[CLASS DROPDOWN] Expand clicked for group:', groupId);

                    // Wait a bit for the detail row to be shown
                    setTimeout(function () {
                        const detailRow = document.getElementById('detail-' + groupId);
                        if (detailRow) {
                            const dropdowns = detailRow.querySelectorAll('select.product-class-select');
                            console.log('[CLASS DROPDOWN] Found', dropdowns.length, 'dropdowns in expanded row');
                            dropdowns.forEach(populateClassDropdown);
                        }
                    }, 100);
                }

                // Make functions globally available
                window.populateAllClassDropdowns = populateAllClassDropdowns;
                window.populateClassDropdown = populateClassDropdown;
                window.fixClassDropdowns = populateAllClassDropdowns; // Alias for compatibility

                // Initialize when page loads
                document.addEventListener('DOMContentLoaded', function () {
                    console.log('[CLASS DROPDOWN] DOM loaded, initializing...');

                    // Populate existing dropdowns
                    populateAllClassDropdowns();

                    // Set up expand button monitoring
                    document.addEventListener('click', function (e) {
                        if (e.target.closest('.expand-btn')) {
                            const button = e.target.closest('.expand-btn');
                            const groupId = button.getAttribute('data-group-id');
                            if (groupId) {
                                handleExpandClick(groupId);
                            }
                        }
                    });

                    // Monitor for dynamically added dropdowns
                    const observer = new MutationObserver(function (mutations) {
                        mutations.forEach(function (mutation) {
                            if (mutation.type === 'childList') {
                                mutation.addedNodes.forEach(function (node) {
                                    if (node.nodeType === 1) { // Element node
                                        const dropdowns = node.querySelectorAll ? node.querySelectorAll('select.product-class-select') : [];
                                        dropdowns.forEach(populateClassDropdown);
                                    }
                                });
                            }
                        });
                    });

                    const table = document.getElementById('shipmentsTable');
                    if (table) {
                        observer.observe(table, { childList: true, subtree: true });
                        console.log('[CLASS DROPDOWN] MutationObserver set up for dynamic content');
                    }
                });

                // Fallback initialization after page load
                window.addEventListener('load', function () {
                    console.log('[CLASS DROPDOWN] Page fully loaded, running fallback...');
                    setTimeout(populateAllClassDropdowns, 1000);
                });

                console.log('[CLASS DROPDOWN] Rebuilt class dropdown system loaded successfully!');

                // DEBUG: Log account codes on page load
                document.addEventListener('DOMContentLoaded', function () {
                    console.log('='.repeat(80));
                    console.log('ACCOUNT CODE DEBUG - Checking rendered values');
                    console.log('='.repeat(80));

                    // Find all account code cells
                    const accountCodeCells = document.querySelectorAll('.col-account-code span');
                    console.log(`Found ${accountCodeCells.length} account code cells`);

                    let missingCount = 0;
                    let foundCount = 0;

                    accountCodeCells.forEach((cell, index) => {
                        const code = cell.textContent.trim();
                        const row = cell.closest('tr');
                        const clientCell = row ? row.querySelector('.col-client-name') : null;
                        const clientName = clientCell ? clientCell.textContent.trim() : 'Unknown';

                        if (code === '-' || code === '') {
                            missingCount++;
                            console.log(`${index + 1}. MISSING: ${clientName} -> "${code}"`);
                        } else {
                            foundCount++;
                            console.log(`${index + 1}. OK: ${clientName} -> "${code}"`);
                        }
                    });

                    console.log('='.repeat(80));
                    console.log(`SUMMARY: ${foundCount} found, ${missingCount} missing`);
                    console.log('='.repeat(80));
                });

                // Date picker functionality with DD/MM/YYYY format
                let currentCalendar = null;
                let currentInput = null;
                let displayedMonth = new Date().getMonth();
                let displayedYear = new Date().getFullYear();

                function openDatePicker(inputName) {
                    // Reset to current month when opening
                    displayedMonth = new Date().getMonth();
                    displayedYear = new Date().getFullYear();
                    // Close any existing calendar
                    if (currentCalendar) {
                        currentCalendar.remove();
                    }

                    currentInput = document.querySelector(`input[name="${inputName}"]`);

                    // Create calendar popup
                    const calendar = document.createElement('div');
                    calendar.className = 'calendar-popup';
                    calendar.innerHTML = generateCalendarHTML();

                    // Position calendar above the input
                    const inputRect = currentInput.getBoundingClientRect();
                    const calendarWidth = 320;
                    const calendarHeight = 350;

                    // Calculate position
                    let left = inputRect.left + (inputRect.width / 2) - (calendarWidth / 2);
                    let top = inputRect.top - calendarHeight - 10;

                    // Ensure calendar stays within viewport
                    if (left < 10) left = 10;
                    if (left + calendarWidth > window.innerWidth - 10) {
                        left = window.innerWidth - calendarWidth - 10;
                    }
                    if (top < 10) {
                        top = inputRect.bottom + 10; // Show below if no space above
                    }

                    calendar.style.left = left + 'px';
                    calendar.style.top = top + 'px';

                    document.body.appendChild(calendar);
                    currentCalendar = calendar;

                    // Add event listeners
                    setupCalendarEvents(calendar);

                    // Close calendar when clicking outside
                    setTimeout(() => {
                        document.addEventListener('click', closeCalendar);
                    }, 100);
                }

                function closeCalendar(e) {
                    if (currentCalendar && (!e || !currentCalendar.contains(e.target) && !e.target.classList.contains('date-picker-btn'))) {
                        currentCalendar.remove();
                        currentCalendar = null;
                        currentInput = null;
                        document.removeEventListener('click', closeCalendar);
                    }
                }

                function generateCalendarHTML() {
                    const today = new Date();

                    const monthNames = [
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                    ];

                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                    let html = `
                <div class="calendar-header">
                    <button type="button" class="calendar-nav" onclick="event.stopPropagation(); changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
                    <div class="calendar-month-year">${monthNames[displayedMonth]} ${displayedYear}</div>
                    <button type="button" class="calendar-nav" onclick="event.stopPropagation(); changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
                </div>
                <div class="calendar-grid">
            `;

                    // Day headers
                    dayNames.forEach(day => {
                        html += `<div class="calendar-day-header">${day}</div>`;
                    });

                    // Calendar days
                    const firstDay = new Date(displayedYear, displayedMonth, 1);
                    const lastDay = new Date(displayedYear, displayedMonth + 1, 0);
                    const startDate = new Date(firstDay);
                    startDate.setDate(startDate.getDate() - firstDay.getDay());

                    for (let i = 0; i < 42; i++) {
                        const date = new Date(startDate);
                        date.setDate(startDate.getDate() + i);

                        const isCurrentMonth = date.getMonth() === displayedMonth;
                        const isToday = date.toDateString() === today.toDateString();
                        const isSelected = currentInput && currentInput.value === formatDateDDMMYYYY(date);

                        let classes = 'calendar-day';
                        if (!isCurrentMonth) classes += ' other-month';
                        if (isToday) classes += ' today';
                        if (isSelected) classes += ' selected';

                        html += `<div class="${classes}" onclick="selectDate('${formatDateYYYYMMDD(date)}')">${date.getDate()}</div>`;
                    }

                    html += '</div>';
                    return html;
                }

                function setupCalendarEvents(calendar) {
                    // Month navigation
                    window.changeMonth = function (direction) {
                        displayedMonth += direction;
                        if (displayedMonth > 11) {
                            displayedMonth = 0;
                            displayedYear++;
                        } else if (displayedMonth < 0) {
                            displayedMonth = 11;
                            displayedYear--;
                        }
                        calendar.innerHTML = generateCalendarHTML();
                        setupCalendarEvents(calendar);
                    };
                }

                function selectDate(dateStr) {
                    const date = new Date(dateStr);
                    const formattedDate = formatDateDDMMYYYY(date);

                    currentInput.value = formattedDate;

                    // Update hidden input
                    const hiddenInput = currentInput.parentNode.querySelector('input[type="hidden"]');
                    if (hiddenInput) {
                        hiddenInput.value = dateStr;
                    }

                    closeCalendar();
                }

                function formatDateDDMMYYYY(date) {
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = monthNames[date.getMonth()];
                    const year = date.getFullYear();
                    return `${day} ${month} ${year}`;
                }

                function formatDateYYYYMMDD(date) {
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${year}-${month}-${day}`;
                }

                // Handle form submission and date display
                document.addEventListener('DOMContentLoaded', function () {
                    // Populate display inputs from hidden inputs on page load
                    const dateFromHidden = document.querySelector('input[name="inspection_date_from"]');
                    const dateFromDisplay = document.querySelector('input[name="inspection_date_from_display"]');
                    const dateToHidden = document.querySelector('input[name="inspection_date_to"]');
                    const dateToDisplay = document.querySelector('input[name="inspection_date_to_display"]');

                    // Convert YYYY-MM-DD to DD Month YYYY for display
                    function formatForDisplay(dateStr) {
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];
                        if (dateStr && dateStr.includes('-')) {
                            const parts = dateStr.split('-');
                            if (parts.length === 3) {
                                const monthIndex = parseInt(parts[1], 10) - 1;
                                return parts[2] + ' ' + monthNames[monthIndex] + ' ' + parts[0];
                            }
                        }
                        return '';
                    }

                    if (dateFromHidden && dateFromHidden.value && dateFromDisplay) {
                        dateFromDisplay.value = formatForDisplay(dateFromHidden.value);
                    }
                    if (dateToHidden && dateToHidden.value && dateToDisplay) {
                        dateToDisplay.value = formatForDisplay(dateToHidden.value);
                    }

                    const filterForm = document.querySelector('form[method="get"]');
                    if (filterForm) {
                        filterForm.addEventListener('submit', function (e) {
                            // Ensure hidden inputs are updated before submission
                            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                'July', 'August', 'September', 'October', 'November', 'December'];
                            const dateInputs = this.querySelectorAll('.date-picker');
                            dateInputs.forEach(function (input) {
                                if (input.value && input.value.includes(' ')) {
                                    // Parse "DD Month YYYY" format
                                    const parts = input.value.split(' ');
                                    if (parts.length === 3) {
                                        const day = parts[0].padStart(2, '0');
                                        const monthIndex = monthNames.indexOf(parts[1]);
                                        const month = (monthIndex + 1).toString().padStart(2, '0');
                                        const year = parts[2];

                                        const hiddenInput = input.parentNode.querySelector('input[type="hidden"]');
                                        if (hiddenInput) {
                                            hiddenInput.value = year + '-' + month + '-' + day;
                                        }
                                    }
                                }
                            });
                        });
                    }
                });

            <!-- Mobile Card Expand/Collapse Functionality -->
                document.addEventListener('DOMContentLoaded', function () {
                    console.log('[MOBILE CARDS] Initializing expand/collapse functionality...');

                    // Handle mobile card expansion
                    document.querySelectorAll('.expand-btn').forEach(button => {
                        // Ensure initial state is correct
                        const card = button.closest('.group-card');
                        if (!card) return; // Skip if no group-card parent
                        const details = card.querySelector('.group-details');
                        const icon = button.querySelector('i');

                        // Reset to collapsed state on load
                        if (details && icon) {
                            details.classList.remove('expanded');
                            button.classList.remove('expanded');
                            icon.style.transform = 'rotate(0deg)';
                        }

                        button.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();

                            console.log('[MOBILE CARDS] Expand button clicked');

                            const groupId = this.getAttribute('data-group-id');
                            const card = this.closest('.group-card');
                            const details = card.querySelector('.group-details');
                            const icon = this.querySelector('i');

                            if (details && icon) {
                                console.log('[MOBILE CARDS] Toggling details for group:', groupId);

                                // Toggle the expanded class
                                details.classList.toggle('expanded');
                                this.classList.toggle('expanded');

                                // Update the icon rotation
                                if (details.classList.contains('expanded')) {
                                    icon.style.transform = 'rotate(180deg)';
                                    console.log('[MOBILE CARDS] Details expanded');
                                } else {
                                    icon.style.transform = 'rotate(0deg)';
                                    console.log('[MOBILE CARDS] Details collapsed');
                                }
                            } else {
                                console.warn('[MOBILE CARDS] Could not find details or icon element');
                            }
                        });
                    });

                    console.log('[MOBILE CARDS] Expand/collapse functionality initialized successfully');

                    // Desktop expand button functionality is handled by the main toggleGroup function
                    // No separate desktop handler needed - the global click listener handles all expand buttons

                    console.log('[DESKTOP] Expand/collapse functionality initialized successfully');

                    // Initialize product class dropdowns for mobile cards
                    setTimeout(() => {
                        document.querySelectorAll('.product-class-select').forEach(window.filterClassOptions);
                    }, 1000);
                });

                // Mobile card specific functions
                window.updateProductName = function (input) {
                    const inspectionId = input.getAttribute('data-inspection-id');
                    const productName = input.value;

                    console.log('[MOBILE] Updating product name for inspection:', inspectionId, 'Value:', productName);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('product_name', productName);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-product-name/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] Product name saved successfully:', data);
                                input.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    input.style.backgroundColor = '';
                                }, 500);
                            } else {
                                console.error('[ERROR] Error saving product name:', data.error);
                                alert('Error updating product name: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('[ERROR] Network error saving product name:', error);
                            alert('Error updating product name: ' + error.message);
                        });
                };

                window.updateProductClass = function (select) {
                    const inspectionId = select.getAttribute('data-inspection-id');
                    const productClass = select.value;

                    console.log('[MOBILE] Updating product class for inspection:', inspectionId, 'Value:', productClass);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('product_class', productClass);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-product-class/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] Product class saved successfully:', data);
                                select.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    select.style.backgroundColor = '';
                                }, 500);
                            } else {
                                console.error('[ERROR] Error saving product class:', data.error);
                                alert('Error updating product class: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('[ERROR] Network error saving product class:', error);
                            alert('Error updating product class: ' + error.message);
                        });
                };

                window.updateTestResult = function (checkbox) {
                    const inspectionId = checkbox.getAttribute('data-inspection-id');
                    const testType = checkbox.getAttribute('data-test-type');
                    const isChecked = checkbox.checked;

                    console.log('[MOBILE] Updating test result for inspection:', inspectionId, 'Test:', testType, 'Checked:', isChecked);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('test_type', testType);
                    formData.append('test_result', isChecked);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-test-result/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] Test result saved successfully:', data);
                            } else {
                                console.error('[ERROR] Error saving test result:', data.error);
                                alert('Error updating test result: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('[ERROR] Network error saving test result:', error);
                            alert('Error updating test result: ' + error.message);
                        });
                };

                window.updateLab = function (select) {
                    const inspectionId = select.getAttribute('data-inspection-id');
                    const lab = select.value;

                    console.log('[MOBILE] Updating lab for inspection:', inspectionId, 'Value:', lab);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('lab', lab);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-lab/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] Lab saved successfully:', data);
                                select.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    select.style.backgroundColor = '';
                                }, 500);
                            } else {
                                console.error('[ERROR] Error saving lab:', data.error);
                                alert('Error updating lab: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('[ERROR] Network error saving lab:', error);
                            alert('Error updating lab: ' + error.message);
                        });
                };

                window.uploadLabFile = function (inspectionId, groupId) {
                    console.log('[MOBILE] Uploading lab file for inspection:', inspectionId, 'Group:', groupId);

                    // Store pending upload info and show compliance modal (same as desktop)
                    window._pendingLabUpload = { productId: inspectionId, groupId: groupId };
                    const modal = document.getElementById('coaComplianceModal');
                    if (modal) {
                        modal.style.display = 'flex';
                    }
                };

                window.uploadRetestFile = function (inspectionId, groupId) {
                    console.log('[MOBILE] Uploading retest file for inspection:', inspectionId, 'Group:', groupId);

                    // Validate that at least one ID is provided
                    if (!groupId && !inspectionId) {
                        alert('Error: Unable to upload - missing group or inspection ID. Please refresh the page and try again.');
                        console.error('[UPLOAD] Missing both groupId and inspectionId');
                        return;
                    }

                    // Create a file input element
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf';
                    fileInput.style.display = 'none';

                    fileInput.onchange = function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            // Validate PDF file
                            if (!file.name.toLowerCase().endsWith('.pdf')) {
                                alert('Only PDF files are allowed. Please select a PDF document.');
                                return;
                            }

                            // Create form data
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('document_type', 'retest');
                            // Only send values if they're truthy
                            if (groupId) formData.append('group_id', groupId);
                            if (inspectionId) formData.append('inspection_id', inspectionId);

                            // Get CSRF token
                            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                                window.DJANGO_CONFIG.csrfToken;
                            formData.append('csrfmiddlewaretoken', csrfToken);

                            // Upload file
                            fetch('/upload-document/', {
                                method: 'POST',
                                body: formData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        alert('Retest file uploaded successfully!');
                                        console.log('[MOBILE] Retest upload successful:', data);
                                        // Refresh the page to show updated status
                                        location.reload();
                                    } else {
                                        alert('Error uploading retest file: ' + data.error);
                                    }
                                })
                                .catch(error => {
                                    alert('Error uploading retest file: ' + error.message);
                                });
                        }
                    };

                    // Trigger file selection
                    document.body.appendChild(fileInput);
                    fileInput.click();
                    document.body.removeChild(fileInput);
                };

                window.editInspection = function (inspectionId) {
                    console.log('[MOBILE] Editing inspection:', inspectionId);
                    // This would open the inspection edit dialog
                    // Implementation depends on your existing edit system
                    alert('Edit inspection functionality - Inspection ID: ' + inspectionId);
                };

                window.generateLabForm = function (inspectionId) {
                    console.log('[MOBILE] Generating lab form for inspection:', inspectionId);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                        window.DJANGO_CONFIG.csrfToken;

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Generate lab form
                    fetch('/generate-lab-form/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                alert('Lab form generated successfully!');
                                console.log('[MOBILE] Lab form generation successful:', data);
                                // Optionally refresh the page or update UI
                                location.reload();
                            } else {
                                alert('Error generating lab form: ' + data.error);
                            }
                        })
                        .catch(error => {
                            alert('Error generating lab form: ' + error.message);
                        });
                };

                window.updateBoughtSample = function (input) {
                    const inspectionId = input.getAttribute('data-inspection-id');
                    const boughtSample = input.value;

                    console.log('[MOBILE] Updating bought sample for inspection:', inspectionId, 'Value:', boughtSample);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('bought_sample', boughtSample);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-bought-sample/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] Bought sample saved successfully:', data);
                                input.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    input.style.backgroundColor = '';
                                }, 500);
                            } else {
                                console.error('[ERROR] Error saving bought sample:', data.error);
                                alert('Error updating bought sample: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('[ERROR] Network error saving bought sample:', error);
                            alert('Error updating bought sample: ' + error.message);
                        });
                };

                window.updateNeedsRetest = function (select) {
                    const inspectionId = select.getAttribute('data-inspection-id');
                    const needsRetest = select.value;

                    // Check if the select is disabled (no sample taken)
                    if (select.disabled) {
                        console.log('[MOBILE] Needs retest dropdown is disabled - no sample taken');
                        alert('Cannot set retest options - no sample taken for this inspection');
                        return;
                    }

                    console.log('[MOBILE] Updating needs retest for inspection:', inspectionId, 'Value:', needsRetest);

                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

                    // Create form data
                    const formData = new FormData();
                    formData.append('inspection_id', inspectionId);
                    formData.append('needs_retest', needsRetest);
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    // Send update request
                    fetch('/update-needs-retest/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('[SUCCESS] Needs retest saved successfully:', data);
                                select.style.backgroundColor = '#d4edda';
                                setTimeout(() => {
                                    select.style.backgroundColor = '';
                                }, 500);

                                // Update retest button state based on needs retest value
                                updateRetestButtonState(inspectionId, needsRetest);
                            } else {
                                console.error('[ERROR] Error saving needs retest:', data.error);
                                alert('Error updating needs retest: ' + data.error);
                            }
                        })
                        .catch(error => {
                            console.error('[ERROR] Network error saving needs retest:', error);
                            alert('Error updating needs retest: ' + error.message);
                        });
                };

                // Function to update retest button state based on needs retest value
                function updateRetestButtonState(inspectionId, needsRetest) {
                    // Find the retest button for this inspection
                    const retestButton = document.querySelector(`button[onclick*="uploadRetestFile('${inspectionId}')"]`);
                    if (retestButton) {
                        if (needsRetest === 'yes' || needsRetest === 'YES') {
                            // Enable retest button only if needs retest is "yes"
                            retestButton.disabled = false;
                            retestButton.style.opacity = '';
                            retestButton.style.cursor = '';
                            retestButton.title = 'Retest required - Please upload retest document';
                        } else {
                            // Disable retest button for all other values (no, pending, empty)
                            retestButton.disabled = true;
                            retestButton.style.opacity = '0.5';
                            retestButton.style.cursor = 'not-allowed';
                            if (needsRetest === 'no' || needsRetest === 'NO') {
                                retestButton.title = 'Needs retest is "No" - retest upload disabled';
                            } else if (needsRetest === 'pending' || needsRetest === 'PENDING') {
                                retestButton.title = 'Needs retest is "Pending" - retest upload disabled';
                            } else {
                                retestButton.title = 'No retest required - Upload disabled';
                            }
                        }
                    }
                }

                // Function to check if a group has both PMP and RAW products
                function checkCompositionButtonVisibility() {
                    console.log('[COMPOSITION] Checking composition button visibility...');

                    // Get all group rows
                    const groupRows = document.querySelectorAll('.group-row');

                    groupRows.forEach(row => {
                        const groupId = row.getAttribute('data-group-id');
                        const clientName = row.getAttribute('data-client-name');
                        const inspectionDate = row.getAttribute('data-inspection-date');

                        if (!groupId) return;

                        console.log(`[COMPOSITION] Checking group: ${groupId}`);

                        // Find all detail rows for this group
                        const detailRow = row.nextElementSibling;
                        if (!detailRow || !detailRow.classList.contains('detail-row')) {
                            console.log(`[COMPOSITION] No detail row found for ${groupId}`);
                            return;
                        }

                        // Get all product class dropdowns within this group's detail table
                        const classDropdowns = detailRow.querySelectorAll('.product-class-select');

                        let hasPMP = false;
                        let hasRAW = false;

                        classDropdowns.forEach(dropdown => {
                            const commodity = (dropdown.getAttribute('data-commodity') || '').toLowerCase().trim();

                            // Check commodity type - not product class!
                            if (commodity) {
                                if (commodity === 'raw') {
                                    hasRAW = true;
                                    console.log(`[COMPOSITION] Found RAW commodity: ${commodity}`);
                                } else if (commodity === 'pmp') {
                                    hasPMP = true;
                                    console.log(`[COMPOSITION] Found PMP commodity: ${commodity}`);
                                }
                            }
                        });

                        // Show composition button if group has RAW or PMP (or both)
                        const compositionBtn = document.getElementById('composition-' + groupId);
                        const compositionBtnMobile = document.getElementById('composition-mobile-' + groupId);
                        const compositionCell = row.querySelector('.col-composition');

                        if (compositionBtn && !compositionBtn.classList.contains('btn-success')) {
                            // Only modify non-uploaded buttons
                            // Show button if group has RAW OR PMP (or both)
                            if (hasPMP || hasRAW) {
                                compositionBtn.style.display = 'block';
                                if (compositionCell) {
                                    compositionCell.querySelector('.composition-indicator')?.remove();
                                }
                                const commodityTypes = [];
                                if (hasRAW) commodityTypes.push('RAW');
                                if (hasPMP) commodityTypes.push('PMP');
                                console.log(`[COMPOSITION] ✅ Showing composition button for ${groupId} (has ${commodityTypes.join(' and ')} commodities)`);
                            } else {
                                compositionBtn.style.display = 'block';
                                if (compositionCell && !compositionCell.querySelector('.composition-indicator')) {
                                    // Add dash if not already present
                                    const indicator = document.createElement('span');
                                    indicator.className = 'composition-indicator';
                                    indicator.textContent = '-';
                                    compositionCell.appendChild(indicator);
                                }
                                console.log(`[COMPOSITION] ❌ Hiding composition button for ${groupId} - No RAW or PMP commodities found`);
                            }
                        }

                        // Also update mobile button
                        if (compositionBtnMobile && !compositionBtnMobile.classList.contains('btn-success')) {
                            if (hasPMP || hasRAW) {
                                compositionBtnMobile.style.display = 'block';
                                console.log(`[COMPOSITION] ✅ Showing MOBILE composition button for ${groupId}`);
                            } else {
                                compositionBtnMobile.style.display = 'block';
                                console.log(`[COMPOSITION] ❌ Hiding MOBILE composition button for ${groupId}`);
                            }
                        }
                    });
                }

                // Run on page load
                document.addEventListener('DOMContentLoaded', function () {
                    console.log('[COMPOSITION] DOM loaded, checking composition buttons...');
                    // Delay to ensure product classes are loaded
                    setTimeout(checkCompositionButtonVisibility, 1000);

                    // Validate RFI and Invoice button states based on actual files
                    console.log('[BUTTON STATE] Validating upload button states...');
                    if (typeof validateUploadButtonStates === 'function') {
                        setTimeout(validateUploadButtonStates, 1500);
                    }
                });

                // Also run when product class is updated
                const originalUpdateProductClass = window.updateProductClass;
                window.updateProductClass = function (dropdown) {
                    originalUpdateProductClass(dropdown);
                    // Recheck composition button visibility after class update
                    setTimeout(checkCompositionButtonVisibility, 500);
                };

                // Run when groups are expanded to ensure visibility is correct
                const originalToggleGroup = window.toggleGroup;
                if (originalToggleGroup) {
                    window.toggleGroup = function (event, groupId) {
                        originalToggleGroup(event, groupId);
                        // Recheck composition button visibility after group toggle
                        setTimeout(checkCompositionButtonVisibility, 500);
                    };
                }
