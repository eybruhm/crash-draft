# core/serializers.py
# ============================================================================
# SERIALIZERS: Think of each serializer as a "translator" between Python objects
# and JSON (the format the frontend understands).
# Serializers handle: converting data to JSON, validating input, transforming fields.
# They sit between the view (Python) and the API (JSON).
# ============================================================================

from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.core.files.storage import default_storage
from django.conf import settings
from rest_framework.exceptions import ValidationError
from supabase import create_client
import logging
import os, uuid
from .models import (
    Admin, 
    PoliceOffice, 
    User,
    Report, 
    Message,
    Checkpoint,
    Media,
    SummaryAnalytics
)
from .services import get_media_limits

logger = logging.getLogger(__name__)


# ============================================================================
# REPORTER (CITIZEN) SERIALIZER - Minimal contact info
# ============================================================================
class ReporterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'user_id',
            'email',
            'phone',
            'first_name',
            'last_name',
            'emergency_contact_name',
            'emergency_contact_number',
            'region',
            'city',
            'barangay',
        )

# ============================================================================
# SUPABASE CLIENT SETUP
# ============================================================================
# Supabase = cloud database and file storage service
# This client connects our Django app to Supabase.
# IMPORTANT (Windows/dev): do NOT crash Django on import if Supabase is misconfigured.
# We initialize lazily and raise a clear error only when an endpoint actually needs it.
_supabase = None


def get_supabase_client():
    global _supabase
    if _supabase is not None:
        return _supabase

    supabase_url = (getattr(settings, 'SUPABASE_URL', None) or '').strip()
    supabase_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)

    try:
        _supabase = create_client(supabase_url, supabase_key)
        return _supabase
    except Exception as e:
        # Do not log the service-role key.
        logger.error("Supabase client init failed: %s", e)
        raise EnvironmentError(
            "Supabase is not configured correctly. "
            "Fix your environment variables in Backend/.env (or OS env vars) and restart the server.\n"
            "- SUPABASE_URL must start with 'https://' (example: https://<project-ref>.supabase.co)\n"
            "- SUPABASE_SERVICE_ROLE_KEY must be set (do not wrap it in extra quotes)\n"
            f"Current SUPABASE_URL value: {supabase_url!r}\n"
            f"Original error: {e}"
        )

# ============================================================================
# ADMIN SERIALIZERS
# ============================================================================

# ADMIN LOGIN SERIALIZER
# Used when: Returning admin data in responses (excludes sensitive password)
# Output: Admin ID, username, email, contact (safe to send to frontend)
class AdminSerializer(serializers.ModelSerializer):
    contact = serializers.CharField(source='contact_no', read_only=True)  # Map contact_no to contact for frontend
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)  # Map created_at to createdAt for frontend
    
    class Meta:
        model = Admin
        # Only these fields are converted to JSON when returning admin data
        fields = ('admin_id', 'username', 'email', 'contact_no', 'contact', 'created_at', 'createdAt')


# ADMIN UPDATE SERIALIZER
# Used when: Admin updates their profile (username, email, contact_no)
# Input: username, email, contact_no (all optional, only send fields to update)
class AdminUpdateSerializer(serializers.ModelSerializer):
    contact = serializers.CharField(source='contact_no', required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = Admin
        fields = ('username', 'email', 'contact', 'contact_no')
        extra_kwargs = {
            'username': {'required': False},
            'email': {'required': False},
            'contact_no': {'required': False, 'allow_blank': True, 'allow_null': True},
        }
    
    def validate_email(self, value):
        """Ensure email is unique (excluding current admin)"""
        if value:
            # Get current admin from context (set in view)
            current_admin = self.context.get('current_admin')
            if current_admin:
                # Check if another admin already has this email
                if Admin.objects.filter(email=value).exclude(admin_id=current_admin.admin_id).exists():
                    raise serializers.ValidationError("An admin with this email already exists.")
        return value
    
    def validate_username(self, value):
        """Ensure username is unique (excluding current admin)"""
        if value:
            current_admin = self.context.get('current_admin')
            if current_admin:
                if Admin.objects.filter(username=value).exclude(admin_id=current_admin.admin_id).exists():
                    raise serializers.ValidationError("An admin with this username already exists.")
        return value
    
    def update(self, instance, validated_data):
        # Handle contact field mapping
        if 'contact_no' in validated_data:
            instance.contact_no = validated_data['contact_no']
        elif 'contact' in validated_data:
            instance.contact_no = validated_data['contact']
        
        # Update other fields
        if 'username' in validated_data:
            instance.username = validated_data['username']
        if 'email' in validated_data:
            instance.email = validated_data['email']
        
        instance.save()
        return instance


# ADMIN PASSWORD UPDATE SERIALIZER
# Used when: Admin changes their password
# Input: new_password (plain text, will be hashed)
class AdminPasswordUpdateSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, min_length=6)
    
    def validate_new_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters long.")
        return value
        
