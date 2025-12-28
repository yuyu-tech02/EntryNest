"""
ViewSet for Company CRUD operations.
"""
from django.db.models import QuerySet
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from rest_framework.permissions import IsAuthenticated

from .models import Company, AuditLog
from .serializers import CompanySerializer
from .viewsets import TypedModelViewSet, AuditLogMixin


@method_decorator(ratelimit(key='user', rate='100/h', method='ALL'), name='dispatch')
class CompanyViewSet(AuditLogMixin, TypedModelViewSet[Company, CompanySerializer]):
    """
    ViewSet for Company CRUD operations.

    Security features:
        - IDOR prevention: All queries filtered by owner=request.user
        - Rate limiting: 100 requests/hour per user
        - Audit logging: All CRUD operations are logged
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    # Audit logging configuration
    audit_log_target_type = "Company"
    audit_log_actions = {
        'create': AuditLog.Action.COMPANY_CREATE,
        'update': AuditLog.Action.COMPANY_UPDATE,
        'delete': AuditLog.Action.COMPANY_DELETE,
    }

    # Allowed ordering fields (whitelist for security)
    ALLOWED_ORDERING = {"deadline", "-deadline", "updated_at", "-updated_at"}

    def get_queryset(self) -> QuerySet[Company]:
        """
        CRITICAL SECURITY: Filter by owner=request.user to prevent IDOR.
        Returns 404 for other users' companies (not 403, to avoid information leakage).
        """
        qs = Company.objects.filter(owner=self.request.user)

        # Support ordering query parameter (whitelist validation)
        ordering = self.request.GET.get("ordering")
        if ordering in self.ALLOWED_ORDERING:
            return qs.order_by(ordering)

        # Default ordering: deadline (asc), updated_at (desc)
        return qs.order_by("deadline", "-updated_at")
