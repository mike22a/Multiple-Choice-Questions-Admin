# 📋 PROJECT PLAN — Quiz / Multiple Choice Web Application

> **Stack**: Next.js 14 (App Router) · Supabase (PostgreSQL) · Redis (Upstash) · Vercel · i18n (next-intl)
> **Sites**: 2 separate deployments — `admin.quizapp.com` & `app.quizapp.com`
> **Last Updated**: 2026-06-23

---

## 1. Technology Stack

### Frontend
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 14 (App Router)** | SSR/SSG, API Routes, Vercel-native, mobile responsive |
| UI Library | **Tailwind CSS + shadcn/ui** | Utility-first, responsive by default, headless accessible components |
| i18n | **next-intl** | Locale-based routing, JSON message files, no auto-translate yet |
| State Mgmt | **Zustand** | Lightweight, no boilerplate, persists quiz state in-memory |
| Form | **React Hook Form + Zod** | Validation, type-safe schema |

### Backend
| Layer | Choice | Rationale |
|-------|--------|-----------|
| API | **Next.js API Routes / Route Handlers** | Co-located, serverless, deploys to Vercel Functions |
| Database | **Supabase (PostgreSQL)** | Managed Postgres, RLS, real-time, free tier sufficient |
| Cache / Draft | **Upstash Redis (REST)** | Serverless Redis, free tier, auto-save draft answers |
| Auth | **Custom JWT (via API)** | Full control, separate auth for Admin & User, Supabase only stores data |
| File Upload | **Supabase Storage** | Store question images, public bucket with signed URLs |

### Deployment
| Site | Platform | Notes |
|------|----------|-------|
| Admin UI | **Vercel** | Separate Next.js project, env vars scoped |
| User UI | **Vercel** | Separate Next.js project, env vars scoped |
| API | **Vercel Functions** (inside User or Admin project, or standalone) | Can be shared API project |

> **Recommendation**: Create **3 Vercel projects**:
> 1. `quiz-api` — standalone API (Route Handlers in Next.js, no UI pages)
> 2. `quiz-admin` — Admin UI only
> 3. `quiz-user` — User UI only

---

## 2. Repository Structure

```
quiz-monorepo/
├── apps/
│   ├── api/                    # Standalone API (Next.js API-only)
│   │   ├── src/app/api/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── user/
│   │   │   └── quiz/
│   │   ├── src/lib/
│   │   │   ├── db.ts           # Supabase client (service role)
│   │   │   ├── redis.ts        # Upstash Redis client
│   │   │   ├── jwt.ts          # JWT sign/verify
│   │   │   └── middleware/
│   │   └── .env.local
│   │
│   ├── admin/                  # Admin Next.js app
│   │   ├── src/app/
│   │   │   ├── [locale]/
│   │   │   │   ├── (auth)/login/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── quizzes/
│   │   │   │   │   ├── questions/
│   │   │   │   │   ├── participants/
│   │   │   │   │   ├── results/
│   │   │   │   │   └── settings/
│   │   ├── messages/
│   │   │   ├── en.json
│   │   │   └── id.json
│   │   └── .env.local
│   │
│   └── user/                   # User-facing Next.js app
│       ├── src/app/
│       │   ├── [locale]/
│       │   │   ├── (auth)/login/
│       │   │   ├── (quiz)/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── quiz/[quizId]/
│       │   │   │   └── results/
│       ├── messages/
│       │   ├── en.json
│       │   └── id.json
│       └── .env.local
│
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   ├── shared-utils/           # Shared utility functions (timezone, timer, etc.)
│   └── shared-validations/     # Zod schemas shared across apps
│
├── supabase/
│   ├── migrations/             # SQL migration files (numbered)
│   └── seed.sql                # Seed data (2 superusers)
│
├── turbo.json
├── package.json
└── README.md
```

---

## 3. Database Schema (Supabase PostgreSQL)

### Design Principles
- All tables have `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- All tables have `seq BIGSERIAL` for ordering
- All tables have `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()`
- All deletions are **soft delete** via `deleted_at TIMESTAMPTZ DEFAULT NULL`
- Hard delete only via direct DB access (no API endpoint)
- `email` lives only in `users` table

---

### Migration 001 — Core User Tables

```sql
-- 001_create_users.sql

