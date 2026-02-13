// Theme management - compatible with settings page
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

initTheme();

window.addEventListener('storage', function(e) {
    if (e.key === 'theme') {
        document.documentElement.setAttribute('data-theme', e.newValue || 'light');
    }
});

// Load background image after page loads
window.addEventListener('load', function() {
    document.body.classList.add('bg-loaded');
});

// ================================================================
// COMMODITY COLOR MAP
// ================================================================
const COMMODITY_COLORS = {
    'EGG': '#f59e0b',
    'EGGS': '#f59e0b',
    'PMP': '#3b82f6',
    'POULTRY': '#10b981',
    'RAW': '#ef4444',
};
const DEFAULT_COLOR = '#6b7280';
const CHART_PALETTE = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function getCommodityColor(commodity) {
    if (!commodity) return DEFAULT_COLOR;
    return COMMODITY_COLORS[commodity.toUpperCase()] || DEFAULT_COLOR;
}

function getCommodityCSSClass(commodity) {
    if (!commodity) return 'commodity-default';
    const key = commodity.toUpperCase();
    if (key === 'EGG' || key === 'EGGS') return 'commodity-egg';
    if (key === 'PMP') return 'commodity-pmp';
    if (key === 'POULTRY') return 'commodity-poultry';
    if (key === 'RAW') return 'commodity-raw';
    return 'commodity-default';
}

// ================================================================
// CHART INSTANCES (for cleanup on re-render)
// ================================================================
let chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

function getChartTextColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? '#b0b0b0' : '#6b7280';
}

function getChartGridColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
}

// ================================================================
// DASHBOARD DATA & STATE
// ================================================================
let dashboardData = {};
let currentPage = 1;
const ROWS_PER_PAGE = 25;

function loadInitialData() {
    const cfg = window.DJANGO_CONFIG;
    dashboardData = {
        totalInspections: cfg.totalInspections,
        complianceRate: cfg.complianceRate,
        activeInspectors: cfg.activeInspectors,
        daysWorked: cfg.daysWorked,
        totalHours: cfg.hoursAnalysis ? parseFloat(cfg.hoursAnalysis.total_hours || 0) : 0,
        avgHours: cfg.hoursAnalysis ? parseFloat(cfg.hoursAnalysis.avg_hours || 0) : 0,
        complianceByCommodity: cfg.complianceByCommodity || [],
        commodityAnalysis: cfg.commodityAnalysis || [],
        samplesByCommodity: cfg.samplesByCommodity || [],
        facilityTypeDistribution: cfg.facilityTypeDistribution || [],
        monthlyCommodityTrends: cfg.monthlyCommodityTrends || [],
        monthlyComplianceTrend: cfg.monthlyComplianceTrend || [],
        timeAllocation: cfg.timeAllocation || [],
        inspectionsList: cfg.inspectionsList || [],
        inspectorPerformance: cfg.inspectorPerformance || [],
        // Inspector metrics
        occurrenceReports: cfg.occurrenceReports || [],
        totalOccurrenceReports: cfg.totalOccurrenceReports || 0,
        directionsPerInspector: cfg.directionsPerInspector || [],
        travelPerInspector: cfg.travelPerInspector || [],
        inspectorCommodityMatrix: cfg.inspectorCommodityMatrix || [],
        approvalPerInspector: cfg.approvalPerInspector || [],
    };
}

// ================================================================
// FILTER SYSTEM
// ================================================================
function populateFilterOptions() {
    const opts = window.DJANGO_CONFIG.filterOptions || {};

    const yearSelect = document.getElementById('filterYear');
    if (yearSelect && opts.years) {
        opts.years.forEach(function(y) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        });
    }

    const inspectorSelect = document.getElementById('filterInspector');
    if (inspectorSelect && opts.inspectors) {
        opts.inspectors.forEach(function(name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inspectorSelect.appendChild(opt);
        });
    }

    const commoditySelect = document.getElementById('filterCommodity');
    if (commoditySelect && opts.commodities) {
        opts.commodities.forEach(function(c) {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            commoditySelect.appendChild(opt);
        });
    }
}

