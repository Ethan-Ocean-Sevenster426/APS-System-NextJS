// ================================================================
// THEME & BACKGROUND
// ================================================================
// Load background image for better performance
window.addEventListener('load', function() {
    document.body.classList.add('bg-loaded');
});

function initTheme() {
    var saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
}
initTheme();
window.addEventListener('storage', function(e) {
    if (e.key === 'theme') document.documentElement.setAttribute('data-theme', e.newValue || 'light');
});

// ================================================================
// COMMODITY COLORS
// ================================================================
var COMMODITY_COLORS = { 'EGG': '#f59e0b', 'EGGS': '#f59e0b', 'PMP': '#0078d4', 'POULTRY': '#107c10', 'RAW': '#d13438' };
var DEFAULT_COLOR = '#616161';
var CHART_PALETTE = ['#0078d4', '#107c10', '#f59e0b', '#d13438', '#8764b8', '#e3008c', '#00b7c3', '#7fba00'];

function getCommodityColor(c) { return c ? (COMMODITY_COLORS[c.toUpperCase()] || DEFAULT_COLOR) : DEFAULT_COLOR; }
function getCommodityCSSClass(c) {
    if (!c) return 'commodity-default';
    var k = c.toUpperCase();
    if (k === 'EGG' || k === 'EGGS') return 'commodity-egg';
    if (k === 'PMP') return 'commodity-pmp';
    if (k === 'POULTRY') return 'commodity-poultry';
    if (k === 'RAW') return 'commodity-raw';
    return 'commodity-default';
}

// ================================================================
// CHART MANAGEMENT
// ================================================================
var chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }
function txtColor() { return document.documentElement.getAttribute('data-theme') === 'dark' ? '#d1d1d1' : '#616161'; }
function gridColor() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; }

// Common chart defaults
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyle = 'circle';

// ================================================================
// DATA & STATE
// ================================================================
var dashboardData = {};

function formatRand(v) {
    if (!v && v !== 0) return '-';
    return 'R' + Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function loadInitialData() {
    var cfg = window.DJANGO_CONFIG;
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
        dailyComplianceTrend: cfg.dailyComplianceTrend || [],
        timeAllocation: cfg.timeAllocation || [],
        inspectionsList: cfg.inspectionsList || [],
        inspectorPerformance: cfg.inspectorPerformance || [],
        occurrenceReports: cfg.occurrenceReports || [],
        totalOccurrenceReports: cfg.totalOccurrenceReports || 0,
        directionsPerInspector: cfg.directionsPerInspector || [],
        travelPerInspector: cfg.travelPerInspector || [],
        inspectorCommodityMatrix: cfg.inspectorCommodityMatrix || [],
        approvalPerInspector: cfg.approvalPerInspector || [],
        inspectorFinancials: cfg.inspectorFinancials || [],
        financialSummary: cfg.financialSummary || {},
    };
}

// ================================================================
// FILTERS
// ================================================================
function populateFilterOptions() {
    var opts = window.DJANGO_CONFIG.filterOptions || {};
    var yearSel = document.getElementById('filterYear');
    if (yearSel && opts.years) opts.years.forEach(function(y) { var o = document.createElement('option'); o.value = y; o.textContent = y; yearSel.appendChild(o); });
    var inspSel = document.getElementById('filterInspector');
    if (inspSel && opts.inspectors) opts.inspectors.forEach(function(n) { var o = document.createElement('option'); o.value = n; o.textContent = n; inspSel.appendChild(o); });
    var commSel = document.getElementById('filterCommodity');
    if (commSel && opts.commodities) opts.commodities.forEach(function(c) { var o = document.createElement('option'); o.value = c; o.textContent = c; commSel.appendChild(o); });
}

// Period filter - show/hide custom date fields
function setupPeriodFilter() {
    var periodSel = document.getElementById('filterPeriod');
    if (!periodSel) return;
    periodSel.addEventListener('change', function() {
        var isCustom = this.value === 'custom';
        document.getElementById('customDateFrom').style.display = isCustom ? '' : 'none';
        document.getElementById('customDateTo').style.display = isCustom ? '' : 'none';
    });
}