-- Base user table (shared profile, email lives here)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq         BIGSERIAL UNIQUE NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  locale      TEXT NOT NULL DEFAULT 'id',  -- preferred language
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_seq ON users(seq);

-- Admin credentials table (separate from user customers)
CREATE TABLE user_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq           BIGSERIAL UNIQUE NOT NULL,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_user_admins_username ON user_admins(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_admins_user_id ON user_admins(user_id);

-- Customer/participant credentials table
CREATE TABLE user_customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq           BIGSERIAL UNIQUE NOT NULL,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_user_customers_username ON user_customers(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_customers_user_id ON user_customers(user_id);

-- Refresh token table (both admin & user share this, discriminated by user_type)
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq         BIGSERIAL UNIQUE NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_type   TEXT NOT NULL CHECK (user_type IN ('admin', 'customer')),
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ DEFAULT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

---

### Migration 002 — Quiz & Question Tables

```sql
-- 002_create_quizzes.sql

CREATE TABLE quizzes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq               BIGSERIAL UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  slug              TEXT NOT NULL UNIQUE,
  duration_minutes  INT NOT NULL DEFAULT 60,
  max_attempts      INT NOT NULL DEFAULT 1,
  pass_score        INT NOT NULL DEFAULT 70,       -- percentage
  is_published      BOOLEAN NOT NULL DEFAULT false,
  safe_mode         BOOLEAN NOT NULL DEFAULT false, -- lock screen feature
  randomize_questions BOOLEAN NOT NULL DEFAULT false,
  randomize_options   BOOLEAN NOT NULL DEFAULT false,
  show_result_immediately BOOLEAN NOT NULL DEFAULT true,
  available_from    TIMESTAMPTZ,
  available_until   TIMESTAMPTZ,
  timezone          TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  created_by        UUID NOT NULL REFERENCES user_admins(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_quizzes_slug ON quizzes(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_quizzes_published ON quizzes(is_published) WHERE deleted_at IS NULL;

-- Questions
CREATE TABLE questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq           BIGSERIAL UNIQUE NOT NULL,
  quiz_id       UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  order_num     INT NOT NULL DEFAULT 0,    -- display order
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single' CHECK (question_type IN ('single', 'multiple')),
  points        INT NOT NULL DEFAULT 1,
  explanation   TEXT,                       -- explanation shown after answer
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_questions_quiz_id ON questions(quiz_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_order ON questions(quiz_id, order_num);

-- Question images (max 5 per question)
CREATE TABLE question_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq           BIGSERIAL UNIQUE NOT NULL,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,             -- Supabase Storage path
  public_url    TEXT NOT NULL,
  order_num     INT NOT NULL DEFAULT 0,
  alt_text      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ DEFAULT NULL,
  CONSTRAINT max_images_per_question CHECK (
    (SELECT COUNT(*) FROM question_images qi 
     WHERE qi.question_id = question_id AND qi.deleted_at IS NULL) <= 5
  )
);

CREATE INDEX idx_question_images_question_id ON question_images(question_id) WHERE deleted_at IS NULL;

-- Answer options
CREATE TABLE answer_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq           BIGSERIAL UNIQUE NOT NULL,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text   TEXT NOT NULL,
  is_correct    BOOLEAN NOT NULL DEFAULT false,
  order_num     INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_answer_options_question_id ON answer_options(question_id) WHERE deleted_at IS NULL;
```

---

### Migration 003 — Session & Attempt Tables

```sql
-- 003_create_sessions.sql

-- Quiz attempt (one row per user attempt)
CREATE TABLE quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq             BIGSERIAL UNIQUE NOT NULL,
  quiz_id         UUID NOT NULL REFERENCES quizzes(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'in_progress' 
                  CHECK (status IN ('in_progress', 'submitted', 'force_submitted', 'expired')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,              -- started_at + duration
  score           NUMERIC(5,2),                       -- calculated on submit
  total_questions INT NOT NULL DEFAULT 0,
  correct_answers INT NOT NULL DEFAULT 0,
  ip_address      TEXT,
  user_agent      TEXT,
  safe_mode_violation_count INT NOT NULL DEFAULT 0,  -- track violations
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_quiz_attempts_status ON quiz_attempts(status) WHERE deleted_at IS NULL;

-- Individual answer records (written on submit, not during draft — draft lives in Redis)
CREATE TABLE attempt_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq             BIGSERIAL UNIQUE NOT NULL,
  attempt_id      UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  selected_option_ids UUID[],              -- array for multiple-answer questions
  is_correct      BOOLEAN,
  points_earned   INT NOT NULL DEFAULT 0,
  answered_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempt_answers_attempt_id ON attempt_answers(attempt_id);
CREATE UNIQUE INDEX idx_attempt_answers_unique ON attempt_answers(attempt_id, question_id);

-- Safe mode violation log
CREATE TABLE safe_mode_violations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq           BIGSERIAL UNIQUE NOT NULL,
  attempt_id    UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL,           -- 'tab_switch', 'window_blur', 'copy_attempt'
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata      JSONB
);

CREATE INDEX idx_safe_mode_violations_attempt ON safe_mode_violations(attempt_id);
```

---

### Migration 004 — Seed Data (Superusers)

```sql
-- 004_seed_superusers.sql

-- NOTE: Replace password hashes with bcrypt hashes before running in production
-- Default passwords shown in comments — CHANGE IMMEDIATELY after first deploy

INSERT INTO users (id, email, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'superadmin1@quizapp.com', 'Super Admin 1'),
  ('00000000-0000-0000-0000-000000000002', 'superadmin2@quizapp.com', 'Super Admin 2');

INSERT INTO user_admins (user_id, username, password_hash, role) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'superadmin1',
    '$2b$12$REPLACE_WITH_BCRYPT_HASH_OF_SuperAdmin1@2025',  -- change this
    'superadmin'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'superadmin2',
    '$2b$12$REPLACE_WITH_BCRYPT_HASH_OF_SuperAdmin2@2025',  -- change this
    'superadmin'
  );
```

---

## 4. API Design

### Base URLs
```
Production:  https://api.quizapp.com
Admin calls: Authorization: Bearer <admin_jwt>
User calls:  Authorization: Bearer <user_jwt>
```

All responses follow:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}
```
or on error:
```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "..." }
}
```

---

### Auth Endpoints

```
POST   /api/auth/admin/login         Admin login → { accessToken, refreshToken }
POST   /api/auth/admin/refresh       Refresh admin token
POST   /api/auth/admin/logout        Revoke refresh token

