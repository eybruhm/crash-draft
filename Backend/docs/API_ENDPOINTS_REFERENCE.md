# CRASH Backend – API Endpoints Reference
## Police Web Dashboard Integration Guide

**Base URL**: `http://localhost:8000/api` (development)  
**Production**: `https://your-backend-domain.com/api`

---

## 🔐 Authentication Endpoints

### POST `/auth/login/`
**Purpose**: Police officer login  
**Access**: Public (no token required)

**Request**:
```json
{
  "email": "officer@crash.gov",
  "password": "testpass"
}
```

**Response (200 OK)**:
```json
{
  "message": "Police login successful",
  "role": "police",
  "user": {
    "office_id": "550e8400-e29b-41d4-a716-446655440000",
    "office_name": "Manila Police Station",
    "email": "officer@crash.gov",
    "head_officer": "Chief Rodriguez",
    "contact_number": "+63 2 8523 4567"
  },
  "token": "DUMMY_POLICE_TOKEN"
}
```

**Error (401 Unauthorized)**:
```json
{
  "detail": "Invalid credentials."
}
```

---

## 📋 Reports Endpoints

### GET `/reports/`
**Purpose**: Fetch all active reports (excludes resolved/canceled)  
**Access**: Authenticated (include token in header)  
**Auth Header**: `Authorization: Bearer <token>`

**Query Parameters**:
- `status` (optional): Filter by status (pending, acknowledged, en-route)
- `category` (optional): Filter by crime type (e.g., Robbery, Theft)

**Response (200 OK)**:
```json
[
  {
    "report_id": "550e8400-e29b-41d4-a716-446655440001",
    "category": "Robbery",
    "status": "pending",
    "created_at": "2025-12-08T10:30:00Z",
    "latitude": 14.5995,
    "longitude": 120.9842,
    "description": "Suspicious activity near park",
    "assigned_office_name": "Manila Police Station",
    "reporter_full_name": "John Doe",
    "incident_address": "Malate, Manila"
  }
]
```

---

### POST `/reports/`
**Purpose**: Create a new report (citizen submission)  
**Access**: Authenticated

