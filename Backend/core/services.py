# ============================================================================
# SERVICES: Reusable helper functions used by views
# Think of services as a "utility toolbox" - functions that many views need
# Instead of duplicating code in each view, we write it once here and reuse it
# Examples: PDF rendering, geocoding, filtering, time calculations
# ============================================================================

import requests, os, qrcode, base64
from io import BytesIO
from datetime import datetime, timedelta

from django.conf import settings
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Q, Value
from django.db.models.functions import Coalesce
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML

from .models import Report, PoliceOffice

# Load the API Key from settings (stored in environment variables for security)
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

def generate_qr_code_base64(text: str) -> str:
    """Generate a QR code (data URL) for any text/URL for printing in PDFs."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    base64_encoded_data = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{base64_encoded_data}"


# ============================================================================
# MEDIA UPLOAD LIMITS (Citizen uploads) - HARD CODED
# ============================================================================
#
# You requested these rules to be hardcoded so the backend still enforces them
# even if the .env is missing:
# - Max 3 images per report
# - Max 2 videos per report
# - Max 15MB per file
#

def get_media_limits():
    return {
        "max_images": 3,
        "max_videos": 2,
        "max_bytes": 15 * 1024 * 1024,
    }

# ============================================================================
# GEOLOCATION & NAVIGATION: Google Maps Integration
# ============================================================================

def generate_directions_and_qr(start_lat, start_lng, end_lat, end_lng):
    # FUNCTION: Generate navigation link + QR code for police officer
    # Input: Starting location (lat/lng), ending location (lat/lng)
    # Output: Dict with Google Maps URL and QR code image (Base64)
    # Used by: Views that handle report routing/navigation
    # Example: Police officer scans QR → opens Google Maps directions automatically
    
    # Validate: Google Maps API key must be configured
    if not GOOGLE_MAPS_API_KEY:
        raise ValueError("Google Maps API key is not configured.")

    # Step 1: Construct the Google Maps Directions URL
    # This link opens Google Maps with turn-by-turn directions
    # Format: https://www.google.com/maps/dir/START_LAT,START_LNG/END_LAT,END_LNG
    # This can be embedded in a QR code for easy mobile access
    maps_url = (
        f"https://www.google.com/maps/dir/{start_lat},{start_lng}/{end_lat},{end_lng}"
    )

    # Step 2: OPTIONAL - Call Google Directions API for ETA/Distance
    # NOTE: This would consume an API quota credit per request
    # Currently skipped; we just use the URL in the QR code
    # TODO: Add ETA calculation if budget allows

    qr_data_url = generate_qr_code_base64(maps_url)

    # Return all data needed for the frontend
    return {
        'directions_url': maps_url,  # Direct link to Google Maps
        'qr_code_base64': qr_data_url,  # QR code as an image
        # 'distance': 'X km', # TODO: Add distance from API call
        # 'duration': 'Y mins', # TODO: Add ETA from API call
    }



def _parse_address_components(results):
    """Extract city, barangay, and a simple address line (street + barangay).

    We prioritize:
    - Barangay: sublocality_level_2 > neighborhood > admin_area_level_4/5 > sublocality_level_1 (last resort)
    - City: locality > administrative_area_level_3 > administrative_area_level_2
    - Street line: street_number + route (or premise/point_of_interest)
    
    Note: sublocality_level_1 often returns districts in PH cities, so we deprioritize it.
    """

    city = None
    barangay = None
    barangay_fallback = None  # sublocality_level_1 as last resort
    street_number = None
    route = None
    premise = None
    poi = None

    if not results:
        return None, None, None

    # Search ALL results, not just the first one
    for result in results:
        for component in result.get('address_components', []):
            types = component.get('types', [])
            value = component.get('long_name')

            # Street pieces
            if 'street_number' in types and not street_number:
                street_number = value
            if 'route' in types and not route:
                route = value
            if ('premise' in types or 'subpremise' in types) and not premise:
                premise = value
            if 'point_of_interest' in types and not poi:
                poi = value

            # Barangay: prioritize more specific levels first
            if not barangay:
                if 'sublocality_level_2' in types or 'neighborhood' in types:
                    barangay = value
                elif 'administrative_area_level_4' in types or 'administrative_area_level_5' in types:
                    barangay = value
                elif 'sublocality_level_1' in types and not barangay_fallback:
                    # Store as fallback (might be district, not barangay)
                    barangay_fallback = value

            # City (prefer locality, then admin levels before province)
            if not city and ('locality' in types or 'administrative_area_level_3' in types):
                city = value
            if not city and 'administrative_area_level_2' in types:
                city = value

    # Use fallback only if we found nothing better
    if not barangay and barangay_fallback:
        barangay = barangay_fallback

    address_line = None
    if route or street_number:
        address_line = ' '.join(filter(None, [street_number, route])).strip()
    elif premise:
        address_line = premise
    elif poi:
        address_line = poi

    # Append barangay to make it explicit, avoid city/district here
    if address_line and barangay:
        address_line = f"{address_line}, {barangay}"

    return city, barangay, address_line


def _call_geocode_api(latitude, longitude):
    api_key = GOOGLE_MAPS_API_KEY
    if not api_key:
        return None
    if latitude is None or longitude is None:
        return None
    try:
        lat = float(latitude)
        lng = float(longitude)
    except Exception:
        return None
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {'latlng': f'{lat},{lng}', 'key': api_key}
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Geocoding error: {e}")
        return None


def reverse_geocode(latitude, longitude):
    """Return (city, barangay) from coordinates, biased to barangay not district."""
    data = _call_geocode_api(latitude, longitude)
    if not data or not data.get('results'):
        return None, None
    city, barangay, _ = _parse_address_components(data['results'])
    return city, barangay


def reverse_geocode_address(latitude, longitude):
    """Return (address_line, barangay, city) for checkpoints and UI display."""
    data = _call_geocode_api(latitude, longitude)
    if not data or not data.get('results'):
        return None, None, None
    city, barangay, address_line = _parse_address_components(data['results'])
    return address_line, barangay, city


# ============================================================================
# LOCATION UTILS: Distance and nearest office assignment
# ============================================================================

def haversine_km(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, sqrt, asin
    R = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return R * c


def find_nearest_office(latitude, longitude, offices=None):
    try:
        lat = float(latitude)
        lng = float(longitude)
    except Exception:
        return None

    if offices is None:
        offices = list(PoliceOffice.objects.all())
    if not offices:
        return None

    nearest = None
    best_dist = None
    for office in offices:
        try:
            d = haversine_km(lat, lng, float(office.latitude), float(office.longitude))
        except Exception:
            continue
        if best_dist is None or d < best_dist:
            best_dist = d
            nearest = office
    return nearest


def assign_nearest_office_for_unassigned():
    offices = list(PoliceOffice.objects.all())
    if not offices:
        return
    unassigned = Report.objects.filter(assigned_office__isnull=True)
    for r in unassigned:
        office = find_nearest_office(r.latitude, r.longitude, offices)
        if office:
            r.assigned_office = office
            r.save(update_fields=['assigned_office'])


def get_active_checkpoints_list(all_checkpoints_qs):
    # FUNCTION: Filter checkpoints to show only those currently active
    # Input: QuerySet of all checkpoints from database
    # Output: Python list of checkpoint objects that are active RIGHT NOW
    # Used by: Views that show current/active checkpoints on map
    # Logic: Compares current time to checkpoint's time_start and time_end
    
    # Get the current time (hour:minute:second)
    current_time = datetime.now().time()
    active_list = []

    # Check each checkpoint to see if it's currently active
    for checkpoint in all_checkpoints_qs:
        start = checkpoint.time_start
        end = checkpoint.time_end

        # Skip checkpoints without proper time settings
        if start is None or end is None:
            continue

        # CASE 1: Normal shift (e.g., 6:00 AM to 2:00 PM)
        # start < end means the shift is within the same day
        if start < end:
            # Active if current time is between start and end
            # Example: start=06:00, current=09:00, end=14:00 → ACTIVE
            if start <= current_time < end:
                active_list.append(checkpoint)

        # CASE 2: Overnight shift (e.g., 8:00 PM to 4:00 AM next day)
        # start > end means the shift crosses midnight
        else:
            # Active if: NOW is after start (before midnight) OR NOW is before end (after midnight)
            # Example: start=20:00, current=22:00, end=04:00 → ACTIVE (after 20:00)
            # Example: start=20:00, current=02:00, end=04:00 → ACTIVE (before 04:00)
            # Example: start=20:00, current=12:00, end=04:00 → NOT ACTIVE (middle of day)
            if current_time >= start or current_time < end:
                active_list.append(checkpoint)

    return active_list



# ============================================================================
# ANALYTICS HELPERS: Data aggregation and filtering utilities
# Used by analytics endpoints to calculate crime statistics
# These functions handle: filtering, grouping, calculating percentages
# ============================================================================

def parse_filters(request):
    # FUNCTION: Extract and validate filter parameters from request
    # Input: HTTP request object with query parameters
    # Output: Dict with normalized filter values (days, scope, office_id, city, barangay, category)
    # Used by: All analytics endpoints to apply consistent filtering
    
    # Extract query parameters from URL (?days=30&scope=all&category=Robbery)
    # Provide default values if not specified
    # days:
    # - Default: last 30 days
    # - Special: days=0 means "all time" (no date cutoff)
    days = int(request.query_params.get('days', 30))
    scope = (request.query_params.get('scope') or 'all').lower()  # Default: all offices
    office_id = request.query_params.get('office_id')  # Office filter (UUID)
    city = request.query_params.get('city')  # City filter
    barangay = request.query_params.get('barangay')  # Barangay filter
    category = request.query_params.get('category')  # Crime category filter

    # Normalize category: treat 'all' as None (means show all categories)
    if category and category.lower() == 'all':
        category = None

    # Calculate the start date for the time range filter
    # Example: days=30 → since = today - 30 days
    since = None if days == 0 else (timezone.now() - timedelta(days=days))
    
    # Return a dict with all filters organized
    return {
        'days': days,  # Number of days to look back
        'since': since,  # Actual datetime cutoff
        'scope': scope,  # 'all' or 'our_office'
        'office_id': office_id,  # Specific office UUID or None
        'city': city,  # Specific city or None
        'barangay': barangay,  # Specific barangay or None
        'category': category,  # Specific crime type or None
    }



def apply_common_filters(qs, f):
    # FUNCTION: Apply all parsed filters to a queryset
    # Input: Django QuerySet, filter dict from parse_filters()
    # Output: Filtered QuerySet with only matching reports
    # Used by: All analytics views to apply consistent filtering logic
    # Example: start with all reports → filter by date → filter by location
    
    # FILTER 1: Date range (reports created since the cutoff date)
    # Example: only show reports from the last 30 days
    if f.get('since') is not None:
        qs = qs.filter(created_at__gte=f['since'])

    # FILTER 2: Location (city and optionally barangay)
    # Case-insensitive matching ("manila" matches "Manila")
    if f['city']:
        qs = qs.filter(location_city__iexact=f['city'])
        # If barangay is also specified, add that filter too
        if f['barangay']:
            qs = qs.filter(location_barangay__iexact=f['barangay'])

    # FILTER 3: Crime category
    # Example: show only "Robbery" reports, case-insensitive
    if f['category']:
        qs = qs.filter(category__iexact=f['category'])

    # Return the filtered queryset
    # Can be used directly or filtered further by the calling view
    return qs


def apply_resolved_date_filter(qs, since):
    """Filter resolved reports by 'resolved date' instead of 'created date'.

    We consider updated_at as the resolved timestamp. If updated_at is missing
    (older/stale rows), we fall back to created_at.
    """
    if since is None:
        return qs
    return qs.filter(
        Q(updated_at__gte=since) |
        Q(updated_at__isnull=True, created_at__gte=since)
    )



def format_duration(delta):
    # FUNCTION: Convert timedelta to human-readable format
    # Input: timedelta object (difference between two times)
    # Output: Formatted string like "2d 03:45:30" or "N/A"
    # Used by: Report views to display resolution time in readable format
    # Example: timedelta(days=2, seconds=13530) → "2d 03:45:30"
    
    # Handle missing data (None means time wasn't calculated)
    if not delta:
        return "N/A"
    
    # Convert timedelta to total seconds (easier to do math with)
    total_seconds = int(delta.total_seconds())
    
    # Calculate days, hours, minutes, seconds from total seconds
    days = total_seconds // 86400  # 86400 seconds in a day
    rem = total_seconds % 86400  # Remaining seconds after extracting days
    h, m, s = rem // 3600, (rem % 3600) // 60, rem % 60  # Extract h:m:s
    
    # Format as string: "2d 03:45:30" (only show days if > 0)
    return (f"{days}d " if days else "") + f"{h:02d}:{m:02d}:{s:02d}"



def compute_avg_resolution(qs):
    # FUNCTION: Calculate average time from report submission to resolution
    # Input: QuerySet of resolved reports (must have updated_at and created_at)
    # Output: Formatted string like "2d 03:45:30" or "N/A"
    # Used by: Analytics views to show average resolution time in dashboard
    # Example: 100 reports, avg resolution time = 2 days 3 hours 45 minutes
    
    # Use Django's database annotation to calculate resolution time for each report
    # ExpressionWrapper = run calculation in the database (efficient!)
    # F('updated_at') - F('created_at') = time difference
    resolution_delta = ExpressionWrapper(F('updated_at') - F('created_at'), output_field=DurationField())
    
    # Annotate each report with its resolution time, then aggregate the average
    # aggregate(avg=Avg('res_time')) = calculate the average of all resolution times
    avg_res = qs.annotate(res_time=resolution_delta).aggregate(avg=Avg('res_time'))['avg']
    
    # Convert the average duration to a readable format
    # format_duration handles None gracefully if no reports exist
    return format_duration(avg_res)



def build_top_locations(base_qs, f):
    # FUNCTION: Find top 3-5 locations with highest crime counts
    # Input: Base QuerySet and filter dict from parse_filters()
    # Output: Dict with {results: [...locations...], total_resolved: count}
    # Used by: Analytics views to show "where do crimes happen most?"
    # Example: {Manila/Tondo: 50 reports (30%), Manila/Intramuros: 35 reports (21%), ...}
    
    # Apply all filters to get matching resolved reports (used for top locations table)
    # NOTE: Use status__iexact to tolerate DB rows edited manually (case differences).
    resolved_qs = base_qs.filter(status__iexact='Resolved')
    base = apply_common_filters(resolved_qs, f)
    # Use "resolved date" filtering instead of created_at for resolved analytics
    base = apply_resolved_date_filter(base, f.get('since'))
    total = base.count()  # Total number of matching reports

    # Filter dropdown options should not shrink when a city is selected.
    # So we compute "available cities" from the same resolved dataset, but with city/barangay removed.
    # This provides a stable list of all cities for the current (days/category/scope) filters.
    f_for_options = dict(f)
    f_for_options['city'] = None
    f_for_options['barangay'] = None
    base_for_options = apply_common_filters(resolved_qs, f_for_options)
    base_for_options = apply_resolved_date_filter(base_for_options, f_for_options.get('since'))
    available_cities = list(
        base_for_options.values_list('location_city', flat=True)
        .exclude(location_city__isnull=True)
        .exclude(location_city__exact='')
        .distinct()
        .order_by('location_city')[:100]
    )
    available_barangays = []
    if f.get('city'):
        available_barangays = list(
            base_for_options.filter(location_city__iexact=f['city'])
            .values_list('location_barangay', flat=True)
            .exclude(location_barangay__isnull=True)
            .exclude(location_barangay__exact='')
            .distinct()
            .order_by('location_barangay')[:200]
        )

    # Branch 1: If NO city is specified, group by city/barangay (show locations)
    if not f['city']:
        # Group reports by location, count how many in each location
        # Example: {Manila/Tondo: 50, Manila/Intramuros: 35, ...}
        # NOTE: We return all locations (capped for safety).
        qs = base.values('location_city', 'location_barangay').annotate(report_count=Count('report_id')).order_by('-report_count', 'location_city', 'location_barangay')[:200]
        items = list(qs)
    
    # Branch 2: If city is specified but NO barangay, still group by location
    # (but results will be filtered to that city only)
    elif f['city'] and not f['barangay']:
        qs = base.values('location_city', 'location_barangay').annotate(report_count=Count('report_id')).order_by('-report_count', 'location_city', 'location_barangay')[:200]
        items = list(qs)
    
    # Branch 3: If both city AND barangay are specified, show that specific location
    # (no grouping needed, all reports are already from that location)
    else:
        count = base.count()
        items = [{
            'location_city': f['city'],
            'location_barangay': f['barangay'],
            'report_count': count
        }]

    # Calculate percentage for each location
    # Example: 50 out of 100 reports = 50%
    for i in items:
        i['report_percent'] = (i['report_count'] / total * 100.0) if total else 0.0

    # Return the data structure that views expect
    return {
        'filters': {k: (str(v) if v is not None else None) for k, v in f.items()},
        'total_resolved': total,  # Total number of matching reports
        'results': items,  # List of locations with counts and percentages
        'available_cities': available_cities,
        'available_barangays': available_barangays,
    }



def build_category_concentration(base_qs, f):
    # FUNCTION: Find top 2-5 crime categories with highest counts
    # Input: Base QuerySet and filter dict from parse_filters()
    # Output: Dict with {results: [...categories...], total_resolved: count}
    # Used by: Analytics views to show "which crimes are most common?"
    # Example: {Robbery: 85 reports (50%), Theft: 60 reports (35%), ...}
    
    # Apply all filters to get matching resolved reports
    resolved_qs = base_qs.filter(status__iexact='Resolved')
    base = apply_common_filters(resolved_qs, f)
    base = apply_resolved_date_filter(base, f.get('since'))
    total = base.count()  # Total number of matching reports

    # Branch 1: If NO specific category is specified, group by category (show top ones)
    if not f['category']:
        # Group reports by crime type, count how many in each category
        # Example: {Robbery: 85, Theft: 60, ...}
        # NOTE: We return all categories (capped for safety).
        qs = base.values('category').annotate(report_count=Count('report_id')).order_by('-report_count', 'category')[:50]
        results = []
        for row in qs:
            pct = (row['report_count'] / total * 100.0) if total else 0.0
            results.append({
                'category': row['category'],
                'report_count': row['report_count'],
                'percentage': pct
            })
    
    # Branch 2: If a specific category is specified, show just that category
    # (no grouping needed, all reports are already of that type)
    else:
        count = base.count()
        pct = (count / total * 100.0) if total else 0.0
        results = [{
            'category': f['category'],
            'report_count': count,
            'percentage': pct
        }]

    # Return the data structure that views expect
    return {
        'filters': {k: (str(v) if v is not None else None) for k, v in f.items()},
        'total_resolved': total,  # Total number of matching reports
        'results': results,  # List of categories with counts and percentages
    }



# ============================================================================
# PDF & UTILITY HELPERS: Document generation and formatting
# Used by views to generate PDFs and format data for display
# ============================================================================

def render_pdf(template_name, context, base_url):
    # FUNCTION: Convert Django HTML template to PDF file
    # Input: template_name (e.g., "report_crime_deep_dive.html"), context data, base URL
    # Output: Binary PDF data (bytes) ready to send to browser
    # Used by: All export views to generate downloadable/viewable PDFs
    # How it works: Render template to HTML → convert HTML to PDF using WeasyPrint
    
    # Step 1: Render the Django template with the context data
    # This converts a .html template + Python dict → HTML string
    html = render_to_string(template_name, context)
    
    # Step 2: Convert HTML to PDF using WeasyPrint library
    # HTML() parses the HTML, write_pdf() generates PDF bytes
    # base_url is needed for resolving CSS/image paths in the template
    return HTML(string=html, base_url=base_url).write_pdf()



def short_uuid(uuid_str, start=5, end=5):
    # FUNCTION: Abbreviate UUID for display in tables/PDFs
    # Input: UUID string (e.g., "a1b2c3d4-e5f6-7890-1234-567890abcdef")
    # Output: Shortened version (e.g., "a1b2c...90abc" using default start=5, end=5)
    # Used by: PDF templates to show UUIDs in a readable table format
    # Why? Full UUID is long; abbreviating helps fit in narrow columns
    
    # Handle empty/None input
    if not uuid_str:
        return ""
    
    # Take first N characters, add "...", add last N characters
    # Example: "abcde12345...XYZ99" (first 5 + last 5)
    return f"{uuid_str[:start]}...{uuid_str[-end:]}"



def build_analytics_filename(f):
    # FUNCTION: Generate descriptive filename for analytics PDF export
    # Input: Filter dict from parse_filters()
    # Output: String like "analytics_30days_all_offices_robbery_manila.pdf"
    # Used by: AnalyticsExportAPIView to set the PDF filename
    # Why? Users can understand what the file contains from the name
    
    # Start with base name including time range
    parts = [f"analytics_{f['days']}days"]
    
    # Add scope (our_office vs all_offices)
    parts.append('our_office' if f['scope'] == 'our_office' else 'all_offices')
    
    # Add category if filtered by a specific crime type
    if f['category']:
        parts.append(f['category'].replace(' ', '_').lower())
    
    # Add city if filtered by a specific location
    if f['city']:
        parts.append(f['city'].replace(' ', '_').lower())
    
    # Combine with underscores and .pdf extension
    # Result: "analytics_30days_our_office_robbery_manila.pdf"
    return '_'.join(parts) + '.pdf'


def build_resolved_filename(f):
    # FUNCTION: Generate descriptive filename for resolved cases PDF export
    # Input: Filter dict from parse_filters()
    # Output: String like "resolved_cases_30days_all_offices.pdf"
    # Used by: ResolvedCasesExportAPIView to set the PDF filename
    # Similar to build_analytics_filename but for resolved cases reports
    
    # Start with base name including time range
    parts = [f"resolved_cases_{f['days']}days"]
    
    # Add scope (our_office vs all_offices)
    parts.append('our_office' if f['scope'] == 'our_office' else 'all_offices')
    
    # Add category if filtered by a specific crime type
    if f['category']:
        parts.append(f['category'].replace(' ', '_').lower())
    
    # Add city if filtered by a specific location
    if f['city']:
        parts.append(f['city'].replace(' ', '_').lower())
    
    # Combine with underscores and .pdf extension
    # Result: "resolved_cases_30days_all_offices.pdf"
    return '_'.join(parts) + '.pdf'