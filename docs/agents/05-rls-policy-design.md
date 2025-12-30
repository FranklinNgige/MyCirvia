# Supabase RLS Policy Design (Prompt 5)

## RLS Principles
- **Default-deny everywhere**: RLS enabled on every table; no `SELECT/INSERT/UPDATE/DELETE` allowed without explicit policies.
- **Separate read vs write policies**: each table has distinct conditions for read, create, edit, and delete.
- **Identity privacy is absolute**: hidden identities are not readable by anyone other than the owner, including moderators and admins.
- **Admin dashboard is not a bypass**: “admin” is still subject to RLS; any true bypass must be server-side via service-role endpoints.
- **Minimum exposure for moderation**: reported content is accessible only through scoped, report-based access paths.
- **Realtime safety**: realtime subscriptions only on RLS-protected tables; payloads must not include hidden identity fields.

### Policy Strategy Overview
- **RLS stance**: enabled on every table; default deny.
- **Read/write separation**: separate `SELECT` vs `INSERT/UPDATE/DELETE` policies for auditability.
- **Roles handling**: user roles are scoped to cirvias; platform staff roles (if any) are limited to reports and audit logs only.
- **Admin powers without identity leakage**: moderation actions can be performed on content, but identity fields remain hidden unless the identity is already revealed in scope.

## Role Model
### Cirvia roles (stored in `cirvia_members.role`)
- **owner**: full management of cirvia settings/membership; still no access to hidden identities.
- **admin**: manage content and members within cirvia; no identity override.
- **moderator**: moderate content in cirvia; no identity override.
- **member**: standard participation rights.

### Platform staff roles (if present in schema)
- **platform_moderator** (optional): can read reports and the reported object content only; cannot read hidden identities.
- **platform_admin** (optional): can read audit logs and reports but still cannot read hidden identities.

**Key rule**: Moderators/admins can moderate content but **cannot** view hidden identities. Any admin tooling must operate under RLS and only use data already allowed by the identity scope.

## Policy Matrix by Table
> NOTE: Policies below assume helper conditions such as `auth.uid()` for current user and functions to verify membership/roles. These conditions are described in plain language only (no SQL yet).

### Table: profiles
- **SELECT**: only the profile owner can read full profile. Others can only read public/anonymous fields that are safe (age range, gender, abstract display name) and only when a scope allows identity reveal.
- **INSERT**: only the authenticated user can create their own profile.
- **UPDATE**: only the profile owner can update.
- **DELETE**: only the profile owner (or service role for account deletion).

### Table: identity_scopes
- **SELECT**: only the identity owner can read all their scopes. Other users can read a **derived, safe view** of scope only if they are in the same scope and the owner has revealed identity there (no hidden fields).
- **INSERT**: only the identity owner can create scope entries for themselves.
- **UPDATE**: only the identity owner can update their scopes.
- **DELETE**: only the identity owner can delete/revoke their scopes.

### Table: cirvias
- **SELECT**: public cirvias visible to everyone; private cirvias only visible to members (including pending/invited only if explicitly allowed by design).
- **INSERT**: authenticated users can create cirvias.
- **UPDATE**: only owner/admin of that cirvia.
- **DELETE**: only owner (or service role for compliance deletions).

### Table: cirvia_members
- **SELECT**: members can see membership list **only for their cirvia**; private cirvia membership list visible only to members; pending members see only their own membership row.
- **INSERT**: owner/admin can invite/add; user can create a “pending” join request for themselves if cirvia is joinable.
- **UPDATE**: owner/admin can update roles/status; a user can update their own membership status only for self-leave.
- **DELETE**: owner/admin can remove; user can delete their own membership (leave).

### Table: chats (1:1)
- **SELECT**: only participants can see the chat row.
- **INSERT**: only a participant can create a chat with another user (no third-party creation).
- **UPDATE**: only participants (e.g., last read timestamps); no identity fields stored here.
- **DELETE**: only participants (soft delete preferred).

### Table: messages
- **SELECT**: only participants can read messages; moderators/admins can read **only** messages tied to a report they are authorized to review. Messages must include a snapshot display identity used at send time.
- **INSERT**: only a participant can send a message in that chat.
- **UPDATE**: only message author can edit within allowed window; edits should not alter display snapshot identity.
- **DELETE**: only message author (soft delete preferred) or moderator/admin **only** in their cirvia scope and only for reported content.

### Table: posts
- **SELECT**: visible to cirvia members for private cirvias; public cirvia posts visible to all (but identity view must be scoped). Moderators/admins can see posts only within their cirvia and only with the same identity scope rules.
- **INSERT**: cirvia members can create posts.
- **UPDATE**: only post author; moderators/admins can update for moderation (content removal) within their cirvia.
- **DELETE**: only post author; moderators/admins can delete within their cirvia.

### Table: comments
- **SELECT**: same visibility as parent post; only cirvia members for private cirvia.
- **INSERT**: cirvia members can comment.
- **UPDATE**: only comment author; moderators/admins for moderation within their cirvia.
- **DELETE**: only comment author; moderators/admins for moderation within their cirvia.