function getPeriodDates() {
    var period = document.getElementById('filterPeriod');
    if (!period) return {};
    var val = period.value;
    if (val === 'all') return {};

    var now = new Date();
    var from, to;

    if (val === 'this_week') {
        from = new Date(now); from.setDate(now.getDate() - now.getDay()); // Sunday
        to = now;
    } else if (val === 'last_week') {
        from = new Date(now); from.setDate(now.getDate() - now.getDay() - 7);
        to = new Date(now); to.setDate(now.getDate() - now.getDay() - 1);
    } else if (val === 'this_month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = now;
    } else if (val === 'last_month') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (val === 'last_3_months') {
        from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        to = now;
    } else if (val === 'last_6_months') {
        from = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        to = now;
    } else if (val === 'this_year') {
        from = new Date(now.getFullYear(), 0, 1);
        to = now;
    } else if (val === 'custom') {
        var f = document.getElementById('filterDateFrom').value;
        var t = document.getElementById('filterDateTo').value;
        if (f) from = new Date(f);
        if (t) to = new Date(t);
    }

    var result = {};
    if (from) result.date_from = from.toISOString().slice(0, 10);
    if (to) result.date_to = to.toISOString().slice(0, 10);
    return result;
}

function getFilterValues() {
    var dateFrom = document.getElementById('filterDateFrom');
    var dateTo = document.getElementById('filterDateTo');
    return {
        year: document.getElementById('filterYear').value,
        month: document.getElementById('filterMonth').value,
        inspector: document.getElementById('filterInspector').value,
        commodity: document.getElementById('filterCommodity').value,
        date_from: dateFrom ? dateFrom.value : '',
        date_to: dateTo ? dateTo.value : '',
    };
}

function isFiltered() {
    var f = getFilterValues();
    return f.year !== 'all' || f.month !== 'all' || f.inspector !== 'all' || f.commodity !== 'all' || f.date_from || f.date_to;
}

async function applyFilters() {
    console.log('Apply filters clicked');
    if (!isFiltered()) {
        console.log('No filters set, loading initial data');
        loadInitialData();
        renderAll();
        return;
    }
    var f = getFilterValues();
    console.log('Filter values:', f);
    var params = new URLSearchParams();
    if (f.year !== 'all') params.set('year', f.year);
    if (f.month !== 'all') params.set('month', f.month);
    if (f.inspector !== 'all') params.set('inspector', f.inspector);
    if (f.commodity !== 'all') params.set('commodity', f.commodity);
    if (f.date_from) params.set('date_from', f.date_from);
    if (f.date_to) params.set('date_to', f.date_to);
    console.log('API params:', params.toString());

    // Show loading state
    var applyBtn = document.getElementById('applyFilters');
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }

    try {
        var resp = await fetch(window.DJANGO_CONFIG.apiUrl + '?' + params.toString());
        if (!resp.ok) throw new Error('API error');
        var data = await resp.json();
        console.log('Filtered data received:', data);
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
            dailyComplianceTrend: data.dailyComplianceTrend || [],
            timeAllocation: data.timeAllocation || [],
            inspectionsList: data.inspectionsList || [],
            inspectorPerformance: data.inspectorPerformance || [],
            occurrenceReports: data.occurrenceReports || [],
            totalOccurrenceReports: data.totalOccurrenceReports || 0,
            directionsPerInspector: data.directionsPerInspector || [],
            travelPerInspector: data.travelPerInspector || [],
            inspectorCommodityMatrix: data.inspectorCommodityMatrix || [],
            approvalPerInspector: data.approvalPerInspector || [],
            inspectorFinancials: data.inspectorFinancials || [],
            financialSummary: data.financialSummary || {},
        };
        renderAll();
        console.log('Dashboard updated with filtered data');
    } catch (err) {
        console.error('Filter error:', err);
        alert('Error loading filtered data. Please try again.');
    } finally {
        // Reset button state
        var applyBtn = document.getElementById('applyFilters');
        if (applyBtn) {
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-filter"></i> Apply';
        }
    }
}

function resetFilters() {
    var els = {
        period: document.getElementById('filterPeriod'),
        year: document.getElementById('filterYear'),
        month: document.getElementById('filterMonth'),
        inspector: document.getElementById('filterInspector'),
        commodity: document.getElementById('filterCommodity'),
        customFrom: document.getElementById('customDateFrom'),
        customTo: document.getElementById('customDateTo'),
        dateFrom: document.getElementById('filterDateFrom'),
        dateTo: document.getElementById('filterDateTo'),
    };
    if (els.period) els.period.value = 'all';
    if (els.year) els.year.value = 'all';
    if (els.month) els.month.value = 'all';
    if (els.inspector) els.inspector.value = 'all';
    if (els.commodity) els.commodity.value = 'all';
    if (els.customFrom) els.customFrom.style.display = 'none';
    if (els.customTo) els.customTo.style.display = 'none';
    if (els.dateFrom) els.dateFrom.value = '';
    if (els.dateTo) els.dateTo.value = '';
    loadInitialData();
    renderAll();
}

