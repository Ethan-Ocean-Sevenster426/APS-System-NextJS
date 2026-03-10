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
// PDF DATA-LABELS PLUGIN  (only active when pdfValueLabels.enabled)
// ================================================================
// Format functions stored outside plugin options (Chart.js calls any fn in options)
var _pdfLabelFormatters = {};
Chart.register({
    id: 'pdfValueLabels',
    afterDatasetsDraw: function(chart) {
        var opts = (chart.options.plugins && chart.options.plugins.pdfValueLabels) || {};
        if (!opts.enabled) return;
        var chartType = chart.config.type;
        var fmtFn = _pdfLabelFormatters[chart.canvas.id];
        var ctx = chart.ctx;
        ctx.save();

        // --- RADAR: label each vertex on the outermost visible dataset ---
        if (chartType === 'radar') {
            ctx.font = 'bold 8px sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            // Pick last visible dataset (typically the target or top layer)
            chart.data.datasets.forEach(function(ds, di) {
                var meta = chart.getDatasetMeta(di);
                if (meta.hidden) return;
                meta.data.forEach(function(pt, idx) {
                    var val = ds.data[idx];
                    if (val == null || typeof val !== 'number') return;
                    var label = fmtFn ? fmtFn(val) : String(Math.round(val));
                    // Offset outward from center
                    var cx = chart.scales.r.xCenter, cy = chart.scales.r.yCenter;
                    var dx = pt.x - cx, dy = pt.y - cy;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var off = dist > 0 ? 10 / dist : 0;
                    ctx.fillText(label, pt.x + dx * off, pt.y + dy * off);
                });
            });
            ctx.restore();
            return;
        }

        // --- STACKED BAR: show totals on top of each stack ---
        var isStacked = chart.options.scales && chart.options.scales.x && chart.options.scales.x.stacked;
        var visibleDS = chart.data.datasets.filter(function(_, i) { return !chart.getDatasetMeta(i).hidden; });
        var isHoriz = chart.options.indexAxis === 'y';

        if (chartType === 'bar' && isStacked && !isHoriz) {
            ctx.font = 'bold 8px sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            var numLabels = chart.data.labels.length;
            for (var li = 0; li < numLabels; li++) {
                var total = 0;
                var topY = Infinity;
                visibleDS.forEach(function(ds, vi) {
                    var val = ds.data[li];
                    if (typeof val === 'number') total += val;
                    var meta = chart.getDatasetMeta(chart.data.datasets.indexOf(ds));
                    if (meta.data[li] && meta.data[li].y < topY) topY = meta.data[li].y;
                });
                if (total > 0) {
                    var label = fmtFn ? fmtFn(total) : String(Math.round(total));
                    var barX = chart.getDatasetMeta(chart.data.datasets.indexOf(visibleDS[0])).data[li].x;
                    ctx.fillText(label, barX, topY - 2);
                }
            }
            ctx.restore();
            return;
        }

        // --- MIXED BAR+LINE (e.g. monthlyInspectionsTrendChart): label bars only ---
        var hasMixedTypes = false;
        chart.data.datasets.forEach(function(ds) { if (ds.type && ds.type !== chartType) hasMixedTypes = true; });
        if (chartType === 'bar' && hasMixedTypes && !isHoriz) {
            ctx.font = 'bold 8px sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            chart.data.datasets.forEach(function(ds, di) {
                if (ds.type === 'line') return; // skip the line overlay
                var meta = chart.getDatasetMeta(di);
                if (meta.hidden) return;
                meta.data.forEach(function(el, idx) {
                    var val = ds.data[idx];
                    if (val == null || val === 0 || typeof val !== 'number') return;
                    ctx.fillText(fmtFn ? fmtFn(val) : String(Math.round(val)), el.x, el.y - 2);
                });
            });
            ctx.restore();
            return;
        }

        // --- GROUPED VERTICAL BAR (multiple datasets, not stacked): skip (too cluttered) ---
        if (chartType === 'bar' && visibleDS.length > 1 && !isHoriz) {
            ctx.restore();
            return;
        }

        // --- LINE CHARTS: show values at data points ---
        if (chartType === 'line') {
            ctx.font = 'bold 7px sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            var multiLine = visibleDS.length > 1;
            // 4-way stagger positions: top-left, top-right, bottom-left, bottom-right
            var staggerPos = [
                { x: -12, y: -6 },   // above-left
                { x:  12, y: -6 },   // above-right
                { x: -12, y:  14 },  // below-left
                { x:  12, y:  14 },  // below-right
            ];
            chart.data.datasets.forEach(function(ds, di) {
                var meta = chart.getDatasetMeta(di);
                if (meta.hidden) return;
                var total = ds.data.length;
                var step = 1;
                if (multiLine && total > 8) {
                    step = Math.max(1, Math.floor(total / 5));
                }
                var pos = staggerPos[di % staggerPos.length];
                meta.data.forEach(function(pt, idx) {
                    if (multiLine && total > 8 && idx !== 0 && idx !== total - 1 && idx % step !== 0) return;
                    var val = ds.data[idx];
                    if (val == null || typeof val !== 'number') return;
                    if (val === 0) return; // skip 0% labels to reduce clutter
                    var label = fmtFn ? fmtFn(val) : String(Math.round(val * 10) / 10);
                    ctx.fillText(label, pt.x + pos.x, pt.y + pos.y);
                });
            });
            ctx.restore();
            return;
        }

        // --- SINGLE-DATASET BAR & HORIZONTAL BAR: label each bar ---
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#1e293b';
        chart.data.datasets.forEach(function(ds, di) {
            var meta = chart.getDatasetMeta(di);
            if (meta.hidden) return;
            meta.data.forEach(function(el, idx) {
                var val = ds.data[idx];
                if (val == null || val === 0 || typeof val !== 'number') return;
                var label = fmtFn ? fmtFn(val) : String(Math.round(val).toLocaleString());
                if (isHoriz) {
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, el.x + 4, el.y);
                } else {
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(label, el.x, el.y - 2);
                }
            });
        });
        ctx.restore();
    }
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
        monthlyInspectorTrend: cfg.monthlyInspectorTrend || [],
        inspectorTargets: cfg.inspectorTargets || {},
        // Phase 2 time data
        docSendTime: cfg.docSendTime || [],
        invoiceUploadTime: cfg.invoiceUploadTime || [],
        coaAnalysisTime: cfg.coaAnalysisTime || [],
        approvalTime: cfg.approvalTime || [],
        travelTimePerInspector: cfg.travelTimePerInspector || [],
    };
    console.log('=== loadInitialData ===');
    console.log('  DJANGO_CONFIG.monthlyInspectorTrend:', cfg.monthlyInspectorTrend);
    console.log('  dashboardData.monthlyInspectorTrend length:', dashboardData.monthlyInspectorTrend ? dashboardData.monthlyInspectorTrend.length : 'undefined/null');
    if (dashboardData.monthlyInspectorTrend && dashboardData.monthlyInspectorTrend.length > 0) {
        console.log('  first 3 items:', JSON.stringify(dashboardData.monthlyInspectorTrend.slice(0, 3)));
    }
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
            monthlyInspectorTrend: data.monthlyInspectorTrend || [],
            inspectorTargets: dashboardData.inspectorTargets || {},
            docSendTime: data.docSendTime || [],
            invoiceUploadTime: data.invoiceUploadTime || [],
            coaAnalysisTime: data.coaAnalysisTime || [],
            approvalTime: data.approvalTime || [],
            travelTimePerInspector: data.travelTimePerInspector || [],
        };
        console.log('=== FILTER: monthlyInspectorTrend from API:', data.monthlyInspectorTrend);
        console.log('=== FILTER: dashboardData.monthlyInspectorTrend:', dashboardData.monthlyInspectorTrend ? dashboardData.monthlyInspectorTrend.length + ' items' : 'MISSING');
        if (data.monthlyInspectorTrend && data.monthlyInspectorTrend.length > 0) {
            console.log('=== FILTER: first 3 items:', JSON.stringify(data.monthlyInspectorTrend.slice(0, 3)));
        }
        console.log('=== FILTER: currentPanel=' + currentPanel + ', panelRendered:', JSON.stringify(panelRendered));
        renderAll();
        console.log('=== FILTER: after renderAll, panelRendered:', JSON.stringify(panelRendered));
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

    // Financial KPIs
    var fin = d.financialSummary || {};
    var kpiRevEl = document.getElementById('kpiTotalRevenue');
    if (kpiRevEl) kpiRevEl.textContent = formatRand(fin.total_revenue);
}

// ================================================================
// RENDER: FINANCIAL TABLE
// ================================================================
// Inspector salary (CTC) defaults - matched by name keywords
var DEFAULT_SALARIES = {
    'adams': 20000, 'dlamini': 21000, 'dlisani': 22256,
    'kuntwane': 21000, 'kabelo': 20900, 'manganye': 21000,
    'maqina': 21000, 'modiba': 20000, 'mokgothu': 20000,
    'mpeluza': 21000, 'ngongo': 21000, 'noe': 26250,
    'ntoyaphi': 20800, 'sekhotho': 20900, 'seloane': 23929.50,
    'steyn': 21735, 'visagie': 36847.14
};

// Non-inspector staff (excluded from salary/profit calculations)
var NON_INSPECTORS = ['mpho motaung', 'test inspector'];

