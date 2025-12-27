from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import UserSettings, AuditLog

User = get_user_model()


class TestAuth(APITestCase):
    """Test authentication endpoints."""

    def test_register_creates_user_and_settings(self):
        """Test user registration creates user and UserSettings."""
        response = self.client.post("/api/auth/register", {
            "email": "test@example.com",
            "password": "testpass123",
            "password_confirm": "testpass123",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertTrue(response.data["diff_enabled"])

        # Verify user created
        user = User.objects.get(username="test@example.com")
        self.assertIsNotNone(user)

        # Verify UserSettings created
        self.assertTrue(UserSettings.objects.filter(user=user).exists())
        settings = UserSettings.objects.get(user=user)
        self.assertTrue(settings.diff_enabled)

        # Verify audit log created (LOGIN_SUCCESS after registration)
        audit_logs = AuditLog.objects.filter(user=user, action=AuditLog.Action.LOGIN_SUCCESS)
        self.assertEqual(audit_logs.count(), 1)

    def test_register_duplicate_user(self):
        """Test registering duplicate user returns error."""
        User.objects.create_user(username="test@example.com", email="test@example.com")

        response = self.client.post("/api/auth/register", {
            "email": "test@example.com",
            "password": "testpass123",
            "password_confirm": "testpass123",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("User already exists", response.data["detail"])

    def test_register_password_mismatch(self):
        """Test registration with password mismatch."""
        response = self.client.post("/api/auth/register", {
            "email": "test@example.com",
            "password": "testpass123",
            "password_confirm": "different",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success_logs_audit(self):
        """Test login success logs audit."""
        user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="testpass123"
        )

        response = self.client.post("/api/auth/login", {
            "email": "test@example.com",
            "password": "testpass123",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "test@example.com")

        # Verify audit log
        audit_logs = AuditLog.objects.filter(user=user, action=AuditLog.Action.LOGIN_SUCCESS)
        self.assertEqual(audit_logs.count(), 1)
        log = audit_logs.first()
        self.assertIsNotNone(log.ip_address)

    def test_login_fail_logs_audit(self):
        """Test login failure logs audit with input_email."""
        response = self.client.post("/api/auth/login", {
            "email": "nonexistent@example.com",
            "password": "wrongpass",
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Verify audit log with input_email
        audit_logs = AuditLog.objects.filter(
            action=AuditLog.Action.LOGIN_FAIL,
            input_email="nonexistent@example.com"
        )
        self.assertEqual(audit_logs.count(), 1)
        log = audit_logs.first()
        self.assertIsNone(log.user)
        self.assertEqual(log.input_email, "nonexistent@example.com")

    def test_logout_logs_audit(self):
        """Test logout logs audit."""
        user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="testpass123"
        )
        self.client.force_authenticate(user=user)

        response = self.client.post("/api/auth/logout")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify audit log
        audit_logs = AuditLog.objects.filter(user=user, action=AuditLog.Action.LOGOUT)
        self.assertEqual(audit_logs.count(), 1)

    def test_me_returns_user_with_settings(self):
        """Test /api/me returns user with settings."""
        user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="testpass123"
        )
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/me")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertIn("diff_enabled", response.data)

    def test_me_requires_auth(self):
        """Test /api/me requires authentication."""
        response = self.client.get("/api/me")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_settings_update_logs_audit(self):
        """Test settings update logs audit."""
        user = User.objects.create_user(
            username="test@example.com",
            email="test@example.com",
            password="testpass123"
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch("/api/me/settings", {
            "diff_enabled": False,
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["diff_enabled"])

        # Verify settings updated
        settings = UserSettings.objects.get(user=user)
        self.assertFalse(settings.diff_enabled)

        # Verify audit log
        audit_logs = AuditLog.objects.filter(user=user, action=AuditLog.Action.SETTINGS_UPDATE)
        self.assertEqual(audit_logs.count(), 1)