// ================================================================
// RENDER: KPIs
// ================================================================
function renderKPIs() {
    var d = dashboardData;
    document.getElementById('kpiTotalInspections').textContent = (d.totalInspections || 0).toLocaleString();
    document.getElementById('kpiComplianceRate').textContent = (d.complianceRate || 0).toFixed(1) + '%';
    document.getElementById('kpiActiveInspectors').textContent = d.activeInspectors || 0;
    document.getElementById('kpiDaysWorked').textContent = (d.daysWorked || 0).toLocaleString();

    // Financial KPIs
    var fin = d.financialSummary || {};
    var kpiRevEl = document.getElementById('kpiTotalRevenue');
    if (kpiRevEl) kpiRevEl.textContent = formatRand(fin.total_revenue);
}

// ================================================================
// RENDER: FINANCIAL TABLE
// ================================================================
function renderFinancialTable() {
    var tbody = document.getElementById('financialTableBody');
    if (!tbody) return;
    var items = dashboardData.inspectorFinancials || [];
    if (items.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--fluent-text-tertiary)">No financial data</td></tr>'; return; }

    var html = '';
    var totals = { inspections: 0, hours: 0, revHours: 0, revKm: 0, revSamples: 0, total: 0 };

    items.forEach(function(item) {
        var hrs = parseFloat(item.total_hours || 0);
        var revH = item.revenue_hours || 0;
        var revK = item.revenue_km || 0;
        var revS = item.revenue_samples || 0;
        var tot = item.total_revenue || 0;

        totals.inspections += item.total_inspections || 0;
        totals.hours += hrs;
        totals.revHours += revH;
        totals.revKm += revK;
        totals.revSamples += revS;
        totals.total += tot;

        html += '<tr>' +
            '<td>' + (item.inspector_name || '-') + '</td>' +
            '<td class="num">' + (item.total_inspections || 0) + '</td>' +
            '<td class="num">' + hrs.toFixed(1) + '</td>' +
            '<td class="num">' + formatRand(revH) + '</td>' +
            '<td class="num">' + formatRand(revK) + '</td>' +
            '<td class="num">' + formatRand(revS) + '</td>' +
            '<td class="num">' + formatRand(tot) + '</td>' +
        '</tr>';
    });

    // Total row
    html += '<tr class="total-row">' +
        '<td>Total</td>' +
        '<td class="num">' + totals.inspections + '</td>' +
        '<td class="num">' + totals.hours.toFixed(1) + '</td>' +
        '<td class="num">' + formatRand(totals.revHours) + '</td>' +
        '<td class="num">' + formatRand(totals.revKm) + '</td>' +
        '<td class="num">' + formatRand(totals.revSamples) + '</td>' +
        '<td class="num">' + formatRand(totals.total) + '</td>' +
    '</tr>';

    tbody.innerHTML = html;
}

// ================================================================
// RENDER: REVENUE VS COST CHART
// ================================================================
function renderRevenueCostChart() {
    destroyChart('revenueCostChart');
    var canvas = document.getElementById('revenueCostChart');
    if (!canvas) return;
    var items = (dashboardData.inspectorFinancials || []).slice(0, 12);
    if (items.length === 0) return;

    var labels = items.map(function(i) { return i.inspector_name || 'Unknown'; });
    var hoursData = items.map(function(i) { return i.revenue_hours || 0; });
    var kmData = items.map(function(i) { return i.revenue_km || 0; });
    var samplesData = items.map(function(i) { return i.revenue_samples || 0; });

    chartInstances['revenueCostChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Hours', data: hoursData, backgroundColor: '#107c10', borderRadius: 3, barPercentage: 0.7 },
                { label: 'KM', data: kmData, backgroundColor: '#0078d4', borderRadius: 3, barPercentage: 0.7 },
                { label: 'Samples', data: samplesData, backgroundColor: '#ffb900', borderRadius: 3, barPercentage: 0.7 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: txtColor(), padding: 12 } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 10 } } },
                y: { grid: { color: gridColor() }, ticks: { color: txtColor(), callback: function(v) { return 'R' + v.toLocaleString(); } }, beginAtZero: true }
            }
        }
    });
}

