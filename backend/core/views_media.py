"""
Media file access control views.
Require authentication to access uploaded files.
"""
from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from pathlib import Path
import os


class ProtectedMediaView(APIView):
    """
    Serve media files only to authenticated users who own them.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, file_path):
        # Construct full file path
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)

        # Security: Prevent directory traversal
        full_path = os.path.abspath(full_path)
        media_root = os.path.abspath(settings.MEDIA_ROOT)

        if not full_path.startswith(media_root):
            raise Http404("File not found")

        # Check file exists
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            raise Http404("File not found")

        # Verify file ownership
        if file_path.startswith('es_files/'):
            # ES files: check ownership via ESVersion model
            from core.models import ESVersion

            # Use exact match on full file path to prevent prefix attacks
            if not ESVersion.objects.filter(file=file_path, owner=request.user).exists():
                raise Http404("File not found")
        else:
            # Deny access to any files outside es_files/ directory
            # Future extensions should add explicit ownership checks here
            raise Http404("File not found")

        # Serve file
        return FileResponse(open(full_path, 'rb'))
