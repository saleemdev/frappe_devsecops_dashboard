"""
Database Optimization Script for all_trails App

This script outlines the necessary database indexes to improve query performance
"""

# SQL commands to add indexes for better performance
DATABASE_INDEXES = [
    # For Trail table
    "ALTER TABLE `tabTrail` ADD INDEX idx_status_scheduled_date (`status`, `scheduled_date`);",
    "ALTER TABLE `tabTrail` ADD INDEX idx_difficulty_location (`difficulty_level`, `location`);",
    "ALTER TABLE `tabTrail` ADD INDEX idx_price (`price_kshs`);",
    
    # For Trail Booking table  
    "ALTER TABLE `tabTrail Booking` ADD INDEX idx_user_status (`user`, `status`);",
    "ALTER TABLE `tabTrail Booking` ADD INDEX idx_trail_status (`trail`, `status`);",
    "ALTER TABLE `tabTrail Booking` ADD INDEX idx_booking_date (`booking_date`);",
    
    # For Trail Review table
    "ALTER TABLE `tabTrail Review` ADD INDEX idx_trail_status_rating (`trail`, `status`, `rating`);",
    "ALTER TABLE `tabTrail Review` ADD INDEX idx_user_booking (`user`, `booking`);",
    "ALTER TABLE `tabTrail Review` ADD INDEX idx_created (`creation`);",
    
    # For Shop Item table
    "ALTER TABLE `tabShop Item` ADD INDEX idx_category_status (`category`, `is_active`);",
    "ALTER TABLE `tabShop Item` ADD INDEX idx_price_status (`price_kshs`, `is_active`);",
    
    # For Shop Order table
    "ALTER TABLE `tabShop Order` ADD INDEX idx_customer_status (`customer`, `status`);",
    "ALTER TABLE `tabShop Order` ADD INDEX idx_order_date (`order_date`);"
]

# Optimized queries for common operations
OPTIMIZED_QUERIES = {
    "get_trails": """
        SELECT name, title, difficulty_level, location, distance_km, 
               duration_hours, elevation_gain_m, price_kshs, scheduled_date, 
               max_capacity, featured_image
        FROM `tabTrail`
        WHERE status = %(status)s
        AND (%(difficulty_level)s IS NULL OR difficulty_level = %(difficulty_level)s)
        AND (%(location)s IS NULL OR location LIKE %(location_pattern)s)
        AND (%(min_price)s IS NULL OR price_kshs >= %(min_price)s)
        AND (%(max_price)s IS NULL OR price_kshs <= %(max_price)s)
        ORDER BY scheduled_date ASC
        LIMIT %(start)s, %(page_size)s
    """,
    
    "get_user_bookings": """
        SELECT name, user, trail, booking_date, status, spots_booked, 
               total_price, payment_status, confirmation_code
        FROM `tabTrail Booking`
        WHERE user = %(user)s
        AND (%(status)s IS NULL OR status = %(status)s)
        ORDER BY booking_date DESC
        LIMIT %(start)s, %(page_size)s
    """,
    
    "get_trail_reviews": """
        SELECT name, trail, user, rating, review_text, status, creation
        FROM `tabTrail Review`
        WHERE trail = %(trail)s
        AND status = 'Published'
        ORDER BY creation DESC
        LIMIT %(start)s, %(page_size)s
    """
}

def get_indexes_sql():
    """Return SQL commands to create all necessary indexes"""
    return "\n".join(DATABASE_INDEXES)

def get_optimized_query(query_name):
    """Return optimized query for specific operation"""
    return OPTIMIZED_QUERIES.get(query_name, "")

# Instructions for implementation
IMPLEMENTATION_NOTES = """
To implement these optimizations:

1. Execute the database index commands during the next maintenance window
2. Update the API methods to use the optimized queries
3. Monitor query performance after implementation
4. Adjust indexes based on actual usage patterns
"""