# Client Data Sync from Google Sheets

## Overview

This script syncs client data from your Google Sheet to the PostgreSQL database `ClientAllocation` table.

## What It Does

1. **Reads** client data from Google Sheets (columns A-N)
2. **Matches** clients by `client_id` (Column A)
3. **Creates or Updates** `ClientAllocation` records with:
   - Client ID (Column A)
   - Facility Type (Column B)
   - Group Type (Column C)
   - Commodity (Column D)
   - Province (Column E)
   - Corporate Group (Column F)
   - Other (Column G)
   - Internal Account Code (Column H)
   - Allocated (Column I - TRUE/FALSE)
   - e-Click Name (Column J - client name)
   - Representative Email (Column K)
   - Phone Number (Column L)
   - Duplicates (Column M)
   - Active/Deactive Status (Column N)

## Setup

### 1. Configure Google Sheet ID

Edit `sync_clients_from_google_sheet.py` and update:

```python
SPREADSHEET_ID = '1gHOowl6YqfVPU3wAxz3jQRNwQwRAC4Kja8_0zqG-n9w'  # Your sheet ID
SHEET_NAME = 'Internal Account Code Generator'  # Your sheet name
```

To find your Spreadsheet ID:
- Open your Google Sheet
- Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
- Copy the long string between `/d/` and `/edit`

### 2. Authenticate with Google

Run the authentication script once:

```bash
python tests/authenticate_google_simple.py
```

This will:
- Open a browser for Google login
- Ask you to authorize the app
- Save credentials to `token.pickle`

## Usage

Run the sync script:

```bash
python sync_clients_from_google_sheet.py
```

### Example Output

```
====================================================================================================
SYNCING CLIENT DATA FROM GOOGLE SHEETS
====================================================================================================

[1] Authenticating with Google Sheets...
✓ Authenticated successfully

[2] Reading data from sheet: Internal Account Code Generator
    Range: Internal Account Code Generator!A2:N
✓ Found 150 rows

[3] Processing rows...
  Row 2: ✓ Created: A1 Eggs (ID: 1)
  Row 3: ✓ Created: Alfer Farming (ID: 2)
  Row 4: ✓ Created: Alzu (ID: 3)
  ...

====================================================================================================
SYNC SUMMARY
====================================================================================================
Total rows processed: 150
✓ Created: 120
✓ Updated: 25
⊘ Skipped: 5 (no client ID or name)
✗ Errors: 0
====================================================================================================

Sample of synced data:
  • A1 Eggs
    Commodity: EGG
    Province: TBC
    Corporate Group: Not Applicable (None)
    Internal Account Code: FA-IND-EGG-NA-0005
    Allocated: False

  • Alfer Farming
    Commodity: PLT
    Province: TBC
    Corporate Group: Not Applicable (None)
    Internal Account Code: RE-IND-EGG-NA-0001
    Allocated: False
```

## How It Works

### Matching Logic

The script matches by **client_id (Column A)**:

- **If client_id exists** → Updates the existing record with Google Sheet data
- **If client_id is new** → Creates a new ClientAllocation record

### Data Handling

- Empty cells are stored as `NULL` (None) in the database
- Boolean values (Column I - Allocated): TRUE/FALSE/Yes/No/1/0 are all parsed correctly
- Client ID must be a valid integer
- E-Click Name (client name) must not be empty

### Field Mapping

| Google Sheet Column | Database Field | Type |
|---------------------|----------------|------|
| A | client_id | Integer |
| B | facility_type | String |
| C | group_type | String |
| D | commodity | String |
| E | province | String |
| F | corporate_group | String |
| G | other | String |
| H | internal_account_code | String |
| I | allocated | Boolean |
| J | eclick_name | String |
| K | representative_email | Email |
| L | phone_number | String |
| M | duplicates | String |
| N | active_status | String |

## Viewing Synced Data

After syncing, view the data in the Client Allocation page:

1. Start Django: `python manage.py runserver`
2. Navigate to: http://localhost:8000/client-allocation
3. Use filters to find specific clients by:
   - Commodity (EGG, PLT, RAW, PMP)
   - Province
   - Corporate Group
   - Facility Type

## Troubleshooting

### "No valid credentials found"

Run the authentication script:
```bash
python tests/authenticate_google_simple.py
```

### "ERROR reading sheet"

Check that:
- Spreadsheet ID is correct
- Sheet name matches exactly (case-sensitive)
- Your Google account has access to the sheet

### "Skipped: no client ID or name"

Some rows are missing:
- Column A (Client ID) must have a number
- Column J (e-Click Name) must have text

### "Errors: X"

Check the error messages for specific rows. Common issues:
- Invalid email format in Column K
- Non-numeric value in Column A (Client ID)
- Database connection issues

## Re-running the Sync

You can run the sync script multiple times:
- **Existing clients** (same client_id) will be **updated** with latest data from Google Sheet
- **New clients** will be **created**
- **Manually added clients** (via UI) are not affected unless they have the same client_id

## Next Steps

After syncing, you can:
1. View clients in the Client Allocation page
2. Filter by commodity, province, corporate group, etc.
3. Export to Excel for reporting
4. Use the data for inspection allocation and invoicing

---

**Created by**: Claude Code
**Date**: 2025-12-10
