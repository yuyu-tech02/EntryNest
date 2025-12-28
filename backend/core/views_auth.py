"""
Authentication views for user registration, login, logout, and profile management.
"""
from typing import Any, Dict, cast

from django.contrib.auth import authenticate, login as django_login, logout as django_logout, get_user_model
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserSettings, AuditLog
from .serializers import LoginSerializer, RegisterSerializer, UserSettingsUpdateSerializer
from .utils import get_client_ip, get_user_agent

User = get_user_model()

# Rate limit error response
RATE_LIMIT_RESPONSE = Response(
    {"detail": "Too many requests. Please try again later."},
    status=status.HTTP_429_TOO_MANY_REQUESTS
)


def _build_user_payload(user) -> dict:
    """
    Build user payload with settings and profile information.
    Creates UserSettings if it doesn't exist (for existing users).
    """
    settings_obj, _ = UserSettings.objects.get_or_create(user=user)
    # Email: username=email を想定。emailフィールドがあれば優先。
    email = getattr(user, "email", "") or getattr(user, "username", "")
    return {
        "id": user.id,
        "email": email,
        "diff_enabled": settings_obj.diff_enabled,
        "display_name": settings_obj.display_name,
        "graduation_year": settings_obj.graduation_year,
    }


def _create_audit_log(request, action: AuditLog.Action, user=None, input_email: str = "") -> None:
    """Helper to create audit log entries for authentication events."""
    AuditLog.objects.create(
        user=user,
        input_email=input_email,
        action=action,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class RegisterView(APIView):
    """User registration endpoint with rate limiting."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if getattr(request, 'limited', False):
            return RATE_LIMIT_RESPONSE

        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        email = ser.validated_data["email"]
        password = ser.validated_data["password"]

        # Check if user already exists
        if User.objects.filter(username=email).exists():
            return Response(
                {"detail": "User already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user (username=email)
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password
        )

        # Auto-login after registration
        django_login(request, user)
        _create_audit_log(request, AuditLog.Action.LOGIN_SUCCESS, user=user)

        return Response(_build_user_payload(user), status=status.HTTP_201_CREATED)


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class LoginView(APIView):
    """User login endpoint with rate limiting."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if getattr(request, 'limited', False):
            return RATE_LIMIT_RESPONSE

        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        validated_data = cast(Dict[str, Any], ser.validated_data)
        username = validated_data["username"]
        password = validated_data["password"]

        user = authenticate(request, username=username, password=password)

        if user is None:
            _create_audit_log(request, AuditLog.Action.LOGIN_FAIL, input_email=username)
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        django_login(request, user)
        _create_audit_log(request, AuditLog.Action.LOGIN_SUCCESS, user=user)

        return Response(_build_user_payload(user), status=status.HTTP_200_OK)


class LogoutView(APIView):
    """User logout endpoint."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        _create_audit_log(request, AuditLog.Action.LOGOUT, user=request.user)
        django_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """Get current user information endpoint."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_build_user_payload(request.user), status=status.HTTP_200_OK)


@method_decorator(ratelimit(key='user', rate='30/m', method='PATCH', block=True), name='patch')
class MeSettingsView(APIView):
    """Update user settings and profile endpoint with rate limiting."""
    permission_classes = [IsAuthenticated]

    # Fields that can be updated via this endpoint
    ALLOWED_FIELDS = {'diff_enabled', 'display_name', 'graduation_year'}

    def patch(self, request):
        if getattr(request, 'limited', False):
            return RATE_LIMIT_RESPONSE

        ser = UserSettingsUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        validated_data = cast(Dict[str, Any], ser.validated_data)
        settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)

        # Update only provided fields
        update_fields = ["updated_at"]
        for field in self.ALLOWED_FIELDS:
            if field in validated_data:
                setattr(settings_obj, field, validated_data[field])
                update_fields.append(field)

        settings_obj.save(update_fields=update_fields)
        _create_audit_log(request, AuditLog.Action.SETTINGS_UPDATE, user=request.user)

        return Response(_build_user_payload(request.user), status=status.HTTP_200_OK)
