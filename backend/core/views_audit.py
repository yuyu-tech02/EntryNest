from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    """
    Read-only ViewSet for AuditLog.
    Users can only see their own logs.
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        CRITICAL SECURITY: Filter by user=request.user.
        Users can only see their own audit logs.
        """
        return AuditLog.objects.filter(user=self.request.user)
