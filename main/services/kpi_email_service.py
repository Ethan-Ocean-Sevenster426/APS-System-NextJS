"""
KPI Email Service
Computes quarterly KPI data for each inspector and sends a personalised
HTML email summarising their progress, what they still need to do, and
their profitability position.
"""
import logging
from datetime import date, timedelta
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
# KPI data computation
# ---------------------------------------------------------------------------

def get_quarter_bounds(today=None):
    today = today or date.today()
    q = (today.month - 1) // 3 + 1
    q_start_month = (q - 1) * 3 + 1
    q_start = date(today.year, q_start_month, 1)
    last_month = q_start_month + 2
    last_day = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][last_month - 1]
    if last_month == 2 and today.year % 4 == 0:
        last_day = 29
    q_end = date(today.year, last_month, last_day)
    total_days = (q_end - q_start).days + 1
    days_elapsed = (today - q_start).days + 1
    progress_pct = min(days_elapsed / total_days, 1.0)
    return q, today.year, q_start, q_end, progress_pct


def compute_inspector_kpi(inspector_name, all_names=None):
    """
    Returns a dict with KPI + profitability data for one inspector.
    `all_names` is a list of name variants (aliases) to aggregate inspections across.
    """
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

    # Quarterly inspections
    q_inspections = FoodSafetyAgencyInspection.objects.filter(
        name_q,
        date_of_inspection__gte=q_start,
        date_of_inspection__lte=today,
    )

    kpi_actual = {c: q_inspections.filter(commodity__iexact=c).count() for c in COMMODITIES}
    kpi_actual_total = q_inspections.count()

    # Targets
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

    # Per-commodity rows
    rows = []
    for commodity in COMMODITIES:
        target = kpi_targets[commodity]
        actual = kpi_actual[commodity]
        expected_by_now = round(target * progress_pct) if target else 0
        still_needed = max(target - actual, 0)

        if target == 0:
            pct = 0
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
            'commodity': commodity,
            'label': COMMODITY_LABELS[commodity],
            'target': target,
            'actual': actual,
            'still_needed': still_needed,
            'expected_by_now': expected_by_now,
            'pct': pct,
            'status': status,
        })

    # Overall status
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
        'inspector_name': inspector_name,
        'quarter_label':  f'Q{quarter} {year}',
        'quarter_pct':    round(progress_pct * 100),
        'q_start':        q_start,
        'q_end':          q_end,
        # KPI
        'rows':             rows,
        'kpi_actual_total': kpi_actual_total,
        'kpi_total_target': kpi_total_target,
        'overall_status':   overall_status,
        'has_targets':      kpi_total_target > 0,
        # Profitability
        'actual_revenue':   actual_rev,
        'rev_target':       rev_target_q,
        'rev_pct':          min(rev_pct, 100),
        'q_costs':          q_costs,
        'net_profit':       net_profit,
        'is_profitable':    net_profit >= 0,
        'monthly_salary':   monthly_salary,
        'hourly_rate':      hourly_rate,
        'km_rate':          km_rate,
        'total_hours':      round(prof_hours, 1),
        'total_km':         round(prof_km, 1),
    }


# ---------------------------------------------------------------------------
# HTML email builder
# ---------------------------------------------------------------------------

