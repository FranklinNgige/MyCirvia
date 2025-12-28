# MyCirvia – Product Requirements Document (PRD)

## 1. Product Overview

**Product Name:** MyCirvia  
**Product Type:** Privacy-First Social Community Platform  
**Primary Focus:** High-trust, stigma-sensitive communities (HIV/AIDS inclusive)  
**Platforms:**
- Mobile: Flutter (iOS & Android)
- Web: Next.js (Public site + Admin dashboard)

**Backend:** NestJS (TypeScript)  
**Database:** PostgreSQL (Prisma ORM)  
**Realtime:** WebSockets + Redis  
**Status:** MVP → Scalable Production Platform

---

## 2. Vision

MyCirvia is a privacy-first community platform designed for sensitive and high-trust environments.

It empowers users to connect, support one another, and build relationships **without forced identity exposure**, allowing trust to grow naturally.

Users decide **when**, **where**, and **to whom** their identity is revealed — per chat, per group, and per interaction.

---

## 3. Problem Statement

Traditional social platforms force early identity exposure, which:

- Discourages participation in sensitive communities
- Enables harassment and trolling
- Puts vulnerable users at risk
- Removes user agency over disclosure

For communities affected by HIV/AIDS and similar sensitive realities, **identity control is essential**.

---

## 4. Solution

MyCirvia introduces a **Scoped Identity Model** where:

- Users are anonymous by default
- Identity is revealed only by explicit user action
- Identity visibility is scoped per chat and per group
- No administrator or moderator can override identity choices

This approach balances **privacy, dignity, and organic trust formation**.

---

## 5. Core Principles

- Privacy by default
- User-controlled disclosure
- No forced real names
- No public identity scraping
- Community-led trust
- Slow, ethical growth over virality

---

## 6. Target Users

### Primary
- Adults living with HIV/AIDS (18+)
- Supportive partners and spouses
- Peer support groups
- Long-term survivors mentoring others

### Secondary
- NGOs (as referrers, not data owners)
- Counselors and advocates (non-clinical)
- Community moderators

---

## 7. Core Concepts & Terminology

- **Cirvia:** A private or public community group
- **Anonymous Identity:** System-generated name + abstract avatar
- **Partial Identity:** Limited, user-selected attributes
- **Full Identity:** User-chosen name and profile photo
- **Identity Scope:** The context where identity is visible

---

## 8. Identity & Privacy System (Key Feature)

### 8.1 Default Identity State (First Login)

By default, all users appear as:
- System-generated abstract name (e.g., `BlueWave_47`)
- Abstract, non-human avatar
- No profile photo
- No real name

**Public attributes (default):**
- Age range (not exact age)
- Gender (male / female)
- No location shown

---

### 8.2 Identity Levels

**Anonymous Identity**
- Abstract name + avatar
- Age range and gender only

**Partial Identity**
User may enable individually:
- Age
- Gender
- City
- State
- Custom nickname (non-real name)
- Custom abstract avatar

**Full Identity**
User may enable:
- Real name or chosen nickname
- Profile picture
- Full profile visibility

---

### 8.3 Identity Scope Control

Identity is **never global**.

Users manage identity separately for:
- One-to-one chats
- Each Cirvia (group)
- Future chats (default template)

Changes in one scope **do not affect any other scope**.

---

### 8.4 Mutual Identity Reveal (1:1 Chats)

- Identity reveal is voluntary
- Either party may reveal independently
- Optional mutual reveal confirmation
- Identity can be revoked at any time

---

### 8.5 Identity Revocation Behavior

- Past messages retain the identity used at the time
- System inserts a notice: *“User has changed identity visibility”*
- No retroactive rewriting of history

---

### 8.6 Group Identity Rules

- Identity selected per Cirvia
- Admins cannot force identity reveal
- Moderators cannot see hidden identities
- Default remains anonymous unless user opts in

---

## 9. Onboarding & Consent Flow

During signup, users must acknowledge:
- MyCirvia is **not a medical platform**
- No diagnosis verification is required
- Community guidelines and reporting rules
- Identity defaults and scope controls

