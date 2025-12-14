# CRASH Admin Backend Implementation Guide

> ✅ **Frontend is READY for backend integration!** This guide walks you through connecting your backend API.

---

## 📋 Checklist - Frontend Status

- ✅ 8 complete pages with mock API
- ✅ React Router v6 with protected routes (RequireAuth)
- ✅ Dark/private mode UI theme (black-gray with white accents)
- ✅ All API endpoints documented in `API_ENDPOINTS.md`
- ✅ Axios already installed (`package.json`)
- ✅ Mock localStorage backend for testing
- ✅ Session storage for auth persistence
- ✅ Form validation and error handling
- ✅ Responsive Tailwind CSS design
- ✅ All 8 endpoints clearly marked with TODO comments

---

## 🚀 Quick Start: Backend Integration (5 Steps)

### Step 1: Copy `.env.example` to `.env`
```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

### Step 2: Create API Client Configuration
Create `src/config/apiClient.js`:

```javascript
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor: Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('crash_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Interceptor: Handle 401 responses (redirect to login)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('crash_admin_user')
      sessionStorage.removeItem('crash_admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

### Step 3: Update API Service (`src/services/api.js`)

Replace each mock function. Example:

**Before** (Mock):
```javascript
export const api = {
  loginAdmin({ usernameOrEmail, password }) {
    return new Promise((resolve, reject) => {
      // Mock implementation with localStorage
    })
  },
}
```

**After** (Real API):
```javascript
import apiClient from '../config/apiClient'

export const api = {
  loginAdmin({ usernameOrEmail, password }) {
    return apiClient.post('/auth/login', { usernameOrEmail, password })
      .then(res => {
        // Store token if provided by backend
        if (res.data.token) {
          sessionStorage.setItem('crash_admin_token', res.data.token)
        }
        return res.data
      })
  },
  
  getStats() {
    return apiClient.get('/admin/stats')
      .then(res => res.data)
  },
  
  listPolice() {
    return apiClient.get('/police')
      .then(res => res.data)
  },
  
  addPolice(payload) {
    return apiClient.post('/police', payload)
      .then(res => res.data)
  },
  
  removePolice(id) {
    return apiClient.delete(`/police/${id}`)
      .then(res => res.data)
  },
  
  updatePolice(id, updates) {
    return apiClient.put(`/police/${id}`, updates)
      .then(res => res.data)
  },
  
  getAdminProfile(email) {
    return apiClient.get(`/admin/profile/${email}`)
      .then(res => res.data)
  },
  
  changePassword(email, newPassword) {
    return apiClient.post('/admin/change-password', { email, newPassword })
      .then(res => res.data)
  },
}

export default api
```

### Step 4: Update Login Page (`src/pages/Login.jsx`)

After successful login, store the token:

```javascript
// In the handleSubmit function, after successful login:
async function handleSubmit(e) {
  e.preventDefault()
  setLoading(true)
  setError('')
  try {
    const response = await api.loginAdmin({ usernameOrEmail: username, password })
    
    // Store user info
    sessionStorage.setItem('crash_admin_user', JSON.stringify(response))
    
    // Store token if backend provides it
    if (response.token) {
      sessionStorage.setItem('crash_admin_token', response.token)
    }
    
    navigate('/')
  } catch (err) {
    setError(err.message || 'Login failed')
  } finally {
    setLoading(false)
  }
}
```

### Step 5: Test & Debug

```bash
npm run dev
```

- Open DevTools (F12) → Network tab
- Try login with test credentials
- Verify API calls appear in Network tab
- Check response data matches expected structure
- Verify token is stored in sessionStorage

---

## 🔌 Backend API Requirements

Your backend should implement these 8 endpoints:

### Authentication
```
POST /api/auth/login
  Body: { usernameOrEmail, password }
  Response: { id, username, email, contact, createdAt, token? }
```

### Dashboard
```
GET /api/admin/stats
  Response: { totalPolice, totalAdmins, last5: [] }
```

### Admin Profile
```
GET /api/admin/profile/:email
  Response: { id, username, email, contact, createdAt }

POST /api/admin/change-password
  Body: { email, newPassword }
  Response: { success: true }
```

### Police Stations
```
GET /api/police
  Response: [{ id, email, officeName, contact, headName, location, createdAt }]

POST /api/police
  Body: { email, officeName, contact, headName, location }
  Response: { id, email, officeName, contact, headName, location, createdAt, password }

PUT /api/police/:id
  Body: { officeName?, contact?, headName?, location? }
  Response: { id, email, officeName, contact, headName, location, createdAt }

DELETE /api/police/:id
  Response: { success: true }
```

---

## 🛡️ Error Handling

The API client includes automatic error handling:

1. **401 Unauthorized**: Auto-logout and redirect to `/login`
2. **Network Error**: Returns error message to component
3. **Timeout**: 10-second timeout per request (configurable)

Components already handle errors with try/catch, so just use `.catch()` or async/await:

```javascript
try {
  const response = await api.listPolice()
  setData(response)
} catch (error) {
  setError(error.message)
}
```

---

## 📝 Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
# Backend API base URL
VITE_API_BASE_URL=http://localhost:3000/api

# Optional: Used for token key in sessionStorage
VITE_AUTH_TOKEN_KEY=crash_admin_token
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_BASE_URL
```

---

## 🧪 Testing Without Backend

To continue testing without a backend:
1. Keep `src/services/api.js` with mock implementation
2. Data persists in localStorage
3. Use `.env` to switch backends later

---

## 📚 File Structure for Integration

```
src/
├── config/
│   └── apiClient.js          ← Create this
├── services/
│   └── api.js                ← Update this (replace mock with axios calls)
├── pages/
│   ├── Login.jsx             ← Handle token storage
│   ├── Dashboard.jsx         ← Uses api.getStats()
│   ├── AddAccount.jsx        ← Uses api.addPolice()
│   ├── RemoveAccounts.jsx    ← Uses api.removePolice()
│   ├── EditAccounts.jsx      ← Uses api.updatePolice()
│   ├── Profile.jsx           ← Uses api.getAdminProfile() & changePassword()
│   ├── ActiveMap.jsx         ← Uses api.listPolice()
│   └── ExperimentMap.jsx     ← Optional: remove or integrate with real routes
├── App.jsx                   ← RequireAuth guard (no changes needed)
└── main.jsx                  ← Router setup (no changes needed)

.env.example                  ← Copy to .env and configure
API_ENDPOINTS.md              ← Reference for all endpoints
BACKEND_SETUP.md              ← This file
```

---

## ✨ Advanced: CORS Configuration

If frontend and backend run on different domains, configure CORS:

**Backend should allow**:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

**Frontend axios config** (add to `apiClient.js`):
```javascript
export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true, // Include cookies if using auth cookies
})
```

---

## 🔄 Migration Path: Mock → Real

**Phase 1: Development (Current)**
- ✅ Mock API with localStorage
- ✅ All 8 endpoints working
- ✅ UI complete and tested

**Phase 2: Integration (Next)**
1. Create `src/config/apiClient.js`
2. Update `src/services/api.js` endpoints
3. Set `.env` with backend URL
4. Test each page in order:
   - Login page first
   - Dashboard (uses stats)
   - Add/Remove/Edit accounts
   - Profile (password change)
   - Maps (list police)

**Phase 3: Production**
1. Remove localStorage mock code
2. Update `.env` with production backend URL
3. Build: `npm run build`
4. Deploy frontend

---

## 🐛 Debugging Tips

**Check API calls**:
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by XHR/Fetch
4. Click on requests to see Body/Response

**Check auth token**:
```javascript
// In browser console:
sessionStorage.getItem('crash_admin_token')
sessionStorage.getItem('crash_admin_user')
```

**Test API endpoint manually**:
```bash
curl -X GET http://localhost:3000/api/police \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Pre-Backend Checklist