# ============================================================================
# POLICE OFFICE SERIALIZERS
# ============================================================================

# POLICE OFFICE LOGIN SERIALIZER
# Used when: Returning police office data to logged-in officers (after login)
# Output: Office info WITHOUT password (password_hash stays in database, never shown)
class PoliceOfficeLoginSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    class Meta:
        model = PoliceOffice
        # Shows identification info + location for directions, hides sensitive password field
        fields = (
            'office_id',
            'office_name',
            'email',
            'head_officer',
            'contact_number',
            'location_city',
            'location_barangay',
            'latitude',
            'longitude',
            'created_by',
            'created_by_username',
        )

# POLICE OFFICE CREATION SERIALIZER
# Used when: Admin creates a new police office (includes password handling)
# Input: office_name, email, password (plain text), location, contact info
# Process: Accepts plain password, hashes it, stores hashed version
class PoliceOfficeCreateSerializer(serializers.ModelSerializer):
    # Define 'password' as write-only input field (not stored directly in database)
    # It gets converted to password_hash before saving
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = PoliceOffice
        # Fields that admin provides when creating a new office
        fields = (
            'office_name', 'email', 'password', 'head_officer', 
            'contact_number', 'latitude', 'longitude', 'created_by'
        )
        extra_kwargs = {
            'password_hash': {'write_only': True},
            # Match model: head_officer/contact_number are optional
            'head_officer': {'required': False, 'allow_blank': True, 'allow_null': True},
            'contact_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'created_by': {'required': False, 'allow_null': True},
        }
    
    # Override create() to handle password hashing before saving to database
    # Flow: plain password → hashed → stored in password_hash column
    def create(self, validated_data):
        # Extract plain password from the input data
        password = validated_data.pop('password')
        
        # Hash the password using Django's security function
        # Hashing = one-way conversion (can't decrypt, can only verify)
        validated_data['password_hash'] = make_password(password)
        
        # Create and save the PoliceOffice with the hashed password
        return PoliceOffice.objects.create(**validated_data)


# POLICE OFFICE UPDATE SERIALIZER
# Used when: Admin updates an existing police office (password is optional)
# Input: Same fields as create, but password is optional (only hash if provided)
class PoliceOfficeUpdateSerializer(serializers.ModelSerializer):
    # Password is optional for updates - only change if provided
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = PoliceOffice
        fields = (
            'office_name', 'email', 'password', 'head_officer', 
            'contact_number', 'latitude', 'longitude'
        )
        extra_kwargs = {
            'office_name': {'required': False},
            'email': {'required': False},
            'head_officer': {'required': False, 'allow_blank': True, 'allow_null': True},
            'contact_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'latitude': {'required': False},
            'longitude': {'required': False},
        }
    
    def update(self, instance, validated_data):
        # Handle optional password update
        password = validated_data.pop('password', None)
        if password:
            instance.password_hash = make_password(password)
        
        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

    
# ============================================================================
# REPORT SERIALIZERS
# ============================================================================

# REPORT CREATION SERIALIZER
# Used when: Citizen submits a new crime report via mobile app
# Input: Crime category, description, GPS location, reporter ID
# Process: Validates data, converts JSON to Python object, saves to database
class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        # Fields that citizen provides when creating a report
        fields = (
            'category',          # What type of crime (e.g., "Robbery")
            'description',       # Details about what happened
            'latitude',          # GPS latitude of incident location
            'longitude',         # GPS longitude of incident location
            'reporter',          # Which citizen is reporting (their user ID)
            'location_city',     # Will be auto-filled by reverse geocoding
            'location_barangay'  # Will be auto-filled by reverse geocoding
        )
        # These fields are optional (can be calculated/filled later)
        extra_kwargs = {
            'location_city': {'required': False},
            'location_barangay': {'required': False},
        }


