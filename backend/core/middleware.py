"""
Custom middleware for security headers and other cross-cutting concerns.
"""
from django.conf import settings


class ContentSecurityPolicyMiddleware:
    """
    Middleware to add Content-Security-Policy header to responses.
    Reads CSP directives from Django settings.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.csp_header = self._build_csp_header()

    def _build_csp_header(self):
        """Build CSP header string from settings."""
        directives = []

        # Map settings to CSP directive names
        csp_mappings = {
            'CSP_DEFAULT_SRC': 'default-src',
            'CSP_SCRIPT_SRC': 'script-src',
            'CSP_STYLE_SRC': 'style-src',
            'CSP_IMG_SRC': 'img-src',
            'CSP_FONT_SRC': 'font-src',
            'CSP_CONNECT_SRC': 'connect-src',
            'CSP_FRAME_ANCESTORS': 'frame-ancestors',
            'CSP_FORM_ACTION': 'form-action',
        }

        for setting_name, directive_name in csp_mappings.items():
            values = getattr(settings, setting_name, None)
            if values:
                directive_value = ' '.join(values)
                directives.append(f"{directive_name} {directive_value}")

        return '; '.join(directives) if directives else None

    def __call__(self, request):
        response = self.get_response(request)

        # Add CSP header if configured
        if self.csp_header:
            response['Content-Security-Policy'] = self.csp_header

        return response
