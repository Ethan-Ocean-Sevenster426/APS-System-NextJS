#!/usr/bin/env python
"""
Dummy data for the current quarter (Q3 2026) so the KPI report + notification
metrics are meaningful locally:
  - Quarterly targets per inspector
  - July inspections (with lab samples) sized to give a meeting/below mix
  - A few "report emailed" notifications for the emails-sent metric
"""
import os, sys, django, datetime, random
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from main.models import (
    FoodSafetyAgencyInspection as Insp, QuarterlyTarget as QT, Notification, Client,
)

random.seed(7)
YEAR, QUARTER = 2026, 3
COMMODITIES = ["EGGS", "POULTRY", "RAW", "PMP"]

# inspector -> (id, target eggs/poultry/raw/pmp, target samples, actual inspections, actual samples)
PLAN = {
    "John Smith":     (101, (3, 3, 4, 3), 8,  15, 9),   # meets
    "Jane Doe":       (102, (2, 2, 3, 2), 6,  6,  3),   # below
    "Mike Johnson":   (103, (4, 4, 5, 4), 10, 18, 11),  # meets
    "Sarah Williams": (104, (3, 3, 3, 3), 7,  8,  4),   # below
    "Peter Manager":  (105, (2, 2, 2, 2), 5,  9,  6),   # meets
}

clients = list(Client.objects.all()) or [None]

# ── 1. Quarterly targets (current quarter) ──────────────────────────────────
print("Quarterly targets (Q3 2026):")
for name, (iid, (e, p, r, pmp), samples, *_rest) in PLAN.items():
    obj, created = QT.objects.update_or_create(
        inspector_name=name, year=YEAR, quarter=QUARTER,
        defaults=dict(eggs=e, poultry=p, raw=r, pmp=pmp,
                      total_samples=samples, raw_samples=samples // 2, pmp_samples=samples - samples // 2,
                      notes="Dummy Q3 target (local demo)"),
    )
    print(f"  {'+' if created else '~'} {name}: target {e+p+r+pmp} insp / {samples} samples")

# ── 2. July inspections (current month) sized per plan ──────────────────────
# clear any prior demo July rows to keep counts exact on re-run
Insp.objects.filter(date_of_inspection__gte=datetime.date(2026, 7, 1),
                    date_of_inspection__lte=datetime.date(2026, 7, 31),
                    remote_id__gte=90000).delete()
seq = 90000
made = 0
print("\nJuly inspections:")
for name, (iid, _t, _s, n_insp, n_samp) in PLAN.items():
    for k in range(n_insp):
        seq += 1
        c = random.choice(clients)
        d = datetime.date(2026, 7, random.randint(1, 6))
        Insp.objects.create(
            commodity=COMMODITIES[k % 4],
            date_of_inspection=d,
            inspector_id=iid,
            inspector_name=name,
            product_name=random.choice(["Mince", "Boerewors", "Chicken Breast", "Eggs Grade A"]),
            is_sample_taken=(k < n_samp),
            approved_status=random.choice(["PENDING", "APPROVED"]),
            remote_id=seq,
            client=c,
            client_name=(c.name if c else "Demo Client"),
        )
        made += 1
    print(f"  {name}: {n_insp} inspections, {n_samp} sampled")
print(f"  total July inspections created: {made}")

# ── 3. "Report emailed" notifications for the emails-sent metric ─────────────
admin = User.objects.filter(role__in=["super_admin", "developer"]).first() or User.objects.filter(is_superuser=True).first()
existing = Notification.objects.filter(related_object_type="kpi_report").count()
to_add = max(0, 5 - existing)
now = timezone.now()
for i in range(to_add):
    n = Notification.objects.create(
        title="KPI Report sent",
        message=f"Inspector KPI Report emailed to ethansevenster5@gmail.com.",
        notification_type="success", priority="medium",
        user=admin, related_object_type="kpi_report", related_object_id="ethansevenster5@gmail.com",
        is_read=True,
    )
    Notification.objects.filter(pk=n.pk).update(created_at=now - datetime.timedelta(days=(i + 1) * 5))
emails_sent = Notification.objects.filter(related_object_type="kpi_report").count()

# ── Summary ─────────────────────────────────────────────────────────────────
samples_this_month = Insp.objects.filter(date_of_inspection__year=2026, date_of_inspection__month=7, is_sample_taken=True).count()
print("\n" + "=" * 50)
print(f"Quarterly targets (Q3 2026): {QT.objects.filter(year=YEAR, quarter=QUARTER).count()}")
print(f"Lab samples this month (Jul): {samples_this_month}")
print(f"Reports emailed (metric):     {emails_sent}")
print("=" * 50)
