# Database Schema Design (Supabase/PostgreSQL)

## Schema Overview
This schema models privacy-first social communities with scoped identities, 1:1 chat, group posts, and trust & safety workflows. It favors UUID primary keys, `timestamptz` timestamps, and explicit history tables so past content retains the identity that was active at creation time.

## Guiding Assumptions
- Supabase `auth.users` is the source of truth for authentication; no custom `users` table.
- All primary keys are UUIDs (generated server-side, e.g., `gen_random_uuid()`).
- All timestamps are `timestamptz`, stored in UTC.
- All user-facing identity fields are scoped and must be protected by RLS.
- Past messages/posts/comments must retain the identity snapshot used at creation time.
- Storage references are stored as object keys (e.g., Supabase Storage keys), not public URLs.
- Moderators/admins cannot see hidden identities; they operate only on content and metadata.

## Entity-Relationship Design
**Users and Profiles**
- `auth.users` (Supabase) **1:1** `profiles` via `profiles.user_id`.

**Identity Scopes**
- `identity_scopes` stores the *current* scoped identity for a user in a given scope.
- `identity_scope_revisions` stores immutable snapshots and events (set/reveal/revoke) for that scope.
- `messages`, `posts`, and `comments` reference an `identity_scope_revision` to lock identity at creation time.

**Cirvias and Memberships**
- `cirvias` **1:N** `cirvia_members`.
- `cirvia_members` **N:1** `profiles` (user membership in a cirvia).
- `cirvia_members` is the authoritative membership/role table.

**Chats and Messages**
- `chats` represent 1:1 threads, with two user participants stored on the chat row.
- `messages` **N:1** `chats`; each message references an identity snapshot.

**Posts and Comments**
- `posts` **N:1** `cirvias`.
- `comments` **N:1** `posts`.
- Both `posts` and `comments` reference identity snapshots.

**Notifications**
- `notifications` **N:1** `profiles`.

**Reports and Audit Logs**
- `reports` can target messages, posts, comments, or users (polymorphic target).
- `audit_logs` store moderation/admin actions with actor and target references.

**Deletion Behavior**
- `profiles` and identity tables: **restrict** on delete, handled via account deletion workflow.
- Content tables: user references are **set null** (or anonymized) on account deletion, but content remains.
- `cirvias` delete **cascade** to `cirvia_members`, `posts`, `comments`, and related notifications.

## Tables

### profiles
- **Purpose:** Stores user profile metadata and privacy settings tied to `auth.users`.
- **Columns (name, type, nullable, default):**
  - `user_id` (uuid, not null)
  - `real_name` (text, null)
  - `nickname` (text, null)
  - `profile_photo_key` (text, null)
  - `avatar_key` (text, null) — abstract avatar
  - `age_range` (text, null) — e.g., `18-24`, `25-34`
  - `gender` (text, null)
  - `city` (text, null)
  - `state` (text, null)
  - `profile_visibility` (jsonb, not null, default `{}`) — per-field visibility defaults
  - `is_shadow_banned` (boolean, not null, default `false`)
  - `restriction_flags` (jsonb, not null, default `{}`) — rate-limit or other flags
  - `created_at` (timestamptz, not null, default `now()`)
  - `updated_at` (timestamptz, not null, default `now()`)
- **Primary key:** `user_id`
- **Foreign keys:** `user_id` → `auth.users.id` (on delete restrict)
- **Constraints:**
  - `real_name` and `nickname` optional
- **Indexes:**
  - `profiles_shadow_banned_idx` on (`is_shadow_banned`) — moderation queues
- **RLS notes (high-level):**
  - Protect `real_name`, `nickname`, `profile_photo_key`, `avatar_key`, `city`, `state`, `age_range`, `gender`.
  - Profiles are only readable by the owner; public access is via identity scopes.

### identity_scopes
- **Purpose:** Current scoped identity settings per user and scope.
- **Columns:**
  - `id` (uuid, not null)
  - `user_id` (uuid, not null)
  - `scope_type` (text, not null) — `default`, `chat`, `cirvia`
  - `scope_id` (uuid, null) — `chats.id` or `cirvias.id` when applicable
  - `identity_level` (text, not null) — `anonymous`, `partial`, `full`
  - `display_name` (text, null)
  - `avatar_key` (text, null)
  - `profile_photo_key` (text, null)
  - `age_range` (text, null)
  - `gender` (text, null)
  - `city` (text, null)
  - `state` (text, null)
  - `visibility` (jsonb, not null, default `{}`) — per-field visibility within scope
  - `is_active` (boolean, not null, default `true`)
  - `created_at` (timestamptz, not null, default `now()`)
  - `updated_at` (timestamptz, not null, default `now()`)
