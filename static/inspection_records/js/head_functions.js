        // These functions MUST be defined before body content loads
        // Otherwise onclick handlers will fail with "function not defined"

        window.openFilesPopup = function (groupId, clientName, inspectionDate) {
            console.log('openFilesPopup called:', groupId, clientName, inspectionDate);
            const modal = document.getElementById('filesModal');
            if (modal) {
                modal.style.display = 'block';
                const modalTitle = document.getElementById('modalTitle');
                if (modalTitle) modalTitle.textContent = 'Files for ' + clientName + ' - ' + inspectionDate;
                window.currentFilesClient = clientName;
                window.currentFilesDate = inspectionDate;
                window.currentFilesGroupId = groupId;
                if (typeof window.loadInspectionFiles === 'function') {
                    window.loadInspectionFiles(groupId, clientName, inspectionDate);
                }
            } else {
                console.error('filesModal not found');
            }
        };

        window.viewFilesForGroup = function (groupId, clientName, inspectionDate) {
            console.log('viewFilesForGroup called:', groupId, clientName, inspectionDate);
            window.openFilesPopup(groupId, clientName, inspectionDate);
        };

        // Generic upload function for all document types
        window.uploadDocumentForInspection = function (productId, groupId, documentType, complianceStatus) {
            console.log('='.repeat(80));
            console.log('[UPLOAD DEBUG] uploadDocumentForInspection CALLED');
            console.log('='.repeat(80));
            console.log('[UPLOAD DEBUG] Parameters received:');
            console.log('[UPLOAD DEBUG]   productId:', productId);
            console.log('[UPLOAD DEBUG]   productId type:', typeof productId);
            console.log('[UPLOAD DEBUG]   productId is null:', productId === null);
            console.log('[UPLOAD DEBUG]   productId is undefined:', productId === undefined);
            console.log('[UPLOAD DEBUG]   productId stringified:', JSON.stringify(productId));
            console.log('[UPLOAD DEBUG]   groupId:', groupId);
            console.log('[UPLOAD DEBUG]   groupId type:', typeof groupId);
            console.log('[UPLOAD DEBUG]   groupId length:', groupId ? groupId.length : 'N/A');
            console.log('[UPLOAD DEBUG]   documentType:', documentType);
            console.log('[UPLOAD DEBUG]   complianceStatus:', complianceStatus);
            console.log('-'.repeat(80));

            // Validate that at least one ID is provided
            if (!productId && !groupId) {
                alert('Error: Unable to upload ' + documentType + ' - missing group or inspection ID. Please refresh the page and try again.');
                console.error('[UPLOAD DEBUG] Missing both productId and groupId for ' + documentType);
                return;
            }

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf';
            fileInput.style.display = 'none';

            fileInput.onchange = function (e) {
                const file = e.target.files[0];
                console.log('[UPLOAD DEBUG] File selected:', file ? file.name : 'NO FILE');

                if (file) {
                    if (!file.name.toLowerCase().endsWith('.pdf')) {
                        alert('Only PDF files are allowed. Please select a PDF document.');
                        return;
                    }

                    console.log('[UPLOAD DEBUG] Building FormData...');
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('document_type', documentType);
                    // Only send values if they're truthy (not empty string, null, undefined)
                    if (productId) formData.append('inspection_id', productId);
                    if (groupId) formData.append('group_id', groupId);
                    // Add compliance status for COA/Lab uploads
                    if (complianceStatus) formData.append('compliance_status', complianceStatus);

                    // Log what we're sending
                    console.log('[UPLOAD DEBUG] FormData contents:');
                    console.log('[UPLOAD DEBUG]   file:', file.name, '(' + file.size + ' bytes)');
                    console.log('[UPLOAD DEBUG]   inspection_id being sent:', productId);
                    console.log('[UPLOAD DEBUG]   inspection_id type:', typeof productId);
                    console.log('[UPLOAD DEBUG]   document_type:', documentType);
                    console.log('[UPLOAD DEBUG]   group_id:', groupId);

                    // Extra validation check
                    if (productId && typeof productId === 'string' && !/^\d+$/.test(productId)) {
                        console.error('[UPLOAD DEBUG] WARNING: inspection_id is NOT numeric!');
                        console.error('[UPLOAD DEBUG] inspection_id value:', productId);
                        console.error('[UPLOAD DEBUG] This will cause an error on the server!');
                    }

                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CSRF;
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    console.log('[UPLOAD DEBUG] Sending POST to /upload-document/...');

                    fetch('/upload-document/', {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-CSRFToken': csrfToken
                        }
                    })
                        .then(response => {
                            console.log('[UPLOAD DEBUG] Response status:', response.status);
                            console.log('[UPLOAD DEBUG] Response ok:', response.ok);
                            if (!response.ok) {
                                return response.text().then(text => {
                                    console.error('[UPLOAD DEBUG] Server returned HTTP ' + response.status + ':', text.substring(0, 500));
                                    throw new Error('Server error (HTTP ' + response.status + '). Please try again.');
                                });
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('[UPLOAD DEBUG] Response data:', JSON.stringify(data));
                            if (data.success) {
                                console.log('[UPLOAD DEBUG] SUCCESS! ' + documentType + ' uploaded for inspection ' + productId);

                                // Update button color to green immediately - no page reload
                                // All buttons use data-upload-btn attribute pattern
                                const btn = document.querySelector('[data-upload-btn="' + documentType + '-' + productId + '"]');
                                if (btn) {
                                    btn.style.background = '#22c55e';
                                    // Keep original label but add checkmark
                                    const originalText = btn.textContent.replace(' ✓', '');
                                    btn.innerHTML = originalText + ' ✓';
                                }

                                // Also update RFI/Invoice buttons in Facility section by groupId
                                if (groupId && (documentType === 'rfi' || documentType === 'invoice')) {
                                    // Update desktop button
                                    const groupBtn = document.getElementById(documentType + '-btn-' + groupId);
                                    if (groupBtn) {
                                        groupBtn.style.backgroundColor = '#22c55e';
                                        groupBtn.style.borderColor = '#22c55e';
                                        groupBtn.style.color = 'white';
                                        groupBtn.disabled = true;
                                        groupBtn.style.cursor = 'not-allowed';
                                        const label = documentType === 'rfi' ? 'RFI' : 'Invoice';
                                        groupBtn.innerHTML = label + ' ✓';
                                        groupBtn.title = label + ' file exists';
                                        console.log('✅ Updated ' + documentType + ' desktop button to GREEN');
                                    }
                                    // Update mobile button
                                    const mobileBtn = document.getElementById(documentType + '-mobile-' + groupId);
                                    if (mobileBtn) {
                                        mobileBtn.style.backgroundColor = '#22c55e';
                                        mobileBtn.style.borderColor = '#22c55e';
                                        mobileBtn.style.color = 'white';
                                        mobileBtn.disabled = true;
                                        mobileBtn.style.cursor = 'not-allowed';
                                        const label = documentType === 'rfi' ? 'RFI' : 'Invoice';
                                        mobileBtn.innerHTML = '<i class="fas fa-check mr-1"></i> ' + label + ' ✓';
                                        mobileBtn.title = label + ' file exists';
                                        console.log('✅ Updated ' + documentType + ' mobile button to GREEN');
                                    }
                                }

                                // Update Lab Form button - find by data-upload-btn or style attribute
                                if (documentType === 'lab_form') {
                                    // Try multiple selectors to find lab form buttons
                                    const labFormSelectors = [
                                        '[data-upload-btn="lab_form-' + productId + '"]',
                                        'button[onclick*="uploadLabFormForInspection"][onclick*="' + productId + '"]',
                                        'button[title*="Lab Form"]'
                                    ];

                                    labFormSelectors.forEach(selector => {
                                        document.querySelectorAll(selector).forEach(labBtn => {
                                            labBtn.style.background = '#22c55e';
                                            labBtn.style.backgroundColor = '#22c55e';
                                            labBtn.style.borderColor = '#22c55e';
                                            labBtn.style.color = 'white';
                                            console.log('✅ Updated lab_form button to GREEN:', labBtn);
                                        });
                                    });
                                }

                                // Update Lab/COA buttons to green (desktop + mobile)
                                if (documentType === 'lab' || documentType === 'coa') {
                                    // Update desktop button by data-upload-btn
                                    const labBtn = document.querySelector('[data-upload-btn="lab-' + productId + '"]');
                                    if (labBtn) {
                                        labBtn.style.backgroundColor = '#22c55e';
                                        labBtn.style.background = '#22c55e';
                                        labBtn.style.borderColor = '#22c55e';
                                        labBtn.style.color = 'white';
                                        labBtn.style.cursor = 'not-allowed';
                                        labBtn.disabled = true;
                                        labBtn.innerHTML = '<i class="fas fa-check mr-1"></i> COA/Lab ✓';
                                        labBtn.title = 'COA/Lab file uploaded';
                                        labBtn.onclick = null;
                                        console.log('✅ Updated Lab desktop button to GREEN');
                                    }
                                    // Also try by onclick attribute
                                    const labBtnAlt = document.querySelector('button[onclick*="uploadLabFile"][onclick*="' + productId + '"]') ||
                                                      document.querySelector('button[onclick*="uploadLabForInspection"][onclick*="' + productId + '"]');
                                    if (labBtnAlt && labBtnAlt !== labBtn) {
                                        labBtnAlt.style.backgroundColor = '#22c55e';
                                        labBtnAlt.style.background = '#22c55e';
                                        labBtnAlt.style.borderColor = '#22c55e';
                                        labBtnAlt.style.color = 'white';
                                        labBtnAlt.style.cursor = 'not-allowed';
                                        labBtnAlt.disabled = true;
                                        labBtnAlt.innerHTML = '<i class="fas fa-check mr-1"></i> Lab ✓';
                                        labBtnAlt.title = 'Lab file uploaded';
                                        labBtnAlt.onclick = null;
                                        console.log('✅ Updated Lab mobile/alt button to GREEN');
                                    }
                                }

                                // Update Retest buttons to green (desktop + mobile)
                                if (documentType === 'retest') {
                                    const retestBtn = document.querySelector('[data-upload-btn="retest-' + productId + '"]');
                                    if (retestBtn) {
                                        retestBtn.style.backgroundColor = '#22c55e';
                                        retestBtn.style.background = '#22c55e';
                                        retestBtn.style.borderColor = '#22c55e';
                                        retestBtn.style.color = 'white';
                                        retestBtn.style.cursor = 'not-allowed';
                                        retestBtn.disabled = true;
                                        retestBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Retest ✓';
                                        retestBtn.title = 'Retest file uploaded';
                                        retestBtn.onclick = null;
                                        console.log('✅ Updated Retest desktop button to GREEN');
                                    }
                                    const retestBtnAlt = document.querySelector('button[onclick*="uploadRetestFile"][onclick*="' + productId + '"]') ||
                                                         document.querySelector('button[onclick*="uploadRetestForInspection"][onclick*="' + productId + '"]');
                                    if (retestBtnAlt && retestBtnAlt !== retestBtn) {
                                        retestBtnAlt.style.backgroundColor = '#22c55e';
                                        retestBtnAlt.style.background = '#22c55e';
                                        retestBtnAlt.style.borderColor = '#22c55e';
                                        retestBtnAlt.style.color = 'white';
                                        retestBtnAlt.style.cursor = 'not-allowed';
                                        retestBtnAlt.disabled = true;
                                        retestBtnAlt.innerHTML = '<i class="fas fa-check mr-1"></i> Retest ✓';
                                        retestBtnAlt.title = 'Retest file uploaded';
                                        retestBtnAlt.onclick = null;
                                        console.log('✅ Updated Retest mobile/alt button to GREEN');
                                    }
                                }

                                // Update sample compliance badge immediately for COA/Lab uploads
                                if (documentType === 'lab' || documentType === 'coa') {
                                    const badge = document.getElementById('sample-badge-' + productId);
                                    if (badge && complianceStatus) {
                                        if (complianceStatus === 'compliant') {
                                            badge.textContent = 'Sample: Compliant';
                                            badge.style.background = '#22c55e';
                                        } else if (complianceStatus === 'non-compliant') {
                                            badge.textContent = 'Sample: Non-Compliant';
                                            badge.style.background = '#ef4444';
                                        }
                                        console.log('✅ Updated sample compliance badge to:', complianceStatus);
                                    }
                                }

                                // Show toast notification instead of alert
                                const toast = document.createElement('div');
                                toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #22c55e; color: white; padding: 12px 20px; border-radius: 6px; z-index: 9999; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
                                toast.textContent = documentType.charAt(0).toUpperCase() + documentType.slice(1) + ' uploaded successfully!';
                                document.body.appendChild(toast);
                                setTimeout(() => toast.remove(), 3000);
                            } else {
                                console.error('[UPLOAD DEBUG] UPLOAD FAILED!');
                                console.error('[UPLOAD DEBUG] Error message:', data.error);
                                console.error('[UPLOAD DEBUG] Full response:', JSON.stringify(data));
                                if (data.traceback) {
                                    console.error('[UPLOAD DEBUG] SERVER TRACEBACK:');
                                    console.error(data.traceback);
                                }
                                console.error('[UPLOAD DEBUG] Original parameters:');
                                console.error('[UPLOAD DEBUG]   productId was:', productId);
                                console.error('[UPLOAD DEBUG]   groupId was:', groupId);
                                console.error('[UPLOAD DEBUG]   documentType was:', documentType);
                                alert('Error uploading ' + documentType + ': ' + (data.error || 'Unknown error'));
                            }
                        })
                        .catch(error => {
                            console.error('[UPLOAD DEBUG] FETCH ERROR!');
                            console.error('[UPLOAD DEBUG] Error:', error);
                            console.error('[UPLOAD DEBUG] Error message:', error.message);
                            console.error('[UPLOAD DEBUG] Error stack:', error.stack);
                            alert('Error uploading ' + documentType + ': ' + error.message);
                        });
                }
            };

            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        };

        window.uploadComplianceForInspection = function (productId, groupId) {
            console.log('[UPLOAD DEBUG] uploadComplianceForInspection called with productId:', productId, 'groupId:', groupId);
            // Store the pending upload info and show product compliance modal
            window._pendingProductUpload = { productId, groupId, documentType: 'compliance' };
            const modal = document.getElementById('productComplianceModal');
            if (modal) modal.style.display = 'flex';
        };

        window.uploadCompositionForInspection = function (productId, groupId) {
            // Store the pending upload info and show product compliance modal
            window._pendingProductUpload = { productId, groupId, documentType: 'composition' };
            const modal = document.getElementById('productComplianceModal');
            if (modal) modal.style.display = 'flex';
        };

        window.uploadLabForInspection = function (productId, groupId) {
            // Store the IDs for later use
            window._pendingLabUpload = { productId, groupId };

            // Show compliance status modal
            const modal = document.getElementById('coaComplianceModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        };

        window.selectCoaCompliance = function(complianceStatus) {
            const { productId, groupId } = window._pendingLabUpload || {};
            if (!productId && !groupId) {
                alert('Error: Upload session expired. Please try again.');
                closeCoaComplianceModal();
                return;
            }

            // Close modal
            closeCoaComplianceModal();

            // Proceed with upload, passing compliance status
            window.uploadDocumentForInspection(productId, groupId, 'lab', complianceStatus);
        };

        window.closeCoaComplianceModal = function() {
            const modal = document.getElementById('coaComplianceModal');
            if (modal) {
                modal.style.display = 'none';
            }
            window._pendingLabUpload = null;
        };

        window.closeProductComplianceModal = function() {
            const modal = document.getElementById('productComplianceModal');
            if (modal) {
                modal.style.display = 'none';
            }
            window._pendingProductUpload = null;
        };

        window.selectProductCompliance = function(complianceStatus) {
            const { productId, groupId, documentType } = window._pendingProductUpload || {};

            if (!productId || !documentType) {
                alert('Error: Upload information not found. Please try again.');
                window.closeProductComplianceModal();
                return;
            }

            window.closeProductComplianceModal();

            // Now trigger the file picker
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf,.jpg,.jpeg,.png';
            fileInput.style.display = 'none';

            fileInput.onchange = function (e) {
                const file = e.target.files[0];
                if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('inspection_id', productId);
                    formData.append('document_type', documentType);
                    formData.append('group_id', groupId);
                    formData.append('product_compliance_status', complianceStatus);

                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CSRF;
                    formData.append('csrfmiddlewaretoken', csrfToken);

                    fetch('/upload-document/', {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => {
                            if (!response.ok) {
                                return response.text().then(text => {
                                    console.error('❌ Server returned HTTP ' + response.status + ' for ' + documentType + ' upload:', text.substring(0, 500));
                                    throw new Error('Server error (HTTP ' + response.status + '). Please try again.');
                                });
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (data.success) {
                                console.log('✅ ' + documentType + ' uploaded for inspection ' + productId);
                                // Turn button green
                                const btn = document.querySelector('[data-upload-btn="' + documentType + '-' + productId + '"]');
                                if (btn) btn.style.background = '#22c55e';

                                // Update product compliance badge immediately
                                const badge = document.getElementById('product-badge-' + productId);
                                if (badge) {
                                    if (complianceStatus === 'compliant') {
                                        badge.textContent = 'Product: Compliant';
                                        badge.style.background = '#22c55e';
                                    } else {
                                        badge.textContent = 'Product: Non-Compliant';
                                        badge.style.background = '#ef4444';
                                    }
                                }

                                // Silent success - no popup
                                console.log('✅ ' + documentType + ' uploaded successfully! Product marked as ' + complianceStatus);
                            } else {
                                console.error('❌ Error uploading ' + documentType + ':', data.error);
                                alert('Error uploading ' + documentType + ': ' + (data.error || 'Unknown error'));
                            }
                        })
                        .catch(error => {
                            console.error('❌ Error uploading ' + documentType + ':', error);
                            alert('Error uploading ' + documentType + ': ' + error.message);
                        });
                }
            };

            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        };

        window.uploadOccurrenceForInspection = function (productId, groupId) {
            window.uploadDocumentForInspection(productId, groupId, 'occurrence');
        };

        window.uploadInvoiceForInspection = function (productId, groupId) {
            window.uploadDocumentForInspection(productId, groupId, 'invoice');
        };

        window.uploadRfiForInspection = function (productId, groupId) {
            console.log('[UPLOAD DEBUG] uploadRfiForInspection called with productId:', productId, 'groupId:', groupId);
            window.uploadDocumentForInspection(productId, groupId, 'rfi');
        };

        window.uploadRetestForInspection = function (productId, groupId) {
            window.uploadDocumentForInspection(productId, groupId, 'retest');
        };

        window.uploadOtherForInspection = function (productId, groupId) {
            window.uploadDocumentForInspection(productId, groupId, 'other');
        };

        window.uploadLabFormForInspection = function (productId, groupId) {
            window.uploadDocumentForInspection(productId, groupId, 'lab_form');
        };

        window.viewDocForInspection = function (productId, docType) {
            console.log('viewDocForInspection called:', productId, docType);
        };

        window.deleteDocForInspection = function (productId, docType) {
            console.log('deleteDocForInspection called:', productId, docType);
        };

        // Delete inspection group function
        window.deleteInspectionGroup = function(groupId, clientName) {
            console.log('[DELETE] Starting delete for group:', groupId, 'client:', clientName);

            if (!confirm('Are you sure you want to delete the inspection for "' + clientName + '"?\n\nThis will permanently delete all associated data and files.')) {
                console.log('[DELETE] User cancelled');
                return;
            }

            var row = document.querySelector('tr.group-row[data-precise-group-id="' + groupId + '"]')
                   || document.querySelector('tr.group-row[data-group-id="' + groupId + '"]');
            if (row) {
                row.style.opacity = '0.5';
                row.style.pointerEvents = 'none';
            }

            console.log('[DELETE] Sending request to /inspections/delete-group/');

            fetch('/inspections/delete-group/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || window.DJANGO_CSRF
                },
                body: JSON.stringify({ group_id: groupId })
            })
            .then(function(response) {
                console.log('[DELETE] Response status:', response.status);
                return response.json();
            })
            .then(function(data) {
                console.log('[DELETE] Response data:', data);
                if (data.success) {
                    var detailRow = document.querySelector('tr.detail-row[data-precise-detail-id="' + groupId + '"]');
                    if (detailRow) detailRow.remove();
                    if (row) row.remove();
                    var toast = document.createElement('div');
                    toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #22c55e; color: white; padding: 12px 20px; border-radius: 6px; z-index: 9999; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
                    toast.textContent = 'Inspection deleted successfully. Refreshing...';
                    document.body.appendChild(toast);
                    var params = new URLSearchParams(window.location.search);
                    params.delete('page');
                    params.set('_bust', Date.now());
                    setTimeout(function() { window.location.href = window.location.pathname + '?' + params.toString(); }, 1000);
                } else {
                    alert('Error deleting inspection: ' + (data.error || 'Unknown error'));
                    if (row) {
                        row.style.opacity = '1';
                        row.style.pointerEvents = 'auto';
                    }
                }
            })
            .catch(function(error) {
                console.error('[DELETE] Error:', error);
                alert('Error deleting inspection. Please try again.');
                if (row) {
                    row.style.opacity = '1';
                    row.style.pointerEvents = 'auto';
                }
            });
        };

        console.log('✅ Critical functions defined in HEAD');