# ADMIN MANUAL REPORT SERIALIZER (Admin1 tool)
# Used when: Admin creates a report manually (separate from citizen mobile flow)
# Safety: Admin cannot set status directly; backend forces 'Pending'
class AdminManualReportCreateSerializer(serializers.ModelSerializer):
    # 911 provides which office handled the case; require this for manual inserts.
    assigned_office = serializers.PrimaryKeyRelatedField(
        queryset=PoliceOffice.objects.all(),
        required=True,
        allow_null=False,
    )
    reporter = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    status = serializers.ChoiceField(choices=['Pending', 'Resolved'], required=False)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    created_at = serializers.DateTimeField(required=False, allow_null=True)
    updated_at = serializers.DateTimeField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    def to_internal_value(self, data):
        """Ensure datetime fields are timezone-aware and stored consistently.

        Policy:
        - If the incoming datetime is naive (no tzinfo), treat it as Asia/Manila local time.
          (This matches admin datetime-local inputs.)
        - If the incoming datetime is aware (has tzinfo, e.g. +08:00 or Z), convert it to UTC.
        """

        validated_data = super().to_internal_value(data)

        from django.utils import timezone
        from datetime import timezone as dt_timezone

        manila_tz = timezone.get_current_timezone()

        def _normalize_to_utc(dt):
            if not dt:
                return dt
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, manila_tz)
            return dt.astimezone(dt_timezone.utc)

        if validated_data.get('created_at'):
            validated_data['created_at'] = _normalize_to_utc(validated_data['created_at'])

        if validated_data.get('updated_at'):
            validated_data['updated_at'] = _normalize_to_utc(validated_data['updated_at'])

        return validated_data

    class Meta:
        model = Report
        fields = (
            'category',
            'description',
            'latitude',
            'longitude',
            'reporter',
            'assigned_office',
            'status',
            'remarks',
            'created_at',
            'updated_at',
        )

# REPORT LIST SERIALIZER
# Used when: Returning report data to police dashboard (reading reports)
# Output: Report details with human-readable names (not just IDs)
# Why: Police don't want to see UUID; they want "John Doe" not "user_id_12345"
class ReportListSerializer(serializers.ModelSerializer):
    # These are custom fields: shows the RELATED data (office name, reporter name)
    # source='assigned_office.office_name' = follow the relationship, get the name
    assigned_office_name = serializers.CharField(source='assigned_office.office_name', read_only=True)
    reporter_full_name = serializers.SerializerMethodField(read_only=True)
    incident_address = serializers.SerializerMethodField(read_only=True)
    reporter = ReporterSerializer(read_only=True)

    class Meta:
        model = Report
        # Fields to include in the JSON response
        fields = (
            'report_id',            # Unique report identifier
            'category',             # Crime type
            'status',               # Current status (Pending/Acknowledged/En Route/Resolved/Canceled)
            'created_at',           # When report was submitted
            'latitude',             # GPS coordinates
            'longitude',
            'description',          # Details about incident
            'assigned_office_name', # Human-readable office name
            'reporter_full_name',   # Human-readable citizen name
            'incident_address',     # Human-readable address (city, barangay)
            'reporter',             # Nested reporter contact info
        )
    
    # Custom method: combine first and last name into full name
    # Called for each report when serializing to JSON
    def get_reporter_full_name(self, obj):
        # If reporter exists, join first and last name
        if obj.reporter:
            return f"{obj.reporter.first_name} {obj.reporter.last_name}"
        # If reporter account was deleted, show placeholder
        return "N/A"
    
    # Custom method: format address as "Barangay, City" for readability
    def get_incident_address(self, obj):
        # If both city and barangay are available, combine them
        if obj.location_barangay and obj.location_city:
            return f"{obj.location_barangay}, {obj.location_city}"
        # If location hasn't been geocoded yet, show placeholder
        return "Address Pending"
    
# REPORT STATUS UPDATE SERIALIZER
# Used when: Police update report status (e.g., "Pending" → "En Route" → "Resolved")
# Input: New status, remarks/notes from police
# Process: Validates status is one of the allowed choices, saves update
class ReportStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        # Only allow police to change these two fields
        fields = ('status', 'remarks')
        # These fields can't be changed (to prevent tampering with incident details)
        read_only_fields = ('report_id', 'reporter', 'category', 'latitude', 'longitude') 

 
