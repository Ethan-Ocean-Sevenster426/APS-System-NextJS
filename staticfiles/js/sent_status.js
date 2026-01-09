// Simple sent status functionality
console.log('Sent status JavaScript loaded');

// Function to validate that all required uploads are complete
function validateUploadsComplete(row, groupId) {
    console.log('DEBUG Validating uploads for group:', groupId);
    
    const missing = [];
    
    // Check RFI upload status - look for button with ID pattern rfi-{groupId}
    const rfiButton = document.getElementById('rfi-' + groupId);
    const rfiStatus = checkButtonUploadStatus(rfiButton, 'RFI');
    if (!rfiStatus.isUploaded) {
        missing.push(rfiStatus.message);
    }
    
    // Check Invoice upload status - look for button with ID pattern invoice-{groupId}
    const invoiceButton = document.getElementById('invoice-' + groupId);
    const invoiceStatus = checkButtonUploadStatus(invoiceButton, 'Invoice');
    if (!invoiceStatus.isUploaded) {
        missing.push(invoiceStatus.message);
    }
    
    const isComplete = missing.length === 0;
    
    console.log('📊 Upload validation result:', {
        isComplete: isComplete,
        missing: missing,
        groupId: groupId
    });
    
    return {
        isComplete: isComplete,
        missing: missing
    };
}

// Function to check individual button upload status
function checkButtonUploadStatus(button, uploadType) {
    if (!button) {
        return {
            isUploaded: false,
            message: `${uploadType} button not found`
        };
    }
    
    console.log(`DEBUG Checking ${uploadType} button:`, button);
    console.log(`DEBUG Button classes:`, button.className);
    console.log(`DEBUG Button text:`, button.textContent);
    
    // Check button classes for upload status
    const hasUploadedClass = button.classList.contains('btn-success') || 
                            button.classList.contains('btn-info') || 
                            button.classList.contains('btn-warning') ||
                            button.classList.contains('uploaded');
    
    // Check if button has green/blue background (indicating files uploaded)
    const computedStyle = window.getComputedStyle(button);
    const backgroundColor = computedStyle.backgroundColor;
    const hasUploadedColor = backgroundColor.includes('rgb(40, 167, 69)') || // green
                            backgroundColor.includes('rgb(23, 162, 184)') || // blue
                            backgroundColor.includes('rgb(255, 193, 7)') || // yellow
                            backgroundColor.includes('rgb(220, 53, 69)'); // red (for "no files" state)
    
    // Check if button text indicates upload
    const buttonText = button.textContent.toLowerCase();
    const hasUploadedText = buttonText.includes('✓') || 
                           buttonText.includes('uploaded') ||
                           buttonText.includes('complete');
    
    // Check if button is disabled (indicating it's in a "no files" state)
    const isDisabled = button.disabled;
    
    // If button has success indicators (green color, checkmark, success classes), 
    // it means files are uploaded regardless of disabled state
    const hasSuccessIndicators = hasUploadedClass || hasUploadedColor || hasUploadedText;
    
    // A button is considered uploaded if it has success indicators
    // Disabled state alone doesn't mean "not uploaded" - it could be disabled because files are uploaded
    const isUploaded = hasSuccessIndicators;
    
    console.log(`DEBUG ${uploadType} button status:`, {
        hasUploadedClass,
        hasUploadedColor,
        hasUploadedText,
        isDisabled,
        isUploaded
    });
    
    return {
        isUploaded: isUploaded,
        message: isUploaded ? `${uploadType} uploaded` : `${uploadType} not uploaded`
    };
}

// Function to show upload validation error to user
function showUploadValidationError(missingUploads) {
    // DISABLED: Warning popup suppressed per user request
    console.log('Upload validation warning suppressed. Missing uploads:', missingUploads);
    return; // Exit early - do not show any warning popup
}

// Function to show reset notification
function showResetNotification(resetCount) {
    // Suppressed per user request
    console.log('ℹ️ Reset notification suppressed. Rows reset:', resetCount);
}


