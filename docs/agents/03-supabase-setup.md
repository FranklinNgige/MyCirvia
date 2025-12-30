# Supabase Project Setup (Phase 1 — Database & Security)

This guide walks through the **initial Supabase setup** for MyCirvia. It is written for a first-time Supabase user and focuses on **security-first configuration**. **Do not write app code or SQL yet.**

---

## 1) Supabase Project Creation

**Dashboard path:** https://app.supabase.com → **New Project**

### Steps
1. **Create a new project** in the Supabase dashboard.
2. **Project name:** `mycirvia-{env}`
   - Examples: `mycirvia-dev`, `mycirvia-staging`, `mycirvia-prod`
3. **Region:** Choose the region closest to your primary users (latency-sensitive).
4. **Database password:**
   - Generate a **strong, unique password** (use a password manager).
   - Store it in your secrets manager (do **not** store in repo or chat).
5. Click **Create new project** and wait for provisioning to finish.

### Where to find project credentials
After the project is created:
- **Project URL:**
  - Go to **Project Settings → API**
- **anon public key:**
  - Go to **Project Settings → API**
- **service role key:**
  - Go to **Project Settings → API**

> **Security warning:** The **service role key** bypasses RLS and has full access. **Never** use it in any client-side code, mobile apps, or public repositories.

---

## 2) Authentication Configuration

**Dashboard path:** **Auth → Providers → Email**

### Required settings
Set the Email provider as follows:
- **Email provider:** ENABLED
- **Email confirmations:** ENABLED
- **Secure email change:** ENABLED
- **Password reset:** ENABLED
- **Minimum password length:** Recommend **12+ characters**
- **Session expiration behavior:** Keep default short-lived access tokens with refresh tokens enabled (security > convenience)

### Redirect URLs
Configure redirect URLs for authentication flows:
- **Dashboard path:** **Auth → URL Configuration**
- Add **local development** and **production** redirect URLs.
  - Example (local): `http://localhost:3000/**`
  - Example (prod): `https://mycirvia.com/**`

### Test signup and email verification (manual)
1. Open **Auth → Users**.
2. Use a test email to sign up in your client (or via the Supabase Auth UI if available).
3. Verify the confirmation email arrives and the user shows as **confirmed**.
4. Trigger a password reset and confirm the reset email arrives.

---

## 3) Row Level Security (RLS) Baseline

**Dashboard path:** **Database → Tables**

### Core rules
- **RLS is DENY-BY-DEFAULT.** If a table has RLS enabled and no policies, **all access is blocked**.
- **Every table must explicitly enable RLS.**
- **Enable RLS before writing any app code.** This prevents accidental public access.

### How to verify RLS per table
1. Open **Database → Tables**.
2. Select a table.
3. In the table settings, confirm **RLS is ON**.

### Checklist for every new table
- [ ] RLS enabled immediately after table creation
- [ ] Policies defined before any production access
- [ ] No use of `service role key` in frontend clients

> **Warning:** Never disable RLS in production. Doing so exposes data broadly and bypasses all access controls.

---

## 4) Storage Buckets Setup

**Dashboard path:** **Storage → Create Bucket**

### Buckets to create (standardized names)
Create the following buckets:
- `avatars`
- `profile-photos`
- `post-media`

### Bucket configuration
For each bucket:
- **Default visibility:** **PRIVATE**
- **Reason:** Private buckets + signed URLs protect identity and avoid untrusted scraping.
- **When public buckets are unsafe:** Any bucket containing user content (avatars, profile photos, posts) should **not** be public.

### High-level policy strategy (details later)
- Use **signed URLs** for all client access.
- Add **bucket-level RLS policies** later to restrict uploads/downloads to authorized users.

### Signed URL expiration strategy
- Keep signed URLs **short-lived** (e.g., minutes to an hour).
- Use refresh-on-access if needed rather than long-lived URLs.

### File size and file type recommendations
- Enforce file size limits early (e.g., 5–10 MB for profile photos; higher for post media).
- Allow only expected file types:
  - Images: `jpg`, `jpeg`, `png`, `webp`
  - Optional: `mp4` for post media if MVP needs it

### Object naming conventions
- Use **UUID-based** object keys to avoid leaking user IDs.
- Suggested pattern:
  - `avatars/{uuid}`
  - `profile-photos/{uuid}`
  - `post-media/{uuid}`

---

## 5) Realtime Configuration

**Dashboard path:** **Database → Replication → Realtime**

### MVP usage
Realtime will eventually power:
- **1:1 messages**
- **Group messages**
- **Notifications** (future)

### Tables to enable later (planning only)
- Messaging tables (direct and group)
- Notification tables (future)
- Avoid enabling realtime on identity-sensitive tables

### Security considerations
- **Never enable realtime on a table without RLS.**
- Realtime events can expose data; RLS must be in place and verified first.
- Realtime should **not** directly expose sensitive identity fields.

---

## 6) Validation Checklist (must complete)

- [ ] Supabase project created
- [ ] Auth (email/password) enabled
- [ ] Email verification tested
- [ ] RLS enabled on all tables (or ready for schema)
- [ ] Storage buckets created
- [ ] Realtime settings reviewed
- [ ] Secrets stored securely
- [ ] No service role key in frontend

---

## Handoff

**Files to create/update**
- `docs/agents/03-supabase-setup.md`

**Final decisions made**
- Project naming convention: `mycirvia-{env}`
- Email/password auth enabled with confirmations and secure email change
- All storage buckets are private with signed URL access
- RLS required for every table before app code

**Assumptions**
- Supabase project is the source of truth for database and storage in early phases.
- The team will follow a secrets manager workflow for database credentials and API keys.

**Open questions**
- Final password policy (length/complexity) for user accounts
- Final media size limits per bucket
- Exact table list for realtime once schema is defined

**What Prompt 4 must read next**
- This file: `docs/agents/03-supabase-setup.md`