// ================================================================
// RENDER: COMPLIANCE BARS
// ================================================================
function renderComplianceBars() {
    var container = document.getElementById('complianceBarsContainer');
    if (!container) return;
    var items = dashboardData.complianceByCommodity || [];
    if (items.length === 0) { container.innerHTML = '<div class="no-data"><p>No compliance data</p></div>'; return; }

    var html = '';
    items.forEach(function(item) {
        var commodity = item.commodity || 'Unknown';
        var rate = item.compliance_rate || 0;
        var total = item.total || 0;
        html += '<div class="compliance-bar-row">' +
            '<div class="compliance-bar-label">' + commodity + '</div>' +
            '<div class="compliance-bar-track">' +
                '<div class="compliance-bar-fill ' + getCommodityCSSClass(commodity) + '" style="width:' + Math.max(rate, 3) + '%">' +
                    '<span class="compliance-bar-pct">' + rate.toFixed(1) + '%</span>' +
                '</div>' +
            '</div>' +
            '<div class="compliance-bar-count">' + total + '</div>' +
        '</div>';
    });
    container.innerHTML = html;
}

// ================================================================
// RENDER: COMPLIANCE TREND
// ================================================================
function renderComplianceTrendChart() {
    destroyChart('complianceTrendChart');
    var canvas = document.getElementById('complianceTrendChart');
    if (!canvas) return;
    var items = dashboardData.monthlyComplianceTrend || [];
    if (items.length === 0) return;

    var brandColors = { 'POULTRY': '#107c10', 'EGG': '#f59e0b', 'EGGS': '#f59e0b', 'PMP': '#0078d4', 'RAW': '#d13438' };
    var commodityData = {};
    var monthsSet = new Set();

    items.forEach(function(item) {
        var comm = item.commodity;
        var ms = typeof item.month === 'string' ? item.month.substring(0, 7) : '';
        if (!ms && item.month && item.month.getFullYear) { var m = item.month.getMonth() + 1; ms = item.month.getFullYear() + '-' + (m < 10 ? '0' + m : m); }
        monthsSet.add(ms);
        if (!commodityData[comm]) commodityData[comm] = {};
        commodityData[comm][ms] = item.compliance_rate;
    });

    var months = Array.from(monthsSet).sort();
    var mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var labels = months.map(function(m) { var p = m.split('-'); return mNames[parseInt(p[1]) - 1] + ' ' + p[0]; });

    var datasets = [];
    Object.keys(commodityData).sort().forEach(function(comm) {
        datasets.push({
            label: comm,
            data: months.map(function(m) { return commodityData[comm][m] || null; }),
            borderColor: brandColors[comm] || '#616161',
            backgroundColor: 'transparent',
            borderWidth: 2, pointRadius: 2, tension: 0.3, fill: false, spanGaps: true
        });
    });

    chartInstances['complianceTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: txtColor(), padding: 12 } }, tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + (ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) + '%' : 'N/A'); } } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 9 }, maxRotation: 45, autoSkip: true } },
                y: { min: 0, max: 100, grid: { color: gridColor() }, ticks: { color: txtColor(), callback: function(v) { return v + '%'; } } }
            }
        }
    });
}

