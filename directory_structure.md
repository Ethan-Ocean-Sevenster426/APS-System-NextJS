# Directory Structure for Compliance Documents

## When compliance documents are downloaded from Google Drive

The files are organized in this structure:

```
media/
  inspection/
    2025/
      September/
        Smith Company/
          ├── rfi/                       ← Request For Invoice documents
          ├── invoice/                   ← Invoice documents  
          ├── lab/                       ← Lab results documents
          ├── retest/                    ← Retest documents
          ├── Compliance/                ← Compliance documents (ZIPs from Google Drive)
          │   ├── POULTRY/
          │   │   └── Poultry-RE-COR-RAW-BXR-1176-2025-09-18.zip
          │   ├── RAW/
          │   │   └── Raw-AB-IND-RAW-NA-0647-2025-09-23.zip
          │   ├── PMP/
          │   │   └── PMP-RE-IND-RAW-SSP-3730-2025-09-17.zip
          │   └── EGG/
          │       └── Egg-FA-IND-RAW-NA-3703-2025-09-19.zip
          └── Inspection-12345/          ← Files extracted from ZIP with inspection ID
              ├── Request For Invoice/
              ├── invoice/
              ├── lab results/
              ├── retest/
              ├── Compliance/
              │   ├── POULTRY/
              │   └── RAW/
              ├── Form/
              └── Lab/
```

## File Organization

1. **Compliance ZIP files from Google Drive** go to:
   - `media/inspection/YYYY/Month/ClientName/Compliance/COMMODITY/`
   - Example: `media/inspection/2025/September/Smith Company/Compliance/POULTRY/`

2. **When ZIP files are extracted**, files are organized by inspection ID:
   - Files with inspection ID: `media/inspection/YYYY/Month/ClientName/Inspection-{ID}/Compliance/COMMODITY/`
   - Files without ID: `media/inspection/YYYY/Month/ClientName/Compliance/COMMODITY/`

3. **Other document types** (RFI, invoice, lab, retest):
   - At client level: `media/inspection/YYYY/Month/ClientName/[type]/`
   - At inspection level: `media/inspection/YYYY/Month/ClientName/Inspection-{ID}/[type]/`
