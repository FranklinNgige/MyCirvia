# Scoped Identity Engine — Design

## 1) Identity model definitions

### Identity levels
- **Anonymous**: system-generated name + abstract avatar, plus limited demographic defaults (age range, gender).
- **Partial**: user-selected limited attributes (age range, gender, city, state, nickname, abstract avatar).
- **Full**: user-chosen name and profile photo, plus any partial attributes.

### Field availability by level
| Field | Anonymous | Partial | Full | Notes |
| --- | --- | --- | --- | --- |
| `anon_display_name` | ✅ | ✅ | ✅ | Always available for fallback + correlation avoidance.
| `anon_avatar_url` | ✅ | ✅ | ✅ | Abstract avatar only.
| `nickname` | ❌ | ✅ | ✅ | Non-real name for partial and full.
| `real_name` | ❌ | ❌ | ✅ | Only at full.
| `profile_photo_url` | ❌ | ❌ | ✅ | Only at full.
| `age_range` | ✅ | ✅ | ✅ | Default visible range only (e.g., “25–34”).
| `gender` | ✅ | ✅ | ✅ | Default visible value only (e.g., “female”, “male”, “non-binary”, “unspecified”).
| `city` | ❌ | ✅ | ✅ | Optional in partial/full.
| `state` | ❌ | ✅ | ✅ | Optional in partial/full.

### Age range and gender defaults
- **Age range** and **gender** are considered “safe public fields” and are visible by default in all identity levels.
- Both fields are optional and user-editable; if the user does not set them, the system returns `null` rather than a default value.

### Hidden identity fields vs safe public fields
- **Hidden fields**: `real_name`, `profile_photo_url`, exact age, contact info, account metadata.
- **Safe public fields**: `anon_display_name`, `anon_avatar_url`, `age_range`, `gender`, and any user-selected partial fields (`nickname`, `city`, `state`).

## 2) Scope model

### Identity scopes
- **DEFAULT_TEMPLATE**: default identity preference used for future chats/cirvias unless overridden.
- **CHAT**: scope for a 1:1 chat thread.
- **CIRVIA**: scope for a specific group.

### Scope keys
- `CHAT` uses `chat_id`.
- `CIRVIA` uses `cirvia_id`.
- `DEFAULT_TEMPLATE` uses `scope_id = null`.

## 3) Reveal and revocation rules (PRD-aligned)

### Reveal rules
- Users can reveal identity **unilaterally** in a chat or cirvia by setting a higher identity level for that scope.
- Mutual reveal is optional and out of scope for MVP. The design keeps space for a `mutual_reveal_required` flag but does not require it.

### Revocation rules
- Identity changes are **not retroactive**. Past messages and posts keep the identity snapshot that was used at creation time.
- When identity visibility is reduced, the system inserts a **system notice** in the chat or cirvia: “User changed identity visibility.”
- Revocation only affects future rendering in the same scope.
- Changes in one scope do **not** affect other scopes.

## 4) Server-enforced identity resolution (critical)

### Inputs
- `viewer_user_id`
- `subject_user_id`
- `context` with one of:
  - `{ type: "DEFAULT_TEMPLATE" }`
  - `{ type: "CHAT", chat_id }`
  - `{ type: "CIRVIA", cirvia_id }`

### Output
- A **display identity object** safe to return to the client:
  - `identity_level`
  - `display_name`
  - `avatar_url`
  - `age_range`
  - `gender`
  - `city` (optional)
  - `state` (optional)
  - `profile_photo_url` (only at full)

### Resolution rules
1. **Access gate**
   - If the viewer is not authorized for the context (not a chat participant or cirvia member), return `null`.
2. **Self view**
   - If `viewer_user_id === subject_user_id`, return the subject’s **full** identity (all fields) regardless of scope.
3. **Scope identity**
   - Fetch the subject’s identity setting for the context. If none exists, fallback to DEFAULT_TEMPLATE. If that’s missing, fallback to **Anonymous**.
4. **Field filtering**
   - Anonymous: return anon display name + anon avatar + age range + gender only.
   - Partial: return anon display name or nickname (if set), abstract avatar + age range + gender + any selected fields (city/state).
   - Full: return real name or nickname, profile photo, plus all partial fields.

### Examples
- **Viewer is self**: always returns full identity (`real_name`, `profile_photo_url`, etc.).
- **Viewer is other in 1:1 chat**: returns subject’s identity set in that chat; falls back to default template; otherwise anonymous.
- **Viewer is same cirvia member**: returns subject’s identity set for the cirvia; falls back to default template; otherwise anonymous.
- **Viewer not a member**: returns `null`.

## 5) Data design implications

The engine assumes the following usage of existing schema (matching earlier migration decisions):
- **Identity scope settings** live in a per-user table (e.g., `identity_scopes`) with `(user_id, scope_type, scope_id)` uniqueness.
- **Message/post identity snapshots** are stored on content records (`messages`, `posts`, `comments`) as display-only columns (safe public fields only).
- **Identity audit** is captured via a table like `identity_audit_logs` with previous and next state for security review.

Snapshot data is always **safe-display-only** and never stores raw hidden identity.

## 6) Threat model + mitigations

### Identity leakage via joins
- **Risk**: joining `users` or `profiles` into message queries could leak hidden fields.
- **Mitigation**: content queries use **snapshot columns only**. Server functions compute display identity and write snapshots at creation time.

### Correlation attacks (avatar/name across scopes)
- **Risk**: stable identifiers allow cross-scope correlation.
- **Mitigation**: always provide scope-specific display names and avatars (anonymous or user-supplied) stored per scope; default to anonymous for safety.

### Inference from message history
- **Risk**: identity changes reveal historical state.
- **Mitigation**: messages keep prior snapshots but system inserts a notice to signal change; no historical backfill.

### Admin/moderator overreach
- **Risk**: elevated roles view hidden identity.
- **Mitigation**: RLS prevents access to hidden fields; admin tooling only sees snapshot fields. No “service role” access in user-facing logic.

### Realtime payload leakage
- **Risk**: realtime subscriptions could emit hidden fields.
- **Mitigation**: realtime uses views or tables that only include snapshot fields; never subscribe directly to user profile tables.

## 7) API surface (minimal, MVP)

### Server actions / endpoints
- `setIdentityScope(userId, scopeType, scopeId, identityLevel, fields)`
  - Validates inputs, writes/upserts identity scope, inserts system notice on revocation, logs audit.
- `resolveDisplayIdentity(viewerId, subjectId, context)`
  - Returns safe display identity or `null`.
- `applyIdentitySnapshotOnMessageCreate(messageInput)`
  - Computes snapshot fields and attaches to message before insert.
- `applyIdentitySnapshotOnPostCreate(postInput)`
  - Computes snapshot fields and attaches to post before insert.
- Optional: `insertIdentityChangeNotice(context)`
  - Creates system message for chat/cirvia.

---

## Implementation notes (Next.js + Supabase)
- Identity resolution and scope updates are **server-side only** (Next.js route handlers / server actions).
- Client never receives raw identity tables; it receives display identity objects or content snapshots.
- Supabase queries rely on RLS to ensure scope visibility.
- No service-role key is used for user-request flows.