// ================================================================
// RENDER: DAILY COMPLIANCE TREND
// ================================================================
function renderDailyComplianceChart() {
    destroyChart('dailyComplianceChart');
    var canvas = document.getElementById('dailyComplianceChart');
    if (!canvas) return;
    var items = dashboardData.dailyComplianceTrend || [];
    if (items.length === 0) return;

    var brandColors = { 'POULTRY': '#107c10', 'EGG': '#f59e0b', 'EGGS': '#f59e0b', 'PMP': '#0078d4', 'RAW': '#d13438' };
    var commodityData = {};
    var daysSet = new Set();

    items.forEach(function(item) {
        var comm = item.commodity;
        var dayStr = typeof item.day === 'string' ? item.day.substring(0, 10) : '';
        if (!dayStr && item.day && item.day.getFullYear) {
            var d = item.day.getDate();
            var m = item.day.getMonth() + 1;
            dayStr = item.day.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
        }
        daysSet.add(dayStr);
        if (!commodityData[comm]) commodityData[comm] = {};
        commodityData[comm][dayStr] = item.compliance_rate;
    });

    var days = Array.from(daysSet).sort();
    var labels = days.map(function(d) {
        var parts = d.split('-');
        return parts[2] + '/' + parts[1];  // DD/MM format
    });

    var datasets = [];
    Object.keys(commodityData).sort().forEach(function(comm) {
        datasets.push({
            label: comm,
            data: days.map(function(d) { return commodityData[comm][d] || null; }),
            borderColor: brandColors[comm] || '#616161',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: false,
            spanGaps: true
        });
    });

    chartInstances['dailyComplianceChart'] = new Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: txtColor(), padding: 12 } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + (ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) + '%' : 'N/A');
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: txtColor(), font: { size: 9 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 15 }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: gridColor() },
                    ticks: { color: txtColor(), callback: function(v) { return v + '%'; } }
                }
            }
        }
    });
}

// ================================================================
// RENDER: COMMODITY COUNT DOUGHNUT
// ================================================================
function renderCommodityCountChart() {
    destroyChart('commodityCountChart');
    var canvas = document.getElementById('commodityCountChart');
    if (!canvas) return;
    var items = dashboardData.commodityAnalysis || [];
    if (items.length === 0) return;
    var labels = items.map(function(i) { return i.commodity || 'Unknown'; });
    var data = items.map(function(i) { return i.total_inspections || 0; });
    var colors = labels.map(function(l) { return getCommodityColor(l); });
    var bg = document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2d2d' : '#ffffff';

    chartInstances['commodityCountChart'] = new Chart(canvas, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 2, borderColor: bg }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: txtColor(), padding: 10 } } }, cutout: '60%' }
    });
}

// ================================================================
// RENDER: TIME ALLOCATION
// ================================================================
function renderTimeAllocationChart() {
    destroyChart('timeAllocationChart');
    var canvas = document.getElementById('timeAllocationChart');
    if (!canvas) return;
    var items = dashboardData.timeAllocation || [];
    if (items.length === 0) return;
    var labels = items.map(function(i) { return i.inspector_name || 'Unknown'; });
    var data = items.map(function(i) { return parseFloat(i.total_hours || 0); });

    chartInstances['timeAllocationChart'] = new Chart(canvas, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Hours', data: data, backgroundColor: '#0078d4', borderRadius: 3, barThickness: 14 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 } } } }
        }
    });
}

// ================================================================
// RENDER: DIRECTIONS CHART
// ================================================================
function renderDirectionsChart() {
    destroyChart('directionsChart');
    var canvas = document.getElementById('directionsChart');
    if (!canvas) return;
    var items = (dashboardData.directionsPerInspector || []).sort(function(a, b) { return b.total - a.total; }).slice(0, 15);
    if (items.length === 0) return;

    chartInstances['directionsChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(i) { return i.inspector_name; }),
            datasets: [
                { label: 'Directions', data: items.map(function(i) { return i.directions || 0; }), backgroundColor: '#d13438', borderRadius: 2 },
                { label: 'Non-Compliant', data: items.map(function(i) { return i.non_compliant_products || 0; }), backgroundColor: '#ffb900', borderRadius: 2 },
                { label: 'Clean', data: items.map(function(i) { return i.total - (i.directions || 0); }), backgroundColor: '#107c10', borderRadius: 2 },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: txtColor() } } },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 10 } } },
                y: { stacked: true, grid: { color: gridColor() }, ticks: { color: txtColor() }, beginAtZero: true }
            }
        }
    });
}

// ================================================================
// RENDER: OCCURRENCE REPORTS
// ================================================================
function renderOccurrenceReportsChart() {
    destroyChart('occurrenceReportsChart');
    var canvas = document.getElementById('occurrenceReportsChart');
    if (!canvas) return;
    var items = dashboardData.occurrenceReports || [];
    if (items.length === 0) return;

    chartInstances['occurrenceReportsChart'] = new Chart(canvas, {
        type: 'bar',
        data: { labels: items.map(function(i) { return i.inspector_name; }), datasets: [{ label: 'Reports', data: items.map(function(i) { return i.count || 0; }), backgroundColor: '#8764b8', borderRadius: 3, barThickness: 14 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 } } } } }
    });
}

