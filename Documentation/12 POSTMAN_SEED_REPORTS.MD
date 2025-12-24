# POSTMAN_SEED_REPORTS (Demo Database Populator — NO SCRIPTS)

You asked for: **one-tap seeding**, no JavaScript, no functions, and **no backend changes**.

Reality check:
- The endpoint `POST /admin/reports/manual/` creates **one report per request** (single JSON object).
- So you **cannot** send 96 reports in one giant JSON body unless the backend is changed to support bulk insert.

Best “one-tap” approach that does NOT modify the backend and does NOT use JavaScript:
- Use **Postman Collection Runner** with a **JSON data file**.
- You click **Run** once; Postman sends all 96 POST requests automatically.

This document gives you:
- steps to get token
- endpoint
- request body template (copy/paste)
- the data file that contains **all 96 resolved reports** (already created in this repo)

---

## 0) What will be seeded (matches your rules)

All reports are **Resolved** (analytics showcase).

Main office (analytics hotspot showcase) — assigned_office = `d5ca01da-ff56-47b9-b62a-37fa05b548bd`
- Around `14.699846245860671, 121.03438385063777`: 10 Theft
- Around `14.695100044167946, 121.04946238645928`: 8 Violence
- Around `14.664780286926804, 121.0701405148797`: 5 Threat
- Extra categories with random locations around the main area:
  - Vandalism: 7
  - Suspicious: 4
  - Emergency: 6
  - Others: 5

Other offices (random office assignment between the two)
- Offices:
  - `06e125e5-f374-49be-a116-f15f73103614` (14.5914360, 120.9752430)
  - `07f19487-e83a-436b-babf-51e71c35e687` (14.5666900, 121.0770105)
- Cases:
  - 8 Vandalism
  - 3 Suspicious
  - 11 Emergency
  - 5 Others
  - 8 Violence
  - 10 Theft
  - 6 Threat

Dates:
- created_at is random between **Jan 1, 2024** and **Dec 20, 2025**
- updated_at is after created_at

Resolution time tuning:
- Violence = fastest (minutes to ~2 hours)
- Theft = slowest (5 to 12 days)
- Threat/Vandalism/Others = middle

Coordinates:
- All coordinates are within **~1km radius** (2km diameter) of the specified centers.

---

## 1) Token step (Admin login)

### Endpoint
`POST http://localhost:8000/api/v1/auth/login/`

### Body (raw JSON)
```json
{
  "email": "YOUR_ADMIN_EMAIL_HERE",
  "password": "YOUR_ADMIN_PASSWORD_HERE"
}
```

### What you copy from the response
Copy the value of:
- `access`

You will use it like:
- `Authorization: Bearer <access>`

---

## 2) The insert endpoint (one report per request)

### Endpoint
`POST http://localhost:8000/api/v1/admin/reports/manual/`

### Headers
- `Content-Type: application/json`
- `Authorization: Bearer <PASTE_ACCESS_TOKEN_HERE>`

---

## 3) One request template (copy/paste)

Create a Postman request named: `Insert Manual Report (Runner)`

URL:
- `http://localhost:8000/api/v1/admin/reports/manual/`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer {{access_token}}`

Body (raw JSON) — NOTE the variables:
```json
{
  "category": "{{category}}",
  "description": "{{description}}",
  "latitude": {{latitude}},
  "longitude": {{longitude}},
  "reporter": "{{reporter}}",
  "assigned_office": "{{assigned_office}}",
  "status": "Resolved",
  "remarks": "{{remarks}}",
  "created_at": "{{created_at}}",
  "updated_at": "{{updated_at}}"
}
```

---

## 4) The “one-tap” part (Collection Runner)

1. Put the request above inside a Collection (example: `CRASH Demo Seeder`).
2. Create a Postman Environment value:
   - `access_token` = *(paste the login `access` token here)*
3. Open Postman Runner:
   - Click the Collection → `Run`
4. Select the data file:
   - `Documentation/12_POSTMAN_SEED_REPORTS_DATA.json`
5. Click **Run**.

That’s it — Postman will send 96 POST requests.

---

## 5) Data file location (already generated)

Use this file as the Runner “Data” input:
- `Documentation/12_POSTMAN_SEED_REPORTS_DATA.json`

---

## Notes / Troubleshooting

- **401 Unauthorized**: Your token is missing/expired (login again and update `access_token`).
- **403 Admin access required**: You used a police token; this seeder needs an admin token.
- **No city/barangay in analytics**: your `GOOGLE_MAPS_API_KEY` is missing/invalid, so reverse geocoding may return null.
