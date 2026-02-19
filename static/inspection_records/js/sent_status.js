// Send documents to client email and update sent status
console.log('Sent status JS loaded');

function sendInspectionDocs(btn) {
    const groupId = btn.getAttribute('data-group-id');
    const inspectionGroupId = btn.getAttribute('data-inspection-group-id');
    const clientName = btn.getAttribute('data-client-name');
    const inspectionDate = btn.getAttribute('data-inspection-date');

    if (!groupId) {
        alert('No group ID found.');
        return;
    }

    // Confirm before sending
    if (!confirm('Send inspection documents for ' + clientName + ' to the client email?')) {
        return;
    }

    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.style.background = '#fbbf24';
    btn.style.color = '#000';

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    fetch('/inspections/send-documents/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            group_id: groupId,
            inspection_group_id: inspectionGroupId,
            client_name: clientName,
            inspection_date: inspectionDate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update button to green "Sent" state
            btn.innerHTML = '<i class="fas fa-check"></i> Sent';
            btn.style.background = '#10b981';
            btn.style.color = 'white';
            btn.title = 'Sent to ' + (data.recipients || 'client');
            btn.disabled = false;

            // Green row background
            var row = btn.closest('tr');
            if (row) {
                row.style.backgroundColor = '#d1fae5';
                row.querySelectorAll('td').forEach(function(td) { td.style.backgroundColor = '#d1fae5'; });
            }

            alert('Documents sent successfully to ' + data.recipients + '\n(' + data.documents_sent + ' documents)');
        } else {
            // Reset button on failure
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
            btn.style.background = '#e5e7eb';
            btn.style.color = '#6b7280';
            btn.disabled = false;
            alert('Failed to send: ' + data.error);
        }
    })
    .catch(function(error) {
        console.error('Send error:', error);
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
        btn.style.background = '#e5e7eb';
        btn.style.color = '#6b7280';
        btn.disabled = false;
        alert('Error sending documents: ' + error.message);
    });
}

window.sendInspectionDocs = sendInspectionDocs;