function getFilterValues() {
    return {
        year: document.getElementById('filterYear').value,
        month: document.getElementById('filterMonth').value,
        inspector: document.getElementById('filterInspector').value,
        commodity: document.getElementById('filterCommodity').value,
    };
}

function isFiltered() {
    const f = getFilterValues();
    return f.year !== 'all' || f.month !== 'all' || f.inspector !== 'all' || f.commodity !== 'all';
}

async function applyFilters() {
    if (!isFiltered()) {
        loadInitialData();
        currentPage = 1;
        renderAll();
        return;
    }

    const f = getFilterValues();
    const params = new URLSearchParams();
    if (f.year !== 'all') params.set('year', f.year);
    if (f.month !== 'all') params.set('month', f.month);
    if (f.inspector !== 'all') params.set('inspector', f.inspector);
    if (f.commodity !== 'all') params.set('commodity', f.commodity);

    try {
        const resp = await fetch(window.DJANGO_CONFIG.apiUrl + '?' + params.toString());
        if (!resp.ok) throw new Error('API error');
        const data = await resp.json();

        dashboardData = {
            totalInspections: data.totalInspections,
            complianceRate: data.complianceRate,
            activeInspectors: data.activeInspectors,
            daysWorked: data.daysWorked,
            totalHours: parseFloat(data.totalHours || 0),
            avgHours: parseFloat(data.avgHours || 0),
            complianceByCommodity: data.complianceByCommodity || [],
            commodityAnalysis: data.commodityAnalysis || [],
            samplesByCommodity: data.samplesByCommodity || [],
            facilityTypeDistribution: data.facilityTypeDistribution || [],
            monthlyCommodityTrends: data.monthlyCommodityTrends || [],
            monthlyComplianceTrend: data.monthlyComplianceTrend || [],
            timeAllocation: data.timeAllocation || [],
            inspectionsList: data.inspectionsList || [],
            inspectorPerformance: data.inspectorPerformance || [],
            // Inspector metrics
            occurrenceReports: data.occurrenceReports || [],
            totalOccurrenceReports: data.totalOccurrenceReports || 0,
            directionsPerInspector: data.directionsPerInspector || [],
            travelPerInspector: data.travelPerInspector || [],
            inspectorCommodityMatrix: data.inspectorCommodityMatrix || [],
            approvalPerInspector: data.approvalPerInspector || [],
        };
        currentPage = 1;
        renderAll();
    } catch (err) {
        console.error('Filter API error:', err);
    }
}

function resetFilters() {
    document.getElementById('filterYear').value = 'all';
    document.getElementById('filterMonth').value = 'all';
    document.getElementById('filterInspector').value = 'all';
    document.getElementById('filterCommodity').value = 'all';
    loadInitialData();
    currentPage = 1;
    renderAll();
}

// ================================================================
// RENDER: KPI CARDS
// ================================================================
function renderKPIs() {
    const d = dashboardData;
    document.getElementById('kpiTotalInspections').textContent = (d.totalInspections || 0).toLocaleString();
    document.getElementById('kpiComplianceRate').textContent = (d.complianceRate || 0).toFixed(1) + '%';
    document.getElementById('kpiDaysWorked').textContent = (d.daysWorked || 0).toLocaleString();
    document.getElementById('kpiActiveInspectors').textContent = d.activeInspectors || 0;

    // Efficiency tiles
    document.getElementById('effDaysWorked').textContent = (d.daysWorked || 0).toLocaleString();
    const avgPerDay = d.daysWorked > 0 ? (d.totalInspections / d.daysWorked).toFixed(1) : '-';
    document.getElementById('effAvgPerDay').textContent = avgPerDay;
    document.getElementById('effTotalHours').textContent = d.totalHours ? d.totalHours.toFixed(0) : '-';
    const avgHoursPerDay = d.daysWorked > 0 && d.totalHours ? (d.totalHours / d.daysWorked).toFixed(1) : '-';
    document.getElementById('effAvgHours').textContent = avgHoursPerDay;
}

