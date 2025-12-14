# ============================================================================
# ANALYTICS VIEWS: Complex data aggregation endpoints
# Used to generate statistics and PDF reports for the analytics dashboard
# Each view calculates different aspects of crime data (overview, hotspots, etc.)
# ============================================================================

import uuid as uuid_module

from django.http import HttpResponse
from django.utils import timezone
from django.db.models import F, DurationField, ExpressionWrapper, Avg
from rest_framework.views import APIView
from rest_framework.response import Response

from ..models import Report, PoliceOffice
from ..services import (
    parse_filters,
    apply_common_filters,
    build_top_locations,
    build_category_concentration,
    compute_avg_resolution,
    render_pdf,
    build_analytics_filename,
)
from ..views import validate_jwt_token


def convert_user_id_to_uuid(user_id):
    """Convert user_id string from JWT to UUID for database filtering."""
    if not user_id:
        return None
    try:
        return uuid_module.UUID(user_id)
    except (ValueError, TypeError):
        return None


# ============================================================================
# ANALYTICS OVERVIEW VIEW
# ============================================================================

class AnalyticsOverviewSummaryAPIView(APIView):
    # ENDPOINT: GET /analytics/summary/overview/
    # Used when: Analytics dashboard loads the overview card
    # Input: Filter query params (days, scope, office_id, city, barangay, category)
    # Output: Total reports matching filters + average resolution time
    # Example: "Last 30 days, our office: 150 reports, avg resolve time: 2d 3h 45m"

    def get(self, request):
        # Validate JWT token
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        
        # Convert user_id string to UUID for database filtering
        office_uuid = convert_user_id_to_uuid(user_id)
        
        # Parse all filter parameters from the request
        # Returns dict with: days, scope, office_id, city, barangay, category
        f = parse_filters(request)
        
        # Start with all reports
        base_qs = Report.objects.all()
        
        # Role scoping
        # - police: may choose 'our_office' or 'all' via UI
        # - admin: may choose 'our_office' + office_id, or 'all'
        if role == 'police':
            if f['scope'] == 'our_office':
                if office_uuid:
                    base_qs = base_qs.filter(assigned_office_id=office_uuid)
                f['scope'] = 'our_office'
                f['office_id'] = str(user_id)
            else:
                # Scope = all (ignore office_id for police in this mode)
                f['scope'] = 'all'
                f['office_id'] = None
        elif role == 'admin' and f['scope'] == 'our_office' and f['office_id']:
            # Admin explicitly selected a specific office
            admin_office_uuid = convert_user_id_to_uuid(f['office_id'])
            if admin_office_uuid:
                base_qs = base_qs.filter(assigned_office_id=admin_office_uuid)
        
        # Apply remaining filters (date, city, barangay, category) to the report queryset
        # Returns filtered reports based on date range, location, etc.
        base = apply_common_filters(base_qs, f)

        # Count how many reports match the filters
        total_assigned = base.count()
        
        # Resolved reports should still appear even if updated_at is missing.
        # But resolution time calculation REQUIRES updated_at.
        resolved_all = base.filter(status__iexact='Resolved')
        resolved_with_updated = resolved_all.filter(updated_at__isnull=False)
        resolved_missing_updated = resolved_all.filter(updated_at__isnull=True)
        
        # Calculate average time from report submission to resolution (only those with updated_at)
        avg_res_str = compute_avg_resolution(resolved_with_updated)

        # Return the summary as JSON
        payload = {
            "filters": {k: (str(v) if v is not None else None) for k, v in f.items()},
            "total_assigned": total_assigned,
            "total_resolved": resolved_all.count(),
            "resolved_missing_updated_at": resolved_missing_updated.count(),
            "average_resolution_time": avg_res_str,
        }
        return Response(payload, status=200)


# ============================================================================
# LOCATION HOTSPOTS VIEW (Top Crime Locations)
# ============================================================================

