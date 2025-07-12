#!/usr/bin/env python3

import requests
import sys
import json
import io
from datetime import datetime
import time

class SkillSwapAPITester:
    def __init__(self, base_url="https://adc5dad1-a87a-4d86-99f0-a09888a9987b.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_users = []
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
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
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}")
                except:
                    self.log(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!",
            "location": "Test City",
            "skills_offered": ["JavaScript", "React"],
            "skills_wanted": ["Python", "Data Science"],
            "availability": "Weekends",
            "is_public": True
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.test_users.append(user_data)
            return True
        return False

    def test_user_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user profile"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success and 'id' in response:
            self.user_id = response['id']
            self.log(f"   User ID: {self.user_id}")
            return True
        return False

    def test_get_all_users(self):
        """Test getting all public users"""
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200
        )
        
        if success:
            self.log(f"   Found {len(response)} users")
            return True
        return False

    def test_search_users_by_skill(self, skill="JavaScript"):
        """Test searching users by skill"""
        success, response = self.run_test(
            f"Search Users by Skill ({skill})",
            "GET",
            f"users/search/{skill}",
            200
        )
        
        if success:
            self.log(f"   Found {len(response)} users with skill '{skill}'")
            return True
        return False

    def test_create_second_user(self):
        """Create a second user for swap request testing"""
        timestamp = int(time.time()) + 1
        user_data = {
            "name": f"Second User {timestamp}",
            "email": f"second{timestamp}@example.com",
            "password": "TestPass123!",
            "location": "Another City",
            "skills_offered": ["Python", "Data Science"],
            "skills_wanted": ["JavaScript", "React"],
            "availability": "Evenings",
            "is_public": True
        }
        
        success, response = self.run_test(
            "Create Second User",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success:
            self.test_users.append(user_data)
            return response.get('access_token'), user_data
        return None, None

    def test_swap_request_flow(self):
        """Test the complete swap request flow"""
        # Create second user
        second_token, second_user_data = self.test_create_second_user()
        if not second_token:
            return False

        # Login as second user to get their ID
        original_token = self.token
        self.token = second_token
        
        success, second_user_profile = self.run_test(
            "Get Second User Profile",
            "GET",
            "auth/me",
            200
        )
        
        if not success:
            return False
            
        second_user_id = second_user_profile['id']
        
        # Switch back to first user
        self.token = original_token
        
        # Create swap request
        swap_data = {
            "target_user_id": second_user_id,
            "requested_skill": "Python",
            "offered_skill": "JavaScript",
            "message": "Would love to learn Python from you!"
        }
        
        success, swap_response = self.run_test(
            "Create Swap Request",
            "POST",
            "swap-requests",
            200,
            data=swap_data
        )
        
        if not success:
            return False
            
        swap_request_id = swap_response['id']
        
        # Test getting my requests
        success, my_requests = self.run_test(
            "Get My Requests",
            "GET",
            "swap-requests/my-requests",
            200
        )
        
        if success:
            self.log(f"   Found {len(my_requests)} outgoing requests")
        
        # Switch to second user and test incoming requests
        self.token = second_token
        
        success, incoming_requests = self.run_test(
            "Get Incoming Requests",
            "GET",
            "swap-requests/incoming",
            200
        )
        
        if success:
            self.log(f"   Found {len(incoming_requests)} incoming requests")
        
        # Accept the swap request
        success, _ = self.run_test(
            "Accept Swap Request",
            "PUT",
            f"swap-requests/{swap_request_id}",
            200,
            data={"status": "accepted"}
        )
        
        # Mark as completed
        if success:
            success, _ = self.run_test(
                "Mark Swap as Completed",
                "PUT",
                f"swap-requests/{swap_request_id}",
                200,
                data={"status": "completed"}
            )
        
        # Switch back to first user and test deletion (should fail since it's completed)
        self.token = original_token
        
        # This should fail since request is completed
        success, _ = self.run_test(
            "Try to Delete Completed Request (should fail)",
            "DELETE",
            f"swap-requests/{swap_request_id}",
            403  # Should fail
        )
        
        return True

    def test_error_cases(self):
        """Test various error cases"""
        # Test registration with existing email
        if self.test_users:
            existing_user = self.test_users[0]
            success, _ = self.run_test(
                "Register with Existing Email (should fail)",
                "POST",
                "auth/register",
                400,
                data=existing_user
            )
        
        # Test login with wrong password
        if self.test_users:
            wrong_login = {
                "email": self.test_users[0]["email"],
                "password": "WrongPassword123!"
            }
            success, _ = self.run_test(
                "Login with Wrong Password (should fail)",
                "POST",
                "auth/login",
                401,
                data=wrong_login
            )
        
        # Test accessing protected endpoint without token
        original_token = self.token
        self.token = None
        
        success, _ = self.run_test(
            "Access Protected Endpoint Without Token (should fail)",
            "GET",
            "auth/me",
            401
        )
        
        self.token = original_token
        
        return True

    def test_profile_photo_upload(self):
        """Test profile photo upload functionality"""
        # Create a simple test image file in memory
        try:
            from PIL import Image
        except ImportError:
            # If PIL is not available, create a simple fake image
            self.log("⚠️  PIL not available, creating fake image data")
            fake_image_data = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xaa\xff\xd9'
            img_bytes = io.BytesIO(fake_image_data)
        else:
            # Create a simple test image
            img = Image.new('RGB', (100, 100), color='red')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
        
        # Test photo upload
        files = {'file': ('test_photo.jpg', img_bytes, 'image/jpeg')}
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            url = f"{self.base_url}/users/upload-photo"
            response = requests.post(url, files=files, headers=headers, timeout=10)
            
            self.tests_run += 1
            if response.status_code == 200:
                self.tests_passed += 1
                self.log("✅ Profile Photo Upload - Status: 200")
                try:
                    result = response.json()
                    if 'photo_url' in result:
                        self.log(f"   Photo URL: {result['photo_url']}")
                        return True
                except:
                    pass
            else:
                self.log(f"❌ Profile Photo Upload - Expected 200, got {response.status_code}")
                self.log(f"   Response: {response.text}")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ Profile Photo Upload - Error: {str(e)}")
        
        return False

    def test_profile_update(self):
        """Test profile update functionality"""
        update_data = {
            "name": "Updated Test User",
            "location": "Updated City",
            "bio": "This is my updated bio",
            "skills_offered": ["JavaScript", "React", "Node.js"],
            "skills_wanted": ["Python", "Machine Learning"],
            "availability": "Weekdays and weekends",
            "is_public": True
        }
        
        success, response = self.run_test(
            "Update User Profile",
            "PUT",
            "users/me",
            200,
            data=update_data
        )
        
        if success:
            self.log(f"   Updated user name: {response.get('name', 'N/A')}")
            return True
        return False

    def test_enhanced_user_profile(self):
        """Test enhanced user profile endpoint that returns UserProfile with ratings"""
        if not self.user_id:
            return False
            
        success, response = self.run_test(
            "Get Enhanced User Profile",
            "GET",
            f"users/{self.user_id}",
            200
        )
        
        if success:
            # Check if response has the expected UserProfile structure
            if 'user' in response and 'ratings' in response and 'recent_swaps' in response:
                self.log("   ✅ Enhanced profile structure confirmed")
                self.log(f"   User: {response['user'].get('name', 'N/A')}")
                self.log(f"   Ratings count: {len(response['ratings'])}")
                self.log(f"   Recent swaps count: {len(response['recent_swaps'])}")
                return True
            else:
                self.log("   ❌ Missing expected UserProfile structure")
        return False

    def test_file_serving(self):
        """Test if uploaded files can be served"""
        # This test assumes a photo was uploaded in previous test
        # We'll test the /uploads/ endpoint
        try:
            # Test accessing uploads directory (should return 404 for non-existent file)
            base_url = self.base_url.replace('/api', '')  # Remove /api prefix for static files
            url = f"{base_url}/uploads/nonexistent.jpg"
            response = requests.get(url, timeout=10)
            
            self.tests_run += 1
            # We expect 404 for non-existent file, which means the endpoint is working
            if response.status_code == 404:
                self.tests_passed += 1
                self.log("✅ File Serving Endpoint - Status: 404 (expected for non-existent file)")
                return True
            else:
                self.log(f"❌ File Serving Endpoint - Expected 404, got {response.status_code}")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ File Serving Endpoint - Error: {str(e)}")
        
        return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting Skill Swap Platform API Tests")
        self.log(f"📡 Testing against: {self.base_url}")
        
        # Test user registration and authentication
        if not self.test_user_registration():
            self.log("❌ Registration failed, stopping tests")
            return False
            
        if not self.test_get_current_user():
            self.log("❌ Get current user failed")
            return False
        
        # Test user endpoints
        self.test_get_all_users()
        self.test_search_users_by_skill("JavaScript")
        self.test_search_users_by_skill("Python")
        
        # Test swap request flow
        self.test_swap_request_flow()
        
        # Test error cases
        self.test_error_cases()
        
        # Print final results
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!")
            return True
        else:
            self.log(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = SkillSwapAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())