_STATUS_COLOR = {
    'on_track':       ('#166534', '#dcfce7', 'On Track'),
    'slightly_behind': ('#854d0e', '#fef9c3', 'Slightly Behind'),
    'behind':         ('#991b1b', '#fee2e2', 'Behind'),
    'no_target':      ('#374151', '#f3f4f6', 'No Targets Set'),
}
_STATUS_ICON = {
    'on_track':        '✅',
    'slightly_behind': '⚠️',
    'behind':          '🔴',
    'no_target':       'ℹ️',
}
_STATUS_MESSAGE = {
    'on_track': (
        "You're doing great!",
        "You're on track to meet your quarterly targets. Keep up the excellent work and "
        "push a little harder over the remaining days to make sure you cross the finish line strong."
    ),
    'slightly_behind': (
        "Almost there — push a little harder!",
        "You're slightly behind pace for this quarter. With some extra focus over the remaining "
        "days you can still meet your targets. Every inspection counts — let's close that gap!"
    ),
    'behind': (
        "Time to step it up!",
        "You're currently falling behind on your quarterly targets. Don't worry — there's still "
        "time to turn it around. Focus on the commodities where you're furthest behind and aim "
        "to book additional inspections this week."
    ),
    'no_target': (
        "Your quarterly targets haven't been configured yet.",
        "No formal KPI targets have been set for you this quarter. Ask your manager to configure "
        "your targets so you can track your progress going forward. Your actual inspection counts "
        "are shown below for reference."
    ),
}


def _commodity_rows_html(rows):
    cols = []
    for row in rows:
        color, bg, _ = _STATUS_COLOR.get(row['status'], _STATUS_COLOR['no_target'])
        icon = _STATUS_ICON.get(row['status'], '')
        if row['still_needed'] > 0:
            need_html = f'<p style="margin:4px 0 0;font-size:12px;color:#dc2626;font-weight:600;">Need {row["still_needed"]} more</p>'
        elif row['target'] > 0:
            need_html = '<p style="margin:4px 0 0;font-size:12px;color:#166534;font-weight:600;">✓ Target reached!</p>'
        else:
            need_html = '<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">No target set</p>'

        bar_width = row['pct']
        bar_color = '#22c55e' if row['status'] == 'on_track' else '#f59e0b' if row['status'] == 'slightly_behind' else '#ef4444'

        cols.append(f'''
        <td style="width:25%;padding:6px;vertical-align:top;">
          <div style="background:{bg};border:1px solid {color}33;border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:{color};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">{icon} {row["label"]}</div>
            <div style="font-size:32px;font-weight:900;color:{color};line-height:1;">{row["actual"]}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">of <strong>{row["target"]}</strong> target</div>
            {need_html}
            <div style="background:#e5e7eb;border-radius:4px;height:6px;margin-top:10px;overflow:hidden;">
              <div style="background:{bar_color};height:100%;width:{bar_width}%;border-radius:4px;"></div>
            </div>
            <div style="font-size:11px;color:{color};font-weight:700;margin-top:4px;">{bar_width}%</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:3px;">Expected by now: ~{row["expected_by_now"]}</div>
          </div>
        </td>''')
    return ''.join(cols)


