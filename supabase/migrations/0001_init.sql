-- supabase/migrations/0001_init.sql
-- Migration: Initial schema + RLS policies for MyCirvia
-- Assumptions: auth.users exists (Supabase), pgcrypto extension is available for gen_random_uuid().

-- 1) Extensions
create extension if not exists "pgcrypto";

-- 2) Types / Enums
create type identity_level as enum ('anonymous', 'partial', 'full');
create type identity_scope_type as enum ('default', 'chat', 'cirvia');
create type cirvia_visibility as enum ('public', 'private');
create type cirvia_role as enum ('owner', 'admin', 'moderator', 'member');
create type cirvia_member_status as enum ('active', 'invited', 'banned');
create type chat_type as enum ('direct', 'group');
create type report_target_type as enum ('user', 'message', 'post', 'comment');
create type report_status as enum ('open', 'reviewing', 'resolved');

-- 3) Tables
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table identity_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope_type identity_scope_type not null,
  scope_id uuid,
  identity_level identity_level not null default 'anonymous',
  display_name text,
  avatar_url text,
  age_range text,
  gender text,
  city text,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_scopes_scope_check check (
    (scope_type = 'default' and scope_id is null)
    or (scope_type in ('chat', 'cirvia') and scope_id is not null)
  ),
  constraint identity_scopes_unique_scope unique (user_id, scope_type, scope_id)
);

create table cirvias (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  visibility cirvia_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cirvia_members (
  id uuid primary key default gen_random_uuid(),
  cirvia_id uuid not null references cirvias(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role cirvia_role not null default 'member',
  status cirvia_member_status not null default 'active',
  joined_at timestamptz not null default now(),
  unique (cirvia_id, user_id)
);

create table chats (
  id uuid primary key default gen_random_uuid(),
  chat_type chat_type not null default 'direct',
  cirvia_id uuid references cirvias(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table chat_participants (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (chat_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  cirvia_id uuid not null references cirvias(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  cirvia_id uuid references cirvias(id) on delete cascade,
  chat_id uuid references chats(id) on delete cascade,
  status report_status not null default 'open',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  cirvia_id uuid references cirvias(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4) Constraints / FKs already defined inline

-- 5) Indexes
create index idx_identity_scopes_user_scope on identity_scopes (user_id, scope_type, scope_id);
create index idx_cirvias_owner on cirvias (owner_id);
create index idx_cirvia_members_user on cirvia_members (user_id);
create index idx_chat_participants_user on chat_participants (user_id);
create index idx_messages_chat_created on messages (chat_id, created_at desc, id desc);
create index idx_posts_cirvia_created on posts (cirvia_id, created_at desc, id desc);
create index idx_post_comments_post_created on post_comments (post_id, created_at desc, id desc);
create index idx_reports_cirvia on reports (cirvia_id, created_at desc);

-- 6) RLS enablement
alter table profiles enable row level security;
alter table identity_scopes enable row level security;
alter table cirvias enable row level security;
alter table cirvia_members enable row level security;
alter table chats enable row level security;
alter table chat_participants enable row level security;
alter table messages enable row level security;
alter table posts enable row level security;
alter table post_comments enable row level security;
alter table post_likes enable row level security;
alter table reports enable row level security;
alter table audit_logs enable row level security;

-- 7) Policies
-- profiles: only owner can manage
create policy profiles_select_own on profiles
  for select using (auth.uid() = user_id);
create policy profiles_insert_own on profiles
  for insert with check (auth.uid() = user_id);
create policy profiles_update_own on profiles
  for update using (auth.uid() = user_id);
create policy profiles_delete_own on profiles
  for delete using (auth.uid() = user_id);

-- identity_scopes: owner can manage; others can only see scopes where they share context
create policy identity_scopes_select_owner on identity_scopes
  for select using (auth.uid() = user_id);
create policy identity_scopes_select_chat_participants on identity_scopes
  for select using (
    scope_type = 'chat'
    and exists (
      select 1 from chat_participants cp
      where cp.chat_id = identity_scopes.scope_id
        and cp.user_id = auth.uid()
    )
  );
create policy identity_scopes_select_cirvia_members on identity_scopes
  for select using (
    scope_type = 'cirvia'
    and exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = identity_scopes.scope_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
    )
  );
create policy identity_scopes_insert_own on identity_scopes
  for insert with check (auth.uid() = user_id);
create policy identity_scopes_update_own on identity_scopes
  for update using (auth.uid() = user_id);
create policy identity_scopes_delete_own on identity_scopes
  for delete using (auth.uid() = user_id);

-- cirvias: visible if public or member; only owner can manage
create policy cirvias_select_public_or_member on cirvias
  for select using (
    visibility = 'public'
    or exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = cirvias.id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
    )
  );
create policy cirvias_insert_owner on cirvias
  for insert with check (auth.uid() = owner_id);
create policy cirvias_update_owner on cirvias
  for update using (auth.uid() = owner_id);
create policy cirvias_delete_owner on cirvias
  for delete using (auth.uid() = owner_id);

-- cirvia_members: members can see roster; self-join public; owners/admins manage
create policy cirvia_members_select_member on cirvia_members
  for select using (
    exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = cirvia_members.cirvia_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
    )
  );
create policy cirvia_members_insert_self_public on cirvia_members
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from cirvias c
      where c.id = cirvia_members.cirvia_id
        and c.visibility = 'public'
    )
  );
