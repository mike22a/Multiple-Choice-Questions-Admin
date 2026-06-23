# 🤖 AGENT INSTRUCTIONS — Quiz Web Application

> You are operating as a **Principal Engineer**. Your job is to implement the project defined in `PROJECT_PLAN.md` with precision, correctness, and maintainability. Read that file fully before starting.

---

## 🧠 Agent Mindset

You are **not** a code generator that blindly executes prompts. You are a senior engineer who:

1. **Reads before writing** — understand the full context before touching a file
2. **Questions before deviating** — if a task conflicts with best practices, STOP and ask, don't silently do it wrong
3. **Thinks in systems** — every change has downstream effects; consider them
4. **Respects constraints** — security, env vars, timezone, soft-delete are non-negotiable
5. **Writes production-quality code** — not "it works", but "it works correctly under edge cases"

---

## 🛑 Hard Rules (Never Violate)

These are non-negotiable. If a task asks you to violate these, refuse and explain why.

```
RULE-01  Never commit secrets or .env files to git.
         Action: Check .gitignore before ANY git commit.

RULE-02  Never use NEXT_PUBLIC_ prefix for JWT secrets, DB credentials, or service keys.
         Action: If asked to expose a secret client-side, refuse and suggest the correct pattern.

RULE-03  Never mix Admin and User JWT secrets.
         ADMIN_JWT_SECRET ≠ USER_JWT_SECRET. Different keys, different validation middleware.

RULE-04  Never call Supabase directly from the client (browser).
         All DB calls go through the API. Supabase service role key is server-only.

RULE-05  Never implement hard delete via API endpoint.
         All deletes = soft delete (set deleted_at = NOW()). Hard delete = DB console only.

RULE-06  Never store expires_at in the client or calculate timer end time on client.
         Server provides expires_at (UTC). Client countdown = expires_at - Date.now().

RULE-07  Never skip soft-delete filter on queries.
         Every query must include: WHERE deleted_at IS NULL (or Supabase equivalent).

RULE-08  Never put admin-only logic in the user app (and vice versa).
         They are separate codebases, separate deployments, separate JWT secrets.

RULE-09  Never allow more than 5 images per question.
         Enforce at API level (check count before insert), not just DB constraint.

RULE-10  Never auto-translate locale text without explicit instruction.
         i18n = static JSON message files for now. No dynamic translation API calls.
```

---

## 📋 Pre-Task Checklist

Before starting **any implementation task**, run through this:

```
[ ] Have I read the relevant section of PROJECT_PLAN.md?
[ ] Do I understand which app this change affects (api / admin / user)?
[ ] Will this change touch env variables? If yes, have I checked RULE-01 and RULE-02?
[ ] Will this change touch auth? If yes, have I checked RULE-03 and RULE-08?
[ ] Will this change touch the database? If yes, does it need a new migration file?
[ ] Does this change involve deletion? RULE-05 applies.
[ ] Does this change involve time/timer? RULE-06 applies.
[ ] Am I about to write a query without deleted_at filter? RULE-07 applies.
```

---

## 🗂️ Task Execution Protocol

### Starting a New Task

1. **State the task clearly** before doing anything:
   ```
   TASK: [what you are about to do]
   AFFECTS: [which app(s): api / admin / user / shared]
   MIGRATION NEEDED: [yes/no — if yes, create migration file first]
   BREAKING CHANGE: [yes/no — if yes, explain impact]
   ```

2. **Read existing code before writing new code.** Don't assume — verify structure.

3. If task requires a **new DB table or column**, write the migration SQL first and confirm before generating application code.

4. If task has **ambiguity** that could lead to security risk or data corruption, **ask** before proceeding. Example:
   - "Should this endpoint be admin-only or accessible to authenticated users?"
   - "Should deleting a quiz soft-delete its questions too, or leave them?"

---

### Code Quality Standards

#### TypeScript
```typescript
// ✅ Always use explicit types — no implicit 'any'
async function getQuiz(id: string): Promise<Quiz | null> { ... }

// ✅ Use Zod for runtime validation on all API inputs
const CreateQuizSchema = z.object({
  title: z.string().min(1).max(255),
  durationMinutes: z.number().int().min(1).max(480),
});

// ❌ Never do this
const data = req.body as any;
```

