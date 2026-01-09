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

// Expose functions to global scope
window.updateGroupKmTraveled = updateGroupKmTraveled;
window.updateGroupHours = updateGroupHours;
window.getCSRFToken = getCSRFToken;

console.log('✅ KM and Hours functions loaded successfully!');
console.log('Functions available:', {
    updateGroupKmTraveled: typeof window.updateGroupKmTraveled,
    updateGroupHours: typeof window.updateGroupHours,
    getCSRFToken: typeof window.getCSRFToken
});
