// Toggle sent status for inspection group
console.log('Sent status JS loaded');

function toggleSentStatus(btn) {
    const groupId = btn.getAttribute('data-group-id');
    if (!groupId) {
        alert('No group ID found.');
        return;
    }

    const isSent = btn.getAttribute('data-is-sent') === 'true';
    const newStatus = isSent ? 'NO' : 'YES';

    btn.disabled = true;

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    fetch('/inspections/update-sent-status/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken
        },
        body: 'group_id=' + encodeURIComponent(groupId) + '&sent_status=' + encodeURIComponent(newStatus)
    })
    .then(response => response.json())
    .then(data => {
        btn.disabled = false;
        if (data.success || data.status === 'success') {
            if (newStatus === 'YES') {
                btn.innerHTML = 'Sent';
                btn.style.background = '#10b981';
                btn.style.color = 'white';
                btn.setAttribute('data-is-sent', 'true');
                btn.title = 'Click to mark as not sent';
            } else {
                btn.innerHTML = 'Send';
                btn.style.background = '#e5e7eb';
                btn.style.color = '#6b7280';
                btn.setAttribute('data-is-sent', 'false');
                btn.title = 'Click to mark as sent';
            }
        } else {
            alert('Failed to update: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(function(error) {
        btn.disabled = false;
        alert('Error: ' + error.message);
    });
}

window.toggleSentStatus = toggleSentStatus;
