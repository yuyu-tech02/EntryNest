"""
ViewSet for ESVersion (Entry Sheet Version) CRUD operations.
"""
from django.db.models import QuerySet
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from .models import ESVersion, AuditLog
from .serializers import ESVersionSerializer, ESVersionListSerializer
from .viewsets import TypedModelViewSet, AuditLogMixin


@method_decorator(ratelimit(key='user', rate='100/h', method='ALL'), name='dispatch')
class ESVersionViewSet(AuditLogMixin, TypedModelViewSet[ESVersion, ESVersionSerializer]):
    """
    ViewSet for ESVersion CRUD operations.

    Security features:
        - IDOR prevention: All queries filtered by owner=request.user
        - Company ownership validation: ES can only be created for user's own companies
        - Rate limiting: 100 requests/hour per user
        - Audit logging: All CRUD operations are logged
    """
    queryset = ESVersion.objects.all()
    serializer_class = ESVersionSerializer
    permission_classes = [IsAuthenticated]

    # Audit logging configuration
    audit_log_target_type = "ESVersion"
    audit_log_actions = {
        'create': AuditLog.Action.ES_CREATE,
        'update': AuditLog.Action.ES_UPDATE,
        'delete': AuditLog.Action.ES_DELETE,
    }

    def get_queryset(self) -> QuerySet[ESVersion]:
        """
        CRITICAL SECURITY: Filter by owner=request.user to prevent IDOR.
        Supports nested route filtering by company_id.
        """
        qs = ESVersion.objects.filter(owner=self.request.user)

        # If company_id in URL kwargs (nested route), filter by company
        company_id = self.kwargs.get("company_id")
        if company_id:
            qs = qs.filter(company_id=company_id)

        # Select related company for N+1 prevention
        return qs.select_related("company").order_by("-created_at")

    def get_serializer_class(self):
        """Use lightweight serializer for list view (excludes body field)."""
        if self.action == "list":
            return ESVersionListSerializer
        return ESVersionSerializer

    def perform_create(self, serializer) -> None:
        """
        CRITICAL SECURITY: Validate company ownership before creating ES.
        Double-check ownership even though serializer also validates.
        """
        company = serializer.validated_data["company"]
        if company.owner != self.request.user:
            raise PermissionDenied("Invalid company.")

        # Call parent's perform_create (handles owner assignment and audit logging)
        super().perform_create(serializer)
