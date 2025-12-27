from django.contrib import admin
from .models import UserSettings, Company, ESVersion, AuditLog


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ["user", "diff_enabled", "updated_at"]
    list_filter = ["diff_enabled"]
    search_fields = ["user__username", "user__email"]


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "deadline", "status_text", "updated_at"]
    list_filter = ["deadline", "updated_at"]
    search_fields = ["name", "owner__username"]
    date_hierarchy = "deadline"


@admin.register(ESVersion)
class ESVersionAdmin(admin.ModelAdmin):
    list_display = ["id", "company", "owner", "result", "submitted_at", "created_at"]
    list_filter = ["result", "submitted_at"]
    search_fields = ["company__name", "owner__username"]
    date_hierarchy = "submitted_at"


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "user", "input_email", "ip_address", "created_at"]
    list_filter = ["action", "created_at"]
    search_fields = ["user__username", "input_email", "ip_address"]
    date_hierarchy = "created_at"
    readonly_fields = [
        "user", "input_email", "action", "target_type", "target_id",
        "ip_address", "user_agent", "created_at"
    ]

    def has_add_permission(self, request):
        """Prevent manual creation of audit logs."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of audit logs."""
        return False
