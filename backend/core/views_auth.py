from typing import Any, Dict, cast

from django.contrib.auth import authenticate, login as django_login, logout as django_logout, get_user_model
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import UserSettings, AuditLog
from core.serializers import LoginSerializer, RegisterSerializer, UserSettingsUpdateSerializer

User = get_user_model()


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


def _me_payload(user):
    """Return user payload with settings and profile."""
    # Ensure settings exists (for existing users)
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


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class RegisterView(APIView):
    """User registration endpoint."""
    permission_classes = [AllowAny]
    authentication_classes = []  # Disable SessionAuthentication to enforce CSRF

    def post(self, request):
        # Check if rate limited
        if getattr(request, 'limited', False):
            return Response(
                {"detail": "Too many requests. Please try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

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

        # Audit log: LOGIN_SUCCESS (after registration)
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.LOGIN_SUCCESS,
            ip_address=_get_client_ip(request),
            user_agent=_get_user_agent(request),
        )

        return Response(_me_payload(user), status=status.HTTP_201_CREATED)


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class LoginView(APIView):
    """User login endpoint."""
    permission_classes = [AllowAny]
    authentication_classes = []  # Disable SessionAuthentication to enforce CSRF

    def post(self, request):
        # Check if rate limited
        if getattr(request, 'limited', False):
            return Response(
                {"detail": "Too many requests. Please try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        validated_data = cast(Dict[str, Any], ser.validated_data)
        username = validated_data["username"]
        password = validated_data["password"]

        user = authenticate(request, username=username, password=password)

        if user is None:
            # Audit log: LOGIN_FAIL
            AuditLog.objects.create(
                user=None,
                input_email=username,
                action=AuditLog.Action.LOGIN_FAIL,
                ip_address=_get_client_ip(request),
                user_agent=_get_user_agent(request),
            )
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        django_login(request, user)

        # Audit log: LOGIN_SUCCESS
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.LOGIN_SUCCESS,
            ip_address=_get_client_ip(request),
            user_agent=_get_user_agent(request),
        )

        return Response(_me_payload(user), status=status.HTTP_200_OK)


class LogoutView(APIView):
    """User logout endpoint."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Audit log: LOGOUT
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.LOGOUT,
            ip_address=_get_client_ip(request),
            user_agent=_get_user_agent(request),
        )

        django_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """Get current user information endpoint."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_me_payload(request.user), status=status.HTTP_200_OK)


class MeSettingsView(APIView):
    """Update user settings and profile endpoint."""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        ser = UserSettingsUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        validated_data = cast(Dict[str, Any], ser.validated_data)
        settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)

        # Update fields that are provided
        update_fields = ["updated_at"]
        if "diff_enabled" in validated_data:
            settings_obj.diff_enabled = validated_data["diff_enabled"]
            update_fields.append("diff_enabled")
        if "display_name" in validated_data:
            settings_obj.display_name = validated_data["display_name"]
            update_fields.append("display_name")
        if "graduation_year" in validated_data:
            settings_obj.graduation_year = validated_data["graduation_year"]
            update_fields.append("graduation_year")

        settings_obj.save(update_fields=update_fields)

        # Audit log: SETTINGS_UPDATE
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.SETTINGS_UPDATE,
            ip_address=_get_client_ip(request),
            user_agent=_get_user_agent(request),
        )

        return Response(_me_payload(request.user), status=status.HTTP_200_OK)