- **Primary key:** `id`
- **Foreign keys:**
  - `user_id` → `auth.users.id` (on delete restrict)
  - `scope_id` → `chats.id` or `cirvias.id` (on delete cascade)
- **Constraints:**
  - Unique (`user_id`, `scope_type`, `scope_id`) — one active scope per user/context
- **Indexes:**
  - `identity_scopes_user_scope_idx` on (`user_id`, `scope_type`, `scope_id`) — lookup scoped identity
  - `identity_scopes_scope_idx` on (`scope_type`, `scope_id`) — resolve per-scope participants
- **RLS notes:**
  - Identity fields must be RLS-protected.
  - Only the owner can read/write; other users see identity via revisions referenced by content.

### identity_scope_revisions
- **Purpose:** Immutable identity snapshots and reveal/revoke events per scope.
- **Columns:**
  - `id` (uuid, not null)
  - `identity_scope_id` (uuid, not null)
  - `user_id` (uuid, not null)
  - `scope_type` (text, not null)
  - `scope_id` (uuid, null)
  - `event_type` (text, not null) — `set`, `reveal`, `revoke`
  - `identity_level` (text, not null)
  - `display_name` (text, null)
  - `avatar_key` (text, null)
  - `profile_photo_key` (text, null)
  - `age_range` (text, null)
  - `gender` (text, null)
  - `city` (text, null)
  - `state` (text, null)
  - `visibility` (jsonb, not null, default `{}`)
  - `revealed_to_user_id` (uuid, null) — for 1:1 reveals, the recipient
  - `created_at` (timestamptz, not null, default `now()`)
- **Primary key:** `id`
- **Foreign keys:**
  - `identity_scope_id` → `identity_scopes.id` (on delete cascade)
  - `user_id` → `auth.users.id` (on delete restrict)
  - `revealed_to_user_id` → `auth.users.id` (on delete set null)
- **Constraints:**
  - `scope_type` and `scope_id` must match parent `identity_scope`.
- **Indexes:**
  - `identity_scope_revisions_scope_idx` on (`identity_scope_id`, `created_at desc`) — latest snapshot
  - `identity_scope_revisions_recipient_idx` on (`revealed_to_user_id`, `created_at desc`) — reveal audit
- **RLS notes:**
  - Never publicly readable.
  - Only owner can read; limited audit access for compliance without identity fields.

### cirvias
- **Purpose:** Community groups.
- **Columns:**
  - `id` (uuid, not null)
  - `name` (text, not null)
  - `description` (text, null)
  - `visibility` (text, not null) — `public`, `private`
  - `invite_only` (boolean, not null, default `true`)
  - `owner_id` (uuid, not null)
  - `created_at` (timestamptz, not null, default `now()`)
  - `updated_at` (timestamptz, not null, default `now()`)
- **Primary key:** `id`
- **Foreign keys:**
  - `owner_id` → `auth.users.id` (on delete restrict)
- **Constraints:**
  - `visibility` in set (`public`, `private`)
- **Indexes:**
  - `cirvias_visibility_created_idx` on (`visibility`, `created_at desc`) — discovery and recent lists
  - `cirvias_owner_idx` on (`owner_id`) — manage user-owned cirvias
- **RLS notes:**
  - Membership visibility must be protected for private cirvias.

### cirvia_members
- **Purpose:** Membership and roles for cirvias.
- **Columns:**
  - `id` (uuid, not null)
  - `cirvia_id` (uuid, not null)
  - `user_id` (uuid, not null)
  - `role` (text, not null) — `owner`, `admin`, `moderator`, `member`
  - `status` (text, not null, default `active`) — `active`, `invited`, `pending`, `banned`
  - `joined_at` (timestamptz, null)
  - `created_at` (timestamptz, not null, default `now()`)
- **Primary key:** `id`
- **Foreign keys:**
  - `cirvia_id` → `cirvias.id` (on delete cascade)
  - `user_id` → `auth.users.id` (on delete restrict)
- **Constraints:**
  - Unique (`cirvia_id`, `user_id`) — prevent duplicate memberships
- **Indexes:**
  - `cirvia_members_user_idx` on (`user_id`, `status`) — list user’s cirvias
  - `cirvia_members_cirvia_idx` on (`cirvia_id`, `status`) — list members by cirvia
- **RLS notes:**
  - Memberships for private cirvias are not publicly readable.

### chats
- **Purpose:** 1:1 chat threads.
- **Columns:**
  - `id` (uuid, not null)
  - `user_a_id` (uuid, not null)
  - `user_b_id` (uuid, not null)
  - `created_at` (timestamptz, not null, default `now()`)
  - `last_message_at` (timestamptz, null)
