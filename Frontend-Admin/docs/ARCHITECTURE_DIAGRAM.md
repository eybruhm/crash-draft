# Data Flow & Architecture Diagram

## Application Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      CRASH Admin Dashboard                  │
└─────────────────────────────────────────────────────────────┘

                          ↓

┌──────────────────────────────────────────────────────────────┐
│                        App.jsx (Router)                      │
│  - Manages 8 routes using ROUTES constants                   │
│  - Wraps protected routes with RequireAuth component         │
│  - Renders Navbar for authenticated users                    │
└──────────────────────────────────────────────────────────────┘

                  ↙                        ↘

    ┌─────────────────────────┐  ┌──────────────────────────┐
    │  RequireAuth Component  │  │  Navbar Component        │
    │ (Protected Routes)      │  │ (User Menu + Navigation) │
    │ - Checks auth status    │  │ - Uses ROUTES constants  │
    │ - Redirects to login    │  │ - Uses auth utilities    │
    └─────────────────────────┘  └──────────────────────────┘

              ↓

    ┌─────────────────────────────────────────────┐
    │         8 Page Components                    │
    ├─────────────────────────────────────────────┤
    │ 1. Login.jsx                                │
    │    ↓ Uses: storeUser(), ROUTES, errors     │
    │ 2. Dashboard.jsx                            │
    │    ↓ Uses: ROUTES, api service             │
    │ 3. AddAccount.jsx                           │
    │    ↓ Uses: validation, errors, api         │
    │ 4. RemoveAccounts.jsx                       │
    │    ↓ Uses: api, errors                      │
    │ 5. EditAccounts.jsx                         │
    │    ↓ Uses: validation, api, errors         │
    │ 6. Profile.jsx                              │
    │    ↓ Uses: auth utils, validation, api     │
    │ 7. ActiveMap.jsx                            │
    │    ↓ Uses: api                              │
    │ 8. ExperimentMap.jsx                        │
    │    ↓ Testing sandbox                        │
    └─────────────────────────────────────────────┘

              ↓

    ┌─────────────────────────────────────────────┐
    │          Utility Functions (Shared Logic)    │
    ├─────────────────────────────────────────────┤
    │ auth.js (6 functions)                       │
    │ ├─ getStoredUser()                          │
    │ ├─ storeUser()                              │
    │ ├─ getStoredToken()                         │
    │ ├─ storeToken()                             │
    │ ├─ clearAuth()                              │
    │ └─ isAuthenticated()                        │
    │                                              │
    │ validation.js (6 functions)                 │
    │ ├─ validateEmail()                          │
    │ ├─ validatePhoneNumber()                    │
    │ ├─ validateCoordinates()                    │
    │ ├─ validatePassword()                       │
    │ ├─ formatPhoneNumber()                      │
    │ └─ formatCoordinates()                      │
    │                                              │
    │ errors.js (7 utilities)                     │
    │ ├─ getErrorMessage()                        │
    │ ├─ isNetworkError()                         │
    │ ├─ isAuthError()                            │
    │ ├─ isValidationError()                      │
    │ ├─ isTimeoutError()                         │
    │ ├─ isNotFoundError()                        │
    │ └─ AppError (class)                         │
    └─────────────────────────────────────────────┘

              ↓

    ┌─────────────────────────────────────────────┐
    │      API Service (src/services/api.js)      │
    │  (Mock - Ready for backend integration)     │
    ├─────────────────────────────────────────────┤
    │ 1. loginAdmin()        → POST /auth/login   │
    │ 2. getStats()          → GET /admin/stats   │
    │ 3. listPolice()        → GET /police        │
    │ 4. addPolice()         → POST /police       │
    │ 5. removePolice()      → DELETE /police/:id │
    │ 6. updatePolice()      → PUT /police/:id    │
    │ 7. getAdminProfile()   → GET /admin/profile │
    │ 8. changePassword()    → POST /change-pass  │
    └─────────────────────────────────────────────┘

              ↓

    ┌─────────────────────────────────────────────┐
    │      Storage Layer (SessionStorage)         │
    │  Managed by auth.js utilities               │
    ├─────────────────────────────────────────────┤
    │ crash_admin_user → Admin user object        │
    │ crash_admin_token → JWT or auth token       │
    └─────────────────────────────────────────────┘

              ↓

    ┌─────────────────────────────────────────────┐
    │    Constants (src/constants/index.js)       │
    │ Single source of truth                      │
    ├─────────────────────────────────────────────┤
    │ ROUTES: All 8 route paths                   │
    │ STORAGE_KEYS: All storage key names         │
    │ API_BASE_URL: Environment-based API URL     │
    └─────────────────────────────────────────────┘
