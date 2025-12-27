from typing import Generic, TypeVar, cast

from django.db import models
from django.db.models import QuerySet
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import BaseSerializer

from .models import Company, AuditLog
from .serializers import CompanySerializer

ModelT = TypeVar("ModelT", bound=models.Model)
SerializerT = TypeVar("SerializerT", bound=BaseSerializer)


def _get_client_ip(request):
    """Extract client IP address from request headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def _get_user_agent(request):
    """Extract user agent from request headers."""
    return request.META.get('HTTP_USER_AGENT', '')


class TypedModelViewSet(viewsets.ModelViewSet, Generic[ModelT, SerializerT]):
    """Generic ViewSet with type hints."""
    def get_queryset(self) -> QuerySet[ModelT]:
        return cast(QuerySet[ModelT], super().get_queryset())


class CompanyViewSet(TypedModelViewSet[Company, CompanySerializer]):
    """ViewSet for Company CRUD operations with IDOR prevention."""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[Company]:
        """
        CRITICAL SECURITY: Filter by owner=request.user to prevent IDOR.
        Returns 404 for other users' companies (not 403, to avoid information leakage).
        """
        qs = Company.objects.filter(owner=self.request.user)

        # Support ordering query parameter
        ordering = self.request.GET.get("ordering")
        if ordering in {"deadline", "-deadline", "updated_at", "-updated_at"}:
            return qs.order_by(ordering)

        # Default ordering: deadline (asc), updated_at (desc)
        return qs.order_by("deadline", "-updated_at")

    def perform_create(self, serializer):
        """
        CRITICAL SECURITY: Force owner=request.user.
        Client cannot specify owner in payload.
        """
        company = serializer.save(owner=self.request.user)

        # Audit log: COMPANY_CREATE
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.COMPANY_CREATE,
            target_type="Company",
            target_id=company.id,
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
        )

    def perform_update(self, serializer):
        """Save company and log audit."""
        company = serializer.save()

        # Audit log: COMPANY_UPDATE
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.COMPANY_UPDATE,
            target_type="Company",
            target_id=company.id,
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
        )

    def perform_destroy(self, instance):
        """Delete company and log audit."""
        company_id = instance.id
        instance.delete()

        # Audit log: COMPANY_DELETE
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.COMPANY_DELETE,
            target_type="Company",
            target_id=company_id,
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
        )