// ================================================================
// RENDER: COMPLIANCE BARS
// ================================================================
function renderComplianceBars() {
    const container = document.getElementById('complianceBarsContainer');
    if (!container) return;

    const items = dashboardData.complianceByCommodity || [];
    if (items.length === 0) {
        container.innerHTML = '<div class="no-data"><p>No compliance data available</p></div>';
        return;
    }

    let html = '';
    items.forEach(function(item) {
        const commodity = item.commodity || 'Unknown';
        const rate = item.compliance_rate || 0;
        const total = item.total || 0;
        const cssClass = getCommodityCSSClass(commodity);

        html += '<div class="compliance-bar-row">' +
            '<div class="compliance-bar-label">' + commodity + '</div>' +
            '<div class="compliance-bar-track">' +
                '<div class="compliance-bar-fill ' + cssClass + '" style="width: ' + Math.max(rate, 3) + '%;">' +
                    '<span class="compliance-bar-pct">' + rate.toFixed(1) + '%</span>' +
                '</div>' +
            '</div>' +
            '<div class="compliance-bar-count">' + total + '</div>' +
        '</div>';
    });

    container.innerHTML = html;
}

// ================================================================
// RENDER: COMMODITY COUNT DOUGHNUT
// ================================================================
function renderCommodityCountChart() {
    destroyChart('commodityCountChart');
    const canvas = document.getElementById('commodityCountChart');
    if (!canvas) return;

    const items = dashboardData.commodityAnalysis || [];
    if (items.length === 0) return;

    const labels = items.map(function(i) { return i.commodity || 'Unknown'; });
    const data = items.map(function(i) { return i.total_inspections || 0; });
    const colors = labels.map(function(l) { return getCommodityColor(l); });

    chartInstances['commodityCountChart'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2d2d' : '#ffffff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: getChartTextColor(), padding: 12, font: { size: 11 } }
                }
            },
            cutout: '55%'
        }
    });
}

// ================================================================
// RENDER: TIME ALLOCATION (horizontal bar)
// ================================================================
function renderTimeAllocationChart() {
    destroyChart('timeAllocationChart');
    const canvas = document.getElementById('timeAllocationChart');
    if (!canvas) return;

    const items = dashboardData.timeAllocation || [];
    if (items.length === 0) return;

    const labels = items.map(function(i) { return i.inspector_name || 'Unknown'; });
    const data = items.map(function(i) { return parseFloat(i.total_hours || 0); });

    chartInstances['timeAllocationChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours',
                data: data,
                backgroundColor: '#007890',
                borderRadius: 3,
                barThickness: 16,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: getChartGridColor() },
                    ticks: { color: getChartTextColor(), font: { size: 10 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: getChartTextColor(), font: { size: 10 } }
                }
            }
        }
    });
}