```

## Authentication Flow

```
User Login
    ↓
[Login.jsx]
    ├─ User enters email/password
    └─ Validates with validateEmail()
        ↓
    [api.loginAdmin()]
    ├─ Sends credentials
    └─ Receives admin user data
        ↓
    [storeUser(admin)]
    ├─ Stores user in sessionStorage
    └─ Auth status: isAuthenticated() = true
        ↓
    [navigate(ROUTES.DASHBOARD)]
    └─ Redirects to dashboard

---

Protected Route Access
    ↓
[RequireAuth Component]
    ├─ Checks isAuthenticated()
    ├─ If false → redirect to ROUTES.LOGIN
    └─ If true → render protected page
        ↓
    [Page loads with auth context]

---

User Logout
    ↓
[Navbar.jsx logout button]
    ├─ Calls clearAuth()
    ├─ Removes user from sessionStorage
    ├─ Auth status: isAuthenticated() = false
    └─ navigate(ROUTES.LOGIN)
```

## Form Submission Flow

```
User Fills Form (e.g., Add Police Account)
    ↓
[AddAccount.jsx - handleRegister()]
    ├─ Validates email with validateEmail()
    ├─ Validates password with validatePassword()
    ├─ Validates coordinates with validateCoordinates()
    └─ If validation fails → show error
        ↓
    [api.addPolice(payload)]
    ├─ Submits to API
    ├─ Shows loading state
    └─ Receives response
        ↓
    ┌─ Success
    │ ├─ Show success message
    │ ├─ Clear form
    │ └─ Refresh data
    │
    └─ Error
      ├─ Calls getErrorMessage(error)
      ├─ Shows user-friendly error
      └─ Keeps form data for retry
```

## Error Handling Flow

```
API Call Fails
    ↓
Error thrown from [api.js]
    ↓
Component catches error
    ↓
[getErrorMessage(error)]
    ├─ Checks error.response?.data?.message
    ├─ Checks error.message
    └─ Returns user-friendly message
        ↓
    Display error to user
        ├─ Error alert component
        ├─ Toast notification
        └─ Form validation message
            ↓
    Optional: Check error type
        ├─ isAuthError() → Redirect to login
        ├─ isNetworkError() → Show offline message
        ├─ isValidationError() → Show form errors
        └─ Other errors → Show general error
```

## State Management Pattern

```
Component State
├─ Form data
│  └─ setForm()
├─ Loading state
│  └─ setLoading()
├─ Error messages
│  └─ setError()
├─ Success messages
│  └─ setMsg()
└─ UI state (editing, etc)
   └─ setEditingId()

Effect Hooks
├─ Load data on mount
│  └─ useEffect(() => { api.getData() }, [])
├─ Fetch user profile
│  └─ useEffect(() => { if (user) api.getProfile() }, [])
└─ Cleanup on unmount