// Load saved salaries from localStorage, fallback to defaults
function loadSalaries() {
    try {
        var saved = localStorage.getItem('inspector_salaries');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {};
}
var SAVED_SALARIES = loadSalaries();

// S&T / Guesthouse & other expenses - stored as a log of entries
function loadExpenseLog() {
    try {
        var saved = localStorage.getItem('inspector_expense_log');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
}
var EXPENSE_LOG = loadExpenseLog();

function saveExpenseLog() {
    localStorage.setItem('inspector_expense_log', JSON.stringify(EXPENSE_LOG));
}

function getInspectorExpenses(name) {
    if (!name) return 0;
    var lower = name.toLowerCase();
    var total = 0;
    EXPENSE_LOG.forEach(function(entry) {
        if (entry.inspector.toLowerCase() === lower) {
            total += parseFloat(entry.amount) || 0;
        }
    });
    return total;
}

function getInspectorExpenseEntries(name) {
    if (!name) return [];
    var lower = name.toLowerCase();
    return EXPENSE_LOG.filter(function(entry) {
        return entry.inspector.toLowerCase() === lower;
    });
}

function addExpense(inspector, amount, description, date) {
    EXPENSE_LOG.push({
        id: Date.now(),
        inspector: inspector,
        amount: parseFloat(amount) || 0,
        description: description || '',
        date: date || new Date().toISOString().split('T')[0]
    });
    saveExpenseLog();
}

function deleteExpense(id) {
    EXPENSE_LOG = EXPENSE_LOG.filter(function(e) { return e.id !== id; });
    saveExpenseLog();
}

function getInspectorSalary(name) {
    if (!name) return 0;
    var lower = name.toLowerCase();
    // Exclude non-inspectors
    for (var n = 0; n < NON_INSPECTORS.length; n++) {
        if (lower.indexOf(NON_INSPECTORS[n]) !== -1) return 0;
    }
    // Check saved overrides first
    if (SAVED_SALARIES[lower] !== undefined) return SAVED_SALARIES[lower];
    // Fallback to defaults
    var keys = Object.keys(DEFAULT_SALARIES);
    for (var i = 0; i < keys.length; i++) {
        if (lower.indexOf(keys[i]) !== -1) return DEFAULT_SALARIES[keys[i]];
    }
    return 0;
}

// Salary edit modal functions
function openSalaryModal() {
    var modal = document.getElementById('salaryModal');
    var body = document.getElementById('salaryModalBody');
    if (!modal || !body) return;
    var items = dashboardData.inspectorFinancials || [];
    var html = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">';
    items.forEach(function(item) {
        var name = item.inspector_name || '';
        var lower = name.toLowerCase();
        var isNonInspector = false;
        for (var n = 0; n < NON_INSPECTORS.length; n++) {
            if (lower.indexOf(NON_INSPECTORS[n]) !== -1) { isNonInspector = true; break; }
        }
        if (isNonInspector) return;
        var salary = getInspectorSalary(name);
        html += '<div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px;">' +
            '<label style="display:block; font-size:12px; font-weight:600; color:#374151; margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + name + '">' + name + '</label>' +
            '<div style="position:relative;">' +
            '<span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:12px; color:#9ca3af; pointer-events:none;">R</span>' +
            '<input type="number" step="0.01" min="0" value="' + (salary || '') + '" data-inspector="' + lower + '" class="salary-input" ' +
            'style="width:100%; box-sizing:border-box; padding:7px 10px 7px 26px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; text-align:right; outline:none; transition:border 0.2s;" ' +
            'onfocus="this.style.borderColor=\'#007890\'" onblur="this.style.borderColor=\'#d1d5db\'">' +
            '</div></div>';
    });
    html += '</div>';
    body.innerHTML = html;
    document.getElementById('salarySaveStatus').innerHTML = '';
    modal.style.display = 'flex';
}

function closeSalaryModal() {
    document.getElementById('salaryModal').style.display = 'none';
}

function saveSalaries() {
    var salaryInputs = document.querySelectorAll('#salaryModalBody .salary-input');
    var savedSalaries = loadSalaries();
    salaryInputs.forEach(function(inp) {
        var key = inp.getAttribute('data-inspector');
        var val = parseFloat(inp.value);
        if (!isNaN(val) && val >= 0) {
            savedSalaries[key] = val;
        }
    });
    localStorage.setItem('inspector_salaries', JSON.stringify(savedSalaries));
    SAVED_SALARIES = savedSalaries;
    renderFinancialTable();
    document.getElementById('salarySaveStatus').innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Salaries saved successfully</span>';
    setTimeout(function() { closeSalaryModal(); }, 800);
}

// ================================================================
// EXPENSE LOG MODAL
// ================================================================
function openExpenseModal() {
    var modal = document.getElementById('expenseModal');
    if (!modal) return;
    renderExpenseList();
    modal.style.display = 'flex';
}

function closeExpenseModal() {
    document.getElementById('expenseModal').style.display = 'none';
}

function renderExpenseList() {
    var listEl = document.getElementById('expenseList');
    if (!listEl) return;
    var entries = EXPENSE_LOG.slice().sort(function(a, b) { return b.id - a.id; });

    if (entries.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#9ca3af;">No expenses logged yet. Use the form above to add one.</div>';
        return;
    }

    var html = '<table style="width:100%; border-collapse:collapse; font-size:12px;">' +
        '<thead><tr style="border-bottom:2px solid #e5e7eb;">' +
        '<th style="text-align:left; padding:6px; font-weight:600;">Date</th>' +
        '<th style="text-align:left; padding:6px; font-weight:600;">Inspector</th>' +
        '<th style="text-align:left; padding:6px; font-weight:600;">Description</th>' +
        '<th style="text-align:right; padding:6px; font-weight:600;">Amount (R)</th>' +
        '<th style="text-align:center; padding:6px; font-weight:600; width:40px;"></th>' +
        '</tr></thead><tbody>';

    entries.forEach(function(entry) {
        html += '<tr style="border-bottom:1px solid #f3f4f6;">' +
            '<td style="padding:6px; white-space:nowrap;">' + (entry.date || '-') + '</td>' +
            '<td style="padding:6px;">' + (entry.inspector || '-') + '</td>' +
            '<td style="padding:6px; color:#6b7280;">' + (entry.description || '-') + '</td>' +
            '<td style="padding:6px; text-align:right; font-weight:500;">R' + (entry.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
            '<td style="padding:6px; text-align:center;"><button onclick="removeExpense(' + entry.id + ')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:14px;" title="Delete"><i class="fas fa-trash-alt"></i></button></td>' +
            '</tr>';
    });
    html += '</tbody></table>';
    listEl.innerHTML = html;
}

function submitExpense() {
    var inspector = document.getElementById('expenseInspector').value;
    var amount = document.getElementById('expenseAmount').value;
    var desc = document.getElementById('expenseDesc').value;
    var date = document.getElementById('expenseDate').value;

    if (!inspector || !amount) {
        alert('Please select an inspector and enter an amount.');
        return;
    }

    addExpense(inspector, amount, desc, date);
    renderExpenseList();
    renderFinancialTable();

    // Clear form
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expenseSaveStatus').innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Expense added</span>';
    setTimeout(function() { document.getElementById('expenseSaveStatus').innerHTML = ''; }, 2000);
}

function removeExpense(id) {
    if (!confirm('Delete this expense entry?')) return;
    deleteExpense(id);
    renderExpenseList();
    renderFinancialTable();
}

// Financial period filter - client-side filter on inspectionsList then recompute financials
function applyFinancialPeriod() {
    var sel = document.getElementById('financialPeriod');
    if (!sel) return;
    var val = sel.value;

    // "All Time" = show original unfiltered data
    if (val === 'all') {
        // Restore original financials from DJANGO_CONFIG
        var cfg = window.DJANGO_CONFIG;
        dashboardData.inspectorFinancials = cfg.inspectorFinancials || [];
        renderFinancialTable();
        return;
    }

    // Calculate date boundaries
    var today = new Date();
    today.setHours(23, 59, 59, 999);
    var fromDate = null;
    var toDate = null;

    if (val === 'daily') {
        fromDate = new Date(today);
        fromDate.setHours(0, 0, 0, 0);
        toDate = today;
    } else if (val === 'weekly') {
        var weekStart = new Date(today);
        var day = today.getDay();
        weekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
        weekStart.setHours(0, 0, 0, 0);
        fromDate = weekStart;
        toDate = today;
    } else if (val === '120+') {
        var cutoff = new Date(today);
        cutoff.setDate(today.getDate() - 120);
        cutoff.setHours(23, 59, 59, 999);
        fromDate = null;
        toDate = cutoff;
    } else {
        var days = parseInt(val);
        var start = new Date(today);
        start.setDate(today.getDate() - days);
        start.setHours(0, 0, 0, 0);
        fromDate = start;
        toDate = today;
    }

    // Use lightweight date+inspector list for filtering (all inspections, not capped)
    var allDates = window.DJANGO_CONFIG.inspectionDatesList || [];
    var cfg = window.DJANGO_CONFIG;

    // Count inspections per inspector in the date range
    // Convert boundaries to YYYY-MM-DD strings for reliable comparison (avoids timezone issues)
    var fromStr = fromDate ? fromDate.getFullYear() + '-' + String(fromDate.getMonth()+1).padStart(2,'0') + '-' + String(fromDate.getDate()).padStart(2,'0') : null;
    var toStr = toDate ? toDate.getFullYear() + '-' + String(toDate.getMonth()+1).padStart(2,'0') + '-' + String(toDate.getDate()).padStart(2,'0') : null;

    var byInspector = {};
    allDates.forEach(function(item) {
        var dateStr = item[0];
        var name = item[1];
        if (!dateStr || !name) return;
        // Compare as strings (YYYY-MM-DD format sorts correctly)
        var dStr = dateStr.substring(0, 10);
        if (fromStr && dStr < fromStr) return;
        if (toStr && dStr > toStr) return;
        if (!byInspector[name]) byInspector[name] = 0;
        byInspector[name]++;
    });

    console.log('[Period Filter] value:', val, '| fromStr:', fromStr, '| toStr:', toStr, '| total dates:', allDates.length, '| matched inspectors:', Object.keys(byInspector).length, '| matches:', JSON.stringify(byInspector));

    // Scale from full financials proportionally based on inspection count ratio
    // Only show inspectors who had inspections in this period
    var fullFinancials = cfg.inspectorFinancials || [];
    var result = [];
    fullFinancials.forEach(function(full) {
        var name = full.inspector_name;
        var partialCount = byInspector[name] || 0;
        if (partialCount === 0) return; // Skip inspectors with no inspections in this period
        var ratio = partialCount / (full.total_inspections || 1);
        result.push({
            inspector_name: name,
            total_inspections: partialCount,
            total_hours: Math.round(full.total_hours * ratio * 10) / 10,
            total_km: Math.round(full.total_km * ratio * 10) / 10,
            inspection_time: Math.round((full.inspection_time || 0) * ratio * 10) / 10,
            revenue_hours: Math.round(full.revenue_hours * ratio),
            revenue_km: Math.round(full.revenue_km * ratio),
            revenue_samples: Math.round(full.revenue_samples * ratio),
            total_revenue: Math.round(full.total_revenue * ratio),
        });
    });
    dashboardData.inspectorFinancials = result;
    renderFinancialTable();
}

function renderFinancialTable() {
    var tbody = document.getElementById('financialTableBody');
    if (!tbody) return;
    var items = dashboardData.inspectorFinancials || [];
    if (items.length === 0) {
        var periodSel = document.getElementById('financialPeriod');
        var periodLabel = periodSel ? periodSel.options[periodSel.selectedIndex].text : '';
        var msg = periodLabel && periodLabel !== 'All Time'
            ? 'No inspections found for <b>' + periodLabel + '</b>. Try a different period.'
            : 'No financial data';
        tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;padding:20px;color:var(--fluent-text-tertiary)">' + msg + '</td></tr>';
        return;
    }

    // Role-based filtering: inspectors see only their own row
    var userRole = (window.DJANGO_CONFIG && window.DJANGO_CONFIG.userRole) || '';
    var userName = (window.DJANGO_CONFIG && window.DJANGO_CONFIG.userName) || '';
    var filteredItems = items;
    if (userRole === 'inspector' && userName) {
        filteredItems = items.filter(function(item) {
            var inspName = (item.inspector_name || '').toLowerCase();
            return inspName.indexOf(userName.toLowerCase()) !== -1;
        });
    }

    var KM_RATE = 4.50;
    var html = '';
    var totals = { inspections: 0, hours: 0, km: 0, kmCost: 0, inspTime: 0, revHours: 0, revKm: 0, revSamples: 0, total: 0, salary: 0, expenses: 0, mgmtFees: 0, totalCost: 0, profit: 0 };
    var shaded = 'background:rgba(0,120,144,0.06);';
    var profitShade = 'background:rgba(16,185,129,0.06);';

    filteredItems.forEach(function(item) {
        var hrs = parseFloat(item.total_hours || 0);
        var km = parseFloat(item.total_km || 0);
        var kmCost = km * KM_RATE;
        var inspTime = parseFloat(item.inspection_time || 0);
        var revH = item.revenue_hours || 0;
        var revK = item.revenue_km || 0;
        var revS = item.revenue_samples || 0;
        var tot = item.total_revenue || 0;
        var salary = getInspectorSalary(item.inspector_name);
        var expenses = getInspectorExpenses(item.inspector_name);
        var mgmtFees = Math.round((salary + expenses) * 0.20);
        var totalCost = salary + expenses + mgmtFees;
        var profit = totalCost ? tot - totalCost : 0;
        var profitColor = profit >= 0 ? '#10b981' : '#ef4444';

        // Profitability metrics
        var revPerHr = hrs > 0 ? tot / hrs : 0;
        var costPerHr = hrs > 0 ? totalCost / hrs : 0;

        totals.inspections += item.total_inspections || 0;
        totals.hours += hrs;
        totals.km += km;
        totals.kmCost += kmCost;
        totals.inspTime += inspTime;
        totals.revHours += revH;
        totals.revKm += revK;
        totals.revSamples += revS;
        totals.total += tot;
        totals.salary += salary;
        totals.expenses += expenses;
        totals.mgmtFees += mgmtFees;
        totals.totalCost += totalCost;
        if (totalCost) totals.profit += profit;

        html += '<tr>' +
            '<td class="fin-sticky-col">' + (item.inspector_name || '-') + '</td>' +
            '<td class="num">' + (item.total_inspections || 0) + '</td>' +
            '<td class="num">' + hrs.toFixed(1) + '</td>' +
            '<td class="num">' + (km ? Math.round(km).toLocaleString() : '-') + '</td>' +
            '<td class="num">' + (km ? formatRand(kmCost) : '—') + '</td>' +
            '<td class="num">' + (inspTime ? inspTime.toFixed(1) : '-') + '</td>' +
            '<td class="num">' + formatRand(revH) + '</td>' +
            '<td class="num">' + formatRand(revK) + '</td>' +
            '<td class="num">' + formatRand(revS) + '</td>' +
            '<td class="num" style="font-weight:600;">' + formatRand(tot) + '</td>' +
            '<td class="num" style="' + shaded + '">' + (salary ? formatRand(salary) : '—') + '</td>' +
            '<td class="num" style="' + shaded + '">' + (expenses ? formatRand(expenses) : '—') + '</td>' +
            '<td class="num" style="' + shaded + '">' + (mgmtFees ? formatRand(mgmtFees) : '—') + '</td>' +
            '<td class="num" style="' + shaded + 'font-weight:600;">' + (totalCost ? formatRand(totalCost) : '—') + '</td>' +
            '<td class="num" style="' + profitShade + '">' + (hrs > 0 ? formatRand(revPerHr) : '—') + '</td>' +
            '<td class="num" style="' + profitShade + '">' + (hrs > 0 ? formatRand(costPerHr) : '—') + '</td>' +
            '<td class="num" style="' + profitShade + 'font-weight:700;color:' + profitColor + ';">' + (totalCost ? formatRand(profit) : '—') + '</td>' +
        '</tr>';
    });

    // Total row
    var totRevPerHr = totals.hours > 0 ? totals.total / totals.hours : 0;
    var totCostPerHr = totals.hours > 0 ? totals.totalCost / totals.hours : 0;
    html += '<tr class="total-row">' +
        '<td class="fin-sticky-col">Total</td>' +
        '<td class="num">' + totals.inspections + '</td>' +
        '<td class="num">' + totals.hours.toFixed(1) + '</td>' +
        '<td class="num">' + Math.round(totals.km).toLocaleString() + '</td>' +
        '<td class="num">' + formatRand(totals.kmCost) + '</td>' +
        '<td class="num">' + totals.inspTime.toFixed(1) + '</td>' +
        '<td class="num">' + formatRand(totals.revHours) + '</td>' +
        '<td class="num">' + formatRand(totals.revKm) + '</td>' +
        '<td class="num">' + formatRand(totals.revSamples) + '</td>' +
        '<td class="num" style="font-weight:600;">' + formatRand(totals.total) + '</td>' +
        '<td class="num" style="' + shaded + '">' + formatRand(totals.salary) + '</td>' +
        '<td class="num" style="' + shaded + '">' + formatRand(totals.expenses) + '</td>' +
        '<td class="num" style="' + shaded + '">' + formatRand(totals.mgmtFees) + '</td>' +
        '<td class="num" style="' + shaded + 'font-weight:600;">' + formatRand(totals.totalCost) + '</td>' +
        '<td class="num" style="' + profitShade + '">' + formatRand(totRevPerHr) + '</td>' +
        '<td class="num" style="' + profitShade + '">' + formatRand(totCostPerHr) + '</td>' +
        '<td class="num" style="' + profitShade + 'font-weight:700;color:' + (totals.profit >= 0 ? '#10b981' : '#ef4444') + ';">' + formatRand(totals.profit) + '</td>' +
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
    // Raw quantities for labels
    var rawHours = items.map(function(i) { return parseFloat(i.total_hours || 0); });
    var rawKm = items.map(function(i) { return parseFloat(i.total_km || 0); });
    var rawSamples = items.map(function(i) { return parseInt(i.total_samples || 0); });

    // Dynamic height based on inspector count
    var minHeight = Math.max(320, items.length * 30 + 60);
    canvas.parentElement.style.minHeight = minHeight + 'px';

    // Compute totals per inspector for labels
    var totals = items.map(function(i) { return (i.revenue_hours || 0) + (i.revenue_km || 0) + (i.revenue_samples || 0); });

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
        plugins: [{
            id: 'revenueCostLabels',
            afterDatasetsDraw: function(chart) {
                var ctx = chart.ctx;
                ctx.save();
                ctx.font = 'bold 8px sans-serif';
                ctx.textBaseline = 'bottom';
                ctx.textAlign = 'center';
                var rawArrays = [rawHours, rawKm, rawSamples];
                var labelColors = ['#0a5a0a', '#004a8a', '#8a6500'];
                chart.data.datasets.forEach(function(ds, di) {
                    var meta = chart.getDatasetMeta(di);
                    if (meta.hidden) return;
                    ctx.fillStyle = labelColors[di];
                    meta.data.forEach(function(bar, idx) {
                        var val = ds.data[idx];
                        if (val == null || val === 0) return;
                        var raw = rawArrays[di] ? rawArrays[di][idx] : 0;
                        var label;
                        if (di === 0) label = Math.round(raw) + 'h';
                        else if (di === 1) label = Math.round(raw) + 'km';
                        else label = String(Math.round(raw));
                        ctx.fillText(label, bar.x, bar.y - 2);
                    });
                });
                ctx.restore();
            }
        }],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: txtColor(), padding: 12 } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            var di = ctx.datasetIndex;
                            var idx = ctx.dataIndex;
                            var rand = 'R' + Math.round(ctx.parsed.y).toLocaleString();
                            var rawVal = [rawHours, rawKm, rawSamples][di][idx];
                            var unit = di === 0 ? Math.round(rawVal) + ' hours' : di === 1 ? Math.round(rawVal) + ' km' : Math.round(rawVal) + ' samples';
                            return ctx.dataset.label + ': ' + rand + ' (' + unit + ')';
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: txtColor(), maxRotation: 45, font: { size: 10 }, autoSkip: false } },
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
                { label: 'Non-Compliant', data: items.map(function(i) { return i.non_compliant_products || 0; }), backgroundColor: '#d13438', borderRadius: 2 },
                { label: 'Compliant', data: items.map(function(i) { return i.total - (i.non_compliant_products || 0); }), backgroundColor: '#107c10', borderRadius: 2 },
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
    var items = (dashboardData.travelPerInspector || []).sort(function(a, b) { return parseFloat(b.total_km || 0) - parseFloat(a.total_km || 0); });
    if (items.length === 0) return;

    // Dynamically size canvas so every inspector gets enough space
    var barH = 32;
    var minHeight = items.length * barH + 60;
    canvas.parentElement.style.minHeight = minHeight + 'px';

    chartInstances['travelChart'] = new Chart(canvas, {
        type: 'bar',
        data: { labels: items.map(function(i) { return i.inspector_name; }), datasets: [{ label: 'KM', data: items.map(function(i) { return parseFloat(i.total_km || 0); }), backgroundColor: '#007890', borderRadius: 4, barPercentage: 0.55, categoryPercentage: 0.8 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 }, autoSkip: false } } } }
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
// DEFAULT INSPECTOR TARGETS (Q1: Jan-Mar 2026) — overridden per-inspector from DB
// ================================================================
var DEFAULT_TARGETS = {
    eggs: 0, poultry: 0, raw: 0, pmp: 0,
    raw_samples: 0, pmp_samples: 0, total_samples: 0
};

// Legacy format for backward compat with radar chart
var INSPECTOR_TARGETS = {
    inspections: { EGGS: 0, POULTRY: 0, RAW: 0, PMP: 0 },
    sampling: { RAW: 0, PMP: 0 }
};
var SAMPLING_TOTAL_TARGET = 0;

function getTargetsForInspector(name) {
    var custom = (dashboardData.inspectorTargets || {})[name];
    if (custom) {
        return {
            inspections: { EGGS: custom.eggs, POULTRY: custom.poultry, RAW: custom.raw, PMP: custom.pmp },
            sampling: { RAW: custom.raw_samples, PMP: custom.pmp_samples },
            totalSamples: custom.total_samples
        };
    }
    return {
        inspections: INSPECTOR_TARGETS.inspections,
        sampling: INSPECTOR_TARGETS.sampling,
        totalSamples: SAMPLING_TOTAL_TARGET
    };
}

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
    // For "all" view, grab the first inspector's quarterly target (all share same targets)
    var radarTargets;
    if (selectedInspector && selectedInspector !== 'all') {
        radarTargets = getEffectiveTarget(selectedInspector);
    } else {
        var qt = _currentQuarterTargets();
        var qtKeys = Object.keys(qt);
        if (qtKeys.length > 0) {
            radarTargets = getEffectiveTarget(qtKeys[0]);
        } else {
            radarTargets = getEffectiveTarget('');
        }
    }
    var labels = ['Eggs Insp.', 'Poultry Insp.', 'RAW Insp.', 'PMP Insp.', 'RAW Samples', 'PMP Samples'];
    var targetData = [
        radarTargets.inspections.EGGS,
        radarTargets.inspections.POULTRY,
        radarTargets.inspections.RAW,
        radarTargets.inspections.PMP,
        radarTargets.sampling.RAW,
        radarTargets.sampling.PMP
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

    // Build lookups from travelPerInspector (total counts, KM, hours)
    var kmLookup = {};
    var hoursLookup = {};
    var inspCountLookup = {};
    (dashboardData.travelPerInspector || []).forEach(function(item) {
        kmLookup[item.inspector_name] = item.total_km || 0;
        hoursLookup[item.inspector_name] = item.total_hours || 0;
        inspCountLookup[item.inspector_name] = item.inspection_count || 0;
    });

    // Ensure inspectors from travelPerInspector are included even if they have no commodity data
    Object.keys(inspCountLookup).forEach(function(name) {
        if (!inspectors[name]) inspectors[name] = { inspections: {}, samples: {} };
    });
    inspectorNames = Object.keys(inspectors).sort();

    // Discover any additional commodities beyond the fixed 4
    var knownCommodities = ['EGGS', 'EGG', 'POULTRY', 'RAW', 'PMP'];
    var otherCommodities = new Set();
    inspectorNames.forEach(function(name) {
        Object.keys(inspectors[name].inspections).forEach(function(c) {
            if (knownCommodities.indexOf(c) === -1) otherCommodities.add(c);
        });
    });
    var otherList = Array.from(otherCommodities).sort();
    var hasOther = otherList.length > 0;

    // Build header: Inspector | Total | Eggs | Poultry | RAW | PMP | [Other] || RAW Samples | PMP Samples | Total Samples || KM | Hours
    var headerHtml = '<th style="min-width:110px;">Inspector</th>' +
        '<th class="num">Total</th>' +
        '<th class="num" style="border-left:2px solid #d1d5db;">Eggs<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.inspections.EGGS + '</small></th>' +
        '<th class="num">Poultry<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.inspections.POULTRY + '</small></th>' +
        '<th class="num">RAW<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.inspections.RAW + '</small></th>' +
        '<th class="num">PMP<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.inspections.PMP + '</small></th>';
    if (hasOther) {
        otherList.forEach(function(c) {
            headerHtml += '<th class="num">' + c + '</th>';
        });
    }
    headerHtml +=
        '<th class="num" style="border-left:2px solid #d1d5db;">RAW Samples<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.sampling.RAW + '</small></th>' +
        '<th class="num">PMP Samples<br><small style="color:#888;">/ ' + INSPECTOR_TARGETS.sampling.PMP + '</small></th>' +
        '<th class="num">Total Samples<br><small style="color:#888;">/ ' + SAMPLING_TOTAL_TARGET + '</small></th>' +
        '<th class="num" style="border-left:2px solid #d1d5db;">KM</th>' +
        '<th class="num">Hours</th>';
    headerRow.innerHTML = headerHtml;

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
        // Use travelPerInspector count as the true total (includes inspections without commodity)
        var totalInsp = inspCountLookup[name] || 0;
        // Fallback: if no travelPerInspector data, sum all commodity counts
        if (!totalInsp) {
            Object.keys(d.inspections).forEach(function(k) { totalInsp += d.inspections[k] || 0; });
        }
        var km = kmLookup[name] || 0;
        var hours = hoursLookup[name] || 0;
        var rawSamples = d.samples['RAW'] || 0;
        var pmpSamples = d.samples['PMP'] || 0;
        var totalSamples = 0;
        Object.keys(d.samples).forEach(function(k) { totalSamples += d.samples[k] || 0; });

        var t = getTargetsForInspector(name);
        html += '<tr><td style="font-weight:600; white-space:nowrap;">' + name + '</td>';
        // Total first
        html += '<td class="num" style="font-weight:700;">' + totalInsp + '</td>';
        // Commodity breakdown (per-inspector targets)
        html += cell(eggs, t.inspections.EGGS).replace('style="', 'style="border-left:2px solid #d1d5db; ');
        html += cell(poultry, t.inspections.POULTRY);
        html += cell(raw, t.inspections.RAW);
        html += cell(pmp, t.inspections.PMP);
        if (hasOther) {
            otherList.forEach(function(c) {
                var count = d.inspections[c] || 0;
                html += '<td class="num">' + (count || '-') + '</td>';
            });
        }
        // Samples (per-inspector targets)
        html += cell(rawSamples, t.sampling.RAW).replace('style="', 'style="border-left:2px solid #d1d5db; ');
        html += cell(pmpSamples, t.sampling.PMP);
        html += cell(totalSamples, t.totalSamples);
        // Activity
        html += '<td class="num" style="border-left:2px solid #d1d5db;">' + (km ? km.toLocaleString(undefined, {maximumFractionDigits: 0}) : '-') + '</td>';
        html += '<td class="num">' + (hours ? parseFloat(hours).toLocaleString(undefined, {maximumFractionDigits: 1}) : '-') + '</td>';
        html += '</tr>';
    });
    tbody.innerHTML = html;
}

