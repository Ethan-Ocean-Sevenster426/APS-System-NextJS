/**
 * Bought Sample Field Handler
 * Handles updating bought sample values for individual inspections
 */

console.log('[BOUGHT SAMPLE] Module loaded');

// Define the updateBoughtSample function globally
window.updateBoughtSample = function(input) {
    const inspectionId = input.getAttribute('data-inspection-id');
    const boughtSampleValue = input.value;
    
    console.log('[BOUGHT SAMPLE] Function called - Inspection ID:', inspectionId, 'Value:', boughtSampleValue);
    
    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.csrfToken || '';
    
    if (!csrfToken) {
        console.error('[BOUGHT SAMPLE] CSRF token not found!');
        alert('Error: Security token not found. Please refresh the page.');
        return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('inspection_id', inspectionId);
    formData.append('bought_sample', boughtSampleValue);
    formData.append('csrfmiddlewaretoken', csrfToken);
    
    console.log('[BOUGHT SAMPLE] Sending update request...');
    
    // Send update request
    fetch('/update-bought-sample/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('[BOUGHT SAMPLE] Response status:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('[SUCCESS] Bought sample saved successfully:', data);
            // Show success feedback
            input.style.backgroundColor = '#d4edda';
            input.style.borderColor = '#28a745';
            setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '';
            }, 500);
        } else {
            console.error('[ERROR] Error saving Bought Sample:', data.error);
            alert('Error updating Bought Sample: ' + data.error);
            // Show error feedback
            input.style.backgroundColor = '#f8d7da';
            input.style.borderColor = '#dc3545';
            setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '';
            }, 2000);
        }
    })
    .catch(error => {
        console.error('[ERROR] Network error saving Bought Sample:', error);
        alert('Error updating Bought Sample: ' + error.message);
        // Show error feedback
        input.style.backgroundColor = '#f8d7da';
        input.style.borderColor = '#dc3545';
        setTimeout(() => {
            input.style.backgroundColor = '';
            input.style.borderColor = '';
        }, 2000);
    });
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('[BOUGHT SAMPLE] Initializing bought sample handlers...');
    
    // Add event listeners to all bought sample inputs
    const boughtSampleInputs = document.querySelectorAll('.bought-sample-input');
    console.log('[BOUGHT SAMPLE] Found', boughtSampleInputs.length, 'bought sample inputs');
    
    boughtSampleInputs.forEach(input => {
        // Remove inline handlers if they exist
        input.removeAttribute('onchange');
        input.removeAttribute('onblur');
        
        // Add event listeners
        input.addEventListener('change', function() {
            window.updateBoughtSample(this);
        });
        
        input.addEventListener('blur', function() {
            window.updateBoughtSample(this);
        });
    });
    
    console.log('[BOUGHT SAMPLE] Initialization complete');
});

// Also handle dynamically added inputs (for when rows are expanded)
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    // Check if the node itself is a bought sample input
                    if (node.classList && node.classList.contains('bought-sample-input')) {
                        console.log('[BOUGHT SAMPLE] New input detected, adding listeners');
                        node.removeAttribute('onchange');
                        node.removeAttribute('onblur');
                        node.addEventListener('change', function() {
                            window.updateBoughtSample(this);
                        });
                        node.addEventListener('blur', function() {
                            window.updateBoughtSample(this);
                        });
                    }
                    
                    // Check for bought sample inputs within the added node
                    const inputs = node.querySelectorAll('.bought-sample-input');
                    if (inputs.length > 0) {
                        console.log('[BOUGHT SAMPLE] Found', inputs.length, 'new inputs in added node');
                        inputs.forEach(input => {
                            input.removeAttribute('onchange');
                            input.removeAttribute('onblur');
                            input.addEventListener('change', function() {
                                window.updateBoughtSample(this);
                            });
                            input.addEventListener('blur', function() {
                                window.updateBoughtSample(this);
                            });
                        });
                    }
                }
            });
        }
    });
});

// Start observing when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    console.log('[BOUGHT SAMPLE] MutationObserver started');
});

console.log('[BOUGHT SAMPLE] updateBoughtSample function defined:', typeof window.updateBoughtSample);