// ================================================================
// RENDER: TRAVEL CHART
// ================================================================
function renderTravelChart() {
    destroyChart('travelChart');
    var canvas = document.getElementById('travelChart');
    if (!canvas) return;
    var items = (dashboardData.travelPerInspector || []).filter(function(i) { return i.total_km && parseFloat(i.total_km) > 0; }).slice(0, 15);
    if (items.length === 0) return;

    chartInstances['travelChart'] = new Chart(canvas, {
        type: 'bar',
        data: { labels: items.map(function(i) { return i.inspector_name; }), datasets: [{ label: 'KM', data: items.map(function(i) { return parseFloat(i.total_km || 0); }), backgroundColor: '#00b7c3', borderRadius: 3, barThickness: 14 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 } } } } }
    });
}

// ================================================================
// RENDER: EFFICIENCY MATRIX
// ================================================================
function renderEfficiencyMatrix() {
    var headerRow = document.getElementById('matrixHeader');
    var tbody = document.getElementById('matrixBody');
    if (!headerRow || !tbody) return;
    var items = dashboardData.inspectorCommodityMatrix || [];
    if (items.length === 0) { headerRow.innerHTML = '<th>No data</th>'; tbody.innerHTML = ''; return; }

    var inspectors = {};
    var commodities = new Set();
    items.forEach(function(item) {
        commodities.add(item.commodity);
        if (!inspectors[item.inspector_name]) inspectors[item.inspector_name] = {};
        inspectors[item.inspector_name][item.commodity] = item.count || 0;
    });
    var commList = Array.from(commodities).sort();

    var hHtml = '<th>Inspector</th>';
    commList.forEach(function(c) { hHtml += '<th class="num">' + c + '</th>'; });
    hHtml += '<th class="num">Total</th>';
    headerRow.innerHTML = hHtml;

    var bHtml = '';
    Object.keys(inspectors).sort().forEach(function(name) {
        var total = 0;
        bHtml += '<tr><td style="font-weight:600;white-space:nowrap">' + name + '</td>';
        commList.forEach(function(c) {
            var count = inspectors[name][c] || 0;
            total += count;
            bHtml += '<td class="num">' + (count || '-') + '</td>';
        });
        bHtml += '<td class="num" style="font-weight:700">' + total + '</td></tr>';
    });
    tbody.innerHTML = bHtml;
}

// ================================================================
// RENDER: APPROVAL RATE
// ================================================================
function renderApprovalRateChart() {
    destroyChart('approvalRateChart');
    var canvas = document.getElementById('approvalRateChart');
    if (!canvas) return;
    var items = (dashboardData.approvalPerInspector || []).sort(function(a, b) { return b.total - a.total; }).slice(0, 15);
    if (items.length === 0) return;

    chartInstances['approvalRateChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(i) { return i.inspector_name; }),
            datasets: [
                { label: 'Approved', data: items.map(function(i) { return i.approved || 0; }), backgroundColor: '#107c10', borderRadius: 2 },
                { label: 'Pending', data: items.map(function(i) { return i.pending || 0; }), backgroundColor: '#ffb900', borderRadius: 2 },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: txtColor() } } },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 10 } } },
                y: { stacked: true, grid: { color: gridColor() }, ticks: { color: txtColor() }, beginAtZero: true }
            }
        }
    });
}

// ================================================================
// RENDER: COMMODITY TREND (multi-line)
// ================================================================
function renderCommodityTrendChart() {
    destroyChart('commodityTrendChart');
    var canvas = document.getElementById('commodityTrendChart');
    if (!canvas) return;
    var trends = dashboardData.monthlyCommodityTrends || [];
    if (trends.length === 0) return;

    var commodityMap = {};
    var monthSet = new Set();
    trends.forEach(function(item) {
        var month = item.month ? (typeof item.month === 'string' ? item.month.substring(0, 7) : '') : 'Unknown';
        var commodity = item.commodity || 'Unknown';
        monthSet.add(month);
        if (!commodityMap[commodity]) commodityMap[commodity] = {};
        commodityMap[commodity][month] = item.count || 0;
    });

    var months = Array.from(monthSet).sort();
    var mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var labels = months.map(function(m) { var p = m.split('-'); return mNames[parseInt(p[1]) - 1] + ' ' + p[0].substring(2); });

    var datasets = [];
    Object.keys(commodityMap).forEach(function(commodity, idx) {
        datasets.push({
            label: commodity,
            data: months.map(function(m) { return commodityMap[commodity][m] || 0; }),
            borderColor: getCommodityColor(commodity) || CHART_PALETTE[idx % CHART_PALETTE.length],
            backgroundColor: 'transparent',
            tension: 0.3, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, fill: false
        });
    });

    chartInstances['commodityTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: txtColor(), padding: 12 } } },
            scales: {
                x: { grid: { color: gridColor() }, ticks: { color: txtColor(), font: { size: 10 }, maxRotation: 45, autoSkip: true } },
                y: { grid: { color: gridColor() }, ticks: { color: txtColor() }, beginAtZero: true }
            }
        }
    });
}

