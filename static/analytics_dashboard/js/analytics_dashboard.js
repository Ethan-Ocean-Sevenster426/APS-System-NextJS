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
        inspectorSampleMatrix: cfg.inspectorSampleMatrix || [],
        approvalPerInspector: cfg.approvalPerInspector || [],
        inspectorFinancials: cfg.inspectorFinancials || [],
        financialSummary: cfg.financialSummary || {},
        // Monthly trends
        monthlyOccurrenceTrend: cfg.monthlyOccurrenceTrend || [],
        monthlyTravelTrend: cfg.monthlyTravelTrend || [],
        monthlyDocSendTrend: cfg.monthlyDocSendTrend || [],
        monthlyInvoiceTrend: cfg.monthlyInvoiceTrend || [],
        monthlyInspectionsTrend: cfg.monthlyInspectionsTrend || [],
        monthlyCoaTrend: cfg.monthlyCoaTrend || [],
        monthlyApprovalTrend: cfg.monthlyApprovalTrend || [],
        monthlyTravelHoursTrend: cfg.monthlyTravelHoursTrend || [],
        // Phase 2 time data
        docSendTime: cfg.docSendTime || [],
        invoiceUploadTime: cfg.invoiceUploadTime || [],
        coaAnalysisTime: cfg.coaAnalysisTime || [],
        approvalTime: cfg.approvalTime || [],
        travelTimePerInspector: cfg.travelTimePerInspector || [],
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
            inspectorSampleMatrix: data.inspectorSampleMatrix || [],
            approvalPerInspector: data.approvalPerInspector || [],
            inspectorFinancials: data.inspectorFinancials || [],
            financialSummary: data.financialSummary || {},
            monthlyOccurrenceTrend: data.monthlyOccurrenceTrend || [],
            monthlyTravelTrend: data.monthlyTravelTrend || [],
            monthlyDocSendTrend: data.monthlyDocSendTrend || [],
            monthlyInvoiceTrend: data.monthlyInvoiceTrend || [],
            monthlyInspectionsTrend: data.monthlyInspectionsTrend || [],
            monthlyCoaTrend: data.monthlyCoaTrend || [],
            monthlyApprovalTrend: data.monthlyApprovalTrend || [],
            monthlyTravelHoursTrend: data.monthlyTravelHoursTrend || [],
            docSendTime: data.docSendTime || [],
            invoiceUploadTime: data.invoiceUploadTime || [],
            coaAnalysisTime: data.coaAnalysisTime || [],
            approvalTime: data.approvalTime || [],
            travelTimePerInspector: data.travelTimePerInspector || [],
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
    if (items.length === 0) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--fluent-text-tertiary)">No financial data</td></tr>'; return; }

    var html = '';
    var totals = { inspections: 0, hours: 0, km: 0, inspTime: 0, revHours: 0, revKm: 0, revSamples: 0, total: 0 };

    items.forEach(function(item) {
        var hrs = parseFloat(item.total_hours || 0);
        var km = parseFloat(item.total_km || 0);
        var inspTime = parseFloat(item.inspection_time || 0);
        var revH = item.revenue_hours || 0;
        var revK = item.revenue_km || 0;
        var revS = item.revenue_samples || 0;
        var tot = item.total_revenue || 0;

        totals.inspections += item.total_inspections || 0;
        totals.hours += hrs;
        totals.km += km;
        totals.inspTime += inspTime;
        totals.revHours += revH;
        totals.revKm += revK;
        totals.revSamples += revS;
        totals.total += tot;

        html += '<tr>' +
            '<td>' + (item.inspector_name || '-') + '</td>' +
            '<td class="num">' + (item.total_inspections || 0) + '</td>' +
            '<td class="num">' + hrs.toFixed(1) + '</td>' +
            '<td class="num">' + (km ? km.toLocaleString(undefined, {maximumFractionDigits: 1}) : '-') + '</td>' +
            '<td class="num">' + (inspTime ? inspTime.toFixed(1) : '-') + '</td>' +
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
        '<td class="num">' + totals.km.toLocaleString(undefined, {maximumFractionDigits: 1}) + '</td>' +
        '<td class="num">' + totals.inspTime.toFixed(1) + '</td>' +
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
    var items = dashboardData.inspectorFinancials || [];
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
    var weeksSet = new Set();

    items.forEach(function(item) {
        var comm = item.commodity;
        // Handle week format (YYYY-MM-DD for week start)
        var weekStr = typeof item.month === 'string' ? item.month.substring(0, 10) : '';
        if (!weekStr && item.month && item.month.getFullYear) {
            var d = new Date(item.month);
            weekStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
        weeksSet.add(weekStr);
        if (!commodityData[comm]) commodityData[comm] = {};
        commodityData[comm][weekStr] = item.compliance_rate;
    });

    var weeks = Array.from(weeksSet).sort();
    var mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var labels = weeks.map(function(w) {
        var p = w.split('-');
        return mNames[parseInt(p[1]) - 1] + ' ' + p[2];
    });

    var datasets = [];
    Object.keys(commodityData).sort().forEach(function(comm) {
        datasets.push({
            label: comm,
            data: weeks.map(function(w) { return commodityData[comm][w] || null; }),
            borderColor: brandColors[comm] || '#616161',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.2,
            fill: false,
            spanGaps: false
        });
    });

    chartInstances['complianceTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: txtColor(), padding: 12, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        title: function(ctx) { return 'Week of ' + weeks[ctx[0].dataIndex]; },
                        label: function(ctx) { return ctx.dataset.label + ': ' + (ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) + '%' : 'No data'); }
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 9 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 10 } },
                y: { min: 0, max: 100, grid: { color: gridColor() }, ticks: { color: txtColor(), callback: function(v) { return v + '%'; }, stepSize: 10 } }
            }
        }
    });

    // Update tooltip with inspection counts per commodity
    var infoIcon = document.getElementById('complianceTrendInfo');
    if (infoIcon) {
        var commodityCounts = dashboardData.complianceByCommodity || [];
        var totalInspections = 0;
        var breakdown = [];

        commodityCounts.forEach(function(item) {
            var total = item.total || 0;
            var commodity = item.commodity || 'Unknown';
            totalInspections += total;
            breakdown.push(total + ' ' + commodity);
        });

        var tooltipText = 'Total: ' + totalInspections + ' inspections\n' + breakdown.join('\n');
        infoIcon.setAttribute('title', tooltipText);
    }
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
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), stepSize: 1, precision: 0 } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 } } } } }
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

    // Build km lookup from travelPerInspector data
    var kmLookup = {};
    (dashboardData.travelPerInspector || []).forEach(function(item) {
        kmLookup[item.inspector_name] = item.total_km || 0;
    });

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
    hHtml += '<th class="num">KM</th>';
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
        var km = kmLookup[name] || 0;
        bHtml += '<td class="num" style="font-weight:700">' + total + '</td>';
        bHtml += '<td class="num">' + (km ? km.toLocaleString(undefined, {maximumFractionDigits: 0}) : '-') + '</td></tr>';
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
    var dateSet = new Set();
    trends.forEach(function(item) {
        // Handle daily data format (YYYY-MM-DD)
        var date = item.month ? (typeof item.month === 'string' ? item.month.substring(0, 10) : '') : 'Unknown';
        var commodity = item.commodity || 'Unknown';
        dateSet.add(date);
        if (!commodityMap[commodity]) commodityMap[commodity] = {};
        commodityMap[commodity][date] = item.compliance_rate || 0;
    });

    var dates = Array.from(dateSet).sort();
    var mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var labels = dates.map(function(d) {
        var p = d.split('-');
        return mNames[parseInt(p[1]) - 1] + ' ' + parseInt(p[2]);
    });

    var datasets = [];
    Object.keys(commodityMap).forEach(function(commodity, idx) {
        datasets.push({
            label: commodity,
            data: dates.map(function(d) { return commodityMap[commodity][d] || 0; }),
            borderColor: getCommodityColor(commodity) || CHART_PALETTE[idx % CHART_PALETTE.length],
            backgroundColor: 'transparent',
            tension: 0.4, borderWidth: 2.5, pointRadius: 2, pointHoverRadius: 5, fill: false
        });
    });

    chartInstances['commodityTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: txtColor(), padding: 12 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: gridColor() }, ticks: { color: txtColor(), font: { size: 10 }, maxRotation: 45, autoSkip: true } },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: gridColor() },
                    ticks: {
                        color: txtColor(),
                        callback: function(value) { return value + '%'; }
                    }
                }
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
// INSPECTOR TARGETS (Q1: Jan-Mar 2026)
// ================================================================
var INSPECTOR_TARGETS = {
    inspections: { EGGS: 51, POULTRY: 59, RAW: 63, PMP: 54 },
    sampling: { RAW: 58, PMP: 12 }
};
var SAMPLING_TOTAL_TARGET = 70;

