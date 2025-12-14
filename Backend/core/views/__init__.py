# ============================================================================
# VIEWS: Think of views as "request handlers" - they receive HTTP requests from
# the frontend, process them using models/serializers, and send back responses.
# Each view = one endpoint. Views are like "recipe executors" for API endpoints.
# ============================================================================

from datetime import datetime, timedelta
import uuid as uuid_module

from django.http import HttpResponse
from django.db import transaction
from django.db.models import Count, F, Value
from django.db.models.functions import Coalesce
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import FormParser, MultiPartParser

from ..models import (
    Admin,
    PoliceOffice,
    Report,
    Message,
    Checkpoint,
    Media,
    SummaryAnalytics,
    User,
)
from ..serializers import (
    AdminSerializer,
    PoliceOfficeLoginSerializer,
    PoliceOfficeCreateSerializer,
    ReportCreateSerializer,
    ReportListSerializer,
    ReportStatusUpdateSerializer,
    MessageSerializer,
    CheckpointSerializer,
    MediaSerializer,
)
from ..services import (
    generate_directions_and_qr,
    reverse_geocode,
    reverse_geocode_address,
    get_active_checkpoints_list,
    find_nearest_office,
    assign_nearest_office_for_unassigned,
)


# ============================================================================
# HELPER: Manual JWT Validation
# ============================================================================

