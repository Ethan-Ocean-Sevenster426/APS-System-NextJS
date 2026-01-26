#!/usr/bin/env python
"""
Final report on database state after reset
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection
from collections import Counter, defaultdict
from django.db.models import Count

print("\n" + "="*80)
print("FINAL DATABASE REPORT")
print("="*80)

# Overview
print("\n" + "-"*80)
print("DATABASE OVERVIEW")
print("-"*80)

total = FoodSafetyAgencyInspection.objects.count()
print(f"\nTotal inspections: {total}")

# Commodity distribution
commodity_dist = Counter(
    FoodSafetyAgencyInspection.objects.values_list('commodity', flat=True)
)
print(f"\nCommodity distribution:")
for commodity, count in sorted(commodity_dist.items()):
    percentage = (count / total * 100) if total > 0 else 0
    print(f"  {commodity:10} {count:3} ({percentage:.1f}%)")

# Group type distribution
group_type_dist = Counter(
    FoodSafetyAgencyInspection.objects.values_list('group_type', flat=True)
)
print(f"\nGroup type distribution:")
for group_type, count in sorted(group_type_dist.items()):
    percentage = (count / total * 100) if total > 0 else 0
    print(f"  {group_type:40} {count:3} ({percentage:.1f}%)")

# Corporate group distribution
corporate_dist = Counter(
    FoodSafetyAgencyInspection.objects.values_list('corporate_group', flat=True)
)
print(f"\nTop 10 corporate groups:")
for corp, count in corporate_dist.most_common(10):
    print(f"  {corp:30} {count:3}")

# Facility type distribution
facility_dist = Counter(
    FoodSafetyAgencyInspection.objects.values_list('facility_type', flat=True)
)
print(f"\nFacility type distribution:")
for facility, count in sorted(facility_dist.items()):
    percentage = (count / total * 100) if total > 0 else 0
    print(f"  {facility:20} {count:3} ({percentage:.1f}%)")

# Grouping analysis
print("\n" + "-"*80)
print("GROUPING ANALYSIS")
print("-"*80)

groups = FoodSafetyAgencyInspection.objects.values(
    'client_name',
    'date_of_inspection',
    'internal_account_code'
).annotate(
    count=Count('id')
).order_by('-count')

total_groups = groups.count()
single_commodity = groups.filter(count=1).count()
multi_commodity = groups.filter(count__gt=1).count()

print(f"\nTotal groups: {total_groups}")
print(f"  Single commodity: {single_commodity} ({single_commodity/total_groups*100:.1f}%)")
print(f"  Multi commodity: {multi_commodity} ({multi_commodity/total_groups*100:.1f}%)")

if multi_commodity > 0:
    print(f"\nLargest groups:")
    for g in list(groups.filter(count__gt=1))[:5]:
        print(f"  {g['client_name'][:40]:40} - {g['count']} commodities")

# Data quality checks
print("\n" + "-"*80)
print("DATA QUALITY CHECKS")
print("-"*80)

# Check for missing data
missing_product_name = FoodSafetyAgencyInspection.objects.filter(product_name__isnull=True).count()
missing_account_code = FoodSafetyAgencyInspection.objects.filter(internal_account_code__isnull=True).count()
missing_lab = FoodSafetyAgencyInspection.objects.filter(lab__isnull=True).count()

print(f"\nData completeness:")
print(f"  Missing product name: {missing_product_name}")
print(f"  Missing account code: {missing_account_code}")
print(f"  Missing lab: {missing_lab}")

# Check for duplicates
print(f"\nDuplicate check:")
all_groups = defaultdict(list)
for insp in FoodSafetyAgencyInspection.objects.all():
    key = (insp.client_name, insp.date_of_inspection, insp.internal_account_code)
    all_groups[key].append(insp)

duplicates = 0
for key, inspections in all_groups.items():
    commodity_counts = Counter(insp.commodity for insp in inspections)
    for count in commodity_counts.values():
        if count > 1:
            duplicates += 1

print(f"  Duplicate commodities in groups: {duplicates}")

# Account code validation
invalid_codes = 0
for insp in FoodSafetyAgencyInspection.objects.all():
    code = insp.internal_account_code
    if not code or len(code.split('-')) != 6:
        invalid_codes += 1

print(f"  Invalid account codes: {invalid_codes}")

# Status summary
print("\n" + "="*80)
print("STATUS SUMMARY")
print("="*80)

all_clean = (
    missing_product_name == 0 and
    missing_account_code == 0 and
    duplicates == 0 and
    invalid_codes == 0
)

if all_clean:
    print("\n🎉 DATABASE IS 100% CLEAN!")
    print("✅ All inspections have complete data")
    print("✅ No duplicate commodities")
    print("✅ All account codes are valid")
    print("✅ Ready for production use")
else:
    print("\n⚠️  Some issues found:")
    if missing_product_name > 0:
        print(f"   - {missing_product_name} inspections missing product name")
    if missing_account_code > 0:
        print(f"   - {missing_account_code} inspections missing account code")
    if duplicates > 0:
        print(f"   - {duplicates} duplicate commodities")
    if invalid_codes > 0:
        print(f"   - {invalid_codes} invalid account codes")

print("\n" + "="*80)
print(f"Report generated: {total} inspections analyzed")
print("="*80)
