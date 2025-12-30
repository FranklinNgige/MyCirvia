# Messaging System (Prompt 10)

## Consent model decision (1:1 chats)
**Chosen model:** Message request required before activation.
- A user can create a chat thread with another user, but it is **created in `pending`** status.
- The recipient must accept to activate the chat (`status = active`).
- This provides a safer default aligned with privacy-first principles.

## Message schema usage (identity snapshot)
Messages store *snapshot* identity fields at creation time to avoid retroactive identity changes and prevent leakage.

**Message columns used (minimum):**
- `display_name`
- `display_avatar_url`
- `display_identity_level`
- `is_system`
- `content`
- `sender_id`
- `chat_id` or `cirvia_id`

Snapshot creation is performed server-side via an RPC:
- `get_display_identity_snapshot(p_user_id, p_scope_type, p_scope_id)`
- Returns safe-to-display fields only.

This prevents clients or other users from joining to any hidden identity data.

## Realtime strategy
- Uses Supabase realtime `postgres_changes`.
- Subscriptions are **scoped** per chat or per Cirvia via a channel:
  - `chat:${chatId}` with filter `chat_id=eq.${chatId}`
  - `cirvia:${cirviaId}` with filter `cirvia_id=eq.${cirviaId}`
- RLS is enforced on messages, so payloads remain protected.

## Moderation/report flow
- Each message can be reported via `reports` table.
- Report creation happens through server action `reportMessage` using the active user session.
- RLS must allow reporters to create reports but not read unrelated reports.

## Key query patterns
- List chats: `chat_threads` where user is participant A or B.
- List messages: `messages` filtered by `chat_id` or `cirvia_id`, ordered by `created_at DESC`.
- Pagination: cursor-based using `created_at < cursor`.

## System messages
- System messages are stored in the same `messages` table with `is_system = true`.
- Intended for identity-change notices (future).

## Attachments
- MVP: **text only**.

## Files and modules
- Server actions: `src/app/actions/messages.ts`
- Realtime utilities: `src/lib/realtime/subscribeToChatMessages.ts`, `src/lib/realtime/subscribeToCirviaMessages.ts`
- UI routes:
  - `/app/messages`
  - `/app/messages/[chatId]`
  - `/app/cirvias/[id]/chat`

## Moderation TODOs (future)
- Block user flow (server + UI) for 1:1 chats.
- Cirvia-level mute enforcement.
- Auto-mute on repeated reports.
