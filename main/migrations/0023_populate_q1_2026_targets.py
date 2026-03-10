from django.db import migrations


# Inspector salary data (monthly CTC) matching JS DEFAULT_SALARIES
INSPECTOR_SALARIES = {
    'Ben Visagie': 36847.14,
    'Cinga Ngongo': 21000,
    'Corneluis Adams': 20000,
    'Gladys Manganye': 21000,
    'Hellen Modiba': 20000,
    'Jofred Steyn': 21735,
    'Kabelo Percy': 20900,
    'Kutlwano Kuntwane': 21000,
    'Lwandile Dlamini': 21000,
    'Lwandile Maqina': 21000,
    'Mpeluza Xola': 21000,
    'Nelisa Ntoyaphi': 20800,
    'Sandisiwe Dlisani': 22256,
    'Thato Sekhotho': 20900,
}


def populate_q1_2026_targets(apps, schema_editor):
    """Create QuarterlyTarget records for 2026 Q1 with the standard targets."""
    QuarterlyTarget = apps.get_model('main', 'QuarterlyTarget')
    # Skip if records already exist for 2026 Q1
    if QuarterlyTarget.objects.filter(year=2026, quarter=1).exists():
        return

    FoodSafetyAgencyInspection = apps.get_model('main', 'FoodSafetyAgencyInspection')
    User = apps.get_model('main', 'User')

    # Build non-inspector names to exclude (same logic as dashboard views)
    non_inspector_names = set()
    for u in User.objects.exclude(role='inspector'):
        if u.first_name:
            non_inspector_names.add(u.first_name)
        full = f"{u.first_name} {u.last_name}".strip()
        if full:
            non_inspector_names.add(full)
    non_inspector_names.discard('')
    non_inspector_names.add('admin')

    inspector_names = list(
        FoodSafetyAgencyInspection.objects.exclude(
            inspector_name__isnull=True
        ).exclude(
            inspector_name=''
        ).exclude(
            inspector_name='Unknown'
        ).exclude(
            inspector_name__in=non_inspector_names
        ).values_list('inspector_name', flat=True).distinct()
    )

    for name in inspector_names:
        salary = INSPECTOR_SALARIES.get(name, 0)
        QuarterlyTarget.objects.create(
            inspector_name=name,
            year=2026,
            quarter=1,
            eggs=51,
            poultry=59,
            raw=63,
            pmp=54,
            raw_samples=58,
            pmp_samples=12,
            total_samples=70,
            monthly_salary=salary,
            quarterly_revenue_target=0,
            monthly_vehicle_cost=0,
            monthly_other_costs=0,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0022_change_target_defaults_to_zero'),
    ]

    operations = [
        migrations.RunPython(populate_q1_2026_targets, migrations.RunPython.noop),
    ]