// ================================================================
// RENDER: SAMPLES TAKEN CHART
// ================================================================
function renderSamplesTakenChart() {
    console.log('[DEBUG] renderSamplesTakenChart called');
    destroyChart('samplesTakenChart');
    var canvas = document.getElementById('samplesTakenChart');
    if (!canvas) { console.error('[DEBUG] samplesTakenChart canvas not found'); return; }
    var items = dashboardData.samplesByCommodity || [];
    console.log('[DEBUG] samplesByCommodity data:', items);
    if (items.length === 0) { console.warn('[DEBUG] No samples data to display'); return; }

    var labels = items.map(function(i) { return i.commodity || 'Unknown'; });
    var data = items.map(function(i) { return i.count || 0; });
    var colors = labels.map(function(l) { return getCommodityColor(l); });
    var bg = document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2d2d' : '#ffffff';

    chartInstances['samplesTakenChart'] = new Chart(canvas, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 2, borderColor: bg }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: txtColor(), padding: 10 } }
            },
            cutout: '60%'
        }
    });
    console.log('[DEBUG] samplesTakenChart created successfully');
}

// ================================================================
// RENDER: FACILITY TYPES CHART
// ================================================================
function renderFacilityTypesChart() {
    console.log('[DEBUG] renderFacilityTypesChart called');
    destroyChart('facilityTypesChart');
    var canvas = document.getElementById('facilityTypesChart');
    if (!canvas) { console.error('[DEBUG] facilityTypesChart canvas not found'); return; }
    var items = dashboardData.facilityTypeDistribution || [];
    console.log('[DEBUG] facilityTypeDistribution data:', items);
    if (items.length === 0) { console.warn('[DEBUG] No facility type data to display'); return; }

    var labels = items.map(function(i) { return i.facility_type || 'Unknown'; });
    var data = items.map(function(i) { return i.count || 0; });

    chartInstances['facilityTypesChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: data,
                backgroundColor: '#0078d4',
                borderRadius: 3,
                barThickness: 14
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor() }, ticks: { color: txtColor() }, beginAtZero: true },
                y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 } } }
            }
        }
    });
    console.log('[DEBUG] facilityTypesChart created successfully');
}

// ================================================================
// RENDER ALL
// ================================================================
function renderAll() {
    renderKPIs();
    renderFinancialTable();
    renderRevenueCostChart();
    renderComplianceBars();
    renderComplianceTrendChart();
    renderCommodityTrendChart();
    renderCommodityCountChart();
    renderSamplesTakenChart();
    renderFacilityTypesChart();
    renderTimeAllocationChart();
    renderDirectionsChart();
    renderOccurrenceReportsChart();
    renderTravelChart();
    renderEfficiencyMatrix();
    renderApprovalRateChart();
    renderDailyComplianceChart();
}

// ================================================================
// EXPORT CSV
// ================================================================
function extractReport() {
    var items = dashboardData.inspectionsList || [];
    if (items.length === 0) { alert('No data to export.'); return; }
    var headers = ['Date', 'Inspector', 'Client', 'Commodity', 'Facility', 'Sample Taken', 'Status', 'Town'];
    var rows = items.map(function(row) {
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
    var csv = headers.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'analytics_report_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
    populateFilterOptions();
    setupPeriodFilter();
    renderAll();

    // Apply button triggers filter
    var applyBtn = document.getElementById('applyFilters');
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);

    var resetBtn = document.getElementById('resetFilters');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    var extractBtn = document.getElementById('extractReport');
    if (extractBtn) extractBtn.addEventListener('click', extractReport);
});

