"""
Refactoring Guide for all_trails App

This document outlines the refactoring needed to improve maintainability
of the all_trails application.
"""

# 1. API Layer Refactoring
"""
Current Issues:
- API methods in single file (api.py) are getting large
- Mixed responsibilities (infrastructure + business logic)
- Repetitive validation code

Refactoring Plan:
- Separate infrastructure concerns from business logic
- Create service layer for business operations
- Standardize error handling
"""

# Example refactored structure:
API_REFACTORING = {
    "current_structure": "all_trails/api.py (monolithic)",
    "proposed_structure": {
        "all_trails/api/": [
            "__init__.py",
            "infrastructure.py",  # Frontend serving, session management
            "trail_service.py",   # Trail-related business logic
            "booking_service.py", # Booking-related business logic
            "review_service.py",  # Review-related business logic
            "shop_service.py",    # Shop-related business logic
        ],
        "all_trails/services/": [
            "__init__.py",
            "trail_service.py",   # Core business logic
            "booking_service.py", # Core business logic
            "validation_service.py", # Shared validation
            "notification_service.py", # Shared notifications
        ]
    }
}

# 2. Service Layer Implementation
SERVICE_LAYER_EXAMPLE = '''
# all_trails/services/trail_service.py
import frappe
from frappe import _
from ..utils.validation import sanitize_input, validate_rating
from ..utils.cache import get_cached_result, set_cache_result, get_cache_key

class TrailService:
    """Service class for trail-related operations"""
    
    @staticmethod
    def get_trails(filters=None, page=1, page_size=10):
        """Get trails with caching and validation"""
        # Input validation
        if isinstance(filters, str):
            try:
                filters = frappe.parse_json(filters)
            except Exception:
                frappe.throw(_("Invalid filters format"), frappe.ValidationError)
        
        filters = filters or {}
        page = int(page) or 1
        page_size = int(page_size) or 10
        
        # Generate cache key
        cache_key = get_cache_key("get_trails", {
            "filters": filters,
            "page": page,
            "page_size": page_size
        })
        
        # Try to get from cache first
        cached_result = get_cached_result(cache_key)
        if cached_result:
            return cached_result
        
        # Apply filters with validation
        db_filters = {"status": "Active"}
        
        if filters.get("difficulty_level"):
            # Validate difficulty level
            valid_levels = ["Easy", "Moderate", "Hard", "Expert"]
            if filters.get("difficulty_level") in valid_levels:
                db_filters["difficulty_level"] = filters.get("difficulty_level")
                
        if filters.get("search"):
            db_filters["title"] = ["like", f"%{sanitize_input(filters.get('search'))}%"]
            
        if filters.get("min_price") or filters.get("max_price"):
            min_p = float(filters.get("min_price", 0))
            max_p = float(filters.get("max_price", 999999999))
            db_filters["price_kshs"] = ["between", [min_p, max_p]]
        
        # Execute query with pagination
        trails = frappe.get_list(
            "Trail",
            filters=db_filters,
            fields=["name", "title", "difficulty_level", "location", "distance_km", 
                    "duration_hours", "elevation_gain_m", "price_kshs", "scheduled_date", 
                    "max_capacity", "featured_image"],
            start=(page - 1) * page_size,
            page_length=page_size,
            order_by="scheduled_date asc"
        )
        
        # Enrich with available spots
        for trail in trails:
            trail_doc = frappe.get_doc("Trail", trail.name)
            trail.available_spots = trail_doc.get_available_spots()
            trail.id = trail.name
        
        total_count = frappe.db.count("Trail", filters=db_filters)
        
        result = {
            "data": trails,
            "total": total_count,
            "page": page,
            "page_size": page_size
        }
        
        # Cache the result
        set_cache_result(cache_key, result, cache_duration=300)  # 5 minutes
        
        return result
    
    @staticmethod
    def create_trail(trail_data):
        """Create a new trail with validation"""
        # Validate required fields
        required_fields = ["title", "difficulty_level", "location", "max_capacity", "price_kshs", "scheduled_date"]
        for field in required_fields:
            if not trail_data.get(field):
                frappe.throw(_(f"{field.replace('_', ' ').title()} is required"), frappe.ValidationError)
        
        # Validate difficulty level
        valid_levels = ["Easy", "Moderate", "Hard", "Expert"]
        if trail_data.get("difficulty_level") not in valid_levels:
            frappe.throw(_("Invalid difficulty level"), frappe.ValidationError)
        
        # Sanitize inputs
        trail_data["title"] = sanitize_input(trail_data["title"])
        trail_data["location"] = sanitize_input(trail_data["location"])
        
        # Create trail document
        trail_doc = frappe.get_doc({
            "doctype": "Trail",
            **trail_data
        })
        
        trail_doc.insert()
        
        # Invalidate related caches
        from ..utils.cache import invalidate_cache_pattern
        invalidate_cache_pattern("get_trails:*")
        
        return trail_doc

# all_trails/api/trail_service.py
from frappe import whitelist
from ..services.trail_service import TrailService
from ..utils.auth import require_authentication, require_roles

@whitelist(allow_guest=True)
def get_trails(filters=None, page=1, page_size=10):
    """Public API endpoint for getting trails"""
    return TrailService.get_trails(filters, page, page_size)

@whitelist()
@require_roles("System Manager", "All Trails Admin")
def create_trail(trail_data):
    """Admin API endpoint for creating trails"""
    if isinstance(trail_data, str):
        trail_data = frappe.parse_json(trail_data)
    
    return TrailService.create_trail(trail_data)
'''

