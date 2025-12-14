# 📚 Quick Reference Guide

## File Organization at a Glance

```
src/
├── App.jsx                    # Main router and layout
├── main.jsx                   # Entry point
├── components/
│   ├── Navbar.jsx             # Navigation bar
│   └── RequireAuth.jsx        # Auth guard (wraps protected routes)
├── constants/
│   └── index.js               # Routes, storage keys, API URL
├── pages/                     # 8 page components
│   ├── Login.jsx              # Auth page
│   ├── Dashboard.jsx          # Main dashboard
│   ├── AddAccount.jsx         # Register new police station
│   ├── RemoveAccounts.jsx     # Delete police accounts
│   ├── EditAccounts.jsx       # Update police details
│   ├── Profile.jsx            # Admin profile settings
│   ├── ActiveMap.jsx          # Map visualization
│   └── ExperimentMap.jsx      # Backend testing sandbox
├── services/
│   └── api.js                 # API calls (8 endpoints)
└── utils/
    ├── auth.js                # Authentication helpers
    ├── validation.js          # Form validation
    └── errors.js              # Error handling
```

## Constants Usage

### Import
```javascript
import { ROUTES, STORAGE_KEYS, API_BASE_URL } from '../constants'
```

### Routes
```javascript
ROUTES.LOGIN              // '/login'
ROUTES.DASHBOARD          // '/dashboard'
ROUTES.ADD_ACCOUNT        // '/add-account'
ROUTES.REMOVE_ACCOUNTS    // '/remove-accounts'
ROUTES.EDIT_ACCOUNTS      // '/edit-accounts'
ROUTES.PROFILE            // '/profile'
ROUTES.ACTIVE_MAP         // '/active-map'
ROUTES.EXPERIMENT_MAP     // '/experiment-map'
```

### Storage Keys
```javascript
STORAGE_KEYS.ADMIN_USER   // 'crash_admin_user'
STORAGE_KEYS.ADMIN_TOKEN  // 'crash_admin_token'
```

## Auth Utilities (`utils/auth.js`)

### Get User
```javascript
import { getStoredUser } from '../utils/auth'

const user = getStoredUser()
if (user) {
  console.log(user.username, user.email)
}
```

### Store User (after login)
```javascript
import { storeUser } from '../utils/auth'

const userData = { username: 'admin', email: 'admin@example.com' }
storeUser(userData)
```

### Check Authentication Status
```javascript
import { isAuthenticated } from '../utils/auth'

if (isAuthenticated()) {
  // User is logged in
}
```

### Logout
```javascript
import { clearAuth } from '../utils/auth'

clearAuth()  // Removes user and token
```

### Token Management
```javascript
import { getStoredToken, storeToken } from '../utils/auth'

const token = getStoredToken()
storeToken(newToken)
```

## Validation Utilities (`utils/validation.js`)

### Email Validation
```javascript
import { validateEmail } from '../utils/validation'

if (!validateEmail(form.email)) {
  setError('Invalid email format')
}
```

### Phone Number Validation
```javascript
import { validatePhoneNumber } from '../utils/validation'

if (!validatePhoneNumber('09123456789')) {
  setError('Phone must be 7-15 digits')
}
```

### Coordinates Validation
```javascript
import { validateCoordinates } from '../utils/validation'

if (!validateCoordinates(14.5995, 120.9842)) {
  setError('Latitude must be -90 to 90, Longitude -180 to 180')
}
```

### Password Validation
```javascript
import { validatePassword } from '../utils/validation'

if (!validatePassword('pass123')) {
  setError('Password must be at least 6 characters')
}
```

### Formatting Functions
```javascript
import { formatPhoneNumber, formatCoordinates } from '../utils/validation'

const phone = formatPhoneNumber('09123456789')  // '091-234-56789'
const coords = formatCoordinates(14.59953)     // '14.5995'
```

## Error Handling (`utils/errors.js`)

### Get Error Message
```javascript
import { getErrorMessage } from '../utils/errors'

try {
  await api.loginAdmin(credentials)
} catch (err) {
  const message = getErrorMessage(err)  // User-friendly message
  setError(message)
}
```

### Check Error Type
```javascript
import { isAuthError, isNetworkError, isValidationError } from '../utils/errors'

try {
  await api.somethingAsync()
} catch (err) {
  if (isAuthError(err)) {
    // 401 or 403 - redirect to login
  } else if (isNetworkError(err)) {
    // Network connection issue
  } else if (isValidationError(err)) {
    // 400 - validation failed
  }
}
```