class LocationHotspotsAPIView(APIView):
    # ENDPOINT: GET /analytics/hotspots/locations/
    # Used when: Analytics dashboard shows "Where do crimes happen most?"
    # Input: Filter query params (days, scope, office_id, city, barangay, category)
    # Output: Top 3 locations with highest crime counts, plus details
    # Calculation: Groups reports by city/barangay, counts, shows percentages

    def get(self, request):
        # Validate JWT token
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        
        # Convert user_id string to UUID for database filtering
        office_uuid = convert_user_id_to_uuid(user_id)
        
        # Parse all filter parameters from the request
        f = parse_filters(request)
        
        # Start with all reports
        base_qs = Report.objects.all()
        
        # Role scoping (see AnalyticsOverviewSummaryAPIView for rules)
        if role == 'police':
            if f['scope'] == 'our_office':
                if office_uuid:
                    base_qs = base_qs.filter(assigned_office_id=office_uuid)
                f['scope'] = 'our_office'
                f['office_id'] = str(user_id)
            else:
                f['scope'] = 'all'
                f['office_id'] = None
        elif role == 'admin' and f['scope'] == 'our_office' and f['office_id']:
            # Admin explicitly selected a specific office
            admin_office_uuid = convert_user_id_to_uuid(f['office_id'])
            if admin_office_uuid:
                base_qs = base_qs.filter(assigned_office_id=admin_office_uuid)
        
        # Build location hotspots data (top locations, report counts, percentages)
        # Returns dict with: {results: [...top 3 locations...], total_resolved: count}
        ctx = build_top_locations(base_qs, f)
        
        # Return the location data as JSON
        return Response(ctx, status=200)


# ============================================================================
# CATEGORY CONCENTRATION VIEW (Crime Types)
# ============================================================================

class CategoryConcentrationAPIView(APIView):
    # ENDPOINT: GET /analytics/hotspots/categories/
    # Used when: Analytics dashboard shows "Which crimes are most common?"
    # Input: Filter query params (days, scope, office_id, city, barangay, category)
    # Output: Top 2 crime categories with counts and percentages
    # Calculation: Groups reports by crime type, counts, shows percentages

    def get(self, request):
        # Validate JWT token
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        
        # Convert user_id string to UUID for database filtering
        office_uuid = convert_user_id_to_uuid(user_id)
        
        # Parse all filter parameters from the request
        f = parse_filters(request)
        
        # Start with all reports
        base_qs = Report.objects.all()
        
        # Role scoping (see AnalyticsOverviewSummaryAPIView for rules)
        if role == 'police':
            if f['scope'] == 'our_office':
                if office_uuid:
                    base_qs = base_qs.filter(assigned_office_id=office_uuid)
                f['scope'] = 'our_office'
                f['office_id'] = str(user_id)
            else:
                f['scope'] = 'all'
                f['office_id'] = None
        elif role == 'admin' and f['scope'] == 'our_office' and f['office_id']:
            # Admin explicitly selected a specific office
            admin_office_uuid = convert_user_id_to_uuid(f['office_id'])
            if admin_office_uuid:
                base_qs = base_qs.filter(assigned_office_id=admin_office_uuid)
        
        # Build crime category concentration data (top categories, counts, percentages)
        # Returns dict with: {results: [...top 2 categories...], total_resolved: count}
        ctx = build_category_concentration(base_qs, f)
        
        # Return the category data as JSON
        return Response(ctx, status=200)


# ============================================================================
# ANALYTICS EXPORT TO PDF VIEW
# ============================================================================