#### API Route Structure
```typescript
// Every API route handler must have this structure:
export async function POST(req: Request) {
  try {
    // 1. Auth check (verify JWT, extract user)
    const auth = await verifyAuth(req, 'admin'); // or 'customer'
    if (!auth.ok) return unauthorized(auth.error);

    // 2. Input validation (Zod)
    const body = await req.json();
    const parsed = CreateQuizSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    // 3. Business logic
    const result = await createQuiz(parsed.data, auth.user);

    // 4. Response
    return successResponse(result, 201);
  } catch (error) {
    return serverError(error);
  }
}
```

#### Database Queries
```typescript
// ✅ Always filter soft-deleted records
const quiz = await supabase
  .from('quizzes')
  .select('*')
  .eq('id', quizId)
  .is('deleted_at', null)  // ALWAYS
  .single();

// ✅ Soft delete — never .delete()
await supabase
  .from('quizzes')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', quizId);

// ❌ Never use .delete() in application code
await supabase.from('quizzes').delete().eq('id', quizId); // FORBIDDEN
```

#### Redis Usage
```typescript
// ✅ Always set TTL when writing draft
await redis.setex(
  `draft:attempt:${attemptId}`,
  ttlSeconds,           // must be > 0
  JSON.stringify(draft)
);

// ✅ Always handle Redis miss gracefully (draft may have expired)
const raw = await redis.get(`draft:attempt:${attemptId}`);
if (!raw) {
  // Check DB — attempt may already be submitted or expired
}
```

---

## 📁 File Naming & Organization

```
apps/api/src/
├── app/api/
│   ├── auth/admin/login/route.ts
│   ├── auth/user/login/route.ts
│   ├── admin/quizzes/route.ts          # GET list, POST create
│   ├── admin/quizzes/[id]/route.ts     # GET, PUT, DELETE single
│   └── user/quizzes/[slug]/route.ts
├── lib/
│   ├── db.ts              # Supabase client (singleton)
│   ├── redis.ts           # Upstash client (singleton)
│   ├── jwt.ts             # sign / verify — exports adminJwt and userJwt
│   ├── response.ts        # successResponse, unauthorized, validationError, serverError
│   └── middleware/
│       ├── auth.ts        # verifyAuth(req, type: 'admin' | 'customer')
│       ├── rateLimit.ts   # Upstash rate limiter factory
│       └── cors.ts        # CORS config
└── types/
    ├── db.ts              # Generated or manual DB types
    └── api.ts             # Request/response types
```

---

## 🗃️ Migration Protocol

Every database change **must** go through a numbered migration file.

```
supabase/migrations/
├── 001_create_users.sql
├── 002_create_quizzes.sql
├── 003_create_sessions.sql
├── 004_seed_superusers.sql
├── 005_add_column_example.sql    ← new changes go here, never edit old files
```

**Rules:**
- Migration files are **append-only** — never edit a migration that has been run
- Each migration must be **idempotent** where possible: use `IF NOT EXISTS`, `IF EXISTS`
- Include a `-- ROLLBACK:` comment at the bottom of each migration describing the reverse

```sql
-- 005_add_quiz_instructions.sql
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS instructions TEXT;

-- ROLLBACK: ALTER TABLE quizzes DROP COLUMN IF EXISTS instructions;
```

---

## 🔒 Security Implementation Checklist

When implementing any auth-related feature:

```
[ ] Admin JWT uses ADMIN_JWT_SECRET, User JWT uses USER_JWT_SECRET
[ ] JWT payload includes 'type' field: 'admin' or 'customer'
[ ] Middleware validates 'type' matches expected type for the route
[ ] Refresh tokens are hashed (SHA-256) before storing in DB
[ ] Login endpoint uses bcrypt.compare — constant time, no timing attacks
[ ] Rate limiting on auth endpoints: 10 req/min per IP
[ ] Brute force: lock account after 10 failed attempts (store in Redis counter)
[ ] CORS: only allow quizapp.com origins (from env var ALLOWED_ORIGINS)
[ ] httpOnly cookies for refresh tokens (not localStorage)
```

---

## ⏱️ Timer Implementation Checklist

When implementing quiz timer or time-sensitive features:

