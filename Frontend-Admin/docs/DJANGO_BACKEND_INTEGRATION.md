# Django Backend Integration Guide

This guide will help you integrate your Django REST Framework backend with the React frontend application.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [CORS Configuration](#cors-configuration)
3. [Environment Variables](#environment-variables)
4. [Axios Setup](#axios-setup)
5. [API Client Configuration](#api-client-configuration)
6. [Endpoint Mapping](#endpoint-mapping)
7. [Step-by-Step Integration](#step-by-step-integration)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Frontend Dependencies
✅ **Axios is already installed** (`package.json` shows `axios: ^1.4.0`)

### Backend Requirements
- Django REST Framework backend running
- CORS middleware configured
- Authentication system (token-based or session-based)
- All endpoints from `urls.py` accessible

---

## CORS Configuration

### Django Backend Setup

Add CORS headers to your Django `settings.py`:

```python
# settings.py

INSTALLED_APPS = [
    # ... other apps
    'corsheaders',  # Add this
    # ... rest of apps
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add this at the top
    'django.middleware.common.CommonMiddleware',
    # ... rest of middleware
]

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server default port
    "http://localhost:3000",   # Alternative port
    "http://127.0.0.1:5173",
    # Add your production frontend URL here
]

# Allow credentials (cookies, authorization headers)
CORS_ALLOW_CREDENTIALS = True

# Allowed headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Allowed methods
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
```

**Alternative: Allow all origins (development only)**
```python
# ⚠️ ONLY FOR DEVELOPMENT - Remove in production
CORS_ALLOW_ALL_ORIGINS = True
```

### Install django-cors-headers (if not installed)
```bash
pip install django-cors-headers
```

---

## Environment Variables

### Frontend (.env file)

Create a `.env` file in the root of your frontend project:

```env
# Django Backend API Base URL
VITE_API_BASE_URL=http://localhost:8000/api

# Google Maps API Key (already configured)
VITE_GOOGLE_API_KEY=your_google_maps_api_key_here
```

**Note**: Vite requires the `VITE_` prefix for environment variables to be accessible in the frontend.

### Backend (.env or settings.py)

Ensure your Django backend is configured with:
- Database settings
- Secret key
- Allowed hosts
- CORS settings (as shown above)

---

## Axios Setup

Axios is already installed in the project. You'll use it to make HTTP requests to your Django backend.

### Why Axios?
- ✅ Built-in request/response interceptors
- ✅ Automatic JSON parsing
- ✅ Better error handling
- ✅ Request/response transformation
- ✅ Already in dependencies

---

## API Client Configuration

### Step 1: Create API Client File

Create `src/config/apiClient.js`:

```javascript
import axios from 'axios'
import { API_BASE_URL } from '../constants'
import { getStoredToken } from '../utils/auth'

/**
 * Axios instance configured for Django REST Framework backend
 * 
 * Features:
 * - Automatic base URL from environment variable
 * - Automatic token injection from sessionStorage
 * - Automatic error handling for 401 (unauthorized)
 * - Request/response interceptors
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to true if using cookies for auth
})

/**
 * Request Interceptor
 * Automatically adds authentication token to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      // OR if using Django's token authentication:
      // config.headers.Authorization = `Token ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response Interceptor
 * Handles common errors and auto-logout on 401
 */
apiClient.interceptors.response.use(
  (response) => {
    // Successful response - return as-is
    return response
  },
  (error) => {
    // Handle specific error codes
    if (error.response?.status === 401) {
      // Unauthorized - clear storage and redirect to login
      sessionStorage.removeItem('crash_admin_user')
      sessionStorage.removeItem('crash_admin_token')
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error('Access forbidden')
    } else if (error.response?.status === 404) {
      // Not found
      console.error('Resource not found')
    } else if (error.response?.status === 500) {
      // Server error
      console.error('Server error')
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
```

---

## Endpoint Mapping

### Django Backend Endpoints → Frontend Functions

| Django Endpoint | Method | Frontend Function | File Location |
|----------------|--------|-------------------|---------------|
| `/api/auth/login/` | POST | `api.loginAdmin()` | `src/services/api.js` |
| `/api/admin/police-offices/` | GET | `api.listPolice()` | `src/services/api.js` |
| `/api/admin/police-offices/` | POST | `api.addPolice()` | `src/services/api.js` |
| `/api/admin/police-offices/{id}/` | GET | (Not used) | - |
| `/api/admin/police-offices/{id}/` | PUT | `api.updatePolice()` | `src/services/api.js` |
| `/api/admin/police-offices/{id}/` | DELETE | `api.removePolice()` | `src/services/api.js` |
| `/api/admin/map/data/` | GET | `api.getMapData()` | `src/services/api.js` (NEW) |
| `/api/reports/` | GET | (Not used yet) | - |
| `/api/reports/` | POST | `api.createReport()` | `src/services/api.js` |
| `/api/reports/resolved/` | GET | (Not used yet) | - |
| `/api/analytics/summary/overview/` | GET | (Not used yet) | - |
| `/api/analytics/hotspots/locations/` | GET | (Not used yet) | - |
| `/api/analytics/hotspots/categories/` | GET | (Not used yet) | - |

---

## Step-by-Step Integration

### Step 1: Update Constants

Update `src/constants/index.js`:

```javascript
// Change the default API_BASE_URL to match your Django backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
```

**Note**: Django typically runs on port 8000, not 3000.

### Step 2: Create API Client

Create `src/config/apiClient.js` using the code provided in the [API Client Configuration](#api-client-configuration) section above.

### Step 3: Update API Service

Open `src/services/api.js` and replace each mock function with real API calls. See the detailed comments in the file for exact endpoint mappings.

**Key Changes:**

1. **Import apiClient** at the top:
```javascript
import apiClient from '../config/apiClient'
```

2. **Replace each function** - See the inline comments in `api.js` for exact mappings.

### Step 4: Update Authentication Response Handling

The Django backend may return a different response structure. Update the login handler:

**In `src/pages/Login.jsx`:**
```javascript
async function handleSubmit(e) {
  e.preventDefault()
  setLoading(true)
  setError('')
  try {
    const response = await api.loginAdmin({ usernameOrEmail: username, password })
    
    // Django may return: { user: {...}, token: "..." }
    // OR: { access: "...", refresh: "..." } for JWT
    // Adjust based on your backend response structure
    
    const user = response.user || response  // Adjust based on your backend
    const token = response.token || response.access  // Adjust based on your backend
    
    if (token) {
      storeToken(token)  // Store token in sessionStorage
    }
    storeUser(user)  // Store user data
    
    navigate(ROUTES.DASHBOARD)
  } catch (err) {
    setError(getErrorMessage(err))
  } finally {
    setLoading(false)
  }
}
```

### Step 5: Handle Response Data Structure

Django REST Framework typically wraps responses. You may need to adjust:

```javascript
// If Django returns: { "results": [...] } for list views
listPolice() {
  return apiClient.get('/admin/police-offices/')
    .then(res => res.data.results || res.data)  // Handle pagination
}

// If Django returns: { "data": {...} }
// Use: res.data.data or res.data
```

### Step 6: Update Dashboard Map Data

The Dashboard currently uses `api.listPolice()` for map markers. You may want to use the dedicated map endpoint:

**Add to `src/services/api.js`:**
```javascript
/**
 * API ENDPOINT: GET /admin/map/data/
 * Fetch map data (reports + offices + checkpoints)
 * Django Endpoint: AdminMapAPIView
 */
getMapData() {
  return apiClient.get('/admin/map/data/')
    .then(res => res.data)
}
```

**Update `src/pages/Dashboard.jsx`:**
```javascript
// Option 1: Use dedicated map endpoint
useEffect(() => {
  api.getMapData()
    .then((data) => {
      // data.offices, data.reports, data.checkpoints
      setPolice(data.offices || [])
    })
    .catch((err) => {
      console.error('[Dashboard] Error loading map data:', err)
    })
}, [])

// Option 2: Continue using listPolice (if it returns same data)
```

---

## Testing

### 1. Start Django Backend
```bash
cd your-django-project
python manage.py runserver
# Backend should be running on http://localhost:8000
```

### 2. Start Frontend
```bash
cd crash-admin-side
npm run dev
# Frontend should be running on http://localhost:5173
```

### 3. Test Each Endpoint

**Login Test:**
1. Open browser DevTools (F12) → Network tab
2. Go to Login page
3. Enter credentials
4. Check Network tab for `POST /api/auth/login/`
5. Verify response structure matches frontend expectations

**Police Offices Test:**
1. Navigate to Police Account Management page
2. Check Network tab for `GET /api/admin/police-offices/`
3. Verify list displays correctly
4. Try adding a new office
5. Check for `POST /api/admin/police-offices/`

**Map Test:**
1. Navigate to Dashboard
2. Check Network tab for map data requests
3. Verify markers appear on map

### 4. Common Issues to Check

- ✅ CORS errors → Check Django CORS settings
- ✅ 401 Unauthorized → Check token storage and Authorization header
- ✅ 404 Not Found → Check API_BASE_URL and endpoint paths
- ✅ 500 Server Error → Check Django server logs
- ✅ Data structure mismatch → Check response format vs frontend expectations

---

## Troubleshooting

### CORS Errors

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
1. Verify `django-cors-headers` is installed
2. Check `CORS_ALLOWED_ORIGINS` includes your frontend URL
3. Ensure `CorsMiddleware` is at the top of `MIDDLEWARE`
4. Check browser console for specific CORS error details

### 401 Unauthorized

**Error**: `401 Unauthorized` on all requests

**Solution**:
1. Check if token is being stored after login
2. Verify token format in Authorization header
3. Check Django authentication backend configuration
4. Verify token is valid (not expired)

### 404 Not Found

**Error**: `404 Not Found` for API endpoints

**Solution**:
1. Verify `API_BASE_URL` in `.env` file
2. Check Django `urls.py` route patterns
3. Ensure Django server is running
4. Check for trailing slashes (Django may require them)

### Data Structure Mismatch

**Error**: Data not displaying correctly

**Solution**:
1. Check Django response structure in Network tab
2. Adjust frontend code to match backend response
3. Handle pagination if Django uses it (`results` array)
4. Check for nested data structures

### Network Timeout

**Error**: Request timeout

**Solution**:
1. Increase timeout in `apiClient.js`
2. Check Django server performance
3. Verify network connectivity
4. Check for slow database queries

---

## Additional Endpoints (Future Use)

These endpoints are available in your Django backend but not yet used in the frontend:

### Analytics Endpoints
- `GET /api/analytics/summary/overview/` - Dashboard statistics
- `GET /api/analytics/hotspots/locations/` - Top crime locations
- `GET /api/analytics/hotspots/categories/` - Top crime categories
- `GET /api/analytics/export/` - Export analytics PDF

### Reports Endpoints
- `GET /api/reports/` - List all reports
- `GET /api/reports/{id}/` - Get single report
- `GET /api/reports/resolved/` - List resolved cases
- `GET /api/reports/resolved/export/` - Export resolved cases PDF
- `GET /api/reports/{id}/export/` - Export single report PDF

### Messages Endpoints (Nested)
- `GET /api/reports/{report_id}/messages/` - List messages for a report
- `POST /api/reports/{report_id}/messages/` - Create message

### Checkpoints Endpoints
- `GET /api/checkpoints/` - List checkpoints
- `POST /api/checkpoints/` - Create checkpoint
- `GET /api/checkpoints/active/` - List active checkpoints

### Media Endpoints
- `GET /api/media/` - List media files
- `POST /api/media/` - Upload media file

---

## Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use HTTPS in production** - Update `API_BASE_URL` to HTTPS
3. **Store tokens securely** - Consider httpOnly cookies for production
4. **Validate all inputs** - Frontend validation + backend validation
5. **Handle errors gracefully** - Don't expose sensitive error details
6. **Rate limiting** - Implement on backend if needed

---

## Next Steps

1. ✅ Complete CORS configuration
2. ✅ Create API client file
3. ✅ Update API service functions
4. ✅ Test each endpoint
5. ✅ Handle error cases
6. ✅ Update response data handling
7. ⏳ Add analytics endpoints (future)
8. ⏳ Add reports management (future)
9. ⏳ Add checkpoint management (future)

---

## Support

If you encounter issues:
1. Check Django server logs
2. Check browser console for errors
3. Check Network tab for request/response details
4. Verify endpoint URLs match exactly
5. Test endpoints with Postman/curl first

---

**Last Updated**: Based on Django `urls.py` structure provided
**Frontend Version**: React + Vite
**Backend**: Django REST Framework

