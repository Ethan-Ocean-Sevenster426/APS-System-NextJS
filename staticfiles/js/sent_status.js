// Simple sent status - just save YES or NO to database
console.log('Sent status JS loaded (simplified)');

function updateSentStatus(dropdown) {
    const groupId = dropdown.getAttribute('data-group-id');
    const inspectionGroupId = dropdown.getAttribute('data-inspection-group-id');
    const sentStatus = dropdown.value;
    const row = dropdown.closest('tr');

    console.log('Updating sent status:', groupId, '=', sentStatus, 'inspection_group_id:', inspectionGroupId);

    if (!groupId) {
        console.error('No group ID');
        return;
    }

    // Update dropdown and row colors immediately
    if (sentStatus === 'YES') {
        dropdown.style.backgroundColor = '#10b981';
        dropdown.style.color = 'white';
        // Green row background
        if (row) {
            row.style.backgroundColor = '#d1fae5';
            row.querySelectorAll('td').forEach(td => td.style.backgroundColor = '#d1fae5');
        }
    } else {
        dropdown.style.backgroundColor = '#ffffff';
        dropdown.style.color = '#000000';
        // White row background
        if (row) {
            row.style.backgroundColor = '#ffffff';
            row.querySelectorAll('td').forEach(td => td.style.backgroundColor = '#ffffff');
        }
    }

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send to backend
    const formData = new FormData();
    formData.append('group_id', groupId);
    formData.append('sent_status', sentStatus);
    formData.append('csrfmiddlewaretoken', csrfToken);
    if (inspectionGroupId) {
        formData.append('inspection_group_id', inspectionGroupId);
    }

    fetch('/inspections/update-sent-status/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Saved:', sentStatus);
        } else {
            console.error('Failed:', data.error);
            alert('Failed to save: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Make it global
window.updateSentStatus = updateSentStatus;