function getInspectorData() {
    var inspectors = {};
    // Build inspection counts per inspector per commodity
    (dashboardData.inspectorCommodityMatrix || []).forEach(function(item) {
        if (!inspectors[item.inspector_name]) inspectors[item.inspector_name] = { inspections: {}, samples: {} };
        inspectors[item.inspector_name].inspections[item.commodity.toUpperCase()] = item.count || 0;
    });
    // Build sample counts per inspector per commodity
    (dashboardData.inspectorSampleMatrix || []).forEach(function(item) {
        if (!inspectors[item.inspector_name]) inspectors[item.inspector_name] = { inspections: {}, samples: {} };
        inspectors[item.inspector_name].samples[item.commodity.toUpperCase()] = item.count || 0;
    });
    return inspectors;
}

// ================================================================
// RENDER: INSPECTOR RADAR CHART
// ================================================================
function renderInspectorRadarChart() {
    destroyChart('inspectorRadarChart');
    var canvas = document.getElementById('inspectorRadarChart');
    if (!canvas) return;

    // Use dashboardData first, fall back to DJANGO_CONFIG directly
    var matrixData = (dashboardData.inspectorCommodityMatrix && dashboardData.inspectorCommodityMatrix.length)
        ? dashboardData.inspectorCommodityMatrix
        : (window.DJANGO_CONFIG ? window.DJANGO_CONFIG.inspectorCommodityMatrix || [] : []);
    var sampleMatrixData = (dashboardData.inspectorSampleMatrix && dashboardData.inspectorSampleMatrix.length)
        ? dashboardData.inspectorSampleMatrix
        : (window.DJANGO_CONFIG ? window.DJANGO_CONFIG.inspectorSampleMatrix || [] : []);

    var inspectors = {};
    matrixData.forEach(function(item) {
        if (!inspectors[item.inspector_name]) inspectors[item.inspector_name] = { inspections: {}, samples: {} };
        inspectors[item.inspector_name].inspections[item.commodity.toUpperCase()] = item.count || 0;
    });
    sampleMatrixData.forEach(function(item) {
        if (!inspectors[item.inspector_name]) inspectors[item.inspector_name] = { inspections: {}, samples: {} };
        inspectors[item.inspector_name].samples[item.commodity.toUpperCase()] = item.count || 0;
    });

    var inspectorNames = Object.keys(inspectors).sort();
    if (inspectorNames.length === 0) return;

    // Populate dropdown if not already done
    var select = document.getElementById('radarInspectorSelect');
    if (select && select.options.length <= 1) {
        inspectorNames.forEach(function(name) {
            var opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    }

    var selectedInspector = select ? select.value : 'all';
    var labels = ['Eggs Insp.', 'Poultry Insp.', 'RAW Insp.', 'PMP Insp.', 'RAW Samples', 'PMP Samples'];
    var targetData = [
        INSPECTOR_TARGETS.inspections.EGGS,
        INSPECTOR_TARGETS.inspections.POULTRY,
        INSPECTOR_TARGETS.inspections.RAW,
        INSPECTOR_TARGETS.inspections.PMP,
        INSPECTOR_TARGETS.sampling.RAW,
        INSPECTOR_TARGETS.sampling.PMP
    ];

    var datasets = [{
        label: 'Target',
        data: targetData,
        borderColor: '#d13438',
        backgroundColor: 'rgba(209, 52, 56, 0.08)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 3,
        pointBackgroundColor: '#d13438'
    }];

    if (selectedInspector === 'all') {
        // Show all inspectors with different colors
        inspectorNames.forEach(function(name, idx) {
            var d = inspectors[name];
            var color = CHART_PALETTE[idx % CHART_PALETTE.length];
            datasets.push({
                label: name,
                data: [
                    (d.inspections['EGGS'] || d.inspections['EGG'] || 0),
                    (d.inspections['POULTRY'] || 0),
                    (d.inspections['RAW'] || 0),
                    (d.inspections['PMP'] || 0),
                    (d.samples['RAW'] || 0),
                    (d.samples['PMP'] || 0)
                ],
                borderColor: color,
                backgroundColor: color.replace(')', ', 0.1)').replace('rgb', 'rgba'),
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: color
            });
        });
    } else {
        var d = inspectors[selectedInspector];
        if (d) {
            datasets.push({
                label: selectedInspector,
                data: [
                    (d.inspections['EGGS'] || d.inspections['EGG'] || 0),
                    (d.inspections['POULTRY'] || 0),
                    (d.inspections['RAW'] || 0),
                    (d.inspections['PMP'] || 0),
                    (d.samples['RAW'] || 0),
                    (d.samples['PMP'] || 0)
                ],
                borderColor: '#0078d4',
                backgroundColor: 'rgba(0, 120, 212, 0.15)',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#0078d4'
            });
        }
    }

    chartInstances['inspectorRadarChart'] = new Chart(canvas, {
        type: 'radar',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    grid: { color: gridColor() },
                    angleLines: { color: gridColor() },
                    pointLabels: { color: txtColor(), font: { size: 11 } },
                    ticks: { color: txtColor(), backdropColor: 'transparent', font: { size: 9 } }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: txtColor(), padding: 10, font: { size: 10 }, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(ctx) {
                            if (ctx.datasetIndex === 0) return '';
                            var target = targetData[ctx.dataIndex];
                            var actual = ctx.raw;
                            var pct = target > 0 ? Math.round((actual / target) * 100) : 0;
                            return pct + '% of target (' + target + ')';
                        }
                    }
                }
            }
        }
    });
}

