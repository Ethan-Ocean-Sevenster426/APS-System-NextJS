
// === SCRIPT BLOCK 2 ===

        console.log('Main JavaScript started loading...');

        // Get CSRF Token function
        function getCSRFToken() {
            const token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            if (!token) {
                console.error('CSRF token not found');
                return '';
            }
            return token;
        }

        // Global expand/collapse functions
        function expandAll() {
            const detailRows = document.querySelectorAll('.detail-row');
            const expandBtns = document.querySelectorAll('.expand-btn');
            
            detailRows.forEach(row => {
                row.style.display = 'table-row';
            });
            
            expandBtns.forEach(btn => {
                btn.classList.add('expanded');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-down');
                }
            });
        }
        
        function collapseAll() {
            const detailRows = document.querySelectorAll('.detail-row');
            const expandBtns = document.querySelectorAll('.expand-btn');
            
            detailRows.forEach(row => {
                row.style.display = 'none';
            });
            
            expandBtns.forEach(btn => {
                btn.classList.remove('expanded');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-right');
                }
            });
        }

        // Global toggle function
        function toggleGroup(e, groupId) {
            console.log('Toggling group:', groupId);
            e.preventDefault();
            e.stopPropagation();
            
            const detailRow = document.getElementById('detail-' + groupId);
            console.log('Detail row found:', detailRow);
            console.log('Detail row ID:', 'detail-' + groupId);

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
                if (icon) {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-down');
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

        // Mobile Navigation
        document.addEventListener('DOMContentLoaded', function() {
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const mobileNav = document.getElementById('mobile-nav');
            const mobileOverlay = document.getElementById('mobile-overlay');
            
            function toggleMobileNav() {
                mobileNav.classList.toggle('show');
                mobileOverlay.classList.toggle('show');
                
                // Update menu button icon
                const icon = mobileMenuBtn.querySelector('i');
                if (mobileNav.classList.contains('show')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            }
            
            // Toggle navigation when menu button is clicked
            mobileMenuBtn.addEventListener('click', toggleMobileNav);
            
            // Close navigation when overlay is clicked
            mobileOverlay.addEventListener('click', toggleMobileNav);
            
            // Close navigation when a navigation link is clicked (on mobile)
            const navLinks = mobileNav.querySelectorAll('a');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth <= 1024) {
                        toggleMobileNav();
                    }
                });
            });
            
            // Handle window resize
            window.addEventListener('resize', function() {
                if (window.innerWidth > 1024) {
                    mobileNav.classList.remove('show');
                    mobileOverlay.classList.remove('show');
                    const icon = mobileMenuBtn.querySelector('i');
                    icon.className = 'fas fa-bars';
                }
            });
        });
        
        // CSRF functions now defined at top of script section
        
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
                    showMessage(result.message, 'success');
                    
                    // Refresh the files display
                    if (window.currentFilesClient && window.currentFilesDate) {
                        openFilesPopup(window.currentFilesGroupId, window.currentFilesClient, window.currentFilesDate);
                    }
                } else {
                    showMessage(result.error || 'Failed to delete file', 'error');
                }
                
            } catch (error) {
                console.error('Error deleting file:', error);
                showMessage('Error deleting file: ' + error.message, 'error');
            }
        }
        
        // Client Autocomplete Functionality
        document.addEventListener('DOMContentLoaded', function() {
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
        document.addEventListener('DOMContentLoaded', function() {
            const totalRecords = 25;
            if (totalRecords > 1000) {
                const loadingOverlay = document.getElementById('loadingOverlay');
                loadingOverlay.style.display = 'flex';
                
                // Hide loading overlay after page is fully loaded
                window.addEventListener('load', function() {
                    setTimeout(function() {
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
                link.addEventListener('click', function(e) {
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
        }
        
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
                    setTimeout(function() {
                        overlay.style.display = 'none';
                        console.log('❌ OneDrive overlay: Hidden due to batch check error');
                    }, 3000);
                }
            } catch (error) {
                console.log('❌ OneDrive overlay: Batch compliance check network error:', error);
                
                // Show error message
                messageElement.textContent = '❌ Network error. Please try again.';
                
                // Hide overlay after error
                setTimeout(function() {
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
                            console.log('🔄 OneDrive overlay: Still processing... (' + attempts + 1 + '/' + maxAttempts + ')');
                            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                            attempts++;
                            continue;
                        } else {
                            // OneDrive processing is complete
                            console.log('✅ OneDrive overlay: Processing complete!');
                            messageElement.textContent = '✅ All files processed successfully!';
                            
                            // Hide overlay after showing completion
                            setTimeout(function() {
                                overlay.style.display = 'none';
                                console.log('✅ OneDrive overlay: Hidden after successful completion');
                            }, 2000);
                            return;
                        }
                    } else {
                        // Error checking status, assume completion
                        console.log('⚠️ OneDrive overlay: Status check failed, assuming completion');
                        messageElement.textContent = '✅ Files processed successfully!';
                        setTimeout(function() {
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
            console.log('⏰ OneDrive overlay: Reached max attempts, assuming completion');
            messageElement.textContent = '✅ Files processed successfully!';
            setTimeout(function() {
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
        }
        

        
        // Initialize page on load
        document.addEventListener('DOMContentLoaded', function() {
            loadUploadStatus();
            
            // Load sent status immediately and then with delays
            console.log('🚀 [SENT STATUS] Calling loadSentStatus immediately');
            console.log('🚀 [SENT STATUS] ===========================================');
            loadSentStatus();
            
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
                console.log('🔧 [SENT STATUS] Final check to preserve sent status styling');
                loadSentStatus();
            }, 3000);
        });
        
        // Also run when window is fully loaded
        window.addEventListener('load', function() {
            console.log('🚀 [SENT STATUS] Window loaded, calling loadSentStatus');
            setTimeout(() => {
                loadSentStatus();
            }, 1000);
        });
        
        // Set up a periodic check to ensure sent status styling is maintained
        setInterval(() => {
            const sentRows = document.querySelectorAll('tr[data-sent-status="yes"]');
            sentRows.forEach(row => {
                if (!row.classList.contains('inspection-complete') || 
                    row.style.backgroundColor !== 'rgb(34, 197, 94)') {
                    console.log('🔧 [SENT STATUS] Re-applying styling to row:', row.getAttribute('data-group-id'));
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
            loadInspectionFiles(groupId, clientName, inspectionDate);
        }
        
        function closeFilesPopup() {
            const modal = document.getElementById('filesModal');
            modal.style.display = 'none';
            
            // Hide download button
            const downloadBtn = document.getElementById('downloadAllBtn');
            downloadBtn.style.display = 'none';
        }
        
        // Download all files for current inspection group as ZIP
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
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating ZIP...';
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
                    // Get the blob from response
                    const blob = await response.blob();
                    const contentDisposition = response.headers.get('Content-Disposition');
                    
                    // Extract filename from header or create default
                    let filename = clientName + '_' + inspectionDate + '_all_files.zip';
                    if (contentDisposition) {
                        const match = contentDisposition.match(/filename[^;=\n]*=([^;\n]*)/);
                        if (match && match[1]) {
                            filename = match[1].replace(/["']/g, '');
                        }
                    }
                    
                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    
                    // Cleanup
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
        window.onclick = function(event) {
            const modal = document.getElementById('filesModal');
            if (event.target === modal) {
                closeFilesPopup();
            }
        };
        
        async function loadInspectionFiles(groupId, clientName, inspectionDate) {
            try {
                console.log('🔄 File fetch: Starting file fetch request...');
                
                const response = await fetch('/inspections/files/', {
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
                console.log('🔄 File fetch: File fetch completed:', result.success);
                
                const filesLoading = document.getElementById('filesLoading');
                const filesContent = document.getElementById('filesContent');
                const filesList = document.getElementById('filesList');
                
                filesLoading.style.display = 'none';
                filesContent.style.display = 'block';
                
                if (result.success) {
                    displayFiles(result.files, result.message);
                } else {
                    filesList.innerHTML = '<div class="empty-category">Error loading files: ' + result.error + '</div>';
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
        let statusCheckInProgress = false;
        
        async function checkAllClientFileStatus() {
            // Check file status for all clients on current page and update button colors
            if (statusCheckInProgress) {
                console.log('⚠️ [FRONTEND] Status check already in progress, skipping...');
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
                
                // Debug: Check if buttons are available
                const testButtons = document.querySelectorAll('button.btn-view-files, button[class*="btn-view-files"]');
                const allButtons = document.querySelectorAll('button');
                console.log('🔍 [FRONTEND] Found ' + testButtons.length + ' View Files buttons on page (' + allButtons.length + ' total buttons)');
                
                // If no buttons found, wait a bit more
                if (testButtons.length === 0) {
                    console.log('⚠️ [FRONTEND] No buttons found, waiting 500ms more...');
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
                        ' (Optimized: checked ' + result.clients_checked + ' clients from current page)' : '';
                    
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
                    console.log('   Button ' + index + 1 + ': "' + button.textContent.trim() + '"');
                    // Remove existing color classes
                    button.classList.remove('btn-view-files-green', 'btn-view-files-red', 'btn-view-files-blue', 'btn-view-files-orange', 'btn-warning', 'btn-danger');
                    
                    // Find the status icon
                    const statusIcon = button.querySelector('i[class*="fa-"]');
                    
                    // Add appropriate color class and icon based on status
                    switch(fileStatus) {
                        case 'all_files':
                            button.classList.add('btn-view-files-green');
                            button.title = 'All files available (RFI, Invoice, Lab Results, Compliance)';
                            if (statusIcon) {
                                statusIcon.className = 'fas fa-check-circle';
                                statusIcon.style.color = '#059669';
                            }
                            console.log(`   ✅ Applied GREEN color to button`);
                            break;
                        case 'compliance_only':
                            button.classList.add('btn-view-files-blue');
                            button.title = 'Only compliance documents available';
                            if (statusIcon) {
                                statusIcon.className = 'fas fa-shield-alt';
                                statusIcon.style.color = '#f59e0b';
                            }
                            console.log(`   🟡 Applied YELLOW color to button`);
                            break;
                        case 'no_files':
                            button.classList.add('btn-view-files-red');
                            button.title = 'No files found';
                            if (statusIcon) {
                                statusIcon.className = 'fas fa-times-circle';
                                statusIcon.style.color = '#dc2626';
                            }
                            console.log(`   🔴 Applied RED color to button`);
                            break;
                        default:
                            button.classList.add('btn-view-files');
                            button.title = 'View Files';
                            if (statusIcon) {
                                statusIcon.className = 'fas fa-download';
                                statusIcon.style.color = '#6b7280';
                            }
                    }
                }
            });
        }

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
                        ${statusInfo ? `<span style="margin-left: 1rem; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; ${statusInfo.style}">${statusInfo.text}</span>` : ''}
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
                    const periodBackground = categoryKey === 'compliance' ? '#fef3c7' : '#f9fafb'; // Yellow background for compliance
                    const periodBorderColor = categoryKey === 'compliance' ? '#fbbf24' : '#d1d5db'; // Yellow border for compliance
                    
                    html += `
                        <div class="inspection-period" style="background: ${periodBackground}; padding: 0.75rem; border-radius: 4px; border-left: 3px solid ${periodBorderColor};">
                            <div style="font-weight: 500; color: #6b7280; margin-bottom: 0.5rem; font-size: 0.875rem;">
                                📅 ${period}
                                ${categoryKey === 'compliance' ? ` - ${periodFiles[0].commodity || 'Unknown Commodity'}` : ''}
                            </div>
                    `;
                    
                    periodFiles.forEach(file => {
                        const fileSize = formatFileSize(file.size);
                        const modifiedDate = new Date(file.modified_time * 1000).toLocaleDateString();
                        
                        // Set background color based on category
                        const backgroundColor = categoryKey === 'compliance' ? '#fef3c7' : 'white'; // Yellow background for compliance
                        const borderColor = categoryKey === 'compliance' ? '#fbbf24' : '#e5e7eb'; // Yellow border for compliance
                        
                        html += 
                            '<div class="file-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: ' + backgroundColor + '; border-radius: 4px; margin-bottom: 0.25rem; border: 1px solid ' + borderColor + ';">' +
                                '<div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">' +
                                    '<i class="fas fa-' + getFileIcon(file.name) + '" style="color: ' + (categoryKey === 'compliance' ? '#f59e0b' : '#6b7280') + ';"></i>' +
                                    '<div>' +
                                        '<div style="font-weight: 500; color: #374151;">' + file.name + '</div>' +
                                        '<div style="font-size: 0.75rem; color: #6b7280;">' +
                                            fileSize + ' • Modified: ' + modifiedDate +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                                '<button class="btn btn-sm" onclick="downloadFile(\'' + file.download_url + '\')" style="background: #3b82f6; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">' +
                                    '<i class="fas fa-download"></i> Download' +
                                '</button>' +
                            '</div>';
                    });
                    
                    html += `</div>`; // Close inspection-period
                }
                
                html += `</div></div>`; // Close file-list and file-category
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
            const ext = filename.split('.').pop().toLowerCase();
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
            switch(fileStatus) {
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
            
            // Show success message if provided
            if (message) {
                filesList.innerHTML = '<div class="success-message" style="background: #d4edda; color: #155724; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; border: 1px solid #c3e6cb;">' +
                    '<i class="fas fa-check-circle"></i> ' + message +
                '</div>';
            }
            
            // Check if there are actually any files (not just empty arrays)
            const hasFiles = files && Object.values(files).some(fileList => fileList && fileList.length > 0);
            
            if (!hasFiles) {
                filesList.innerHTML += '<div class="empty-category">No files found for this inspection</div>';
                return;
            }
            
            let html = '';
            
            // Define categories in order
            const categories = [
                { key: 'rfi', name: 'RFI Documents', icon: 'fas fa-file-alt' },
                { key: 'invoice', name: 'Invoice Documents', icon: 'fas fa-file-invoice' },
                { key: 'lab', name: 'Lab Results', icon: 'fas fa-flask' },
                { key: 'retest', name: 'Retest Documents', icon: 'fas fa-redo' },
                { key: 'compliance', name: 'Compliance Documents', icon: 'fas fa-shield-alt' }
            ];
            
            categories.forEach(category => {
                const categoryFiles = files[category.key] || [];
                
                html += 
                    '<div class="file-category">' +
                        '<div class="file-category-header">' +
                            '<div class="category-title">' +
                                '<i class="' + category.icon + '"></i>' +
                                category.name +
                            '</div>' +
                            '<div class="file-count">' + categoryFiles.length + '</div>' +
                        '</div>' +
                        '<div class="file-list">';
                
                if (categoryFiles.length === 0) {
                    html += '<div class="empty-category">No files in this category</div>';
                } else {
                    categoryFiles.forEach(file => {
                        html += 
                            '<div class="file-item">' +
                                '<div class="file-info">' +
                                    '<i class="file-icon ' + getFileIcon(file.name) + '"></i>' +
                                    '<div class="file-details">' +
                                        '<div class="file-name">' + file.name + '</div>' +
                                        '<div class="file-size">' +
                                            '<span>' + formatFileSize(file.size) + '</span>' +
                                            '<span>•</span>' +
                                            '<span>' + file.modified + '</span>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="file-actions">' +
                                    getViewButton(file) +
                                    '<a href="' + (file.url || `/download-inspection-file/?file=${encodeURIComponent(file.relative_path)}&source=${file.source || 'local'}`) + '" class="btn btn-file btn-secondary" title="Download File">' +
                                        '<i class="fas fa-download"></i>' +
                                    '</a>' +
                                '</div>' +
                            '</div>';
                    });
                }
                
                html += '</div></div>';
            });
            
            filesList.innerHTML = html;
        }
        
        function getFileIcon(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            switch(ext) {
                case 'pdf': return 'fas fa-file-pdf';
                case 'xlsx': case 'xls': return 'fas fa-file-excel';
                case 'docx': case 'doc': return 'fas fa-file-word';
                case 'jpg': case 'jpeg': case 'png': return 'fas fa-file-image';
                case 'zip': case 'rar': return 'fas fa-file-archive';
                default: return 'fas fa-file';
            }
        }
        
        function getViewButton(file) {
            const ext = file.name.split('.').pop().toLowerCase();
            
            // For ZIP files, show extract/contents button instead of view
            if (ext === 'zip' || ext === 'rar') {
                return '<button class="btn btn-file btn-warning" onclick="showZipContents(\'' + file.relative_path + '\', \'' + (file.source || 'local') + '\')" title="Show ZIP Contents">' +
                        '<i class="fas fa-eye"></i>' +
                    '</button>';
            }
            
            // For viewable files (PDF, images, etc.), show view button
            const viewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt'];
            if (viewableTypes.includes(ext)) {
                // Use OneDrive URL if available, otherwise use local URL
                const viewUrl = file.url || '/download-inspection-file/?file=' + encodeURIComponent(file.relative_path) + '&source=' + file.source || 'local';
                return 
                    '<a href="' + viewUrl + '" class="btn btn-file btn-primary" target="_blank" title="View File">' +
                        '<i class="fas fa-eye"></i>' +
                    '</a>';
            }
            
            // For other files (Excel, Word), show download-only
            return `
                <button class="btn btn-file btn-info" onclick="alert('This file type opens best when downloaded')" title="Download to View">
                    <i class="fas fa-info"></i>
                </button>
            `;
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
                    let contentsHtml = '<div class="file-category">' +
                        '<div class="file-category-header">' +
                            '<div class="category-title">' +
                                '<i class="fas fa-file-archive"></i>' +
                                'ZIP File Contents: ' + result.zip_name +
                            '</div>' +
                            '<div class="file-count">' + result.total_files + '</div>' +
                        '</div>' +
                        '<div class="file-list">';
                    
                    if (result.contents && result.contents.length > 0) {
                        result.contents.forEach(item => {
                            contentsHtml += '<div class="file-item">' +
                                '<div class="file-info">' +
                                    '<i class="file-icon ' + getFileIcon(item.name) + '"></i>' +
                                    '<div class="file-details">' +
                                        '<div class="file-name">' + item.name + '</div>' +
                                        '<div class="file-size">' +
                                            '<span>' + formatFileSize(item.size) + '</span>' +
                                            '<span>•</span>' +
                                            '<span>Compressed: ' + formatFileSize(item.compressed_size) + '</span>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>';
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
        
        // Load sent status from database on page load
        function loadSentStatus() {
            console.log('🚀 [SENT STATUS] Starting loadSentStatus function');
            console.log('🚀 [SENT STATUS] Function called at:', new Date().toISOString());
            
            // Get all sent status dropdowns and restore their values from the template data
            const sentDropdowns = document.querySelectorAll('.sent-status-dropdown');
            console.log('🔍 [SENT STATUS] Found ' + sentDropdowns.length + ' sent status dropdowns');
            
            // Also check how many rows we have
            const allRows = document.querySelectorAll('tr[data-group-id]');
            console.log('🔍 [SENT STATUS] Found ' + allRows.length + ' rows with data-group-id');
            
            sentDropdowns.forEach((dropdown, index) => {
                const groupId = dropdown.getAttribute('data-group-id');
                const currentValue = dropdown.value;
                console.log('🔍 [SENT STATUS] Processing dropdown ' + index + 1 + '/' + sentDropdowns.length + ': groupId="' + groupId + '", value="' + currentValue + '"');
                
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
                    console.log('🔍 [SENT STATUS] Looking for row with data-group-id="' + groupId + '":', groupRow ? 'FOUND' : 'NOT FOUND');
                    
                    // Debug: List all available rows with data-group-id
                    const allRows = document.querySelectorAll('tr[data-group-id]');
                    console.log(`🔍 [SENT STATUS] Available rows:`, Array.from(allRows).map(row => row.getAttribute('data-group-id')));
                    
                    if (groupRow) {
                        groupRow.classList.add('inspection-complete');
                        console.log('🎯 [SENT STATUS] SUCCESS: Marked group ' + groupId + ' as complete on page load');
                        
                        // Force the styling directly and make it persistent
                        groupRow.style.backgroundColor = '#22c55e !important';
                        groupRow.style.color = 'white !important';
                        groupRow.style.borderColor = '#16a34a !important';
                        
                        // Also apply to all td elements with !important
                        const tds = groupRow.querySelectorAll('td');
                        tds.forEach(td => {
                            td.style.setProperty('background-color', '#22c55e', 'important');
                            td.style.setProperty('color', 'white', 'important');
                            td.style.setProperty('border-color', '#16a34a', 'important');
                        });
                        
                        // Add a data attribute to mark this row as sent
                        groupRow.setAttribute('data-sent-status', 'yes');
                        
                        // Verify the class was added
                        if (groupRow.classList.contains('inspection-complete')) {
                            console.log('✅ [SENT STATUS] VERIFIED: Row ' + groupId + ' has inspection-complete class');
                        } else {
                            console.log('❌ [SENT STATUS] ERROR: Row ' + groupId + ' does NOT have inspection-complete class');
                        }
                    } else {
                        console.log('❌ [SENT STATUS] ERROR: Could not find row for group ' + groupId);
                        
                        // Let's see what rows we do have
                        const allGroupRows = document.querySelectorAll('tr[data-group-id]');
                        console.log(`🔍 [SENT STATUS] Available rows:`, Array.from(allGroupRows).map(row => row.getAttribute('data-group-id')));
                    }
                } else if (currentValue === 'NO') {
                    dropdown.style.backgroundColor = '#ef4444';
                    dropdown.style.color = 'white';
                    dropdown.style.borderColor = '#dc2626';
                    dropdown.classList.remove('sent-yes');
                    dropdown.classList.add('sent-no');
                    
                    // Remove complete status from row
                    const groupRow = document.querySelector('tr[data-group-id="' + groupId + '"]');
                    if (groupRow) {
                        groupRow.classList.remove('inspection-complete');
                    }
                } else {
                    dropdown.style.backgroundColor = 'var(--card-bg)';
                    dropdown.style.color = 'var(--text)';
                    dropdown.style.borderColor = 'var(--border)';
                    dropdown.classList.remove('sent-yes', 'sent-no');
                    
                    // Remove complete status from row
                    const groupRow = document.querySelector('tr[data-group-id="' + groupId + '"]');
                    if (groupRow) {
                        groupRow.classList.remove('inspection-complete');
                    }
                }
                
                console.log('Restored sent status for group ' + groupId + ': ' + currentValue);
            });
            
            console.log('🏁 [SENT STATUS] Completed loadSentStatus function');
            console.log('🚀 [SENT STATUS] ===========================================');
        }
        
        // Check all uploaded files on page load to ensure buttons are properly colored
        function checkAllUploadedFiles() {
            console.log('🔍 Checking all uploaded files on page load...');
            
            // Get all upload buttons on the page
            const uploadButtons = document.querySelectorAll('.btn-upload');
            
            uploadButtons.forEach(button => {
                const buttonId = button.id;
                if (buttonId) {
                    // Check if this button is already marked as uploaded
                    if (!button.classList.contains('uploaded')) {
                        // Check if file actually exists
                        checkFileExists(buttonId, null);
                    }
                }
            });
        }
        
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
        }
        
        function markAsUploaded(buttonId) {
            // Mark button as uploaded and save to localStorage
            console.log('markAsUploaded called for:', buttonId);
            const button = document.getElementById(buttonId);
            if (button) {
                console.log('Button found, adding uploaded class');
                button.classList.add('uploaded');
                
                // Save to localStorage
                const uploadStatus = JSON.parse(localStorage.getItem('uploadStatus') || '{}');
                uploadStatus[buttonId] = true;
                localStorage.setItem('uploadStatus', JSON.stringify(uploadStatus));
                console.log('Updated localStorage:', uploadStatus);
            } else {
                console.log('Button not found for ID:', buttonId);
            }
        }
        
        
        // Function to automatically update all View Files button colors on page load
        async function updateAllViewFilesButtonColors() {
            console.log('🎨 Starting automatic color update for all View Files buttons');
            
            // Show loading state on all View Files buttons - use multiple detection methods
            let allViewFilesButtons = [];
            
            // Method 1: By class
            allViewFilesButtons = document.querySelectorAll('button.btn-view-files, button[class*="btn-view-files"]');
            console.log('🔍 [FRONTEND] Method 1 - Found ' + allViewFilesButtons.length + ' buttons by class');
            
            // Method 2: By onclick attribute (more reliable)
            if (allViewFilesButtons.length === 0) {
                allViewFilesButtons = document.querySelectorAll('button[onclick*="openFilesPopup"]');
                console.log('🔍 [FRONTEND] Method 2 - Found ' + allViewFilesButtons.length + ' buttons by onclick');
            }
            
            // Method 3: By text content as fallback
                if (allViewFilesButtons.length === 0) {
                    const allButtons = document.querySelectorAll('button');
                allViewFilesButtons = Array.from(allButtons).filter(btn => 
                    btn.textContent.includes('View Files') || 
                    btn.textContent.includes('Files') ||
                    btn.onclick && btn.onclick.toString().includes('openFilesPopup')
                );
                console.log('🔍 [FRONTEND] Method 3 - Found ' + allViewFilesButtons.length + ' buttons by text/onclick');
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
            console.log(`📅 Inspection dates:`, clientData);
            
            if (clientNames.length === 0) {
                console.log('⚠️ No clients found to check');
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
                console.log('⚠️ No View Files buttons found, skipping automatic color update');
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
            console.log('Setting up expand button event listeners');
            const expandButtons = document.querySelectorAll('.expand-btn');
            console.log('Found expand buttons:', expandButtons.length);
            
            expandButtons.forEach((button, index) => {
                console.log('Setting up button ' + index + ':', button);
                // Remove any existing listeners to avoid duplicates
                button.removeEventListener('click', handleExpandClick);
                button.addEventListener('click', handleExpandClick);
            });
        }
        
        // Handle expand button click
        function handleExpandClick(e) {
            e.preventDefault();
            e.stopPropagation();
            const groupId = this.getAttribute('data-group-id');
            console.log('Expand button clicked for group:', groupId);
            toggleGroup(e, groupId);
        }
        
        // Simple, clean expand button functionality
        document.addEventListener('click', function(e) {
            if (e.target.closest('.expand-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const button = e.target.closest('.expand-btn');
                const groupId = button.getAttribute('data-group-id');
                console.log('Expand button clicked for group:', groupId);
                toggleGroup(e, groupId);
            }
        });
        
        // Initialize page functionality when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 [FRONTEND] DOM ready, initializing page functionality...');
            
            // Update View Files button colors with delays
            setTimeout(function() {
                console.log('🎨 [FRONTEND] Starting initial automatic color update...');
                updateAllViewFilesButtonColors();
            }, 1000);
            
            setTimeout(function() {
                console.log('🔄 [FRONTEND] Retrying automatic color update...');
                updateAllViewFilesButtonColors();
            }, 3000);
        });

        
        // Upload RFI function
        function uploadRFI(groupId) {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf';
            fileInput.style.display = 'none';
            
            fileInput.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Additional client-side PDF validation
                    if (!file.name.toLowerCase().endsWith('.pdf')) {
                        alert('Only PDF files are allowed. Please select a PDF document.');
                        return;
                    }
                    // Create form data
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('group_id', groupId);
                    formData.append('document_type', 'rfi');
                    
                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                                     'V6UGNQxSJlybzoWeD5dtV5pDYIZ1plaXcjuv4YOLEN2LRzOy6zTdUdf7Wvj6d7Ow';
                    formData.append('csrfmiddlewaretoken', csrfToken);
                    
                    // Upload file
                    fetch('/upload-document/', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('RFI uploaded successfully!');
                            markAsUploaded('rfi-' + groupId);
                            
                            // Auto-open files popup after successful upload
                            const button = document.getElementById('rfi-' + groupId);
                            if (button) {
                                const clientName = button.getAttribute('data-client-name');
                                const inspectionDate = button.getAttribute('data-inspection-date');
                                if (clientName && inspectionDate) {
                                    // Small delay to ensure the upload is processed
                                    setTimeout(() => {
                                        openFilesPopup(groupId, clientName, inspectionDate);
                                    }, 1000);
                                }
                            }
                        } else {
                            alert('Error uploading RFI: ' + data.error);
                        }
                    })
                    .catch(error => {
                        alert('Error uploading RFI: ' + error.message);
                    });
                }
            };
            
            // Trigger file selection
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        }
        
        // Upload Invoice function
        function uploadInvoice(groupId) {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf';
            fileInput.style.display = 'none';
            
            fileInput.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Additional client-side PDF validation
                    if (!file.name.toLowerCase().endsWith('.pdf')) {
                        alert('Only PDF files are allowed. Please select a PDF document.');
                        return;
                    }
                    // Create form data
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('group_id', groupId);
                    formData.append('document_type', 'invoice');
                    
                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                                     'V6UGNQxSJlybzoWeD5dtV5pDYIZ1plaXcjuv4YOLEN2LRzOy6zTdUdf7Wvj6d7Ow';
                    formData.append('csrfmiddlewaretoken', csrfToken);
                    
                    // Upload file
                    fetch('/upload-document/', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('Invoice uploaded successfully!');
                            markAsUploaded('invoice-' + groupId);
                            
                            // Auto-open files popup after successful upload
                            const button = document.getElementById('invoice-' + groupId);
                            if (button) {
                                const clientName = button.getAttribute('data-client-name');
                                const inspectionDate = button.getAttribute('data-inspection-date');
                                if (clientName && inspectionDate) {
                                    // Small delay to ensure the upload is processed
                                    setTimeout(() => {
                                        openFilesPopup(groupId, clientName, inspectionDate);
                                    }, 1000);
                                }
                            }
                        } else {
                            alert('Error uploading Invoice: ' + data.error);
                        }
                    })
                    .catch(error => {
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
        function uploadLab(inspectionId) {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf';
            fileInput.style.display = 'none';
            
            fileInput.onchange = function(e) {
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
                                     'V6UGNQxSJlybzoWeD5dtV5pDYIZ1plaXcjuv4YOLEN2LRzOy6zTdUdf7Wvj6d7Ow';
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
                            alert('Lab report uploaded successfully!');
                            console.log('Marking lab button as uploaded:', 'lab-' + inspectionId);
                            markAsUploaded('lab-' + inspectionId);
                            
                            // Auto-open files popup after successful upload
                            const button = document.getElementById('lab-' + inspectionId);
                            if (button) {
                                const groupId = button.getAttribute('data-group-id');
                                const clientName = button.getAttribute('data-client-name');
                                const inspectionDate = button.getAttribute('data-inspection-date');
                                if (groupId && clientName && inspectionDate) {
                                    // Small delay to ensure the upload is processed
                                    setTimeout(() => {
                                        openFilesPopup(groupId, clientName, inspectionDate);
                                    }, 1000);
                                }
                            }
                        } else {
                            alert('Error uploading Lab report: ' + data.error);
                        }
                    })
                    .catch(error => {
                        alert('Error uploading Lab report: ' + error.message);
                    });
                }
            };
            
            // Trigger file selection
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        }
        
        // Upload Lab Form function
        function uploadLabForm(inspectionId) {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf';
            fileInput.style.display = 'none';
            
            fileInput.onchange = function(e) {
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
                                     'V6UGNQxSJlybzoWeD5dtV5pDYIZ1plaXcjuv4YOLEN2LRzOy6zTdUdf7Wvj6d7Ow';
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
                            alert('Lab form submission uploaded successfully!');
                            console.log('Marking lab form button as uploaded:', 'lab-form-' + inspectionId);
                            markAsUploaded('lab-form-' + inspectionId);
                            
                            // Auto-open files popup after successful upload
                            const button = document.getElementById('lab-form-' + inspectionId);
                            if (button) {
                                const groupId = button.getAttribute('data-group-id');
                                const clientName = button.getAttribute('data-client-name');
                                const inspectionDate = button.getAttribute('data-inspection-date');
                                if (groupId && clientName && inspectionDate) {
                                    // Small delay to ensure the upload is processed
                                    setTimeout(() => {
                                        openFilesPopup(groupId, clientName, inspectionDate);
                                    }, 1000);
                                }
                            }
                        } else {
                            alert('Error uploading Lab form submission: ' + data.error);
                        }
                    })
                    .catch(error => {
                        alert('Error uploading Lab form submission: ' + error.message);
                    });
                }
            };
            
            // Trigger file selection
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        }
        
        // Upload Retest function
        function uploadRetest(inspectionId) {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf';
            fileInput.style.display = 'none';
            
            fileInput.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Additional client-side PDF validation
                    if (!file.name.toLowerCase().endsWith('.pdf')) {
                        alert('Only PDF files are allowed. Please select a PDF document.');
                        return;
                    }
                    // Get the group_id from the button's data attribute
                    const button = document.getElementById('retest-' + inspectionId);
                    let groupId = null;
                    if (button) {
                        groupId = button.getAttribute('data-group-id');
                    }
                    
                    // Create form data
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('inspection_id', inspectionId);
                    formData.append('document_type', 'retest');
                    if (groupId) {
                        formData.append('group_id', groupId);
                    }
                    
                    // Get CSRF token
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                                     'V6UGNQxSJlybzoWeD5dtV5pDYIZ1plaXcjuv4YOLEN2LRzOy6zTdUdf7Wvj6d7Ow';
                    formData.append('csrfmiddlewaretoken', csrfToken);
                    
                    // Upload file
                    fetch('/upload-document/', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Retest upload response:', data);
                        if (data.success) {
                            alert('Retest report uploaded successfully!');
                            console.log('Marking retest button as uploaded:', 'retest-' + inspectionId);
                            markAsUploaded('retest-' + inspectionId);
                            
                            // Auto-open files popup after successful upload
                            const button = document.getElementById('retest-' + inspectionId);
                            if (button) {
                                const groupId = button.getAttribute('data-group-id');
                                const clientName = button.getAttribute('data-client-name');
                                const inspectionDate = button.getAttribute('data-inspection-date');
                                if (groupId && clientName && inspectionDate) {
                                    // Small delay to ensure the upload is processed
                                    setTimeout(() => {
                                        openFilesPopup(groupId, clientName, inspectionDate);
                                    }, 1000);
                                }
                            }
                        } else {
                            alert('Error uploading Retest report: ' + data.error);
                        }
                    })
                    .catch(error => {
                        alert('Error uploading Retest report: ' + error.message);
                    });
                }
            };
            
            // Trigger file selection
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        }
        
        // Upload RFI function (for inspectors only - group level)
        function uploadRFI(groupId) {
            // Enhanced debug logging
            console.log('🔍 uploadRFI called with groupId:', groupId);
            console.log('🔍 groupId type:', typeof groupId);
            console.log('🔍 groupId length:', groupId ? groupId.length : 'null/undefined');
            console.log('🔍 groupId === null:', groupId === null);
            console.log('🔍 groupId === undefined:', groupId === undefined);
            console.log('🔍 groupId === "":', groupId === "");
            
            // Additional debugging - check if we can get the group_id from the button
            const button = event.target.closest('button');
            if (button) {
                const debugGroupId = button.getAttribute('data-debug-group-id');
                console.log('🔍 Debug group_id from button:', debugGroupId);
                console.log('🔍 Button element:', button);
                console.log('🔍 Button id:', button.id);
                
                // Try to get group_id from button id
                const buttonId = button.id;
                if (buttonId && buttonId.startsWith('rfi-')) {
                    const extractedGroupId = buttonId.substring(4); // Remove 'rfi-' prefix
                    console.log('🔍 Extracted group_id from button id:', extractedGroupId);
                    if (extractedGroupId && (!groupId || groupId.trim() === '')) {
                        console.log('🔍 Using extracted group_id as fallback');
                        groupId = extractedGroupId;
                    }
                }
            }
            
            if (!groupId || groupId.trim() === '') {
                console.error('❌ No valid group ID found!');
                console.error('❌ Original groupId:', groupId);
                console.error('❌ Button debug group_id:', button ? button.getAttribute('data-debug-group-id') : 'No button found');
                alert('Error: No group ID provided. Please refresh the page and try again.');
                return;
            }
            
            // Template now generates the correct format: ClientName_YYYYMMDD
            // Backend expects: ClientName_YYYYMMDD (underscores, no special chars)
            // No conversion needed
            
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf';
            fileInput.style.display = 'none';
            
            fileInput.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Additional client-side PDF validation
                    if (file.type !== 'application/pdf') {
                        alert('Please select a PDF file.');
                        return;
                    }
                    
                    // Create form data
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('group_id', groupId);
                    formData.append('document_type', 'rfi');
                    
                    // Debug logging
                    console.log('Form data being sent:');
                    console.log('- file:', file.name);
                    console.log('- group_id:', groupId);
                    console.log('- document_type: rfi');
                    
                    // Get CSRF token
                    const csrfToken = getCSRFToken();
                    formData.append('csrfmiddlewaretoken', csrfToken);
                    
                    // Upload file
                    fetch('/upload-document/', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('RFI document uploaded successfully for this inspection group!');
                            
                            // Auto-open files popup after successful upload
                            const button = document.getElementById('rfi-' + groupId);
                            if (button) {
                                const clientName = button.getAttribute('data-client-name');
                                const inspectionDate = button.getAttribute('data-inspection-date');
                                if (clientName && inspectionDate) {
                                    // Small delay to ensure the upload is processed
                                    setTimeout(() => {
                                        openFilesPopup(groupId, clientName, inspectionDate);
                                    }, 1000);
                                }
                            }
                        } else {
                            alert('Error uploading RFI document: ' + data.error);
                        }
                    })
                    .catch(error => {
                        alert('Error uploading RFI document: ' + error.message);
                    });
                }
            };
            
            // Trigger file selection
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        }
        
        // Update test result function
        function updateTestResult(checkbox) {
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
        }
        
        // Update needs retest function
        function updateNeedsRetest(dropdown) {
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
        }
        
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
        }
        
        // Update Bought Sample function
        function updateBoughtSample(input) {
            const inspectionId = input.getAttribute('data-inspection-id');
            const boughtSampleValue = input.value;
            
            // Get CSRF token
            const csrfToken = getCSRFToken();
            
            // Create form data
            const formData = new FormData();
            formData.append('inspection_id', inspectionId);
            formData.append('bought_sample', boughtSampleValue);
            formData.append('csrfmiddlewaretoken', csrfToken);
            
            // Send update request
            fetch('/update-bought-sample/', {
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
                    alert('Error updating Bought Sample: ' + data.error);
                }
            })
            .catch(error => {
                alert('Error updating Bought Sample: ' + error.message);
            });
        }
        
        // Update Group Km Traveled function
        function updateGroupKmTraveled(input) {
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
        }
        
        // Update Group Hours function
        function updateGroupHours(input) {
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
        }
        
        // Update Hours function
        function updateHours(input) {
            const inspectionId = input.getAttribute('data-inspection-id');
            const hoursValue = input.value;
            
            // Get CSRF token
            const csrfToken = getCSRFToken();
            
            // Create form data
            const formData = new FormData();
            formData.append('inspection_id', inspectionId);
            formData.append('hours', hoursValue);
            formData.append('csrfmiddlewaretoken', csrfToken);
            
            // Send update request
            fetch('/update-hours/', {
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
                    alert('Error updating Hours: ' + data.error);
                }
            })
            .catch(error => {
                alert('Error updating Hours: ' + error.message);
            });
        }
        
        // Update Product Name
        function updateProductName(input) {
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

        // Update Product Class
        function updateProductClass(dropdown) {
            const inspectionId = dropdown.getAttribute('data-inspection-id');
            const value = dropdown.value;
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

        // Update Lab function
        function updateLab(dropdown) {
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
        }
        
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
            const retestButton = document.getElementById('retest-' + inspectionId);
            const dropdown = document.querySelector('select[data-inspection-id="' + inspectionId + '"]');
            
            if (labButton && retestButton) {
                // Check if sample was taken
                const isSampleTaken = dropdown && !dropdown.disabled;
                
                if (!isSampleTaken) {
                    // No sample taken - disable both buttons
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
                } else {
                    // Sample taken - enable lab button
                    labButton.disabled = false;
                    labButton.style.opacity = '';
                    labButton.style.cursor = '';
                    labButton.onclick = function() { uploadLab(inspectionId); };
                    labButton.title = 'Lab result upload available';
                    
                    // Retest button is only enabled if retest is YES
                    if (needsRetest === 'YES') {
                        retestButton.disabled = false;
                        retestButton.style.opacity = '';
                        retestButton.style.cursor = '';
                        retestButton.onclick = function() { uploadRetest(inspectionId); };
                        retestButton.title = 'Retest upload available';
                    } else {
                        retestButton.disabled = true;
                        retestButton.style.opacity = '0.5';
                        retestButton.style.cursor = 'not-allowed';
                        retestButton.onclick = null;
                        retestButton.title = 'Retest not required - Retest upload disabled';
                    }
                }
            }
        }
        
        // Function to calculate and display OneDrive auto-upload countdown
        function updateOneDriveCountdown() {
            const countdownElements = document.querySelectorAll('.onedrive-countdown');
            
            countdownElements.forEach((element, index) => {
                const sentDateStr = element.getAttribute('data-sent-date');
                const onedriveUploaded = element.getAttribute('data-onedrive-uploaded') === 'true';
                const onedriveUploadDate = element.getAttribute('data-onedrive-upload-date');
                const delayDays = parseFloat(element.getAttribute('data-delay-days')) || 3;
                
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
                        let color = '#6b7280';
                        
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
        }
        
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
        
        // Test function to verify JavaScript is working
        function testFunction() {
            console.log('Test function is working');
        }
        
        // Update countdown on page load and every minute
        document.addEventListener('DOMContentLoaded', function() {
            updateOneDriveCountdown();
            setInterval(updateOneDriveCountdown, 60000); // Update every minute
            
            // Initialize other functions
            initializeButtonStates();
        });
        
        // Function to handle Send button clicks with validation
        function handleSendButtonClick(groupId, clientName, inspectionDate, hasAllDocuments) {
            if (!hasAllDocuments) {
                alert('Cannot send: Missing required documents. Ensure all compliance documents are downloaded and RFI/Invoice are uploaded.');
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
        }
    
// === END SCRIPT BLOCK 2 ===

// === SCRIPT BLOCK 3 ===

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
            const btnText = btn.querySelector('.btn-text');
            const statusDiv = document.getElementById('inspection-sync-status');
            
            // Disable button and show loading state
            btn.disabled = true;
            btnText.textContent = 'Syncing...';
            btn.style.opacity = '0.7';
            statusDiv.innerHTML = '';

            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 'V6UGNQxSJlybzoWeD5dtV5pDYIZ1plaXcjuv4YOLEN2LRzOy6zTdUdf7Wvj6d7Ow';

            fetch('/refresh-inspections/', {
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

                fetch('/check-sync-status/', { 
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
                        btnText.textContent = 'Syncing...';
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
                btnText.textContent = 'Sync Inspections';
                btn.style.opacity = '1';
            }

            function updateInspectionPageAfterSync() {
                // Reload the page to show updated inspection data
                window.location.reload();
            }
        }
        
        // Update Group Approved function
        function updateGroupApproved(select) {
            const groupId = select.getAttribute('data-group-id');
            const approvedValue = select.value;
            
            console.log('[APPROVED] Updating Group Approved Status - Group ID:', groupId, 'Value:', approvedValue);
            
            // Get CSRF token
            const csrfToken = getCSRFToken();
            
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
                    console.log('[APPROVED] Approved status saved successfully:', data);
                    // Show success feedback
                    select.style.backgroundColor = '#d4edda';
                    setTimeout(() => {
                        select.style.backgroundColor = '';
                    }, 500);
                } else {
                    console.error('[APPROVED] Error saving approved status:', data.error);
                    alert('Error updating approved status: ' + data.error);
                }
            })
            .catch(error => {
                console.error('[APPROVED] Network error saving approved status:', error);
                alert('Error updating approved status: ' + error.message);
            });
        }
        
        // Expose functions globally - OUTSIDE of any function scope
        window.updateGroupKmTraveled = updateGroupKmTraveled;
        window.updateGroupHours = updateGroupHours;
        window.getCSRFToken = getCSRFToken;
        window.updateGroupApproved = updateGroupApproved;
        
        console.log('JavaScript finished loading successfully!');
        console.log('Global functions exposed:', {
            updateGroupKmTraveled: typeof window.updateGroupKmTraveled,
            updateGroupHours: typeof window.updateGroupHours,
            getCSRFToken: typeof window.getCSRFToken,
            updateGroupApproved: typeof window.updateGroupApproved
        });
    
// === END SCRIPT BLOCK 3 ===
