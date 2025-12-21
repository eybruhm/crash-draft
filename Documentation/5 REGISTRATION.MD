# REGISTRATION (Make the system usable)

CRASH requires at least:
1) One Admin account
2) At least one Police Office account

Because:
- Without an admin, you can’t manage police accounts in the Admin Web.
- Without a police office, reports won’t have a real responder account.

---

## Step 1) Create the first Admin (directly in Supabase)

There is no “signup page” for admins.
You must insert the first admin row manually in Supabase.

Table:
- `tbl_admin`

Required fields (typical):
- `admin_id` (UUID)
- `username`
- `email`
- `password` (**Django-hashed**, not plain)

### A) Generate a Django password hash (recommended)
Use the offline script:
- `Backend/hashing.py`

Run it:
```powershell
cd c:\ALMM\Programming\CRASH\Backend
.\venv\Scripts\activate
python hashing.py
```

It prints something like:
- `pbkdf2_sha256$...`

Copy that hash.

### B) Insert admin row in Supabase
In Supabase Dashboard → SQL Editor:
```sql
INSERT INTO tbl_admin (admin_id, username, email, password, contact_no)
VALUES (
  gen_random_uuid(),
  'Admin1',
  'admin1@example.com',
  '<PASTE_DJANGO_HASH_HERE>',
  NULL
);
```

---

## Step 2) Login to Admin Web

1. Start backend: `python manage.py runserver`
2. Start admin web: `npm run dev` inside `Frontend-Admin/`
3. Login using the admin email + **plain password** (the backend checks the hash)

---

## Step 3) Create a Police Office account (from Admin Web)

In Admin Web:
- Go to Police Account Management
- Create an office

Backend endpoint:
- `POST /api/v1/admin/police-offices/`

The backend will hash the police password and store it in `tbl_police_offices.password_hash`.

---

## Step 4) Login to Police Web

1. Start police web: `npm run dev` inside `Frontend-Police-JS/`
2. Login using the police office email + password you set.

---

## Notes / common mistakes

- Don’t store plain passwords in Supabase tables.
- Don’t commit `.env` files to GitHub.
- Admin password hashing endpoint exists (`/api/v1/admin/password-hash/`), but it requires admin auth — so it can’t help you create the *first* admin.
