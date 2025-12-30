create extension if not exists "pgcrypto";

create table if not exists public.cirvias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  visibility text not null check (visibility in ('public', 'private')),
  invite_only boolean not null default true,
  auto_approve boolean not null default false,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cirvia_members (
  id uuid primary key default gen_random_uuid(),
  cirvia_id uuid not null references public.cirvias (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'moderator', 'member')),
  status text not null check (status in ('invited', 'pending', 'active', 'banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cirvia_id, user_id)
);

create table if not exists public.cirvia_invites (
  id uuid primary key default gen_random_uuid(),
  cirvia_id uuid not null references public.cirvias (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  single_use boolean not null default true,
  used_by uuid references auth.users (id),
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  cirvia_id uuid references public.cirvias (id) on delete cascade,
  action text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.cirvia_has_role(
  target_cirvia_id uuid,
  target_user_id uuid,
  roles text[]
) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.cirvia_members
    where cirvia_id = target_cirvia_id
      and user_id = target_user_id
      and status = 'active'
      and role = any (roles)
  );
$$;

create or replace function public.cirvia_is_member(
  target_cirvia_id uuid,
  target_user_id uuid
) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.cirvia_members
    where cirvia_id = target_cirvia_id
      and user_id = target_user_id
      and status = 'active'
  );
$$;

alter table public.cirvias enable row level security;
alter table public.cirvia_members enable row level security;
alter table public.cirvia_invites enable row level security;
alter table public.audit_logs enable row level security;

create policy "cirvias_select_public_or_member"
  on public.cirvias
  for select
  using (
    visibility = 'public'
    or public.cirvia_is_member(id, auth.uid())
  );

create policy "cirvias_insert_owner"
  on public.cirvias
  for insert
  with check (owner_id = auth.uid());

create policy "cirvias_update_owner"
  on public.cirvias
  for update
  using (owner_id = auth.uid());

create policy "cirvias_delete_owner"
  on public.cirvias
  for delete
  using (owner_id = auth.uid());

create policy "members_select_self_or_member"
  on public.cirvia_members
  for select
  using (
    user_id = auth.uid()
    or public.cirvia_is_member(cirvia_id, auth.uid())
  );

create policy "members_insert_self_pending"
  on public.cirvia_members
  for insert
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and not exists (
      select 1
      from public.cirvia_members as existing
      where existing.cirvia_id = cirvia_members.cirvia_id
        and existing.user_id = auth.uid()
        and existing.status = 'banned'
    )
  );

create policy "members_insert_admin"
  on public.cirvia_members
  for insert
  with check (
    public.cirvia_has_role(cirvia_id, auth.uid(), array['owner', 'admin'])
  );

create policy "members_update_admin"
  on public.cirvia_members
  for update
  using (
    public.cirvia_has_role(cirvia_id, auth.uid(), array['owner', 'admin'])
  );

create policy "members_delete_admin"
  on public.cirvia_members
  for delete
  using (
    public.cirvia_has_role(cirvia_id, auth.uid(), array['owner', 'admin'])
    or user_id = auth.uid()
  );

create policy "invites_select_authenticated"
  on public.cirvia_invites
  for select
  using (auth.role() = 'authenticated');

create policy "invites_insert_admin"
  on public.cirvia_invites
  for insert
  with check (
    public.cirvia_has_role(cirvia_id, auth.uid(), array['owner', 'admin'])
  );

create policy "invites_update_admin"
  on public.cirvia_invites
  for update
  using (
    public.cirvia_has_role(cirvia_id, auth.uid(), array['owner', 'admin'])
  );

create policy "audit_logs_insert_authenticated"
  on public.audit_logs
  for insert
  with check (auth.role() = 'authenticated');

create policy "audit_logs_select_member"
  on public.audit_logs
  for select
  using (public.cirvia_is_member(cirvia_id, auth.uid()));