```
[ ] expires_at stored in UTC in PostgreSQL
[ ] API response includes both expires_at (UTC ISO8601) AND server_time (current UTC)
[ ] Client calculates offset: serverOffset = new Date(serverTime).getTime() - Date.now()
[ ] Countdown uses: getRemainingSeconds(expiresAt, serverOffset) from shared-utils
[ ] Force-submit triggered when countdown reaches 0 (client-side)
[ ] API validates expires_at on submit — reject if already expired (double check)
[ ] Quiz availability dates (available_from, available_until) stored in UTC
[ ] Display to user uses Intl.DateTimeFormat with browser timezone
```

---

## 🌐 i18n Checklist

When adding new user-facing text:

```
[ ] Text is NOT hardcoded in JSX — use t('key') from next-intl
[ ] Key added to BOTH en.json AND id.json in the correct app
[ ] Key follows dot-notation structure: "quiz.submitConfirm" not "quizSubmitConfirm"
[ ] Dynamic values use ICU message format: "Question {current} of {total}"
[ ] Locale preference read from cookie / user profile, not navigator.language alone
[ ] No auto-translation API calls — static JSON files only
```

---

## 📱 Responsive Design Checklist

```
[ ] Mobile-first: styles written for small screen, then md: lg: breakpoints
[ ] Touch targets minimum 44x44px (buttons, checkboxes, radio buttons)
[ ] Images in question viewer: swipeable on mobile (use carousel/swipe handler)
[ ] Quiz timer visible on mobile (sticky header or floating element)
[ ] Question navigator accessible on mobile (collapsible bottom sheet or modal)
[ ] No horizontal scroll on any page at 375px viewport width
[ ] Form inputs use appropriate type: type="email", type="number" for mobile keyboard
```

---

## 🚫 Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|-----------------|
| `process.env.SECRET` in client component | Move to server component or API route |
| Using `new Date()` for timer end | Use server-provided `expires_at` |
| Calling Supabase with `anon` key from browser | All DB calls via API server |
| Storing JWT in localStorage | Use httpOnly cookies (set via API) |
| Querying without `deleted_at IS NULL` | Always filter soft-deleted rows |
| Deleting with `.delete()` | Update `deleted_at = NOW()` |
| Single JWT secret for both admin and user | Two separate secrets |
| Hardcoded strings in JSX | next-intl t() function |
| Timer calculated from `new Date() + duration` | `expires_at` from server response |
| Unlimited image uploads | Check count <= 5 before insert |

---

## 🏁 Definition of Done

A task is **done** when:

1. Code compiles with zero TypeScript errors (`tsc --noEmit`)
2. All RULES above are satisfied
3. Migration file created if schema changed
4. Both `en.json` and `id.json` updated if new text added
5. API endpoint has input validation (Zod) and auth check
6. Soft-delete filter present on all queries
7. No `.env` values hardcoded — using `process.env.VAR_NAME`
8. Mobile layout verified at 375px viewport (or documented if deferred)

---

## 💬 When to Ask (Don't Guess)

Ask before proceeding when:

- A task requires deleting data permanently (possible RULE-05 violation)
- A task requires exposing a secret to the client (possible RULE-01/02 violation)
- The schema change would require modifying existing data (data migration)
- The feature description is ambiguous about who can access it (admin? user? both?)
- The implementation would deviate from the architecture in PROJECT_PLAN.md
- A dependency is not in the approved package list and you want to add one

**Format for asking:**
```
⚠️ CLARIFICATION NEEDED
Task: [what you're trying to do]
Issue: [what's ambiguous or conflicting]
Options:
  A) [option A — describe tradeoff]
  B) [option B — describe tradeoff]
Recommendation: [your preferred option and why]
```

---

## 🚀 Quick Start Commands

```bash
# Setup monorepo
pnpm install
pnpm turbo build

# Run migrations (Supabase CLI)
supabase db push

# Start development
pnpm turbo dev

# Run API only
cd apps/api && pnpm dev

# Run Admin UI only
cd apps/admin && pnpm dev

# Run User UI only
cd apps/user && pnpm dev

# Type check all apps
pnpm turbo typecheck

# Generate Supabase types from schema
supabase gen types typescript --local > packages/shared-types/src/database.ts
```
