# Email to Eclick Team - Missing Account Codes

---

**Subject:** Action Required: Inspections Missing Internal Account Codes

**To:** Eclick Team
**From:** Food Safety Inspection System
**Date:** November 17, 2025

---

Dear Eclick Team,

We have identified **8 inspections** in our system that cannot be matched to clients due to missing or invalid internal account codes on the server side.

## Issue Summary

During our data synchronization process, we discovered inspections that are showing as client name "-" because the system cannot match them to our Google Sheets client database.

## Affected Inspections

### November 3, 2025 (5 inspections)
**Inspector:** KUTLWANO KUNTWANE
**Issue:** No internal account code provided (shows as "-")

| Remote ID | Commodity | Product | Sample Taken |
|-----------|-----------|---------|--------------|
| 6117 | POULTRY | Sliced Bacon and cheese meatloaf, Beef Mince, Chicken drumsticks | No |
| 8274 | PMP | Topside mince lean, Fish fingers | No |
| 9642 | RAW | Chargrill burger | No |
| 9644 | RAW | Lean mince | **Yes** |
| 9647 | RAW | Dhanaya sausage | No |

### November 14, 2025 (3 inspections)
**Inspector:** MOKGADI SELONE
**Issue:** Account code "RE-COR-RAW-FLM-1805" not found in client database

| Remote ID | Commodity | Product |
|-----------|-----------|---------|
| 6320 | POULTRY | Sosatie wors, Chicken Feet, Crumbed chicken nuggets |
| 8472 | PMP | Bombay wors, Goldi Crumbed Chic Nuggets |
| 9910 | RAW | Italian Style Gourmet Sausage with Chilli and mozzarella cheese |

## Impact

1. **Lab Results Cannot Be Properly Linked**: Inspection 9644 (Nov 3) has a sample taken and lab file uploaded, but it's stored in "unknown_client" folder
2. **Reporting Issues**: These inspections cannot be included in client-specific reports
3. **Data Integrity**: Client name shows as "-" instead of actual client information

## Required Action

**For November 3 inspections:**
- Please provide the correct internal account codes for these 5 inspections in the SQL Server database
- Currently, the account code field contains only "-"

**For November 14 inspections:**
- Please either:
  - Add client with account code "RE-COR-RAW-FLM-1805" to the Google Sheets client database, OR
  - Provide the correct account code if "RE-COR-RAW-FLM-1805" is incorrect

## Technical Details

Our synchronization process works as follows:
1. Inspection data is pulled from SQL Server
2. Internal account codes are used to match inspections to clients in Google Sheets
3. If no account code exists or no match is found, client name defaults to "-"

## Next Steps

Please review these inspections and provide the missing account code information at your earliest convenience. Once updated, our next sync will automatically correct the client associations.

If you need any additional information or have questions, please don't hesitate to reach out.

Best regards,
Food Safety Inspection System Team

---

**Attachments:**
- Detailed inspection list (see above tables)
- Lab file location: `/root/Inspection-System/media/inspection/2025/November/unknown_client/lab/-2025-11-03-lab.pdf`