function updateSentStatus(dropdown) {
    console.log('INFO updateSentStatus called');
    console.log('DEBUG Dropdown element:', dropdown);
    
    // Check if dropdown is disabled
    if (dropdown.disabled) {
        console.log('DISABLED Dropdown is disabled - ignoring change');
        return;
    }
    
    const groupId = dropdown.getAttribute('data-group-id');
    const sentStatus = dropdown.value;
    const complianceStatus = dropdown.getAttribute('data-compliance-status');

    console.log('📋 Group ID:', groupId);
    console.log('📋 Sent Status:', sentStatus);
    console.log('📋 Compliance Status:', complianceStatus);

    // VALIDATION REMOVED: Allow user to change sent status freely
    console.log('✅ Validation bypassed - allowing sent status change')
    
    if (!groupId) {
        console.error('❌ No group ID found');
        return;
    }
    
    // Update visual appearance immediately
    if (sentStatus === 'YES') {
        dropdown.style.backgroundColor = '#10b981';
        dropdown.style.color = 'white';
        dropdown.classList.add('sent-yes');
        dropdown.classList.remove('sent-no');
    } else if (sentStatus === 'NO') {
        dropdown.style.backgroundColor = '#ef4444';
        dropdown.style.color = 'white';
        dropdown.classList.add('sent-no');
        dropdown.classList.remove('sent-yes');
    } else {
        dropdown.style.backgroundColor = '';
        dropdown.style.color = '';
        dropdown.classList.remove('sent-yes', 'sent-no');
    }
    
    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    console.log('🔐 CSRF Token:', csrfToken ? 'Found' : 'NOT FOUND');
    
    // Send to backend
    const formData = new FormData();
    formData.append('group_id', groupId);
    formData.append('sent_status', sentStatus);
    formData.append('csrfmiddlewaretoken', csrfToken);
    
    console.log('📤 Sending request to /inspections/update-sent-status/');
    console.log('📤 FormData - Group ID:', groupId, 'Status:', sentStatus);
    
    fetch('/inspections/update-sent-status/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);
        return response.json();
    })
    .then(data => {
        console.log('📥 Response data:', data);
        if (data.success) {
            console.log('✅ Sent status updated successfully');
            
            // Update row appearance and lock functionality
            const groupRow = document.querySelector('tr[data-group-id="' + groupId + '"]');
            if (groupRow) {
                if (sentStatus === 'YES') {
                    // Don't add green background - just mark as locked
                    groupRow.classList.add('row-locked');
                    groupRow.setAttribute('data-locked', 'true');
                    console.log('✅ Row marked as sent - starting 15-minute timer');
                    
                    // Store sent timestamp for 15-minute timer
                    const sentTimestamp = data.sent_date || new Date().toISOString();
                    groupRow.setAttribute('data-sent-timestamp', sentTimestamp);
                    localStorage.setItem('sent_timestamp_' + groupId, sentTimestamp);
                    
                    // Check if 15 minutes have already passed (shouldn't happen for new sent items, but just in case)
                    const sentDate = new Date(sentTimestamp);
                    const fifteenMinutesLater = new Date(sentDate.getTime() + (15 * 60 * 1000));
                    const now = new Date();
                    const remainingTime = fifteenMinutesLater.getTime() - now.getTime();
                    
                    if (remainingTime <= 0) {
                        // 15 minutes have already passed, disable immediately (no countdown)
                        console.log('⏰ 15 minutes already passed, disabling immediately');
                        disableRowAfterTimer(groupRow, groupId);
                    } else {
                        // Start 15-minute countdown timer
                        startFifteenMinuteTimer(groupRow, groupId, sentTimestamp);
                    }
                    
                    // DON'T lock the row immediately - let the timer handle it
                        } else {
                            // Status changed to "NO" - completely reset everything
                            console.log('INFO Status changed to "NO" - completely resetting row state');
                            
                            // Clear any existing timers
                            const timerId = groupRow.getAttribute('data-timer-id');
                            if (timerId) {
                                clearTimeout(parseInt(timerId));
                                groupRow.removeAttribute('data-timer-id');
                                console.log('⏰ Cleared existing timer:', timerId);
                            }
                            
                            // Clear countdown interval if it exists
                            const countdownInterval = groupRow.getAttribute('data-countdown-interval');
                            if (countdownInterval) {
                                clearInterval(parseInt(countdownInterval));
                                groupRow.removeAttribute('data-countdown-interval');
                                console.log('⏰ Cleared countdown interval:', countdownInterval);
                            }
                            
                            // Remove all sent-related attributes and classes
                            groupRow.classList.remove('inspection-complete', 'row-locked', 'disabled-row');
                            groupRow.removeAttribute('data-locked');
                            groupRow.removeAttribute('data-was-sent');
                            groupRow.removeAttribute('data-sent-timestamp');
                            
                            // Clear localStorage
                            localStorage.removeItem('sent_timestamp_' + groupId);
                            
                            // Remove countdown display
                            const countdownDisplay = groupRow.querySelector('.fifteen-minute-countdown');
                            if (countdownDisplay) {
                                countdownDisplay.remove();
                            }
                            
                            console.log('✅ Row completely reset - all timers cleared, attributes removed');
                            
                            // Unlock the entire row - re-enable all interactive elements
                            unlockRow(groupRow);
                        }
            } else {
                console.log('❌ Could not find row with group-id:', groupId);
            }
            
            // Update countdown display based on sent status
            const containerDiv = dropdown.closest('div');
            let countdownContainer = containerDiv.querySelector('.onedrive-countdown');
            let statusText = containerDiv.querySelector('small.text-muted');
            
            if (sentStatus === 'YES') {
                // Create or show user info
                if (!statusText) {
                    statusText = document.createElement('small');
                    statusText.className = 'text-muted';
                    statusText.style.cssText = 'font-size: 0.6rem; margin-top: 2px; text-align: center;';
                    dropdown.parentNode.insertBefore(statusText, dropdown.nextSibling);
                }
                
                // Show user and timestamp info
                const actualUser = data.sent_by_username || data.user || 'User';
                let timestamp;
                
                if (data.sent_date) {
                    // Use the actual sent date from server
                    const sentDate = new Date(data.sent_date);
                    timestamp = sentDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                    }) + ' ' + sentDate.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                } else {
                    // Fallback to current time
                    const now = new Date();
                    timestamp = now.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                    }) + ' ' + now.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                }
                
                statusText.textContent = actualUser + ' - ' + timestamp;
                statusText.style.display = 'block';
                
                // Create or show countdown container
                const delayDays = dropdown.getAttribute('data-delay-days') || '3';
                const sentDateForCountdown = data.sent_date || new Date().toISOString();
                
                if (!countdownContainer) {
                    countdownContainer = document.createElement('div');
                    countdownContainer.className = 'onedrive-countdown';
                    countdownContainer.style.cssText = 'font-size: 0.5rem; margin-top: 1px; text-align: center;';
                    countdownContainer.setAttribute('data-sent-date', sentDateForCountdown);
                    countdownContainer.setAttribute('data-onedrive-uploaded', 'false');
                    countdownContainer.setAttribute('data-delay-days', delayDays);
                    
                    const countdownText = document.createElement('span');
                    countdownText.className = 'countdown-text';
                    countdownText.textContent = delayDays + ' days until upload';
                    countdownContainer.appendChild(countdownText);
                    
                    statusText.parentNode.insertBefore(countdownContainer, statusText.nextSibling);
                } else {
                    countdownContainer.style.display = 'block';
                    // Update the sent date to actual server date
                    countdownContainer.setAttribute('data-sent-date', sentDateForCountdown);
                    countdownContainer.setAttribute('data-delay-days', delayDays);
                }
                
                // Update countdown immediately
                if (window.updateOneDriveCountdown) {
                    setTimeout(() => {
                        window.updateOneDriveCountdown();
                    }, 100); // Small delay to ensure DOM is updated
                }
            } else {
                // Hide countdown and show simple status
                if (countdownContainer) {
                    countdownContainer.style.display = 'none';
                }
                if (statusText) {
                    statusText.textContent = 'Status';
                    statusText.style.display = 'block';
                }
                
                // Also remove any fifteen-minute countdown displays
                const groupRow = document.querySelector('tr[data-group-id="' + groupId + '"]');
                if (groupRow) {
                    const countdownDisplay = groupRow.querySelector('.fifteen-minute-countdown');
                    if (countdownDisplay) {
                        countdownDisplay.remove();
                        console.log('🗑️ Removed fifteen-minute countdown display for group:', groupId);
                    }
                }
            }
        } else {
            console.error('❌ Server error:', data.error);
            alert('Error: ' + data.error);
        }
    })
    .catch(error => {
        console.error('❌ Network error:', error);
        alert('Network error occurred: ' + error.message);
    });
}

