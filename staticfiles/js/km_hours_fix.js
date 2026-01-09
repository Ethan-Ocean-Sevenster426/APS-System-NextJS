// Minimal fix for updateGroupKmTraveled and updateGroupHours functions
// This file contains only the essential functions needed to fix the JavaScript errors

// Get CSRF Token function
function getCSRFToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    if (!token) {
        console.error('CSRF token not found');
        return '';
    }
    return token;
}

// Update Group Km Traveled function
function updateGroupKmTraveled(input) {
    const groupId = input.getAttribute('data-group-id');
    const kmValue = input.value;
    
    console.log('[KM] Updating Group KM - Group ID:', groupId, 'Value:', kmValue);
    
    // Validate input
    if (kmValue && (isNaN(kmValue) || parseFloat(kmValue) < 0)) {
        alert('Please enter a valid positive number for kilometers.');
        input.focus();
        return;
    }
    
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
            console.log('[KM] KM saved successfully:', data);
            // Show success feedback
            input.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                input.style.backgroundColor = '';
            }, 500);
        } else {
            console.error('[KM] Error saving KM:', data.error);
            alert('Error updating KM: ' + data.error);
        }
    })
    .catch(error => {
        console.error('[KM] Network error saving KM:', error);
        alert('Error updating KM: ' + error.message);
    });
}

// Update Group Hours function
function updateGroupHours(input) {
    const groupId = input.getAttribute('data-group-id');
    const hoursValue = input.value;
    
    console.log('[HOURS] Updating Group Hours - Group ID:', groupId, 'Value:', hoursValue);
    
    // Validate input
    if (hoursValue && (isNaN(hoursValue) || parseFloat(hoursValue) < 0)) {
        alert('Please enter a valid positive number for hours.');
        input.focus();
        return;
    }
    
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
            console.log('[HOURS] Hours saved successfully:', data);
            // Show success feedback
            input.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                input.style.backgroundColor = '';
            }, 500);
        } else {
            console.error('[HOURS] Error saving Hours:', data.error);
            alert('Error updating Hours: ' + data.error);
        }
    })
    .catch(error => {
        console.error('[HOURS] Network error saving Hours:', error);
        alert('Error updating Hours: ' + error.message);
    });
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

// Update Group Comment function
function updateGroupComment(input) {
    const groupId = input.getAttribute('data-group-id');
    const commentValue = input.value;

    console.log('[COMMENT] Updating Group Comment - Group ID:', groupId, 'Value:', commentValue);

    // Get CSRF token
    const csrfToken = getCSRFToken();

    // Create form data
    const formData = new FormData();
    formData.append('group_id', groupId);
    formData.append('comment', commentValue);
    formData.append('csrfmiddlewaretoken', csrfToken);

    // Send update request
    fetch('/update-group-comment/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('[COMMENT] Comment saved successfully:', data);
            // Show success feedback
            input.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                input.style.backgroundColor = '';
            }, 500);
        } else {
            console.error('[COMMENT] Error saving comment:', data.error);
            alert('Error updating comment: ' + data.error);
        }
    })
    .catch(error => {
        console.error('[COMMENT] Network error saving comment:', error);
        alert('Error updating comment: ' + error.message);
    });
}

// Add Email Input Row
function addEmailInput(button) {
    console.log('[EMAIL] Adding new email input row');

    try {
        const container = button.parentElement;
        const emailInputsDiv = container.querySelector('.email-inputs');

        // Check how many rows currently exist
        const existingRows = emailInputsDiv.querySelectorAll('.email-input-row');

        console.log('[EMAIL] Current number of rows:', existingRows.length);

        // Create new email input row (no remove button)
        const newRow = document.createElement('div');
        newRow.className = 'email-input-row';
        newRow.style.cssText = 'display: flex; align-items: center; margin-bottom: 4px;';

        newRow.innerHTML = `
            <input type="email"
                   class="form-control form-control-sm group-additional-email-input"
                   value=""
                   placeholder="email@example.com"
                   onchange="updateGroupAdditionalEmails(this)"
                   onblur="updateGroupAdditionalEmails(this)"
                   style="flex: 1;">
        `;

        emailInputsDiv.appendChild(newRow);
        console.log('[EMAIL] New email input row added successfully');

        // Focus on the new input
        const newInput = newRow.querySelector('input');
        newInput.focus();

    } catch (error) {
        console.error('[EMAIL] Error adding email input:', error);
        alert('Error adding email field: ' + error.message);
    }
}

// Remove Email Input Row
function removeEmailInput(button) {
    console.log('[EMAIL] Removing email input row');

    try {
        const row = button.parentElement;
        const container = row.parentElement.parentElement;
        const emailInputsDiv = container.querySelector('.email-inputs');

        // Remove the row
        row.remove();
        console.log('[EMAIL] Email input row removed');

        // Ensure first row doesn't have a remove button
        const allRows = emailInputsDiv.querySelectorAll('.email-input-row');
        if (allRows.length > 0) {
            const firstRow = allRows[0];
            const firstRemoveButton = firstRow.querySelector('.btn-danger');
            if (firstRemoveButton) {
                firstRemoveButton.remove();
                // Also remove the margin-right from the input
                const firstInput = firstRow.querySelector('input');
                if (firstInput) {
                    firstInput.style.marginRight = '0';
                    firstInput.style.flex = '1';
                }
            }
        }

        // Trigger update to save the current state
        const remainingInput = emailInputsDiv.querySelector('input');
        if (remainingInput) {
            updateGroupAdditionalEmails(remainingInput);
        }

    } catch (error) {
        console.error('[EMAIL] Error removing email input:', error);
        alert('Error removing email field: ' + error.message);
    }
}