// ================================================================
// RENDER: INSPECTIONS TABLE WITH PAGINATION
// ================================================================
function renderInspectionsTable() {
    const tbody = document.getElementById('inspectionsTableBody');
    const pagination = document.getElementById('tablePagination');
    const pageInfo = document.getElementById('tablePageInfo');
    if (!tbody) return;

    const items = dashboardData.inspectionsList || [];
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ROWS_PER_PAGE));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = Math.min(start + ROWS_PER_PAGE, totalItems);
    const pageItems = items.slice(start, end);

    // Render rows
    let html = '';
    if (pageItems.length === 0) {
        html = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">No inspections found</td></tr>';
    } else {
        pageItems.forEach(function(row) {
            const date = row.date_of_inspection || '-';
            const inspector = row.inspector_name || '-';
            const client = row.client_name || '-';
            const commodity = row.commodity || '-';
            const facility = row.facility_type || '-';
            const sample = row.is_sample_taken;
            const status = row.approved_status || 'PENDING';

            const commodityBadgeClass = getCommodityCSSClass(commodity);
            const statusClass = status === 'APPROVED' ? 'status-approved' : 'status-pending';
            const statusLabel = status === 'APPROVED' ? 'Approved' : 'Pending';
            const sampleClass = sample ? 'sample-yes' : 'sample-no';
            const sampleText = sample ? 'Yes' : 'No';

            html += '<tr>' +
                '<td>' + date + '</td>' +
                '<td>' + inspector + '</td>' +
                '<td>' + client + '</td>' +
                '<td><span class="commodity-badge ' + commodityBadgeClass + '">' + commodity + '</span></td>' +
                '<td>' + facility + '</td>' +
                '<td><span class="' + sampleClass + '">' + sampleText + '</span></td>' +
                '<td><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
            '</tr>';
        });
    }
    tbody.innerHTML = html;

    // Page info
    if (pageInfo) {
        pageInfo.textContent = totalItems > 0
            ? 'Showing ' + (start + 1) + '-' + end + ' of ' + totalItems
            : '';
    }

    // Pagination controls
    if (pagination) {
        let pHtml = '';
        if (totalPages > 1) {
            pHtml += '<button ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')">Prev</button>';

            const maxButtons = 7;
            let startPage = Math.max(1, currentPage - 3);
            let endPage = Math.min(totalPages, startPage + maxButtons - 1);
            if (endPage - startPage < maxButtons - 1) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }

            for (let p = startPage; p <= endPage; p++) {
                pHtml += '<button class="' + (p === currentPage ? 'active' : '') + '" onclick="goToPage(' + p + ')">' + p + '</button>';
            }

            pHtml += '<button ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')">Next</button>';
        }
        pagination.innerHTML = pHtml;
    }
}

window.goToPage = function(page) {
    currentPage = page;
    renderInspectionsTable();
};

// ================================================================
// RENDER: COMMODITY TREND (multi-line chart)
// ================================================================
function renderCommodityTrendChart() {
    destroyChart('commodityTrendChart');
    const canvas = document.getElementById('commodityTrendChart');
    if (!canvas) return;

    const trends = dashboardData.monthlyCommodityTrends || [];
    if (trends.length === 0) return;

    // Group by commodity
    const commodityMap = {};
    const monthSet = new Set();

    trends.forEach(function(item) {
        const month = item.month ? item.month.substring(0, 7) : 'Unknown';
        const commodity = item.commodity || 'Unknown';
        monthSet.add(month);
        if (!commodityMap[commodity]) commodityMap[commodity] = {};
        commodityMap[commodity][month] = item.count || 0;
    });

    const months = Array.from(monthSet).sort();
    const datasets = [];

    Object.keys(commodityMap).forEach(function(commodity, idx) {
        datasets.push({
            label: commodity,
            data: months.map(function(m) { return commodityMap[commodity][m] || 0; }),
            borderColor: getCommodityColor(commodity) || CHART_PALETTE[idx % CHART_PALETTE.length],
            backgroundColor: 'transparent',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
        });
    });

    const monthLabels = months.map(function(m) {
        const parts = m.split('-');
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return monthNames[parseInt(parts[1]) - 1] + ' ' + parts[0].substring(2);
    });

    chartInstances['commodityTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: { labels: monthLabels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: getChartTextColor(), padding: 10, font: { size: 11 } }
                }
            },
            scales: {
                x: {
                    grid: { color: getChartGridColor() },
                    ticks: { color: getChartTextColor(), font: { size: 10 } }
                },
                y: {
                    grid: { color: getChartGridColor() },
                    ticks: { color: getChartTextColor(), font: { size: 10 } },
                    beginAtZero: true
                }
            }
        }
    });
}

// ================================================================
// RENDER: SAMPLES TAKEN PIE
// ================================================================
function renderSamplesTakenChart() {
    destroyChart('samplesTakenChart');
    const canvas = document.getElementById('samplesTakenChart');
    if (!canvas) return;

    const items = dashboardData.samplesByCommodity || [];
    if (items.length === 0) return;

    const labels = items.map(function(i) { return i.commodity || 'Unknown'; });
    const data = items.map(function(i) { return i.count || 0; });
    const colors = labels.map(function(l) { return getCommodityColor(l); });

    chartInstances['samplesTakenChart'] = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2d2d' : '#ffffff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: getChartTextColor(), padding: 8, font: { size: 10 } }
                }
            }
        }
    });
}

