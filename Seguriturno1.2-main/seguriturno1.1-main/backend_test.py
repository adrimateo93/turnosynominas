import requests
import sys
import json
from datetime import datetime

class SeguriTurnoAPITester:
    def __init__(self, base_url="https://shift-calculator-20.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"status": "ok"}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_api_health(self):
        """Test API health endpoint"""
        return self.run_test("API Health Check", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_user = {
            "email": f"test_user_{timestamp}@seguriturno.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        response = self.run_test("User Registration", "POST", "auth/register", 200, test_user)
        if response and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            return False
            
        # Create a new user for login test
        timestamp = datetime.now().strftime("%H%M%S") + "login"
        test_user = {
            "email": f"login_test_{timestamp}@seguriturno.com",
            "password": "LoginTest123!",
            "name": f"Login Test {timestamp}"
        }
        
        # Register first
        reg_response = self.run_test("User Registration for Login Test", "POST", "auth/register", 200, test_user)
        if not reg_response:
            return False
            
        # Now test login
        login_data = {
            "email": test_user["email"],
            "password": test_user["password"]
        }
        
        response = self.run_test("User Login", "POST", "auth/login", 200, login_data)
        return response is not None

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.token:
            return False
        return self.run_test("Get User Profile", "GET", "auth/me", 200) is not None

    def test_get_settings(self):
        """Test getting user settings"""
        if not self.token:
            return False
        return self.run_test("Get User Settings", "GET", "settings", 200) is not None

    def test_update_settings(self):
        """Test updating user settings"""
        if not self.token:
            return False
            
        settings_data = {
            "categoria": "vigilante_con_arma",
            "porcentaje_jornada": 75,
            "trienios": 2,
            "quinquenios": 1,
            "es_responsable_equipo": True
        }
        
        return self.run_test("Update User Settings", "PUT", "settings", 200, settings_data) is not None

    def test_create_shift(self):
        """Test creating a shift"""
        if not self.token:
            return False
            
        shift_data = {
            "date": "2026-01-15",
            "start_time": "08:00",
            "end_time": "16:00",
            "overtime_hours": 2.0,
            "color": "#10B981",
            "comment": "Test shift",
            "alarm_enabled": True,
            "shift_type": "normal"
        }
        
        response = self.run_test("Create Shift", "POST", "shifts", 200, shift_data)
        if response and 'id' in response:
            self.shift_id = response['id']
            return True
        return False

    def test_get_shifts(self):
        """Test getting shifts"""
        if not self.token:
            return False
        return self.run_test("Get Shifts", "GET", "shifts?year=2026&month=1", 200) is not None

    def test_update_shift(self):
        """Test updating a shift"""
        if not self.token or not hasattr(self, 'shift_id'):
            return False
            
        update_data = {
            "start_time": "09:00",
            "end_time": "17:00",
            "comment": "Updated test shift"
        }
        
        return self.run_test("Update Shift", "PUT", f"shifts/{self.shift_id}", 200, update_data) is not None

    def test_get_single_shift(self):
        """Test getting a single shift"""
        if not self.token or not hasattr(self, 'shift_id'):
            return False
        return self.run_test("Get Single Shift", "GET", f"shifts/{self.shift_id}", 200) is not None

    def test_payroll_calculation(self):
        """Test payroll calculation"""
        if not self.token:
            return False
        return self.run_test("Calculate Payroll", "GET", "payroll/2026/1", 200) is not None

    def test_get_holidays(self):
        """Test getting holidays"""
        return self.run_test("Get Holidays 2026", "GET", "holidays/2026", 200) is not None

    def test_get_categories(self):
        """Test getting job categories"""
        return self.run_test("Get Job Categories", "GET", "categories", 200) is not None

    def test_get_salary_table(self):
        """Test getting salary table"""
        return self.run_test("Get Salary Table", "GET", "salary-table/vigilante_sin_arma", 200) is not None

    def test_delete_shift(self):
        """Test deleting a shift"""
        if not self.token or not hasattr(self, 'shift_id'):
            return False
        return self.run_test("Delete Shift", "DELETE", f"shifts/{self.shift_id}", 200) is not None

    def test_night_hours_calculation(self):
        """Test night hours calculation with a night shift"""
        if not self.token:
            return False
            
        night_shift_data = {
            "date": "2026-01-16",
            "start_time": "22:00",
            "end_time": "06:00",
            "overtime_hours": 0,
            "color": "#3B82F6",
            "comment": "Night shift test",
            "alarm_enabled": False,
            "shift_type": "normal"
        }
        
        response = self.run_test("Create Night Shift", "POST", "shifts", 200, night_shift_data)
        if response and response.get('night_hours', 0) > 0:
            self.log_test("Night Hours Calculation", True, f"Night hours: {response.get('night_hours')}")
            # Clean up
            if 'id' in response:
                self.run_test("Delete Night Shift", "DELETE", f"shifts/{response['id']}", 200)
            return True
        else:
            self.log_test("Night Hours Calculation", False, "No night hours calculated")
            return False

    def test_holiday_hours_calculation(self):
        """Test holiday hours calculation with a weekend shift"""
        if not self.token:
            return False
            
        # Saturday shift (2026-01-03 is a Saturday)
        weekend_shift_data = {
            "date": "2026-01-04", # Sunday
            "start_time": "08:00",
            "end_time": "16:00",
            "overtime_hours": 0,
            "color": "#F97316",
            "comment": "Weekend shift test",
            "alarm_enabled": False,
            "shift_type": "normal"
        }
        
        response = self.run_test("Create Weekend Shift", "POST", "shifts", 200, weekend_shift_data)
        if response and response.get('holiday_hours', 0) > 0:
            self.log_test("Holiday Hours Calculation", True, f"Holiday hours: {response.get('holiday_hours')}")
            # Clean up
            if 'id' in response:
                self.run_test("Delete Weekend Shift", "DELETE", f"shifts/{response['id']}", 200)
            return True
        else:
            self.log_test("Holiday Hours Calculation", False, "No holiday hours calculated")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting SeguriTurno API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Basic API tests
        self.test_api_health()
        
        # Authentication tests
        if self.test_user_registration():
            self.test_get_user_profile()
            self.test_user_login()
        
        # Settings tests
        self.test_get_settings()
        self.test_update_settings()
        
        # Shift management tests
        if self.test_create_shift():
            self.test_get_shifts()
            self.test_get_single_shift()
            self.test_update_shift()
        
        # Special calculations tests
        self.test_night_hours_calculation()
        self.test_holiday_hours_calculation()
        
        # Payroll tests
        self.test_payroll_calculation()
        
        # Reference data tests
        self.test_get_holidays()
        self.test_get_categories()
        self.test_get_salary_table()
        
        # Cleanup
        if hasattr(self, 'shift_id'):
            self.test_delete_shift()
        
        # Print summary
        print("=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = SeguriTurnoAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())