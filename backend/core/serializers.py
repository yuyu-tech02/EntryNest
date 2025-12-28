from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Company, ESVersion, AuditLog

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    """Serializer for login requests."""
    # MVP: username=email を想定。入力名は email でも username でも受ける。
    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get("username") or attrs.get("email")
        password = attrs.get("password")

        if not username or not password:
            raise serializers.ValidationError("username/email and password are required.")

        attrs["username"] = username
        return attrs


class RegisterSerializer(serializers.Serializer):
    """Serializer for user registration."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Passwords do not match.")
        return attrs


class UserSettingsUpdateSerializer(serializers.Serializer):
    """Serializer for updating user settings and profile."""
    diff_enabled = serializers.BooleanField(required=False)
    display_name = serializers.CharField(max_length=100, required=False)
    graduation_year = serializers.CharField(max_length=20, required=False)


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model."""
    class Meta:
        model = Company
        fields = [
            "id", "name", "job_role", "apply_route", "deadline",
            "status_text", "memo", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    # SECURITY: Never expose 'owner' field to client


class ESVersionSerializer(serializers.ModelSerializer):
    """Serializer for ESVersion model with full fields."""
    class Meta:
        model = ESVersion
        fields = [
            "id", "company", "body", "submitted_at", "submitted_via",
            "result", "memo", "file", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_company(self, value):
        """Validate that company belongs to request user."""
        request = self.context.get("request")
        if request and value.owner != request.user:
            raise serializers.ValidationError("Invalid company.")
        return value

    def validate_file(self, value):
        """Validate uploaded file type and size using settings constants."""
        if value:
            max_size = settings.MAX_UPLOAD_FILE_SIZE
            max_size_mb = max_size / (1024 * 1024)

            if value.size > max_size:
                raise serializers.ValidationError(
                    f"File size must be under {max_size_mb:.0f}MB. "
                    f"Current size: {value.size / 1024 / 1024:.1f}MB"
                )

            # Extract extension and validate
            ext = f'.{value.name.lower().split(".")[-1]}' if '.' in value.name else ''
            if ext and ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
                raise serializers.ValidationError(
                    f"File type '{ext}' not allowed. "
                    f"Allowed: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}"
                )

        return value

    # SECURITY: Never expose 'owner' field to client


class ESVersionListSerializer(serializers.ModelSerializer):
    """Serializer for ESVersion list view (without body field)."""
    class Meta:
        model = ESVersion
        fields = [
            "id", "company", "submitted_at", "submitted_via",
            "result", "file", "created_at", "updated_at",
        ]
        read_only_fields = fields


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model (read-only)."""
    class Meta:
        model = AuditLog
        fields = [
            "id", "action", "target_type", "target_id",
            "ip_address", "created_at",
        ]
        read_only_fields = fields

    # SECURITY: Don't expose user_agent or input_email to clients
