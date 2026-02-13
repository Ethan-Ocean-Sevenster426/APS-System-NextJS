        // Cache DOM elements for performance
        const DOM = {
            exportTableBody: null,
            contextMenu: null,
            filters: {},
            init() {
                this.exportTableBody = document.getElementById('exportTableBody');
                this.contextMenu = document.getElementById('contextMenu');
                this.filters = {
                    contactName: document.getElementById('contactNameFilter'),
                    reference: document.getElementById('referenceFilter'),
                    city: document.getElementById('cityFilter'),
                    inspector: document.getElementById('inspectorFilter'),
                    corporateGroup: document.getElementById('corporateGroupFilter'),
                    dateFrom: document.getElementById('invoiceDateFromFilter'),
                    dateTo: document.getElementById('invoiceDateToFilter')
                };
            }
        };

        // Helper function to check if there's data to export
        function hasExportData() {
            const rows = document.querySelectorAll('#exportTableBody tr[data-contact]');
            // Check if there's at least one visible row
            for (let row of rows) {
                if (row.style.display !== 'none') {
                    return true;
                }
            }
            return false;
        }

        // Debounce function for filter inputs
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        
        // Function to convert DD/MM/YYYY to YYYY-MM-DD for date comparison
        function convertDateFormat(dateStr) {
            if (!dateStr) return '';
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            return dateStr;
        }
        
        // Optimized filter function with batch processing
        function applyDateFilter() {
            console.log('applyDateFilter called');

            // Get date filter values
            const dateFrom = document.getElementById('invoiceDateFromFilter')?.value || '';
            const dateTo = document.getElementById('invoiceDateToFilter')?.value || '';

            // Build URL with query parameters
            const url = new URL(window.location.href);
            url.search = ''; // Clear existing params

            if (dateFrom) {
                url.searchParams.set('date_from', dateFrom);
            }
            if (dateTo) {
                url.searchParams.set('date_to', dateTo);
            }

            // Reload page with new date filters
            window.location.href = url.toString();
        }

        function applyFilters() {
            console.log('applyFilters called');

            // Get filter values (use cached elements if available)
            const filters = DOM.filters.contactName ? DOM.filters : {
                contactName: document.getElementById('contactNameFilter'),
                reference: document.getElementById('referenceFilter'),
                city: document.getElementById('cityFilter'),
                inspector: document.getElementById('inspectorFilter'),
                corporateGroup: document.getElementById('corporateGroupFilter'),
                dateFrom: document.getElementById('invoiceDateFromFilter'),
                dateTo: document.getElementById('invoiceDateToFilter')
            };

            // Null-safe value extraction
            const contactName = filters.contactName?.value?.toLowerCase().trim() || '';
            const reference = filters.reference?.value?.toLowerCase().trim() || '';
            const city = filters.city?.value?.toLowerCase().trim() || '';
            const inspector = filters.inspector?.value?.toLowerCase().trim() || '';
            const corporateGroup = filters.corporateGroup?.value?.toLowerCase().trim() || '';
            const invoiceDateFrom = filters.dateFrom?.value || '';
            const invoiceDateTo = filters.dateTo?.value || '';

            console.log('Filter values:', { contactName, reference, city, inspector, corporateGroup, invoiceDateFrom, invoiceDateTo });

            // Check if any filters are active
            const hasFilters = contactName || reference || city || inspector || corporateGroup || invoiceDateFrom || invoiceDateTo;

            const rows = document.querySelectorAll('#exportTableBody tr[data-contact]');
            const rowCount = rows.length;

            console.log('Total rows to filter:', rowCount);

            // Batch process for smooth performance
            const BATCH_SIZE = 50;
            let currentIndex = 0;
            let visibleCount = 0;

            function processBatch() {
                const endIndex = Math.min(currentIndex + BATCH_SIZE, rowCount);

                for (let i = currentIndex; i < endIndex; i++) {
                    const row = rows[i];

                    if (!hasFilters) {
                        row.style.display = '';
                        visibleCount++;
                        continue;
                    }

                    let show = true;

                    // Contact Name filter
                    if (show && contactName) {
                        const rowContact = (row.getAttribute('data-contact') || '').toLowerCase();
                        show = rowContact.includes(contactName);
                    }

                    // Reference Number filter
                    if (show && reference) {
                        const rowReference = (row.getAttribute('data-reference') || '').toLowerCase();
                        show = rowReference.includes(reference);
                    }

                    // City filter
                    if (show && city) {
                        const rowCity = (row.getAttribute('data-city') || '').toLowerCase();
                        show = rowCity.includes(city);
                    }

                    // Inspector filter
                    if (show && inspector) {
                        const rowInspector = (row.getAttribute('data-inspector') || '').toLowerCase();
                        show = rowInspector.includes(inspector);
                    }

                    // Corporate Group filter
                    if (show && corporateGroup) {
                        const rowCorporateGroup = (row.getAttribute('data-corporate-group') || '').toLowerCase();
                        show = rowCorporateGroup.includes(corporateGroup);
                    }

                    // Invoice Date range filter
                    if (show && (invoiceDateFrom || invoiceDateTo)) {
                        const rowDate = row.getAttribute('data-date') || '';
                        const parts = rowDate.split('/');
                        if (parts.length === 3) {
                            const rowDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
                            if (invoiceDateFrom && rowDateFormatted < invoiceDateFrom) show = false;
                            if (invoiceDateTo && rowDateFormatted > invoiceDateTo) show = false;
                        } else {
                            show = false;
                        }
                    }

                    row.style.display = show ? '' : 'none';
                    if (show) visibleCount++;
                }

                currentIndex = endIndex;

                if (currentIndex < rowCount) {
                    requestAnimationFrame(processBatch);
                } else {
                    console.log('Filtering complete. Visible rows:', visibleCount, '/', rowCount);
                }
            }

            processBatch();
        }

        // Function to clear all filters
        function clearAllFilters() {
            // Clear month dropdown
            const monthSelect = document.getElementById('monthFilter');
            if (monthSelect) {
                monthSelect.value = '';
            }

            // Reload page without any query parameters (will use default yesterday-today)
            const url = new URL(window.location.href);
            url.search = ''; // Clear all query params
            window.location.href = url.toString();
        }

        // Handle month filter selection
        function handleMonthFilter() {
            const monthSelect = document.getElementById('monthFilter');
            const dateFromInput = document.getElementById('invoiceDateFromFilter');
            const dateToInput = document.getElementById('invoiceDateToFilter');

            if (monthSelect && dateFromInput && dateToInput) {
                monthSelect.addEventListener('change', function() {
                    const selectedMonth = this.value;

                    if (selectedMonth) {
                        // Parse year and month
                        const [year, month] = selectedMonth.split('-');

                        // Get first day of month
                        const firstDay = `${year}-${month}-01`;

                        // Get last day of month
                        const lastDay = new Date(year, month, 0).getDate();
                        const lastDayFormatted = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

                        // Set the date inputs
                        dateFromInput.value = firstDay;
                        dateToInput.value = lastDayFormatted;

                        // Automatically apply the filter
                        applyDateFilter();
                    } else {
                        // Clear month filter - clear dates
                        dateFromInput.value = '';
                        dateToInput.value = '';
                    }
                });
            }
        }

        // Legacy function for backward compatibility
        function filterByInvoiceDate() {
            applyFilters();
        }

        // Legacy function for backward compatibility
        function clearFilter() {
            clearAllFilters();
        }
        
        // Show context menu on right-click
        document.getElementById('exportTable').addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const contextMenu = DOM.contextMenu || document.getElementById('contextMenu');

            // Show menu first to get dimensions
            contextMenu.style.display = 'block';

            // Use clientX/clientY for fixed positioning (relative to viewport)
            let x = e.clientX;
            let y = e.clientY;

            // Get menu dimensions
            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;

            // Get viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Adjust position if menu would go off-screen
            if (x + menuWidth > viewportWidth) {
                x = viewportWidth - menuWidth - 10;
            }
            if (y + menuHeight > viewportHeight) {
                y = viewportHeight - menuHeight - 10;
            }

            // Ensure menu doesn't go off the left or top edge
            x = Math.max(10, x);
            y = Math.max(10, y);

            contextMenu.style.left = x + 'px';
            contextMenu.style.top = y + 'px';
        });

        // Hide context menu on click outside
        document.addEventListener('click', function(e) {
            const contextMenu = DOM.contextMenu || document.getElementById('contextMenu');
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });

        // Get data for export
        function getExportData() {
            console.log('[EXPORT] getExportData() called');

            // Xero-compatible headers with all required columns (exact order as specified)
            const headers = [
                '*ContactName',
                'EmailAddress',
                'POAddressLine1',
                'POAddressLine2',
                'POAddressLine3',
                'POAddressLine4',
                'POCity',
                'PORegion',
                'POPostalCode',
                'POCountry',
                '*InvoiceNumber',
                'Reference',
                '*InvoiceDate',
                '*DueDate',
                'Total',
                'InventoryItemCode',
                '*Description',
                '*Quantity',
                '*UnitAmount',
                'Discount',
                '*AccountCode',
                '*TaxType',
                'Tax Amount',
                'TrackingName1',
                'TrackingOption1',
                'TrackingName2',
                'TrackingOption2',
                'Currency',
                'BrandingTheme'
            ];

            const data = [headers];

            // Get all visible table rows (only rows that are not hidden by filters)
            const rows = document.querySelectorAll('#exportTableBody tr[data-contact]');
            console.log(`[EXPORT] Found ${rows.length} total rows in DOM`);

            let visibleCount = 0;
            let hiddenCount = 0;

            rows.forEach(row => {
                // Skip hidden rows (filtered out)
                if (row.style.display === 'none') {
                    hiddenCount++;
                    return;
                }
                visibleCount++;

                const contactName = row.getAttribute('data-contact') || '';
                const city = row.getAttribute('data-city') || '';
                const country = row.getAttribute('data-country') || '';
                // Note: invoiceRef is read but NOT exported (kept blank for Xero import)
                // const invoiceRef = row.getAttribute('data-reference') || '';
                // const rfiRef = row.getAttribute('data-rfi') || '';
                const invoiceDate = row.getAttribute('data-date') || '';
                const total = row.getAttribute('data-total') || '';
                const itemCode = row.getAttribute('data-itemcode') || '';
                const description = row.getAttribute('data-description') || '';
                const quantity = row.getAttribute('data-quantity') || '';
                const unitAmount = row.getAttribute('data-unitamount') || '';
                const accountCode = row.getAttribute('data-accountcode') || '';
                const taxType = row.getAttribute('data-taxtype') || '';

                data.push([
                    contactName,              // *ContactName
                    '',                       // EmailAddress (blank)
                    '',                       // POAddressLine1 (blank)
                    '',                       // POAddressLine2 (blank)
                    '',                       // POAddressLine3 (blank)
                    '',                       // POAddressLine4 (blank)
                    city,                     // POCity
                    '',                       // PORegion (blank)
                    '',                       // POPostalCode (blank)
                    '',                       // POCountry (blank)
                    '',                       // *InvoiceNumber (blank - Xero will generate)
                    '',                       // Reference (empty as requested)
                    invoiceDate,              // *InvoiceDate
                    '',                       // *DueDate (blank - Xero will calculate)
                    '',                       // Total (blank - Xero calculates from line items)
                    itemCode,                 // InventoryItemCode
                    description,              // *Description
                    quantity,                 // *Quantity
                    unitAmount,               // *UnitAmount
                    '',                       // Discount (blank)
                    accountCode,              // *AccountCode
                    taxType,                  // *TaxType
                    '',                       // Tax Amount (blank - Xero calculates)
                    '',                       // TrackingName1 (blank)
                    '',                       // TrackingOption1 (blank)
                    '',                       // TrackingName2 (blank)
                    '',                       // TrackingOption2 (blank)
                    '',                       // Currency (blank - uses default)
                    ''                        // BrandingTheme (blank)
                ]);
            });

            console.log(`[EXPORT] Processed ${visibleCount} visible rows, skipped ${hiddenCount} hidden rows`);
            console.log(`[EXPORT] Returning ${data.length} total rows (including header)`);

            return data;
        }

        // Export to Google Sheets
        async function exportAsGoogleSheets() {
            document.getElementById('contextMenu').style.display = 'none';

            if (!hasExportData()) {
                alert('No data to export');
                return;
            }

            const exportData = getExportData();

            // Open a blank tab immediately (within user click context)
            const newTab = window.open('about:blank', '_blank');

            if (!newTab) {
                alert('❌ Please allow pop-ups for this site to export to Google Sheets.');
                return;
            }

            // Show loading message in the new tab
            newTab.document.write('<html><head><title>Creating Google Sheet...</title></head><body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;"><div style="text-align: center;"><h2>Creating your Google Sheet...</h2><p>Please wait...</p><div style="margin-top: 20px;"><div style="border: 4px solid #f3f3f3; border-top: 4px solid #007890; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style></body></html>');

            console.log('Sending export request...');
            console.log('Export data rows:', exportData.length);

            try {
                const response = await fetch(window.DJANGO_CONFIG.urls.exportToGoogleSheets, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': window.DJANGO_CONFIG.csrfToken
                    },
                    body: JSON.stringify({ data: exportData })
                });

                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);

                if (data.success) {
                    console.log('Redirecting to Google Sheet:', data.url);

                    // Redirect the blank tab to the Google Sheet
                    newTab.location.href = data.url;

                    console.log('✅ Opened in new tab');
                } else {
                    // Close the blank tab and show error
                    newTab.close();
                    alert('❌ Error: ' + data.error);
                }
            } catch (error) {
                console.error('Error:', error);

                // Close the blank tab
                newTab.close();

                alert('❌ Error creating Google Sheet: ' + error.message);
            }
        }

        // Export as CSV (Tab-separated for Xero)
        function exportAsCSV() {
            document.getElementById('contextMenu').style.display = 'none';

            if (!hasExportData()) {
                alert('No data to export');
                return;
            }

            const exportData = getExportData();
            const rowCount = exportData.length - 1;
            console.log(`[EXPORT CSV] Exporting ${rowCount} rows`);

            // Use tabs instead of commas for Xero import
            const csvRows = exportData.map(row => row.join('\t'));
            const csvContent = csvRows.join('\n');

            downloadFile(csvContent, 'text/tab-separated-values', 'Xero_Import.txt');
            console.log('[EXPORT CSV] Download initiated');
        }

        // Export as CSV (Excel) - Tab-separated for Xero
        function exportAsExcelCSV() {
            document.getElementById('contextMenu').style.display = 'none';

            if (!hasExportData()) {
                alert('No data to export');
                return;
            }

            const exportData = getExportData();
            const rowCount = exportData.length - 1;
            console.log(`[EXPORT Excel CSV] Exporting ${rowCount} rows`);

            // Excel CSV needs BOM for UTF-8
            // Use tabs instead of commas for Xero import
            const BOM = '\uFEFF';
            const csvRows = exportData.map(row => row.join('\t'));
            const csvContent = BOM + csvRows.join('\r\n');

            downloadFile(csvContent, 'text/tab-separated-values', 'Xero_Import.txt');
            console.log('[EXPORT Excel CSV] Download initiated');
        }

        // Helper function to download file
        function downloadFile(content, mimeType, fileName) {
            const blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        }

        // Toggle export dropdown menu
        function toggleExportDropdown() {
            const dropdown = document.getElementById('exportDropdownMenu');
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
        }

        // Hide export dropdown menu
        function hideExportDropdown() {
            document.getElementById('exportDropdownMenu').style.display = 'none';
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('exportDropdownMenu');
            const container = event.target.closest('.export-dropdown-container');

            if (!container && dropdown && dropdown.style.display === 'block') {
                dropdown.style.display = 'none';
            }
        });

        // Export to Excel using SheetJS
        async function exportToExcel() {
            const exportData = getExportData();

            // Log export data for debugging
            const rowCount = exportData.length - 1; // Minus header row
            console.log(`[EXPORT] Exporting ${rowCount} rows (including header: ${exportData.length} total)`);

            if (exportData.length <= 1) {
                alert('No data to export');
                return;
            }

            console.log(`[EXPORT] Starting Excel export with ${rowCount} invoice line items`);

            // Create a new workbook using ExcelJS
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Invoice Data');

            // Get headers and data rows
            const headers = exportData[0];
            const dataRows = exportData.slice(1);

            // Add all data (headers + rows)
            worksheet.addRows(exportData);

            // Set column widths
            const colWidths = [25, 20, 20, 20, 20, 20, 15, 15, 12, 15, 20, 20, 12, 12, 12, 15, 50, 10, 12, 10, 15, 25, 12, 15, 15, 15, 15, 10, 15];
            worksheet.columns = colWidths.map((width, i) => ({
                width: width
            }));

            // Format header row with blue background and white text
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF4472C4' }
                };
            });
            headerRow.commit();

            // Add autofilter to make headers recognized
            const lastCol = String.fromCharCode(64 + headers.length);
            const lastRow = dataRows.length + 1;
            worksheet.autoFilter = `A1:${lastCol}${lastRow}`;

            // Generate filename with current date
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const filename = `Invoice_Export_${dateStr}.xlsx`;

            // Write the workbook and trigger download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);

            console.log('Excel file exported successfully');
        }

        // Update invoice number for all rows in the same contact+date group
        function updateInvoiceNumber(input, itemId) {
            const invoiceNumber = input.value.trim();
            const row = input.closest('tr');
            const contactName = row.getAttribute('data-contact');
            const invoiceDate = row.getAttribute('data-date');
            const groupKey = `${contactName}|${invoiceDate}`;

            // Find all rows in the same group
            const allRows = document.querySelectorAll('#exportTableBody tr[data-contact]');
            const groupRows = [];
            const groupItemIds = [];

            allRows.forEach(r => {
                const rContact = r.getAttribute('data-contact');
                const rDate = r.getAttribute('data-date');
                const rKey = `${rContact}|${rDate}`;
                if (rKey === groupKey) {
                    groupRows.push(r);
                    groupItemIds.push(r.getAttribute('data-item-id'));
                }
            });

            // Update UI for all rows in the group
            groupRows.forEach(r => {
                const statusBadge = r.querySelector('[data-status-badge]');
                const invoiceDisplay = r.querySelector('[data-invoice-display]');

                if (invoiceNumber) {
                    r.classList.add('invoiced');
                    if (statusBadge) {
                        statusBadge.className = 'status-badge status-invoiced';
                        statusBadge.textContent = 'Invoiced';
                    }
                    r.setAttribute('data-reference', invoiceNumber);
                    // Update display text for non-input rows
                    if (invoiceDisplay) {
                        invoiceDisplay.textContent = invoiceNumber;
                    }
                } else {
                    r.classList.remove('invoiced');
                    if (statusBadge) {
                        statusBadge.className = 'status-badge status-pending';
                        statusBadge.textContent = 'Pending';
                    }
                    r.setAttribute('data-reference', '');
                    if (invoiceDisplay) {
                        invoiceDisplay.textContent = '';
                    }
                }
            });

            // Save to backend for all items in the group
            fetch(window.DJANGO_CONFIG.urls.updateInvoiceNumber, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.DJANGO_CONFIG.csrfToken
                },
                body: JSON.stringify({
                    item_id: itemId,
                    invoice_number: invoiceNumber,
                    group_item_ids: groupItemIds
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Invoice number updated for group');
                    input.style.borderColor = '#10b981';
                    setTimeout(() => {
                        input.style.borderColor = '';
                    }, 1000);
                } else {
                    console.error('Error updating invoice number:', data.error);
                    alert('Error saving invoice number: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error saving invoice number. Please try again.');
            });
        }

        // Calculate unique stats
        function calculateUniqueStats() {
            const rows = document.querySelectorAll('#exportTableBody tr[data-reference]');
            const uniqueInvoices = new Set();
            const uniqueClients = new Set();

            rows.forEach(row => {
                const ref = row.getAttribute('data-reference');
                const client = row.getAttribute('data-contact');
                if (ref) uniqueInvoices.add(ref);
                if (client) uniqueClients.add(client);
            });

            document.getElementById('uniqueInspections').textContent = uniqueInvoices.size;
            document.getElementById('uniqueClients').textContent = uniqueClients.size;
        }

        // Optimized initialization with batch processing
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize DOM cache first
            DOM.init();

            // Set default date filters to yesterday to today
            const defaultStartDate = window.DJANGO_CONFIG.defaultStartDate;
            const defaultEndDate = window.DJANGO_CONFIG.defaultEndDate;
            if (defaultStartDate && defaultEndDate && DOM.filters.dateFrom && DOM.filters.dateTo) {
                // Set date from to yesterday
                DOM.filters.dateFrom.value = defaultStartDate;

                // Set date to to today
                DOM.filters.dateTo.value = defaultEndDate;
            }

            // Initialize month filter handler
            handleMonthFilter();

            // Detect if current dates match a month filter and set dropdown accordingly
            if (DOM.filters.dateFrom && DOM.filters.dateTo) {
                const dateFrom = DOM.filters.dateFrom.value;
                const dateTo = DOM.filters.dateTo.value;

                if (dateFrom && dateTo) {
                    // Check if dateFrom is the 1st of a month
                    const fromParts = dateFrom.split('-');
                    if (fromParts.length === 3 && fromParts[2] === '01') {
                        const year = fromParts[0];
                        const month = fromParts[1];

                        // Check if dateTo is the last day of the same month
                        const lastDay = new Date(year, month, 0).getDate();
                        const expectedDateTo = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

                        if (dateTo === expectedDateTo) {
                            // This is a month filter! Set the dropdown
                            const monthSelect = document.getElementById('monthFilter');
                            const monthValue = `${year}-${month}`;
                            if (monthSelect) {
                                monthSelect.value = monthValue;
                            }
                        }
                    }
                }
            }

            // Use requestAnimationFrame for smooth loading
            requestAnimationFrame(() => {
                // Get all rows once
                const rows = document.querySelectorAll('#exportTableBody tr[data-contact]');
                const groups = new Map();
                const years = new Set();
                const rowCount = rows.length;

                // Batch process rows for better performance
                const BATCH_SIZE = 100;
                let currentIndex = 0;

                function processBatch() {
                    const endIndex = Math.min(currentIndex + BATCH_SIZE, rowCount);

                    // Process batch
                    for (let i = currentIndex; i < endIndex; i++) {
                        const row = rows[i];
                        const contactName = row.getAttribute('data-contact');
                        const invoiceDate = row.getAttribute('data-date');
                        const groupKey = `${contactName}|${invoiceDate}`;

                        if (!groups.has(groupKey)) {
                            groups.set(groupKey, []);
                        }
                        groups.get(groupKey).push(row);

                        // Collect years
                        if (invoiceDate) {
                            const parts = invoiceDate.split('/');
                            if (parts.length === 3) {
                                years.add(parts[2]);
                            }
                        }
                    }

                    currentIndex = endIndex;

                    // Continue processing or finalize
                    if (currentIndex < rowCount) {
                        requestAnimationFrame(processBatch);
                    } else {
                        finializeProcessing();
                    }
                }

                function finializeProcessing() {
                    // Process groups - show input only on first row (batch process)
                    const groupsArray = Array.from(groups.values());
                    let groupIndex = 0;

                    function processGroupBatch() {
                        const endGroupIndex = Math.min(groupIndex + 10, groupsArray.length);

                        for (let g = groupIndex; g < endGroupIndex; g++) {
                            const groupRows = groupsArray[g];
                            for (let i = 1; i < groupRows.length; i++) {
                                const row = groupRows[i];
                                const inputCell = row.querySelector('td:nth-last-child(2)');
                                const input = inputCell?.querySelector('input[data-invoice-input]');

                                if (input) {
                                    const textSpan = document.createElement('span');
                                    textSpan.setAttribute('data-invoice-display', '');
                                    textSpan.textContent = input.value;
                                    textSpan.style.cssText = 'display: inline-block; width: 140px; padding: 4px 8px; font-size: 0.65rem;';
                                    input.replaceWith(textSpan);
                                }
                            }
                        }

                        groupIndex = endGroupIndex;

                        if (groupIndex < groupsArray.length) {
                            requestAnimationFrame(processGroupBatch);
                        } else {
                            setupEventListeners();
                        }
                    }

                    processGroupBatch();
                }

                function setupEventListeners() {
                    // Create debounced filter function
                    const debouncedApplyFilters = debounce(applyFilters, 300);

                    // Add input event listener for client text search (with debounce)
                    const clientInput = DOM.filters.contactName;
                    if (clientInput) {
                        clientInput.addEventListener('input', debouncedApplyFilters);
                        clientInput.addEventListener('keypress', function(e) {
                            if (e.key === 'Enter') {
                                applyFilters();
                            }
                        });
                    }

                    // Add change event listeners for dropdown filters (instant filtering)
                    ['inspector', 'corporateGroup'].forEach(key => {
                        const select = DOM.filters[key];
                        if (select) {
                            select.addEventListener('change', applyFilters);
                        }
                    });

                    // Note: Date filters require clicking Apply button to reload page
                    // Client filter is text search with debounce
                    // Inspector and Corporate Group dropdowns apply instantly on change

                    // Auto-apply frontend filters on initial load (for non-date filters)
                    applyFilters();
                }

                // Start processing
                processBatch();
            });
        });

        // Excel-like Keyboard Navigation
        // Cell selection disabled per user request

        function initTableNavigation() {
            // Cell selection disabled
        }

        // Mobile Menu Toggle
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize table navigation
            initTableNavigation();

            // Pre-load fees for instant display when modal opens
            preloadFees();

            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebar-overlay');

            function toggleSidebar() {
                sidebar.classList.toggle('show');
                sidebarOverlay.classList.toggle('show');

                const icon = mobileMenuBtn.querySelector('i');
                if (sidebar.classList.contains('show')) {
                    icon.className = 'fas fa-times text-xl';
                } else {
                    icon.className = 'fas fa-bars text-xl';
                }
            }

            if (mobileMenuBtn) {
                mobileMenuBtn.addEventListener('click', toggleSidebar);
            }

            if (sidebarOverlay) {
                sidebarOverlay.addEventListener('click', toggleSidebar);
            }

            const navLinks = sidebar.querySelectorAll('a');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth <= 1024) {
                        toggleSidebar();
                    }
                });
            });

            window.addEventListener('resize', function() {
                if (window.innerWidth > 1024) {
                    sidebar.classList.remove('show');
                    sidebarOverlay.classList.remove('show');
                    const icon = mobileMenuBtn.querySelector('i');
                    icon.className = 'fas fa-bars text-xl';
                }
            });
        });

        // Manage Fees Modal Functions
        let currentFees = [];
        let feesLoaded = false;

        // Pre-load fees when page loads for instant display
        function preloadFees() {
            fetch('/api/fees/get/')
                .then(response => response.json())
                .then(data => {
                    currentFees = data.fees;
                    feesLoaded = true;
                })
                .catch(error => {
                    console.error('Error preloading fees:', error);
                    feesLoaded = false;
                });
        }

        function showManageFeesModal() {
            const modal = document.getElementById('manageFeesModal');
            if (modal) {
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';

                // Display cached fees immediately if already loaded
                if (feesLoaded && currentFees.length > 0) {
                    displayFees(currentFees);
                } else {
                    // If not preloaded yet, load now
                    loadFees();
                }
            }
        }

        function closeManageFeesModal() {
            const modal = document.getElementById('manageFeesModal');
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        }

        function loadFees() {
            const feesList = document.getElementById('fees-list');
            if (feesList) {
                feesList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light, #666); font-size: 0.875rem;"><i class="fas fa-spinner fa-spin"></i> Loading fees...</p>';
            }

            fetch('/api/fees/get/')
                .then(response => response.json())
                .then(data => {
                    currentFees = data.fees;
                    feesLoaded = true;
                    displayFees(currentFees);
                })
                .catch(error => {
                    console.error('Error loading fees:', error);
                    if (feesList) {
                        feesList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #ef4444; font-size: 0.875rem;"><i class="fas fa-exclamation-triangle"></i> Failed to load fees</p>';
                    }
                });
        }

        function displayFees(fees) {
            const feesList = document.getElementById('fees-list');
            if (!feesList) return;

            if (fees.length === 0) {
                feesList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light, #666); font-size: 0.875rem;">No fees found. Please run migrations and populate default fees.</p>';
                return;
            }

            const today = new Date();
            const todayISO = today.toISOString().split('T')[0];
            const todayFormatted = today.toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            const headerBg = isDarkMode ? '#2a2a2a' : '#f9fafb';
            const headerBorder = isDarkMode ? '#404040' : '#e5e7eb';
            const textColor = isDarkMode ? '#e0e0e0' : '#374151';
            const subTextColor = isDarkMode ? '#9ca3af' : '#6b7280';
            const rowHoverBg = isDarkMode ? 'rgba(0, 115, 135, 0.08)' : 'rgba(0, 115, 135, 0.04)';

            // Categorize fees
            const categories = {
                inspection: {
                    title: 'Inspection Fees',
                    fees: fees.filter(f => f.fee_code.includes('inspection') && !f.fee_code.includes('_rate'))
                },
                travel: {
                    title: 'Travel & Time',
                    fees: fees.filter(f => f.fee_code.includes('_rate'))
                },
                lab: {
                    title: 'Laboratory Tests',
                    fees: fees.filter(f => f.fee_code.includes('lab_test'))
                },
                other: {
                    title: 'Other Fees',
                    fees: fees.filter(f => !f.fee_code.includes('inspection') && !f.fee_code.includes('_rate') && !f.fee_code.includes('lab_test'))
                }
            };

            let html = `
                <div style="padding: 1rem 1.25rem; background: ${headerBg}; border-bottom: 1px solid ${headerBorder};">
                    <div style="margin-bottom: 0.5rem;">
                        <div style="font-weight: 600; font-size: 0.8125rem; color: ${textColor}; margin-bottom: 0.375rem;">
                            Effective Date for Changes:
                        </div>
                        <div style="display: inline-block; padding: 0.375rem 0.75rem; background: var(--primary); color: white; border-radius: 5px; font-size: 0.8125rem; font-weight: 500;">
                            ${todayFormatted} (Today)
                        </div>
                        <input type="hidden" id="effective-date-input" value="${todayISO}" />
                    </div>
                    <p style="font-size: 0.75rem; color: ${subTextColor}; margin: 0; line-height: 1.4;">
                        Fee changes will apply from today onwards. Past inspections will use historical rates.
                    </p>
                </div>
            `;

            // Display categories in 2x2 grid
            html += `<div class="fee-grid">`;

            Object.entries(categories).forEach(([key, category]) => {
                if (category.fees.length === 0) return;

                html += `
                    <div style="border: 1px solid ${headerBorder}; border-radius: 8px; background: var(--card-bg); overflow: hidden;">
                        <div style="padding: 0.75rem 1rem; border-bottom: 2px solid ${headerBorder};">
                            <h3 style="font-size: 0.875rem; font-weight: 700; color: ${textColor}; margin: 0;">
                                ${category.title}
                            </h3>
                        </div>
                        <div style="padding: 0.75rem;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem;">
                                <thead>
                                    <tr style="border-bottom: 2px solid ${headerBorder};">
                                        <th style="text-align: left; padding: 0.5rem; color: ${textColor}; font-weight: 600;">Fee Name</th>
                                        <th style="text-align: center; padding: 0.5rem; color: ${textColor}; font-weight: 600; width: 100px;">Since</th>
                                        <th style="text-align: center; padding: 0.5rem; color: ${textColor}; font-weight: 600; width: 60px;">History</th>
                                        <th style="text-align: right; padding: 0.5rem; color: ${textColor}; font-weight: 600; width: 120px;">Rate (R)</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                category.fees.forEach((fee, index) => {
                    const effectiveDate = fee.effective_date
                        ? new Date(fee.effective_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
                        : 'N/A';

                    const historyCount = fee.has_history
                        ? `<span style="color: ${subTextColor}; cursor: help;" title="This fee has ${fee.history_count} historical version(s)">${fee.history_count}</span>`
                        : `<span style="color: ${headerBorder};">-</span>`;

                    html += `
                        <tr style="border-bottom: 1px solid ${headerBorder}; transition: background 0.15s ease;"
                            onmouseenter="this.style.background='${rowHoverBg}'"
                            onmouseleave="this.style.background='transparent'">
                            <td style="padding: 0.625rem 0.5rem; color: ${textColor}; font-weight: 500;">${fee.fee_name}</td>
                            <td style="padding: 0.625rem 0.5rem; text-align: center; color: ${subTextColor}; font-size: 0.75rem;">${effectiveDate}</td>
                            <td style="padding: 0.625rem 0.5rem; text-align: center; font-size: 0.75rem;">${historyCount}</td>
                            <td style="padding: 0.625rem 0.5rem; text-align: right;">
                                <div style="display: inline-flex; align-items: center; gap: 0.375rem;">
                                    <span style="font-weight: 600; color: ${textColor};">R</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value="${fee.rate}"
                                        data-fee-id="${fee.id}"
                                        data-original-rate="${fee.rate}"
                                        data-border-color="${headerBorder}"
                                        class="fee-rate-input"
                                        style="width: 85px; padding: 0.375rem 0.5rem; font-size: 0.8125rem; border: 1px solid ${headerBorder}; border-radius: 5px; background: var(--card-bg); color: var(--text); transition: all 0.2s ease; text-align: right;"
                                        onfocus="this.style.borderColor='var(--primary)'; this.style.boxShadow='0 0 0 2px rgba(0, 120, 144, 0.1)';"
                                        onblur="this.style.borderColor=this.getAttribute('data-border-color'); this.style.boxShadow='none';"
                                    />
                                </div>
                            </td>
                        </tr>
                    `;
                });

                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;

            feesList.innerHTML = html;
        }

        function saveAllFees() {
            const feeInputs = document.querySelectorAll('.fee-rate-input');
            const effectiveDateInput = document.getElementById('effective-date-input');
            const effectiveDate = effectiveDateInput ? effectiveDateInput.value : null;
            const updatedFees = [];

            feeInputs.forEach(input => {
                const feeId = input.getAttribute('data-fee-id');
                const newRate = parseFloat(input.value);
                const originalRate = parseFloat(input.getAttribute('data-original-rate'));

                if (feeId && !isNaN(newRate) && newRate !== originalRate) {
                    updatedFees.push({
                        id: parseInt(feeId),
                        rate: newRate
                    });
                }
            });

            if (updatedFees.length === 0) {
                alert('No fees have been modified. Make changes to fees before saving.');
                return;
            }

            if (!effectiveDate) {
                alert('Please select an effective date for the fee changes.');
                return;
            }

            const confirmMessage = `You are about to update ${updatedFees.length} fee(s) with an effective date of ${effectiveDate}.\n\nThis will create new fee history records. Continue?`;
            if (!confirm(confirmMessage)) {
                return;
            }

            fetch('/api/fees/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    fees: updatedFees,
                    effective_date: effectiveDate
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        let message = `Successfully updated ${data.updated_count} fees!`;
                        if (data.effective_date) {
                            message += `\nEffective date: ${data.effective_date}`;
                        }
                        if (data.warnings && data.warnings.length > 0) {
                            message += '\n\nWarnings:\n' + data.warnings.join('\n');
                        }
                        alert(message);
                        loadFees();

                        // Refresh fee history if the modal is open
                        const historyModal = document.getElementById('feeHistoryModal');
                        if (historyModal && historyModal.classList.contains('show')) {
                            loadFeeHistory();
                        }
                    } else {
                        alert('Error updating fees: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error saving fees:', error);
                    alert('Failed to save fees. Please try again.');
                });
        }

        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }

        // Fee History Modal Functions
        function showFeeHistory() {
            const modal = document.getElementById('feeHistoryModal');
            if (modal) {
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
                loadFeeHistory();
            }
        }

        function closeFeeHistoryModal() {
            const modal = document.getElementById('feeHistoryModal');
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        }

        function loadFeeHistory() {
            const historyList = document.getElementById('fee-history-list');
            if (!historyList) return;

            historyList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text); font-size: 0.875rem;">Loading fee history...</p>';

            fetch('/api/fees/history/')
                .then(response => response.json())
                .then(data => {
                    displayFeeHistory(data.history);
                })
                .catch(error => {
                    console.error('Error loading fee history:', error);
                    historyList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #ef4444; font-size: 0.875rem;">Failed to load fee history. Please try again.</p>';
                });
        }

        function displayFeeHistory(history) {
            const historyList = document.getElementById('fee-history-list');
            if (!historyList) return;

            if (!history || history.length === 0) {
                const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                const textColor = isDarkMode ? '#9ca3af' : '#6b7280';
                const bgColor = isDarkMode ? '#1f1f1f' : '#f9fafb';

                historyList.innerHTML = `
                    <div style="text-align: center; padding: 3rem 2rem; background: ${bgColor};">
                        <i class="fas fa-history" style="font-size: 3rem; color: ${textColor}; opacity: 0.3; margin-bottom: 1rem;"></i>
                        <p style="color: ${textColor}; font-size: 0.9375rem; font-weight: 500; margin: 0;">No Fee Change History</p>
                        <p style="color: ${textColor}; font-size: 0.8125rem; margin: 0.5rem 0 0 0; opacity: 0.8;">Fee changes will appear here once you update any inspection fees.</p>
                    </div>
                `;
                return;
            }

            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            const headerBg = isDarkMode ? '#2a2a2a' : '#f9fafb';
            const headerBorder = isDarkMode ? '#404040' : '#e5e7eb';
            const textColor = isDarkMode ? '#e0e0e0' : '#374151';
            const subTextColor = isDarkMode ? '#9ca3af' : '#6b7280';

            // Group history by fee name
            const groupedHistory = {};
            history.forEach(record => {
                if (!groupedHistory[record.fee_name]) {
                    groupedHistory[record.fee_name] = [];
                }
                groupedHistory[record.fee_name].push(record);
            });

            let html = `
                <div style="padding: 1rem 1.25rem; background: ${headerBg}; border-bottom: 1px solid ${headerBorder};">
                    <p style="font-size: 0.8125rem; color: ${textColor}; margin: 0;">
                        Complete history of all fee changes, showing what changed and when.
                    </p>
                </div>
            `;

            // Display each fee's history as one block
            Object.entries(groupedHistory).forEach(([feeName, records]) => {
                html += `
                    <div style="padding: 1rem 1.25rem; border-bottom: 2px solid ${headerBorder}; background: var(--card-bg);">
                        <div style="font-weight: 600; font-size: 0.9375rem; color: ${textColor}; margin-bottom: 0.75rem;">
                            ${feeName}
                        </div>
                `;

                // Display all changes for this fee
                records.forEach((record, index) => {
                    const isInitialRate = record.previous_rate === null;

                    // For initial rates, show "Beginning" instead of date
                    const dateDisplay = isInitialRate
                        ? 'Beginning'
                        : new Date(record.effective_date + 'T12:00:00').toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });

                    const time = new Date(record.created_at).toLocaleTimeString('en-ZA', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const changeType = isInitialRate ? 'Initial Rate' : 'Rate Change';
                    const changeColor = isInitialRate ? '#10b981' : '#f59e0b';

                    let changeText = '';
                    if (!isInitialRate) {
                        const diff = record.rate - record.previous_rate;
                        const diffText = diff > 0 ? `+R${diff.toFixed(2)}` : `R${diff.toFixed(2)}`;
                        const diffColor = diff > 0 ? '#ef4444' : '#10b981';
                        changeText = `<span style="color: ${diffColor}; font-weight: 600;">${diffText}</span> (R${record.previous_rate.toFixed(2)} → R${record.rate.toFixed(2)})`;
                    } else {
                        changeText = `<span style="font-weight: 600;">R${record.rate.toFixed(2)}</span>`;
                    }

                    const borderTop = index > 0 ? `border-top: 1px solid ${headerBorder}; padding-top: 0.75rem; margin-top: 0.75rem;` : '';

                    html += `
                        <div style="${borderTop}">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="flex: 1;">
                                    <div style="font-size: 0.8125rem; color: ${textColor}; margin-bottom: 0.25rem;">
                                        <strong>${isInitialRate ? '' : 'Effective: '}${dateDisplay}</strong>
                                    </div>
                                    <div style="font-size: 0.8125rem; color: ${textColor};">
                                        ${changeText}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <span style="display: inline-block; padding: 0.25rem 0.625rem; background: ${changeColor}; color: white; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-bottom: 0.25rem;">
                                        ${changeType}
                                    </span>
                                    ${!isInitialRate ? `<div style="font-size: 0.7rem; color: ${subTextColor};">${time}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += `</div>`;
            });

            historyList.innerHTML = html;
        }