POST   /api/auth/user/login          User login → { accessToken, refreshToken }
POST   /api/auth/user/refresh        Refresh user token
POST   /api/auth/user/logout         Revoke refresh token
```

### Admin Endpoints

```
# Quiz Management
GET    /api/admin/quizzes            List quizzes (paginated, filterable)
POST   /api/admin/quizzes            Create quiz
GET    /api/admin/quizzes/:id        Get quiz detail
PUT    /api/admin/quizzes/:id        Update quiz
DELETE /api/admin/quizzes/:id        Soft delete quiz
PATCH  /api/admin/quizzes/:id/publish    Toggle publish status
PATCH  /api/admin/quizzes/:id/safe-mode  Toggle safe mode

# Question Management
GET    /api/admin/quizzes/:id/questions       List questions
POST   /api/admin/quizzes/:id/questions       Create question
PUT    /api/admin/questions/:id               Update question
DELETE /api/admin/questions/:id               Soft delete question
PATCH  /api/admin/questions/:id/reorder       Reorder questions

# Question Images
POST   /api/admin/questions/:id/images        Upload image (max 5)
DELETE /api/admin/questions/:questionId/images/:imageId   Remove image

# Answer Options
POST   /api/admin/questions/:id/options       Add option
PUT    /api/admin/options/:id                 Update option
DELETE /api/admin/options/:id                 Soft delete option

# Participants
GET    /api/admin/users              List users (paginated)
POST   /api/admin/users              Create user account
GET    /api/admin/users/:id          Get user detail + attempt history
PUT    /api/admin/users/:id          Update user profile
PATCH  /api/admin/users/:id/activate Toggle active status

# Results & Reporting
GET    /api/admin/quizzes/:id/results      Quiz results (all attempts)
GET    /api/admin/attempts/:id             Attempt detail with answers
GET    /api/admin/quizzes/:id/export       Export results as CSV
GET    /api/admin/dashboard/stats          Overview stats

