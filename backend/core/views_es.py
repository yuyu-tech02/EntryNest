from typing import Generic, TypeVar, cast

from django.db import models
from django.db.models import QuerySet
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import BaseSerializer

from .models import ESVersion, AuditLog
from .serializers import ESVersionSerializer, ESVersionListSerializer

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


class ESVersionViewSet(TypedModelViewSet[ESVersion, ESVersionSerializer]):
    """ViewSet for ESVersion CRUD operations with company validation."""
    queryset = ESVersion.objects.all()
    serializer_class = ESVersionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[ESVersion]:
        """
        CRITICAL SECURITY: Filter by owner=request.user to prevent IDOR.
        If company_id in kwargs (nested route), filter by company as well.
        """
        qs = ESVersion.objects.filter(owner=self.request.user)

        # If company_id in URL kwargs (nested route), filter by company
        company_id = self.kwargs.get("company_id")
        if company_id:
            qs = qs.filter(company_id=company_id)

        # Select related company for efficiency
        return qs.select_related("company").order_by("-created_at")

    def get_serializer_class(self):
        """Use different serializer for list vs detail/create/update."""
        if self.action == "list":
            return ESVersionListSerializer
        return ESVersionSerializer

    def perform_create(self, serializer):
        """
        CRITICAL SECURITY: Force owner=request.user and validate company ownership.
        """
        # Validate company ownership (already validated in serializer, but double-check)
        company = serializer.validated_data["company"]
        if company.owner != self.request.user:
            raise PermissionDenied("Invalid company.")

        es = serializer.save(owner=self.request.user)

        # Audit log: ES_CREATE
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.ES_CREATE,
            target_type="ESVersion",
            target_id=es.id,
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
        )

    def perform_update(self, serializer):
        """Save ES and log audit."""
        es = serializer.save()

        # Audit log: ES_UPDATE
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.ES_UPDATE,
            target_type="ESVersion",
            target_id=es.id,
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
        )

    def perform_destroy(self, instance):
        """Delete ES and log audit."""
        es_id = instance.id
        instance.delete()

        # Audit log: ES_DELETE
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditLog.Action.ES_DELETE,
            target_type="ESVersion",
            target_id=es_id,
            ip_address=_get_client_ip(self.request),
            user_agent=_get_user_agent(self.request),
        )
