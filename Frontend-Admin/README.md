# CRASH Admin (Vite + React)

This is a lightweight admin UI scaffold implemented with Vite + React. It includes:

- Login page (admins are created outside this UI — e.g., Supabase console)
- Dashboard with summary stats
- Add / Remove / Edit Police accounts (mocked via localStorage)
- Profile page with change password
- Active Map (placeholder) and Experiment Map (mock route request)

This scaffold uses a mock API (`src/services/api.js`) backed by `localStorage` for local development. Replace the service with real API calls (Supabase or Django API) when ready.

## 📚 Documentation

**All documentation is organized in the `docs/` folder!**

👉 **[START HERE → docs/INDEX.md](docs/INDEX.md)** for complete documentation index

Quick navigation:
- **[docs/00_START_HERE.md](docs/00_START_HERE.md)** - Project overview
- **[docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** - Common code patterns
- **[docs/CODE_ORGANIZATION.md](docs/CODE_ORGANIZATION.md)** - Architecture guide
- **[docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md)** - API specifications
- **[docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md)** - Backend integration

## Quick start

1. Install dependencies:

```powershell
cd c:\Users\QCU\CRASH-ADMIN-SIDE
npm install
```

2. Run dev server:

```powershell
npm run dev
```

3. Open http://localhost:5173 (vite default port).

## Default demo admin

- Email: `admin@example.com`
- Username: `admin`
- Password: `password`

Notes and next steps

- To integrate a real backend, replace `src/services/api.js` with calls to your Django API or Supabase client.
- For maps, integrate Leaflet or Mapbox in `src/pages/ActiveMap.jsx` and `ExperimentMap.jsx`.
- Add proper auth tokens and ProtectedRoute behavior when using a real backend.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