Users confirm:
- Default anonymous identity
- Optional profile attributes
- Visibility expectations

---

## 10. Core Features (MVP)

### Authentication
- Email + password
- Email verification
- JWT access and refresh tokens
- Password reset
- No real-name requirement

### Cirvia Management
- Public or private Cirvias
- Invite-only by default
- Roles: Owner, Admin, Moderator, Member

### Member Management
- Invite links
- Join approvals
- Mute, ban, remove
- Identity-respecting moderation tools

### Feed & Posts
- Text and image posts
- Scoped or anonymous identity display
- Likes and comments (non-gamified)
- Edit and delete own content

### Messaging
- One-to-one messaging
- Group chat inside Cirvias
- Realtime via WebSockets
- Scoped identity enforcement

### Notifications
- Messages
- Mentions
- Invitations
- Moderation actions

---

## 11. Trust, Safety & Anti-Trolling

### Progressive Trust Model
- New accounts have rate limits
- Gradual access expansion
- No visible “new user” labels

### Anti-Trolling Controls
- DM limits for new users
- Post frequency limits
- Group join rate limits
- Silent restrictions instead of public punishment

### Reporting & Enforcement
- One-tap reporting
- Auto-mute after repeated reports
- Shadow banning for trolls
- Immediate removal for severe abuse

### Moderator Authority
- Moderators cannot see hidden identities
- Moderators cannot override identity scopes
- All actions logged in audit logs

---

## 12. Admin & Internal Access

### Admin Dashboard
- User management
- Report review queue
- Content moderation
- System health monitoring

### Internal Privacy Rules
- No browsing of private chats
- Chat access only via reported content
- All admin access logged
- No access to unrevealed identities

---

## 13. Technical Architecture

### Frontend
- Flutter (mobile)
- Next.js (web + admin)

### Backend
- NestJS (TypeScript)
- REST APIs
- WebSockets
- Redis (pub/sub, rate limiting)
- BullMQ (background jobs)

### Database
- PostgreSQL
- Prisma ORM
- Identity scopes stored per user and context

### Storage
- AWS S3
- Signed URLs only

### Notifications
- Firebase Cloud Messaging (FCM)

### Analytics
- Privacy-friendly analytics only
- No ad tracking
- No third-party profiling

---

## 14. Security & Privacy

- HTTPS everywhere
- Argon2 password hashing
- Encrypted secrets
- Role-based access control
- API-level identity enforcement
- Daily encrypted backups

---

## 15. Data Rights & Account Lifecycle

- Account deletion removes:
  - Profile data
  - Identity settings
  - Personal metadata
- Messages anonymized but retained for community integrity
- Data export available on request
- No data resale
- Law enforcement requests honored only when legally required

---

## 16. Legal & Compliance

- Platform is 18+ only
- Clear Terms of Service
- Transparent Privacy Policy
- Community Guidelines
- Crisis & support resources page
- Explicit non-medical positioning

---

## 17. Scalability Strategy

- Stateless backend services
- Horizontal scaling via ECS
- Redis-backed realtime messaging
- CDN for media
- Read replicas (future)

---

## 18. Monetization (Future-Ready)

- Platform remains free for users
- Future monetization via:
  - Organization sponsorships
  - Optional premium community tools
- No ads
- No selling user data

---

## 19. MVP Timeline

**Phase 1 (Weeks 1–2)**  
Authentication, onboarding, anonymous identity, Cirvias

**Phase 2 (Weeks 3–4)**  
Posts, messaging, scoped identity

**Phase 3 (Weeks 5–6)**  
Notifications, moderation, QA, security review

---

## 20. Definition of MVP Complete

- Users interact anonymously by default
- Identity is fully user-controlled
- No forced disclosure
- Communities are safe and moderated
- Platform is production-ready

---

## 21. Future Enhancements

- Trust badges (non-medical)
- Temporary identity reveals
- Anonymous voice rooms
- End-to-end encrypted chats
- Advanced moderation analytics
- Community-led verification systems