// ================================================================
// RENDER: INSPECTOR TARGETS TABLE
// ================================================================
function renderInspectorTargetsTable() {
    var headerRow = document.getElementById('targetsHeader');
    var tbody = document.getElementById('targetsBody');
    if (!headerRow || !tbody) return;

    var inspectors = getInspectorData();
    var inspectorNames = Object.keys(inspectors).sort();
    if (inspectorNames.length === 0) { headerRow.innerHTML = '<th>No data</th>'; tbody.innerHTML = ''; return; }

    headerRow.innerHTML = '<th style="min-width:110px;">Inspector</th>' +
        '<th class="num">Eggs<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.inspections.EGGS + '</small></th>' +
        '<th class="num">Poultry<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.inspections.POULTRY + '</small></th>' +
        '<th class="num">RAW<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.inspections.RAW + '</small></th>' +
        '<th class="num">PMP<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.inspections.PMP + '</small></th>' +
        '<th class="num">RAW Samples<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.sampling.RAW + '</small></th>' +
        '<th class="num">PMP Samples<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.sampling.PMP + '</small></th>' +
        '<th class="num">Total Samples<br><small style="color:#888;">/ ' + SAMPLING_TOTAL_TARGET + '</small></th>';

    function cell(actual, target) {
        var pct = target > 0 ? Math.round((actual / target) * 100) : 0;
        var color = actual >= target ? '#166534' : '#991b1b';
        var bg = actual >= target ? '#dcfce7' : '#fee2e2';
        return '<td class="num" style="color:' + color + '; background:' + bg + '; font-weight:600;">' +
            actual + ' <small style="opacity:0.7;">(' + pct + '%)</small></td>';
    }

    var html = '';
    inspectorNames.forEach(function(name) {
        var d = inspectors[name];
        var eggs = d.inspections['EGGS'] || d.inspections['EGG'] || 0;
        var poultry = d.inspections['POULTRY'] || 0;
        var raw = d.inspections['RAW'] || 0;
        var pmp = d.inspections['PMP'] || 0;
        var rawSamples = d.samples['RAW'] || 0;
        var pmpSamples = d.samples['PMP'] || 0;
        var totalSamples = 0;
        Object.keys(d.samples).forEach(function(k) { totalSamples += d.samples[k] || 0; });

        html += '<tr><td style="font-weight:600; white-space:nowrap;">' + name + '</td>';
        html += cell(eggs, INSPECTOR_TARGETS.inspections.EGGS);
        html += cell(poultry, INSPECTOR_TARGETS.inspections.POULTRY);
        html += cell(raw, INSPECTOR_TARGETS.inspections.RAW);
        html += cell(pmp, INSPECTOR_TARGETS.inspections.PMP);
        html += cell(rawSamples, INSPECTOR_TARGETS.sampling.RAW);
        html += cell(pmpSamples, INSPECTOR_TARGETS.sampling.PMP);
        html += cell(totalSamples, SAMPLING_TOTAL_TARGET);
        html += '</tr>';
    });
    tbody.innerHTML = html;
}

