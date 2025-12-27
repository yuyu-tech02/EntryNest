from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Health check endpoint for monitoring."""
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok"})


@ensure_csrf_cookie
def csrf(request):
    """CSRF cookie endpoint for frontend."""
    return JsonResponse({"detail": "CSRF cookie set"})
