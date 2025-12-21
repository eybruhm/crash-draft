# ============================================================================
# MOBILE (CITIZEN) VIEWS
# - These endpoints are used by the mobile app (citizens).
# - For now, this provides a "create report with optional media" endpoint so you
#   can test end-to-end using Postman, matching your Mobile Sitemap/Flow.
#
# NOTE: In Day 6.5 we will secure these endpoints using Supabase Auth tokens.
# ============================================================================

import os
import uuid

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError

from ..models import Report, Media, PoliceOffice, User
from ..services import reverse_geocode, find_nearest_office, get_media_limits
from ..serializers import get_supabase_client


class MobileCreateReportWithMediaAPIView(APIView):
    """
    ENDPOINT: POST /mobile/reports/

    Purpose:
    - Create a report (tbl_reports) and optionally upload evidence media (tbl_media)
      in ONE request.

    Auth:
    - Temporarily public for local Postman testing.
    - In Day 6.5, we will require a valid Supabase Auth token.

    Request (multipart/form-data):
    - reporter: UUID (tbl_users.user_id)
    - category: string (required; e.g., Emergency, Theft)
    - latitude: decimal (required)
    - longitude: decimal (required)
    - description: string (optional)
    - uploaded_file: file (optional) OR uploaded_files: multiple files (optional)
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        reporter_id = request.data.get('reporter')
        category = request.data.get('category')
        description = request.data.get('description') or None
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        if not reporter_id or not category or latitude is None or longitude is None:
            return Response(
                {"detail": "Missing required fields: reporter, category, latitude, longitude"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reporter_uuid = uuid.UUID(str(reporter_id))
        except Exception:
            return Response({"detail": "Invalid reporter UUID"}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure reporter exists
        if not User.objects.filter(user_id=reporter_uuid).exists():
            return Response({"detail": "Reporter not found in tbl_users"}, status=status.HTTP_404_NOT_FOUND)

        uploaded = []
        files = []
        if 'uploaded_files' in request.FILES:
            files = request.FILES.getlist('uploaded_files')
        elif 'uploaded_file' in request.FILES:
            files = [request.FILES['uploaded_file']]

        bucket = os.getenv('SUPABASE_MEDIA_BUCKET', 'crash-media')
        limits = get_media_limits()
        max_bytes = limits["max_bytes"]
        max_images = limits["max_images"]
        max_videos = limits["max_videos"]

        # Validate ALL files first (so we don't create a report if the media is invalid)
        images_count = 0
        videos_count = 0
        normalized = []  # list of dicts: {file, file_type, content_type}
        for f in files:
            # Size limit
            if getattr(f, 'size', 0) and f.size > max_bytes:
                max_mb = int(max_bytes / (1024 * 1024))
                return Response(
                    {"detail": f"File too large. Max size is {max_mb}MB per file."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            content_type = (getattr(f, 'content_type', '') or '').lower()
            if content_type.startswith('image/'):
                file_type = 'image'
                images_count += 1
            elif content_type.startswith('video/'):
                file_type = 'video'
                videos_count += 1
            else:
                return Response(
                    {"detail": "Only image/video files are allowed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            normalized.append({"file": f, "file_type": file_type, "content_type": content_type})

        if images_count > max_images or videos_count > max_videos:
            return Response(
                {"detail": f"Too many media files. Max is {max_images} images and {max_videos} videos per report."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Geocode + assign nearest office (same idea as ReportViewSet.perform_create)
        location_city, location_barangay = reverse_geocode(latitude, longitude)
        assigned_office = find_nearest_office(latitude, longitude) or PoliceOffice.objects.all().first()

        report = Report.objects.create(
            reporter_id=reporter_uuid,
            assigned_office=assigned_office,
            category=category,
            description=description,
            latitude=latitude,
            longitude=longitude,
            location_city=location_city,
            location_barangay=location_barangay,
        )

        for item in normalized:
            f = item["file"]
            file_type = item["file_type"]
            content_type = item["content_type"]

            # Storage path
            orig_name = getattr(f, 'name', '') or 'upload'
            _, ext = os.path.splitext(orig_name)
            ext = (ext or '').lower()
            safe_ext = ext if len(ext) <= 10 else ''
            media_id = uuid.uuid4()
            file_name = f"{media_id.hex}{safe_ext}"
            storage_path = f"reports/{report.report_id}/{file_type}/{file_name}"

            # Upload bytes
            try:
                supabase = get_supabase_client()
                res = supabase.storage.from_(bucket).upload(
                    storage_path,
                    f.read(),
                    file_options={
                        "content-type": content_type or "application/octet-stream",
                        "upsert": False,
                    },
                )
                if isinstance(res, dict) and res.get('error'):
                    raise Exception(res.get('error'))
            except Exception as e:
                msg = str(e)
                if 'Bucket not found' in msg:
                    return Response(
                        {"detail": f"Supabase bucket '{bucket}' not found. Create it in Supabase Storage (and make it public), then try again."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                raise ValidationError({"uploaded_file": f"Upload failed: {e}"})

            # URL
            supabase = get_supabase_client()
            public_url = supabase.storage.from_(bucket).get_public_url(storage_path)
            if isinstance(public_url, dict):
                public_url = public_url.get('publicUrl') or public_url.get('public_url')

            media_row = Media.objects.create(
                media_id=media_id,
                report=report,
                file_url=public_url,
                file_type=file_type,
                sender_id=reporter_uuid,
            )

            uploaded.append(
                {
                    "media_id": str(media_row.media_id),
                    "file_url": media_row.file_url,
                    "file_type": media_row.file_type,
                }
            )

        return Response(
            {
                "report_id": str(report.report_id),
                "assigned_office_id": str(report.assigned_office_id) if report.assigned_office_id else None,
                "location_city": report.location_city,
                "location_barangay": report.location_barangay,
                "media": uploaded,
            },
            status=status.HTTP_201_CREATED,
        )


