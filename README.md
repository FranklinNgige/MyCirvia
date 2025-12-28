# MyCirvia

**MyCirvia** is a privacy-first social community platform designed for high-trust, stigma-sensitive communities.  
It enables people to connect, communicate, and build meaningful relationships **without forced identity exposure**.

MyCirvia is built around a **scoped identity model**, where users control *when*, *where*, and *to whom* their identity is revealed — down to the individual chat or group level.

---

## 🌍 Purpose

Many communities — especially those affected by HIV/AIDS and similar sensitive realities — require **privacy, dignity, and control** to safely engage online.

Traditional social platforms:
- Force early identity disclosure
- Enable harassment and trolling
- Remove user agency over personal information

**MyCirvia solves this** by making anonymity the default and trust something users opt into, gradually and intentionally.

---

## ✨ Core Principles

- Privacy by default
- User-controlled identity disclosure
- No forced real names
- No medical verification or diagnosis tracking
- Community-led moderation
- Ethical, slow, and sustainable growth

---

## 🔐 Identity Model (Key Concept)

Identity on MyCirvia is **scoped**, not global.

Users can choose different identity levels for:
- One-to-one chats
- Each community (Cirvia)
- Future interactions (default template)

### Identity Levels
- **Anonymous:** system-generated name + abstract avatar
- **Partial:** limited attributes (age, gender, city, nickname)
- **Full:** real name or chosen name + profile photo

Identity can be **revealed or revoked at any time**, without affecting other contexts.

---

## 🧩 Core Features (MVP)

- Email-based authentication (no real name required)
- Anonymous onboarding by default
- Community groups (“Cirvias”)
- Scoped identity per chat and per group
- One-to-one and group messaging
- Text and image posts
- Community-led moderation
- Reporting, muting, banning, and shadow-banning
- Privacy-friendly notifications

---

## 🛡️ Trust & Safety

- Progressive trust model for new users
- Rate limits to prevent trolling
- No visible “new user” labels
- Moderators cannot see hidden identities
- Admins cannot browse private chats
- All moderation actions are logged
- Zero tolerance for harassment, scams, or stigma

---

## 🏗️ Tech Stack

### Frontend
- **Flutter** – iOS & Android
- **Next.js** – Web app & admin dashboard

### Backend
- **NestJS** (TypeScript)
- REST APIs
- WebSockets for realtime messaging
- **Redis** for pub/sub and rate limiting
- **BullMQ** for background jobs

### Database & Storage
- **PostgreSQL** (Prisma ORM)
- **AWS S3** (signed URLs only)

### Notifications
- **Firebase Cloud Messaging (FCM)**

### Analytics
- Privacy-friendly analytics only
- No ads
- No third-party tracking or profiling

---

## 📂 Repository Structure (High Level)

```text
/
├── apps/
│   ├── mobile/        # Flutter app
│   ├── web/           # Next.js web app
│   └── admin/         # Admin dashboard
├── backend/
│   ├── src/
│   ├── prisma/
│   └── tests/
├── docs/
│   ├── MyCirvia.prd.md
│   └── architecture.md
├── scripts/
├── .env.example
└── README.md


📜 Documentation
Product Requirements: docs/MyCirvia.prd.md
Architecture & Diagrams: docs/architecture.md (coming soon)
API Contracts: to be added
Database Schema: to be added
⚖️ Legal & Compliance
18+ only platform
Non-medical, non-clinical community
No diagnosis verification
No health data collection
Clear Terms of Service and Privacy Policy
Law-enforcement requests honored only when legally required
🚀 Roadmap
Phase 1
Authentication
Anonymous identity system
Community creation
Phase 2
Messaging
Posts
Scoped identity enforcement
Phase 3
Notifications
Moderation tools
Security & QA
Future plans include:
Temporary identity reveals
Anonymous voice rooms
End-to-end encrypted messaging
Advanced moderation analytics
💰 Monetization Philosophy
Free for individual users
No ads
No selling user data
Future monetization via:
Organization sponsorships
Optional premium community tools
🤝 Contributing
This project is currently under active development.
Contribution guidelines, code standards, and issue templates will be published once the MVP foundation is complete.
📌 Status
In active development — MVP phase
🧠 Final Note
MyCirvia is not built for virality.
It is built for belonging, dignity, and trust.
Slow growth is a feature — not a flaw.