// ================================================================
// RENDER: INSPECTOR PERFORMANCE TREND (multi-line over time)
// ================================================================
var inspectorTrendChartType = 'line';

function setInspectorTrendChartType(type) {
    inspectorTrendChartType = type;
    var toggle = document.getElementById('inspectorTrendChartTypeToggle');
    if (toggle) {
        var buttons = toggle.querySelectorAll('button');
        buttons.forEach(function(btn) {
            if (btn.getAttribute('data-chart-type') === type) {
                btn.style.background = '#007890';
                btn.style.color = '#fff';
            } else {
                btn.style.background = '#f9fafb';
                btn.style.color = '#374151';
            }
        });
    }
    renderInspectorTrendChart();
}

function renderInspectorTrendChart() {
    console.log('=== renderInspectorTrendChart START ===');
    try {
    destroyChart('inspectorTrendChart');
    var canvas = document.getElementById('inspectorTrendChart');
    console.log('  canvas element:', canvas);
    if (!canvas) { console.log('  ABORT: no canvas element found'); return; }

    console.log('  dashboardData.monthlyInspectorTrend:', dashboardData.monthlyInspectorTrend);
    var items = dashboardData.monthlyInspectorTrend || [];
    console.log('  items length:', items.length);
    if (items.length > 0) {
        console.log('  first 3 items:', JSON.stringify(items.slice(0, 3)));
    }
    if (items.length === 0) { console.log('  ABORT: items array is empty'); return; }

    var metricSelect = document.getElementById('inspectorTrendMetricSelect');
    var metric = metricSelect ? metricSelect.value : 'count';
    console.log('  selected metric:', metric);
    var metricLabels = { count: 'Inspections', total_km: 'KM Traveled', total_hours: 'Hours', samples: 'Samples' };

    // Build inspector -> date -> value map (daily granularity, same as Daily Compliance Trend)
    var inspectorMap = {};
    var dateSet = new Set();
    items.forEach(function(item, i) {
        // Backend sends 'day' field from TruncDay
        var rawDate = item.day || item.month || '';
        var dateKey = rawDate ? (typeof rawDate === 'string' ? rawDate.substring(0, 10) : '') : '';
        if (i < 3) {
            console.log('  item[' + i + ']: day raw=' + JSON.stringify(rawDate) + ', parsed=' + dateKey + ', inspector=' + item.inspector_name + ', ' + metric + '=' + item[metric]);
        }
        if (!dateKey) return;
        var name = item.inspector_name || 'Unknown';
        dateSet.add(dateKey);
        if (!inspectorMap[name]) inspectorMap[name] = {};
        inspectorMap[name][dateKey] = parseFloat(item[metric] || 0);
    });

    var dates = Array.from(dateSet).sort();
    console.log('  unique dates:', dates);
    var mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var labels = dates.map(function(d) {
        var dt = new Date(d + 'T00:00:00');
        var end = new Date(dt); end.setDate(end.getDate() + 6);
        return mNames[dt.getMonth()] + ' ' + dt.getDate() + ' - ' + mNames[end.getMonth()] + ' ' + end.getDate();
    });

    var inspectorNames = Object.keys(inspectorMap).sort();
    console.log('  inspectors found:', inspectorNames);

    // Multi-line/bar chart
    var isBar = inspectorTrendChartType === 'bar';
    var datasets = [];

    if (isBar) {
        // Flat bar chart: one bar per inspector per week, grouped by week label
        var flatLabels = [];
        var flatValues = [];
        var flatColors = [];
        var flatInspectorNames = [];
        var inspectorColorMap = {};
        inspectorNames.forEach(function(name, idx) {
            inspectorColorMap[name] = CHART_PALETTE[idx % CHART_PALETTE.length];
        });
        dates.forEach(function(d, di) {
            // Add spacer between week groups
            if (di > 0) {
                flatLabels.push('');
                flatValues.push(null);
                flatColors.push('transparent');
                flatInspectorNames.push('');
            }
            var weekLabel = labels[di];
            var first = true;
            inspectorNames.forEach(function(name) {
                var val = inspectorMap[name][d] || 0;
                if (val > 0) {
                    flatLabels.push(first ? weekLabel : '');
                    first = false;
                    flatValues.push(val);
                    flatColors.push(inspectorColorMap[name]);
                    flatInspectorNames.push(name);
                }
            });
        });
        labels = flatLabels;
        datasets = [{
            data: flatValues,
            backgroundColor: flatColors,
            borderWidth: 0,
            barThickness: 20,
        }];
    } else {
        inspectorNames.forEach(function(name, idx) {
            var color = CHART_PALETTE[idx % CHART_PALETTE.length];
            var ds = {
                label: name,
                data: dates.map(function(d) { return inspectorMap[name][d] || 0; }),
                borderColor: color,
                backgroundColor: 'transparent',
                borderWidth: 2.5,
                fill: false,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
            };
            datasets.push(ds);
        });
    }

    console.log('  isBar:', isBar, 'inspectorTrendChartType:', inspectorTrendChartType);
    var chartOptions;
    var barLabelPlugin = {
        id: 'inspectorBarLabels',
        afterDatasetsDraw: function(chart) {
            var ctx = chart.ctx;
            var meta = chart.getDatasetMeta(0);
            if (meta.hidden) return;
            // Detect bar height to scale font
            var barH = 20;
            if (meta.data.length > 1) barH = Math.abs(meta.data[1].y - meta.data[0].y);
            var fontSize = Math.max(7, Math.min(11, Math.floor(barH * 0.7)));
            meta.data.forEach(function(bar, index) {
                var val = chart.data.datasets[0].data[index];
                if (!val) return;
                var name = flatInspectorNames[index] || '';
                var barWidth = bar.x - bar.base;
                // Inspector name inside bar (if it fits)
                ctx.save();
                ctx.font = 'bold ' + fontSize + 'px sans-serif';
                ctx.textBaseline = 'middle';
                var nameWidth = ctx.measureText(name).width;
                if (barWidth > nameWidth + 8) {
                    // Full name fits inside bar
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'left';
                    ctx.fillText(name, bar.base + 4, bar.y);
                } else {
                    // Name doesn't fit - draw it bold dark after the value
                    var valText = val.toLocaleString();
                    if (metric === 'total_km') valText = val.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' km';
                    if (metric === 'total_hours') valText = val.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' hrs';
                    var valWidth = ctx.measureText(valText + '  ').width;
                    ctx.fillStyle = '#64748b';
                    ctx.textAlign = 'left';
                    ctx.font = fontSize + 'px sans-serif';
                    ctx.fillText(name, bar.x + 4 + valWidth, bar.y);
                }
                ctx.restore();
                // Value at end of bar
                ctx.save();
                ctx.fillStyle = txtColor();
                ctx.font = 'bold ' + fontSize + 'px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                var valText2 = val.toLocaleString();
                if (metric === 'total_km') valText2 = val.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' km';
                if (metric === 'total_hours') valText2 = val.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' hrs';
                ctx.fillText(valText2, bar.x + 4, bar.y);
                ctx.restore();
            });
        }
    };

    if (isBar) {
        chartOptions = {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(items) {
                            if (!items.length) return '';
                            var idx = items[0].dataIndex;
                            return flatInspectorNames[idx] + ' (' + items[0].label + ')';
                        },
                        label: function(context) {
                            var val = context.parsed.x;
                            if (metric === 'total_km') return val.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' km';
                            if (metric === 'total_hours') return val.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' hrs';
                            return val.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() }, title: { display: true, text: metricLabels[metric] || '', color: txtColor(), font: { size: 11 } } },
                y: { grid: { color: gridColor() }, ticks: { color: txtColor(), font: { size: 10 } } }
            }
        };
    } else {
        chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: txtColor(), padding: 12, font: { size: 10 }, usePointStyle: true, pointStyle: 'circle' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var val = context.parsed.y;
                            if (metric === 'total_km') return context.dataset.label + ': ' + val.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' km';
                            if (metric === 'total_hours') return context.dataset.label + ': ' + val.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' hrs';
                            return context.dataset.label + ': ' + val;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: gridColor() }, ticks: { color: txtColor(), font: { size: 10 }, maxRotation: 45, autoSkip: true } },
                y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() }, title: { display: true, text: metricLabels[metric] || '', color: txtColor(), font: { size: 11 } } }
            }
        };
    }

    // Dynamically size container for bar chart
    if (isBar) {
        var actualBars = flatValues.length;
        var minHeight = Math.max(400, actualBars * 26 + 100);
        canvas.parentElement.style.height = minHeight + 'px';
    } else {
        canvas.parentElement.style.height = '600px';
    }

    chartInstances['inspectorTrendChart'] = new Chart(canvas, {
        type: isBar ? 'bar' : 'line',
        data: { labels: labels, datasets: datasets },
        options: chartOptions,
        plugins: isBar ? [barLabelPlugin] : []
    });
    console.log('  Chart created with', datasets.length, 'inspectors and', dates.length, 'dates');
    console.log('=== renderInspectorTrendChart END ===');
    } catch(e) {
        console.error('renderInspectorTrendChart ERROR:', e);
    }
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
    var items = (dashboardData.travelTimePerInspector || []).sort(function(a, b) { return (b.total_hours || 0) - (a.total_hours || 0); });
    if (!items.length) return;

    // Dynamic height so all inspectors fit
    var barH = 32;
    var minHeight = items.length * barH + 60;
    canvas.parentElement.style.minHeight = minHeight + 'px';

    chartInstances['travelTimeChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(function(d) { return d.inspector_name; }),
            datasets: [{
                label: 'Travel Hours',
                data: items.map(function(d) { return d.total_hours; }),
                backgroundColor: '#007890',
                borderRadius: 4,
                barPercentage: 0.55,
                categoryPercentage: 0.8,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: txtColor() } }, y: { grid: { display: false }, ticks: { color: txtColor(), font: { size: 10 }, autoSkip: false } } }
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
// RENDER: INSPECTOR COMPARISON CHART
// ================================================================
function renderInspectorComparisonChart() {
    destroyChart('inspectorComparisonChart');
    var canvas = document.getElementById('inspectorComparisonChart');
    if (!canvas) return;
    var items = dashboardData.inspectorFinancials || [];
    if (items.length === 0) return;

    var metricSel = document.getElementById('inspectorTrendMetric');
    var metric = metricSel ? metricSel.value : 'total_revenue';

    var metricLabels = {
        'total_revenue': 'Total Revenue',
        'total_profit': 'Total Profit',
        'revenue_hours': 'Revenue (Hours)',
        'revenue_km': 'Revenue (KM)',
        'revenue_samples': 'Revenue (Samples)',
        'total_hours': 'Billable Hours',
        'total_km': 'KM Traveled',
        'inspection_time': 'On-Site Hours',
        'total_inspections': 'Inspections',
    };
    var isRand = metric.indexOf('revenue') !== -1 || metric === 'total_revenue' || metric === 'total_profit';

    // Compute profit on the fly (revenue - salary - expenses)
    var enriched = items.map(function(i) {
        var copy = Object.assign({}, i);
        var salary = getInspectorSalary(i.inspector_name);
        var expenses = getInspectorExpenses(i.inspector_name);
        var totalCost = salary + expenses;
        copy.total_profit = totalCost ? (i.total_revenue || 0) - totalCost : 0;
        return copy;
    });

    // Sort by selected metric descending
    var sorted = enriched.slice().sort(function(a, b) { return (b[metric] || 0) - (a[metric] || 0); });

    var labels = sorted.map(function(i) { return i.inspector_name || 'Unknown'; });
    var values = sorted.map(function(i) { return i[metric] || 0; });

    // Dynamic height so all inspectors fit with spacing
    var barH = 32;
    var minHeight = sorted.length * barH + 40;
    canvas.parentElement.style.minHeight = minHeight + 'px';

    // For profit, use green for positive and red for negative
    var colors;
    if (metric === 'total_profit') {
        colors = values.map(function(v) { return v >= 0 ? '#10b981' : '#ef4444'; });
    } else {
        colors = labels.map(function(_, idx) { return CHART_PALETTE[idx % CHART_PALETTE.length]; });
    }

    var _revenueIsRand = isRand;
    var _revenueMetric = metric;
    chartInstances['inspectorComparisonChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: metricLabels[metric] || metric,
                data: values,
                backgroundColor: colors,
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.7,
            }]
        },
        plugins: [{
            id: 'revenueBarLabels',
            afterDatasetsDraw: function(chart) {
                var ctx = chart.ctx;
                var meta = chart.getDatasetMeta(0);
                if (!meta || meta.hidden) return;
                ctx.save();
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = '#1e293b';
                ctx.textBaseline = 'middle';
                meta.data.forEach(function(bar, idx) {
                    var val = chart.data.datasets[0].data[idx];
                    if (val == null) return;
                    var label;
                    if (_revenueIsRand) label = formatRand(val);
                    else if (_revenueMetric === 'total_km') label = Math.round(val).toLocaleString() + ' km';
                    else if (_revenueMetric === 'total_hours' || _revenueMetric === 'inspection_time') label = val.toFixed(1) + ' hrs';
                    else label = Math.round(val).toLocaleString();
                    ctx.textAlign = 'left';
                    ctx.fillText(label, bar.x + 4, bar.y);
                });
                ctx.restore();
            }
        }],
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            var v = ctx.parsed.x;
                            if (isRand) return ' ' + formatRand(v);
                            if (metric === 'total_km') return ' ' + Math.round(v).toLocaleString() + ' km';
                            if (metric === 'total_hours' || metric === 'inspection_time') return ' ' + v.toFixed(1) + ' hrs';
                            return ' ' + v.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor() },
                    ticks: {
                        color: txtColor(),
                        callback: function(v) {
                            if (isRand) return 'R' + v.toLocaleString();
                            return v.toLocaleString();
                        }
                    },
                    beginAtZero: true,
                },
                y: {
                    grid: { display: false },
                    ticks: { color: txtColor(), font: { size: 10 }, autoSkip: false },
                }
            }
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
    renderInspectorComparisonChart();
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
    renderApprovalRateChart();
    renderDailyComplianceChart();
    renderInspectorRadarChart();
    renderInspectorTargetsTable();
    renderInspectorTrendChart();
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
    function prog(msg) { if (progressEl) progressEl.textContent = msg; }

    var savedPanel = currentPanel;
    var allPanelEls = document.querySelectorAll('.dashboard-panel');

    try {
        // ── Force-render all panels so charts exist ──────────────────────
        prog('Rendering all panels...');
        var panelIds = Object.keys(PANEL_RENDER_MAP);
        for (var pi = 0; pi < panelIds.length; pi++) {
            var pid = panelIds[pi];
            if (!panelRendered[pid]) {
                var panelEl = document.getElementById('panel-' + pid);
                if (panelEl) {
                    panelEl.style.display = 'block';
                    renderPanelCharts(pid);
                    panelRendered[pid] = true;
                    await new Promise(function(r) { setTimeout(r, 300); });
                }
            }
        }
        allPanelEls.forEach(function(p) { p.style.display = 'block'; });
        await new Promise(function(r) { setTimeout(r, 300); });

        // Force Inspector Comparison to bar chart for PDF
        var origChartType = inspectorTrendChartType;
        if (inspectorTrendChartType !== 'bar') {
            inspectorTrendChartType = 'bar';
            renderInspectorTrendChart();
            await new Promise(function(r) { setTimeout(r, 300); });
        }

        // ── Init jsPDF ──────────────────────────────────────────────────
        var jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPDF) throw new Error('jsPDF not loaded');
        var pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Page dimensions
        var PW = 297, PH = 210, M = 10, CW = PW - 2 * M;
        var HDR = 12, FTR = 8;
        var TOP = HDR + 2, BOT = PH - FTR - 2;

        // ── Header / Footer ─────────────────────────────────────────────
        function header(subtitle) {
            pdf.setFillColor(30, 41, 59);
            pdf.rect(0, 0, PW, HDR, 'F');
            pdf.setFontSize(8); pdf.setTextColor(255, 255, 255);
            pdf.text('FSA Inspector Analytics Report', M, 7);
            if (subtitle) {
                pdf.setFontSize(7); pdf.setTextColor(180, 200, 215);
                pdf.text(subtitle, PW - M, 7, { align: 'right' });
            }
        }
        function footer() {
            pdf.setFontSize(7); pdf.setTextColor(130, 130, 130);
            pdf.text('CONFIDENTIAL - Food Safety Agency (Pty) Ltd', M, PH - 3);
            pdf.text(new Date().toLocaleDateString('en-ZA'), PW - M, PH - 3, { align: 'right' });
        }

        // ── autoTable page hooks ────────────────────────────────────────
        function tablePageHook(subtitle) {
            return function() { header(subtitle); footer(); };
        }

        // ── Grab a chart image (compact: strip padding & shrink legend) ─
        // targetAR: optional target aspect ratio (w/h) to reshape chart for PDF
        function getChartImage(canvasId, targetAR) {
            var inst = chartInstances[canvasId];
            var can = document.getElementById(canvasId);
            if (!inst || !can || can.width === 0 || can.height === 0) return null;

            var wrapper = can.parentNode;

            // Save originals
            var origDPR = inst.options.devicePixelRatio;
            var origPadding = inst.options.layout ? inst.options.layout.padding : undefined;
            var origAR = inst.options.aspectRatio;
            var origMaintain = inst.options.maintainAspectRatio;
            var leg = inst.options.plugins && inst.options.plugins.legend;
            var origLegPad, origLegFont;
            if (leg && leg.labels) {
                origLegPad = leg.labels.padding;
                origLegFont = leg.labels.font ? leg.labels.font.size : undefined;
            }
            var origWrapStyle = wrapper ? wrapper.getAttribute('style') : null;

            // Save & enable PDF data labels for all charts
            if (!inst.options.plugins) inst.options.plugins = {};
            var origPdfLabels = inst.options.plugins.pdfValueLabels;
            // Store formatter externally - Chart.js calls any function in plugin options
            var isRandChart = canvasId === 'revenueCostChart' || canvasId === 'inspectorComparisonChart';
            if (isRandChart) {
                _pdfLabelFormatters[canvasId] = function(v) { return 'R' + Math.round(v).toLocaleString(); };
            } else if (canvasId === 'dailyComplianceChart' || canvasId === 'complianceTrendChart' || canvasId === 'commodityTrendChart') {
                _pdfLabelFormatters[canvasId] = function(v) { return Math.round(v) + '%'; };
            }
            inst.options.plugins.pdfValueLabels = { enabled: true };

            // Reduce bar thickness for dense horizontal bar charts in PDF
            var origBarThickness = null;
            if (canvasId === 'inspectorTrendChart' && inst.data.datasets[0]) {
                origBarThickness = inst.data.datasets[0].barThickness;
                inst.data.datasets[0].barThickness = 10;
            }

            // Compact for PDF: zero layout padding, tight legend
            inst.options.devicePixelRatio = 2;
            if (!inst.options.layout) inst.options.layout = {};
            inst.options.layout.padding = 0;
            if (leg && leg.labels) {
                leg.labels.padding = 3;
                if (!leg.labels.font) leg.labels.font = {};
                leg.labels.font.size = 7;
            }

            // Reshape canvas to match PDF target aspect ratio
            if (targetAR && wrapper) {
                var targetW = 800;
                var targetH = Math.round(targetW / targetAR);
                wrapper.style.width = targetW + 'px';
                wrapper.style.height = targetH + 'px';
                wrapper.style.position = 'absolute';
                wrapper.style.left = '-9999px';
                inst.options.aspectRatio = targetAR;
                inst.options.maintainAspectRatio = true;
                inst.resize();
            }

            inst.update('none');

            var img = inst.toBase64Image('image/png', 1.0);
            var w = can.width, h = can.height;

            // Restore originals
            inst.options.devicePixelRatio = origDPR || undefined;
            if (origPadding !== undefined) { inst.options.layout.padding = origPadding; }
            else { delete inst.options.layout.padding; }
            if (leg && leg.labels) {
                leg.labels.padding = origLegPad;
                if (origLegFont !== undefined) leg.labels.font.size = origLegFont;
                else if (leg.labels.font) delete leg.labels.font.size;
            }
            // Restore PDF data labels
            if (origPdfLabels) inst.options.plugins.pdfValueLabels = origPdfLabels;
            else if (inst.options.plugins.pdfValueLabels) delete inst.options.plugins.pdfValueLabels;
            delete _pdfLabelFormatters[canvasId];
            // Restore bar thickness
            if (origBarThickness !== null && inst.data.datasets[0]) {
                inst.data.datasets[0].barThickness = origBarThickness;
            }

            // Restore canvas shape
            if (targetAR && wrapper) {
                if (origWrapStyle) wrapper.setAttribute('style', origWrapStyle);
                else wrapper.removeAttribute('style');
                inst.options.aspectRatio = origAR;
                inst.options.maintainAspectRatio = origMaintain;
                inst.resize();
            }
            inst.update('none');

            return { img: img, w: w, h: h };
        }

        // ── Place chart image on page, returns new y ────────────────────
        var CHART_MAX_H = 80; // Cap height so ~2 charts fit per page
        function placeChart(y, chartData, label, subtitle, maxH) {
            if (!chartData) return y;
            var capH = maxH || CHART_MAX_H;
            var ar = chartData.w / chartData.h;
            var iW = CW;
            var iH = iW / ar;
            // Cap chart height to fit multiple per page
            if (iH > capH) { iH = capH; iW = iH * ar; }
            var neededH = iH + (label ? 7 : 0);
            // Need new page?
            if (y + neededH > BOT) {
                footer();
                pdf.addPage();
                header(subtitle);
                y = TOP;
            }
            // Label
            if (label) {
                pdf.setFontSize(9); pdf.setTextColor(30, 41, 59);
                pdf.text(label, M, y + 4);
                y += 7;
            }
            pdf.addImage(chartData.img, 'PNG', M + (CW - iW) / 2, y, iW, iH);
            return y + iH + 5;
        }

        // ── Place two charts side by side, returns new y ────────────────
        function placeChartPair(y, left, right, leftLabel, rightLabel, subtitle, maxH) {
            var capH = maxH || 42;
            var halfW = (CW - 6) / 2; // 6mm gap between columns
            var labelH = 3; // space for label above chart
            var rowGap = 2; // gap between rows
            var neededH = capH + labelH + rowGap;
            if (y + neededH > BOT) {
                footer();
                pdf.addPage();
                header(subtitle);
                y = TOP;
            }
            // If another row won't fit after this one, stretch to fill remaining page space
            var remainAfter = BOT - (y + capH + labelH + rowGap);
            if (remainAfter < neededH) {
                capH = BOT - y - labelH; // use all remaining height
            }
            // Left chart
            if (left) {
                if (leftLabel) { pdf.setFontSize(7); pdf.setTextColor(30, 41, 59); pdf.text(leftLabel, M, y + 3); }
                pdf.addImage(left.img, 'PNG', M, y + labelH, halfW, capH);
            }
            // Right chart
            if (right) {
                if (rightLabel) { pdf.setFontSize(7); pdf.setTextColor(30, 41, 59); pdf.text(rightLabel, M + halfW + 6, y + 3); }
                pdf.addImage(right.img, 'PNG', M + halfW + 6, y + labelH, halfW, capH);
            }
            return y + capH + labelH + rowGap;
        }

        // ════════════════════════════════════════════════════════════════
        // PAGE 1: COVER
        // ════════════════════════════════════════════════════════════════
        prog('Building cover page...');
        header('');

        var d = dashboardData;
        var fin = d.financialSummary || {};
        var totalKm = 0, totalSamples = 0;
        (d.travelPerInspector || []).forEach(function(r) { totalKm += (r.total_km || 0); });
        (d.samplesByCommodity || []).forEach(function(r) { totalSamples += (r.count || 0); });

        // Title block
        pdf.setFontSize(20); pdf.setTextColor(30, 41, 59);
        pdf.text('Food Safety Agency (Pty) Ltd', PW / 2, 28, { align: 'center' });
        pdf.setFontSize(12); pdf.setTextColor(100, 116, 139);
        pdf.text('Inspector Analytics Dashboard Report', PW / 2, 36, { align: 'center' });
        pdf.setFontSize(9);
        pdf.text('Generated: ' + new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), PW / 2, 43, { align: 'center' });
        var filterSummary = getFilterSummaryText();
        if (filterSummary) {
            pdf.setFontSize(8); pdf.text('Filters: ' + filterSummary, PW / 2, 49, { align: 'center' });
        }

        // KPI summary table on cover
        var kpiData = [
            ['Total Inspections', (d.totalInspections || 0).toLocaleString()],
            ['Overall Compliance Rate', (d.complianceRate || 0).toFixed(1) + '%'],
            ['Active Inspectors', String(d.activeInspectors || 0)],
            ['Occurrence Reports', String(d.totalOccurrenceReports || 0)],
            ['Total Revenue', fin.total_revenue ? 'R ' + Number(fin.total_revenue).toLocaleString('en-ZA', { maximumFractionDigits: 0 }) : '—'],
            ['Total KM Traveled', totalKm > 0 ? Math.round(totalKm).toLocaleString() + ' km' : '—'],
            ['Total Samples Taken', totalSamples > 0 ? totalSamples.toLocaleString() : '—'],
        ];
        pdf.autoTable({
            startY: 55,
            head: [['Metric', 'Value']],
            body: kpiData,
            margin: { left: M, right: M },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [0, 120, 144], textColor: [255, 255, 255] },
            columnStyles: { 0: { cellWidth: 80 } },
            alternateRowStyles: { fillColor: [245, 247, 250] },
        });

        // Inspector Summary on cover
        var inspPerf = d.inspectorPerformance || [];
        if (inspPerf.length > 0) {
            var perfBody = inspPerf.map(function(row) {
                return [
                    row.inspector_name || row.name || '',
                    row.total_inspections || row.count || 0,
                    row.compliance_rate != null ? Number(row.compliance_rate).toFixed(1) + '%' : '—',
                    row.total_directions || row.directions || 0,
                    row.total_occurrences || row.occurrences || 0,
                    row.total_samples || row.samples || 0,
                ];
            });
            pdf.autoTable({
                startY: pdf.lastAutoTable.finalY + 8,
                head: [['Inspector', 'Inspections', 'Compliance', 'Directions', 'Occurrences', 'Samples']],
                body: perfBody,
                margin: { left: M, right: M, top: TOP, bottom: PH - BOT },
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
                columnStyles: { 0: { cellWidth: 45 } },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                didDrawPage: tablePageHook('Summary'),
            });
        }
        // ════════════════════════════════════════════════════════════════
        // FINANCIAL TABLE (flows on cover/summary pages)
        // ════════════════════════════════════════════════════════════════
        prog('Building financial table...');
        var finItems = d.inspectorFinancials || [];
        if (finItems.length > 0) {
            var finStartY = pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 8 : TOP;
            if (finStartY + 30 > BOT) { footer(); pdf.addPage(); header('Financial Summary'); finStartY = TOP; }
            pdf.setFontSize(10); pdf.setTextColor(16, 124, 16); pdf.text('Financial Summary', M, finStartY + 4); finStartY += 7;
            var KM_RATE = 4.50;
            var finHead = [['Inspector', 'Insp', 'Hrs', 'KM', 'R/km', 'Rev(Hrs)', 'Rev(KM)', 'Rev(Smp)', 'Total Rev', 'Salary', 'Expenses', 'Total Cost', 'Profit']];
            var finBody = [];
            var totals = { insp: 0, hrs: 0, km: 0, kmC: 0, rH: 0, rK: 0, rS: 0, tot: 0, sal: 0, exp: 0, tc: 0, prof: 0 };

            finItems.forEach(function(item) {
                var hrs = parseFloat(item.total_hours || 0);
                var km = parseFloat(item.total_km || 0);
                var kmC = km * KM_RATE;
                var rH = item.revenue_hours || 0, rK = item.revenue_km || 0, rS = item.revenue_samples || 0;
                var tot = item.total_revenue || 0;
                var sal = getInspectorSalary(item.inspector_name);
                var exp = getInspectorExpenses(item.inspector_name);
                var tc = sal + exp;
                var prof = tc ? tot - tc : 0;
                totals.insp += (item.total_inspections || 0);
                totals.hrs += hrs; totals.km += km; totals.kmC += kmC;
                totals.rH += rH; totals.rK += rK; totals.rS += rS; totals.tot += tot;
                totals.sal += sal; totals.exp += exp; totals.tc += tc;
                if (tc) totals.prof += prof;

                finBody.push([
                    item.inspector_name || '-', item.total_inspections || 0, hrs.toFixed(1),
                    km ? Math.round(km).toLocaleString() : '-', km ? formatRand(kmC) : '\u2014',
                    formatRand(rH), formatRand(rK), formatRand(rS), formatRand(tot),
                    sal ? formatRand(sal) : '\u2014', exp ? formatRand(exp) : '\u2014', tc ? formatRand(tc) : '\u2014',
                    tc ? formatRand(prof) : '\u2014'
                ]);
            });
            finBody.push([
                'TOTAL', totals.insp, totals.hrs.toFixed(1), Math.round(totals.km).toLocaleString(),
                formatRand(totals.kmC), formatRand(totals.rH), formatRand(totals.rK), formatRand(totals.rS),
                formatRand(totals.tot), formatRand(totals.sal), formatRand(totals.exp), formatRand(totals.tc),
                formatRand(totals.prof)
            ]);

            pdf.autoTable({
                startY: finStartY,
                head: finHead, body: finBody,
                margin: { left: M, right: M, top: TOP, bottom: PH - BOT },
                styles: { fontSize: 6, cellPadding: 1.5, lineColor: [220, 225, 230], lineWidth: 0.2, halign: 'right', overflow: 'ellipsize' },
                headStyles: { fillColor: [16, 124, 16], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 6 },
                columnStyles: { 0: { halign: 'left', cellWidth: 30, fontStyle: 'bold' } },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.row.index === finBody.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [226, 232, 240];
                    }
                    if (data.section === 'body' && data.column.index === 12) {
                        var txt = String(data.cell.raw);
                        if (txt !== '\u2014') {
                            var num = parseFloat(txt.replace(/[^\d.-]/g, ''));
                            if (!isNaN(num)) {
                                data.cell.styles.textColor = num >= 0 ? [16, 185, 129] : [239, 68, 68];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    }
                },
                didDrawPage: tablePageHook('Financial Summary'),
            });
        }
        footer();

        // ════════════════════════════════════════════════════════════════
        // TARGETS TABLE (new page)
        // ════════════════════════════════════════════════════════════════
        prog('Building targets table...');
        pdf.addPage(); header('Quarterly Targets');

        var inspData = getInspectorData();
        var kmLookup = {}, hoursLookup = {}, inspCountLookup = {};
        (d.travelPerInspector || []).forEach(function(item) {
            kmLookup[item.inspector_name] = item.total_km || 0;
            hoursLookup[item.inspector_name] = item.total_hours || 0;
            inspCountLookup[item.inspector_name] = item.inspection_count || 0;
        });
        Object.keys(inspCountLookup).forEach(function(name) {
            if (!inspData[name]) inspData[name] = { inspections: {}, samples: {} };
        });
        var inspNames = Object.keys(inspData).sort();

        if (inspNames.length > 0) {
            var targHead = [['Inspector', 'Total', 'Eggs/' + INSPECTOR_TARGETS.inspections.EGGS,
                'Poultry/' + INSPECTOR_TARGETS.inspections.POULTRY,
                'RAW/' + INSPECTOR_TARGETS.inspections.RAW, 'PMP/' + INSPECTOR_TARGETS.inspections.PMP,
                'RAW Smp/' + INSPECTOR_TARGETS.sampling.RAW, 'PMP Smp/' + INSPECTOR_TARGETS.sampling.PMP,
                'Tot Smp/' + SAMPLING_TOTAL_TARGET, 'KM', 'Hours']];
            var targBody = [];
            inspNames.forEach(function(name) {
                var dd = inspData[name];
                var eggs = dd.inspections['EGGS'] || dd.inspections['EGG'] || 0;
                var poultry = dd.inspections['POULTRY'] || 0;
                var raw = dd.inspections['RAW'] || 0;
                var pmp = dd.inspections['PMP'] || 0;
                var totalInsp = inspCountLookup[name] || 0;
                if (!totalInsp) Object.keys(dd.inspections).forEach(function(k) { totalInsp += dd.inspections[k] || 0; });
                var rawS = dd.samples['RAW'] || 0, pmpS = dd.samples['PMP'] || 0, totS = 0;
                Object.keys(dd.samples).forEach(function(k) { totS += dd.samples[k] || 0; });
                targBody.push([name, totalInsp, eggs, poultry, raw, pmp, rawS, pmpS, totS,
                    kmLookup[name] ? Math.round(kmLookup[name]).toLocaleString() : '-',
                    hoursLookup[name] ? parseFloat(hoursLookup[name]).toFixed(1) : '-']);
            });

            // Calculate cell padding to fill the page
            var availH = BOT - TOP;
            var totalRows = targBody.length + 1; // +1 for header
            var targFontSize = 7;
            var targRowH = availH / totalRows;
            // Font height in mm ≈ fontSize * 0.353; subtract that + line spacing from row height
            var targPad = Math.max(1.5, (targRowH - targFontSize * 0.5) / 2);

            pdf.autoTable({
                startY: TOP,
                head: targHead,
                body: targBody,
                margin: { left: M, right: M, top: TOP, bottom: PH - BOT },
                styles: { fontSize: targFontSize, cellPadding: targPad, lineColor: [220, 225, 230], lineWidth: 0.2 },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                columnStyles: { 0: { halign: 'left', cellWidth: 38 }, 1: { halign: 'center', fontStyle: 'bold' } },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index >= 2 && data.column.index <= 8) {
                        var val = Number(data.cell.raw);
                        var targets = [INSPECTOR_TARGETS.inspections.EGGS, INSPECTOR_TARGETS.inspections.POULTRY,
                            INSPECTOR_TARGETS.inspections.RAW, INSPECTOR_TARGETS.inspections.PMP,
                            INSPECTOR_TARGETS.sampling.RAW, INSPECTOR_TARGETS.sampling.PMP, SAMPLING_TOTAL_TARGET];
                        var target = targets[data.column.index - 2];
                        if (target && val >= target) {
                            data.cell.styles.fillColor = [220, 252, 231];
                            data.cell.styles.textColor = [22, 101, 52];
                        } else if (target) {
                            data.cell.styles.fillColor = [254, 226, 226];
                            data.cell.styles.textColor = [153, 27, 27];
                        }
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign = 'center';
                        var pct = target > 0 ? Math.round((val / target) * 100) : 0;
                        data.cell.text = [val + ' (' + pct + '%)'];
                    }
                },
                didDrawPage: tablePageHook('Quarterly Targets'),
            });
        }

        // ════════════════════════════════════════════════════════════════
        // EFFICIENCY MATRIX (flows below targets)
        // ════════════════════════════════════════════════════════════════
        prog('Building efficiency matrix...');
        var matrixItems = d.inspectorCommodityMatrix || [];
        if (matrixItems.length > 0) {
            // Always start Efficiency Matrix on a new page
            footer(); pdf.addPage(); header('Efficiency Matrix');
            var matStartY = TOP;
            pdf.setFontSize(10); pdf.setTextColor(124, 58, 237); pdf.text('Efficiency Matrix', M, matStartY + 4); matStartY += 7;
            var inspectors = {}, commodities = new Set();
            matrixItems.forEach(function(item) {
                commodities.add(item.commodity);
                if (!inspectors[item.inspector_name]) inspectors[item.inspector_name] = {};
                inspectors[item.inspector_name][item.commodity] = item.count || 0;
            });
            var commList = Array.from(commodities).sort();
            var matHead = [['Inspector'].concat(commList).concat(['Total', 'KM'])];
            var matBody = [];
            Object.keys(inspectors).sort().forEach(function(name) {
                var row = [name]; var total = 0;
                commList.forEach(function(c) { var cnt = inspectors[name][c] || 0; total += cnt; row.push(cnt || '-'); });
                row.push(total);
                row.push(kmLookup[name] ? Math.round(kmLookup[name]).toLocaleString() : '-');
                matBody.push(row);
            });
            pdf.autoTable({
                startY: matStartY,
                head: matHead, body: matBody,
                margin: { left: M, right: M, top: TOP, bottom: PH - BOT },
                styles: { fontSize: 7, cellPadding: 1.5, lineColor: [220, 225, 230], lineWidth: 0.2, halign: 'center' },
                headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
                columnStyles: { 0: { halign: 'left', cellWidth: 35, fontStyle: 'bold' } },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                didDrawPage: tablePageHook('Efficiency Matrix'),
            });
        }

        // (Financial table moved to cover/summary section above)

        // ════════════════════════════════════════════════════════════════
        // CHARTS — one per page, simple
        // ════════════════════════════════════════════════════════════════
        var chartList = [
            { id: 'dailyComplianceChart', label: 'Daily Compliance Trend', section: 'Overview' },
            { id: 'monthlyInspectionsTrendChart', label: 'Monthly Inspections Trend', section: 'Overview' },
            { id: 'approvalRateChart', label: 'Approval Rate', section: 'Overview' },
            { id: 'inspectorRadarChart', label: 'Inspector Performance Radar', section: 'Overview' },
            { id: 'directionsChart', label: 'Directions & Non-Compliance', section: 'Overview', fullWidth: true },
            { id: 'commodityTrendChart', label: 'Commodity Compliance Trend', section: 'Compliance', fullWidth: true },
            { id: 'complianceTrendChart', label: 'Weekly Compliance Trend', section: 'Compliance', fullWidth: true },
            { id: 'samplesTakenChart', label: 'Samples Per Inspector', section: 'Compliance' },
            { id: 'facilityTypesChart', label: 'Facility Types', section: 'Compliance' },
            { id: 'commodityCountChart', label: 'Commodity Count', section: 'Compliance' },
            { id: 'timeAllocationChart', label: 'Time Allocation', section: 'Compliance' },
            { id: 'occurrenceReportsChart', label: 'Occurrence Reports', section: 'Compliance' },
            { id: 'occurrenceTrendChart', label: 'Occurrence Trend', section: 'Compliance' },
            { id: 'travelChart', label: 'Travel Distance Per Inspector', section: 'Operations' },
            { id: 'travelTrendChart', label: 'Travel Distance Trend', section: 'Operations' },
            { id: 'travelTimeChart', label: 'Travel Time Per Inspector', section: 'Operations' },
            { id: 'travelHoursTrendChart', label: 'Travel Hours Trend', section: 'Operations' },
            { id: 'docSendChart', label: 'Avg Days - Doc Send', section: 'Timelines' },
            { id: 'docSendTrendChart', label: 'Doc Send Trend', section: 'Timelines' },
            { id: 'invoiceUploadChart', label: 'Avg Days - Invoice Upload', section: 'Timelines' },
            { id: 'invoiceTrendChart', label: 'Invoice Upload Trend', section: 'Timelines' },
            { id: 'coaTimeChart', label: 'Avg Days - COA Upload', section: 'Timelines' },
            { id: 'coaTrendChart', label: 'COA Upload Trend', section: 'Timelines' },
            { id: 'approvalTimeChart', label: 'Avg Days - Approval', section: 'Timelines' },
            { id: 'approvalTrendChart', label: 'Approval Trend', section: 'Timelines' },
            { id: 'inspectorTrendChart', label: 'Inspector Comparison (Weekly)', section: 'Financial', ownPage: true },
            { id: 'revenueCostChart', label: 'Revenue & Cost Breakdown', section: 'Financial', stackWith: 'inspectorComparisonChart' },
            { id: 'inspectorComparisonChart', label: 'Inspector Comparison (Revenue)', section: 'Financial' },
        ];

        // Sections that use 2-column paired layout (bar + trend side by side)
        var pairedSections = { 'Overview': true, 'Compliance': true, 'Timelines': true, 'Operations': true };
        // Per-section chart heights
        var pairedHeight = { 'Overview': 54, 'Compliance': 54, 'Operations': 84, 'Timelines': 39 };

        var currentSection = '';
        var chartY = BOT; // Force first chart onto a new page
        for (var ci = 0; ci < chartList.length; ci++) {
            var ch = chartList[ci];
            prog('Exporting chart ' + (ci + 1) + '/' + chartList.length + ': ' + ch.label);
            var chartData = getChartImage(ch.id);
            if (!chartData) continue;

            // New section — start a new page with section heading
            if (ch.section !== currentSection) {
                if (currentSection) footer();
                currentSection = ch.section;
                // Skip section page if first chart creates its own page
                if (ch.ownPage || ch.stackWith) {
                    chartY = BOT; // force ownPage/stackWith to create the page
                } else {
                    pdf.addPage();
                    header(currentSection);
                    chartY = TOP;
                    pdf.setFontSize(11); pdf.setTextColor(30, 41, 59);
                    pdf.text(currentSection, M, chartY + 4);
                    pdf.setDrawColor(30, 41, 59);
                    pdf.line(M, chartY + 5, M + CW, chartY + 5);
                    chartY += 7;
                }
            }

            // Full-width charts within paired sections (dense line charts that need more space)
            if (pairedSections[ch.section] && ch.fullWidth) {
                // Count full-width charts on this page to split available space
                var fwCount = 0;
                for (var fi = ci; fi < chartList.length && chartList[fi].section === ch.section; fi++) {
                    if (chartList[fi].fullWidth) fwCount++;
                    else break; // stop at first non-fullWidth
                }
                if (fwCount < 1) fwCount = 1;
                var availH = BOT - chartY;
                var fwCapH = Math.floor((availH - fwCount * 10) / fwCount); // 10mm for label+gap per chart
                var fwAR = CW / fwCapH;
                chartData = getChartImage(ch.id, fwAR) || chartData;
                chartY = placeChart(chartY, chartData, ch.label, currentSection, fwCapH);
            // Paired sections: place charts side by side
            } else if (pairedSections[ch.section]) {
                var secCapH = pairedHeight[ch.section] || 33;
                var halfW = (CW - 6) / 2;
                var pdfAR = halfW / secCapH; // target aspect ratio for PDF cells
                // Re-capture with target AR so chart fills the PDF cell
                chartData = getChartImage(ch.id, pdfAR) || chartData;
                var nextIdx = ci + 1;
                var rightData = null, rightLabel = '';
                if (nextIdx < chartList.length && chartList[nextIdx].section === ch.section && !chartList[nextIdx].fullWidth) {
                    prog('Exporting chart ' + (nextIdx + 1) + '/' + chartList.length + ': ' + chartList[nextIdx].label);
                    var nextId = chartList[nextIdx].id;
                    rightData = getChartImage(nextId, pdfAR);
                    rightLabel = chartList[nextIdx].label;
                    ci = nextIdx; // skip next since we're rendering it here
                }
                chartY = placeChartPair(chartY, chartData, rightData, ch.label, rightLabel, currentSection, secCapH);
            } else if (ch.stackWith) {
                // Stack two charts vertically on a new page (first gets 60%, second 40%)
                footer(); pdf.addPage(); header(currentSection);
                chartY = TOP;
                var totalH = BOT - TOP - 20; // 20mm for labels+gaps
                var stackH1 = Math.floor(totalH * 0.6);
                var stackH2 = Math.floor(totalH * 0.4);
                var stackAR1 = CW / stackH1;
                chartData = getChartImage(ch.id, stackAR1) || chartData;
                chartY = placeChart(chartY, chartData, ch.label, currentSection, stackH1);
                // Find and render the stacked partner
                for (var si = ci + 1; si < chartList.length; si++) {
                    if (chartList[si].id === ch.stackWith) {
                        prog('Exporting chart ' + (si + 1) + '/' + chartList.length + ': ' + chartList[si].label);
                        var stackAR2 = CW / stackH2;
                        var stackData = getChartImage(chartList[si].id, stackAR2);
                        if (stackData) chartY = placeChart(chartY, stackData, chartList[si].label, currentSection, stackH2);
                        ci = si;
                        break;
                    }
                }
            } else {
                // Reshape to fill page width at capped height
                var capH = CHART_MAX_H;
                if (ch.ownPage) {
                    footer(); pdf.addPage(); header(currentSection);
                    chartY = TOP;
                    capH = BOT - TOP - 10;
                }
                var reshapedAR = CW / capH;
                chartData = getChartImage(ch.id, reshapedAR) || chartData;
                chartY = placeChart(chartY, chartData, ch.label, currentSection, capH);
            }
            await new Promise(function(r) { setTimeout(r, 50); });
        }
        if (currentSection) footer(); // footer for the last chart page

        // ── Stamp page numbers ──────────────────────────────────────────
        prog('Finalising...');
        var totalPages = pdf.internal.getNumberOfPages();
        for (var p = 1; p <= totalPages; p++) {
            pdf.setPage(p);
            pdf.setFontSize(7); pdf.setTextColor(130, 130, 130);
            // White-out any previous page text area and rewrite
            pdf.setFillColor(255, 255, 255);
            pdf.rect(PW / 2 - 15, PH - FTR, 30, FTR, 'F');
            pdf.text('Page ' + p + ' of ' + totalPages, PW / 2, PH - 3, { align: 'center' });
        }

        prog('Saving...');
        pdf.save('FSA_Analytics_Report_' + new Date().toISOString().slice(0, 10) + '.pdf');

    } catch (err) {
        console.error('PDF export error:', err);
        alert('Error generating PDF: ' + err.message);
    } finally {
        // Restore Inspector Comparison chart type
        if (origChartType !== inspectorTrendChartType) {
            inspectorTrendChartType = origChartType;
            renderInspectorTrendChart();
        }
        allPanelEls.forEach(function(p) { p.style.display = ''; });
        var activePanelEl = document.getElementById('panel-' + savedPanel);
        if (activePanelEl) activePanelEl.style.display = 'block';
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

    // Re-render inspector comparison chart when metric changes
    var metricSel = document.getElementById('inspectorTrendMetric');
    if (metricSel) metricSel.addEventListener('change', renderInspectorComparisonChart);
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
// INSPECTOR TARGETS MODAL
// ================================================================
// ================================================================
// QUARTERLY TARGETS SYSTEM
// ================================================================
var _quarterlyTargetsCache = {};  // key: "YYYY-Q" -> targets map

function _qtCacheKey(y, q) { return y + '-' + q; }

function _loadQuarterlyTargets(year, quarter, cb) {
    var key = _qtCacheKey(year, quarter);
    if (_quarterlyTargetsCache[key]) { cb(_quarterlyTargetsCache[key]); return; }
    fetch(window.DJANGO_CONFIG.quarterlyTargetsUrl + '?year=' + year + '&quarter=' + quarter, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).then(function(r) { return r.json(); }).then(function(data) {
        _quarterlyTargetsCache[key] = data.targets || {};
        cb(_quarterlyTargetsCache[key]);
    }).catch(function() { cb({}); });
}

function _currentQuarterTargets() {
    var y = (document.getElementById('targetsYear') || {}).value;
    var q = (document.getElementById('targetsQuarter') || {}).value;
    if (!y || !q) return {};
    return _quarterlyTargetsCache[_qtCacheKey(y, q)] || {};
}

// Get effective target for an inspector: quarterly override > 0 (no target set)
// Only current Q1 2026 uses InspectorTarget defaults; all other quarters show 0 if no quarterly target saved
function getEffectiveTarget(name) {
    var qt = _currentQuarterTargets()[name];
    if (qt) return {
        inspections: { EGGS: qt.eggs, POULTRY: qt.poultry, RAW: qt.raw, PMP: qt.pmp },
        sampling: { RAW: qt.raw_samples, PMP: qt.pmp_samples },
        totalSamples: qt.total_samples,
        financial: qt
    };
    // If quarterly targets have been loaded for this period and inspector has none, show 0
    var y = (document.getElementById('targetsYear') || {}).value;
    var qtr = (document.getElementById('targetsQuarter') || {}).value;
    var cacheKey = y && qtr ? _qtCacheKey(y, qtr) : null;
    if (cacheKey && _quarterlyTargetsCache[cacheKey] !== undefined) {
        return {
            inspections: { EGGS: 0, POULTRY: 0, RAW: 0, PMP: 0 },
            sampling: { RAW: 0, PMP: 0 },
            totalSamples: 0,
            financial: {}
        };
    }
    // Fallback for initial load before quarterly data loaded
    return getTargetsForInspector(name);
}

// Initialize year/quarter selectors on Inspectors panel
function initTargetsQuarterSelectors() {
    var yearSel = document.getElementById('targetsYear');
    if (!yearSel || yearSel.options.length > 0) return;
    var now = new Date();
    for (var y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
        var opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        if (y === now.getFullYear()) opt.selected = true;
        yearSel.appendChild(opt);
    }
    var currentQ = Math.ceil((now.getMonth() + 1) / 3);
    document.getElementById('targetsQuarter').value = currentQ;
    // Load quarterly targets for current period so table shows correct values
    _loadQuarterlyTargets(now.getFullYear(), currentQ, function() {
        renderInspectorTargetsTable();
        renderProfitabilityTable();
        renderInspectorRadarChart();
    });
}

function onTargetsQuarterChange() {
    var y = document.getElementById('targetsYear').value;
    var q = document.getElementById('targetsQuarter').value;
    var qNames = ['', 'Q1: Jan-Mar', 'Q2: Apr-Jun', 'Q3: Jul-Sep', 'Q4: Oct-Dec'];
    var title = document.getElementById('targetsCardTitle');
    if (title) title.textContent = 'Inspector Quarterly Targets & Activity (' + y + ' ' + qNames[q] + ')';
    _loadQuarterlyTargets(y, q, function() {
        renderInspectorTargetsTable();
        renderProfitabilityTable();
        renderInspectorRadarChart();
    });
}

// Override the targets table to use quarterly targets
var _origRenderTargetsTable = renderInspectorTargetsTable;
renderInspectorTargetsTable = function() {
    initTargetsQuarterSelectors();
    var headerRow = document.getElementById('targetsHeader');
    var tbody = document.getElementById('targetsBody');
    if (!headerRow || !tbody) return;

    var inspectors = getInspectorData();
    var inspectorNames = Object.keys(inspectors).sort();
    if (inspectorNames.length === 0) { headerRow.innerHTML = '<th>No data</th>'; tbody.innerHTML = ''; return; }

    var kmLookup = {};
    var hoursLookup = {};
    var inspCountLookup = {};
    (dashboardData.travelPerInspector || []).forEach(function(item) {
        kmLookup[item.inspector_name] = item.total_km || 0;
        hoursLookup[item.inspector_name] = item.total_hours || 0;
        inspCountLookup[item.inspector_name] = item.inspection_count || 0;
    });
    Object.keys(inspCountLookup).forEach(function(name) {
        if (!inspectors[name]) inspectors[name] = { inspections: {}, samples: {} };
    });
    inspectorNames = Object.keys(inspectors).sort();

    var knownCommodities = ['EGGS', 'EGG', 'POULTRY', 'RAW', 'PMP'];
    var otherCommodities = new Set();
    inspectorNames.forEach(function(name) {
        Object.keys(inspectors[name].inspections).forEach(function(c) {
            if (knownCommodities.indexOf(c) === -1) otherCommodities.add(c);
        });
    });
    var otherList = Array.from(otherCommodities).sort();
    var hasOther = otherList.length > 0;

    var headerHtml = '<th style="min-width:110px;">Inspector</th>' +
        '<th class="num">Total</th>' +
        '<th class="num" style="border-left:2px solid #d1d5db;">Eggs</th>' +
        '<th class="num">Poultry</th>' +
        '<th class="num">RAW</th>' +
        '<th class="num">PMP</th>';
    if (hasOther) otherList.forEach(function(c) { headerHtml += '<th class="num">' + c + '</th>'; });
    headerHtml +=
        '<th class="num" style="border-left:2px solid #d1d5db;">RAW Smp</th>' +
        '<th class="num">PMP Smp</th>' +
        '<th class="num">Total Smp</th>' +
        '<th class="num" style="border-left:2px solid #d1d5db;">KM</th>' +
        '<th class="num">Hours</th>' +
        '<th class="num" style="border-left:2px solid #d1d5db;">Overall %</th>';
    headerRow.innerHTML = headerHtml;

    function cell(actual, target, extraStyle) {
        var pct = target > 0 ? Math.round((actual / target) * 100) : 0;
        var color = pct >= 100 ? '#166534' : pct >= 70 ? '#92400e' : '#991b1b';
        var bg = pct >= 100 ? '#dcfce7' : pct >= 70 ? '#fef3c7' : '#fee2e2';
        return '<td class="num" style="color:' + color + '; background:' + bg + '; font-weight:600;' + (extraStyle || '') + '">' +
            actual + '<small style="opacity:0.7;"> /' + target + ' (' + pct + '%)</small></td>';
    }

    var html = '';
    inspectorNames.forEach(function(name) {
        var d = inspectors[name];
        var t = getEffectiveTarget(name);
        var eggs = d.inspections['EGGS'] || d.inspections['EGG'] || 0;
        var poultry = d.inspections['POULTRY'] || 0;
        var raw = d.inspections['RAW'] || 0;
        var pmp = d.inspections['PMP'] || 0;
        var totalInsp = inspCountLookup[name] || 0;
        if (!totalInsp) Object.keys(d.inspections).forEach(function(k) { totalInsp += d.inspections[k] || 0; });
        var km = kmLookup[name] || 0;
        var hours = hoursLookup[name] || 0;
        var rawSamples = d.samples['RAW'] || 0;
        var pmpSamples = d.samples['PMP'] || 0;
        var totalSamples = 0;
        Object.keys(d.samples).forEach(function(k) { totalSamples += d.samples[k] || 0; });

        // Overall %
        var pcts = [];
        if (t.inspections.EGGS > 0) pcts.push(eggs / t.inspections.EGGS);
        if (t.inspections.POULTRY > 0) pcts.push(poultry / t.inspections.POULTRY);
        if (t.inspections.RAW > 0) pcts.push(raw / t.inspections.RAW);
        if (t.inspections.PMP > 0) pcts.push(pmp / t.inspections.PMP);
        var overallPct = pcts.length > 0 ? Math.round((pcts.reduce(function(s, v) { return s + v; }, 0) / pcts.length) * 100) : 0;
        var overallColor = overallPct >= 100 ? '#166534' : overallPct >= 70 ? '#92400e' : '#991b1b';
        var overallBg = overallPct >= 100 ? '#dcfce7' : overallPct >= 70 ? '#fef3c7' : '#fee2e2';

        var isQtTarget = !!_currentQuarterTargets()[name];

        html += '<tr><td style="font-weight:600; white-space:nowrap;">' + name;
        if (isQtTarget) html += ' <i class="fas fa-bullseye" style="color:#f59e0b; font-size:9px;" title="Quarterly target set"></i>';
        html += '</td>';
        html += '<td class="num" style="font-weight:700;">' + totalInsp + '</td>';
        html += cell(eggs, t.inspections.EGGS, 'border-left:2px solid #d1d5db;');
        html += cell(poultry, t.inspections.POULTRY);
        html += cell(raw, t.inspections.RAW);
        html += cell(pmp, t.inspections.PMP);
        if (hasOther) otherList.forEach(function(c) {
            html += '<td class="num">' + (d.inspections[c] || '-') + '</td>';
        });
        html += cell(rawSamples, t.sampling.RAW, 'border-left:2px solid #d1d5db;');
        html += cell(pmpSamples, t.sampling.PMP);
        html += cell(totalSamples, t.totalSamples);
        html += '<td class="num" style="border-left:2px solid #d1d5db;">' + (km ? km.toLocaleString(undefined, {maximumFractionDigits: 0}) : '-') + '</td>';
        html += '<td class="num">' + (hours ? parseFloat(hours).toLocaleString(undefined, {maximumFractionDigits: 1}) : '-') + '</td>';
        html += '<td class="num" style="border-left:2px solid #d1d5db; color:' + overallColor + '; background:' + overallBg + '; font-weight:700; font-size:13px;">' + overallPct + '%</td>';
        html += '</tr>';
    });
    tbody.innerHTML = html;
};

// Profitability table
function renderProfitabilityTable() {
    var tbody = document.getElementById('profitBody');
    if (!tbody) return;
    var label = document.getElementById('profitQuarterLabel');
    var y = (document.getElementById('targetsYear') || {}).value || new Date().getFullYear();
    var q = (document.getElementById('targetsQuarter') || {}).value || Math.ceil((new Date().getMonth() + 1) / 3);
    var qNames = ['', 'Q1', 'Q2', 'Q3', 'Q4'];
    if (label) label.textContent = y + ' ' + qNames[q] + ' — Weekly target = quarterly / 13 weeks';

    var inspectors = getInspectorData();
    var inspCountLookup = {};
    var hoursLookup = {};
    var kmLookup = {};
    (dashboardData.travelPerInspector || []).forEach(function(item) {
        inspCountLookup[item.inspector_name] = item.inspection_count || 0;
        hoursLookup[item.inspector_name] = item.total_hours || 0;
        kmLookup[item.inspector_name] = item.total_km || 0;
    });
    Object.keys(inspCountLookup).forEach(function(name) {
        if (!inspectors[name]) inspectors[name] = { inspections: {}, samples: {} };
    });

    var financialData = dashboardData.inspectorFinancials || [];
    var finMap = {};
    financialData.forEach(function(f) { finMap[f.inspector_name] = f; });

    // Weeks elapsed in the quarter
    var now = new Date();
    var qStartMonth = (parseInt(q) - 1) * 3;
    var qStart = new Date(parseInt(y), qStartMonth, 1);
    var qEnd = new Date(parseInt(y), qStartMonth + 3, 0);
    var weeksElapsed = 1;
    if (now >= qStart && now <= qEnd) {
        weeksElapsed = Math.max(1, Math.ceil((now - qStart) / (7 * 86400000)));
    } else if (now > qEnd) {
        weeksElapsed = 13;
    }

    var html = '';
    var totals = { rev: 0, target: 0, salary: 0, vehicle: 0, other: 0, mgmt: 0, cost: 0, profit: 0 };
    var inspectorNames = Object.keys(inspectors).sort();

    inspectorNames.forEach(function(name) {
        var d = inspectors[name];
        var t = getEffectiveTarget(name);
        var fin = finMap[name] || {};
        var qt = (t.financial || {});

        var totalRevenue = fin.total_revenue || 0;
        var salary3 = (qt.monthly_salary || getInspectorSalary(name) || 0) * 3;
        var vehicle3 = (qt.monthly_vehicle_cost || 0) * 3;
        var other3 = (qt.monthly_other_costs || 0) * 3;
        var mgmtFee = Math.round((salary3 + vehicle3 + other3) * 0.20);
        var totalCost = salary3 + vehicle3 + other3 + mgmtFee;
        var profit = totalRevenue - totalCost;
        var margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;
        var revTarget = qt.quarterly_revenue_target || 0;
        var weeklyTarget = revTarget > 0 ? Math.round(revTarget / 13) : 0;
        var weeklyActual = weeksElapsed > 0 ? Math.round(totalRevenue / weeksElapsed) : 0;

        totals.rev += totalRevenue; totals.target += revTarget;
        totals.salary += salary3; totals.vehicle += vehicle3; totals.other += other3;
        totals.mgmt += mgmtFee; totals.cost += totalCost; totals.profit += profit;

        function fR(v) { return 'R' + v.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}); }
        var pColor = profit >= 0 ? '#166534' : '#991b1b';
        var pBg = profit >= 0 ? '#dcfce7' : '#fee2e2';
        var wColor = weeklyTarget > 0 ? (weeklyActual >= weeklyTarget ? '#166534' : '#991b1b') : '#6b7280';
        var wBg = weeklyTarget > 0 ? (weeklyActual >= weeklyTarget ? '#dcfce7' : '#fee2e2') : 'transparent';

        html += '<tr>';
        html += '<td style="font-weight:600; white-space:nowrap;">' + name + '</td>';
        html += '<td class="num">' + fR(totalRevenue) + '</td>';
        html += '<td class="num">' + (revTarget > 0 ? fR(revTarget) : '<span style="color:#9ca3af;">—</span>') + '</td>';
        html += '<td class="num">' + (salary3 > 0 ? fR(salary3) : '<span style="color:#9ca3af;">—</span>') + '</td>';
        html += '<td class="num">' + (vehicle3 > 0 ? fR(vehicle3) : '<span style="color:#9ca3af;">—</span>') + '</td>';
        html += '<td class="num">' + (other3 > 0 ? fR(other3) : '<span style="color:#9ca3af;">—</span>') + '</td>';
        html += '<td class="num">' + (mgmtFee > 0 ? fR(mgmtFee) : '<span style="color:#9ca3af;">—</span>') + '</td>';
        html += '<td class="num" style="font-weight:600;">' + (totalCost > 0 ? fR(totalCost) : '<span style="color:#9ca3af;">—</span>') + '</td>';
        html += '<td class="num" style="color:' + pColor + '; background:' + pBg + '; font-weight:700;">' + fR(profit) + '</td>';
        html += '<td class="num" style="color:' + (margin >= 20 ? '#166534' : margin >= 0 ? '#92400e' : '#991b1b') + '; font-weight:600;">' + margin + '%</td>';
        html += '<td class="num">' + (weeklyTarget > 0 ? fR(weeklyTarget) + '/wk' : '<span style="color:#9ca3af;">—</span>') + '</td>';
        html += '<td class="num" style="color:' + wColor + '; background:' + wBg + '; font-weight:600;">' + fR(weeklyActual) + '/wk</td>';
        html += '</tr>';
    });

    // Totals
    function fR(v) { return 'R' + v.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}); }
    var tpColor = totals.profit >= 0 ? '#166534' : '#991b1b';
    var tMargin = totals.rev > 0 ? Math.round((totals.profit / totals.rev) * 100) : 0;
    html += '<tr style="border-top:2px solid #374151; font-weight:700; background:#f9fafb;">';
    html += '<td>TOTAL</td>';
    html += '<td class="num">' + fR(totals.rev) + '</td>';
    html += '<td class="num">' + (totals.target > 0 ? fR(totals.target) : '—') + '</td>';
    html += '<td class="num">' + fR(totals.salary) + '</td>';
    html += '<td class="num">' + fR(totals.vehicle) + '</td>';
    html += '<td class="num">' + fR(totals.other) + '</td>';
    html += '<td class="num">' + fR(totals.mgmt) + '</td>';
    html += '<td class="num">' + fR(totals.cost) + '</td>';
    html += '<td class="num" style="color:' + tpColor + ';">' + fR(totals.profit) + '</td>';
    html += '<td class="num">' + tMargin + '%</td>';
    html += '<td class="num"></td><td class="num"></td><td class="num"></td>';
    html += '</tr>';
    tbody.innerHTML = html;
}

