"""
KPI Email Service
Computes quarterly KPI data for each inspector and sends a professional
plain-format HTML email summarising their progress.
"""
import logging
from datetime import date
from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)

COMMODITY_LABELS = {
    'POULTRY': 'Poultry',
    'RAW':     'Raw Meat',
    'PMP':     'PMP',
    'EGGS':    'Eggs',
}
COMMODITIES = list(COMMODITY_LABELS.keys())


# ---------------------------------------------------------------------------
# Quarter helpers
# ---------------------------------------------------------------------------

def get_quarter_bounds(today=None):
    import calendar
    today = today or date.today()
    q = (today.month - 1) // 3 + 1
    q_start_month = (q - 1) * 3 + 1
    q_end_month   = q_start_month + 2
    q_start = date(today.year, q_start_month, 1)
    last_day = calendar.monthrange(today.year, q_end_month)[1]
    q_end = date(today.year, q_end_month, last_day)
    total_days   = (q_end - q_start).days + 1
    days_elapsed = (today - q_start).days + 1
    progress_pct = min(days_elapsed / total_days, 1.0)
    return q, today.year, q_start, q_end, progress_pct


# ---------------------------------------------------------------------------
# KPI data computation
# ---------------------------------------------------------------------------

def compute_inspector_kpi(inspector_name, all_names=None):
    from django.db.models import Q, Sum
    from ..models import (
        FoodSafetyAgencyInspection, InspectionGroup,
        QuarterlyTarget, InspectorSalary, InspectionFee,
    )

    today = date.today()
    quarter, year, q_start, q_end, progress_pct = get_quarter_bounds(today)

    names = all_names or [inspector_name]
    name_q = Q()
    for n in names:
        if n:
            name_q |= Q(inspector_name__iexact=n)

    q_inspections = FoodSafetyAgencyInspection.objects.filter(
        name_q,
        date_of_inspection__gte=q_start,
        date_of_inspection__lte=today,
    )

    kpi_actual = {c: q_inspections.filter(commodity__iexact=c).count() for c in COMMODITIES}
    kpi_actual_total = q_inspections.count()

    qt = QuarterlyTarget.objects.filter(
        inspector_name__iexact=inspector_name, year=year, quarter=quarter
    ).first()

    kpi_targets = {
        'POULTRY': int(getattr(qt, 'poultry', 0) or 0),
        'RAW':     int(getattr(qt, 'raw',     0) or 0),
        'PMP':     int(getattr(qt, 'pmp',     0) or 0),
        'EGGS':    int(getattr(qt, 'eggs',    0) or 0),
    }
    kpi_total_target = sum(kpi_targets.values())

    rows = []
    for commodity in COMMODITIES:
        target = kpi_targets[commodity]
        actual = kpi_actual[commodity]
        expected_by_now = round(target * progress_pct) if target else 0
        still_needed = max(target - actual, 0)

        if target == 0:
            pct    = 0
            status = 'no_target'
        else:
            pct = min(round(actual / target * 100), 100)
            pct_of_expected = round(actual / expected_by_now * 100) if expected_by_now else 100
            if pct_of_expected >= 100:
                status = 'on_track'
            elif pct_of_expected >= 75:
                status = 'slightly_behind'
            else:
                status = 'behind'

        rows.append({
            'commodity':       commodity,
            'label':           COMMODITY_LABELS[commodity],
            'target':          target,
            'actual':          actual,
            'still_needed':    still_needed,
            'expected_by_now': expected_by_now,
            'pct':             pct,
            'status':          status,
        })

    if kpi_total_target > 0:
        expected_total = round(kpi_total_target * progress_pct)
        pct_of_expected = round(kpi_actual_total / expected_total * 100) if expected_total else 100
        if pct_of_expected >= 100:
            overall_status = 'on_track'
        elif pct_of_expected >= 75:
            overall_status = 'slightly_behind'
        else:
            overall_status = 'behind'
    else:
        overall_status = 'no_target'

    # Profitability
    try:
        fee_rates = {f.fee_code: float(f.rate) for f in InspectionFee.objects.all()}
    except Exception:
        fee_rates = {}
    hourly_rate = fee_rates.get('inspection_hour_rate', 510.0)
    km_rate     = fee_rates.get('inspection_km_rate', fee_rates.get('travel_rate_per_km', 5.5))
    sample_rate = fee_rates.get('sample_collection', 50.0)

    monthly_salary  = float(getattr(qt, 'monthly_salary',      None) or 0)
    monthly_vehicle = float(getattr(qt, 'monthly_vehicle_cost', None) or 0)
    monthly_other   = float(getattr(qt, 'monthly_other_costs',  None) or 0)
    rev_target_q    = float(getattr(qt, 'quarterly_revenue_target', None) or 0)

    if monthly_salary == 0:
        sal = InspectorSalary.objects.filter(inspector_name__iexact=inspector_name).first()
        if sal:
            monthly_salary = float(sal.monthly_salary or 0)

    grp_q = Q()
    for n in names:
        if n:
            grp_q |= Q(inspector_name__iexact=n)
    agg = InspectionGroup.objects.filter(
        grp_q,
        date_of_inspection__gte=q_start,
        date_of_inspection__lte=today,
    ).aggregate(total_hours=Sum('hours'), total_km=Sum('km_traveled'))

    prof_hours   = float(agg['total_hours'] or 0)
    prof_km      = float(agg['total_km']    or 0)
    prof_samples = q_inspections.filter(is_sample_taken=True).count()

    rev_hours   = round(prof_hours   * hourly_rate, 2)
    rev_km      = round(prof_km      * km_rate,     2)
    rev_samples = round(prof_samples * sample_rate, 2)
    actual_rev  = round(rev_hours + rev_km + rev_samples, 2)
    q_costs     = round((monthly_salary + monthly_vehicle + monthly_other) * 3, 2)
    net_profit  = round(actual_rev - q_costs, 2)
    rev_pct     = round(actual_rev / rev_target_q * 100, 1) if rev_target_q > 0 else 0

    return {
        'inspector_name':   inspector_name,
        'quarter_label':    f'Q{quarter} {year}',
        'quarter_pct':      round(progress_pct * 100),
        'q_start':          q_start,
        'q_end':            q_end,
        'rows':             rows,
        'kpi_actual_total': kpi_actual_total,
        'kpi_total_target': kpi_total_target,
        'overall_status':   overall_status,
        'has_targets':      kpi_total_target > 0,
        'actual_revenue':   actual_rev,
        'rev_hours':        rev_hours,
        'rev_km':           rev_km,
        'rev_samples':      rev_samples,
        'rev_target':       rev_target_q,
        'rev_pct':          min(rev_pct, 100),
        'q_costs':          q_costs,
        'net_profit':       net_profit,
        'is_profitable':    net_profit >= 0,
        'monthly_salary':   monthly_salary,
        'hourly_rate':      hourly_rate,
        'km_rate':          km_rate,
        'sample_rate':      sample_rate,
        'total_hours':      round(prof_hours, 1),
        'total_km':         round(prof_km, 1),
        'total_samples':    prof_samples,
    }