# ============================================================================
# MESSAGE SERIALIZER
# ============================================================================

# MESSAGE SERIALIZER
# Used when: Police and citizens exchange messages about an incident report
# Input/Output: All message fields (sender ID, content, timestamp, etc.)
# Flow: Citizen sends → message saved → police reads → police replies
class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        # Include all fields for complete message data
        fields = '__all__'
        # These are automatically set by the system (can't be manually edited)
        # Mark report as read-only so nested route provides it; avoid validation errors on POST
        read_only_fields = ('message_id', 'timestamp', 'report')

    def validate_sender_type(self, value):
        if value.lower() == "police":
            return "police"
        raise ValidationError("Invalid sender_type. Only 'police' is allowed.")

# ============================================================================
# CHECKPOINT SERIALIZER
# ============================================================================

# CHECKPOINT SERIALIZER
# Used when: Admin creates/views police checkpoints and patrol locations
# Input: Checkpoint name, location, time range, assigned officers
# Output: Same data plus office name (for readability instead of office ID)
class CheckpointSerializer(serializers.ModelSerializer):
    # Include the related office name instead of just the office ID
    # Makes the response more human-readable for admin interface
    office_name = serializers.CharField(source='office.office_name', read_only=True)
    
    # Override assigned_officers to accept both array and string during input
    assigned_officers = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        write_only=True  # Only for input; output handled by to_representation
    )

    class Meta:
        model = Checkpoint
        # Include all checkpoint fields
        fields = '__all__'
        # These are auto-generated or managed by the system
        read_only_fields = ('checkpoint_id', 'created_at', 'office_name')
        # Note: The office_id (foreign key) is provided in the request body

    def to_representation(self, instance):
        data = super().to_representation(instance)
        raw = instance.assigned_officers or ''
        # return array to frontend; stored as comma-separated text
        data['assigned_officers'] = [s.strip() for s in raw.split(',') if s.strip()]
        return data

    def _serialize_officers(self, value):
        # accept list or string; store as comma-separated string
        if isinstance(value, list):
            cleaned = [str(v).strip() for v in value if str(v).strip()]
            return ', '.join(cleaned)
        if isinstance(value, str):
            return value
        return ''

    def create(self, validated_data):
        if 'assigned_officers' in self.initial_data:
            validated_data['assigned_officers'] = self._serialize_officers(self.initial_data.get('assigned_officers'))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'assigned_officers' in self.initial_data:
            validated_data['assigned_officers'] = self._serialize_officers(self.initial_data.get('assigned_officers'))
        return super().update(instance, validated_data)

# ============================================================================
# MEDIA SERIALIZER (File Upload)
# ============================================================================