// Function to start 15-minute timer for sent rows
function startFifteenMinuteTimer(row, groupId, sentTimestamp) {
    console.log('⏰ Starting 15-minute timer for group:', groupId);
    console.log('⏰ Sent timestamp:', sentTimestamp);
    
    const sentDate = new Date(sentTimestamp);
    const fifteenMinutesLater = new Date(sentDate.getTime() + (15 * 60 * 1000)); // 15 minutes in milliseconds
    const now = new Date();
    
    // Calculate remaining time
    const remainingTime = fifteenMinutesLater.getTime() - now.getTime();
    
    console.log('⏰ Timer details:');
    console.log('   Sent at:', sentDate.toLocaleString());
    console.log('   Expires at:', fifteenMinutesLater.toLocaleString());
    console.log('   Current time:', now.toLocaleString());
    console.log('   Remaining time:', Math.floor(remainingTime / 1000), 'seconds');
    
    if (remainingTime <= 0) {
        // 15 minutes have already passed, disable immediately
        console.log('⏰ 15 minutes already passed, disabling row immediately');
        disableRowAfterTimer(row, groupId);
        return;
    }
    
    // Add countdown display
    addCountdownDisplay(row, groupId, remainingTime);
    
    // Set timeout to disable row after 15 minutes
    const timerId = setTimeout(() => {
        console.log('⏰ 15-minute timer expired for group:', groupId);
        disableRowAfterTimer(row, groupId);
    }, remainingTime);
    
    // Store timer ID for potential cleanup
    row.setAttribute('data-timer-id', timerId);
    
    // Update countdown every second
    const countdownInterval = setInterval(() => {
        const now = new Date();
        // Recalculate remaining time based on original sent timestamp
        const sentDate = new Date(sentTimestamp);
        const fifteenMinutesLater = new Date(sentDate.getTime() + (15 * 60 * 1000));
        const remaining = fifteenMinutesLater.getTime() - now.getTime();
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            return;
        }
        
        updateCountdownDisplay(row, groupId, remaining);
    }, 1000);
    
    // Store interval ID for cleanup
    row.setAttribute('data-countdown-interval', countdownInterval);
}

// Function to add countdown display to row
function addCountdownDisplay(row, groupId, remainingTime) {
    // Find the sent status cell
    const sentStatusCell = row.querySelector('.col-send');
    if (!sentStatusCell) return;
    
    // Remove ALL existing countdown displays for this group first
    const existingCountdowns = sentStatusCell.querySelectorAll('.fifteen-minute-countdown[data-group-id="' + groupId + '"]');
    existingCountdowns.forEach(countdown => {
        console.log('🗑️ Removing existing countdown display for group:', groupId);
        countdown.remove();
    });

    // Also remove any countdown displays without data-group-id attribute (legacy cleanup)
    const legacyCountdowns = sentStatusCell.querySelectorAll('.fifteen-minute-countdown:not([data-group-id])');
    legacyCountdowns.forEach(countdown => {
        console.log('🗑️ Removing legacy countdown display');
        countdown.remove();
    });
    
    // Create countdown display
    const countdownDiv = document.createElement('div');
    countdownDiv.className = 'fifteen-minute-countdown';
    countdownDiv.style.cssText = 'font-size: 0.6rem; margin-top: 2px; text-align: center; color: #f59e0b; font-weight: bold;';
    countdownDiv.setAttribute('data-group-id', groupId);
    
    // Add to the cell
    sentStatusCell.appendChild(countdownDiv);
    
    // Initial display
    updateCountdownDisplay(row, groupId, remainingTime);
}