// ================================================================
// RENDER: PHASE 2 TIME-BASED CHARTS (converted from static lists)
// ================================================================
function renderDocSendChart() {
    destroyChart('docSendChart');
    var canvas = document.getElementById('docSendChart');
    if (!canvas) return;
    var items = dashboardData.docSendTime || [];
    if (!items.length) return;
    chartInstances['docSendChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return d.name; }),
            datasets: [{
                label: 'Avg Days',
                data: items.map(function(d) { return d.avg_days; }),
                backgroundColor: '#0078d4',
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { var item = items[ctx.dataIndex]; return ctx.raw + ' days (' + item.count + ' records)'; } } } },
            scales: { x: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 } } } }
        }
    });
}

function renderDocSendTrendChart() {
    destroyChart('docSendTrendChart');
    var canvas = document.getElementById('docSendTrendChart');
    if (!canvas) return;
    var items = dashboardData.monthlyDocSendTrend || [];
    if (!items.length) { return; }
    chartInstances['docSendTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: items.map(function(d) { return d.month; }),
            datasets: [{
                label: 'Avg Days to Send',
                data: items.map(function(d) { return d.avg_days; }),
                borderColor: '#0078d4', backgroundColor: 'rgba(0,120,212,0.1)',
                tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: '#0078d4'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
}

function renderInvoiceUploadChart() {
    destroyChart('invoiceUploadChart');
    var canvas = document.getElementById('invoiceUploadChart');
    if (!canvas) return;
    var items = dashboardData.invoiceUploadTime || [];
    if (!items.length) return;
    chartInstances['invoiceUploadChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return d.name; }),
            datasets: [{
                label: 'Avg Days',
                data: items.map(function(d) { return d.avg_days; }),
                backgroundColor: '#f59e0b',
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { var item = items[ctx.dataIndex]; return ctx.raw + ' days (' + item.count + ' records)'; } } } },
            scales: { x: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 } } } }
        }
    });
}

function renderInvoiceTrendChart() {
    destroyChart('invoiceTrendChart');
    var canvas = document.getElementById('invoiceTrendChart');
    if (!canvas) return;
    var items = dashboardData.monthlyInvoiceTrend || [];
    if (!items.length) return;
    chartInstances['invoiceTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: items.map(function(d) { return d.month; }),
            datasets: [{
                label: 'Avg Days to Upload Invoice',
                data: items.map(function(d) { return d.avg_days; }),
                borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)',
                tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: '#f59e0b'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
}

function renderCoaTimeChart() {
    destroyChart('coaTimeChart');
    var canvas = document.getElementById('coaTimeChart');
    if (!canvas) return;
    var items = dashboardData.coaAnalysisTime || [];
    if (!items.length) return;
    chartInstances['coaTimeChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return d.commodity; }),
            datasets: [{
                label: 'Avg Days',
                data: items.map(function(d) { return d.avg_days; }),
                backgroundColor: '#10b981',
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { var item = items[ctx.dataIndex]; return ctx.raw + ' days (' + item.count + ' records)'; } } } },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
}

function renderApprovalTimeChart() {
    destroyChart('approvalTimeChart');
    var canvas = document.getElementById('approvalTimeChart');
    if (!canvas) return;
    var items = dashboardData.approvalTime || [];
    if (!items.length) return;
    chartInstances['approvalTimeChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return d.inspector_name; }),
            datasets: [{
                label: 'Avg Days',
                data: items.map(function(d) { return d.avg_days; }),
                backgroundColor: '#8764b8',
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { var item = items[ctx.dataIndex]; return ctx.raw + ' days (' + item.count + ' records)'; } } } },
            scales: { x: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 } } } }
        }
    });
}

function renderTravelTimeChart() {
    destroyChart('travelTimeChart');
    var canvas = document.getElementById('travelTimeChart');
    if (!canvas) return;
    var items = dashboardData.travelTimePerInspector || [];
    if (!items.length) return;
    chartInstances['travelTimeChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return d.inspector_name; }),
            datasets: [{
                label: 'Travel Hours',
                data: items.map(function(d) { return d.total_hours; }),
                backgroundColor: '#00b7c3',
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 } } } }
        }
    });
}