**Request**:
```json
{
  "category": "Robbery",
  "description": "Robbery at Rizal Park",
  "latitude": 14.5995,
  "longitude": 120.9842,
  "reporter": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Response (201 Created)**:
```json
{
  "report_id": "550e8400-e29b-41d4-a716-446655440003",
  "category": "Robbery",
  "status": "pending",
  "created_at": "2025-12-08T10:30:00Z",
  "location_city": "Manila",
  "location_barangay": "Malate",
  "assigned_office_name": "Manila Police Station"
}
```

---

### GET `/reports/{report_id}/`
**Purpose**: Fetch a single report with full details  
**Access**: Authenticated

**Response (200 OK)**:
```json
{
  "report_id": "550e8400-e29b-41d4-a716-446655440001",
  "category": "Robbery",
  "status": "pending",
  "created_at": "2025-12-08T10:30:00Z",
  "latitude": 14.5995,
  "longitude": 120.9842,
  "description": "Suspicious activity near park",
  "assigned_office_name": "Manila Police Station",
  "reporter_full_name": "John Doe",
  "reporter": {
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "email": "john@example.com",
    "phone": "+63 912 345 6789",
    "first_name": "John",
    "last_name": "Doe",
    "emergency_contact_name": "Jane Doe",
    "emergency_contact_number": "+63 912 345 6790"
  },
  "incident_address": "Malate, Manila"
}
```

---

### PATCH `/reports/{report_id}/`
**Purpose**: Update report status (police action)  
**Access**: Authenticated

**Request**:
```json
{
  "status": "acknowledged",
  "remarks": "Officers dispatched to location"
}
```

**Status Options**:
- `pending` - Initial state
- `acknowledged` - Police received report
- `en-route` - Officers traveling to scene
- `resolved` - Incident resolved
- `canceled` - Report canceled

**Response (200 OK)**:
```json
{
  "report_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "acknowledged",
  "remarks": "Officers dispatched to location",
  "updated_at": "2025-12-08T10:35:00Z"
}
```

---

### GET `/reports/{report_id}/route/`
**Purpose**: Generate directions from police office to incident location  
**Access**: Authenticated

**Response (200 OK)**:
```json
{
  "directions_url": "https://www.google.com/maps/dir/14.5995,120.9842/14.6015,120.9862",
  "qr_code_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

### GET `/reports/resolved/`
**Purpose**: Fetch all resolved reports (for audit page)  
**Access**: Authenticated

**Query Parameters**:
- `days` (optional, default: 30): Timeframe in days
- `scope` (optional): 'our_office' or 'all'
- `office_id` (optional): Filter by specific office
- `city` (optional): Filter by city
- `barangay` (optional): Filter by barangay
- `category` (optional): Filter by crime category

**Response (200 OK)**:
```json
{
  "filters": {
    "days": 30,
    "scope": "all",
    "office_id": null,
    "city": null,
    "barangay": null,
    "category": null
  },
  "count": 15,
  "results": [
    {
      "report_id": "550e8400-e29b-41d4-a716-446655440010",
      "category": "Robbery",
      "created_at": "2025-12-01T10:30:00Z",
      "updated_at": "2025-12-01T14:30:00Z",
      "location_city": "Manila",
      "location_barangay": "Malate",
      "remarks": "Suspects apprehended",
      "resolution_time_str": "4h 00m 00s"
    }
  ]
}
```

---

### GET `/reports/resolved/export/`
**Purpose**: Export resolved cases as PDF  
**Access**: Authenticated

**Query Parameters**: Same as `/reports/resolved/`

**Response**: PDF file (Content-Type: application/pdf)

---

### GET `/reports/{report_id}/export/`
**Purpose**: Export single resolved case as detailed PDF  
**Access**: Authenticated

**Response**: PDF file (Content-Type: application/pdf)

---

## 💬 Messages Endpoints

### GET `/reports/{report_id}/messages/`
**Purpose**: Fetch all messages for a report  
**Access**: Authenticated

**Response (200 OK)**:
```json
[
  {
    "message_id": "550e8400-e29b-41d4-a716-446655440020",
    "report_id": "550e8400-e29b-41d4-a716-446655440001",
    "sender_id": "550e8400-e29b-41d4-a716-446655440002",
    "sender_type": "user",
    "receiver_id": "550e8400-e29b-41d4-a716-446655440000",
    "message_content": "Officers are on their way",
    "timestamp": "2025-12-08T10:35:00Z"
  }
]
```

---

### POST `/reports/{report_id}/messages/`
**Purpose**: Send a message for a report  
**Access**: Authenticated

**Request**:
```json
{
  "sender_id": "550e8400-e29b-41d4-a716-446655440000",
  "sender_type": "police",
  "receiver_id": "550e8400-e29b-41d4-a716-446655440002",
  "message_content": "Officers dispatched to your location"
}
```

**Response (201 Created)**:
```json
{
  "message_id": "550e8400-e29b-41d4-a716-446655440021",
  "report_id": "550e8400-e29b-41d4-a716-446655440001",
  "sender_type": "police",
  "message_content": "Officers dispatched to your location",
  "timestamp": "2025-12-08T10:35:00Z"
}
```

---

## 🛣️ Checkpoint Endpoints

### GET `/checkpoints/`
**Purpose**: Fetch all police checkpoints  
**Access**: Authenticated

**Response (200 OK)**:
```json
[
  {
    "checkpoint_id": "550e8400-e29b-41d4-a716-446655440030",
    "checkpoint_name": "EDSA Checkpoint Alpha",
    "office_id": "550e8400-e29b-41d4-a716-446655440000",
    "office_name": "Manila Police Station",
    "latitude": 14.6042,
    "longitude": 120.9822,
    "time_start": "06:00:00",
    "time_end": "22:00:00",
    "assigned_officers": "Officer John, Officer Maria",
    "contact_number": "+63 2 8845 1234",
    "created_at": "2025-12-08T08:00:00Z"
  }
]
```

---

### GET `/checkpoints/active/`
**Purpose**: Fetch only currently active checkpoints (based on time)  
**Access**: Authenticated

**Response (200 OK)**:
```json
[
  {
    "checkpoint_id": "550e8400-e29b-41d4-a716-446655440030",
    "checkpoint_name": "EDSA Checkpoint Alpha",
    "office_name": "Manila Police Station",
    "latitude": 14.6042,
    "longitude": 120.9822,
    "time_start": "06:00:00",
    "time_end": "22:00:00",
    "assigned_officers": "Officer John, Officer Maria",
    "contact_number": "+63 2 8845 1234"
  }
]
```

---

### POST `/checkpoints/`
**Purpose**: Create a new checkpoint  
**Access**: Authenticated

**Request**:
```json
{
  "checkpoint_name": "New Checkpoint",
  "office": "550e8400-e29b-41d4-a716-446655440000",
  "latitude": 14.6042,
  "longitude": 120.9822,
  "time_start": "08:00:00",
  "time_end": "20:00:00",
  "assigned_officers": "Officer Pedro",
  "contact_number": "+63 2 8845 1234"
}
```

**Response (201 Created)**:
```json
{
  "checkpoint_id": "550e8400-e29b-41d4-a716-446655440031",
  "checkpoint_name": "New Checkpoint",
  "office_name": "Manila Police Station",
  "latitude": 14.6042,
  "longitude": 120.9822,
  "time_start": "08:00:00",
  "time_end": "20:00:00",
  "assigned_officers": "Officer Pedro",
  "contact_number": "+63 2 8845 1234",
  "created_at": "2025-12-08T10:40:00Z"
}
```

---

### PATCH `/checkpoints/{checkpoint_id}/`
**Purpose**: Update checkpoint details  
**Access**: Authenticated

**Request**:
```json
{
  "checkpoint_name": "Updated Checkpoint Name",
  "time_start": "07:00:00",
  "time_end": "21:00:00"
}
```

**Response (200 OK)**:
```json
{
  "checkpoint_id": "550e8400-e29b-41d4-a716-446655440031",
  "checkpoint_name": "Updated Checkpoint Name",
  "time_start": "07:00:00",
  "time_end": "21:00:00"
}
```

---

### DELETE `/checkpoints/{checkpoint_id}/`
**Purpose**: Delete a checkpoint  
**Access**: Authenticated

**Response (204 No Content)**: Empty response

---

## 📊 Analytics Endpoints

### GET `/analytics/summary/overview/`
**Purpose**: Get summary statistics (total reports, avg resolution time)  
**Access**: Authenticated

**Query Parameters**:
- `days` (optional, default: 30): Timeframe
- `scope` (optional): 'our_office' or 'all'
- `office_id` (optional): Specific office ID
- `city` (optional): Filter by city
- `barangay` (optional): Filter by barangay
- `category` (optional): Filter by crime category

**Response (200 OK)**:
```json
{
  "filters": {
    "days": 30,
    "scope": "all",
    "office_id": null,
    "city": null,
    "barangay": null,
    "category": null
  },
  "total_assigned": 150,
  "average_resolution_time": "2d 03:45:30"
}
```

---

### GET `/analytics/hotspots/locations/`
**Purpose**: Get top locations by crime count  
**Access**: Authenticated

**Query Parameters**: Same as `/analytics/summary/overview/`

**Response (200 OK)**:
```json
{
  "filters": {...},
  "total_resolved": 150,
  "results": [
    {
      "location_city": "Manila",
      "location_barangay": "Malate",
      "report_count": 45,
      "report_percent": 30.0
    },
    {
      "location_city": "Quezon City",
      "location_barangay": "Diliman",
      "report_count": 38,
      "report_percent": 25.3
    }
  ]
}
```

---

### GET `/analytics/hotspots/categories/`
**Purpose**: Get crime categories by frequency  
**Access**: Authenticated

**Query Parameters**: Same as `/analytics/summary/overview/`

**Response (200 OK)**:
```json
{
  "filters": {...},
  "total_resolved": 150,
  "results": [
    {
      "category": "Robbery",
      "report_count": 65,
      "percentage": 43.3
    },
    {
      "category": "Theft",
      "report_count": 52,
      "percentage": 34.7
    }
  ]
}
```

---

### GET `/analytics/export/`
**Purpose**: Export full analytics report as PDF  
**Access**: Authenticated

**Query Parameters**: Same as `/analytics/summary/overview/`

**Response**: PDF file (Content-Type: application/pdf)

---

## 📁 Media Endpoints

### GET `/media/`
**Purpose**: Fetch all media files  
**Access**: Authenticated

**Query Parameters**:
- `report_id` (optional): Filter by report

**Response (200 OK)**:
```json
[
  {
    "media_id": "550e8400-e29b-41d4-a716-446655440040",
    "file_url": "https://your-supabase-url/storage/v1/object/public/crash-media/reports/...",
    "file_type": "image",
    "report_id": "550e8400-e29b-41d4-a716-446655440001",
    "sender_id": "550e8400-e29b-41d4-a716-446655440002",
    "uploaded_at": "2025-12-08T10:30:00Z"
  }
]
```

---

### POST `/media/`
**Purpose**: Upload a media file (image/video)  
**Access**: Authenticated

**Upload Rules (Enforced by Backend)**:
- Max **3 images** per report
- Max **2 videos** per report
- Max **15MB per file** (hardcoded in backend)

**Request** (multipart/form-data):
```
uploaded_file: <binary file>
report: 550e8400-e29b-41d4-a716-446655440001
file_type: image
sender_id: 550e8400-e29b-41d4-a716-446655440002
```

**Response (201 Created)**:
```json
{
  "media_id": "550e8400-e29b-41d4-a716-446655440041",
  "file_url": "https://your-supabase-url/storage/v1/object/public/crash-media/reports/...",
  "file_type": "image",
  "report_id": "550e8400-e29b-41d4-a716-446655440001",
  "uploaded_at": "2025-12-08T10:40:00Z"
}
```

---

## 🗺️ Admin Map Endpoint

### GET `/admin/map/data/`
**Purpose**: Fetch data for admin map (reports + offices + checkpoints)  
**Access**: Authenticated

**Response (200 OK)**:
```json
{
  "reports": [
    {
      "report_id": "550e8400-e29b-41d4-a716-446655440001",
      "status": "pending",
      "category": "Robbery",
      "latitude": 14.5995,
      "longitude": 120.9842,
      "created_at": "2025-12-08T10:30:00Z"
    }
  ],
  "offices": [
    {
      "office_id": "550e8400-e29b-41d4-a716-446655440000",
      "office_name": "Manila Police Station",
      "latitude": 14.5995,
      "longitude": 120.9842"
    }
  ],
  "checkpoints": [
    {
      "checkpoint_id": "550e8400-e29b-41d4-a716-446655440030",
      "checkpoint_name": "EDSA Checkpoint Alpha",
      "latitude": 14.6042,
      "longitude": 120.9822",
      "time_start": "06:00:00",
      "time_end": "22:00:00"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "field_name": ["Error description"]
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid credentials."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error."
}
```

---

## Frontend Integration Checklist

- [ ] User can login with email/password
- [ ] Token is stored in localStorage
- [ ] Token is sent in all API requests
- [ ] Dashboard loads and displays active reports
- [ ] Clicking "View" shows report details
- [ ] Status update works (pending → acknowledged → en-route → resolved)
- [ ] Chat messages load and can be sent
- [ ] Directions modal shows Google Maps link + QR code
- [ ] Map loads and displays checkpoints
- [ ] Checkpoint CRUD (create, edit, delete) works
- [ ] Analytics pages load with correct data
- [ ] Filter parameters work correctly
- [ ] PDF exports work
- [ ] Real-time data updates (via polling)

---

## Quick Testing with cURL

**Login**:
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@crash.ph","password":"testpass"}'
```

**Get Reports**:
```bash
curl -X GET http://localhost:8000/api/reports/ \
  -H "Authorization: Bearer <token>"
```

**Create Checkpoint**:
```bash
curl -X POST http://localhost:8000/api/checkpoints/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "checkpoint_name": "Test",
    "office": "550e8400-e29b-41d4-a716-446655440000",
    "latitude": 14.6042,
    "longitude": 120.9822,
    "time_start": "08:00:00",
    "time_end": "20:00:00"
  }'
```

---

**Version**: 1.0  
**Last Updated**: December 8, 2025  
**Status**: Ready for Frontend Integration