Before connecting your backend, verify:

- [ ] `.env` file created with backend URL
- [ ] `src/config/apiClient.js` created
- [ ] All 8 endpoints in `src/services/api.js` updated
- [ ] Backend server is running on configured URL
- [ ] CORS is properly configured on backend
- [ ] Test credentials exist on backend
- [ ] All error responses have consistent format
- [ ] Token/auth mechanism is defined
- [ ] Backend ready for POST /auth/login
- [ ] Other 7 endpoints are callable (even if no data)

---

## 🎯 Next Steps

1. **Review `API_ENDPOINTS.md`** for exact endpoint specifications
2. **Create backend** with the 8 endpoints listed above
3. **Follow Steps 1-5** from "Quick Start" section
4. **Test login first** - if auth works, everything else will flow smoothly
5. **Debug with Network tab** if issues occur

---

## 📞 Quick Reference

| File | Purpose | Status |
|------|---------|--------|
| `.env.example` | Environment template | ✅ Ready |
| `.env` | Your local config | ⏳ Create from example |
| `src/config/apiClient.js` | API client with interceptors | ⏳ Create new |
| `src/services/api.js` | API functions | ⏳ Update (replace mock) |
| All pages | Components using API | ✅ Ready |

**Frontend Status**: 🟢 READY FOR BACKEND INTEGRATION