// ================================================================
// RENDER: COA TIME TREND
// ================================================================
function renderCoaTrendChart() {
    destroyChart('coaTrendChart');
    var canvas = document.getElementById('coaTrendChart');
    if (!canvas) return;
    var items = dashboardData.monthlyCoaTrend || [];
    if (!items.length) return;
    chartInstances['coaTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: items.map(function(d) { return d.month; }),
            datasets: [{
                label: 'Avg Days (Sample to COA)',
                data: items.map(function(d) { return d.avg_days; }),
                borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',
                tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function(ctx) { var item = items[ctx.dataIndex]; return ctx.raw + ' days (' + item.count + ' records)'; } } }
            },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
}

// ================================================================
// RENDER: APPROVAL TIME TREND
// ================================================================
function renderApprovalTrendChart() {
    destroyChart('approvalTrendChart');
    var canvas = document.getElementById('approvalTrendChart');
    if (!canvas) return;
    var items = dashboardData.monthlyApprovalTrend || [];
    if (!items.length) return;
    chartInstances['approvalTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: items.map(function(d) { return d.month; }),
            datasets: [{
                label: 'Avg Days to Approval',
                data: items.map(function(d) { return d.avg_days; }),
                borderColor: '#8764b8', backgroundColor: 'rgba(135,100,184,0.1)',
                tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: '#8764b8'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function(ctx) { var item = items[ctx.dataIndex]; return ctx.raw + ' days (' + item.count + ' records)'; } } }
            },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
}

// ================================================================
// RENDER: TRAVEL HOURS TREND
// ================================================================
function renderTravelHoursTrendChart() {
    destroyChart('travelHoursTrendChart');
    var canvas = document.getElementById('travelHoursTrendChart');
    if (!canvas) return;
    var items = dashboardData.monthlyTravelHoursTrend || [];
    if (!items.length) return;
    chartInstances['travelHoursTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: items.map(function(d) { return d.month; }),
            datasets: [{
                label: 'Total Travel Hours',
                data: items.map(function(d) { return d.total_hours; }),
                borderColor: '#00b7c3', backgroundColor: 'rgba(0,183,195,0.1)',
                tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: '#00b7c3'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor(), callback: function(v) { return v + 'h'; } } } }
        }
    });
}