function openTargetsModal() {
    var modal = document.getElementById('targetsModal');
    if (!modal) return;
    modal.style.display = 'flex';

    // Populate year selector
    var yearSel = document.getElementById('targetYearSelect');
    if (yearSel && yearSel.options.length === 0) {
        var now = new Date();
        for (var y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
            var opt = document.createElement('option');
            opt.value = y; opt.textContent = y;
            if (y === parseInt((document.getElementById('targetsYear') || {}).value || now.getFullYear())) opt.selected = true;
            yearSel.appendChild(opt);
        }
    }
    var qtSel = document.getElementById('targetQuarterSelect');
    if (qtSel) qtSel.value = (document.getElementById('targetsQuarter') || {}).value || Math.ceil((new Date().getMonth() + 1) / 3);

    // Populate inspector dropdown
    var sel = document.getElementById('targetInspectorSelect');
    if (!sel) return;
    var names = new Set();
    (dashboardData.travelPerInspector || []).forEach(function(i) { if (i.inspector_name) names.add(i.inspector_name); });
    (dashboardData.inspectorCommodityMatrix || []).forEach(function(i) { if (i.inspector_name) names.add(i.inspector_name); });
    Object.keys(dashboardData.inspectorTargets || {}).forEach(function(n) { names.add(n); });
    Object.keys(_currentQuarterTargets()).forEach(function(n) { names.add(n); });
    var sorted = Array.from(names).sort();
    sel.innerHTML = '<option value="__all__">All Inspectors</option>';
    sorted.forEach(function(name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (_currentQuarterTargets()[name]) opt.textContent += ' *';
        sel.appendChild(opt);
    });
    // Pre-fill form with existing quarterly targets if available
    var qt = _currentQuarterTargets();
    var qtKeys = Object.keys(qt);
    if (qtKeys.length > 0) {
        var sample = qt[qtKeys[0]];
        document.getElementById('targetEggs').value = sample.eggs || 0;
        document.getElementById('targetPoultry').value = sample.poultry || 0;
        document.getElementById('targetRaw').value = sample.raw || 0;
        document.getElementById('targetPmp').value = sample.pmp || 0;
        document.getElementById('targetRawSamples').value = sample.raw_samples || 0;
        document.getElementById('targetPmpSamples').value = sample.pmp_samples || 0;
        document.getElementById('targetTotalSamples').value = sample.total_samples || 0;
        document.getElementById('targetSalary').value = 0;
        document.getElementById('targetRevTarget').value = sample.quarterly_revenue_target || 0;
        document.getElementById('targetVehicle').value = sample.monthly_vehicle_cost || 0;
        document.getElementById('targetOther').value = sample.monthly_other_costs || 0;
        document.getElementById('targetNotes').value = '';
    } else {
        _resetTargetFormToZero();
    }
    document.getElementById('targetSaveStatus').textContent = '';
}

