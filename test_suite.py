import unittest
import frappe
from frappe.tests.utils import FrappeTestCase
from all_trails.api import get_trails, create_booking, get_user_bookings
from all_trails.utils.validation import validate_email, validate_phone_number, sanitize_input, validate_rating

class TestTrailAPI(FrappeTestCase):
    """Test cases for Trail API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        frappe.set_user("Administrator")
        
    def test_get_trails_returns_data(self):
        """Test that get_trails returns data"""
        result = get_trails()
        self.assertIn("data", result)
        self.assertIn("total", result)
        
    def test_get_trails_with_filters(self):
        """Test get_trails with filters"""
        filters = {"difficulty_level": "Easy"}
        result = get_trails(filters=filters)
        self.assertIn("data", result)
        
    def test_get_trails_pagination(self):
        """Test get_trails with pagination"""
        result = get_trails(page=1, page_size=5)
        self.assertIn("data", result)
        self.assertEqual(result["page"], 1)
        self.assertEqual(result["page_size"], 5)

class TestBookingAPI(FrappeTestCase):
    """Test cases for Booking API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        frappe.set_user("Administrator")
        
    def test_create_booking_valid_data(self):
        """Test creating a booking with valid data"""
        # This would require a valid trail to exist
        pass
        
    def test_get_user_bookings(self):
        """Test retrieving user bookings"""
        result = get_user_bookings()
        self.assertIsInstance(result, list)

class TestValidationUtils(FrappeTestCase):
    """Test cases for validation utilities"""
    
    def test_validate_email_valid(self):
        """Test email validation with valid email"""
        try:
            validate_email("test@example.com")
            self.assertTrue(True)  # If no exception is raised
        except:
            self.fail("Valid email should not raise an exception")
    
    def test_validate_email_invalid(self):
        """Test email validation with invalid email"""
        with self.assertRaises(Exception):
            validate_email("invalid-email")
    
    def test_validate_phone_number_valid(self):
        """Test phone number validation with valid number"""
        try:
            validate_phone_number("+254712345678")
            self.assertTrue(True)  # If no exception is raised
        except:
            self.fail("Valid phone number should not raise an exception")
    
    def test_validate_phone_number_invalid(self):
        """Test phone number validation with invalid number"""
        with self.assertRaises(Exception):
            validate_phone_number("invalid-phone")
    
    def test_sanitize_input(self):
        """Test input sanitization"""
        malicious_input = "<script>alert('xss')</script>Hello"
        sanitized = sanitize_input(malicious_input)
        self.assertNotIn("<script>", sanitized)
        self.assertIn("Hello", sanitized)
    
    def test_validate_rating_valid(self):
        """Test rating validation with valid rating"""
        result = validate_rating(5)
        self.assertEqual(result, 5)
    
    def test_validate_rating_invalid(self):
        """Test rating validation with invalid rating"""
        with self.assertRaises(Exception):
            validate_rating(10)

class TestCacheUtils(FrappeTestCase):
    """Test cases for caching utilities"""
    
    def test_cache_operations(self):
        """Test basic cache operations"""
        from frappe_devsecops_dashboard.cache_utils import get_cache_key, get_cached_result, set_cache_result
        
        cache_key = get_cache_key("test_endpoint", {"param": "value"})
        self.assertIsInstance(cache_key, str)
        
        # Test setting and getting cache
        test_data = {"test": "data"}
        set_cache_result(cache_key, test_data)
        cached_result = get_cached_result(cache_key)
        self.assertEqual(cached_result, test_data)

def test_suite():
    """Create and return test suite"""
    suite = unittest.TestSuite()
    
    # Add all test cases
    suite.addTest(unittest.makeSuite(TestTrailAPI))
    suite.addTest(unittest.makeSuite(TestBookingAPI))
    suite.addTest(unittest.makeSuite(TestValidationUtils))
    suite.addTest(unittest.makeSuite(TestCacheUtils))
    
    return suite

if __name__ == '__main__':
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(test_suite())