// ================================================================
// RENDER: OCCURRENCE TREND
// ================================================================
function renderOccurrenceTrendChart() {
    destroyChart('occurrenceTrendChart');
    var canvas = document.getElementById('occurrenceTrendChart');
    if (!canvas) return;
    var items = dashboardData.monthlyOccurrenceTrend || [];
    if (!items.length) return;
    chartInstances['occurrenceTrendChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return typeof d.month === 'string' ? d.month.substring(0, 7) : new Date(d.month).toLocaleDateString('en', {year:'numeric', month:'short'}); }),
            datasets: [{
                label: 'Occurrence Reports',
                data: items.map(function(d) { return d.count; }),
                backgroundColor: '#d13438',
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
}

// ================================================================
// RENDER: TRAVEL TREND
// ================================================================
function renderTravelTrendChart() {
    destroyChart('travelTrendChart');
    var canvas = document.getElementById('travelTrendChart');
    if (!canvas) return;
    var items = dashboardData.monthlyTravelTrend || [];
    if (!items.length) return;
    chartInstances['travelTrendChart'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: items.map(function(d) { return typeof d.month === 'string' ? d.month.substring(0, 7) : new Date(d.month).toLocaleDateString('en', {year:'numeric', month:'short'}); }),
            datasets: [{
                label: 'Total KM',
                data: items.map(function(d) { return parseFloat(d.total_km) || 0; }),
                borderColor: '#107c10', backgroundColor: 'rgba(16,124,16,0.1)',
                tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: '#107c10'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
}

// ================================================================
// RENDER: MONTHLY INSPECTIONS TREND
// ================================================================
function renderMonthlyInspectionsTrendChart() {
    destroyChart('monthlyInspectionsTrendChart');
    var canvas = document.getElementById('monthlyInspectionsTrendChart');
    if (!canvas) return;
    var items = dashboardData.monthlyInspectionsTrend || [];
    if (!items.length) return;
    chartInstances['monthlyInspectionsTrendChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return typeof d.month === 'string' ? d.month.substring(0, 7) : new Date(d.month).toLocaleDateString('en', {year:'numeric', month:'short'}); }),
            datasets: [{
                label: 'Inspections',
                data: items.map(function(d) { return d.count; }),
                backgroundColor: '#0078d4',
                borderRadius: 4,
                order: 2,
            }, {
                label: 'Trend',
                data: items.map(function(d) { return d.count; }),
                type: 'line',
                borderColor: '#d13438',
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 3,
                borderWidth: 2,
                order: 1,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: txtColor(), font: { size: 10 } } } },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
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
    renderOccurrenceTrendChart();
    renderTravelChart();
    renderTravelTrendChart();
    renderDocSendChart();
    renderDocSendTrendChart();
    renderInvoiceUploadChart();
    renderInvoiceTrendChart();
    renderCoaTimeChart();
    renderCoaTrendChart();
    renderApprovalTimeChart();
    renderApprovalTrendChart();
    renderTravelTimeChart();
    renderTravelHoursTrendChart();
    renderMonthlyInspectionsTrendChart();
    renderEfficiencyMatrix();
    renderApprovalRateChart();
    renderDailyComplianceChart();
    renderInspectorRadarChart();
    renderInspectorTargetsTable();
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
// EXPORT PDF
// ================================================================
async function exportDashboardPDF() {
    var overlay = document.getElementById('pdfExportOverlay');
    var progressEl = document.getElementById('pdfExportProgress');
    if (overlay) overlay.style.display = 'flex';

    function updateProgress(msg) {
        if (progressEl) progressEl.textContent = msg;
    }

    try {
        var jsPDF = window.jspdf.jsPDF;
        var pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        var pageWidth = 297;
        var pageHeight = 210;
        var margin = 10;
        var contentWidth = pageWidth - (margin * 2);
        var yOffset = margin;

        // Title header
        pdf.setFontSize(18);
        pdf.setTextColor(0, 120, 144);
        pdf.text('Food Safety Agency (Pty) Ltd', pageWidth / 2, yOffset + 8, { align: 'center' });
        pdf.setFontSize(13);
        pdf.setTextColor(80, 80, 80);
        pdf.text('Inspector Analytics Dashboard Report', pageWidth / 2, yOffset + 16, { align: 'center' });
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        var dateStr = 'Generated: ' + new Date().toLocaleDateString('en-ZA') + ' ' + new Date().toLocaleTimeString('en-ZA');
        pdf.text(dateStr, pageWidth / 2, yOffset + 22, { align: 'center' });

        var filterSummary = getFilterSummaryText();
        if (filterSummary) {
            pdf.text('Filters: ' + filterSummary, pageWidth / 2, yOffset + 27, { align: 'center' });
            yOffset += 32;
        } else {
            yOffset += 27;
        }

        // Sections to capture in order
        var sections = [
            { selector: '.kpi-grid', label: 'KPI Summary' },
            { selector: '#complianceBarsContainer', label: 'Compliance Per Commodity', parentCard: true },
            { selector: '#commodityTrendChart', label: 'Commodity Compliance Trend', isChart: true },
            { selector: '#commodityCountChart', label: 'Commodity Count', isChart: true },
            { selector: '#timeAllocationChart', label: 'Time Allocation (Billable Hours)', isChart: true },
            { selector: '#complianceTrendChart', label: 'Weekly Compliance Trend', isChart: true },
            { selector: '#samplesTakenChart', label: 'Samples Taken', isChart: true },
            { selector: '#facilityTypesChart', label: 'Facility Types', isChart: true },
            { selector: '#directionsChart', label: 'Directions & Non-Compliance', isChart: true },
            { selector: '#occurrenceReportsChart', label: 'Occurrence Reports', isChart: true },
            { selector: '#travelChart', label: 'Travel Distance Per Inspector', isChart: true },
            { title: 'Avg Days to Send Documents', label: 'Avg Days to Send Documents' },
            { title: 'Avg Days to Upload Invoice', label: 'Avg Days to Upload Invoice' },
            { title: 'Avg Days: Sample to COA Upload', label: 'Avg Days: Sample to COA Upload' },
            { title: 'Avg Days to Approval', label: 'Avg Days to Approval' },
            { title: 'Travel Time Per Inspector', label: 'Travel Time Per Inspector' },
            { selector: '#efficiencyMatrixTable', label: 'Inspector Efficiency Matrix', parentCard: true },
            { selector: '#approvalRateChart', label: 'Approval Rate Per Inspector', isChart: true },
            { selector: '#financialTable', label: 'Revenue Per Inspector', parentCard: true },
            { selector: '#revenueCostChart', label: 'Revenue Breakdown', isChart: true }
        ];

        for (var i = 0; i < sections.length; i++) {
            var section = sections[i];
            updateProgress('Capturing ' + section.label + ' (' + (i + 1) + '/' + sections.length + ')...');

            if (section.isChart) {
                // Chart.js canvas - use toBase64Image for quality
                var chartKey = section.selector.replace('#', '');
                var chartInstance = chartInstances[chartKey];
                if (chartInstance) {
                    var imgData = chartInstance.toBase64Image('image/png', 1.0);
                    var canvas = document.getElementById(chartKey);
                    if (canvas && canvas.width > 0 && canvas.height > 0) {
                        var aspectRatio = canvas.width / canvas.height;
                        var imgWidth = contentWidth * 0.85;
                        var imgHeight = imgWidth / aspectRatio;
                        if (imgHeight > pageHeight - margin * 2 - 12) {
                            imgHeight = pageHeight - margin * 2 - 12;
                            imgWidth = imgHeight * aspectRatio;
                        }
                        if (yOffset + imgHeight + 12 > pageHeight - margin) {
                            pdf.addPage();
                            yOffset = margin;
                        }
                        pdf.setFontSize(11);
                        pdf.setTextColor(0, 120, 144);
                        pdf.text(section.label, margin, yOffset + 5);
                        yOffset += 8;
                        pdf.addImage(imgData, 'PNG', margin + (contentWidth - imgWidth) / 2, yOffset, imgWidth, imgHeight);
                        yOffset += imgHeight + 6;
                    }
                }
            } else {
                // HTML element - use html2canvas
                var element = null;
                if (section.title) {
                    element = findCardByTitle(section.title);
                } else if (section.selector) {
                    element = document.querySelector(section.selector);
                    if (section.parentCard && element) {
                        element = element.closest('.card') || element;
                    }
                }
                if (element) {
                    try {
                        var canvasImg = await html2canvas(element, {
                            scale: 2,
                            useCORS: true,
                            allowTaint: true,
                            backgroundColor: '#ffffff',
                            logging: false
                        });
                        var imgData = canvasImg.toDataURL('image/png');
                        var aspectRatio = canvasImg.width / canvasImg.height;
                        var imgWidth = contentWidth;
                        var imgHeight = imgWidth / aspectRatio;
                        if (imgHeight > pageHeight - margin * 2 - 10) {
                            imgHeight = pageHeight - margin * 2 - 10;
                            imgWidth = imgHeight * aspectRatio;
                        }
                        if (yOffset + imgHeight + 8 > pageHeight - margin) {
                            pdf.addPage();
                            yOffset = margin;
                        }
                        pdf.addImage(imgData, 'PNG', margin + (contentWidth - imgWidth) / 2, yOffset, imgWidth, imgHeight);
                        yOffset += imgHeight + 6;
                    } catch (e) {
                        console.warn('Could not capture ' + section.label + ':', e);
                    }
                }
            }
            await new Promise(function(resolve) { setTimeout(resolve, 50); });
        }

        // Add page footers
        var totalPages = pdf.internal.getNumberOfPages();
        for (var p = 1; p <= totalPages; p++) {
            pdf.setPage(p);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text('Page ' + p + ' of ' + totalPages + '  |  Food Safety Agency Analytics Report', pageWidth / 2, pageHeight - 5, { align: 'center' });
        }

        updateProgress('Saving PDF...');
        var filename = 'analytics_dashboard_' + new Date().toISOString().slice(0, 10) + '.pdf';
        pdf.save(filename);

    } catch (err) {
        console.error('PDF export error:', err);
        alert('Error generating PDF: ' + err.message);
    } finally {
        if (overlay) overlay.style.display = 'none';
    }
}

function getFilterSummaryText() {
    var f = getFilterValues();
    var parts = [];
    if (f.year !== 'all') parts.push('Year: ' + f.year);
    if (f.month !== 'all') {
        var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        parts.push('Month: ' + monthNames[parseInt(f.month) - 1]);
    }
    if (f.inspector !== 'all') parts.push('Inspector: ' + f.inspector);
    if (f.commodity !== 'all') parts.push('Commodity: ' + f.commodity);
    if (f.date_from) parts.push('From: ' + f.date_from);
    if (f.date_to) parts.push('To: ' + f.date_to);
    return parts.join('  |  ');
}

function findCardByTitle(titleText) {
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
        var header = cards[i].querySelector('.card-title span');
        if (header && header.textContent.trim().indexOf(titleText) !== -1) {
            return cards[i];
        }
    }
    return null;
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

    var pdfBtn = document.getElementById('exportPdfBtn');
    if (pdfBtn) pdfBtn.addEventListener('click', exportDashboardPDF);
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

// ================================================================
// OVERVIEW SECONDARY KPIs
// ================================================================
function renderSecondaryKPIs() {
    // Total KM traveled
    var totalKm = 0;
    (dashboardData.travelPerInspector || []).forEach(function(d) { totalKm += (d.total_km || d.km || 0); });
    var kmEl = document.getElementById('kpiTotalKm');
    if (kmEl) kmEl.textContent = totalKm > 0 ? totalKm.toLocaleString() + ' km' : '—';

    // Total samples
    var totalSamples = 0;
    (dashboardData.samplesByCommodity || []).forEach(function(d) { totalSamples += (d.count || d.samples || 0); });
    var samplesEl = document.getElementById('kpiTotalSamples');
    if (samplesEl) samplesEl.textContent = totalSamples > 0 ? totalSamples.toLocaleString() : '—';

    // Avg days doc send
    var docItems = dashboardData.docSendTime || [];
    var docAvg = docItems.length ? Math.round(docItems.reduce(function(s, d) { return s + (d.avg_days || 0); }, 0) / docItems.length) : null;
    var docEl = document.getElementById('kpiAvgDocSend');
    if (docEl) docEl.textContent = docAvg !== null ? docAvg + ' days' : '—';

    // Avg days approval
    var apprItems = dashboardData.approvalTime || [];
    var apprAvg = apprItems.length ? Math.round(apprItems.reduce(function(s, d) { return s + (d.avg_days || 0); }, 0) / apprItems.length) : null;
    var apprEl = document.getElementById('kpiAvgApproval');
    if (apprEl) apprEl.textContent = apprAvg !== null ? apprAvg + ' days' : '—';

    // Occurrence count
    var occEl = document.getElementById('kpiTotalOccurrences');
    if (occEl) occEl.textContent = dashboardData.totalOccurrenceReports || 0;
}

// ================================================================
// OVERVIEW MIRROR CHARTS (separate canvas IDs from main panel charts)
// ================================================================
function renderOccurrenceTrendOverview() {
    destroyChart('occurrenceTrendChartOverview');
    var canvas = document.getElementById('occurrenceTrendChartOverview');
    if (!canvas) return;
    var items = dashboardData.monthlyOccurrenceTrend || [];
    if (!items.length) return;
    chartInstances['occurrenceTrendChartOverview'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return typeof d.month === 'string' ? d.month.substring(0, 7) : new Date(d.month).toLocaleDateString('en', {year:'numeric', month:'short'}); }),
            datasets: [{ label: 'Occurrences', data: items.map(function(d) { return d.count; }), backgroundColor: '#d13438', borderRadius: 3 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 8 } } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
}

function renderSamplesTakenOverview() {
    destroyChart('samplesTakenChartOverview');
    var canvas = document.getElementById('samplesTakenChartOverview');
    if (!canvas) return;
    var items = dashboardData.samplesByCommodity || [];
    if (!items.length) return;
    var palette = ['#f59e0b', '#0078d4', '#107c10', '#d13438', '#8764b8', '#00b7c3'];
    chartInstances['samplesTakenChartOverview'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return d.commodity || d.label || ''; }),
            datasets: [{ label: 'Samples', data: items.map(function(d) { return d.count || d.samples || 0; }), backgroundColor: items.map(function(_, i) { return palette[i % palette.length]; }), borderRadius: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false }, ticks: { color: txtColor() } }, y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } } }
        }
    });
}

