# Composition Upload Feature - Implementation Summary

## Overview
The Composition upload feature has been successfully added to the inspection system. This feature allows administrators to upload composition documents for inspection groups that contain both RAW and PMP commodities (or either one).

## Backend Changes (core_views.py)

### 1. Permission Updates
- **Line 1924**: Added 'composition' to administrator allowed document types
  ```python
  allowed_document_types = ['invoice', 'rfi', 'composition']
  ```

### 2. Document Type Handling
- **Line 2165**: Added 'composition' to supported document types
- **Line 2180**: Added composition folder mapping
  ```python
  'composition': 'composition'  # Composition documents go to 'composition' folder (lowercase)
  ```

### 3. Upload Tracking
- **Lines 2340-2345**: Added composition tracking for group uploads
- **Lines 2411-2416**: Added composition tracking for individual uploads
  - Tracks: `composition_uploaded_by` and `composition_uploaded_date`

## Directory Structure

When files are uploaded, they follow this structure:

```
inspection/
├── 2025/
│   ├── October/
│   │   ├── Foodzone_Kakamas/
│   │   │   ├── rfi/
│   │   │   │   └── [RFI PDF files]
│   │   │   ├── invoice/
│   │   │   │   └── [Invoice PDF files]
│   │   │   ├── occurrence/
│   │   │   │   └── [Occurrence PDF files]
│   │   │   ├── composition/
│   │   │   │   └── [Composition PDF files] ← NEW!
│   │   │   └── Inspection-9619/
│   │   │       ├── Request For Invoice/
│   │   │       ├── invoice/
│   │   │       ├── occurrence/
│   │   │       ├── composition/ ← NEW!
│   │   │       ├── lab results/
│   │   │       └── retest/
│   │   └── [Other Clients]/
│   └── [Other Months]/
└── [Other Years]/
```

## Frontend Changes (shipment_list_clean.html)

### 1. New Column Added
- **Line 6347**: Composition column header
- **Lines 6547-6568**: Composition button cell with conditional visibility

### 2. Upload Function
- **Lines 10990-11081**: `uploadComposition()` function
  - Accepts PDF files only
  - Sends document_type='composition'
  - Updates button colors after upload

### 3. Visibility Logic
- **Lines 13526-13621**: `checkCompositionButtonVisibility()` function
  - Shows button if inspection has RAW OR PMP commodities
  - Hides button if no RAW/PMP commodities found

## File Upload Rules

### Who Can Upload?
- **Administrators** (admin, financial, super_admin): Can upload RFI, Invoice, and Composition
- **Inspectors**: Can upload RFI and Occurrence only
- **Scientists**: Can upload Lab, Lab Form, and Retest only

### File Restrictions
- **Only PDF files** are allowed
- One composition file per inspection group (like RFI)
- Files are validated on both frontend and backend

### Button Visibility
The Composition button shows when:
- At least one product has commodity = 'RAW', OR
- At least one product has commodity = 'PMP', OR  
- Both RAW and PMP exist together

The button is hidden when:
- No RAW or PMP commodities exist (e.g., only POULTRY or EGG)

## Example Upload Flow

1. User clicks "Composition" button
2. File picker opens (PDF only)
3. User selects PDF file
4. Frontend sends POST to `/upload-document/` with:
   - `file`: PDF file
   - `group_id`: e.g., "Foodzone_Kakamas_20251031"
   - `document_type`: "composition"
5. Backend:
   - Validates user permissions
   - Validates PDF file
   - Creates folder: `inspection/2025/October/Foodzone_Kakamas/composition/`
   - Saves file
   - Updates database tracking fields
   - Returns success
6. Frontend:
   - Marks button as uploaded (green checkmark)
   - Updates View Files button
   - Auto-opens files popup

## Database Fields Required

The following fields should exist in the `FoodSafetyAgencyInspection` model:
- `composition_uploaded_by` (ForeignKey to User)
- `composition_uploaded_date` (DateTimeField)

## Testing the Feature

1. Create an inspection with both RAW and PMP commodities
2. Log in as administrator
3. Navigate to shipment list
4. Verify Composition button is visible
5. Click Composition button
6. Upload a PDF file
7. Verify file is saved to correct folder
8. Verify button shows green checkmark

## Notes

- Composition files work exactly like RFI files (one per group)
- Files are stored in a dedicated 'composition' folder
- Only administrators can upload composition documents
- The system automatically detects commodity types and shows/hides the button