def validate_jwt_token(request):
    """
    Manually validate JWT token from Authorization header.
    Returns (is_valid, user_id, role, error_response)
    
    Since we disabled default JWT authentication to avoid User model conflicts,
    we validate tokens manually in views that need authentication.
    """
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import TokenError
    
    # Get Authorization header
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return False, None, None, Response({
            'detail': 'Authentication credentials were not provided.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Extract token
    token_str = auth_header.split(' ')[1]
    
    try:
        # Decode and validate token
        token = AccessToken(token_str)
        
        # Extract custom claims we added during login
        user_id = token.get('user_id')
        role = token.get('role')
        
        return True, user_id, role, None
        
    except TokenError as e:
        return False, None, None, Response({
            'detail': 'Invalid or expired token.'
        }, status=status.HTTP_401_UNAUTHORIZED)


# ============================================================================
# LOGIN VIEW - Real JWT Authentication
# ============================================================================

class LoginAPIView(APIView):
    """
    ENDPOINT: POST /api/auth/login/
    Used when: Admin or Police officer tries to log in
    Input: email and password (plain text)
    Output: User data, role (admin/police), JWT access/refresh tokens
    
    Password security: Uses Django's check_password() with hashed passwords
    Token: Returns JWT tokens for authenticated requests
    """

    def post(self, request):
        from django.contrib.auth.hashers import check_password
        from rest_framework_simplejwt.tokens import RefreshToken
        
        # Get email and password from request body
        email = request.data.get('email')
        password = request.data.get('password')

        # Validate: both email and password must be provided
        if not email or not password:
            return Response({
                "detail": "Email and password are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Try Admin login first: search database for admin with this email
        try:
            admin_user = Admin.objects.get(email=email)
            # Check password against hashed password in database
            if check_password(password, admin_user.password):
                # Generate JWT tokens for this user
                # RefreshToken generates both access and refresh tokens
                refresh = RefreshToken()
                refresh['user_id'] = str(admin_user.admin_id)
                refresh['role'] = 'admin'
                refresh['email'] = admin_user.email
                
                # Serialize admin data (converts to JSON, excludes password)
                serializer = AdminSerializer(admin_user)
                
                return Response({
                    "message": "Admin login successful",
                    "role": "admin",
                    "user": serializer.data,
                    "access": str(refresh.access_token),   # JWT access token
                    "refresh": str(refresh),               # JWT refresh token
                }, status=status.HTTP_200_OK)
        except Admin.DoesNotExist:
            # Email not found in Admin table, try Police next
            pass

        # Try Police login: search database for police office with this email
        try:
            police_office = PoliceOffice.objects.get(email=email)
            # Check password against hashed password in database
            if check_password(password, police_office.password_hash):
                # Generate JWT tokens for this police office
                refresh = RefreshToken()
                refresh['user_id'] = str(police_office.office_id)
                refresh['role'] = 'police'
                refresh['email'] = police_office.email
                
                # Serialize police office data (excludes password)
                serializer = PoliceOfficeLoginSerializer(police_office)
                
                return Response({
                    "message": "Police login successful",
                    "role": "police",
                    "user": serializer.data,
                    "access": str(refresh.access_token),   # JWT access token
                    "refresh": str(refresh),               # JWT refresh token
                }, status=status.HTTP_200_OK)
        except PoliceOffice.DoesNotExist:
            # Email not found in either table = invalid credentials
            pass

        # Fallback: credentials didn't match any user or password was wrong
        return Response({
            "detail": "Invalid credentials."
        }, status=status.HTTP_401_UNAUTHORIZED)


# ============================================================================
# POLICE OFFICE ADMIN CRUD VIEW
# ============================================================================

class PoliceOfficeAdminViewSet(viewsets.ModelViewSet):
    # ENDPOINTS: GET, POST, PUT, DELETE for police offices
    # Used when: Admin manages (create/list/update/delete) police office accounts
    # Input: Office name, email, password, location, contact info
    # Output: Office data (for list/retrieve/update)
    # Note: Excludes test account to keep database clean

    # Start with all police offices except test account
    queryset = PoliceOffice.objects.all().exclude(email='test@crash.ph')
    serializer_class = PoliceOfficeCreateSerializer

    # Choose the right serializer based on the action being performed
    # Create/Update = need password handling (PoliceOfficeCreateSerializer)
    # Retrieve/List = no password needed (PoliceOfficeLoginSerializer)
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PoliceOfficeCreateSerializer
        return PoliceOfficeLoginSerializer

    # Override the save process when creating a new police office
    # Make sure we link it to the admin who created it
    def perform_create(self, serializer):
        # Get the admin ID from the request (who is creating this office)
        admin_id_str = self.request.data.get('created_by')
        if not admin_id_str:
            return Response({"created_by": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the admin in the database
        try:
            admin_instance = Admin.objects.get(admin_id=admin_id_str)
        except Admin.DoesNotExist:
            return Response({"created_by": "Admin account not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Save the office with the admin link
        serializer.save(created_by=admin_instance)


# ============================================================================
# REPORT CRUD VIEW
# ============================================================================

class ReportViewSet(viewsets.ModelViewSet):
    # ENDPOINTS: GET (list/retrieve), POST (create), PUT (update), DELETE for reports
    # Used when: Citizens submit reports, police view/update them
    # Input: Crime category, description, GPS location (for creation)
    # Output: Report data with human-readable names (for list/retrieve)
    # Key feature: Automatically geocodes GPS to city/barangay names

    # Start with all reports, load related data efficiently (prevents N+1 queries)
    # select_related = fetch reporter and office data in one query
    queryset = Report.objects.all().select_related('reporter', 'assigned_office')

    # Choose the right serializer based on the action being performed
    # Create = needs location validation (ReportCreateSerializer)
    # Update = status only (ReportStatusUpdateSerializer, prevents tampering)
    # List/Retrieve = full data with human-readable names (ReportListSerializer)
    def get_serializer_class(self):
        if self.action == 'create':
            return ReportCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ReportStatusUpdateSerializer
        return ReportListSerializer

    # Validate JWT token for protected actions
    def list(self, request, *args, **kwargs):
        # Police dashboard needs authentication to list reports
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        
        # Store user info for get_queryset to filter by office
        request.user_id = user_id
        request.user_role = role
        
        # Continue with normal list behavior
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        # Viewing single report details requires authentication
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response

        # Store user info for get_queryset to filter by office (and avoid leaking other offices)
        request.user_id = user_id
        request.user_role = role
        
        return super().retrieve(request, *args, **kwargs)

    # Override which reports are returned based on the request type
    # When listing: only show ACTIVE reports (hide resolved/canceled from main list)
    # When updating: show all reports (police need to access resolved ones)
    def get_queryset(self):
        queryset = self.queryset
        
        if self.request.method == 'GET':
            # Opportunistically assign nearest office for any unassigned reports
            try:
                assign_nearest_office_for_unassigned()
            except Exception:
                pass
            
            # Filter by office for police users (admin sees all)
            user_role = getattr(self.request, 'user_role', None)
            user_id = getattr(self.request, 'user_id', None)
            
            if user_role == 'police' and user_id:
                # Get office for this police user
                try:
                    office = PoliceOffice.objects.get(office_id=user_id)
                    queryset = queryset.filter(assigned_office=office)
                except PoliceOffice.DoesNotExist:
                    pass

            # IMPORTANT:
            # - For list views (Dashboard/Map), hide resolved/canceled.
            # - For retrieve view (View Details) we MUST allow resolved reports too,
            #   otherwise Resolved Cases page can't open the details modal.
            if getattr(self, 'action', None) == 'list':
                return queryset.exclude(status__in=['Resolved', 'Canceled']).order_by('-created_at')

            return queryset.order_by('-created_at')
        
        return queryset

    # Override the save process when creating a new report
    # Automatically: assign to nearest office, geocode location
    def perform_create(self, serializer):
        # Extract location data from request
        reporter_id = self.request.data.get('reporter')
        latitude = self.request.data.get('latitude')
        longitude = self.request.data.get('longitude')
        
        # Convert GPS coordinates to human-readable city/barangay names
        location_city, location_barangay = reverse_geocode(latitude, longitude)

        # Assign nearest office, fallback to first available if none found
        assigned_office_instance = find_nearest_office(latitude, longitude)
        if not assigned_office_instance:
            try:
                assigned_office_instance = PoliceOffice.objects.all().first()
            except PoliceOffice.DoesNotExist:
                assigned_office_instance = None

        # Save the report with auto-calculated fields
        serializer.save(
            assigned_office=assigned_office_instance,
            reporter_id=reporter_id,
            location_city=location_city,
            location_barangay=location_barangay,
        )

    # Override the update process to set updated_at timestamp
    def perform_update(self, serializer):
        # Track status transition so we can keep tbl_summary_analytics in sync
        prev_status = getattr(serializer.instance, 'status', None)
        prev_city = getattr(serializer.instance, 'location_city', None)
        prev_barangay = getattr(serializer.instance, 'location_barangay', None)
        prev_category = getattr(serializer.instance, 'category', None)

        new_status = serializer.validated_data.get('status', prev_status)

        # Always update updated_at when status is changed/updated (used for resolution time)
        report = serializer.save(updated_at=timezone.now())

        # Keep SummaryAnalytics (tbl_summary_analytics) updated automatically.
        # This avoids needing Postman/manual calls to /admin/analytics/update/.
        #
        # We only count RESOLVED reports (matches AnalyticsUpdateAPIView logic).
        def _bump_summary(city, barangay, category, delta):
            if not city or not barangay or not category:
                return
            with transaction.atomic():
                obj, created = SummaryAnalytics.objects.select_for_update().get_or_create(
                    location_city=city,
                    location_barangay=barangay,
                    category=category,
                    defaults={'report_count': 0},
                )
                SummaryAnalytics.objects.filter(summary_id=obj.summary_id).update(
                    report_count=F('report_count') + delta,
                    last_updated=timezone.now(),
                )
                # Prevent negative counts if someone toggles status back and forth
                SummaryAnalytics.objects.filter(summary_id=obj.summary_id, report_count__lt=0).update(report_count=0)

        # If report just became Resolved → increment
        if prev_status != 'Resolved' and new_status == 'Resolved':
            _bump_summary(report.location_city, report.location_barangay, report.category, +1)

        # If report was Resolved but is no longer Resolved → decrement using previous values
        if prev_status == 'Resolved' and new_status != 'Resolved':
            _bump_summary(prev_city, prev_barangay, prev_category, -1)

    # Custom action: GET /reports/{id}/route/
    # Returns directions from police office to incident location
    @action(detail=True, methods=['get'])
    def route(self, request, pk=None):
        try:
            # Get the specific report
            report = self.get_object()
            assigned_office = report.assigned_office
            
            # Check if report is assigned to an office
            if not assigned_office:
                return Response({"detail": "Report is not yet assigned to an office."}, status=status.HTTP_400_BAD_REQUEST)

            # Generate directions from office to incident location
            routing_data = generate_directions_and_qr(
                start_lat=assigned_office.latitude,
                start_lng=assigned_office.longitude,
                end_lat=report.latitude,
                end_lng=report.longitude,
            )
            return Response(routing_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Routing error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Custom action: GET /reports/summary_resolved/
    # Returns all resolved reports (for resolved cases page)
    @action(detail=False, methods=['get'])
    def summary_resolved(self, request):
        # Validate JWT and filter by office
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        
        # Start with resolved reports
        resolved_reports = self.queryset.filter(status='Resolved')
        
        # Filter by office for police users (admin sees all)
        if role == 'police' and user_id:
            try:
                office = PoliceOffice.objects.get(office_id=user_id)
                resolved_reports = resolved_reports.filter(assigned_office=office)
            except PoliceOffice.DoesNotExist:
                pass
        
        # Sort by most recent first
        resolved_reports = resolved_reports.order_by('-updated_at')
        serializer = self.get_serializer(resolved_reports, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================================
# MESSAGE CRUD VIEW (Nested under Reports)
# ============================================================================

class MessageViewSet(viewsets.ModelViewSet):
    # ENDPOINTS: GET (list), POST (create), PUT (update), DELETE for messages
    # Used when: Police and citizens exchange messages about a specific report
    # Input: Message content, sender ID, sender type (police/citizen)
    # Output: All messages for a report, sorted by time
    # Note: This is a nested resource (messages belong to a report)

    serializer_class = MessageSerializer

    # Override: only return messages for a specific report (from URL parameter)
    # URL format: /reports/{report_pk}/messages/
    # report_pk = report ID from the URL
    def get_queryset(self):
        report_id = self.kwargs.get('report_pk')  # Get report ID from URL
        if report_id:
            # Return messages for this report, sorted oldest to newest
            return Message.objects.filter(report_id=report_id).order_by('timestamp')
        # If no report ID in URL, return empty (shouldn't happen with proper routing)
        return Message.objects.none()

    # Override the save process when creating a new message
    # Ensure the message is linked to the correct report
    def perform_create(self, serializer):
        report_id = self.kwargs.get('report_pk')  # Get report ID from URL
        try:
            # Find the report in the database
            report_instance = Report.objects.get(report_id=report_id)
        except Report.DoesNotExist:
            raise NotFound(detail="Report not found.")
        # Save message linked to this report
        serializer.save(report=report_instance)


# ============================================================================
# CHECKPOINT CRUD VIEW
# ============================================================================

class CheckpointViewSet(viewsets.ModelViewSet):
    # ENDPOINTS: GET (list/retrieve), POST (create), PUT (update), DELETE for checkpoints
    # Used when: Admin manages police patrol checkpoint locations
    # Input: Checkpoint name, location, time range, assigned officers
    # Output: Checkpoint data with office name (for readability)
    # Key feature: Can filter for only "active" checkpoints (current time in range)

    # Start with all checkpoints, load office data efficiently, newest first
    queryset = Checkpoint.objects.all().select_related('office').order_by('-created_at')
    serializer_class = CheckpointSerializer

    # Custom action: GET /checkpoints/active/
    # Returns only checkpoints that are currently active (right now)
    @action(detail=False, methods=['get'])
    def active(self, request):
        # Get all checkpoints from database
        all_checkpoints = self.queryset
        # Filter to only those currently active (helper function checks time_start/time_end)
        active_checkpoints = get_active_checkpoints_list(all_checkpoints)
        # Serialize and return the active ones
        serializer = self.get_serializer(active_checkpoints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _derive_location(self, latitude, longitude):
        if latitude is None or longitude is None:
            return None
        address_line, _, _ = reverse_geocode_address(latitude, longitude)
        return address_line

    def perform_create(self, serializer):
        lat = self.request.data.get('latitude')
        lng = self.request.data.get('longitude')
        # Try reverse geocoding, fallback to frontend-provided location
        address_line = self._derive_location(lat, lng)
        frontend_location = self.request.data.get('location')
        final_location = address_line or frontend_location or f"Lat: {lat}, Lng: {lng}"
        serializer.save(location=final_location)

    def perform_update(self, serializer):
        lat = self.request.data.get('latitude') or getattr(serializer.instance, 'latitude', None)
        lng = self.request.data.get('longitude') or getattr(serializer.instance, 'longitude', None)
        # Try reverse geocoding, fallback to frontend-provided location or existing
        address_line = self._derive_location(lat, lng)
        frontend_location = self.request.data.get('location')
        existing_location = getattr(serializer.instance, 'location', None)
        final_location = address_line or frontend_location or existing_location or f"Lat: {lat}, Lng: {lng}"
        serializer.save(location=final_location)


# ============================================================================
# MEDIA UPLOAD/VIEW
# ============================================================================

class MediaViewSet(viewsets.ModelViewSet):
    # ENDPOINTS: GET (list/retrieve), POST (upload), DELETE for media files
    # Used when: Citizens/police upload photos/videos as evidence for a report
    # Input: File, report ID, file type, uploader ID (in request body)
    # Output: File URL (stored in Supabase cloud) and metadata
    # Key feature: Files upload to cloud storage, not local disk

    queryset = Media.objects.all().select_related('report')
    serializer_class = MediaSerializer
    parser_classes = [MultiPartParser, FormParser]

    def list(self, request, *args, **kwargs):
        # Require JWT for listing media
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        request.user_id = user_id
        request.user_role = role
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        # Require JWT for uploading media
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        request.user_id = user_id
        request.user_role = role

        # Police may only upload evidence for reports assigned to their office.
        if role == 'police' and user_id:
            try:
                office_uuid = uuid_module.UUID(user_id)
            except (ValueError, TypeError):
                return Response({"detail": "Invalid police office ID in token. Please log in again."}, status=status.HTTP_401_UNAUTHORIZED)

            report_id = request.data.get('report')
            if report_id:
                try:
                    report_obj = Report.objects.select_related('assigned_office').get(report_id=report_id)
                    if not report_obj.assigned_office_id or report_obj.assigned_office_id != office_uuid:
                        return Response({"detail": "You can only upload media for reports assigned to your office."}, status=status.HTTP_403_FORBIDDEN)
                except Report.DoesNotExist:
                    return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Require JWT for deleting media
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        request.user_id = user_id
        request.user_role = role
        return super().destroy(request, *args, **kwargs)

    # Override: filter media by report_id if provided in query string
    # Usage: GET /media/?report_id=123 returns only files for that report
    def get_queryset(self):
        queryset = Media.objects.all().select_related('report').order_by('-uploaded_at')
        # Check if frontend passed report_id as a query parameter
        report_id = self.request.query_params.get('report_id')
        if report_id:
            # Filter to only files attached to this report
            queryset = queryset.filter(report_id=report_id)

        # Scope media to the requesting police office (admin sees all)
        role = getattr(self.request, 'user_role', None)
        user_id = getattr(self.request, 'user_id', None)
        if role == 'police' and user_id:
            try:
                office_uuid = uuid_module.UUID(user_id)
                queryset = queryset.filter(report__assigned_office_id=office_uuid)
            except (ValueError, TypeError):
                pass
        return queryset


# ============================================================================
# TOP LOCATIONS SUMMARY VIEW
# ============================================================================

class TopLocationsAPIView(APIView):
    # ENDPOINT: GET /reports/summary/top-locations/
    # Used when: Dashboard needs to show "where do crimes happen the most?"
    # Input: Optional filters (category, date_range)
    # Output: List of locations with crime counts, sorted by highest count first
    # Note: Groups by city/barangay/category combination

    def get(self, request):
        # Start with all resolved reports
        queryset = Report.objects.filter(status='Resolved')
        
        # Optional filter: by crime category
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__iexact=category)  # Case-insensitive
        
        # Optional filter: by date range (default: all time)
        date_range = request.query_params.get('date_range')
        if date_range == '30_days':
            date_cutoff = datetime.now() - timedelta(days=30)
            queryset = queryset.filter(created_at__gte=date_cutoff)

        # Group reports by location and category, count how many in each group
        # Returns something like: {city: "Manila", barangay: "Tondo", category: "Robbery", count: 5}
        aggregated_data = queryset.values(
            'location_city',
            'location_barangay',
            'category'
        ).annotate(report_count=Count('report_id')).order_by('-report_count')[:10]  # Top 10 only

        # Format the data for JSON response
        results = [
            {
                'location_city': item['location_city'],
                'location_barangay': item['location_barangay'],
                'category': item['category'],
                'report_count': item['report_count'],
            }
            for item in aggregated_data
            if item['location_city']  # Skip if location is missing
        ]

        return Response(results, status=status.HTTP_200_OK)


# ============================================================================
# ADMIN MAP VIEW (Dashboard Map)
# ============================================================================

class AdminMapAPIView(APIView):
    # ENDPOINT: GET /admin/map/data/
    # Used when: Admin/Police dashboard loads the interactive map
    # Query Parameters:
    #   - scope_reports: 'our_office' or 'all' (default: 'our_office' for police, 'all' for admin)
    #   - scope_checkpoints: 'our_office' or 'all' (default: 'our_office' for police, 'all' for admin)
    # Output: All active reports + all police offices + checkpoints
    # Purpose: Shows real-time crime incidents, police locations, and patrols on a map

    def get(self, request):
        # Validate JWT token
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        
        # Convert user_id string to UUID for database filtering
        # JWT stores UUIDs as strings, but Django needs proper UUID type for FK filtering
        office_uuid = None
        if user_id:
            try:
                office_uuid = uuid_module.UUID(user_id)
            except (ValueError, TypeError):
                pass

        if role == 'police' and office_uuid and not PoliceOffice.objects.filter(office_id=office_uuid).exists():
            return Response(
                {"detail": "Your police office account was not found in the database. Please log out and log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        
        # Get scope filters from query parameters
        # Default: 'our_office' for police, 'all' for admin
        scope_reports = request.query_params.get('scope_reports', 'our_office' if role == 'police' else 'all')
        scope_checkpoints = request.query_params.get('scope_checkpoints', 'our_office' if role == 'police' else 'all')
        
        # Get reports, filtered by scope
        report_qs = Report.objects.all().select_related('reporter', 'assigned_office')
        if scope_reports == 'our_office' and role == 'police' and office_uuid:
            # Filter to show ONLY reports assigned to this police office
            report_qs = report_qs.filter(assigned_office_id=office_uuid)
        # If scope_reports == 'all' or user is admin, show all reports (no filter)

        # Frontend filters by status, so return all statuses (active + resolved + canceled)
        filtered_reports = report_qs.order_by('-created_at')
        reports_serializer = ReportListSerializer(filtered_reports, many=True)

        # Get all police office locations
        all_offices = PoliceOffice.objects.all()
        offices_data = PoliceOfficeLoginSerializer(all_offices, many=True).data

        # Get checkpoints, filtered by scope
        all_checkpoints = Checkpoint.objects.all().select_related('office').order_by('-created_at')
        if scope_checkpoints == 'our_office' and role == 'police' and office_uuid:
            # Filter to show ONLY checkpoints from this police office
            all_checkpoints = all_checkpoints.filter(office_id=office_uuid)
        # If scope_checkpoints == 'all' or user is admin, show all checkpoints (no filter)
        checkpoints_data = CheckpointSerializer(all_checkpoints, many=True).data

        # Return all three data types in one response
        payload = {
            'active_reports': reports_serializer.data,
            'police_offices': offices_data,
            'active_checkpoints': checkpoints_data,
        }
        return Response(payload, status=status.HTTP_200_OK)


# ============================================================================
# REVERSE GEOCODE VIEW (Get full address from coordinates)
# ============================================================================

class ReverseGeocodeAPIView(APIView):
    # ENDPOINT: GET /geocode/reverse/?lat=X&lng=Y
    # Used when: User right-clicks on map and needs full address for coordinates
    # Output: Full address line, barangay, city from Google Geocoding API
    # Purpose: Shows detailed address information in context menu
    
    permission_classes = []  # Public endpoint (no auth required)
    
    def get(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        
        if not lat or not lng:
            return Response(
                {'error': 'Missing lat or lng parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            return Response(
                {'error': 'Invalid lat or lng value'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Call Google Geocoding API
        address_line, barangay, city = reverse_geocode_address(lat, lng)
        
        if not address_line and not barangay and not city:
            return Response(
                {'error': 'Unable to geocode this location'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Build full address string (as detailed as possible)
        parts = []
        if address_line:
            parts.append(address_line)
        if barangay and barangay not in (address_line or ''):
            parts.append(barangay)
        if city and city not in (address_line or ''):
            parts.append(city)
        
        full_address = ', '.join(parts) if parts else None
        
        return Response({
            'address_line': address_line,
            'barangay': barangay,
            'city': city,
            'full_address': full_address,
        }, status=status.HTTP_200_OK)


# ============================================================================
# ANALYTICS UPDATE VIEW (Cache Manager)
# ============================================================================

class AnalyticsUpdateAPIView(APIView):
    # ENDPOINT: POST /analytics/update/
    # Used when: Admin wants to refresh the analytics cache (or called periodically)
    # Process: Re-calculates statistics for ALL location/category combinations
    # Purpose: Pre-calculates data so analytics page loads instantly (no heavy queries)
    # Safety: Uses a "lock" to prevent multiple updates running at the same time

    def post(self, request):
        # Require JWT: only authenticated police/admin can rebuild analytics cache
        is_valid, user_id, role, error_response = validate_jwt_token(request)
        if not is_valid:
            return error_response
        if role not in ('police', 'admin'):
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        # Prevent two updates from running simultaneously (causes database issues)
        # cache.add() returns False if key already exists
        lock_key = 'analytics_update_lock'
        lock_acquired = cache.add(lock_key, 'locked', timeout=60)  # Lock expires after 60 seconds
        if not lock_acquired:
            # Another update is already in progress
            return Response({"detail": "Analytics update already in progress. Please wait and try again."}, status=status.HTTP_409_CONFLICT)

        try:
            # True "rebuild": clear stale cache rows first (prevents old cities lingering)
            SummaryAnalytics.objects.all().delete()

            # Group all resolved reports by location and category, count each group
            aggregated_data = (
                Report.objects.filter(status__iexact='Resolved')
                .annotate(
                    _city=Coalesce('location_city', Value('')),
                    _barangay=Coalesce('location_barangay', Value('Unknown')),
                )
                .values('_city', '_barangay', 'category')
                .annotate(report_count=Count('report_id'))
            )

            # For each location/category combination, update or create SummaryAnalytics record
            for item in aggregated_data:
                # Skip if location wasn't geocoded yet
                if not item['_city']:
                    continue
                # Update existing record or create new one if it doesn't exist
                SummaryAnalytics.objects.update_or_create(
                    location_city=item['_city'],
                    location_barangay=item['_barangay'],
                    category=item['category'],
                    defaults={  # These fields get updated/set
                        'report_count': item['report_count'],
                        'last_updated': timezone.now(),
                    },
                )

            return Response({"detail": "Analytics summary table updated successfully."}, status=status.HTTP_200_OK)
        finally:
            # Always remove the lock, even if there's an error
            # This prevents the system from getting stuck
            cache.delete(lock_key)
