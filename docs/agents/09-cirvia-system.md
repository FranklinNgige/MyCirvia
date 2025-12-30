# Cirvia System (Prompt 9)

## Overview
This document defines the Cirvia (group/community) model, membership state machine, roles, invite behavior, and core query patterns for the MVP. The system is privacy-first and ensures that identity scope controls are preserved for all members.

## Cirvia States and Membership State Machine

### Cirvia Configuration
- **Visibility:** `public` or `private`.
- **Invite-only:** always enabled by default.
- **Auto-approve:** default `false` (invites create `pending` membership unless the owner/admin explicitly enables auto-approve).

### Membership States
- **invited:** an optional placeholder when an invite is issued but not yet accepted.
- **pending:** user requested to join or accepted an invite without auto-approve.
- **active:** approved member with access.
- **banned:** blocked from rejoining.

### State Transitions
- **None → Pending:** user requests to join (public or private) or accepts an invite (default).
- **Pending → Active:** owner/admin approves.
- **Pending → Invited:** owner/admin denies (keeps record for audit).
- **Active → Banned:** owner/admin bans.
- **Active → Removed:** owner/admin removes (row delete) or user leaves.
- **Banned → (no transitions):** blocked unless manually reversed by owner/admin.

## Roles & Permissions

- **Owner**
  - Edit Cirvia settings
  - Create invites
  - Approve/deny join requests
  - Assign roles (admin/moderator/member)
  - Remove/ban members

- **Admin**
  - Create invites
  - Approve/deny join requests
  - Assign moderator role
  - Remove/ban members

- **Moderator**
  - Approve/deny join requests (optional, enabled by default in UI)
  - Content moderation hooks (future)

- **Member**
  - Read Cirvia content if active
  - Cannot manage membership

**Important:** No role can force identity reveal. Admins/moderators cannot access hidden identities.

## Invite Link Behavior (Decision)
- **Single-use invite tokens** are used in MVP.
- Invites record `used_by` and `used_at` and cannot be reused.
- **Expiration** is optional and not enforced in MVP (field is included for future use).

## Key Query Patterns

- **Create Cirvia**
  - Insert into `cirvias` with `invite_only = true`, `auto_approve = false`.
  - Insert owner row into `cirvia_members` with `role = owner`, `status = active`.

- **Discover public Cirvias**
  - Select from `cirvias` where `visibility = public`.
  - Only expose `name` and `description`.

- **Request to Join**
  - Insert `cirvia_members` with `status = pending` and `role = member`.

- **Invite Accept**
  - Validate invite token
  - Insert `cirvia_members` with `status = pending` (or `active` if auto-approve enabled)
  - Mark invite as used

- **Approval**
  - Update member status to `active`

- **Denial**
  - Update member status to `invited`

- **Role Changes**
  - Update member role (`admin` or `moderator`) by owner/admin

- **Ban**
  - Update member status to `banned`

## Security & RLS Alignment

- Cirvia records are readable if public or if the user is an active member.
- Membership rows are visible to the member themselves and to active members of the same Cirvia.
- Only owners/admins can insert or update membership rows for other users.
- Invite rows are restricted to authenticated users and can only be created/updated by owner/admin.
- Audit logs are recorded for membership approvals, denials, role changes, removals, bans, and Cirvia settings changes.

## Deviations
None.
