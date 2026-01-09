# Data Integrity Analysis Report
**Date:** December 2, 2025
**Database:** local_inspection_analysis.sqlite3
**Period Analyzed:** Last 90 days (September 3 - December 2, 2025)
**Total Inspections:** 4,870

---

## Executive Summary

A comprehensive data integrity analysis was performed on inspection data from the SQL Server. The analysis revealed **significant data quality issues primarily affecting EGG inspections**, with 439 out of 752 egg inspections (58.4%) missing product names. Other commodities (POULTRY, RAW, PMP) have 100% product name coverage.

---

## Key Findings

### 1. Missing Product Names (HIGH PRIORITY)

**Impact:** 439 egg inspections (58%) have no product brand recorded

**Pattern Breakdown:**
- **[MISSING/EMPTY]:** 439 inspections (58.4%)
- **[HAS BRAND NAME]:** 248 inspections (33.0%) ✓ GOOD
- **[RETAILER NAME]:** 46 inspections (6.1%) - Incorrect
- **[SAME AS CLIENT]:** 19 inspections (2.5%) - May be correct for farms

**Top Offenders:**
1. "New Retailer" placeholder: 79 missing product names
2. Marang Layers Farming: 10 missing
3. Multiple farms with 4-6 missing each

**By Client Type:**
| Client Type | Total Inspections | Missing | % Missing |
|------------|------------------|---------|-----------|
| FARM/PRODUCER | 136 | 97 | **71.3%** |
| RETAILER/STORE | 279 | 165 | **59.1%** |
| OTHER | 337 | 177 | **52.5%** |

**Root Causes:**
1. "New Retailer" placeholder clients not being updated with actual data
2. Data entry process doesn't enforce product name for egg inspections
3. Inspectors may not understand that product name = egg brand, not store name

---

### 2. Incorrect Product Names (MEDIUM PRIORITY)

**Impact:** 46 inspections use retailer names instead of egg brands

**Examples:**
- Inspection 17113: SUPERSPAR - Botshabelo - Product: "Spar" ❌
- Inspection 17048: New Retailer - Product: "Spar Eggs" ❌
- Inspection 17042: New Retailer - Product: "Pick n Pay" ❌

**Correct Examples:**
- Inspection 17108: Superspar - Product: "Alzu Eggs" ✓
- Inspection 17096: Eat sum meat Shop - Product: "Sharp Sharp Eggs" ✓
- Inspection 17091: Boxer Superstore - Product: "Top-Lay Grainfed" ✓

**Issue:** When inspecting eggs at retailers, the product name should be the **egg brand being inspected** (e.g., "Nulaid", "Farmer Brown"), NOT the store name (Spar, Boxer).

---

### 3. Other Commodities (NO ISSUES) ✓

| Commodity | Total Inspections | Missing Product Names | % Missing |
|-----------|------------------|----------------------|-----------|
| **POULTRY** | 1,307 | 0 | 0.0% ✓ |
| **RAW** | 1,707 | 0 | 0.0% ✓ |
| **PMP** | 1,104 | 0 | 0.0% ✓ |
| **EGGS** | 752 | 439 | **58.4%** ❌ |

**Insight:** The data entry process works perfectly for POULTRY, RAW, and PMP commodities. The issue is **isolated to EGG inspections only**.

---

### 4. Potential Duplicate Inspections (LOW PRIORITY)

**Impact:** 241 groups of potential duplicates detected

**Examples:**
- New Retailer on 2025-11-17: 7 inspections for EGGS (no product)
- New Poultry Retailer on 2025-11-24: 5 inspections for POULTRY/Chicken Feet
- El Azaar Poultry Farms on 2025-10-27: 4 inspections for EGGS (no product)

**Note:** Some may be legitimate (multiple products inspected), but many appear to be data entry errors or system issues.

---

### 5. Positive Findings ✓

- **All inspections have client names** (no missing clients)
- **All inspections have inspector IDs** (proper tracking)
- **4,870 inspections across 899 unique clients** (good coverage)
- **Non-EGG commodities have excellent data quality**

---

## Recommendations

### IMMEDIATE ACTIONS (HIGH PRIORITY)

1. **Fix "New Retailer" Placeholder**
   - 79 inspections need proper client names and product brands
   - Review all "New Retailer" entries and update with actual data
   - Disable or remove "New Retailer" as a valid option

2. **Update Data Entry Process for EGG Inspections**
   - Make product name **REQUIRED** for egg inspections
   - Add validation: product name cannot be empty or match common retailer names
   - Add helper text: "Enter the egg brand being inspected (e.g., Nulaid, Farmer Brown)"

3. **Inspector Training**
   - Clarify that Product Name = **Egg Brand**, not store/client name
   - Examples:
     - ✓ CORRECT: At Spar, inspecting "Nulaid Medium Eggs" → Product: "Nulaid"
     - ❌ WRONG: At Spar, inspecting eggs → Product: "Spar"
   - For farms producing their own brand, product name can match client name

### SHORT-TERM IMPROVEMENTS (MEDIUM PRIORITY)

4. **Data Cleanup Campaign**
   - Target the 439 inspections with missing product names
   - Contact inspectors for the last 30-60 days to fill in missing data
   - Prioritize recent inspections (last 30 days): ~150-200 inspections

5. **Fix Retailer Name Issues**
   - Find and correct 46 inspections using retailer names as products
   - Update to actual egg brands inspected

### LONG-TERM IMPROVEMENTS (LOW PRIORITY)

6. **System Enhancements**
   - Add dropdown of common egg brands to assist data entry
   - Implement real-time validation during inspection entry
   - Add warning if product name matches client name (unless client is a producer)

7. **Review Duplicate Detection**
   - Investigate 241 potential duplicate groups
   - Implement duplicate prevention in inspection entry system
   - Add "similar inspection" warning during data entry

---

## Database Files Created

1. **local_inspection_analysis.sqlite3** - Main database with inspection data and issues table
2. **create_local_db_and_analyze.py** - Script to recreate database and run analysis
3. **detailed_product_analysis.py** - Detailed product name pattern analysis
4. **DATA_INTEGRITY_REPORT.md** - This report

---

## SQL Queries for Further Investigation

### View all data issues:
```sql
sqlite3 local_inspection_analysis.sqlite3 "SELECT * FROM data_issues;"
```

### Find specific client's inspections:
```sql
sqlite3 local_inspection_analysis.sqlite3
"SELECT * FROM inspections WHERE client_name LIKE '%New Retailer%';"
```

### Export missing product names for cleanup:
```sql
sqlite3 local_inspection_analysis.sqlite3
"SELECT remote_id, client_name, date_of_inspection, commodity
FROM inspections
WHERE commodity='EGGS' AND (product_name IS NULL OR product_name='')
ORDER BY date_of_inspection DESC;"
```

---

## Contact for Questions

For questions about this analysis or to request additional queries, contact the system administrator.

**Generated:** December 2, 2025
**Tool Used:** Python + SQLite3 + pymssql
**Source:** SQL Server AFS Database (102.67.140.12)
