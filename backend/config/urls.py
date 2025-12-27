"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path, include
from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from core.views import HealthView, csrf
from core.views_auth import (
    RegisterView, LoginView, LogoutView, MeView, MeSettingsView
)
from core.views_company import CompanyViewSet
from core.views_es import ESVersionViewSet
from core.views_audit import AuditLogViewSet
from core.views_media import ProtectedMediaView

router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"es", ESVersionViewSet, basename="es")
router.register(r"auditlogs", AuditLogViewSet, basename="auditlog")

urlpatterns = [
    path("admin/", admin.site.urls),

    # API routes
    path("api/", include(router.urls)),
    path("api/health", HealthView.as_view()),
    path("api/csrf/", csrf),

    # Auth
    path("api/auth/register", RegisterView.as_view()),
    path("api/auth/login", LoginView.as_view()),
    path("api/auth/logout", LogoutView.as_view()),

    # User
    path("api/me", MeView.as_view()),
    path("api/me/settings", MeSettingsView.as_view()),

    # Nested ES route (for /api/companies/{id}/es)
    path(
        "api/companies/<int:company_id>/es",
        ESVersionViewSet.as_view({"get": "list", "post": "create"}),
    ),

    # Protected media files (authenticated access only)
    re_path(
        r"^media/(?P<file_path>.+)$",
        ProtectedMediaView.as_view(),
        name="protected_media"
    ),

    # SPA fallback (for frontend)
    re_path(
        r"^(?!api/|admin/|static/|media/).*$",
        never_cache(TemplateView.as_view(template_name="frontend/index.html")),
    ),
]