// Update Group Additional Emails (collects all email inputs)
function updateGroupAdditionalEmails(input) {
    try {
        const container = input.closest('.additional-emails-container');
        const groupId = container.getAttribute('data-group-id');

        // Collect all email inputs from this container
        const allInputs = container.querySelectorAll('.group-additional-email-input');
        const emails = [];

        console.log('[EMAIL] Collecting emails from', allInputs.length, 'input fields');

        // Collect all emails (no validation, just collect)
        for (let emailInput of allInputs) {
            const email = emailInput.value.trim();
            if (email) {
                emails.push(email);
            }
        }

        // Remove duplicates
        const uniqueEmails = [...new Set(emails)];

        console.log('[EMAIL] Updating Additional Emails - Group ID:', groupId, 'Emails:', uniqueEmails.join(', '));
        if (emails.length !== uniqueEmails.length) {
            console.warn('[EMAIL] Removed', emails.length - uniqueEmails.length, 'duplicate emails before saving');
        }

        // Get CSRF token
        const csrfToken = getCSRFToken();

        // Create form data
        const formData = new FormData();
        formData.append('group_id', groupId);
        formData.append('additional_email', uniqueEmails.join(', '));
        formData.append('csrfmiddlewaretoken', csrfToken);

        // Send update request
        fetch('/update-group-additional-email/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('[EMAIL] Additional emails saved successfully:', data);
                // Show success feedback on all inputs
                allInputs.forEach(inp => {
                    inp.style.backgroundColor = '#d4edda';
                    setTimeout(() => {
                        inp.style.backgroundColor = '';
                    }, 500);
                });
            } else {
                console.error('[EMAIL] Error saving emails:', data.error);
                alert('Error updating emails: ' + data.error);
            }
        })
        .catch(error => {
            console.error('[EMAIL] Network error saving emails:', error);
            alert('Error updating emails: ' + error.message);
        });

    } catch (error) {
        console.error('[EMAIL] Error in updateGroupAdditionalEmails:', error);
        alert('Error updating emails: ' + error.message);
    }
}

// Expose functions to global scope
window.updateGroupKmTraveled = updateGroupKmTraveled;
window.updateGroupHours = updateGroupHours;
window.getCSRFToken = getCSRFToken;
window.updateGroupApproved = updateGroupApproved;
window.updateGroupComment = updateGroupComment;
window.addEmailInput = addEmailInput;
window.removeEmailInput = removeEmailInput;
window.updateGroupAdditionalEmails = updateGroupAdditionalEmails;

console.log('✅ KM and Hours functions loaded successfully! VERSION: 20251030-NO-X-BUTTON');
console.log('[EMAIL DEBUG] Email functions available:', {
    addEmailInput: typeof window.addEmailInput,
    removeEmailInput: typeof window.removeEmailInput,
    updateGroupAdditionalEmails: typeof window.updateGroupAdditionalEmails
});
console.log('Functions available:', {
    updateGroupKmTraveled: typeof window.updateGroupKmTraveled,
    updateGroupHours: typeof window.updateGroupHours,
    getCSRFToken: typeof window.getCSRFToken,
    updateGroupApproved: typeof window.updateGroupApproved,
    updateGroupComment: typeof window.updateGroupComment,
    updateGroupAdditionalEmails: typeof window.updateGroupAdditionalEmails
});

// Debug: Log the actual function to verify it exists
console.log('[EMAIL DEBUG] updateGroupAdditionalEmails function:', window.updateGroupAdditionalEmails);
console.log('[EMAIL DEBUG] Function is callable:', typeof window.updateGroupAdditionalEmails === 'function');

// Initialize email inputs from data-initial-emails attribute on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('[EMAIL] Initializing email containers from data attributes');

    const containers = document.querySelectorAll('.additional-emails-container[data-initial-emails]');
    console.log('[EMAIL] Found', containers.length, 'email containers to initialize');

    containers.forEach(function(container) {
        const initialEmails = container.getAttribute('data-initial-emails');
        const emailInputsDiv = container.querySelector('.email-inputs');

        if (initialEmails && initialEmails.trim()) {
            // Clear the default empty row
            emailInputsDiv.innerHTML = '';

            // Split by comma and create a row for each email
            const emails = initialEmails.split(',').map(e => e.trim()).filter(e => e.length > 0);

            // Remove duplicates
            const uniqueEmails = [...new Set(emails)];

            console.log('[EMAIL] Initializing', uniqueEmails.length, 'emails for group:', container.getAttribute('data-group-id'));
            if (emails.length !== uniqueEmails.length) {
                console.warn('[EMAIL] Removed', emails.length - uniqueEmails.length, 'duplicate emails');
            }

            uniqueEmails.forEach(function(email) {
                const newRow = document.createElement('div');
                newRow.className = 'email-input-row';
                newRow.style.cssText = 'display: flex; align-items: center; margin-bottom: 4px;';

                newRow.innerHTML = `
                    <input type="email"
                           class="form-control form-control-sm group-additional-email-input"
                           value="${email}"
                           placeholder="email@example.com"
                           onchange="updateGroupAdditionalEmails(this)"
                           onblur="updateGroupAdditionalEmails(this)"
                           style="flex: 1;">
                `;

                emailInputsDiv.appendChild(newRow);
            });

            console.log('[EMAIL] Successfully initialized', emails.length, 'email rows');
        } else {
            console.log('[EMAIL] No initial emails for group:', container.getAttribute('data-group-id'));
        }
    });
});