// ================================================================
// MOBILE SIDEBAR
// ================================================================
var mobileMenuBtn = document.getElementById('mobile-menu-btn');
var sidebar = document.getElementById('sidebar');
var sidebarOverlay = document.getElementById('sidebar-overlay');

function toggleSidebar() {
    sidebar.classList.toggle('show');
    sidebarOverlay.classList.toggle('show');
    var icon = mobileMenuBtn.querySelector('i');
    icon.className = sidebar.classList.contains('show') ? 'fas fa-times' : 'fas fa-bars';
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
if (sidebar) {
    sidebar.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() { if (window.innerWidth <= 1024) toggleSidebar(); });
    });
}
window.addEventListener('resize', function() {
    if (window.innerWidth > 1024) {
        if (sidebar) sidebar.classList.remove('show');
        if (sidebarOverlay) sidebarOverlay.classList.remove('show');
        if (mobileMenuBtn) mobileMenuBtn.querySelector('i').className = 'fas fa-bars';
    }
});

// ================================================================
// NOTIFICATIONS
// ================================================================
if (window.DJANGO_CONFIG.userRole === 'super_admin' || window.DJANGO_CONFIG.userRole === 'developer') {
    async function fetchNotifications() {
        try {
            var resp = await fetch('/api/notifications/');
            if (!resp.ok) throw new Error('fail');
            var data = await resp.json();
            var badge = document.getElementById('notification-badge');
            if (badge) {
                if (data.unread_count > 0) { badge.textContent = data.unread_count > 99 ? '99+' : data.unread_count; badge.classList.remove('hidden'); }
                else badge.classList.add('hidden');
            }
            return data.notifications;
        } catch (e) { return []; }
    }

    function getCookie(name) {
        var v = null;
        if (document.cookie) document.cookie.split(';').forEach(function(c) { c = c.trim(); if (c.startsWith(name + '=')) v = decodeURIComponent(c.substring(name.length + 1)); });
        return v;
    }

    async function showNotificationModal() {
        var notifications = await fetchNotifications();
        var html = '<div id="notification-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center">' +
            '<div style="background:var(--fluent-surface);border-radius:8px;width:90%;max-width:480px;max-height:80vh;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2)">' +
                '<div style="padding:16px;border-bottom:1px solid var(--fluent-border);display:flex;justify-content:space-between;align-items:center">' +
                    '<h3 style="margin:0;font-size:16px;font-weight:600">Notifications</h3>' +
                    '<button onclick="closeNotificationModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--fluent-text-secondary)">&times;</button>' +
                '</div>' +
                '<div style="max-height:400px;overflow-y:auto">' +
                    (notifications.length > 0 ? notifications.map(function(n) {
                        return '<div style="padding:12px 16px;border-bottom:1px solid var(--fluent-border-subtle)">' +
                            '<p style="margin:0 0 4px;font-weight:' + (n.is_read ? '400' : '600') + ';font-size:13px">' + n.message + '</p>' +
                            '<small style="color:var(--fluent-text-tertiary)">' + new Date(n.created_at).toLocaleString() + '</small>' +
                            '<div style="margin-top:6px;display:flex;gap:6px">' +
                                (!n.is_read ? '<button onclick="markAsRead(' + n.id + ')" style="padding:4px 8px;background:var(--fluent-brand);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">Read</button>' : '') +
                                '<button onclick="deleteNotification(' + n.id + ')" style="padding:4px 8px;background:var(--fluent-danger);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">Delete</button>' +
                            '</div></div>';
                    }).join('') : '<p style="padding:32px;text-align:center;color:var(--fluent-text-tertiary)">No notifications</p>') +
                '</div></div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
    }

    window.closeNotificationModal = function() { var m = document.getElementById('notification-modal'); if (m) m.remove(); };
    window.markAsRead = async function(id) {
        try { var r = await fetch('/api/notifications/' + id + '/read/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') } }); if (r.ok) { closeNotificationModal(); showNotificationModal(); } } catch (e) {}
    };
    window.deleteNotification = async function(id) {
        try { var r = await fetch('/api/notifications/' + id + '/delete/', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') } }); if (r.ok) { closeNotificationModal(); showNotificationModal(); } } catch (e) {}
    };

    document.addEventListener('DOMContentLoaded', function() {
        var bell = document.getElementById('notification-bell');
        if (bell) { bell.addEventListener('click', showNotificationModal); fetchNotifications(); setInterval(fetchNotifications, 30000); }
    });
}