function _resetTargetFormToZero() {
    document.getElementById('targetEggs').value = 0;
    document.getElementById('targetPoultry').value = 0;
    document.getElementById('targetRaw').value = 0;
    document.getElementById('targetPmp').value = 0;
    document.getElementById('targetRawSamples').value = 0;
    document.getElementById('targetPmpSamples').value = 0;
    document.getElementById('targetTotalSamples').value = 0;
    document.getElementById('targetSalary').value = 0;
    document.getElementById('targetRevTarget').value = 0;
    document.getElementById('targetVehicle').value = 0;
    document.getElementById('targetOther').value = 0;
    document.getElementById('targetNotes').value = '';
}

function closeTargetsModal() {
    var modal = document.getElementById('targetsModal');
    if (modal) modal.style.display = 'none';
}

function onTargetInspectorChange() {
    var name = document.getElementById('targetInspectorSelect').value;
    if (!name || name === '__all__') { _resetTargetFormToZero(); return; }
    var year = document.getElementById('targetYearSelect').value;
    var quarter = document.getElementById('targetQuarterSelect').value;

    // Load quarterly targets for this year/quarter and populate
    _loadQuarterlyTargets(year, quarter, function(targets) {
        var qt = targets[name];
        if (qt) {
            document.getElementById('targetEggs').value = qt.eggs;
            document.getElementById('targetPoultry').value = qt.poultry;
            document.getElementById('targetRaw').value = qt.raw;
            document.getElementById('targetPmp').value = qt.pmp;
            document.getElementById('targetRawSamples').value = qt.raw_samples;
            document.getElementById('targetPmpSamples').value = qt.pmp_samples;
            document.getElementById('targetTotalSamples').value = qt.total_samples;
            document.getElementById('targetSalary').value = qt.monthly_salary || 0;
            document.getElementById('targetRevTarget').value = qt.quarterly_revenue_target || 0;
            document.getElementById('targetVehicle').value = qt.monthly_vehicle_cost || 0;
            document.getElementById('targetOther').value = qt.monthly_other_costs || 0;
            document.getElementById('targetNotes').value = qt.notes || '';
        } else {
            _resetTargetFormToZero();
        }
        document.getElementById('targetSaveStatus').textContent = '';
    });
}