Context (Future)
├─ Global auth context
├─ Global theme context
└─ Global notification context
```

## Component Dependency Tree

```
App
├── RequireAuth (wrapper)
│   ├── Navbar
│   └── Routes (8 pages)
│       ├── Dashboard
│       │   └── Uses: api.getStats(), ROUTES
│       ├── Login
│       │   └── Uses: api.loginAdmin(), storeUser()
│       ├── AddAccount
│       │   └── Uses: validate*(), api.addPolice(), errors
│       ├── RemoveAccounts
│       │   └── Uses: api.listPolice(), api.removePolice()
│       ├── EditAccounts
│       │   └── Uses: validateCoordinates(), api.updatePolice()
│       ├── Profile
│       │   └── Uses: getStoredUser(), api.getAdminProfile()
│       ├── ActiveMap
│       │   └── Uses: api.listPolice()
│       └── ExperimentMap
│           └── Uses: (testing)
│
└── External Dependencies
    ├── react-router-dom (routing)
    ├── lucide-react (icons)
    ├── tailwindcss (styling)
    └── axios (HTTP calls)
```

## File Import Hierarchy

```
Level 1: Entry Point
└── main.jsx → App.jsx

Level 2: Routing
└── App.jsx
    ├── Import: ROUTES from constants
    ├── Import: RequireAuth from components
    ├── Import: All 8 page components
    └── Import: Navbar from components

Level 3: Pages
├── Login.jsx
│   ├── Import: api from services
│   ├── Import: ROUTES, storeUser from utils
│   └── Import: getErrorMessage from utils
├── Dashboard.jsx
│   ├── Import: api from services
│   ├── Import: ROUTES from constants
│   └── Import: Icons from lucide
├── AddAccount.jsx
│   ├── Import: api from services
│   ├── Import: validate* from utils
│   └── Import: getErrorMessage from utils
└── ... (other pages)

Level 4: Utilities & Services
├── services/api.js
│   └── No imports (mock implementation)
├── utils/auth.js
│   └── No imports (pure functions)
├── utils/validation.js
│   └── No imports (pure functions)
└── utils/errors.js
    └── No imports (pure functions)

Level 5: Constants
└── constants/index.js
    └── No imports (configuration only)
```

## Code Reuse Pyramid

```
      ┌─────────────────────────────────────┐
      │     Specific Implementations        │
      │  (8 Page Components)                │
      │  - Each handles unique UI logic     │
      │  - Each manages its own state       │
      └─────────────────────────────────────┘
                    △
                   ╱ ╲
                  ╱   ╲
                 ╱     ╲
                ╱       ╲
      ┌────────────────────────────────────┐
      │     Reusable Components            │
      │  - Navbar                          │
      │  - RequireAuth                     │
      └────────────────────────────────────┘
                    △
                   ╱ ╲
                  ╱   ╲
                 ╱     ╲
      ┌────────────────────────────────────┐
      │     Utility Functions              │
      │  - auth.js (6 functions)           │
      │  - validation.js (6 functions)     │
      │  - errors.js (7 utilities)         │
      └────────────────────────────────────┘
                    △
                   ╱ ╲
                  ╱   ╲
      ┌────────────────────────────────────┐
      │     Constants & Configuration      │
      │  - ROUTES, STORAGE_KEYS, API_URL   │
      └────────────────────────────────────┘
                    △
                   ╱ ╲
      ┌────────────────────────────────────┐
      │     Core Dependencies              │
      │  - React, React Router, Tailwind   │
      │  - axios, lucide-react             │
      └────────────────────────────────────┘
```

## Data Flow Summary

```
User Interaction
    ↓
Component Handler
    ↓
Validate with utils/validation.js
    ↓
Submit via services/api.js
    ↓
Handle Response or Error
    ├─ Success → Update state with response
    └─ Error → Format with utils/errors.js
        ↓
Display Result to User
    ├─ Success message
    ├─ Error message
    └─ Updated UI
```

This architecture ensures:
- ✅ No code duplication
- ✅ Easy to maintain
- ✅ Simple to test
- ✅ Ready to scale
- ✅ Production ready
