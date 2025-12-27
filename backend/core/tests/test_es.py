from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import Company, ESVersion, AuditLog

User = get_user_model()


class TestESVersionCRUD(APITestCase):
    """Test ESVersion CRUD operations and security."""

    def setUp(self):
        """Set up test users and companies."""
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
        self.company1 = Company.objects.create(owner=self.user1, name="Company 1")
        self.company2 = Company.objects.create(owner=self.user2, name="Company 2")

    def test_list_requires_auth(self):
        """Test list requires authentication."""
        response = self.client.get("/api/es/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_only_own_es(self):
        """Test list only returns user's own ES versions (IDOR prevention)."""
        es1 = ESVersion.objects.create(owner=self.user1, company=self.company1, body="ES 1")
        es2 = ESVersion.objects.create(owner=self.user2, company=self.company2, body="ES 2")

        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/es/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], es1.id)

    def test_create_validates_company_ownership(self):
        """Test creating ES for other user's company is rejected."""
        self.client.force_authenticate(user=self.user1)

        # Try to create ES for user2's company
        response = self.client.post("/api/es/", {
            "company": self.company2.id,
            "body": "Test ES",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid company", str(response.data))

    def test_nested_route_filters_by_company(self):
        """Test nested route /api/companies/{id}/es filters by company."""
        ESVersion.objects.create(owner=self.user1, company=self.company1, body="ES 1")
        ESVersion.objects.create(owner=self.user1, company=self.company1, body="ES 2")

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f"/api/companies/{self.company1.id}/es")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_retrieve_other_es_returns_404(self):
        """Test retrieving other user's ES returns 404 (IDOR prevention)."""
        es = ESVersion.objects.create(owner=self.user2, company=self.company2, body="ES 2")

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f"/api/es/{es.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_other_es_returns_404(self):
        """Test updating other user's ES returns 404 and doesn't modify data."""
        es = ESVersion.objects.create(owner=self.user2, company=self.company2, body="Original")

        self.client.force_authenticate(user=self.user1)
        response = self.client.patch(f"/api/es/{es.id}/", {
            "body": "Hacked",
        })

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        es.refresh_from_db()
        self.assertEqual(es.body, "Original")

    def test_delete_other_es_returns_404(self):
        """Test deleting other user's ES returns 404 and doesn't delete."""
        es = ESVersion.objects.create(owner=self.user2, company=self.company2, body="ES 2")

        self.client.force_authenticate(user=self.user1)
        response = self.client.delete(f"/api/es/{es.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ESVersion.objects.filter(id=es.id).exists())

    def test_all_operations_log_audit(self):
        """Test all operations log audit."""
        self.client.force_authenticate(user=self.user1)

        # CREATE
        response = self.client.post("/api/es/", {
            "company": self.company1.id,
            "body": "Test ES",
        })
        es_id = response.data["id"]
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.user1,
                action=AuditLog.Action.ES_CREATE,
                target_id=es_id
            ).exists()
        )

        # UPDATE
        self.client.patch(f"/api/es/{es_id}/", {"body": "Updated"})
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.user1,
                action=AuditLog.Action.ES_UPDATE,
                target_id=es_id
            ).exists()
        )

        # DELETE
        self.client.delete(f"/api/es/{es_id}/")
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.user1,
                action=AuditLog.Action.ES_DELETE,
                target_id=es_id
            ).exists()
        )

    def test_list_uses_list_serializer(self):
        """Test list action uses ESVersionListSerializer (without body)."""
        ESVersion.objects.create(
            owner=self.user1,
            company=self.company1,
            body="This should not be in list response"
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/es/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # List serializer should not include 'body' field
        self.assertNotIn("body", response.data[0])

    def test_detail_includes_body(self):
        """Test detail action includes body field."""
        es = ESVersion.objects.create(
            owner=self.user1,
            company=self.company1,
            body="Full ES body content"
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f"/api/es/{es.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("body", response.data)
        self.assertEqual(response.data["body"], "Full ES body content")