create policy cirvia_members_update_admin on cirvia_members
  for update using (
    exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = cirvia_members.cirvia_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );
create policy cirvia_members_delete_self_or_admin on cirvia_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = cirvia_members.cirvia_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- chats: only participants can see; creator manages
create policy chats_select_participant on chats
  for select using (
    exists (
      select 1 from chat_participants cp
      where cp.chat_id = chats.id
        and cp.user_id = auth.uid()
    )
  );
create policy chats_insert_creator on chats
  for insert with check (auth.uid() = created_by);
create policy chats_update_creator on chats
  for update using (auth.uid() = created_by);
create policy chats_delete_creator on chats
  for delete using (auth.uid() = created_by);

-- chat_participants: participants can see; creator can add/remove; users can leave
create policy chat_participants_select_member on chat_participants
  for select using (
    exists (
      select 1 from chat_participants cp
      where cp.chat_id = chat_participants.chat_id
        and cp.user_id = auth.uid()
    )
  );
create policy chat_participants_insert_creator on chat_participants
  for insert with check (
    exists (
      select 1 from chats c
      where c.id = chat_participants.chat_id
        and c.created_by = auth.uid()
    )
  );
create policy chat_participants_delete_self_or_creator on chat_participants
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from chats c
      where c.id = chat_participants.chat_id
        and c.created_by = auth.uid()
    )
  );

-- messages: participants can read; sender can write/edit/delete
create policy messages_select_participant on messages
  for select using (
    exists (
      select 1 from chat_participants cp
      where cp.chat_id = messages.chat_id
        and cp.user_id = auth.uid()
    )
  );
create policy messages_insert_sender on messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from chat_participants cp
      where cp.chat_id = messages.chat_id
        and cp.user_id = auth.uid()
    )
  );
create policy messages_update_sender on messages
  for update using (auth.uid() = sender_id);
create policy messages_delete_sender on messages
  for delete using (auth.uid() = sender_id);

-- posts: only cirvia members can read/write
create policy posts_select_member on posts
  for select using (
    exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = posts.cirvia_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
    )
    or exists (
      select 1 from cirvias c
      where c.id = posts.cirvia_id
        and c.visibility = 'public'
    )
  );
create policy posts_insert_member on posts
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = posts.cirvia_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
    )
  );
create policy posts_update_author on posts
  for update using (auth.uid() = author_id);