- **Primary key:** `id`
- **Foreign keys:**
  - `user_a_id` → `auth.users.id` (on delete restrict)
  - `user_b_id` → `auth.users.id` (on delete restrict)
- **Constraints:**
  - Unique (`user_a_id`, `user_b_id`) with a canonical ordering enforced by app layer
- **Indexes:**
  - `chats_user_a_idx` on (`user_a_id`, `last_message_at desc`) — user inbox
  - `chats_user_b_idx` on (`user_b_id`, `last_message_at desc`) — user inbox
- **RLS notes:**
  - Only participants can read; no public access.

### messages
- **Purpose:** Messages in 1:1 chats.
- **Columns:**
  - `id` (uuid, not null)
  - `chat_id` (uuid, not null)
  - `sender_id` (uuid, not null)
  - `identity_revision_id` (uuid, not null)
  - `content` (text, not null)
  - `content_type` (text, not null, default `text`)
  - `attachment_key` (text, null)
  - `created_at` (timestamptz, not null, default `now()`)
  - `edited_at` (timestamptz, null)
  - `deleted_at` (timestamptz, null)
- **Primary key:** `id`
- **Foreign keys:**
  - `chat_id` → `chats.id` (on delete cascade)
  - `sender_id` → `auth.users.id` (on delete set null)
  - `identity_revision_id` → `identity_scope_revisions.id` (on delete restrict)
- **Constraints:**
  - `content_type` in set (`text`, `image`)
- **Indexes:**
  - `messages_chat_created_idx` on (`chat_id`, `created_at desc`) — chat pagination newest-first
  - `messages_sender_idx` on (`sender_id`, `created_at desc`) — user activity
- **RLS notes:**
  - Message content is not publicly readable; participants only.
  - Identity snapshot referenced must be readable only through message access.

### posts
- **Purpose:** Cirvia feed posts.
- **Columns:**
  - `id` (uuid, not null)
  - `cirvia_id` (uuid, not null)
  - `author_id` (uuid, not null)
  - `identity_revision_id` (uuid, not null)
  - `content` (text, not null)
  - `content_type` (text, not null, default `text`)
  - `attachment_key` (text, null)
  - `created_at` (timestamptz, not null, default `now()`)
  - `edited_at` (timestamptz, null)
  - `deleted_at` (timestamptz, null)
- **Primary key:** `id`
- **Foreign keys:**
  - `cirvia_id` → `cirvias.id` (on delete cascade)
  - `author_id` → `auth.users.id` (on delete set null)
  - `identity_revision_id` → `identity_scope_revisions.id` (on delete restrict)
- **Constraints:**
  - `content_type` in set (`text`, `image`)
- **Indexes:**
  - `posts_cirvia_created_idx` on (`cirvia_id`, `created_at desc`) — feed newest-first
  - `posts_author_idx` on (`author_id`, `created_at desc`) — user activity
- **RLS notes:**
  - Visible only to cirvia members; content not public unless cirvia is public.

### comments
- **Purpose:** Comments on posts.
- **Columns:**
  - `id` (uuid, not null)
  - `post_id` (uuid, not null)
  - `author_id` (uuid, not null)
  - `identity_revision_id` (uuid, not null)
  - `content` (text, not null)
  - `created_at` (timestamptz, not null, default `now()`)
  - `edited_at` (timestamptz, null)
  - `deleted_at` (timestamptz, null)
- **Primary key:** `id`
- **Foreign keys:**
  - `post_id` → `posts.id` (on delete cascade)
  - `author_id` → `auth.users.id` (on delete set null)
  - `identity_revision_id` → `identity_scope_revisions.id` (on delete restrict)
- **Constraints:**
  - None additional
- **Indexes:**
  - `comments_post_created_idx` on (`post_id`, `created_at asc`) — thread view
  - `comments_author_idx` on (`author_id`, `created_at desc`) — user activity
- **RLS notes:**
  - Visible only to cirvia members; not public.

### notifications
- **Purpose:** Minimal notification delivery queue.
- **Columns:**
  - `id` (uuid, not null)
  - `user_id` (uuid, not null)
  - `type` (text, not null) — `message`, `mention`, `invite`, `moderation`
  - `payload` (jsonb, not null, default `{}`)
  - `read_at` (timestamptz, null)
  - `created_at` (timestamptz, not null, default `now()`)
- **Primary key:** `id`
- **Foreign keys:**
  - `user_id` → `auth.users.id` (on delete cascade)
- **Constraints:**
  - None additional
- **Indexes:**
  - `notifications_user_unread_idx` on (`user_id`, `read_at`) — unread notifications
  - `notifications_user_created_idx` on (`user_id`, `created_at desc`) — pagination
- **RLS notes:**
  - Only owner can read.

