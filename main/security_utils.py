"""
Security utilities for the Inspection System
Provides file upload validation, input sanitization, and other security helpers
"""

import os
from django.conf import settings
from django.core.exceptions import ValidationError

# Optional import for MIME type validation
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False


def validate_file_upload(uploaded_file):
    """
    Validate uploaded file for security threats.
    
    Checks:
    1. File extension is allowed
    2. File size is within limits
    3. MIME type matches extension (prevents masquerading)
    
    Args:
        uploaded_file: Django UploadedFile object
        
    Raises:
        ValidationError: If file fails validation
        
    Returns:
        True if file is valid
    """
    # Check file size
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024  # Convert MB to bytes
    if uploaded_file.size > max_size:
        raise ValidationError(
            f'File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB. '
            f'Your file is {uploaded_file.size / (1024 * 1024):.2f} MB.'
        )
    
    # Check file extension
    file_ext = os.path.splitext(uploaded_file.name)[1].lower()
    if file_ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        raise ValidationError(
            f'File type "{file_ext}" is not allowed. '
            f'Allowed types: {", ".join(settings.ALLOWED_UPLOAD_EXTENSIONS)}'
        )
    
    # Check MIME type (requires python-magic)
    if MAGIC_AVAILABLE:
        try:
            # Read first 2048 bytes for MIME detection
            file_content = uploaded_file.read(2048)
            uploaded_file.seek(0)  # Reset file pointer

            mime = magic.Magic(mime=True)
            detected_mime = mime.from_buffer(file_content)

            # Validate MIME type matches extension
            valid_mime_types = {
                '.pdf': ['application/pdf'],
                '.doc': ['application/msword'],
                '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                '.xls': ['application/vnd.ms-excel'],
                '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                '.jpg': ['image/jpeg'],
                '.jpeg': ['image/jpeg'],
                '.png': ['image/png'],
                '.gif': ['image/gif'],
                '.bmp': ['image/bmp', 'image/x-ms-bmp'],
                '.zip': ['application/zip', 'application/x-zip-compressed'],
                '.rar': ['application/x-rar-compressed', 'application/vnd.rar'],
                '.7z': ['application/x-7z-compressed'],
                '.txt': ['text/plain'],
                '.csv': ['text/csv', 'text/plain', 'application/csv'],
            }

            expected_mimes = valid_mime_types.get(file_ext, [])
            if expected_mimes and detected_mime not in expected_mimes:
                raise ValidationError(
                    f'File content does not match extension. '
                    f'Expected {expected_mimes}, got {detected_mime}. '
                    f'This may indicate a file masquerading as another type.'
                )

        except Exception as e:
            # Log error but don't block upload if MIME detection fails
            print(f"MIME type validation error: {e}")
    
    return True


def sanitize_filename(filename):
    """
    Sanitize filename to prevent directory traversal and other attacks.
    
    Removes:
    - Path separators (/, \)
    - Null bytes
    - Control characters
    - Leading/trailing dots and spaces
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename safe for file system storage
    """
    import re
    
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove null bytes
    filename = filename.replace('\x00', '')
    
    # Remove control characters
    filename = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)
    
    # Remove leading/trailing dots and spaces
    filename = filename.strip('. ')
    
    # If filename is empty or only extension, generate a safe name
    if not filename or filename.startswith('.'):
        import uuid
        ext = os.path.splitext(filename)[1] if filename else '.bin'
        filename = f'upload_{uuid.uuid4().hex[:8]}{ext}'
    
    return filename


def check_file_permissions(file_path):
    """
    Check if file has safe permissions (not executable).
    
    Args:
        file_path: Path to file
        
    Returns:
        True if permissions are safe
    """
    import stat
    
    if not os.path.exists(file_path):
        return False
    
    # Get file stats
    file_stat = os.stat(file_path)
    
    # Check if file is executable
    is_executable = file_stat.st_mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    
    if is_executable:
        # Remove execute permissions
        os.chmod(file_path, file_stat.st_mode & ~(stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH))
        print(f"WARNING: Removed execute permissions from {file_path}")
    
    return True