# ---------------------------------------------------------------------------
# Professional plain-format email builder
# ---------------------------------------------------------------------------

_STATUS_LABEL = {
    'on_track':        'On Track',
    'slightly_behind': 'Slightly Behind',
    'behind':          'Behind Schedule',
    'no_target':       'No Targets Set',
}

_STATUS_MESSAGE = {
    'on_track': (
        "Well done — you are on track to meet your quarterly targets.",
        "Please maintain your current pace over the remaining days to ensure you finish the quarter strongly.",
    ),
    'slightly_behind': (
        "You are slightly behind pace for this quarter.",
        "With additional focus over the remaining days you can still meet your targets. "
        "Please prioritise scheduling inspections in the commodities where you are furthest behind.",
    ),
    'behind': (
        "You are currently behind on your quarterly targets and this requires urgent attention.",
        "Please review your schedule and aim to complete additional inspections this week. "
        "Contact your manager if you need assistance prioritising your workload.",
    ),
    'no_target': (
        "No formal KPI targets have been configured for you this quarter.",
        "Please contact your manager to have your targets set so that your progress can be "
        "tracked going forward. Your actual inspection counts are listed below for reference.",
    ),
}


def build_kpi_email_html(data, first_name):
    status_label = _STATUS_LABEL.get(data['overall_status'], 'Unknown')
    headline, body_msg = _STATUS_MESSAGE.get(data['overall_status'], _STATUS_MESSAGE['no_target'])
    net_sign = '+' if data['net_profit'] >= 0 else ''
    profitability_note = 'Profitable' if data['is_profitable'] else 'Not Profitable'

    # Commodity table rows
    commodity_rows = ''
    for row in data['rows']:
        if row['target'] > 0:
            progress_note = (
                'Target reached'
                if row['still_needed'] == 0
                else f"Requires {row['still_needed']} more inspection(s) to reach target"
            )
            commodity_rows += f"""
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">{row['label']}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">{row['actual']}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">{row['target']}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">{row['expected_by_now']}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">{row['pct']}%</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">{progress_note}</td>
      </tr>"""
        else:
            commodity_rows += f"""
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">{row['label']}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">{row['actual']}</td>
        <td colspan="4" style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#9ca3af;font-style:italic;">No target set</td>
      </tr>"""

    total_expected_now = round(data['kpi_total_target'] * data['quarter_pct'] / 100) if data['kpi_total_target'] else 0
    total_pct = round(data['kpi_actual_total'] / data['kpi_total_target'] * 100) if data['kpi_total_target'] else 0

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{data['quarter_label']} KPI Report — {data['inspector_name']}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:660px;margin:0 auto;padding:30px 20px;font-family:Calibri,Arial,sans-serif;font-size:14px;color:#222222;line-height:1.6;">

  <!-- Letterhead -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:2px solid #007890;padding-bottom:14px;margin-bottom:24px;">
    <tr>
      <td>
        <div style="font-size:16px;font-weight:700;color:#007890;">Food Safety Agency (Pty) Ltd</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">Agricultural Products Standards</div>
      </td>
      <td align="right" style="vertical-align:bottom;">
        <div style="font-size:12px;color:#6b7280;">{data['quarter_label']} KPI Report</div>
        <div style="font-size:12px;color:#6b7280;">{data['q_start'].strftime('%d %B')} – {data['q_end'].strftime('%d %B %Y')}</div>
      </td>
    </tr>
  </table>

  <!-- Salutation -->
  <p style="margin:0 0 12px;">Dear {first_name},</p>
  <p style="margin:0 0 16px;">
    We trust this correspondence finds you well. Please find below your quarterly KPI progress report for
    <strong>{data['quarter_label']}</strong>. The quarter is currently <strong>{data['quarter_pct']}%</strong> complete.
  </p>

  <!-- Overall Status -->
  <p style="margin:0 0 6px;"><strong>Overall KPI Status: {status_label}</strong></p>
  <p style="margin:0 0 20px;">{headline} {body_msg}</p>

  <!-- Inspection Summary -->
  <p style="margin:0 0 6px;"><strong>Inspection Summary</strong></p>
  <p style="margin:0 0 4px;">
    Inspections completed this quarter: <strong>{data['kpi_actual_total']}</strong> of <strong>{data['kpi_total_target']}</strong> ({total_pct}% of quarterly target).
  </p>
  <p style="margin:0 0 20px;">
    Expected at this stage of the quarter: approximately <strong>{total_expected_now}</strong> inspections.
  </p>

  <!-- Commodity Table -->
  <p style="margin:0 0 8px;"><strong>Breakdown by Commodity</strong></p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;margin-bottom:24px;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:8px 10px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:0.04em;">Commodity</th>
        <th style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:0.04em;">Done</th>
        <th style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:0.04em;">Target</th>
        <th style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:0.04em;">Expected by Now</th>
        <th style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:0.04em;">Progress</th>
        <th style="padding:8px 10px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;text-transform:uppercase;letter-spacing:0.04em;">Notes</th>
      </tr>
    </thead>
    <tbody>{commodity_rows}
    </tbody>
  </table>

  <!-- Profitability -->
  <p style="margin:0 0 8px;"><strong>Profitability — {data['quarter_label']}</strong></p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;margin-bottom:24px;">
    <tr>
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;">Inspection Hours &nbsp;({data['total_hours']} hrs × R{data['hourly_rate']}/hr)</td>
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;text-align:right;">R {data['rev_hours']:,.2f}</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;">Travel &nbsp;({data['total_km']} km × R{data['km_rate']}/km)</td>
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;text-align:right;">R {data['rev_km']:,.2f}</td>
    </tr>
    <tr>
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;">Samples &nbsp;({data['total_samples']} × R{data['sample_rate']})</td>
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;text-align:right;">R {data['rev_samples']:,.2f}</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;font-weight:700;">Total Revenue</td>
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;">R {data['actual_revenue']:,.2f}</td>
    </tr>
    <tr>
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;">Operational Expense &nbsp;(R {data['monthly_salary']:,.0f}/month × 3 months)</td>
      <td style="padding:7px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;text-align:right;">R {data['q_costs']:,.2f}</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:7px 12px;font-size:13px;font-weight:700;">Net Result &nbsp;({profitability_note})</td>
      <td style="padding:7px 12px;font-size:13px;font-weight:700;text-align:right;">{net_sign}R {data['net_profit']:,.2f}</td>
    </tr>
  </table>

  <!-- Closing -->
  <p style="margin:0 0 16px;">
    Should you have any queries regarding this report or your targets, please do not hesitate to contact your manager directly.
    We appreciate your continued dedication and commitment to food safety compliance.
  </p>

  <p style="margin:0 0 4px;">Kind Regards / Vriendelike Groete</p>
  <p style="margin:0 0 2px;font-weight:700;">Food Safety Agency (Pty) Ltd</p>
  <p style="margin:0 0 2px;font-size:12px;color:#6b7280;">Agricultural Products Standards</p>
  <p style="margin:0 0 2px;font-size:12px;color:#6b7280;">Tel: (012) 361-1937</p>
  <p style="margin:0 0 2px;font-size:12px;color:#6b7280;">Email: <a href="mailto:Info@afsq.co.za" style="color:#007890;">Info@afsq.co.za</a></p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px;">
  <p style="margin:0;font-size:11px;color:#9ca3af;">
    Automated KPI report &nbsp;|&nbsp; Inspector: <strong>{data['inspector_name']}</strong> &nbsp;|&nbsp; Period: {data['quarter_label']}
  </p>

