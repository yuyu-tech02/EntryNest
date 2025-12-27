from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import AuditLog

User = get_user_model()


class TestAuditLog(APITestCase):
    """Test AuditLog read-only views."""

    def setUp(self):
        """Set up test users."""
        self.user1 = User.objects.create_user(
            username="user1@example.com",
            email="user1@example.com",
            password="testpass123"
        )
        self.user2 = User.objects.create_user(
            username="user2@example.com",
            email="user2@example.com",
            password="testpass123"
        )

    def test_list_requires_auth(self):
        """Test list requires authentication."""
        response = self.client.get("/api/auditlogs/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_only_own_logs(self):
        """Test list only returns user's own logs (IDOR prevention)."""
        # Create logs for both users
        log1 = AuditLog.objects.create(
            user=self.user1,
            action=AuditLog.Action.LOGIN_SUCCESS,
            ip_address="1.2.3.4"
        )
        log2 = AuditLog.objects.create(
            user=self.user2,
            action=AuditLog.Action.LOGIN_SUCCESS,
            ip_address="5.6.7.8"
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/auditlogs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], log1.id)
        self.assertEqual(response.data[0]["ip_address"], "1.2.3.4")

    def test_readonly_operations_only(self):
        """Test only read operations are allowed (no create/update/delete)."""
        self.client.force_authenticate(user=self.user1)

        # Try to create
        response = self.client.post("/api/auditlogs/", {
            "action": "COMPANY_CREATE",
        })
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Create a log for testing update/delete
        log = AuditLog.objects.create(
            user=self.user1,
            action=AuditLog.Action.LOGIN_SUCCESS,
        )

        # Try to update
        response = self.client.patch(f"/api/auditlogs/{log.id}/", {
            "action": "LOGOUT",
        })
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Try to delete
        response = self.client.delete(f"/api/auditlogs/{log.id}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_retrieve_other_log_returns_404(self):
        """Test retrieving other user's log returns 404."""
        log = AuditLog.objects.create(
            user=self.user2,
            action=AuditLog.Action.LOGIN_SUCCESS,
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f"/api/auditlogs/{log.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_serializer_does_not_expose_sensitive_fields(self):
        """Test serializer doesn't expose user_agent or input_email."""
        log = AuditLog.objects.create(
            user=self.user1,
            action=AuditLog.Action.LOGIN_SUCCESS,
            user_agent="Mozilla/5.0",
            input_email="should-not-be-exposed@example.com",
            ip_address="1.2.3.4"
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f"/api/auditlogs/{log.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should not expose user_agent or input_email
        self.assertNotIn("user_agent", response.data)
        self.assertNotIn("input_email", response.data)
        # Should expose ip_address
        self.assertIn("ip_address", response.data)