# Admin Account Management (superadmin only)
GET    /api/admin/admins             List admin accounts
POST   /api/admin/admins             Create admin account
PUT    /api/admin/admins/:id         Update admin account
PATCH  /api/admin/admins/:id/activate Toggle active status
```

### User Endpoints

```
# Profile
GET    /api/user/profile             Get own profile
PUT    /api/user/profile             Update profile

# Quiz Discovery
GET    /api/user/quizzes             List available quizzes
GET    /api/user/quizzes/:slug       Get quiz intro (no answers exposed)

# Quiz Attempt
POST   /api/user/quizzes/:slug/start       Start attempt → attemptId, questions, expires_at
GET    /api/user/attempts/:id              Resume attempt (get current draft from Redis)
POST   /api/user/attempts/:id/answer       Save single answer (writes to Redis draft)
POST   /api/user/attempts/:id/submit       Submit attempt (Redis → PostgreSQL)
POST   /api/user/attempts/:id/violation    Report safe-mode violation

# Results
GET    /api/user/attempts            My attempt history
GET    /api/user/attempts/:id/result Attempt result (after submission)
```

---

## 5. Redis Schema (Auto-Save Draft)

Key pattern: `draft:attempt:{attemptId}`

```json
{
  "attemptId": "uuid",
  "userId": "uuid",
  "quizId": "uuid",
  "expiresAt": "ISO8601",        // synced with quiz_attempts.expires_at
  "answers": {
    "{questionId}": {
      "selectedOptionIds": ["uuid"],
      "answeredAt": "ISO8601"
    }
  },
  "lastSavedAt": "ISO8601"
}
```

TTL: Set to `expires_at - NOW() + 5 minutes` buffer. Redis key auto-expires.

On answer save: `SETEX draft:attempt:{id} {ttl_seconds} {json}`
On submit: Read Redis → write to DB → delete Redis key
On expire (timer ends): API cron or client triggers force-submit → Redis → DB

---

## 6. Security Architecture

### API Security Middleware (applied to all routes)

```typescript
// Execution order on every request:
1. CORS — whitelist admin.quizapp.com & app.quizapp.com only
2. Rate Limiter (Upstash Redis)
   - Auth endpoints: 10 req/min per IP
   - General API: 100 req/min per IP
   - Burst protection: sliding window algorithm
3. Request Size Limit — max 10MB (for image uploads), 50KB for JSON
4. Security Headers (helmet-equivalent)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Content-Security-Policy
   - Strict-Transport-Security
5. JWT Verification — separate secrets for admin & user tokens
6. Role Check — admin routes reject user tokens and vice versa
7. Soft-Delete Check — confirm resource not deleted_at before serving
```

### JWT Configuration
```
Admin JWT:
  - Secret: ADMIN_JWT_SECRET (separate from user)
  - Access token TTL: 15 minutes
  - Refresh token TTL: 7 days
  - Payload: { sub: userId, adminId, role, type: 'admin' }

User JWT:
  - Secret: USER_JWT_SECRET (separate from admin)
  - Access token TTL: 30 minutes (longer for quiz continuity)
  - Refresh token TTL: 1 day
  - Payload: { sub: userId, customerId, type: 'customer' }
```

### Environment Variables

**Never expose these to the client (no NEXT_PUBLIC_ prefix for secrets)**

```bash
# apps/api/.env.local
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=     # server-only, never expose
ADMIN_JWT_SECRET=              # 64+ char random string
USER_JWT_SECRET=               # 64+ char random string, DIFFERENT from admin
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ALLOWED_ORIGINS=https://admin.quizapp.com,https://app.quizapp.com

# apps/admin/.env.local
NEXT_PUBLIC_API_URL=https://api.quizapp.com   # OK to expose (just URL)
# NO JWT secrets here — admin UI only calls API, never touches DB directly

# apps/user/.env.local
NEXT_PUBLIC_API_URL=https://api.quizapp.com
```

---

## 7. i18n Setup (next-intl)

```
apps/admin/messages/
├── en.json
└── id.json