def build_kpi_email_html(data, first_name):
    color, bg, status_label = _STATUS_COLOR.get(data['overall_status'], _STATUS_COLOR['no_target'])
    icon = _STATUS_ICON.get(data['overall_status'], '')
    headline, body_msg = _STATUS_MESSAGE.get(data['overall_status'], _STATUS_MESSAGE['no_target'])

    # Profitability block
    profit_color = '#166534' if data['is_profitable'] else '#991b1b'
    profit_bg    = '#dcfce7' if data['is_profitable'] else '#fee2e2'
    profit_label = 'Profitable' if data['is_profitable'] else 'Not Profitable'
    net_sign     = '+' if data['net_profit'] >= 0 else ''

    commodity_html = _commodity_rows_html(data['rows'])

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{data['quarter_label']} KPI Update</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:30px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#007890 0%,#005f73 100%);padding:32px 40px;text-align:center;">
    <div style="font-size:13px;color:rgba(255,255,255,0.8);font-weight:500;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px;">Food Safety Agency (Pty) Ltd</div>
    <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">{data['quarter_label']} KPI Update</div>
    <div style="margin-top:12px;display:inline-block;background:rgba(255,255,255,0.2);border-radius:999px;padding:6px 18px;">
      <span style="font-size:13px;color:#ffffff;font-weight:600;">{icon} {status_label}</span>
    </div>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="padding:32px 40px 16px;">
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">Hi {first_name},</p>
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:{color};">{headline}</p>
    <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6;">{body_msg}</p>
  </td></tr>

  <!-- Quarter progress bar -->
  <tr><td style="padding:0 40px 24px;">
    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">
        <span>Quarter Progress</span>
        <span>{data['quarter_pct']}% through {data['quarter_label']}</span>
      </div>
      <div style="background:#e5e7eb;border-radius:6px;height:10px;overflow:hidden;">
        <div style="background:#007890;height:100%;width:{data['quarter_pct']}%;border-radius:6px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#9ca3af;margin-top:4px;">
        <span>{data['q_start'].strftime('%d %b')}</span>
        <span>Total: <strong style="color:#111827;">{data['kpi_actual_total']} / {data['kpi_total_target']}</strong> inspections</span>
        <span>{data['q_end'].strftime('%d %b')}</span>
      </div>
    </div>
  </td></tr>

  <!-- Commodity breakdown -->
  <tr><td style="padding:0 40px 24px;">
    <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Inspection Targets by Commodity</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>{commodity_html}</tr>
    </table>
  </td></tr>

  <!-- Profitability -->
  <tr><td style="padding:0 40px 28px;">
    <div style="background:{profit_bg};border:1px solid {profit_color}33;border-radius:10px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:13px;font-weight:700;color:{profit_color};text-transform:uppercase;letter-spacing:0.05em;">Profitability</span>
        <span style="background:{profit_color};color:#fff;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;">{profit_label}</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#374151;">Revenue ({data['total_hours']}h × R{data['hourly_rate']} + {data['total_km']}km × R{data['km_rate']})</td>
          <td align="right" style="font-size:13px;font-weight:700;color:#166534;">R {data['actual_revenue']:,.2f}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#374151;padding-top:4px;">Costs (Salary R{data['monthly_salary']:,.0f} × 3)</td>
          <td align="right" style="font-size:13px;font-weight:700;color:#991b1b;padding-top:4px;">R {data['q_costs']:,.2f}</td>
        </tr>
        <tr>
          <td colspan="2"><div style="border-top:1px solid {profit_color}33;margin:10px 0;"></div></td>
        </tr>
        <tr>
          <td style="font-size:15px;font-weight:700;color:{profit_color};">Net Profit / Loss</td>
          <td align="right" style="font-size:22px;font-weight:900;color:{profit_color};">{net_sign}R {data['net_profit']:,.2f}</td>
        </tr>
      </table>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">This is an automated KPI report from the Food Safety Agency portal.</p>
    <p style="margin:0;font-size:12px;color:#6b7280;">For queries contact your manager or visit the portal at <a href="https://portal.fsa-pty.co.za" style="color:#007890;">portal.fsa-pty.co.za</a></p>
  </td></tr>

</table>
</td></tr></table>
</body></html>"""


# ---------------------------------------------------------------------------
# Send to one inspector
# ---------------------------------------------------------------------------

def send_kpi_email_to_inspector(user):
    """Send a KPI email to a single inspector User. Returns (success, message)."""
    if not user.email:
        return False, f'{user.username} has no email address configured'

    name = user.get_full_name() or user.username
    first_name = user.first_name or name.split()[0] if name else 'Inspector'

    try:
        data = compute_inspector_kpi(name)
    except Exception as e:
        logger.exception('KPI compute failed for %s', name)
        return False, f'Failed to compute KPI for {name}: {e}'

    subject = f"{data['quarter_label']} KPI Update — {_STATUS_COLOR[data['overall_status']][2]}"
    html_body = build_kpi_email_html(data, first_name)

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '')
    try:
        msg = EmailMessage(
            subject=subject,
            body=html_body,
            from_email=from_email,
            to=[user.email],
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
    """
    Send KPI emails to all inspector users (or a provided queryset).
    Returns a list of result dicts: [{name, email, success, message}]
    """
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