### Table: notifications
- **SELECT**: only notification owner.
- **INSERT**: system/service role only (notifications generated server-side).
- **UPDATE**: only notification owner (read status).
- **DELETE**: only notification owner.

### Table: reports
- **SELECT**: reporter can read their own reports; authorized moderators/admins can read reports for the relevant cirvia; platform staff can read reports but **only** see object content, never hidden identities.
- **INSERT**: any authenticated user can create a report for content they can see.
- **UPDATE**: only authorized moderators/admins can update status/notes.
- **DELETE**: reporter can delete their own report only if still open; otherwise moderators/admins.

### Table: audit_logs
- **SELECT**: only platform admins (or service role) and only logs that do not include hidden identity data.
- **INSERT**: system/service role or authorized moderation endpoints.
- **UPDATE**: no updates (append-only).
- **DELETE**: restricted to service role for retention policy.

## Identity Privacy Guarantees
- **Identity read rules**: A user can only read another user’s identity if:
  - The identity is revealed in that scope (chat or cirvia), **or**
  - The viewer is the identity owner (self).
- **Message display snapshots**: `messages` store immutable display fields at send time (e.g., `display_name`, `display_avatar`, `display_level`). This prevents retroactive identity changes and ensures message history is safe without extra joins.
- **Correlation prevention**:
  - Do not allow joins that expose hidden identity fields (e.g., `profiles` joined to `messages`) unless scope-reveal is true.
  - Provide a derived safe view for identity display when needed (e.g., `message_display`), ensuring that sensitive profile fields are never accessible without scope.

### Private Cirvia Rules (Explicit)
- **Existence visibility**: private cirvia records are only visible to members; no directory listing for non-members.
- **Member lists**: visible only to members; pending members can see only their own membership row.
- **Content visibility**: posts/messages inside private cirvias are visible only to approved members.
- **Invites/join approvals**: invite tokens are validated server-side; RLS ensures non-members cannot see or infer private cirvia data.

### Chat Rules (1:1)
- **Thread visibility**: only the two participants can see the chat row and messages.
- **Reported access**: moderators/admins can access only reported message content via scoped report access, never through direct messages browsing.
- **Blocking (policy-ready)**: if a block table exists, block relationships prevent message reads and new sends.

### Reports & Moderation Access
- **Create**: any authenticated user can report content they can read.
- **Read**: only authorized moderators/admins for that cirvia or platform staff can read reports.
- **What’s visible**: reported object content is visible; hidden identity fields are **not** visible unless already revealed in the viewer’s scope.
- **No blanket access**: moderators/admins do not get general read access to `messages` or `profiles`.

### Audit Logs
- **Write**: system/service role and authorized moderation endpoints only.
- **Read**: platform admins only, with logs scrubbed of hidden identity data.
- **Append-only**: no updates, limited deletes per retention.

## Edge Cases & Abuse Scenarios
- **User removed from cirvia**: membership revocation immediately prevents access to cirvia posts/messages and member lists.
- **Banned users**: blocked from all cirvia content regardless of old invite links; membership status check enforces denial.
- **Pending members**: no access to cirvia content or member lists until approved.
- **Account deletion**: messages/posts remain with anonymized display snapshot (no profile linkage); identity scopes removed.
- **Identity revocation**: no effect on past messages due to snapshots; future content uses new identity settings.
- **Moderator abuse prevention**: moderators/admins cannot query identity scopes or profiles outside reveal rules; report access is scoped to cirvia and only for objects they could otherwise access.
- **Report spamming**: reporters can only report content they can see, preventing content enumeration.

## Open Questions
- Do we need a platform-level role table, or are platform staff roles stored in `profiles`?
- Should private cirvia existence be fully hidden (no directory listing) except via invite?
- Do we need a dedicated “moderation_view” for limited content exposure, or can we rely on scoped access via reports only?

## Storage Policy Intent (High-Level)
- Buckets are private by default.
- Only owners (or cirvia members for shared assets) can access objects.
- Use signed URLs generated server-side for media access.
- Object metadata must not include hidden identity data.

## Realtime Safety Notes
- Realtime enabled only on tables with strict RLS: **messages**, **posts**, **comments**, **notifications**.
- Realtime subscriptions must include strict filters (e.g., chat_id, cirvia_id) and must not expose identity fields unless allowed by scope.
- Avoid enabling realtime on `profiles` or `identity_scopes`.

## Handoff
- **Files to create/update**:
  - `docs/agents/05-rls-policy-design.md`
- **Decisions made**:
  - RLS enabled on every table with default-deny stance.
  - Identity exposure is only allowed per-scope and never overridden by staff roles.
  - Report access is scoped to authorized moderators/admins and does not grant identity visibility.
  - Message display identity stored as immutable snapshots.
- **Assumptions**:
  - Schema includes `cirvia_members.role` and an identity scope table keyed by user + scope.
  - Reports link to a specific content object and include cirvia context.
- **Open questions**:
  - Platform staff role storage location.
  - Private cirvia discoverability rules.
  - Whether to use a dedicated moderation view.
- **What Prompt 6 must read next**:
  - SQL migrations for schema + RLS policies implementing the above rules.