function renderFacilityTypesOverview() {
    destroyChart('facilityTypesChartOverview');
    var canvas = document.getElementById('facilityTypesChartOverview');
    if (!canvas) return;
    var items = dashboardData.facilityTypeDistribution || [];
    if (!items.length) return;
    var palette = ['#0078d4', '#107c10', '#f59e0b', '#d13438', '#8764b8', '#00b7c3', '#e3008c'];
    chartInstances['facilityTypesChartOverview'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: items.map(function(d) { return d.facility_type || d.label || ''; }),
            datasets: [{ data: items.map(function(d) { return d.count || 0; }), backgroundColor: palette, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: txtColor(), font: { size: 10 }, boxWidth: 12, padding: 8 } } }
        }
    });
}

// ================================================================
// PANEL SYSTEM — full-page tabbed dashboard
// ================================================================

// Maps each panel to its render functions
var PANEL_RENDER_MAP = {
    'overview': [
        renderKPIs,
        renderSecondaryKPIs,
        renderComplianceBars,
        renderDailyComplianceChart,
        renderMonthlyInspectionsTrendChart,
        renderApprovalRateChart,
        renderOccurrenceTrendOverview,
        renderSamplesTakenOverview,
        renderFacilityTypesOverview
    ],
    'inspectors': [
        renderInspectorRadarChart,
        renderInspectorTargetsTable,
        renderEfficiencyMatrix,
        renderDirectionsChart
    ],
    'compliance': [
        renderCommodityTrendChart,
        renderComplianceTrendChart,
        renderSamplesTakenChart,
        renderFacilityTypesChart,
        renderCommodityCountChart,
        renderTimeAllocationChart,
        renderOccurrenceReportsChart,
        renderOccurrenceTrendChart
    ],
    'operations': [
        renderTravelChart,
        renderTravelTrendChart,
        renderTravelTimeChart,
        renderTravelHoursTrendChart
    ],
    'documents': [
        renderDocSendChart,
        renderDocSendTrendChart,
        renderInvoiceUploadChart,
        renderInvoiceTrendChart,
        renderCoaTimeChart,
        renderCoaTrendChart,
        renderApprovalTimeChart,
        renderApprovalTrendChart
    ],
    'financial': [
        renderFinancialTable,
        renderRevenueCostChart
    ]
};

