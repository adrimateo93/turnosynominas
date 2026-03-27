"""
Backend tests for new SeguriTurno features:
- Shift Templates (CRUD)
- Companies (2 per user with independent calendars)
- Split Shifts (turno partido with start_time_2, end_time_2)
- Company filtering for shifts
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "guardia_test@test.com"
TEST_PASSWORD = "Test1234!"
TEST_NAME = "Guardia Test"


class TestAuthSetup:
    """Authentication setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get or create test user and return auth token"""
        # Try login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json()["token"]
        
        # If login fails, register new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if response.status_code == 200:
            return response.json()["token"]
        
        # If registration fails (user exists but wrong password), skip tests
        pytest.skip(f"Could not authenticate: {response.text}")
    
    def test_auth_me(self, auth_token):
        """Test /api/auth/me endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert data["email"] == TEST_EMAIL


class TestShiftTemplates:
    """Shift Templates CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_shift_template(self, headers):
        """Test POST /api/shift-templates - create template"""
        template_data = {
            "name": f"TEST_Mañana_{uuid.uuid4().hex[:6]}",
            "start_time": "08:00",
            "end_time": "14:00",
            "color": "#10B981",
            "symbol": "★"
        }
        
        response = requests.post(f"{BASE_URL}/api/shift-templates", json=template_data, headers=headers)
        
        assert response.status_code == 200, f"Failed to create template: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == template_data["name"]
        assert data["start_time"] == template_data["start_time"]
        assert data["end_time"] == template_data["end_time"]
        assert data["color"] == template_data["color"]
        assert data["symbol"] == template_data["symbol"]
        
        # Store template ID for cleanup
        TestShiftTemplates.created_template_id = data["id"]
    
    def test_create_split_shift_template(self, headers):
        """Test creating template with split shift (turno partido)"""
        template_data = {
            "name": f"TEST_Partido_{uuid.uuid4().hex[:6]}",
            "start_time": "08:00",
            "end_time": "12:00",
            "start_time_2": "16:00",
            "end_time_2": "20:00",
            "color": "#3B82F6",
            "symbol": "●"
        }
        
        response = requests.post(f"{BASE_URL}/api/shift-templates", json=template_data, headers=headers)
        
        assert response.status_code == 200, f"Failed to create split template: {response.text}"
        data = response.json()
        assert data["start_time_2"] == "16:00"
        assert data["end_time_2"] == "20:00"
        
        TestShiftTemplates.split_template_id = data["id"]
    
    def test_get_shift_templates(self, headers):
        """Test GET /api/shift-templates - list templates"""
        response = requests.get(f"{BASE_URL}/api/shift-templates", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the templates we created
        assert len(data) >= 1
    
    def test_update_shift_template(self, headers):
        """Test PUT /api/shift-templates/{id} - update template"""
        if not hasattr(TestShiftTemplates, 'created_template_id'):
            pytest.skip("No template created to update")
        
        template_id = TestShiftTemplates.created_template_id
        update_data = {
            "name": f"TEST_Updated_{uuid.uuid4().hex[:6]}",
            "color": "#EF4444"
        }
        
        response = requests.put(f"{BASE_URL}/api/shift-templates/{template_id}", json=update_data, headers=headers)
        
        assert response.status_code == 200, f"Failed to update template: {response.text}"
        data = response.json()
        assert data["color"] == "#EF4444"
    
    def test_delete_shift_template(self, headers):
        """Test DELETE /api/shift-templates/{id} - delete template"""
        if not hasattr(TestShiftTemplates, 'created_template_id'):
            pytest.skip("No template created to delete")
        
        template_id = TestShiftTemplates.created_template_id
        response = requests.delete(f"{BASE_URL}/api/shift-templates/{template_id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/shift-templates", headers=headers)
        templates = response.json()
        assert not any(t["id"] == template_id for t in templates)
    
    def test_delete_split_template(self, headers):
        """Cleanup split template"""
        if hasattr(TestShiftTemplates, 'split_template_id'):
            requests.delete(f"{BASE_URL}/api/shift-templates/{TestShiftTemplates.split_template_id}", headers=headers)


class TestCompanies:
    """Companies endpoint tests - 2 companies per user"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_companies_creates_defaults(self, headers):
        """Test GET /api/companies - should create 2 default companies"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2, f"Expected 2 companies, got {len(data)}"
        
        # Verify company structure
        company_numbers = [c["company_number"] for c in data]
        assert 1 in company_numbers
        assert 2 in company_numbers
        
        for company in data:
            assert "id" in company
            assert "name" in company
            assert "company_number" in company
    
    def test_update_company_name(self, headers):
        """Test PUT /api/companies/{number} - update company name"""
        new_name = f"TEST_Empresa_{uuid.uuid4().hex[:6]}"
        
        response = requests.put(f"{BASE_URL}/api/companies/1", json={"name": new_name}, headers=headers)
        
        assert response.status_code == 200, f"Failed to update company: {response.text}"
        data = response.json()
        assert data["name"] == new_name
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        companies = response.json()
        company_1 = next((c for c in companies if c["company_number"] == 1), None)
        assert company_1 is not None
        assert company_1["name"] == new_name
    
    def test_update_company_2_name(self, headers):
        """Test updating second company name"""
        new_name = f"TEST_Empresa2_{uuid.uuid4().hex[:6]}"
        
        response = requests.put(f"{BASE_URL}/api/companies/2", json={"name": new_name}, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == new_name


class TestSplitShifts:
    """Split shifts (turno partido) tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_split_shift(self, headers):
        """Test POST /api/shifts with start_time_2 and end_time_2 (turno partido)"""
        shift_data = {
            "date": "2026-01-15",
            "start_time": "08:00",
            "end_time": "12:00",
            "start_time_2": "16:00",
            "end_time_2": "20:00",
            "overtime_hours": 0,
            "color": "#10B981",
            "comment": "TEST_Turno partido",
            "alarm_enabled": False,
            "shift_type": "normal",
            "symbol": "★",
            "company_id": 1
        }
        
        response = requests.post(f"{BASE_URL}/api/shifts", json=shift_data, headers=headers)
        
        assert response.status_code == 200, f"Failed to create split shift: {response.text}"
        data = response.json()
        
        # Verify split shift data
        assert data["start_time"] == "08:00"
        assert data["end_time"] == "12:00"
        assert data["start_time_2"] == "16:00"
        assert data["end_time_2"] == "20:00"
        
        # Verify total hours calculation (4h + 4h = 8h)
        assert data["total_hours"] == 8.0, f"Expected 8h total, got {data['total_hours']}"
        
        # Verify symbol
        assert data["symbol"] == "★"
        
        TestSplitShifts.split_shift_id = data["id"]
    
    def test_get_split_shift(self, headers):
        """Test GET /api/shifts/{id} for split shift"""
        if not hasattr(TestSplitShifts, 'split_shift_id'):
            pytest.skip("No split shift created")
        
        shift_id = TestSplitShifts.split_shift_id
        response = requests.get(f"{BASE_URL}/api/shifts/{shift_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["start_time_2"] == "16:00"
        assert data["end_time_2"] == "20:00"
    
    def test_update_split_shift(self, headers):
        """Test PUT /api/shifts/{id} - update split shift times"""
        if not hasattr(TestSplitShifts, 'split_shift_id'):
            pytest.skip("No split shift created")
        
        shift_id = TestSplitShifts.split_shift_id
        update_data = {
            "start_time_2": "17:00",
            "end_time_2": "21:00"
        }
        
        response = requests.put(f"{BASE_URL}/api/shifts/{shift_id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["start_time_2"] == "17:00"
        assert data["end_time_2"] == "21:00"
        # Total hours should be recalculated (4h + 4h = 8h)
        assert data["total_hours"] == 8.0
    
    def test_delete_split_shift(self, headers):
        """Cleanup split shift"""
        if hasattr(TestSplitShifts, 'split_shift_id'):
            response = requests.delete(f"{BASE_URL}/api/shifts/{TestSplitShifts.split_shift_id}", headers=headers)
            assert response.status_code == 200


class TestCompanyFiltering:
    """Test shifts filtering by company_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_shift_company_1(self, headers):
        """Create shift for company 1"""
        shift_data = {
            "date": "2026-01-20",
            "start_time": "08:00",
            "end_time": "14:00",
            "company_id": 1,
            "comment": "TEST_Company1_Shift"
        }
        
        response = requests.post(f"{BASE_URL}/api/shifts", json=shift_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["company_id"] == 1
        TestCompanyFiltering.company1_shift_id = data["id"]
    
    def test_create_shift_company_2(self, headers):
        """Create shift for company 2"""
        shift_data = {
            "date": "2026-01-20",
            "start_time": "16:00",
            "end_time": "22:00",
            "company_id": 2,
            "comment": "TEST_Company2_Shift"
        }
        
        response = requests.post(f"{BASE_URL}/api/shifts", json=shift_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["company_id"] == 2
        TestCompanyFiltering.company2_shift_id = data["id"]
    
    def test_filter_shifts_by_company_1(self, headers):
        """Test GET /api/shifts?company_id=1 - filter by company 1"""
        response = requests.get(f"{BASE_URL}/api/shifts?year=2026&month=1&company_id=1", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All shifts should be company 1
        for shift in data:
            assert shift.get("company_id", 1) == 1, f"Found company_id {shift.get('company_id')} in company 1 filter"
    
    def test_filter_shifts_by_company_2(self, headers):
        """Test GET /api/shifts?company_id=2 - filter by company 2"""
        response = requests.get(f"{BASE_URL}/api/shifts?year=2026&month=1&company_id=2", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All shifts should be company 2
        for shift in data:
            assert shift.get("company_id", 1) == 2, f"Found company_id {shift.get('company_id')} in company 2 filter"
    
    def test_company_independence(self, headers):
        """Verify shifts from different companies are independent"""
        # Get company 1 shifts
        response1 = requests.get(f"{BASE_URL}/api/shifts?year=2026&month=1&company_id=1", headers=headers)
        company1_shifts = response1.json()
        
        # Get company 2 shifts
        response2 = requests.get(f"{BASE_URL}/api/shifts?year=2026&month=1&company_id=2", headers=headers)
        company2_shifts = response2.json()
        
        # Verify no overlap in shift IDs
        company1_ids = {s["id"] for s in company1_shifts}
        company2_ids = {s["id"] for s in company2_shifts}
        
        assert company1_ids.isdisjoint(company2_ids), "Company shifts should be independent"
    
    def test_cleanup_company_shifts(self, headers):
        """Cleanup test shifts"""
        if hasattr(TestCompanyFiltering, 'company1_shift_id'):
            requests.delete(f"{BASE_URL}/api/shifts/{TestCompanyFiltering.company1_shift_id}", headers=headers)
        if hasattr(TestCompanyFiltering, 'company2_shift_id'):
            requests.delete(f"{BASE_URL}/api/shifts/{TestCompanyFiltering.company2_shift_id}", headers=headers)


class TestPayrollWithCompany:
    """Test payroll calculation with company filtering"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_payroll_with_company_filter(self, headers):
        """Test GET /api/payroll/{year}/{month}?company_id=1"""
        response = requests.get(f"{BASE_URL}/api/payroll/2026/1?company_id=1", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify payroll structure
        assert "year" in data
        assert "month" in data
        assert "jornada" in data
        # Monthly target varies by days in month (1782h/11months * days/30)
        # January has 31 days, so ~167.4h. Base is 162h for 30-day month
        assert data["jornada"]["horas_mes_objetivo"] > 0, "Expected positive monthly target"
        assert "total_bruto" in data
        assert "salario_neto" in data


class TestShiftSymbols:
    """Test shift symbols feature"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_shift_with_symbol(self, headers):
        """Test creating shift with symbol"""
        shift_data = {
            "date": "2026-01-25",
            "start_time": "08:00",
            "end_time": "14:00",
            "symbol": "⚡",
            "comment": "TEST_Symbol_Shift"
        }
        
        response = requests.post(f"{BASE_URL}/api/shifts", json=shift_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "⚡"
        
        TestShiftSymbols.symbol_shift_id = data["id"]
    
    def test_update_shift_symbol(self, headers):
        """Test updating shift symbol"""
        if not hasattr(TestShiftSymbols, 'symbol_shift_id'):
            pytest.skip("No symbol shift created")
        
        shift_id = TestShiftSymbols.symbol_shift_id
        response = requests.put(f"{BASE_URL}/api/shifts/{shift_id}", json={"symbol": "★"}, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "★"
    
    def test_cleanup_symbol_shift(self, headers):
        """Cleanup symbol shift"""
        if hasattr(TestShiftSymbols, 'symbol_shift_id'):
            requests.delete(f"{BASE_URL}/api/shifts/{TestShiftSymbols.symbol_shift_id}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