function saveInspectorTarget() {
    var name = document.getElementById('targetInspectorSelect').value;
    if (!name) { document.getElementById('targetSaveStatus').innerHTML = '<span style="color:#991b1b;">Please select an inspector</span>'; return; }
    if (name === '__all__') { saveTargetAllInspectors(); return; }
    var year = parseInt(document.getElementById('targetYearSelect').value);
    var quarter = parseInt(document.getElementById('targetQuarterSelect').value);
    var payload = {
        inspector_name: name, year: year, quarter: quarter,
        eggs: parseInt(document.getElementById('targetEggs').value) || 0,
        poultry: parseInt(document.getElementById('targetPoultry').value) || 0,
        raw: parseInt(document.getElementById('targetRaw').value) || 0,
        pmp: parseInt(document.getElementById('targetPmp').value) || 0,
        raw_samples: parseInt(document.getElementById('targetRawSamples').value) || 0,
        pmp_samples: parseInt(document.getElementById('targetPmpSamples').value) || 0,
        total_samples: parseInt(document.getElementById('targetTotalSamples').value) || 0,
        monthly_salary: parseFloat(document.getElementById('targetSalary').value) || 0,
        quarterly_revenue_target: parseFloat(document.getElementById('targetRevTarget').value) || 0,
        monthly_vehicle_cost: parseFloat(document.getElementById('targetVehicle').value) || 0,
        monthly_other_costs: parseFloat(document.getElementById('targetOther').value) || 0,
        notes: document.getElementById('targetNotes').value || '',
    };
    var btn = document.getElementById('targetSaveBtn');
    btn.disabled = true; btn.textContent = 'Saving...';
    var statusEl = document.getElementById('targetSaveStatus');

    // Save to quarterly targets API
    fetch(window.DJANGO_CONFIG.saveQuarterlyTargetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify(payload)
    }).then(function(resp) { return resp.json(); }).then(function(data) {
        if (data.success) {
            // Also save to legacy InspectorTarget for backward compat
            fetch(window.DJANGO_CONFIG.updateTargetsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify(payload)
            }).catch(function() {});

            // Update caches
            var key = _qtCacheKey(year, quarter);
            if (!_quarterlyTargetsCache[key]) _quarterlyTargetsCache[key] = {};
            _quarterlyTargetsCache[key][name] = payload;
            if (!dashboardData.inspectorTargets) dashboardData.inspectorTargets = {};
            dashboardData.inspectorTargets[name] = {
                eggs: payload.eggs, poultry: payload.poultry, raw: payload.raw, pmp: payload.pmp,
                raw_samples: payload.raw_samples, pmp_samples: payload.pmp_samples, total_samples: payload.total_samples
            };
            statusEl.innerHTML = '<span style="color:#166534;"><i class="fas fa-check-circle"></i> Saved for ' + year + ' Q' + quarter + '!</span>';
            renderInspectorTargetsTable();
            renderInspectorRadarChart();
            renderProfitabilityTable();
            var opt = document.querySelector('#targetInspectorSelect option[value="' + name + '"]');
            if (opt && opt.textContent.indexOf('*') === -1) opt.textContent += ' *';
        } else {
            statusEl.innerHTML = '<span style="color:#991b1b;">Error: ' + (data.error || 'Unknown') + '</span>';
        }
    }).catch(function(err) {
        statusEl.innerHTML = '<span style="color:#991b1b;">Network error</span>';
    }).finally(function() {
        btn.disabled = false; btn.textContent = 'Save Target';
    });
}

