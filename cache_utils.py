import frappe
import json
from frappe.utils import cint

def get_cache_key(endpoint, params=None):
    """Generate cache key for API endpoint"""
    key_parts = [endpoint]
    if params:
        # Sort params to ensure consistent key
        sorted_params = sorted(params.items()) if isinstance(params, dict) else params
        key_parts.append(json.dumps(sorted_params, sort_keys=True))
    return ":".join(key_parts)

def get_cached_result(cache_key, cache_duration=300):  # 5 minutes default
    """Get cached result if available"""
    try:
        cached = frappe.cache().get_value(cache_key)
        if cached:
            return cached
    except Exception:
        pass
    return None

def set_cache_result(cache_key, result, cache_duration=300):
    """Set result in cache"""
    try:
        frappe.cache().set_value(cache_key, result, expires_in_sec=cache_duration)
    except Exception:
        pass  # Fail silently to not break functionality

def invalidate_cache_pattern(pattern):
    """Invalidate cache entries matching a pattern"""
    try:
        frappe.cache().delete_keys(pattern)
    except Exception:
        pass  # Fail silently

def invalidate_trail_cache(trail_id):
    """Invalidate cache for specific trail"""
    invalidate_cache_pattern(f"get_trail_detail:{trail_id}")

def invalidate_user_cache(user):
    """Invalidate cache for specific user"""
    invalidate_cache_pattern(f"get_user_*:{user}")