### Custom Error
```javascript
import { AppError } from '../utils/errors'

throw new AppError('Something went wrong', 500)
```

## API Service (`services/api.js`)

### Usage
```javascript
import { api } from '../services/api'

// Login
const user = await api.loginAdmin({ usernameOrEmail, password })

// Get stats
const stats = await api.getStats()

// List police
const police = await api.listPolice()

// Add police
await api.addPolice({ email, password, officeName, ... })

// Remove police
await api.removePolice(id)

// Update police
await api.updatePolice(id, updates)

// Get profile
const profile = await api.getAdminProfile(email)

// Change password
await api.changePassword(email, newPassword)
```

## Common Component Patterns

### Login Flow
```javascript
async function handleLogin() {
  try {
    const user = await api.loginAdmin(credentials)
    storeUser(user)
    navigate(ROUTES.DASHBOARD)
  } catch (err) {
    setError(getErrorMessage(err))
  }
}
```

### Form Validation
```javascript
function handleSubmit(e) {
  e.preventDefault()
  
  if (!validateEmail(form.email)) {
    setError('Invalid email')
    return
  }
  
  if (!validatePassword(form.password)) {
    setError('Password too short')
    return
  }
  
  // Proceed with submission
}
```

### Protected Navigation
```javascript
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../constants'

const navigate = useNavigate()

// Navigate to dashboard
navigate(ROUTES.DASHBOARD)

// Navigate to edit page
navigate(ROUTES.EDIT_ACCOUNTS)
```

### Error Display
```javascript
{error && (
  <div className="p-4 bg-red-600/30 rounded-xl">
    <AlertCircle className="text-red-300" />
    <p className="text-red-200">{error}</p>
  </div>
)}
```

### Loading State
```javascript
<button
  onClick={handleSubmit}
  disabled={loading}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

## Component Template

```javascript
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { ROUTES } from '../constants'
import { getErrorMessage } from '../utils/errors'
import { validateEmail } from '../utils/validation'

/**
 * Component Name
 * 
 * Brief description of what this component does.
 * List key features or responsibilities.
 * 
 * @returns {JSX.Element} Description of returned UI
 */
export default function ComponentName() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch data on mount
  }, [])

  async function handleAction() {
    setError('')
    setLoading(true)
    try {
      const result = await api.someFunction()
      setData(result)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* JSX here */}
    </div>
  )
}
```

## Debugging Tips

### Check if user is stored
```javascript
// In browser console
JSON.parse(sessionStorage.getItem('crash_admin_user'))
```

### Check current route
```javascript
import { useLocation } from 'react-router-dom'

const location = useLocation()
console.log(location.pathname)
```

### Test API mock
```javascript
import { api } from './services/api'

// In browser console
api.getStats().then(console.log)
api.listPolice().then(console.log)
```

### Validate forms before submit
```javascript
import { validateEmail, validatePassword } from './utils/validation'

validateEmail('test@example.com')    // true
validatePassword('short')            // false
validatePhoneNumber('1234567')       // true
validateCoordinates(14.5995, 120.9842) // true
```

## Backend Integration Checklist

When ready to integrate real backend:

1. [ ] Replace mock API in `src/services/api.js`
2. [ ] Update `API_BASE_URL` in `.env`
3. [ ] Test each endpoint one by one
4. [ ] Update error handling if needed
5. [ ] Test authentication flow
6. [ ] Test all form submissions
7. [ ] Test error scenarios

All components are ready - just swap the `api.js` functions!

## Performance Tips

- Use `React.memo()` for heavy components
- Add route-level code splitting with `React.lazy()`
- Cache API responses in `api.js`
- Use `useMemo()` for expensive calculations
- Add loading skeletons instead of spinners

## Documentation Files

1. **`CODE_ORGANIZATION.md`** - Detailed architecture guide
2. **`CLEAN_CODE_SUMMARY.md`** - What was accomplished
3. **`API_ENDPOINTS.md`** - All 8 endpoints specification
4. **`BACKEND_SETUP.md`** - Backend integration guide
5. **`00_START_HERE.md`** - Project overview

---

**Pro Tip**: All hardcoded values now use constants, making the app easy to maintain and scale!