function saveTargetAllInspectors() {
    var year = parseInt(document.getElementById('targetYearSelect').value);
    var quarter = parseInt(document.getElementById('targetQuarterSelect').value);
    var statusEl = document.getElementById('targetSaveStatus');
    var btn = document.getElementById('targetSaveAllBtn');

    // Gather all inspector names
    var names = new Set();
    (dashboardData.travelPerInspector || []).forEach(function(i) { if (i.inspector_name) names.add(i.inspector_name); });
    (dashboardData.inspectorCommodityMatrix || []).forEach(function(i) { if (i.inspector_name) names.add(i.inspector_name); });
    Object.keys(dashboardData.inspectorTargets || {}).forEach(function(n) { names.add(n); });
    var allNames = Array.from(names).sort();

    if (allNames.length === 0) { statusEl.innerHTML = '<span style="color:#991b1b;">No inspectors found</span>'; return; }
    if (!confirm('Apply these targets to all ' + allNames.length + ' inspectors for ' + year + ' Q' + quarter + '?')) return;

    var basePayload = {
        eggs: parseInt(document.getElementById('targetEggs').value) || 0,
        poultry: parseInt(document.getElementById('targetPoultry').value) || 0,
        raw: parseInt(document.getElementById('targetRaw').value) || 0,
        pmp: parseInt(document.getElementById('targetPmp').value) || 0,
        raw_samples: parseInt(document.getElementById('targetRawSamples').value) || 0,
        pmp_samples: parseInt(document.getElementById('targetPmpSamples').value) || 0,
        total_samples: parseInt(document.getElementById('targetTotalSamples').value) || 0,
        monthly_salary: parseFloat(document.getElementById('targetSalary').value) || 0,
        quarterly_revenue_target: parseFloat(document.getElementById('targetRevTarget').value) || 0,
        monthly_vehicle_cost: parseFloat(document.getElementById('targetVehicle').value) || 0,
        monthly_other_costs: parseFloat(document.getElementById('targetOther').value) || 0,
        notes: document.getElementById('targetNotes').value || '',
    };

    btn.disabled = true; btn.textContent = 'Saving...';
    var saved = 0; var failed = 0;
    var key = _qtCacheKey(year, quarter);
    if (!_quarterlyTargetsCache[key]) _quarterlyTargetsCache[key] = {};

    var promises = allNames.map(function(name) {
        var payload = Object.assign({}, basePayload, { inspector_name: name, year: year, quarter: quarter });
        return fetch(window.DJANGO_CONFIG.saveQuarterlyTargetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify(payload)
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.success) {
                saved++;
                _quarterlyTargetsCache[key][name] = payload;
            } else { failed++; }
        }).catch(function() { failed++; });
    });

    Promise.all(promises).then(function() {
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-users"></i> Apply to All Inspectors';
        if (failed === 0) {
            statusEl.innerHTML = '<span style="color:#166534;"><i class="fas fa-check-circle"></i> Saved for all ' + saved + ' inspectors (' + year + ' Q' + quarter + ')</span>';
        } else {
            statusEl.innerHTML = '<span style="color:#92400e;"><i class="fas fa-exclamation-circle"></i> ' + saved + ' saved, ' + failed + ' failed</span>';
        }
        renderInspectorTargetsTable();
        renderInspectorRadarChart();
        renderProfitabilityTable();
    });
}

function getCsrfToken() {
    var cookie = document.cookie.split(';').find(function(c) { return c.trim().startsWith('csrftoken='); });
    return cookie ? cookie.split('=')[1] : '';
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
        renderInspectorTargetsTable,
        renderInspectorRadarChart,
        renderProfitabilityTable,
        renderInspectorTrendChart,
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
        renderRevenueCostChart,
        renderInspectorComparisonChart
    ]
};

// Track which panels have been rendered after the last data load
var panelRendered = {
    'overview': false, 'inspectors': false, 'compliance': false,
    'operations': false, 'documents': false, 'financial': false
};

var currentPanel = (window.DJANGO_CONFIG && window.DJANGO_CONFIG.userRole === 'inspector') ? 'financial' : 'overview';

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
