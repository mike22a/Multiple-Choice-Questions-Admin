# 🛠️ Quiz App — Admin Dashboard

> **Admin Control Panel** — Full-featured management interface for quiz creation, participant management, and results reporting. Superadmins and admins control the entire quiz ecosystem from here.

---

## 📌 Overview

| Property | Value |
|---|---|
| **App Name** | `quiz-admin` |
| **Type** | Next.js 14 (App Router — UI only) |
| **Domain** | `https://admin.quizapp.com` |
| **Deployment** | Vercel |
| **Auth** | Admin JWT via `quiz-api` (no direct DB access) |
| **i18n** | `next-intl` — EN 🇬🇧 & ID 🇮🇩 |
| **UI** | Tailwind CSS + shadcn/ui |

---

## 📁 Project Structure

```
apps/admin/
├── src/
│   └── app/
│       └── [locale]/                    # next-intl locale routing
│           ├── layout.tsx
│           ├── (auth)/
│           │   └── login/
│           │       └── page.tsx
│           └── (dashboard)/
│               ├── layout.tsx           # Sidebar + header shell
│               ├── page.tsx             # Dashboard home
│               ├── quizzes/
│               │   ├── page.tsx         # Quiz list
│               │   ├── new/page.tsx     # Create quiz
│               │   └── [id]/
│               │       ├── page.tsx     # Quiz detail / general settings
│               │       ├── questions/page.tsx
│               │       ├── access/page.tsx
│               │       ├── behavior/page.tsx
│               │       └── preview/page.tsx
│               ├── participants/
│               │   ├── page.tsx         # User list
│               │   ├── new/page.tsx     # Create user
│               │   └── [id]/page.tsx   # User detail + attempts
│               ├── results/
│               │   ├── page.tsx         # All results
│               │   └── [attemptId]/page.tsx
│               └── settings/
│                   ├── page.tsx         # General settings
│                   └── admins/page.tsx  # Admin account management (superadmin only)
├── messages/
│   ├── en.json                          # English translations
│   └── id.json                          # Indonesian translations
├── src/components/
│   ├── ui/                              # shadcn/ui components
│   ├── quiz/                            # Quiz-specific components
│   ├── question/                        # Question editor components
│   └── layout/                          # Sidebar, header, nav
├── src/hooks/                           # Custom React hooks
├── src/lib/
│   ├── api-client.ts                    # Typed fetch wrapper → quiz-api
│   └── auth.ts                          # Client-side auth helpers
├── src/store/                           # Zustand stores
├── .env.local                           # ⚠️ Never commit
├── .env.example
└── TRACKER.md                           # 📋 Local task tracker
```

---

## ⚙️ Environment Variables

```bash
# .env.local (never commit this file)

# Public — OK to expose (just the API URL)
NEXT_PUBLIC_API_URL=https://api.quizapp.com

# ⚠️ NO JWT secrets here.
# This app NEVER touches the database directly.
# All data goes through quiz-api.
```

---

## 🚦 Getting Started

```bash
# 1. Install dependencies (from monorepo root)
pnpm install

# 2. Copy env template
cp .env.example .env.local
# → Set NEXT_PUBLIC_API_URL to your API URL

# 3. Start development server
pnpm dev
# → Admin UI at http://localhost:3000

# 4. Type-check
pnpm typecheck
```

---

## 🗺️ Navigation & Pages

```
Admin Navigation
├── 🏠 Dashboard
│   ├── Overview stats (total quizzes, active sessions, pass rate)
│   ├── Recent activity feed
│   └── Quick actions
│
├── 📝 Quiz Management
│   ├── All Quizzes       — list, filter, search, publish toggle
│   ├── Create Quiz       — new quiz wizard
│   └── Quiz Detail
│       ├── General Settings  — title, slug, duration, pass score, timezone
│       ├── Questions Editor  — add/edit/reorder questions & images
│       ├── Answer Options    — per-question options with correct flag
│       ├── Access Settings   — publish status, date range, max attempts
│       ├── Behavior Settings — randomize, safe mode, show results immediately
│       └── Preview           — simulate user view
│
├── 👥 Participants
│   ├── All Users         — paginated list with search/filter
│   ├── Create User       — manual account creation
│   ├── User Detail       — profile + full attempt history
│   └── Bulk Import       — CSV upload
│
├── 📊 Results & Reports
│   ├── Quiz Results      — all attempts per quiz
│   ├── Attempt Detail    — per-question answer breakdown
│   ├── Leaderboard       — per quiz ranking
│   ├── Safe Mode Log     — violation history
│   └── Export CSV        — downloadable report
│
└── ⚙️ Settings
    ├── General           — site name, logo
    ├── Admin Accounts    — list/create/deactivate (superadmin only)
    └── My Profile        — change own password
```

---

## 🔐 Auth Flow

```
1. POST /api/auth/admin/login  →  { accessToken, refreshToken }
2. accessToken stored in memory (Zustand)
3. refreshToken stored in httpOnly cookie (set by API)
4. All API calls include: Authorization: Bearer <accessToken>
5. On 401: auto-refresh via /api/auth/admin/refresh
6. On refresh fail: redirect to /login
```

> ⚠️ **Never** store JWT access tokens in `localStorage`. Always use in-memory state + httpOnly cookie for refresh.

---

## 🌐 i18n Setup

```
messages/
├── en.json   — English (default)
└── id.json   — Indonesian
```

- Locale detected from cookie → user profile → browser
- Keys use dot-notation: `quiz.createTitle`, `common.save`
- **No auto-translation** — static JSON files only
- Every new user-facing string must be added to **both** `en.json` and `id.json`

---

## 🧩 Key Features

| Feature | Status | Notes |
|---------|--------|-------|
| Admin Login / JWT Auth | 🔲 Planned | Phase 2 |
| Quiz CRUD | 🔲 Planned | Phase 2 |
| Question Editor + Images | 🔲 Planned | Phase 2 |
| Answer Options Editor | 🔲 Planned | Phase 2 |
| Publish / Unpublish Quiz | 🔲 Planned | Phase 2 |
| Participant Management | 🔲 Planned | Phase 2 |
| Results & Reporting | 🔲 Planned | Phase 4 |
| Export CSV | 🔲 Planned | Phase 5 |
| Bulk User Import | 🔲 Planned | Phase 5 |
| Safe Mode Violations Log | 🔲 Planned | Phase 5 |
| i18n EN + ID | 🔲 Planned | Phase 2 |
| Mobile Responsive | 🔲 Planned | Phase 4 |

---

## 📋 Task Tracker

See [`TRACKER.md`](./TRACKER.md) for the full task breakdown with status and progress.

---

## 📖 References

- [Project Plan](./PROJECT_PLAN.md) — Architecture, schema, full menu structure
- [Agent Instructions](./AGENT.md) — Hard rules, code standards, checklists
- [API Service README](../Multiple-Choice-Questions-API/README.md)
- [Vercel Dashboard](https://vercel.com/dashboard)
