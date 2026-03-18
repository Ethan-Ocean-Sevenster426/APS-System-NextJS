                                        function updateInspectorSelectText() {
                                            var checked = document.querySelectorAll('.inspector-checkbox:checked');
                                            var textEl = document.getElementById('inspectorSelectText');
                                            var allCbs = document.querySelectorAll('.inspector-checkbox');
                                            var selectAllCb = document.getElementById('selectAllInspectors');
                                            if (checked.length === 0) {
                                                textEl.textContent = 'All Inspectors';
                                            } else if (checked.length === 1) {
                                                textEl.textContent = checked[0].value;
                                            } else {
                                                textEl.textContent = checked.length + ' selected';
                                            }
                                            if (selectAllCb) {
                                                selectAllCb.checked = checked.length === allCbs.length;
                                            }
                                        }
                                        // Inspector close handler is in inspection_records.js
                                        function updateLabSelectText() {
                                            var checked = document.querySelectorAll('.lab-checkbox:checked');
                                            var textEl = document.getElementById('labSelectText');
                                            var allCbs = document.querySelectorAll('.lab-checkbox');
                                            var selectAllCb = document.getElementById('selectAllLabs');
                                            if (checked.length === 0) {
                                                textEl.textContent = 'All Labs';
                                            } else if (checked.length === 1) {
                                                textEl.textContent = checked[0].parentElement.querySelector('span').textContent;
                                            } else {
                                                textEl.textContent = checked.length + ' selected';
                                            }
                                            if (selectAllCb) {
                                                selectAllCb.checked = checked.length === allCbs.length;
                                            }
                                        }
                                        document.addEventListener('click', function(e) {
                                            var dropdown = document.getElementById('labDropdown');
                                            var btn = document.getElementById('labDropdownBtn');
                                            if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
                                                dropdown.style.display = 'none';
                                            }
                                        });
                                        // Restore selected labs from URL params
                                        (function() {
                                            var params = new URLSearchParams(window.location.search);
                                            var selectedLabs = params.getAll('lab');
                                            selectedLabs.forEach(function(val) {
                                                var cb = document.querySelector('.lab-checkbox[value="' + val + '"]');
                                                if (cb) cb.checked = true;
                                            });
                                            updateLabSelectText();
                                        })();
                                        function updateTestTypeSelectText() {
                                            var checked = document.querySelectorAll('.test-type-checkbox:checked');
                                            var textEl = document.getElementById('testTypeSelectText');
                                            var allCbs = document.querySelectorAll('.test-type-checkbox');
                                            var selectAllCb = document.getElementById('selectAllTests');
                                            if (checked.length === 0) {
                                                textEl.textContent = 'All Tests';
                                            } else if (checked.length === 1) {
                                                textEl.textContent = checked[0].parentElement.querySelector('span').textContent;
                                            } else {
                                                textEl.textContent = checked.length + ' selected';
                                            }
                                            if (selectAllCb) {
                                                selectAllCb.checked = checked.length === allCbs.length;
                                            }
                                        }
                                        document.addEventListener('click', function(e) {
                                            var dropdown = document.getElementById('testTypeDropdown');
                                            var btn = document.getElementById('testTypeDropdownBtn');
                                            if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
                                                dropdown.style.display = 'none';
                                            }
                                        });
                                        // Restore selected test types from URL params
                                        (function() {
                                            var params = new URLSearchParams(window.location.search);
                                            var selectedTypes = params.getAll('test_type');
                                            selectedTypes.forEach(function(val) {
                                                var cb = document.querySelector('.test-type-checkbox[value="' + val + '"]');
                                                if (cb) cb.checked = true;
                                            });
                                            updateTestTypeSelectText();
                                        })();

// Generic helper for simple multi-select dropdowns
function _updateMultiText(checkboxClass, textId, defaultLabel) {
    var checked = document.querySelectorAll('.' + checkboxClass + ':checked');
    var el = document.getElementById(textId);
    if (!el) return;
    if (checked.length === 0) { el.textContent = defaultLabel; }
    else if (checked.length === 1) { el.textContent = checked[0].parentElement.querySelector('span').textContent; }
    else { el.textContent = checked.length + ' selected'; }
}
function _closeOnOutsideClick(panelId, btnId) {
    document.addEventListener('click', function(e) {
        var p = document.getElementById(panelId), b = document.getElementById(btnId);
        if (p && b && !p.contains(e.target) && !b.contains(e.target)) p.style.display = 'none';
    });
}
function _restoreFromUrl(paramName, checkboxClass, updateFn) {
    var params = new URLSearchParams(window.location.search);
    params.getAll(paramName).forEach(function(v) {
        var cb = document.querySelector('.' + checkboxClass + '[value="' + v + '"]');
        if (cb) cb.checked = true;
    });
    updateFn();
}

function updateCorpGroupText()     { _updateMultiText('corp-group-checkbox',    'corpGroupText',   'All Groups');      }
function updateGroupTypeText()     { _updateMultiText('group-type-checkbox',    'groupTypeText',   'All Types');       }
function updateSentStatusText()    { _updateMultiText('sent-status-checkbox',   'sentStatusText',  'Not Sent');        }
function updateComplianceText()    { _updateMultiText('compliance-checkbox',    'complianceText',  'All Inspections'); }
function updateApprovedText()      { _updateMultiText('approved-checkbox',      'approvedText',    'All');             }
function updateFileStatusText()    { _updateMultiText('file-status-checkbox',   'fileStatusText',  'All Inspections'); }
function updateNeedsRetestText()   { _updateMultiText('needs-retest-checkbox',  'needsRetestText', 'All');             }
function updateCoaUploadedText()   { _updateMultiText('coa-uploaded-checkbox',  'coaUploadedText', 'All');             }

_closeOnOutsideClick('corpGroupPanel',   'corpGroupBtn');
_closeOnOutsideClick('groupTypePanel',   'groupTypeBtn');
_closeOnOutsideClick('sentStatusPanel',  'sentStatusBtn');
_closeOnOutsideClick('compliancePanel',  'complianceBtn');
_closeOnOutsideClick('approvedPanel',    'approvedBtn');
_closeOnOutsideClick('fileStatusPanel',  'fileStatusBtn');
_closeOnOutsideClick('needsRetestPanel', 'needsRetestBtn');
_closeOnOutsideClick('coaUploadedPanel', 'coaUploadedBtn');

(function() {
    _restoreFromUrl('corporate_group',       'corp-group-checkbox',   updateCorpGroupText);
    _restoreFromUrl('group_type',            'group-type-checkbox',   updateGroupTypeText);
    _restoreFromUrl('sent_status',           'sent-status-checkbox',  updateSentStatusText);
    _restoreFromUrl('compliance_status',     'compliance-checkbox',   updateComplianceText);
    _restoreFromUrl('approved_status_filter','approved-checkbox',     updateApprovedText);
    _restoreFromUrl('file_status_filter',    'file-status-checkbox',  updateFileStatusText);
    _restoreFromUrl('needs_retest',          'needs-retest-checkbox', updateNeedsRetestText);
    _restoreFromUrl('coa_uploaded',          'coa-uploaded-checkbox', updateCoaUploadedText);
})();
