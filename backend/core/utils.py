"""
Shared utility functions for the core application.
"""
from typing import Optional, Tuple

from django.http import HttpRequest


# File magic bytes (signatures) for MIME type validation
# Format: (extension, magic_bytes, offset)
FILE_SIGNATURES = {
    # Documents
    '.pdf': [(b'%PDF', 0)],
    '.doc': [(b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1', 0)],  # OLE compound document
    '.docx': [(b'PK\x03\x04', 0)],  # ZIP-based (Office Open XML)
    '.xls': [(b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1', 0)],
    '.xlsx': [(b'PK\x03\x04', 0)],
    '.ppt': [(b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1', 0)],
    '.pptx': [(b'PK\x03\x04', 0)],
    # Images
    '.jpg': [(b'\xFF\xD8\xFF', 0)],
    '.jpeg': [(b'\xFF\xD8\xFF', 0)],
    '.png': [(b'\x89PNG\r\n\x1a\n', 0)],
    # Archives
    '.zip': [(b'PK\x03\x04', 0), (b'PK\x05\x06', 0)],
    # Text files (no reliable signature, will be validated by extension only)
    '.txt': [],
}


def validate_file_signature(file_obj, expected_extension: str) -> Tuple[bool, str]:
    """
    Validate file content matches its claimed extension using magic bytes.

    Args:
        file_obj: Django UploadedFile object
        expected_extension: The file extension (e.g., '.pdf')

    Returns:
        Tuple of (is_valid, error_message)
    """
    ext_lower = expected_extension.lower()

    # If extension not in our signature list, allow it (validated by extension only)
    if ext_lower not in FILE_SIGNATURES:
        return True, ""

    signatures = FILE_SIGNATURES[ext_lower]

    # Text files have no reliable signature
    if not signatures:
        return True, ""

    # Read the beginning of the file to check signature
    try:
        file_obj.seek(0)
        header = file_obj.read(16)  # Read first 16 bytes
        file_obj.seek(0)  # Reset file pointer
    except Exception:
        return False, "Unable to read file content."

    # Check if any of the expected signatures match
    for magic_bytes, offset in signatures:
        if header[offset:offset + len(magic_bytes)] == magic_bytes:
            return True, ""

    return False, f"File content does not match {ext_lower} format. The file may be corrupted or mislabeled."


def get_client_ip(request: HttpRequest) -> Optional[str]:
    """
    Extract client IP address from request headers.

    Handles X-Forwarded-For header for reverse proxy setups.
    Returns the first IP in the chain (original client IP).
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Take the first IP (original client) from the chain
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request: HttpRequest) -> str:
    """
    Extract user agent string from request headers.

    Returns empty string if not present.
    """
    return request.META.get('HTTP_USER_AGENT', '')
