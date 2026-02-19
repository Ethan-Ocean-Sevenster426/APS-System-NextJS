// Send inspection documents to client email
console.log('Sent status JS loaded');

function toggleSentStatus(btn) {
    var groupId = btn.getAttribute('data-group-id');
    var clientName = btn.getAttribute('data-client-name');
    var inspectionDate = btn.getAttribute('data-inspection-date');
    var inspectionGroupId = btn.getAttribute('data-inspection-group-id');

    if (!groupId) {
        alert('No group ID found.');
        return;
    }

    var isSent = btn.getAttribute('data-is-sent') === 'true';
    if (isSent) {
        alert('Documents already sent.');
        return;
    }

    if (!confirm('Send all inspection documents for ' + clientName + ' to the client email?')) {
        return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Sending...';
    btn.style.background = '#fbbf24';
    btn.style.color = '#000';

    var csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

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
    .then(function(response) { return response.json(); })
    .then(function(data) {
        btn.disabled = false;
        if (data.success) {
            btn.innerHTML = 'Sent';
            btn.style.background = '#10b981';
            btn.style.color = 'white';
            btn.setAttribute('data-is-sent', 'true');
            btn.title = 'Documents sent to ' + (data.recipients || 'client');
        } else {
            btn.innerHTML = 'Send';
            btn.style.background = '#e5e7eb';
            btn.style.color = '#6b7280';
            alert('Failed to send: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(function(error) {
        btn.disabled = false;
        btn.innerHTML = 'Send';
        btn.style.background = '#e5e7eb';
        btn.style.color = '#6b7280';
        alert('Error: ' + error.message);
    });
}

window.toggleSentStatus = toggleSentStatus;
