# Admin Web Environment Variables

## Required (local dev)

- **`VITE_API_BASE_URL`**
  - Example: `http://127.0.0.1:8000/api/v1`
  - Used by the API service layer (Django backend base URL).

- **`VITE_GOOGLE_MAPS_API_KEY`**
  - Google Maps JavaScript API key
  - Must have **Maps JavaScript API** enabled in Google Cloud Console.

## Notes

- Do **NOT** commit your real `.env` file. Keep secrets local.
- If the map shows a blank screen, check the browser console for Google Maps loading errors (API not enabled, restrictions, billing, etc.).


