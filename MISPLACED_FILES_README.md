# Misplaced Files Finder

This tool helps you find files that are in the wrong places in your media folder structure.

## What It Does

The scanner checks if your files follow the expected folder structure:

```
media/
└── YEAR (e.g., 2025)/
    └── MONTH (e.g., January)/
        └── CLIENT_NAME/
            └── INSPECTION_DATE (e.g., 2025-01-15)/
                └── Inspection-XXX/
                    ├── Request For Invoice/
                    ├── invoice/
                    ├── lab results/
                    ├── retest/
                    ├── Compliance/
                    ├── occurrence/
                    └── composition/
```

## Files Included

1. **find_misplaced_files.py** - Main scanner script
2. **test_misplaced_files.py** - Creates test data for local testing
3. **test_report.json** - Example report output

## How to Use

### Step 1: Test Locally (RECOMMENDED)

Before running on your actual media folder, test with sample data:

```bash
# Create test folder with sample issues
python test_misplaced_files.py

# Run scanner on test folder
python find_misplaced_files.py --media-root test_media

# Generate detailed JSON report
python find_misplaced_files.py --media-root test_media --export-report test_report.json
```

### Step 2: Run on Actual Media Folder

Once you're comfortable with how it works:

```bash
# Scan your actual media folder
python find_misplaced_files.py --media-root ./media

# Export detailed report
python find_misplaced_files.py --media-root ./media --export-report misplaced_files_report.json
```

### Step 3: Run on Server

To check files on the server:

```bash
# Connect to server via SSH or RDP
# Navigate to project directory
cd /path/to/Inspection-System-master

# Run the scanner
python find_misplaced_files.py --media-root ./media --export-report server_report.json

# Download the report to review
```

## What Issues Are Detected

The scanner identifies:

1. **Files Too Shallow** - Files not deep enough in folder structure
2. **Invalid Year Folders** - Folders not matching YYYY format
3. **Invalid Month Folders** - Folders not matching month names (January, February, etc.)
4. **Invalid Client Folders** - Client folders with unusual characters or spaces
5. **Invalid Date Folders** - Folders not matching YYYY-MM-DD format
6. **Invalid Inspection Folders** - Folders not matching "Inspection-XXX" pattern
7. **Unexpected Document Type Folders** - Folders that don't match expected document types

## Expected Document Types

Valid document type folders:
- Request For Invoice
- invoice
- lab results
- retest
- Compliance
- compliance (case variation)
- occurrence
- composition

## Understanding the Output

### Console Output

The scanner prints:
- Statistics (files/folders scanned, issues found)
- Summary of issues by type
- Detailed findings for each issue (first 10 per category)

### JSON Report

The JSON report contains:
- Scan date and time
- Full statistics
- Complete list of all issues with details
- File paths and folder names for each issue

## Example Output

```
[STATISTICS]
   - Total files scanned: 1,234
   - Total folders scanned: 567
   - Misplaced files found: 5

[WARNING] Issues Found by Type:
   - file_too_shallow: 2
   - invalid_date_folder: 1
   - unexpected_doc_type_folder: 2
```

## Safe Mode

By default, the script runs in **dry-run mode** - it only reports issues without making any changes to your files.

## Command Line Options

```bash
python find_misplaced_files.py --help
```

Options:
- `--media-root PATH` - Path to media folder (default: ./media)
- `--export-report FILE` - Export detailed JSON report
- `--no-dry-run` - Actually perform changes (NOT IMPLEMENTED YET - always safe mode)

## Next Steps After Scanning

1. Review the report to understand what issues exist
2. Manually move files to correct locations
3. Fix folder naming issues
4. Re-run scanner to verify all issues are resolved

## Questions?

If you need help understanding the results or fixing issues, contact the developer.

## Testing Results

The test suite includes:
- 4 correctly structured file examples
- 10 intentional issues to verify detection

When you run `python test_misplaced_files.py` and then scan with `python find_misplaced_files.py --media-root test_media`, you should see all 10 issues detected.