</div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Send to one inspector
# ---------------------------------------------------------------------------

def send_kpi_email_to_inspector(user):
    """Send a KPI email to a single inspector User. Returns (success, message)."""
    if not user.email:
        return False, f'{user.username} has no email address configured'

    name = user.get_full_name() or user.username
    first_name = user.first_name or (name.split()[0] if name else 'Inspector')

    try:
        data = compute_inspector_kpi(name)
    except Exception as e:
        logger.exception('KPI compute failed for %s', name)
        return False, f'Failed to compute KPI for {name}: {e}'

    status_label = _STATUS_LABEL.get(data['overall_status'], '')
    subject = f"{data['quarter_label']} KPI Report — {name} ({status_label})"
    html_body = build_kpi_email_html(data, first_name)

    # CC inspector's manager(s)
    cc_emails = []
    try:
        from ..models import InspectorManagerAllocation
        manager_allocs = InspectorManagerAllocation.objects.filter(
            inspector=user
        ).select_related('manager')
        for alloc in manager_allocs:
            if alloc.manager.email:
                cc_emails.append(alloc.manager.email)
    except Exception:
        pass

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '')
    # TEST MODE: redirect all emails to dev address
    TEST_EMAIL = 'ethansevenster5@gmail.com'
    try:
        msg = EmailMessage(
            subject=subject,
            body=html_body,
            from_email=from_email,
            to=[TEST_EMAIL],
            cc=[TEST_EMAIL],
        )
        msg.content_subtype = 'html'
        msg.send()
        logger.info('KPI email sent to %s (%s)', name, user.email)
        return True, f'Sent to {name} <{user.email}>'
    except Exception as e:
        logger.exception('Failed to send KPI email to %s', user.email)
        return False, f'Email failed for {name}: {e}'


# ---------------------------------------------------------------------------
# Send to all inspectors
# ---------------------------------------------------------------------------

def send_kpi_emails_to_all(inspector_users=None):
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if inspector_users is None:
        inspector_users = User.objects.filter(role='inspector', is_active=True)

    results = []
    for user in inspector_users:
        success, msg = send_kpi_email_to_inspector(user)
        results.append({
            'name':    user.get_full_name() or user.username,
            'email':   user.email,
            'success': success,
            'message': msg,
        })
    return results
