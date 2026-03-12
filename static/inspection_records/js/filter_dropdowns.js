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
