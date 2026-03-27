import requests
import sys
import json
from datetime import datetime

class SeguriTurnoAPITester:
    def __init__(self, base_url="https://shift-visual-fix.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.created_shift_id = None
        self.created_template_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {json.dumps(response_data, indent=2)}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login and get token"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        success, response = self.run_test(
            "Login with test credentials",
            "POST",
            "auth/login",
            200,
            data={"email": "test@test.com", "password": "test123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            print(f"✅ Login successful, user_id: {self.user_id}")
            return True
        return False

    def test_shifts_crud(self):
        """Test shift CRUD operations with label field"""
        print("\n" + "="*50)
        print("TESTING SHIFTS CRUD WITH LABELS")
        print("="*50)
        
        # Test creating a shift with label
        shift_data = {
            "date": "2026-01-15",
            "start_time": "08:00",
            "end_time": "16:00",
            "overtime_hours": 2.0,
            "color": "#3B82F6",
            "comment": "Test shift with label",
            "alarm_enabled": False,
            "shift_type": "normal",
            "symbol": "★",
            "label": "M",
            "company_id": 1
        }
        
        success, response = self.run_test(
            "Create shift with label",
            "POST",
            "shifts",
            200,
            data=shift_data
        )
        
        if success and 'id' in response:
            self.created_shift_id = response['id']
            # Verify label was saved
            if response.get('label') == 'M':
                print("✅ Label field saved correctly")
            else:
                print(f"❌ Label field not saved correctly. Expected 'M', got '{response.get('label')}'")
                return False
        else:
            print("❌ Failed to create shift")
            return False
        
        # Test getting the shift
        success, response = self.run_test(
            "Get created shift",
            "GET",
            f"shifts/{self.created_shift_id}",
            200
        )
        
        if success:
            if response.get('label') == 'M':
                print("✅ Label field retrieved correctly")
            else:
                print(f"❌ Label field not retrieved correctly. Expected 'M', got '{response.get('label')}'")
                return False
        
        # Test updating shift label
        update_data = {"label": "T"}
        success, response = self.run_test(
            "Update shift label",
            "PUT",
            f"shifts/{self.created_shift_id}",
            200,
            data=update_data
        )
        
        if success and response.get('label') == 'T':
            print("✅ Label field updated correctly")
        else:
            print(f"❌ Label field not updated correctly. Expected 'T', got '{response.get('label')}'")
            return False
        
        return True

    def test_special_shifts(self):
        """Test creating special shifts (IT, VAC, AT, PR)"""
        print("\n" + "="*50)
        print("TESTING SPECIAL SHIFTS")
        print("="*50)
        
        special_shifts = [
            {"label": "IT", "shift_type": "incapacidad_temporal", "color": "#F97316"},
            {"label": "VAC", "shift_type": "normal", "color": "#10B981"},
            {"label": "AT", "shift_type": "accidente_trabajo", "color": "#EF4444"},
            {"label": "PR", "shift_type": "permiso_retribuido", "color": "#3B82F6"}
        ]
        
        for i, shift_info in enumerate(special_shifts):
            shift_data = {
                "date": f"2026-01-{16+i:02d}",
                "start_time": "08:00",
                "end_time": "13:20",
                "overtime_hours": 0,
                "color": shift_info["color"],
                "comment": f"Test {shift_info['label']} shift",
                "alarm_enabled": False,
                "shift_type": shift_info["shift_type"],
                "symbol": "",
                "label": shift_info["label"],
                "company_id": 1
            }
            
            success, response = self.run_test(
                f"Create {shift_info['label']} shift",
                "POST",
                "shifts",
                200,
                data=shift_data
            )
            
            if not success or response.get('label') != shift_info['label']:
                print(f"❌ Failed to create {shift_info['label']} shift with correct label")
                return False
        
        print("✅ All special shifts created successfully")
        return True

    def test_shift_templates(self):
        """Test shift template CRUD with label field"""
        print("\n" + "="*50)
        print("TESTING SHIFT TEMPLATES WITH LABELS")
        print("="*50)
        
        # Create template with label
        template_data = {
            "name": "Mañana Test",
            "start_time": "08:00",
            "end_time": "14:00",
            "start_time_2": None,
            "end_time_2": None,
            "color": "#22C55E",
            "symbol": "M",
            "label": "M"
        }
        
        success, response = self.run_test(
            "Create template with label",
            "POST",
            "shift-templates",
            200,
            data=template_data
        )
        
        if success and 'id' in response:
            self.created_template_id = response['id']
            if response.get('label') == 'M':
                print("✅ Template label saved correctly")
            else:
                print(f"❌ Template label not saved correctly. Expected 'M', got '{response.get('label')}'")
                return False
        else:
            return False
        
        # Get templates
        success, response = self.run_test(
            "Get shift templates",
            "GET",
            "shift-templates",
            200
        )
        
        if success and isinstance(response, list):
            template_found = False
            for template in response:
                if template.get('id') == self.created_template_id:
                    template_found = True
                    if template.get('label') == 'M':
                        print("✅ Template label retrieved correctly")
                    else:
                        print(f"❌ Template label not retrieved correctly. Expected 'M', got '{template.get('label')}'")
                        return False
                    break
            
            if not template_found:
                print("❌ Created template not found in list")
                return False
        else:
            return False
        
        return True

    def test_overtime_in_payroll(self):
        """Test that overtime hours appear in payroll calculations"""
        print("\n" + "="*50)
        print("TESTING OVERTIME IN PAYROLL")
        print("="*50)
        
        # Create a shift with overtime hours
        shift_with_overtime = {
            "date": "2026-01-20",
            "start_time": "08:00",
            "end_time": "16:00",
            "overtime_hours": 3.0,  # 3 hours overtime
            "color": "#8B5CF6",
            "comment": "Shift with overtime for payroll test",
            "alarm_enabled": False,
            "shift_type": "normal",
            "symbol": "",
            "label": "",
            "company_id": 1
        }
        
        success, response = self.run_test(
            "Create shift with overtime",
            "POST",
            "shifts",
            200,
            data=shift_with_overtime
        )
        
        if not success:
            print("❌ Failed to create shift with overtime")
            return False
        
        # Get payroll for January 2026
        success, response = self.run_test(
            "Get payroll with overtime",
            "GET",
            "payroll/2026/1?company_id=1",
            200
        )
        
        if success:
            # Check if overtime hours are included
            horas = response.get('horas', {})
            overtime_hours = horas.get('extras', 0)
            overtime_amount = horas.get('importe_horas_extras', 0)
            total_bruto = response.get('total_bruto', 0)
            
            print(f"   Overtime hours in payroll: {overtime_hours}")
            print(f"   Overtime amount: {overtime_amount}")
            print(f"   Total bruto: {total_bruto}")
            
            if overtime_hours > 0:
                print("✅ Overtime hours appear in payroll")
            else:
                print("❌ Overtime hours not found in payroll")
                return False
            
            if overtime_amount > 0:
                print("✅ Overtime amount calculated in DEVENGOS")
            else:
                print("❌ Overtime amount not calculated in DEVENGOS")
                return False
            
            # Check if overtime is included in total bruto
            desglose = response.get('desglose_bruto', {})
            print(f"   Desglose bruto keys: {list(desglose.keys())}")
            
            return True
        else:
            print("❌ Failed to get payroll data")
            return False

    def test_radioscopy_bonus(self):
        """Test that radioscopy bonus has no cap"""
        print("\n" + "="*50)
        print("TESTING RADIOSCOPY BONUS (NO CAP)")
        print("="*50)
        
        # Update user settings with high radioscopy hours
        settings_data = {
            "plus_radioscopia_basica_horas": 200.0  # High hours to test no cap
        }
        
        success, response = self.run_test(
            "Update settings with high radioscopy hours",
            "PUT",
            "settings",
            200,
            data=settings_data
        )
        
        if not success:
            print("❌ Failed to update settings")
            return False
        
        # Get payroll to check radioscopy calculation
        success, response = self.run_test(
            "Get payroll with radioscopy bonus",
            "GET",
            "payroll/2026/1?company_id=1",
            200
        )
        
        if success:
            pluses_convenio = response.get('desglose_bruto', {}).get('pluses_convenio', {})
            radioscopia_amount = pluses_convenio.get('plus_radioscopia_basica', 0)
            
            print(f"   Radioscopy bonus amount: {radioscopia_amount}")
            
            # With 200 hours at 0.21€/hour, should be 42€ (no cap)
            expected_amount = 200 * 0.21
            if abs(radioscopia_amount - expected_amount) < 0.01:
                print(f"✅ Radioscopy bonus calculated without cap: {radioscopia_amount}€")
                return True
            else:
                print(f"❌ Radioscopy bonus calculation incorrect. Expected ~{expected_amount}, got {radioscopia_amount}")
                return False
        else:
            return False

    def cleanup(self):
        """Clean up created test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        # Delete created shift
        if self.created_shift_id:
            success, _ = self.run_test(
                "Delete test shift",
                "DELETE",
                f"shifts/{self.created_shift_id}",
                200
            )
            if success:
                print("✅ Test shift deleted")
        
        # Delete created template
        if self.created_template_id:
            success, _ = self.run_test(
                "Delete test template",
                "DELETE",
                f"shift-templates/{self.created_template_id}",
                200
            )
            if success:
                print("✅ Test template deleted")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting SeguriTurno API Tests")
        print("="*60)
        
        # Test authentication
        if not self.test_login():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Test shifts with labels
        if not self.test_shifts_crud():
            print("❌ Shifts CRUD tests failed")
            return False
        
        # Test special shifts
        if not self.test_special_shifts():
            print("❌ Special shifts tests failed")
            return False
        
        # Test templates with labels
        if not self.test_shift_templates():
            print("❌ Template tests failed")
            return False
        
        # Test overtime in payroll
        if not self.test_overtime_in_payroll():
            print("❌ Overtime payroll tests failed")
            return False
        
        # Test radioscopy bonus
        if not self.test_radioscopy_bonus():
            print("❌ Radioscopy bonus tests failed")
            return False
        
        # Cleanup
        self.cleanup()
        
        # Print results
        print("\n" + "="*60)
        print("📊 TEST RESULTS")
        print("="*60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return True
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = SeguriTurnoAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())