// ================================================================
// RENDER: FACILITY TYPES PIE
// ================================================================
function renderFacilityTypesChart() {
    destroyChart('facilityTypesChart');
    const canvas = document.getElementById('facilityTypesChart');
    if (!canvas) return;

    const items = dashboardData.facilityTypeDistribution || [];
    if (items.length === 0) return;

    const labels = items.map(function(i) { return i.facility_type || 'Unknown'; });
    const data = items.map(function(i) { return i.count || 0; });

    chartInstances['facilityTypesChart'] = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CHART_PALETTE.slice(0, labels.length),
                borderWidth: 2,
                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2d2d' : '#ffffff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: getChartTextColor(), padding: 8, font: { size: 10 } }
                }
            }
        }
    });
}

// ================================================================
// RENDER: COMPLIANCE TREND PER COMMODITY (multi-line chart)
// ================================================================
function renderComplianceTrendChart() {
    destroyChart('complianceTrendChart');
    var canvas = document.getElementById('complianceTrendChart');
    if (!canvas) return;

    var items = dashboardData.monthlyComplianceTrend || [];
    if (items.length === 0) return;

    var commodityColors = {
        'POULTRY': { border: '#f87171', bg: 'rgba(248,113,113,0.1)' },
        'EGG': { border: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
        'EGGS': { border: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
        'PMP': { border: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
        'RAW': { border: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
    };

    // Build: { commodity: { month: compliance_rate } }
    var commodityData = {};
    var monthsSet = new Set();
    items.forEach(function(item) {
        var comm = item.commodity;
        var monthStr = item.month;
        if (typeof monthStr === 'string') {
            monthStr = monthStr.substring(0, 7);
        } else if (monthStr && monthStr.getFullYear) {
            var m = monthStr.getMonth() + 1;
            monthStr = monthStr.getFullYear() + '-' + (m < 10 ? '0' + m : m);
        }
        monthsSet.add(monthStr);
        if (!commodityData[comm]) commodityData[comm] = {};
        commodityData[comm][monthStr] = item.compliance_rate;
    });

    var months = Array.from(monthsSet).sort();
    var labels = months.map(function(m) {
        var parts = m.split('-');
        var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return monthNames[parseInt(parts[1]) - 1] + ' ' + parts[0];
    });

    var datasets = [];
    Object.keys(commodityData).sort().forEach(function(comm) {
        var colors = commodityColors[comm] || { border: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
        datasets.push({
            label: comm,
            data: months.map(function(m) { return commodityData[comm][m] || null; }),
            borderColor: colors.border,
            backgroundColor: colors.bg,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: false,
            spanGaps: true
        });
    });

    chartInstances['complianceTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: getChartTextColor(), usePointStyle: true, pointStyle: 'circle', padding: 15, font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + (ctx.parsed.y !== null ? ctx.parsed.y.toFixed(2) + '%' : 'N/A');
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: getChartTextColor(), font: { size: 9 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 20 }
                },
                y: {
                    min: 0, max: 100,
                    grid: { color: getChartGridColor() },
                    ticks: {
                        color: getChartTextColor(),
                        font: { size: 10 },
                        callback: function(v) { return v + '%'; }
                    }
                }
            }
        }
    });
}

// ================================================================
// RENDER: DIRECTIONS & NON-COMPLIANCE PER INSPECTOR (stacked bar)
// ================================================================
function renderDirectionsChart() {
    destroyChart('directionsChart');
    const canvas = document.getElementById('directionsChart');
    if (!canvas) return;

    var items = dashboardData.directionsPerInspector || [];
    if (items.length === 0) return;

    // Add direction_rate
    items.forEach(function(item) {
        item.direction_rate = item.total > 0 ? ((item.directions / item.total) * 100).toFixed(1) : 0;
    });

    // Sort by total descending and take top 15
    items = items.sort(function(a, b) { return b.total - a.total; }).slice(0, 15);

    var labels = items.map(function(i) { return i.inspector_name; });
    var directionsData = items.map(function(i) { return i.directions || 0; });
    var nonCompliantData = items.map(function(i) { return i.non_compliant_products || 0; });
    var cleanData = items.map(function(i) { return i.total - (i.directions || 0); });

    chartInstances['directionsChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Directions Issued', data: directionsData, backgroundColor: '#ef4444', borderRadius: 2 },
                { label: 'Non-Compliant Products', data: nonCompliantData, backgroundColor: '#f59e0b', borderRadius: 2 },
                { label: 'Clean Inspections', data: cleanData, backgroundColor: '#10b981', borderRadius: 2 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: getChartTextColor(), font: { size: 10 } } }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: getChartTextColor(), font: { size: 9 }, maxRotation: 45 } },
                y: { stacked: true, grid: { color: getChartGridColor() }, ticks: { color: getChartTextColor(), font: { size: 10 } }, beginAtZero: true }
            }
        }
    });
}

