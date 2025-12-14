# Frontend-Police-JS – Local Setup Guide

Follow these steps to run the Vite app locally.

## Prerequisites
- Node.js 18+ (includes npm)
- Git

## 1) Clone
```bash
git clone <your-repo-url> frontend-police-js
cd frontend-police-js
```

## 2) Install dependencies
```bash
npm install
```

## 3) Environment variables
Create a `.env` file in the project root (this is git-ignored):
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```
Notes:
- `VITE_API_BASE_URL` points the Police web to your Django backend.
- Get a browser Maps JavaScript API key from Google Cloud.
- After changing `.env`, restart `npm run dev` so Vite picks it up.

## 4) Custom map markers (already wired)
- Icons live in `src/assets/markers/` and are already used on the Live Map.
- Keep filenames if you replace assets, or update mappings in `src/pages/Map.jsx` (see `markerIcons`, `categoryIcon`, `checkpointIcon`).

## 5) Run dev server
```bash
npm run dev
```
Open the shown localhost URL (usually http://localhost:5173).

## 6) Production build (optional)
```bash
npm run build
```
The build outputs to `dist/`.

## Categories & statuses (for reference)
- Categories: Violence, Threat, Theft, Vandalism, Suspicious, Emergency, Others
- Statuses: Pending, Acknowledged, En Route, On Scene, Resolved, Canceled

## Troubleshooting
- Blank map: ensure `VITE_GOOGLE_MAPS_API_KEY` is set and restart dev server.
- Missing markers: verify files in `src/assets/markers/` and paths in `Map.jsx`.
- Port in use: run `npm run dev -- --port 5174` (or another free port).
