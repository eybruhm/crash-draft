# Code Organization & Architecture

## Project Structure Overview

```
src/
├── components/          # Reusable React components
│   ├── Navbar.jsx      # Top navigation with user menu
│   └── RequireAuth.jsx # Protected route wrapper
├── constants/          # Centralized configuration
│   └── index.js       # Routes, storage keys, API settings
├── pages/              # Page-level components (8 pages)
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── AddAccount.jsx
│   ├── RemoveAccounts.jsx
│   ├── EditAccounts.jsx
│   ├── Profile.jsx
│   ├── ActiveMap.jsx
│   └── ExperimentMap.jsx
├── services/           # API and external services
│   └── api.js         # Mock API service (8 endpoints)
├── utils/              # Shared utility functions
│   ├── auth.js        # Authentication helpers
│   ├── validation.js  # Form validation functions
│   └── errors.js      # Error handling utilities
├── App.jsx            # Main app router
└── main.jsx           # Entry point
```

## Core Patterns

### 1. Constants Centralization (`src/constants/index.js`)

All hardcoded configuration values are centralized:

```javascript
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  ADD_ACCOUNT: '/add-account',
  // ... all 8 routes
}

export const STORAGE_KEYS = {
  ADMIN_USER: 'crash_admin_user',
  ADMIN_TOKEN: 'crash_admin_token',
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
```

**Benefits:**
- Single source of truth for all route paths
- Easy to find and update values
- Prevents typos in string literals
- Facilitates refactoring

### 2. Authentication Utilities (`src/utils/auth.js`)

Centralized authentication operations:

```javascript
// Retrieve stored user from sessionStorage
const user = getStoredUser()

// Store user after login
storeUser(adminData)

// Check authentication status
if (isAuthenticated()) { /* ... */ }

// Clean up on logout
clearAuth()
```

**Benefits:**
- No direct `sessionStorage` access scattered through code
- Consistent storage key usage
- Single place to modify storage logic
- Easier testing and debugging

### 3. Validation Utilities (`src/utils/validation.js`)

Reusable form validation functions:

```javascript
// Email validation
if (!validateEmail(form.email)) { /* show error */ }

// Phone validation
if (!validatePhoneNumber(form.contact)) { /* show error */ }

// Coordinate validation
if (!validateCoordinates(lat, lng)) { /* show error */ }

// Password strength
if (!validatePassword(form.password)) { /* show error */ }

// Formatting
const formatted = formatPhoneNumber(phone)
const coords = formatCoordinates(value)
```

**Benefits:**
- Consistent validation across all forms
- Easy to update validation rules globally
- Reduces code duplication
- Centralized error messages

### 4. Error Handling (`src/utils/errors.js`)

Standardized error handling:

```javascript
// Get user-friendly error messages
const message = getErrorMessage(error)

// Check error types
if (isAuthError(error)) { /* redirect to login */ }
if (isNetworkError(error)) { /* show offline message */ }
if (isValidationError(error)) { /* show form errors */ }

// Custom error class
throw new AppError('Something went wrong', 400)
```

**Benefits:**
- Consistent error display across app
- Centralized error message formatting
- Easier to add logging/analytics
- Better UX with meaningful messages

### 5. Protected Routes (`src/components/RequireAuth.jsx`)

Route protection extracted as reusable component:

```jsx
<Route element={<RequireAuth />}>
  <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
  <Route path={ROUTES.ADD_ACCOUNT} element={<AddAccount />} />
  {/* ... */}
</Route>
```

**Benefits:**
- Single responsibility: only handles auth check
- Reusable across multiple routes
- Easy to modify authentication logic
- Clear separation of concerns

## Component Documentation

All components now include JSDoc comments explaining:
- **Purpose**: What the component does
- **Features**: Key functionality
- **Returns**: JSDoc return type
- **State**: Key state variables and their purpose

Example:
```javascript
/**
 * Dashboard Page Component
 * 
 * Main admin dashboard displaying:
 * - Stats cards (total police accounts, admin accounts, system status)
 * - Quick action shortcuts to other pages
 * - Recently added police accounts table
 * 
 * @returns {JSX.Element} Dashboard with stats, shortcuts, and recent accounts
 */
export default function Dashboard() { /* ... */ }
```

