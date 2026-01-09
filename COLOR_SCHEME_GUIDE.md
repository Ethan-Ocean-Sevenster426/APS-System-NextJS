# Table Color Scheme Guide

This document explains the color coding system for the inspection table buttons and status indicators.

## Button Color Codes

### View Files Button
The View Files button changes color based on file upload status:

| Status | Color | CSS Class | Description |
|--------|-------|-----------|-------------|
| **Complete** | 🟢 Green (`#22c55e`) | `btn-files-complete` | All required files uploaded |
| **Partial** | 🟡 Yellow/Orange (`#f59e0b`) | `btn-files-partial` | Some files uploaded (compliance only or partial) |
| **None** | ⚫ Gray/Default | `btn-files-none` | No compliance files uploaded |

### RFI Button
The RFI (Request for Information) button changes based on upload status:

| Status | Color | Background | Description |
|--------|-------|------------|-------------|
| **Uploaded** | 🟢 Light Green | `#d4edda` with dark green text (`#155724`) | RFI document has been uploaded |
| **Not Uploaded** | ⚫ Gray | `#6c757d` | No RFI document uploaded yet |

### Invoice Button
The Invoice button changes based on upload status:

| Status | Color | Background | Description |
|--------|-------|------------|-------------|
| **Uploaded** | 🟢 Light Green | `#d4edda` with dark green text (`#155724`) | Invoice has been uploaded |
| **Not Uploaded** | ⚫ Gray | `#6c757d` | No invoice uploaded yet |

## Status Badges

### Compliance Status
| Status | Color | Badge Style |
|--------|-------|-------------|
| **Compliant** | 🟢 Green | `bg-green-100 text-green-800` |
| **Non-Compliant** | 🔴 Red | `bg-red-100 text-red-800` |

### Approved Status
| Status | Color | Badge Style |
|--------|-------|-------------|
| **Yes** | 🟢 Green | `bg-green-100 text-green-800` |
| **No** | 🟡 Yellow | `bg-yellow-100 text-yellow-800` |

### Sent Status
| Status | Color | Badge Style |
|--------|-------|-------------|
| **Sent** | 🟢 Green | `bg-green-100 text-green-800` |
| **Not Sent** | 🔴 Red | `bg-red-100 text-red-800` |

## Other Elements

### Account Code
- **Color**: Yellow background (`bg-yellow-100 text-yellow-800`)
- **Font**: Monospace for better readability

### Inspection Date
- **Color**: Gray background (`bg-gray-100 text-gray-800`)

### Complete Inspection Rows
- **Background**: Light green (`bg-green-50 border-green-200`)
- **Applied when**: Inspection is complete but not sent

## Testing the Colors

To see the color changes in action:

### For RFI Button:
1. Go to an inspection row
2. Click the RFI button to upload a file
3. After successful upload, the button should turn **light green** with a checkmark
4. The button will be disabled (no longer clickable)

### For Invoice Button:
1. Go to an inspection row (must not be an inspector role)
2. Click the Invoice button to upload a file
3. After successful upload, the button should turn **light green** with a checkmark
4. The button will be disabled (no longer clickable)

### For View Files Button:
1. **No files**: Button appears in default/gray color
2. **Upload compliance file**: Button turns **yellow/orange** (partial)
3. **Upload all required files**: Button turns **green** (complete)

## CSS Classes Reference

```css
/* View Files - Complete */
.btn-files-complete {
    background-color: #22c55e !important; /* Green */
    border-color: #16a34a !important;
    color: white !important;
}

/* View Files - Partial */
.btn-files-partial {
    background-color: #f59e0b !important; /* Yellow/Orange */
    border-color: #d97706 !important;
    color: white !important;
}

/* RFI/Invoice - Uploaded */
.btn-rfi.uploaded, .btn-invoice.uploaded {
    background-color: #d4edda;
    color: #155724 !important;
}

/* RFI/Invoice - Not Uploaded */
.btn-rfi, .btn-invoice {
    background-color: #6c757d; /* Gray */
    color: white !important;
}
```

## How to Test Without Uploading Real Files

If you want to test the visual appearance without actually uploading files, you can:

1. **Use Browser Developer Tools**:
   - Right-click on a button (e.g., RFI or Invoice)
   - Select "Inspect Element"
   - In the Elements panel, add the class `uploaded` to the button element
   - The button will immediately change to the green color

2. **Temporarily Modify the Template** (for testing only):
   - Add `uploaded` class to buttons in the HTML
   - Refresh the page to see the colors
   - **Remember to revert changes after testing!**

Example:
```html
<!-- Before (not uploaded) -->
<button class="btn btn-sm btn-rfi" id="rfi-group_123">RFI</button>

<!-- After (simulating uploaded state) -->
<button class="btn btn-sm btn-rfi uploaded" id="rfi-group_123">RFI ✓</button>
```

## Quick Reference

- 🟢 **Green** = Complete/Uploaded/Compliant/Yes/Sent
- 🟡 **Yellow** = Partial/Pending/No (for Approved)
- 🔴 **Red** = Non-Compliant/Not Sent
- ⚫ **Gray** = Not Uploaded/Default state
