from django.conf import settings
from django.db import models


class UserSettings(models.Model):
    """User settings model for storing user preferences and profile."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    diff_enabled = models.BooleanField(default=True)

    # Profile fields
    display_name = models.CharField(max_length=100, blank=True, default="就活 太郎")
    graduation_year = models.CharField(max_length=20, blank=True, default="2026年卒")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"UserSettings(user_id={self.user.id}, name={self.display_name})"


class Company(models.Model):
    """Company model for tracking job applications."""
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="companies",
    )
    name = models.CharField(max_length=200)
    job_role = models.CharField(max_length=200, blank=True, default="")
    apply_route = models.CharField(max_length=200, blank=True, default="")
    deadline = models.DateField(null=True, blank=True)

    status_text = models.CharField(max_length=200, blank=True, default="")
    memo = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner", "deadline"]),
            models.Index(fields=["owner", "-updated_at"]),
        ]

    def __str__(self) -> str:
        return f"Company(id={self.id}, name={self.name}, owner_id={self.owner_id})"


class ESVersion(models.Model):
    """ES (Entry Sheet) version model for tracking ES submissions."""

    class Result(models.TextChoices):
        UNKNOWN = "UNKNOWN", "Unknown"
        PASS = "PASS", "Pass"
        FAIL = "FAIL", "Fail"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="es_versions",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="es_versions",
    )
    body = models.TextField(blank=True, default="")
    submitted_at = models.DateField(null=True, blank=True)
    submitted_via = models.CharField(max_length=200, blank=True, default="")
    result = models.CharField(
        max_length=20,
        choices=Result.choices,
        default=Result.UNKNOWN,
    )
    memo = models.TextField(blank=True, default="")
    file = models.FileField(upload_to="es_files/", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner", "company"]),
            models.Index(fields=["company", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"ESVersion(id={self.id}, company_id={self.company_id}, owner_id={self.owner_id})"


class AuditLog(models.Model):
    """Audit log model for tracking user actions and security events."""

    class Action(models.TextChoices):
        LOGIN_SUCCESS = "LOGIN_SUCCESS", "Login Success"
        LOGIN_FAIL = "LOGIN_FAIL", "Login Fail"
        LOGOUT = "LOGOUT", "Logout"
        COMPANY_CREATE = "COMPANY_CREATE", "Company Create"
        COMPANY_UPDATE = "COMPANY_UPDATE", "Company Update"
        COMPANY_DELETE = "COMPANY_DELETE", "Company Delete"
        ES_CREATE = "ES_CREATE", "ES Create"
        ES_UPDATE = "ES_UPDATE", "ES Update"
        ES_DELETE = "ES_DELETE", "ES Delete"
        SETTINGS_UPDATE = "SETTINGS_UPDATE", "Settings Update"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    input_email = models.CharField(max_length=254, blank=True, default="")
    action = models.CharField(max_length=50, choices=Action.choices)
    target_type = models.CharField(max_length=50, blank=True, default="")
    target_id = models.IntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["-created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        user_info = f"user_id={self.user_id}" if self.user_id else f"email={self.input_email}"
        return f"AuditLog(id={self.id}, action={self.action}, {user_info})"
