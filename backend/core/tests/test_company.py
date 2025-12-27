from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import date

from core.models import Company, AuditLog

User = get_user_model()


class TestCompanyCRUD(APITestCase):
    """Test Company CRUD operations and IDOR prevention."""

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
        response = self.client.get("/api/companies/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_only_own_companies(self):
        """Test list only returns user's own companies (IDOR prevention)."""
        # Create companies for both users
        company1 = Company.objects.create(owner=self.user1, name="Company 1")
        company2 = Company.objects.create(owner=self.user2, name="Company 2")

        # Login as user1
        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/companies/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], company1.id)
        self.assertEqual(response.data[0]["name"], "Company 1")

    def test_retrieve_other_company_returns_404(self):
        """Test retrieving other user's company returns 404 (IDOR prevention)."""
        company = Company.objects.create(owner=self.user2, name="Company 2")

        # Login as user1, try to access user2's company
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f"/api/companies/{company.id}/")

        # Should return 404 (not 403) to avoid information leakage
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_other_company_returns_404(self):
        """Test updating other user's company returns 404 and doesn't modify data."""
        company = Company.objects.create(owner=self.user2, name="Original Name")

        # Login as user1, try to update user2's company
        self.client.force_authenticate(user=self.user1)
        response = self.client.patch(f"/api/companies/{company.id}/", {
            "name": "Hacked Name",
        })

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Verify data not modified
        company.refresh_from_db()
        self.assertEqual(company.name, "Original Name")

    def test_delete_other_company_returns_404(self):
        """Test deleting other user's company returns 404 and doesn't delete."""
        company = Company.objects.create(owner=self.user2, name="Company 2")

        # Login as user1, try to delete user2's company
        self.client.force_authenticate(user=self.user1)
        response = self.client.delete(f"/api/companies/{company.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Verify not deleted
        self.assertTrue(Company.objects.filter(id=company.id).exists())

    def test_create_forces_owner_to_request_user(self):
        """Test create forces owner to request.user (client cannot specify owner)."""
        self.client.force_authenticate(user=self.user1)

        # Try to create company with user2 as owner (should be ignored)
        response = self.client.post("/api/companies/", {
            "name": "New Company",
            "owner": self.user2.id,  # This should be ignored
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        company = Company.objects.get(id=response.data["id"])
        # Owner should be user1 (request.user), not user2
        self.assertEqual(company.owner, self.user1)

    def test_ordering_deadline_asc(self):
        """Test ordering by deadline ascending."""
        self.client.force_authenticate(user=self.user1)

        Company.objects.create(owner=self.user1, name="C1", deadline=date(2025, 3, 1))
        Company.objects.create(owner=self.user1, name="C2", deadline=date(2025, 1, 1))
        Company.objects.create(owner=self.user1, name="C3", deadline=date(2025, 2, 1))

        response = self.client.get("/api/companies/?ordering=deadline")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(response.data[0]["name"], "C2")
        self.assertEqual(response.data[1]["name"], "C3")
        self.assertEqual(response.data[2]["name"], "C1")

    def test_all_operations_log_audit(self):
        """Test all operations log audit."""
        self.client.force_authenticate(user=self.user1)

        # CREATE
        response = self.client.post("/api/companies/", {"name": "Test Company"})
        company_id = response.data["id"]
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.user1,
                action=AuditLog.Action.COMPANY_CREATE,
                target_id=company_id
            ).exists()
        )

        # UPDATE
        self.client.patch(f"/api/companies/{company_id}/", {"name": "Updated"})
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.user1,
                action=AuditLog.Action.COMPANY_UPDATE,
                target_id=company_id
            ).exists()
        )

        # DELETE
        self.client.delete(f"/api/companies/{company_id}/")
        self.assertTrue(
            AuditLog.objects.filter(
                user=self.user1,
                action=AuditLog.Action.COMPANY_DELETE,
                target_id=company_id
            ).exists()
        )