class AnalyticsExportAPIView(APIView):
    # ENDPOINT: GET /analytics/export/ (PDF download)
    # Used when: User exports the full analytics report to PDF
    # Output: Single PDF file containing: overview + location hotspots + category concentration
    # PDF displays in browser (inline) instead of forcing download
    # Uses template: report_crime_deep_dive.html

    def get(self, request):
        # Validate JWT token
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        
        # Convert user_id string to UUID for database filtering
        office_uuid = convert_user_id_to_uuid(user_id)
        
        # Parse all filter parameters from the request
        f = parse_filters(request)
        
        # Start with all reports
        base_qs = Report.objects.all()
        
        # Role scoping (see AnalyticsOverviewSummaryAPIView for rules)
        if role == 'police':
            if f['scope'] == 'our_office':
                if office_uuid:
                    base_qs = base_qs.filter(assigned_office_id=office_uuid)
                f['scope'] = 'our_office'
                f['office_id'] = str(user_id)
            else:
                f['scope'] = 'all'
                f['office_id'] = None
        elif role == 'admin' and f['scope'] == 'our_office' and f['office_id']:
            # Admin explicitly selected a specific office
            admin_office_uuid = convert_user_id_to_uuid(f['office_id'])
            if admin_office_uuid:
                base_qs = base_qs.filter(assigned_office_id=admin_office_uuid)
        
        # Apply filters to get matching reports
        base = apply_common_filters(base_qs, f)
        
        # Count total reports matching filters
        total_assigned = base.count()
        
        # Get resolved ones and calculate average resolution time
        resolved = base.filter(status__iexact='Resolved', updated_at__isnull=False)
        avg_res_str = compute_avg_resolution(resolved)

        # Get location and category data for the PDF
        loc_ctx = build_top_locations(base_qs, f)
        cat_ctx = build_category_concentration(base_qs, f)

        # Calculate what percentage of ALL reports the filtered reports represent
        # Example: "60 reports out of 300 total = 20%"
        all_reports_total = Report.objects.count()
        total_reports_percent = (total_assigned / all_reports_total * 100.0) if all_reports_total else 0.0

        # Get office information for PDF footer (who authored/printed the report)
        # Requirement: For police users, always show THEIR office head officer even when scope=all.
        office_name = 'All Offices'
        head_officer_name = 'N/A'
        if role == 'police' and office_uuid:
            try:
                requester_office = PoliceOffice.objects.get(office_id=office_uuid)
                office_name = requester_office.office_name
                head_officer_name = requester_office.head_officer or 'N/A'
            except PoliceOffice.DoesNotExist:
                pass
        elif f['office_id']:
            # Admin: if an office is explicitly selected, show it
            try:
                office = PoliceOffice.objects.get(office_id=f['office_id'])
                office_name = office.office_name
                head_officer_name = office.head_officer or 'N/A'
            except PoliceOffice.DoesNotExist:
                pass

        # Build the context (data) to pass to the PDF template
        # This dict contains all the data the template needs to render
        context = {
            'category_filter_name': f['category'] or 'All Categories',
            'audit_scope': 'Our Office' if f['scope'] == 'our_office' else 'All Offices',
            'timeframe_days': f['days'],
            'total_reports': loc_ctx['total_resolved'],
            'total_reports_percent': total_reports_percent,
            'top_locations_list': [
                {
                    'location_city': i.get('location_city'),
                    'location_barangay': i.get('location_barangay'),
                    'report_count': i['report_count'],
                    'report_percent': i['report_percent'],
                }
                for i in loc_ctx['results']
            ],
            'category_is_specific': bool(f['category']),
            'category_results': cat_ctx['results'],
            'category_total': cat_ctx['total_resolved'],
            'avg_resolution_time': avg_res_str,
            'office_name': office_name,
            'head_officer_name': head_officer_name,
            'current_datetime': timezone.now(),
        }

        # Render the HTML template with the data, convert to PDF
        pdf = render_pdf('report_crime_deep_dive.html', context, request.build_absolute_uri('/'))
        
        # Generate a descriptive filename for the PDF
        filename = build_analytics_filename(f)

        # Create HTTP response with the PDF
        response = HttpResponse(pdf, content_type='application/pdf')
        # 'inline' = show in browser, not 'attachment' which forces download
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response