// Track which panels have been rendered after the last data load
var panelRendered = {
    'overview': false, 'inspectors': false, 'compliance': false,
    'operations': false, 'documents': false, 'financial': false
};

var currentPanel = 'overview';

function renderPanelCharts(panelId) {
    var fns = PANEL_RENDER_MAP[panelId] || [];
    fns.forEach(function(fn) {
        try { if (typeof fn === 'function') fn(); } catch(e) { /* silent */ }
    });
}

function switchPanel(panelId) {
    if (panelId === currentPanel && panelRendered[panelId]) return;

    // Deactivate current
    var oldPanel = document.getElementById('panel-' + currentPanel);
    var oldTab = document.querySelector('.tab-btn[data-panel="' + currentPanel + '"]');
    if (oldPanel) oldPanel.classList.remove('active');
    if (oldTab) { oldTab.classList.remove('active'); oldTab.setAttribute('aria-selected', 'false'); }

    // Activate new
    currentPanel = panelId;
    var newPanel = document.getElementById('panel-' + panelId);
    var newTab = document.querySelector('.tab-btn[data-panel="' + panelId + '"]');
    if (newPanel) newPanel.classList.add('active');
    if (newTab) { newTab.classList.add('active'); newTab.setAttribute('aria-selected', 'true'); }

    // Lazy render — only render if not yet done since last data load
    if (!panelRendered[panelId]) {
        renderPanelCharts(panelId);
        panelRendered[panelId] = true;
    }

    // Persist active panel in URL hash
    try { history.replaceState(null, '', '#' + panelId); } catch(e) {}
}

// Override renderAll so that after a filter change only the active panel
// re-renders immediately; other panels re-render lazily on next visit.
(function() {
    var _orig = renderAll;
    renderAll = function() {
        // Mark all panels as needing re-render
        Object.keys(panelRendered).forEach(function(p) { panelRendered[p] = false; });
        // Render only the currently visible panel
        renderPanelCharts(currentPanel);
        panelRendered[currentPanel] = true;
        // Always keep KPIs updated regardless of active panel
        try { renderKPIs(); } catch(e) {}
    };
})();

// ================================================================
// PANEL SYSTEM INIT (DOMContentLoaded)
// ================================================================
document.addEventListener('DOMContentLoaded', function() {

    // ----- Panel Tab Switching -----
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            switchPanel(this.getAttribute('data-panel'));
        });
    });

    // Restore panel from URL hash on load
    var hashPanel = location.hash.replace('#', '');
    if (hashPanel && PANEL_RENDER_MAP[hashPanel]) {
        // Defer until after the main DOMContentLoaded has run
        setTimeout(function() { switchPanel(hashPanel); }, 50);
    }


});