// ================================================================
// RENDER: OCCURRENCE REPORTS (horizontal bar)
// ================================================================
function renderOccurrenceReportsChart() {
    destroyChart('occurrenceReportsChart');
    var canvas = document.getElementById('occurrenceReportsChart');
    if (!canvas) return;

    var items = dashboardData.occurrenceReports || [];
    if (items.length === 0) return;

    var labels = items.map(function(i) { return i.inspector_name; });
    var data = items.map(function(i) { return i.count || 0; });

    chartInstances['occurrenceReportsChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Occurrence Reports', data: data, backgroundColor: '#8b5cf6', borderRadius: 3, barThickness: 16 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: getChartGridColor() }, ticks: { color: getChartTextColor(), font: { size: 10 } } },
                y: { grid: { display: false }, ticks: { color: getChartTextColor(), font: { size: 10 } } }
            }
        }
    });
}

// ================================================================
// RENDER: TRAVEL DISTANCE PER INSPECTOR (horizontal bar)
// ================================================================
function renderTravelChart() {
    destroyChart('travelChart');
    var canvas = document.getElementById('travelChart');
    if (!canvas) return;

    var items = (dashboardData.travelPerInspector || []).filter(function(i) {
        return i.total_km && parseFloat(i.total_km) > 0;
    }).slice(0, 15);
    if (items.length === 0) return;

    var labels = items.map(function(i) { return i.inspector_name; });
    var data = items.map(function(i) { return parseFloat(i.total_km || 0); });

    chartInstances['travelChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'KM Traveled', data: data, backgroundColor: '#06b6d4', borderRadius: 3, barThickness: 16 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: getChartGridColor() }, ticks: { color: getChartTextColor(), font: { size: 10 } } },
                y: { grid: { display: false }, ticks: { color: getChartTextColor(), font: { size: 10 } } }
            }
        }
    });
}

// ================================================================
// RENDER: EFFICIENCY MATRIX TABLE (Inspector x Commodity)
// ================================================================
function renderEfficiencyMatrix() {
    var headerRow = document.getElementById('matrixHeader');
    var tbody = document.getElementById('matrixBody');
    if (!headerRow || !tbody) return;

    var items = dashboardData.inspectorCommodityMatrix || [];
    if (items.length === 0) {
        headerRow.innerHTML = '<th>No data</th>';
        tbody.innerHTML = '';
        return;
    }

    // Build matrix: inspector -> { commodity: count }
    var inspectors = {};
    var commodities = new Set();
    items.forEach(function(item) {
        var name = item.inspector_name;
        var comm = item.commodity;
        commodities.add(comm);
        if (!inspectors[name]) inspectors[name] = {};
        inspectors[name][comm] = item.count || 0;
    });

    var commodityList = Array.from(commodities).sort();

    // Header
    var hHtml = '<th style="position:sticky;left:0;background:var(--primary-light);z-index:1;">Inspector</th>';
    commodityList.forEach(function(c) {
        hHtml += '<th style="text-align:center;">' + c + '</th>';
    });
    hHtml += '<th style="text-align:center;font-weight:700;">Total</th>';
    headerRow.innerHTML = hHtml;

    // Body
    var bHtml = '';
    var inspectorNames = Object.keys(inspectors).sort();
    inspectorNames.forEach(function(name) {
        var total = 0;
        bHtml += '<tr><td style="position:sticky;left:0;background:var(--card-bg);z-index:1;font-weight:600;white-space:nowrap;">' + name + '</td>';
        commodityList.forEach(function(c) {
            var count = inspectors[name][c] || 0;
            total += count;
            var bgStyle = count > 0 ? 'background:rgba(0,120,144,0.08);' : '';
            bHtml += '<td style="text-align:center;' + bgStyle + '">' + (count || '-') + '</td>';
        });
        bHtml += '<td style="text-align:center;font-weight:700;">' + total + '</td></tr>';
    });
    tbody.innerHTML = bHtml;
}