// Function to update countdown display
function updateCountdownDisplay(row, groupId, remainingTime) {
    const countdownDiv = row.querySelector('.fifteen-minute-countdown[data-group-id="' + groupId + '"]');
    if (!countdownDiv) return;
    
    const minutes = Math.floor(remainingTime / (1000 * 60));
    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
        countdownDiv.textContent = `Auto-disable in ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        countdownDiv.textContent = `Auto-disable in ${seconds}s`;
    }
}

// Function to disable row after timer expires
function disableRowAfterTimer(row, groupId) {
    console.log('🔒 Disabling row after 15-minute timer for group:', groupId);
    
    // Add disabled-row class for visual feedback (no green background)
    row.classList.add('disabled-row');
    
    // Mark as permanently disabled
    row.setAttribute('data-permanently-disabled', 'true');
    row.setAttribute('data-was-sent', 'true');
    
    // Disable all interactive elements
    const interactiveElements = row.querySelectorAll(`
        button, 
        input, 
        select, 
        textarea, 
        a[href], 
        [onclick], 
        [onchange],
        .btn,
        .form-control,
        .dropdown-toggle
    `);
    
    interactiveElements.forEach((element) => {
        element.disabled = true;
        element.onclick = null;
        element.onchange = null;
        if (element.href) element.href = 'javascript:void(0)';
    });
    
    // Remove ALL countdown displays completely when timer expires
    const countdownDivs = row.querySelectorAll('.fifteen-minute-countdown[data-group-id="' + groupId + '"]');
    countdownDivs.forEach(countdown => {
        countdown.remove();
        console.log('🗑️ Removed countdown display for group:', groupId);
    });

    // Also remove any countdown displays without data-group-id attribute (legacy cleanup)
    const legacyCountdowns = row.querySelectorAll('.fifteen-minute-countdown:not([data-group-id])');
    legacyCountdowns.forEach(countdown => {
        countdown.remove();
        console.log('🗑️ Removed legacy countdown display');
    });
    
    // Clean up timers
    const timerId = row.getAttribute('data-timer-id');
    const intervalId = row.getAttribute('data-countdown-interval');
    
    if (timerId) {
        clearTimeout(parseInt(timerId));
        row.removeAttribute('data-timer-id');
    }
    
    if (intervalId) {
        clearInterval(parseInt(intervalId));
        row.removeAttribute('data-countdown-interval');
    }
}

// Function to initialize disabled rows for already sent items
function initializeDisabledRows() {
    console.log('DEBUG Initializing sent rows...');
    const sentRows = document.querySelectorAll('.shipment-row[data-sent-timestamp]');
    console.log('DEBUG Found', sentRows.length, 'rows with sent timestamps');
    
    sentRows.forEach((row, index) => {
        console.log(`DEBUG Processing sent row ${index + 1}:`, row);
        const groupId = row.getAttribute('data-group-id');
        const sentTimestamp = row.getAttribute('data-sent-timestamp');
        
        if (groupId && sentTimestamp) {
            localStorage.setItem('sent_timestamp_' + groupId, sentTimestamp);
            console.log(`💾 Stored sent timestamp for group ${groupId}:`, sentTimestamp);
            
            const sentDate = new Date(sentTimestamp);
            const fifteenMinutesLater = new Date(sentDate.getTime() + (15 * 60 * 1000));
            const now = new Date();
            const remainingTime = fifteenMinutesLater.getTime() - now.getTime();
            
            if (remainingTime <= 0) {
                console.log(`🔒 15 minutes already passed for group ${groupId}, disabling row`);
                disableRowAfterTimer(row, groupId);
            } else {
                console.log(`⏰ 15 minutes not yet passed for group ${groupId}, starting countdown timer`);
                startFifteenMinuteTimer(row, groupId, sentTimestamp);
            }
        } else {
            console.log(`⚠️ No timestamp available for group ${groupId}, keeping disabled`);
            row.setAttribute('data-was-sent', 'true');
        }
    });
    
    console.log('✅ Sent rows initialization complete');
}

// Function to check and initialize timers for existing sent rows
function initializeFifteenMinuteTimers() {
    console.log('⏰ Initializing 15-minute timers for existing sent rows...');
    
    // Find all rows with sent status (those with sent-yes class or data-sent-timestamp)
    const sentRows = document.querySelectorAll('.shipment-row[data-group-id]');
    console.log('DEBUG Found', sentRows.length, 'total shipment rows');
    
    // Check for rows with data-sent-timestamp attribute
    const rowsWithTimestamp = document.querySelectorAll('.shipment-row[data-sent-timestamp]');
    console.log('DEBUG Found', rowsWithTimestamp.length, 'rows with data-sent-timestamp');
    
    // Check for rows with sent-yes class
    const rowsWithSentYes = document.querySelectorAll('.sent-status-dropdown.sent-yes');
    console.log('DEBUG Found', rowsWithSentYes.length, 'dropdowns with sent-yes class');
    
    // Check for rows with "Sent" text in the sent status column
    const rowsWithSentText = document.querySelectorAll('.shipment-row');
    let sentTextCount = 0;
    rowsWithSentText.forEach(row => {
        const sentStatusCell = row.querySelector('td:last-child');
        if (sentStatusCell && sentStatusCell.textContent.includes('Sent')) {
            sentTextCount++;
        }
    });
    console.log('DEBUG Found', sentTextCount, 'rows with "Sent" text in status column');
    
    sentRows.forEach((row, index) => {
        const groupId = row.getAttribute('data-group-id');
        const sentDropdown = row.querySelector('.sent-status-dropdown.sent-yes');
        const sentTimestamp = row.getAttribute('data-sent-timestamp');
        const isSent = sentDropdown || sentTimestamp;
        
        console.log(`DEBUG Row ${index + 1}: groupId=${groupId}, sentDropdown=${!!sentDropdown}, sentTimestamp=${sentTimestamp}, isSent=${!!isSent}`);
        
        if (isSent && groupId) {
            // Check if we have a stored timestamp
            let sentTimestamp = row.getAttribute('data-sent-timestamp');
            
            if (!sentTimestamp) {
                // Try to get from localStorage
                sentTimestamp = localStorage.getItem('sent_timestamp_' + groupId);
            }
            
            if (sentTimestamp) {
                const sentDate = new Date(sentTimestamp);
                const fifteenMinutesLater = new Date(sentDate.getTime() + (15 * 60 * 1000));
                const now = new Date();
                const remainingTime = fifteenMinutesLater.getTime() - now.getTime();
                
                console.log(`⏰ Timer check for ${groupId}:`);
                console.log(`   Sent at: ${sentDate.toLocaleString()}`);
                console.log(`   Expires at: ${fifteenMinutesLater.toLocaleString()}`);
                console.log(`   Current time: ${now.toLocaleString()}`);
                console.log(`   Remaining: ${Math.floor(remainingTime / 1000)} seconds`);
                
                if (remainingTime > 0) {
                    // Timer hasn't expired yet, start countdown
                    console.log('⏰ Starting countdown for existing sent row:', groupId);
                    startFifteenMinuteTimer(row, groupId, sentTimestamp);
                } else {
                    // Timer has expired, disable immediately (no countdown display)
                    console.log('⏰ Timer expired for existing sent row, disabling:', groupId);
                    disableRowAfterTimer(row, groupId);
                }
            }
        }
    });
}

// Function to refresh dropdown state when files are uploaded
function refreshDropdownState(groupId, newComplianceStatus) {
    console.log('INFO Refreshing dropdown state for group:', groupId, 'New status:', newComplianceStatus);
    
    const dropdown = document.querySelector(`.sent-status-dropdown[data-group-id="${groupId}"]`);
    if (!dropdown) {
        console.log('❌ Dropdown not found for group:', groupId);
        return;
    }
    
    // Update compliance status attribute
    dropdown.setAttribute('data-compliance-status', newComplianceStatus);
    
    // Check if user can override (admin/super_admin/developer/financial_admin)
    const canOverride = dropdown.getAttribute('data-can-override') === 'true';

    // Update dropdown state based on new compliance status
    if (newComplianceStatus === 'complete') {
        // Enable dropdown
        dropdown.disabled = false;
        dropdown.classList.remove('disabled-dropdown');
        dropdown.title = 'Mark as sent when documents are delivered';
        console.log('✅ Enabled dropdown for group:', groupId);
    } else if (canOverride) {
        // Admin users can override - keep dropdown enabled
        dropdown.disabled = false;
        dropdown.classList.remove('disabled-dropdown');
        dropdown.title = `Admin override: Mark as sent (Status: ${newComplianceStatus})`;
        console.log('✅ Admin override - keeping dropdown enabled for group:', groupId);
    } else {
        // Keep dropdown disabled if files are still incomplete
        if (dropdown.value !== 'YES') { // Don't disable if already sent
            dropdown.disabled = true;
            dropdown.classList.add('disabled-dropdown');
            dropdown.title = `Cannot change status - All required files must be uploaded first (Status: ${newComplianceStatus})`;
            console.log('DISABLED Kept dropdown disabled for group:', groupId);
        }
    }
}

// Function to validate actual files on disk for a group (NOT button states)
function validateActualFilesForGroup(groupId, dropdown, complianceStatus) {
    console.log('DEBUG [REAL FILES] Validating actual files for group:', groupId);
    
    // Extract client name and date from groupId
    const parts = groupId.split('_');
    const datePart = parts.pop(); // Get last part (YYYYMMDD)
    const clientPart = parts.join(' ').replace(/_/g, ' '); // Join rest and replace underscores
    
    // Format date for API call
    const year = datePart.substring(0, 4);
    const month = datePart.substring(4, 6);
    const day = datePart.substring(6, 8);
    const inspectionDate = `${year}-${month}-${day}`;
    
    console.log('DEBUG [REAL FILES] Client:', clientPart, 'Date:', inspectionDate);
    
    // Call the server to get actual file status
    fetch('/list-client-folder-files/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            client_name: clientPart,
            inspection_date: inspectionDate
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('DEBUG [REAL FILES] Server response:', data);
        
        const files = data.files || {};
        const hasRFI = files.rfi && files.rfi.length > 0;
        const hasInvoice = files.invoice && files.invoice.length > 0;
        const hasCompliance = files.compliance && files.compliance.length > 0;
        
        console.log('DEBUG [REAL FILES] Actual file status:', {
            hasRFI,
            hasInvoice, 
            hasCompliance,
            complianceStatus
        });
        
        const missing = [];
        if (!hasRFI) missing.push('RFI files');
        if (!hasInvoice) missing.push('Invoice files');
        if (!hasCompliance) missing.push('Compliance documents');
        
        // Check if user can override (admin/super_admin/developer/financial_admin)
        const canOverride = dropdown.getAttribute('data-can-override') === 'true';

        // Dropdown should be enabled ONLY if ALL files are present (or user can override)
        const allFilesPresent = hasRFI && hasInvoice && hasCompliance;

        if (!allFilesPresent && !canOverride) {
            dropdown.disabled = true;
            dropdown.classList.add('disabled-dropdown');
            dropdown.title = `Cannot mark as "Sent" - Missing: ${missing.join(', ')}`;
            dropdown.style.opacity = '0.6';
            dropdown.style.cursor = 'not-allowed';

            console.log('DISABLED [REAL FILES] Disabled dropdown - Missing:', missing);
        } else if (!allFilesPresent && canOverride) {
            // Admin can override - enable dropdown
            dropdown.disabled = false;
            dropdown.classList.remove('disabled-dropdown');
            dropdown.title = `Admin override: Mark as sent (Missing: ${missing.join(', ')})`;
            dropdown.style.opacity = '';
            dropdown.style.cursor = '';

            console.log('✅ [REAL FILES] Admin override - Enabled dropdown despite missing:', missing);
        } else {
            dropdown.disabled = false;
            dropdown.classList.remove('disabled-dropdown');
            dropdown.title = 'Mark as sent when documents are delivered';
            dropdown.style.opacity = '';
            dropdown.style.cursor = '';

            console.log('✅ [REAL FILES] Enabled dropdown - All files present');
        }
    })
    .catch(error => {
        console.error('❌ [REAL FILES] Error checking files:', error);
        // On error, check if admin can override
        const canOverride = dropdown.getAttribute('data-can-override') === 'true';
        if (canOverride) {
            dropdown.disabled = false;
            dropdown.title = 'Admin override: Cannot validate files - proceed with caution';
        } else {
            dropdown.disabled = true;
            dropdown.title = 'Cannot validate files - try refreshing page';
        }
    });
}

// Helper function to get CSRF token
function getCSRFToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    return cookieValue || window.csrfToken || '';
}

// Make functions globally available
window.updateSentStatus = updateSentStatus;
window.lockRow = lockRow;
window.unlockRow = unlockRow;
window.startFifteenMinuteTimer = startFifteenMinuteTimer;
window.initializeFifteenMinuteTimers = initializeFifteenMinuteTimers;
window.initializeDisabledRows = initializeDisabledRows;
window.cleanupDuplicateCountdowns = cleanupDuplicateCountdowns;
window.validateUploadsComplete = validateUploadsComplete;
window.checkButtonUploadStatus = checkButtonUploadStatus;
window.showUploadValidationError = showUploadValidationError;
window.validateAllSentStatusDropdowns = validateAllSentStatusDropdowns;
window.resetIncompleteSentRows = resetIncompleteSentRows;
window.refreshDropdownState = refreshDropdownState;
window.validateActualFilesForGroup = validateActualFilesForGroup;
console.log('updateSentStatus function defined and available globally');
console.log('lockRow and unlockRow functions defined and available globally');
console.log('15-minute timer functions defined and available globally');

// Function to clean up duplicate countdown displays
function cleanupDuplicateCountdowns() {
    console.log('🧹 Cleaning up duplicate countdown displays...');
    
    // Find all rows with countdown displays
    const rows = document.querySelectorAll('.shipment-row[data-group-id]');
    
    rows.forEach(row => {
        const groupId = row.getAttribute('data-group-id');
        const sentStatusCell = row.querySelector('.col-send');
        
        if (sentStatusCell && groupId) {
            // Find all countdown displays for this group
            const countdowns = sentStatusCell.querySelectorAll('.fifteen-minute-countdown[data-group-id="' + groupId + '"]');
            
            if (countdowns.length > 1) {
                console.log('🧹 Found', countdowns.length, 'duplicate countdowns for group:', groupId);
                
                // Keep only the first one, remove the rest
                for (let i = 1; i < countdowns.length; i++) {
                    countdowns[i].remove();
                    console.log('🗑️ Removed duplicate countdown', i + 1, 'for group:', groupId);
                }
            }
        }
    });
    
    console.log('✅ Duplicate countdown cleanup complete');
}

// Function to reset existing "Sent" rows that don't have complete uploads
function resetIncompleteSentRows() {
    console.log('INFO Checking and resetting incomplete "Sent" rows...');
    
    const sentDropdowns = document.querySelectorAll('.sent-status-dropdown');
    let resetCount = 0;
    
    sentDropdowns.forEach(dropdown => {
        const groupId = dropdown.getAttribute('data-group-id');
        const currentValue = dropdown.value;
        const complianceStatus = dropdown.getAttribute('data-compliance-status');
        
        // Check if currently marked as "Sent"
        if (currentValue === 'YES' && groupId) {
            const groupRow = document.querySelector(`tr[data-group-id="${groupId}"]`);
            
            if (groupRow) {
                // Check compliance status first
                let shouldReset = false;
                let resetReason = '';
                
                if (complianceStatus !== 'complete') {
                    shouldReset = true;
                    resetReason = `Compliance status: ${complianceStatus}`;
                } else {
                    // Additional validation: Check if all required uploads are complete
                    const uploadValidation = validateUploadsComplete(groupRow, groupId);
                    if (!uploadValidation.isComplete) {
                        shouldReset = true;
                        resetReason = `Missing uploads: ${uploadValidation.missing.join(', ')}`;
                    }
                }
                
                if (shouldReset) {
                    console.log('INFO Resetting incomplete "Sent" row:', groupId, 'Reason:', resetReason);
                    
                    // Reset dropdown to "Not Sent"
                    dropdown.value = 'NO';
                    dropdown.classList.remove('sent-yes');
                    dropdown.classList.add('sent-no');
                    
                    // Update dropdown styling
                    dropdown.style.backgroundColor = '';
                    dropdown.style.color = '';
                    
                    // Remove any existing countdown displays
                    const countdowns = groupRow.querySelectorAll('.fifteen-minute-countdown');
                    countdowns.forEach(countdown => countdown.remove());
                    
                    // Remove any disabled-row classes
                    groupRow.classList.remove('disabled-row');
                    groupRow.removeAttribute('data-permanently-disabled');
                    groupRow.removeAttribute('data-was-sent');
                    groupRow.removeAttribute('data-sent-timestamp');
                    
                    // Re-check compliance status and disable dropdown if needed (unless admin)
                    const canOverride = dropdown.getAttribute('data-can-override') === 'true';
                    if (complianceStatus !== 'complete' && !canOverride) {
                        dropdown.disabled = true;
                        dropdown.classList.add('disabled-dropdown');
                        dropdown.title = `Cannot change status - All required files must be uploaded first (Status: ${complianceStatus})`;
                    } else if (complianceStatus !== 'complete' && canOverride) {
                        dropdown.disabled = false;
                        dropdown.classList.remove('disabled-dropdown');
                        dropdown.title = `Admin override: Mark as sent (Status: ${complianceStatus})`;
                    }
                    
                    // Re-enable all interactive elements
                    const interactiveElements = groupRow.querySelectorAll(`
                        button,
                        input,
                        select,
                        textarea,
                        a[href],
                        [onclick],
                        [onchange],
                        .btn,
                        .form-control,
                        .dropdown-toggle
                    `);
                    
                    interactiveElements.forEach((element) => {
                        element.disabled = false;
                        element.style.pointerEvents = '';
                        element.style.opacity = '';
                    });
                    
                    // Update the status text display
                    const statusText = groupRow.querySelector('.sent-status-text');
                    if (statusText) {
                        statusText.textContent = 'Not Sent';
                        statusText.style.display = 'block';
                    }
                    
                    // Clear localStorage
                    localStorage.removeItem('sent_timestamp_' + groupId);
                    
                    resetCount++;
                    console.log('✅ Reset row:', groupId, 'back to "Not Sent"');
                } else {
                    console.log('✅ Row has complete uploads, keeping as "Sent":', groupId);
                }
            }
        }
    });
    
    console.log(`INFO Reset ${resetCount} incomplete "Sent" rows back to "Not Sent"`);
    
    // Show notification if any rows were reset
    if (resetCount > 0) {
        showResetNotification(resetCount);
    }
    
    return resetCount;
}

// Function to validate and update Sent Status dropdowns on page load
function validateAllSentStatusDropdowns() {
    console.log('DEBUG Validating all Sent Status dropdowns...');
    
    const sentDropdowns = document.querySelectorAll('.sent-status-dropdown');
    
    sentDropdowns.forEach(dropdown => {
        const groupId = dropdown.getAttribute('data-group-id');
        const currentValue = dropdown.value;
        const complianceStatus = dropdown.getAttribute('data-compliance-status');
        
        // Only check if not already sent
        if (currentValue !== 'YES' && groupId) {
            // Check if user can override (admin/super_admin/developer/financial_admin)
            const canOverride = dropdown.getAttribute('data-can-override') === 'true';

            // Check compliance status first (most reliable)
            if (complianceStatus !== 'complete' && !canOverride) {
                // Disable the entire dropdown and add visual indicator
                dropdown.disabled = true;
                dropdown.classList.add('disabled-dropdown');
                dropdown.title = `Cannot change status - All required files must be uploaded first (Status: ${complianceStatus})`;

                console.log('DISABLED Disabled entire dropdown for group:', groupId, 'Compliance status:', complianceStatus);
            } else if (complianceStatus !== 'complete' && canOverride) {
                // Admin can override - keep dropdown enabled
                dropdown.disabled = false;
                dropdown.classList.remove('disabled-dropdown');
                dropdown.title = `Admin override: Mark as sent (Status: ${complianceStatus})`;

                console.log('✅ Admin override - Enabled dropdown for group:', groupId, 'Compliance status:', complianceStatus);
            } else {
                // Enable the dropdown
                dropdown.disabled = false;
                dropdown.classList.remove('disabled-dropdown');
                dropdown.title = 'Mark as sent when documents are delivered';

                console.log('✅ Enabled dropdown for group:', groupId, 'Compliance status:', complianceStatus);
            }
            
            // FORCE REAL FILE VALIDATION - IGNORE BUTTON STATES
            const groupRow = document.querySelector(`tr[data-group-id="${groupId}"]`);
            
            if (groupRow) {
                // Use REAL file validation instead of button visual states
                validateActualFilesForGroup(groupId, dropdown, complianceStatus);
            }
        }
    });
    
    console.log('✅ Sent Status dropdown validation complete');
}

// Auto-initialize timers when the DOM is ready - robust version
document.addEventListener('DOMContentLoaded', function() {
    console.log('DEBUG Auto-initializing timers from sent_status.js...');

    // Wait a bit for other scripts to load
    setTimeout(() => {
        console.log('DEBUG Starting timer initialization after delay...');

        // Clean up any duplicate countdowns first
        cleanupDuplicateCountdowns();

        // Reset incomplete "Sent" rows back to "Not Sent"
        const resetCount = resetIncompleteSentRows();
        if (resetCount > 0) {
            console.log(`INFO Reset ${resetCount} incomplete "Sent" rows back to "Not Sent"`);
        }

        // Validate all Sent Status dropdowns
        validateAllSentStatusDropdowns();

        // Initialize disabled rows
        if (typeof initializeDisabledRows === 'function') {
            console.log('DEBUG Calling initializeDisabledRows from sent_status.js...');
            try {
                initializeDisabledRows();
            } catch (error) {
                console.error('❌ Error calling initializeDisabledRows from sent_status.js:', error);
            }
        } else {
            console.error('❌ initializeDisabledRows function not found from sent_status.js!');
        }

        // Initialize 15-minute timers
        if (typeof initializeFifteenMinuteTimers === 'function') {
            console.log('DEBUG Calling initializeFifteenMinuteTimers from sent_status.js...');
            try {
                initializeFifteenMinuteTimers();
            } catch (error) {
                console.error('❌ Error calling initializeFifteenMinuteTimers from sent_status.js:', error);
            }
        } else {
            console.error('❌ initializeFifteenMinuteTimers function not found from sent_status.js!');
        }
    }, 1000); // Wait 1 second for other scripts to load
});

// Function to completely lock a row when marked as sent
function lockRow(row) {
    console.log('🔒 LOCKING ROW:', row);
    
    // Add the disabled-row class for consistent styling
    row.classList.add('disabled-row');
    
    // Mark this row as "was sent" so it stays permanently locked
    row.setAttribute('data-was-sent', 'true');
    
    // Disable all interactive elements
    const interactiveElements = row.querySelectorAll(`
        button, 
        input, 
        select, 
        textarea, 
        a[href], 
        [onclick], 
        [onchange],
        .btn,
        .form-control,
        .dropdown-toggle
    `);
    
    console.log('🔒 Found', interactiveElements.length, 'interactive elements to disable');
    
    interactiveElements.forEach((element, index) => {
        // Store original state for unlocking
        element.setAttribute('data-original-disabled', element.disabled);
        element.setAttribute('data-original-onclick', element.onclick ? element.onclick.toString() : '');
        element.setAttribute('data-original-onchange', element.onchange ? element.onchange.toString() : '');
        element.setAttribute('data-original-href', element.href || '');
        
        // Disable the element
        element.disabled = true;
        element.onclick = null;
        element.onchange = null;
        if (element.href) element.href = 'javascript:void(0)';
        
        console.log(`🔒 Disabled element ${index + 1}:`, element.tagName, element.className);
    });
    
    // Disable the sent status dropdown itself (but keep it visible)
    const sentDropdown = row.querySelector('.sent-status-dropdown');
    if (sentDropdown) {
        sentDropdown.disabled = true;
    }
    
    console.log('✅ Row completely locked with disabled-row styling');
}

// Function to unlock a row when unmarked as sent
function unlockRow(row) {
    console.log('🔓 UNLOCKING ROW:', row);
    
    // Remove disabled-row class
    row.classList.remove('disabled-row');
    
    // Re-enable all interactive elements
    const interactiveElements = row.querySelectorAll(`
        button, 
        input, 
        select, 
        textarea, 
        a[href], 
        [onclick], 
        [onchange],
        .btn,
        .form-control,
        .dropdown-toggle
    `);
    
    console.log('🔓 Found', interactiveElements.length, 'interactive elements to re-enable');
    
    interactiveElements.forEach((element, index) => {
        // Restore original state
        const originalDisabled = element.getAttribute('data-original-disabled');
        const originalOnclick = element.getAttribute('data-original-onclick');
        const originalOnchange = element.getAttribute('data-original-onchange');
        const originalHref = element.getAttribute('data-original-href');
        
        if (originalDisabled !== null) {
            element.disabled = originalDisabled === 'true';
        }
        
        if (originalOnclick && originalOnclick !== 'null') {
            element.onclick = new Function('return ' + originalOnclick)();
        }
        
        if (originalOnchange && originalOnchange !== 'null') {
            element.onchange = new Function('return ' + originalOnchange)();
        }
        
        if (originalHref && originalHref !== '') {
            element.href = originalHref;
        }
        
        // Clean up data attributes
        element.removeAttribute('data-original-disabled');
        element.removeAttribute('data-original-onclick');
        element.removeAttribute('data-original-onchange');
        element.removeAttribute('data-original-href');
        
        console.log(`🔓 Re-enabled element ${index + 1}:`, element.tagName, element.className);
    });
    
    // Re-enable the sent status dropdown
    const sentDropdown = row.querySelector('.sent-status-dropdown');
    if (sentDropdown) {
        sentDropdown.disabled = false;
    }
    
    console.log('✅ Row completely unlocked and disabled-row class removed');
}