# 3. Frontend Refactoring
FRONTEND_REFACTORING = {
    "current_issues": [
        "Large API service file (api.ts) with mixed concerns",
        "Repetitive error handling",
        "Lack of type safety in some areas",
        "No centralized error handling"
    ],
    "refactoring_plan": [
        "Separate API service into domain-specific services",
        "Create centralized error handling",
        "Improve type definitions",
        "Add request/response interceptors for common patterns"
    ]
}

# 4. Improved Error Handling
ERROR_HANDLING_EXAMPLE = '''
// frontend/src/services/errorHandler.ts
export class ApiErrorHandler {
  static handle(error: any): { message: string; type: string } {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      switch (status) {
        case 401:
          return { message: 'Session expired. Please log in.', type: 'AUTH_ERROR' };
        case 403:
          return { message: 'Access denied. Insufficient permissions.', type: 'PERMISSION_ERROR' };
        case 404:
          return { message: 'Resource not found.', type: 'NOT_FOUND_ERROR' };
        case 500:
          return { message: 'Server error. Please try again later.', type: 'SERVER_ERROR' };
        default:
          return { message, type: 'API_ERROR' };
      }
    } else if (error.request) {
      // Request made but no response
      return { message: 'Network error. Please check your connection.', type: 'NETWORK_ERROR' };
    } else {
      // Something else happened
      return { message: error.message, type: 'UNKNOWN_ERROR' };
    }
  }
}

// Updated API service with error handling
import { ApiErrorHandler } from './errorHandler';

// In the axios interceptor:
this.axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const handledError = ApiErrorHandler.handle(error);
    // Optionally show user-friendly message
    // ShowToast(handledError.message);
    return Promise.reject(handledError);
  }
);
'''

# 5. Component Structure Refactoring
COMPONENT_REFACTORING = '''
# Organize components by feature/domain rather than type
frontend/src/components/
├── auth/
│   ├── LoginForm.vue
│   ├── RegisterForm.vue
│   └── ProfileCard.vue
├── trails/
│   ├── TrailCard.vue
│   ├── TrailList.vue
│   ├── TrailDetails.vue
│   └── TrailFilter.vue
├── bookings/
│   ├── BookingForm.vue
│   ├── BookingCard.vue
│   └── BookingHistory.vue
├── reviews/
│   ├── ReviewForm.vue
│   ├── ReviewCard.vue
│   └── RatingDisplay.vue
└── shared/
    ├── Button.vue
    ├── Modal.vue
    ├── LoadingSpinner.vue
    └── ErrorMessage.vue
'''

# 6. Doctype Model Improvements
DOCTYPE_IMPROVEMENTS = '''
# all_trails/doctype/trail/trail.py
import frappe
from frappe import _
from frappe.model.document import Document
from ..utils.validation import validate_rating

class Trail(Document):
    """Enhanced Trail doctype with better validation and methods"""
    
    def validate(self):
        """Validate trail data"""
        self.validate_required_fields()
        self.validate_business_rules()
        self.validate_unique_constraints()
    
    def validate_required_fields(self):
        """Validate required fields"""
        required_fields = ["title", "difficulty_level", "location", "max_capacity", "price_kshs", "scheduled_date"]
        for field in required_fields:
            if not self.get(field):
                frappe.throw(_(f"{field.replace('_', ' ').title()} is required"), frappe.ValidationError)
    
    def validate_business_rules(self):
        """Validate business rules"""
        if self.max_capacity <= 0:
            frappe.throw(_("Max capacity must be greater than 0"), frappe.ValidationError)
        
        if self.price_kshs < 0:
            frappe.throw(_("Price cannot be negative"), frappe.ValidationError)
        
        valid_levels = ["Easy", "Moderate", "Hard", "Expert"]
        if self.difficulty_level not in valid_levels:
            frappe.throw(_("Invalid difficulty level"), frappe.ValidationError)
    
    def validate_unique_constraints(self):
        """Validate unique constraints"""
        # If updating, check if title is unique (excluding current doc)
        if self.is_new() or self.has_value_changed("title"):
            existing = frappe.db.exists("Trail", {
                "title": self.title,
                "name": ["!=", self.name] if not self.is_new() else ["!=", ""]
            })
            if existing:
                frappe.throw(_("A trail with this name already exists"), frappe.ValidationError)
    
    def get_available_spots(self):
        """Calculate available spots for this trail"""
        if not self.max_capacity:
            return 0
            
        # Get confirmed bookings for this trail
        confirmed_bookings = frappe.get_all(
            "Trail Booking",
            filters={
                "trail": self.name,
                "status": "Confirmed"
            },
            fields=["spots_booked"]
        )
        
        total_booked = sum(booking.spots_booked for booking in confirmed_booked)
        return max(0, self.max_capacity - total_booked)
    
    def before_save(self):
        """Operations to perform before saving"""
        # Invalidate related caches
        from ..utils.cache import invalidate_cache_pattern
        invalidate_cache_pattern(f"get_trail_*:{self.name}")
        invalidate_cache_pattern("get_trails:*")
'''

REFRACTORING_PRIORITIES = [
    "1. Separate API infrastructure from business logic",
    "2. Create service layer for business operations",
    "3. Standardize error handling across the application",
    "4. Improve type safety in frontend code",
    "5. Organize components by feature rather than type",
    "6. Add comprehensive validation at all levels",
    "7. Implement proper separation of concerns",
    "8. Create reusable utility functions"
]

IMPLEMENTATION_STEPS = [
    "Step 1: Create service layer modules",
    "Step 2: Move business logic from API endpoints to service layer",
    "Step 3: Update API endpoints to use service layer",
    "Step 4: Refactor frontend components and services",
    "Step 5: Add comprehensive error handling",
    "Step 6: Update tests to reflect new structure",
    "Step 7: Document the new architecture"
]