// ================================================================
// RENDER: APPROVAL RATE PER INSPECTOR (bar chart)
// ================================================================
function renderApprovalRateChart() {
    destroyChart('approvalRateChart');
    var canvas = document.getElementById('approvalRateChart');
    if (!canvas) return;

    var items = dashboardData.approvalPerInspector || [];
    if (items.length === 0) return;

    // Add approval rate
    items.forEach(function(item) {
        item.approval_rate = item.total > 0 ? ((item.approved / item.total) * 100).toFixed(1) : 0;
    });

    items = items.sort(function(a, b) { return b.total - a.total; }).slice(0, 15);

    var labels = items.map(function(i) { return i.inspector_name; });
    var approvedData = items.map(function(i) { return i.approved || 0; });
    var pendingData = items.map(function(i) { return i.pending || 0; });

    chartInstances['approvalRateChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Approved', data: approvedData, backgroundColor: '#10b981', borderRadius: 2 },
                { label: 'Pending', data: pendingData, backgroundColor: '#f59e0b', borderRadius: 2 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: getChartTextColor(), font: { size: 10 } } }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: getChartTextColor(), font: { size: 9 }, maxRotation: 45 } },
                y: { stacked: true, grid: { color: getChartGridColor() }, ticks: { color: getChartTextColor(), font: { size: 10 } }, beginAtZero: true }
            }
        }
    });
}

// ================================================================
// RENDER ALL
// ================================================================
function renderAll() {
    renderKPIs();
    renderComplianceBars();
    renderComplianceTrendChart();
    renderCommodityCountChart();
    renderTimeAllocationChart();
    renderCommodityTrendChart();
    renderSamplesTakenChart();
    renderFacilityTypesChart();
    // Inspector metrics
    renderDirectionsChart();
    renderOccurrenceReportsChart();
    renderTravelChart();
    renderEfficiencyMatrix();
    renderApprovalRateChart();
}

// ================================================================
// EXTRACT REPORT (CSV)
// ================================================================
function extractReport() {
    const items = dashboardData.inspectionsList || [];
    if (items.length === 0) {
        alert('No data to export.');
        return;
    }

    const headers = ['Date', 'Inspector', 'Client', 'Commodity', 'Facility', 'Sample Taken', 'Status', 'Town'];
    const rows = items.map(function(row) {
        return [
            row.date_of_inspection || '',
            '"' + (row.inspector_name || '').replace(/"/g, '""') + '"',
            '"' + (row.client_name || '').replace(/"/g, '""') + '"',
            row.commodity || '',
            '"' + (row.facility_type || '').replace(/"/g, '""') + '"',
            row.is_sample_taken ? 'Yes' : 'No',
            row.approved_status || '',
            '"' + (row.town || '').replace(/"/g, '""') + '"',
        ].join(',');
    });

    const csv = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics_report_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ================================================================
// INITIALIZATION
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
    populateFilterOptions();
    renderAll();

    // Filter event listeners
    ['filterYear', 'filterMonth', 'filterInspector', 'filterCommodity'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFilters);
    });

    var resetBtn = document.getElementById('resetFilters');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    var extractBtn = document.getElementById('extractReport');
    if (extractBtn) extractBtn.addEventListener('click', extractReport);

    console.log('Inspector Analytics Dashboard initialized');
});

// ================================================================
// MOBILE MENU TOGGLE
// ================================================================
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

if (sidebar) {
    var navLinks = sidebar.querySelectorAll('a');
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 1024) {
                toggleSidebar();
            }
        });
    });
}