### reports
- **Purpose:** User reports for moderation.
- **Columns:**
  - `id` (uuid, not null)
  - `reporter_id` (uuid, not null)
  - `target_type` (text, not null) — `message`, `post`, `comment`, `user`
  - `target_id` (uuid, not null)
  - `reason` (text, not null)
  - `details` (text, null)
  - `status` (text, not null, default `open`) — `open`, `triaged`, `resolved`, `rejected`
  - `reviewed_by` (uuid, null)
  - `reviewed_at` (timestamptz, null)
  - `created_at` (timestamptz, not null, default `now()`)
- **Primary key:** `id`
- **Foreign keys:**
  - `reporter_id` → `auth.users.id` (on delete set null)
  - `reviewed_by` → `auth.users.id` (on delete set null)
- **Constraints:**
  - `target_type` in set (`message`, `post`, `comment`, `user`)
- **Indexes:**
  - `reports_status_created_idx` on (`status`, `created_at asc`) — report queue for admins
  - `reports_target_idx` on (`target_type`, `target_id`) — duplicate report analysis
- **RLS notes:**
  - Never publicly readable; only reporter and authorized moderators.

### audit_logs
- **Purpose:** Immutable audit trail for moderation and admin actions.
- **Columns:**
  - `id` (uuid, not null)
  - `actor_id` (uuid, not null)
  - `action` (text, not null) — e.g., `shadow_ban`, `remove_post`, `resolve_report`
  - `target_type` (text, not null)
  - `target_id` (uuid, not null)
  - `reason` (text, null)
  - `metadata` (jsonb, not null, default `{}`)
  - `created_at` (timestamptz, not null, default `now()`)
- **Primary key:** `id`
- **Foreign keys:**
  - `actor_id` → `auth.users.id` (on delete set null)
- **Constraints:**
  - None additional
- **Indexes:**
  - `audit_logs_action_created_idx` on (`action`, `created_at desc`) — audit reviews
  - `audit_logs_target_idx` on (`target_type`, `target_id`) — investigation trails
- **RLS notes:**
  - Never publicly readable; admin-only.

## Security-Critical Fields (RLS Must Protect)
- Identity fields: `profiles.real_name`, `profiles.nickname`, `profiles.profile_photo_key`, `profiles.avatar_key`, plus all identity fields in `identity_scopes` and `identity_scope_revisions`.
- Content visibility: `messages.content`, `posts.content`, `comments.content`.
- Membership visibility: `cirvia_members` for private cirvias.
- Moderation details: `reports.*`, `audit_logs.*`.
- Tables never publicly readable: `identity_scopes`, `identity_scope_revisions`, `reports`, `audit_logs`, `chats`, `messages`, `notifications`.

## Key Query Patterns
- **Fetch cirvia feed newest-first:** `posts` by `cirvia_id` ordered by `created_at desc`.
- **Fetch chat messages newest-first (pagination):** `messages` by `chat_id` ordered by `created_at desc`.
- **Fetch unread notifications:** `notifications` by `user_id` where `read_at is null`.
- **List user’s cirvias:** `cirvia_members` by `user_id` and `status` with join to `cirvias`.
- **Report queue for admins/moderators:** `reports` by `status` and `created_at asc`.
- **Enforce unique membership:** unique constraint on (`cirvia_id`, `user_id`).
- **Resolve identity for message/post/comment:** join `identity_scope_revisions` by `identity_revision_id`.

## Data Lifecycle / Deletion Policy Notes
- **Account deletion:**
  - Delete `profiles`, `identity_scopes`, and `identity_scope_revisions` for the user.
  - Anonymize content by setting `author_id`/`sender_id` to null (keep content records).
  - Keep `reports` and `audit_logs` with `actor_id` set null to preserve moderation history.
- **Message retention:**
  - Messages are retained; sender is anonymized if account deleted.
  - Identity snapshot remains for historical rendering, but is no longer tied to a real profile.
- **Post retention:**
  - Posts/comments remain for community integrity; authors anonymized.

## Open Questions
- Should we implement a separate `chat_participants` table for future multi-party chats?
- Do we need a dedicated `content_visibility` field to support post-level access overrides?

## Handoff
- **Files to create/update (exact paths):**
  - `docs/agents/04-db-schema.md`
- **Decisions made:**
  - Use `identity_scopes` for current scoped identity and `identity_scope_revisions` for immutable snapshots.
  - Messages/posts/comments reference identity revisions to preserve historical identity display.
  - Content is retained on account deletion; authors are anonymized.
- **Assumptions:**
  - Supabase `auth.users` is authoritative.
  - UUID primary keys and `timestamptz` timestamps throughout.
- **Open questions:**
  - See “Open Questions” section above.
- **What Prompt 5 must read next:**
  - `docs/agents/04-db-schema.md`