apps/user/messages/
├── en.json
└── id.json
```

```json
// Example: en.json (User app)
{
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit"
  },
  "quiz": {
    "startButton": "Start Quiz",
    "timeRemaining": "Time Remaining",
    "questionOf": "Question {current} of {total}",
    "autoSaved": "Answer saved",
    "submitConfirm": "Are you sure you want to submit?",
    "forceSubmitWarning": "Time is up! Your answers have been submitted automatically."
  },
  "safeMode": {
    "warning": "You have left the quiz window!",
    "violationCount": "Warning {count} of {max}",
    "forceSubmit": "You have exceeded the maximum violations. Quiz submitted."
  }
}
```

Locale switching stores preference in `users.locale` column and cookie.

---

## 8. Timer & Timezone Handling

### Critical Rules
1. **Server is source of truth** — `expires_at` is always stored in UTC in PostgreSQL
2. **Client never calculates end time** — client receives `expires_at` (UTC ISO8601) from API
3. **Countdown = `expires_at` - `Date.now()`** in the browser (JS handles timezone auto)
4. **Clock skew protection** — on start, API returns `server_time` alongside `expires_at`; client corrects drift: `offset = serverTime - Date.now()`
5. **Quiz display times** — shown in user's local timezone using `Intl.DateTimeFormat` with `timeZone` from browser

```typescript
// Shared utility: packages/shared-utils/timer.ts
export function getRemainingSeconds(expiresAt: string, serverOffset = 0): number {
  const now = Date.now() + serverOffset;
  const expires = new Date(expiresAt).getTime();
  return Math.max(0, Math.floor((expires - now) / 1000));
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}
```

---

## 9. Safe Mode Feature

### How It Works (Documentation — Implementation Deferred)

Safe mode is a per-quiz toggle set by admin (`quizzes.safe_mode = true`).

**When safe mode is enabled:**

1. **Web (Desktop)**
   - On quiz start, UI requests Fullscreen API (`document.documentElement.requestFullscreen()`)
   - Event listeners attached: `visibilitychange`, `blur`, `contextmenu`, `keydown` (Alt+Tab, Win key detection)
   - On violation: API call `POST /api/user/attempts/:id/violation` with `violation_type`
   - Violation stored in `safe_mode_violations` table
   - After N violations (configurable per quiz, default 3): `force_submit` triggered

2. **Mobile (PWA)**
   - `Page Visibility API` detects app switch
   - Same violation flow as web

3. **Force Submit Flow**
   - Client or server-side expiry triggers `POST /api/user/attempts/:id/submit` with `{ forced: true }`
   - Status set to `force_submitted` in DB
   - Draft from Redis is persisted as-is to `attempt_answers`

4. **Admin Reporting**
   - Violation count visible in attempt detail
   - `force_submitted` status clearly flagged in results

> ⚠️ Note: Fullscreen API cannot 100% prevent tab switching on all browsers/OS. This is a deterrent, not a hard lock. Document this limitation to quiz administrators.

---

## 10. Admin Site — Menu Structure

```
Admin Navigation
├── 🏠 Dashboard
│   ├── Overview stats (total quizzes, active sessions, pass rate)
│   ├── Recent activity feed
│   └── Quick actions
│
├── 📝 Quiz Management
│   ├── All Quizzes (list, filter, search)
│   ├── Create New Quiz
│   ├── Quiz Detail
│   │   ├── General Settings (title, duration, pass score, timezone)
│   │   ├── Questions Editor
│   │   │   ├── Add/Edit Question
│   │   │   ├── Upload Images (max 5)
│   │   │   ├── Add/Edit Options
│   │   │   └── Drag-to-Reorder
│   │   ├── Access Settings (publish, date range, max attempts)
│   │   ├── Behavior Settings (randomize, safe mode, show results)
│   │   └── Preview
│
├── 👥 Participants
│   ├── All Users (list, filter, search)
│   ├── Create User
│   ├── User Detail
│   │   ├── Profile
│   │   ├── Attempt History
│   │   └── Activate/Deactivate
│   └── Bulk Import (CSV)
│
├── 📊 Results & Reports
│   ├── Quiz Results (per quiz, all attempts)
│   ├── Attempt Detail (per attempt, per question)
│   ├── Leaderboard (per quiz)
│   ├── Safe Mode Violations Log
│   └── Export (CSV)
│
├── ⚙️ Settings
│   ├── General (site name, logo)
│   ├── Admin Accounts (superadmin only)
│   │   ├── List Admins
│   │   ├── Create Admin
│   │   └── Edit/Deactivate Admin
│   └── My Profile (own password change)
│
└── 🌐 Language Toggle (EN / ID)
```

---

## 11. User Site — Menu Structure

```
User Navigation
├── 🏠 Home / Dashboard
│   ├── Available Quizzes (published, within date range)
│   ├── My Attempts (history)
│   └── Profile Summary
│
├── 📋 Quiz List
│   ├── Browse available quizzes
│   ├── Quiz Info Card (title, duration, max attempts, remaining attempts)
│   └── Start Quiz button
│
├── 🎯 Quiz Session (locked route — no main nav shown)
│   ├── Question Display
│   │   ├── Question text
│   │   ├── Image viewer (up to 5 images, swipeable on mobile)
│   │   ├── Answer options (single/multiple choice)
│   │   └── Auto-save indicator ("Saved ✓")
│   ├── Progress Bar (question X of Y)
│   ├── Timer (countdown, color changes at <5min)
│   ├── Question Navigator (grid of numbers, answered/unanswered indicator)
│   └── Submit Button (with confirmation dialog)
│
├── 📈 My Results
│   ├── Attempt History (all quizzes)
│   ├── Result Detail
│   │   ├── Score, pass/fail
│   │   ├── Question review (if show_result_immediately = true)
│   │   └── Explanations (if provided)
│
├── 👤 Profile
│   ├── Edit Name
│   ├── Change Password
│   └── Language Preference (EN / ID)
│
└── 🌐 Language Toggle (EN / ID)
```

---

## 12. Implementation Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] Monorepo setup (Turborepo + pnpm workspaces)
- [ ] Supabase project setup + run migrations 001–004
- [ ] Upstash Redis setup
- [ ] API project: auth endpoints (login, refresh, logout) for both admin & user
- [ ] Shared packages: types, utils (timer, timezone), validations
- [ ] CI/CD: Vercel projects linked, env vars set

### Phase 2 — Admin Core (Week 3–4)
- [ ] Admin UI: login page + JWT storage (httpOnly cookie via API)
- [ ] Quiz CRUD (create, list, edit, delete)
- [ ] Question editor + image upload
- [ ] Answer option editor
- [ ] i18n setup (EN + ID message files)

### Phase 3 — User Quiz Flow (Week 5–6)
- [ ] User UI: login page
- [ ] Quiz list & detail page
- [ ] Quiz session page (timer, questions, auto-save to Redis)
- [ ] Submit flow (Redis → DB)
- [ ] Safe mode stub (UI warnings, violation API call)

### Phase 4 — Results & Polish (Week 7–8)
- [ ] Admin results & reporting
- [ ] User result detail page
- [ ] Mobile responsiveness pass
- [ ] Rate limiting middleware
- [ ] Security headers

### Phase 5 — Hardening (Week 9+)
- [ ] Full safe mode implementation
- [ ] Bulk user import
- [ ] Export to CSV
- [ ] Monitoring (Vercel Analytics, Sentry)

---

## 13. Vercel Deployment Checklist

```bash
# For each Vercel project (api, admin, user):
# 1. Set environment variables in Vercel Dashboard > Settings > Environment Variables
# 2. Mark secrets as "Sensitive" (they won't be shown after save)
# 3. NEVER commit .env.local to git — add to .gitignore
# 4. Use different values for Preview vs Production environments

# .gitignore additions
.env
.env.local
.env.*.local
```

---

## 14. Key Packages

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "tailwindcss": "3.x",
    "@tanstack/react-query": "5.x",
    "next-intl": "3.x",
    "zustand": "4.x",
    "react-hook-form": "7.x",
    "zod": "3.x",
    "@supabase/supabase-js": "2.x",
    "@upstash/redis": "1.x",
    "@upstash/ratelimit": "1.x",
    "bcryptjs": "2.x",
    "jsonwebtoken": "9.x",
    "jose": "5.x",
    "date-fns": "3.x",
    "date-fns-tz": "3.x"
  }
}
```