window.addEventListener('resize', function() {
    if (window.innerWidth > 1024) {
        if (sidebar) sidebar.classList.remove('show');
        if (sidebarOverlay) sidebarOverlay.classList.remove('show');
        if (mobileMenuBtn) {
            var icon = mobileMenuBtn.querySelector('i');
            icon.className = 'fas fa-bars text-xl';
        }
    }
});

// ================================================================
// NOTIFICATION SYSTEM
// ================================================================
if (window.DJANGO_CONFIG.userRole === 'super_admin' || window.DJANGO_CONFIG.userRole === 'developer') {

    async function fetchNotifications() {
        try {
            const response = await fetch('/api/notifications/');
            if (!response.ok) throw new Error('Failed to fetch notifications');
            const data = await response.json();
            updateNotificationBell(data.unread_count);
            return data.notifications;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }

    function updateNotificationBell(count) {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    async function showNotificationModal() {
        const notifications = await fetchNotifications();
        const modalHTML = '<div id="notification-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;">' +
            '<div style="background:white;border-radius:8px;width:90%;max-width:500px;max-height:80vh;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.3);">' +
                '<div style="padding:1rem 1.5rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">' +
                    '<h3 style="margin:0;font-size:1.125rem;font-weight:600;">Notifications</h3>' +
                    '<button onclick="closeNotificationModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#6b7280;">&times;</button>' +
                '</div>' +
                '<div style="max-height:400px;overflow-y:auto;">' +
                    (notifications.length > 0 ? notifications.map(function(n) {
                        return '<div style="padding:1rem 1.5rem;border-bottom:1px solid #e5e7eb;' + (n.is_read ? 'background:#f9fafb;' : 'background:#fff;') + '">' +
                            '<div style="display:flex;justify-content:space-between;align-items:start;">' +
                                '<div style="flex:1;"><p style="margin:0 0 0.5rem 0;font-weight:' + (n.is_read ? '400' : '600') + ';">' + n.message + '</p>' +
                                '<small style="color:#6b7280;">' + new Date(n.created_at).toLocaleString() + '</small></div>' +
                                '<div style="display:flex;gap:0.5rem;margin-left:1rem;">' +
                                    (!n.is_read ? '<button onclick="markAsRead(' + n.id + ')" style="padding:0.25rem 0.5rem;background:#007890;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.75rem;">Mark Read</button>' : '') +
                                    '<button onclick="deleteNotification(' + n.id + ')" style="padding:0.25rem 0.5rem;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.75rem;">Delete</button>' +
                                '</div>' +
                            '</div></div>';
                    }).join('') : '<p style="padding:2rem;text-align:center;color:#6b7280;">No notifications</p>') +
                '</div>' +
            '</div></div>';
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    window.closeNotificationModal = function() {
        var modal = document.getElementById('notification-modal');
        if (modal) modal.remove();
    };

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

    window.markAsRead = async function(notificationId) {
        try {
            const response = await fetch('/api/notifications/' + notificationId + '/read/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') }
            });
            if (response.ok) {
                closeNotificationModal();
                showNotificationModal();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    window.deleteNotification = async function(notificationId) {
        try {
            const response = await fetch('/api/notifications/' + notificationId + '/delete/', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') }
            });
            if (response.ok) {
                closeNotificationModal();
                showNotificationModal();
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    document.addEventListener('DOMContentLoaded', function() {
        var notificationBell = document.getElementById('notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', showNotificationModal);
            fetchNotifications();
            setInterval(fetchNotifications, 30000);
        }
    });
}