## Dependency Elimination

### Before (Spaghetti Code)
```javascript
// Direct sessionStorage access scattered everywhere
const user = JSON.parse(sessionStorage.getItem('crash_admin_user'))

// Hardcoded routes duplicated in every component
navigate('/dashboard')
navigate('/add-account')

// Validation logic repeated in multiple forms
const email = form.email
if (!email.includes('@')) { /* error */ }

// Direct error messages from API
setError(err.message)
```

### After (Clean Architecture)
```javascript
// Centralized auth utilities
const user = getStoredUser()

// Constants for routes
navigate(ROUTES.DASHBOARD)

// Reusable validation
if (!validateEmail(form.email)) { /* error */ }

// Standardized error handling
setError(getErrorMessage(err))
```

## Module Imports Pattern

### Constants
```javascript
import { ROUTES, STORAGE_KEYS, API_BASE_URL } from '../constants'
```

### Utilities
```javascript
import { storeUser, getStoredUser, isAuthenticated } from '../utils/auth'
import { validateEmail, formatPhoneNumber } from '../utils/validation'
import { getErrorMessage, isAuthError } from '../utils/errors'
```

### Services
```javascript
import { api } from '../services/api'
```

## Code Reusability Checklist

- ✅ All routes centralized in `ROUTES` constant
- ✅ All storage keys centralized in `STORAGE_KEYS` constant
- ✅ All authentication operations in `auth.js`
- ✅ All validation logic in `validation.js`
- ✅ All error handling in `errors.js`
- ✅ All API calls in `api.js` service
- ✅ Protected routes use `RequireAuth` component
- ✅ All components have JSDoc comments
- ✅ No hardcoded strings in components
- ✅ No direct `sessionStorage` access in components

## Adding New Features

### Adding a New Route
1. Add to `ROUTES` in `src/constants/index.js`
2. Create page component in `src/pages/`
3. Add route to `src/App.jsx`
4. Add to navigation if needed in `src/components/Navbar.jsx`

### Adding New Validation Rule
1. Add function to `src/utils/validation.js`
2. Import in component that needs it
3. Use in form validation

### Adding New Utility Function
1. Create in appropriate utility file (`auth.js`, `validation.js`, `errors.js`)
2. Export the function
3. Import and use in components

### Adding New API Endpoint
1. Add to mock service in `src/services/api.js` with JSDoc
2. Add TODO comment with axios replacement code
3. Use in components via `api.functionName()`

## Code Quality Standards

All code follows these standards:

- **No Hardcoded Strings**: Routes use `ROUTES.CONSTANT_NAME`
- **Centralized Configuration**: All settings in `constants/` or `config/`
- **Utility Functions**: Shared logic extracted to `utils/`
- **Error Handling**: Use `getErrorMessage()` for user feedback
- **Validation**: Use functions from `validation.js`
- **Documentation**: JSDoc comments on all exports
- **Single Responsibility**: Each component/utility has one clear purpose
- **DRY Principle**: No duplicated code across components

## Performance Optimization Opportunities

1. **Lazy Loading Pages**: Wrap page components with `React.lazy()` and `Suspense`
2. **Memoization**: Use `useMemo` for expensive calculations
3. **Code Splitting**: Routes can be split into separate chunks
4. **API Caching**: Add cache layer to `api.js` service
5. **Component Memoization**: Use `React.memo()` for heavy components

## Testing Structure

Ready for unit testing:
- Utility functions in `utils/` are pure and testable
- `constants/` can be mocked easily
- `api.js` can be mocked for integration tests
- Components have clear props and state

## Next Steps

1. **Backend Integration**: Replace mock API with real endpoints
2. **Error Boundary**: Add React Error Boundary wrapper
3. **Loading States**: Add global loading indicator
4. **Toast Notifications**: Add toaster for user feedback
5. **Form Validation**: Add real-time validation with debounce
6. **Responsive Design**: Further optimize for mobile devices
