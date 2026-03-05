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

    // Try multiple sources for CSRF token
    var csrfEl = document.querySelector('[name=csrfmiddlewaretoken]');
    var csrfToken = csrfEl ? csrfEl.value : (window.DJANGO_CSRF || '');
    if (!csrfToken) {
        // Last resort: read from cookie
        var match = document.cookie.match(/csrftoken=([^;]+)/);
        csrfToken = match ? match[1] : '';
    }
    if (!csrfToken) {
        btn.disabled = false;
        btn.innerHTML = 'Send';
        btn.style.background = '#e5e7eb';
        btn.style.color = '#6b7280';
        alert('CSRF token not found. Please refresh the page and try again.');
        return;
    }

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
            var sentBy = data.sent_by || '';
            var sentTime = data.sent_time || '';
            var label = 'Sent';
            if (sentBy && sentTime) {
                label = 'Sent: ' + sentBy + ' - ' + sentTime;
            } else if (sentBy) {
                label = 'Sent: ' + sentBy;
            }
            btn.innerHTML = label;
            btn.style.background = '#10b981';
            btn.style.color = 'white';
            btn.style.minWidth = 'auto';
            btn.style.whiteSpace = 'nowrap';
            btn.setAttribute('data-is-sent', 'true');
            btn.title = 'Documents sent to ' + (data.recipients || 'client') + ' by ' + sentBy + ' at ' + sentTime;
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