create policy posts_delete_author on posts
  for delete using (auth.uid() = author_id);

-- post_comments: readable by members who can see the post; author manages
create policy post_comments_select_member on post_comments
  for select using (
    exists (
      select 1
      from posts p
      where p.id = post_comments.post_id
        and (
          exists (
            select 1 from cirvia_members cm
            where cm.cirvia_id = p.cirvia_id
              and cm.user_id = auth.uid()
              and cm.status = 'active'
          )
          or exists (
            select 1 from cirvias c
            where c.id = p.cirvia_id
              and c.visibility = 'public'
          )
        )
    )
  );
create policy post_comments_insert_member on post_comments
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1
      from posts p
      where p.id = post_comments.post_id
        and exists (
          select 1 from cirvia_members cm
          where cm.cirvia_id = p.cirvia_id
            and cm.user_id = auth.uid()
            and cm.status = 'active'
        )
    )
  );
create policy post_comments_update_author on post_comments
  for update using (auth.uid() = author_id);
create policy post_comments_delete_author on post_comments
  for delete using (auth.uid() = author_id);

-- post_likes: readable by members who can see the post; liker manages
create policy post_likes_select_member on post_likes
  for select using (
    exists (
      select 1
      from posts p
      where p.id = post_likes.post_id
        and (
          exists (
            select 1 from cirvia_members cm
            where cm.cirvia_id = p.cirvia_id
              and cm.user_id = auth.uid()
              and cm.status = 'active'
          )
          or exists (
            select 1 from cirvias c
            where c.id = p.cirvia_id
              and c.visibility = 'public'
          )
        )
    )
  );
create policy post_likes_insert_member on post_likes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from posts p
      where p.id = post_likes.post_id
        and exists (
          select 1 from cirvia_members cm
          where cm.cirvia_id = p.cirvia_id
            and cm.user_id = auth.uid()
            and cm.status = 'active'
        )
    )
  );
create policy post_likes_delete_owner on post_likes
  for delete using (auth.uid() = user_id);

-- reports: reporter can see own; moderators/admins/owners see cirvia reports; chat participants see chat reports
create policy reports_select_reporter on reports
  for select using (auth.uid() = reporter_id);
create policy reports_select_cirvia_moderation on reports
  for select using (
    cirvia_id is not null
    and exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = reports.cirvia_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin', 'moderator')
    )
  );
create policy reports_select_chat_participant on reports
  for select using (
    chat_id is not null
    and exists (
      select 1 from chat_participants cp
      where cp.chat_id = reports.chat_id
        and cp.user_id = auth.uid()
    )
  );
create policy reports_insert_reporter on reports
  for insert with check (auth.uid() = reporter_id);
create policy reports_update_moderation on reports
  for update using (
    exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = reports.cirvia_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin', 'moderator')
    )
  );

-- audit_logs: visible to moderation roles for that cirvia
create policy audit_logs_select_moderation on audit_logs
  for select using (
    cirvia_id is not null
    and exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = audit_logs.cirvia_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin', 'moderator')
    )
  );
create policy audit_logs_insert_moderation on audit_logs
  for insert with check (
    cirvia_id is not null
    and exists (
      select 1 from cirvia_members cm
      where cm.cirvia_id = audit_logs.cirvia_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin', 'moderator')
    )
  );

-- 8) Grants (not required; Supabase manages authenticated/anon roles)

-- 9) Verification (example queries)
-- Verify tables exist
-- select table_name from information_schema.tables where table_schema = 'public';
-- Verify RLS is enabled
-- select relname, relrowsecurity from pg_class where relname in (
--   'profiles','identity_scopes','cirvias','cirvia_members','chats','chat_participants',
--   'messages','posts','post_comments','post_likes','reports','audit_logs'
-- );
-- Verify policy basics (run as authenticated user)
-- select * from profiles where user_id = auth.uid();
-- select * from cirvias where visibility = 'public';
-- select * from messages limit 5;
