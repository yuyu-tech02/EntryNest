"""
Shared utility functions for the core application.
"""
from typing import Optional

from django.http import HttpRequest


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
