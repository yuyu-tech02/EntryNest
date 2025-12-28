"""
Shared ViewSet classes and mixins for the core application.
"""
from typing import Generic, TypeVar, cast, Type, Optional

from django.db import models
from django.db.models import QuerySet
from rest_framework import viewsets
from rest_framework.serializers import BaseSerializer

from .models import AuditLog
from .utils import get_client_ip, get_user_agent

ModelT = TypeVar("ModelT", bound=models.Model)
SerializerT = TypeVar("SerializerT", bound=BaseSerializer)


class TypedModelViewSet(viewsets.ModelViewSet, Generic[ModelT, SerializerT]):
    """
    Generic ViewSet with type hints for better IDE support and type checking.
    """
    def get_queryset(self) -> QuerySet[ModelT]:
        return cast(QuerySet[ModelT], super().get_queryset())


class AuditLogMixin:
    """
    Mixin that provides automatic audit logging for CRUD operations.

    Subclasses should define:
        - audit_log_target_type: str (e.g., "Company", "ESVersion")
        - audit_log_actions: dict mapping 'create', 'update', 'delete' to AuditLog.Action values

    Example usage:
        class CompanyViewSet(AuditLogMixin, TypedModelViewSet[Company, CompanySerializer]):
            audit_log_target_type = "Company"
            audit_log_actions = {
                'create': AuditLog.Action.COMPANY_CREATE,
                'update': AuditLog.Action.COMPANY_UPDATE,
                'delete': AuditLog.Action.COMPANY_DELETE,
            }
    """
    audit_log_target_type: str = ""
    audit_log_actions: dict = {}

    def _create_audit_log(self, action_key: str, target_id: int) -> None:
        """Create an audit log entry for the given action."""
        if not self.audit_log_actions or action_key not in self.audit_log_actions:
            return

        AuditLog.objects.create(
            user=self.request.user,
            action=self.audit_log_actions[action_key],
            target_type=self.audit_log_target_type,
            target_id=target_id,
            ip_address=get_client_ip(self.request),
            user_agent=get_user_agent(self.request),
        )

    def perform_create(self, serializer) -> None:
        """Save the instance and log the create action."""
        instance = serializer.save(owner=self.request.user)
        self._create_audit_log('create', instance.id)

    def perform_update(self, serializer) -> None:
        """Save the instance and log the update action."""
        instance = serializer.save()
        self._create_audit_log('update', instance.id)

    def perform_destroy(self, instance) -> None:
        """Delete the instance and log the delete action."""
        instance_id = instance.id
        instance.delete()
        self._create_audit_log('delete', instance_id)