# MEDIA SERIALIZER
# Used when: Citizens/police upload photos or videos as evidence for a report
# Input: File (image/video), report ID, file type, uploader ID
# Process: Upload file to Supabase cloud storage, save URL in database
# Output: File URL and metadata (ID, upload time, file type)
class MediaSerializer(serializers.ModelSerializer):
    # Define 'uploaded_file' as write-only (input only, not in response)
    # This is the actual file data the client sends
    # In the database, we only store the file_url (link to the file)
    uploaded_file = serializers.FileField(write_only=True) 

    class Meta:
        model = Media
        # 'uploaded_file' is for input; 'file_url' is what gets stored/returned
        fields = ('media_id', 'file_url', 'report', 'file_type', 'sender_id', 'uploaded_at', 'uploaded_file') 
        # System-managed fields (can't be edited by client)
        read_only_fields = ('media_id', 'uploaded_at', 'file_url')

    def validate_file_type(self, value):
        v = (value or '').lower().strip()
        if v not in ('image', 'video'):
            raise ValidationError("Invalid file_type. Must be 'image' or 'video'.")
        return v

    def create(self, validated_data):
        """
        Upload the file bytes to Supabase Storage, store the resulting URL in tbl_media.file_url,
        and create the Media row.

        Expected request (multipart/form-data):
        - uploaded_file: file
        - report: report_id (UUID)
        - file_type: 'image' | 'video'
        - sender_id: UUID (police office id)
        """
        uploaded_file = validated_data.pop('uploaded_file', None)
        if uploaded_file is None:
            raise ValidationError({"uploaded_file": "This field is required."})

        limits = get_media_limits()
        max_bytes = limits["max_bytes"]

        # Validate file size (protect free hosting)
        if getattr(uploaded_file, 'size', 0) and uploaded_file.size > max_bytes:
            max_mb = int(max_bytes / (1024 * 1024))
            raise ValidationError({"uploaded_file": f"File too large. Max size is {max_mb}MB per file."})

        # Validate content-type matches file_type
        file_type = (validated_data.get('file_type') or '').lower().strip()
        content_type = (getattr(uploaded_file, 'content_type', '') or '').lower()
        if file_type == 'image' and not content_type.startswith('image/'):
            raise ValidationError({"uploaded_file": "File must be an image."})
        if file_type == 'video' and not content_type.startswith('video/'):
            raise ValidationError({"uploaded_file": "File must be a video."})

        report_obj = validated_data.get('report')
        if not report_obj:
            raise ValidationError({"report": "Report is required."})

        # Enforce per-report quantity limits (even if client uploads files one-by-one)
        max_images = limits["max_images"]
        max_videos = limits["max_videos"]
        existing_images = Media.objects.filter(report=report_obj, file_type='image').count()
        existing_videos = Media.objects.filter(report=report_obj, file_type='video').count()
        if file_type == 'image' and existing_images >= max_images:
            raise ValidationError({"uploaded_file": f"Too many images for this report. Max is {max_images} images."})
        if file_type == 'video' and existing_videos >= max_videos:
            raise ValidationError({"uploaded_file": f"Too many videos for this report. Max is {max_videos} videos."})

        # Build storage path
        # Use the same UUID for BOTH:
        # - tbl_media.media_id (database row)
        # - the filename in storage
        # This makes it easy for admins to search/correlate in Supabase (DB ↔ Storage)
        media_id = uuid.uuid4()
        orig_name = getattr(uploaded_file, 'name', '') or 'upload'
        _, ext = os.path.splitext(orig_name)
        ext = (ext or '').lower()
        safe_ext = ext if len(ext) <= 10 else ''
        file_name = f"{media_id.hex}{safe_ext}"
        storage_path = f"reports/{report_obj.report_id}/{file_type}/{file_name}"

        bucket = os.getenv('SUPABASE_MEDIA_BUCKET', 'crash-media')

        # Upload to Supabase Storage
        try:
            file_bytes = uploaded_file.read()
            supabase = get_supabase_client()
            res = supabase.storage.from_(bucket).upload(
                storage_path,
                file_bytes,
                file_options={
                    "content-type": content_type or "application/octet-stream",
                    "upsert": False,
                },
            )
            # Some supabase versions return dict with 'error'
            if isinstance(res, dict) and res.get('error'):
                raise Exception(res.get('error'))
        except Exception as e:
            msg = str(e)
            if 'Bucket not found' in msg:
                raise ValidationError(
                    {"uploaded_file": f"Supabase bucket '{bucket}' not found. Create it in Supabase Storage (and make it public), then try again."}
                )
            raise ValidationError({"uploaded_file": f"Upload failed: {e}"})

        # Get URL (public if bucket is public). If bucket is private, you can switch to signed URLs later.
        try:
            supabase = get_supabase_client()
            public_url = supabase.storage.from_(bucket).get_public_url(storage_path)
            if isinstance(public_url, dict):
                public_url = public_url.get('publicUrl') or public_url.get('public_url')
            if not public_url:
                raise Exception("Unable to generate public URL.")
        except Exception as e:
            raise ValidationError({"uploaded_file": f"Upload succeeded but URL generation failed: {e}"})

        validated_data['file_url'] = public_url
        validated_data['media_id'] = media_id
        return Media.objects.create(**validated_data)


# ============================================================================
# SUMMARY ANALYTICS SERIALIZER (Cached Statistics)
# ============================================================================

# SUMMARY ANALYTICS SERIALIZER
# Used when: Analytics dashboard needs quick access to crime statistics (pre-calculated)
# Input: Location (city/barangay), category, report count
# Purpose: Provides cached summary data so dashboard loads instantly (no complex queries needed)
# Note: These records are auto-generated by caching system, rarely created manually
class SummaryAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SummaryAnalytics
        # Include all cached statistics fields
        fields = '__all__'
        # All fields are system-managed (updated by cache job, not by API requests)
        read_only_fields = ('summary_id', 'report_count', 'last_updated')