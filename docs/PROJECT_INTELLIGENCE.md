# PROJECT_INTELLIGENCE

Last verified against code: 2026-04-26

Purpose:

- Capture the current implementation reality.
- Separate active runtime behavior from dormant/in-progress capability.
- Reduce ambiguity when resuming work after long gaps.

---

## 1) Current Runtime Snapshot (Level 1)

### Active frontend route surface

From the current route table, user-facing runtime routes are:

- /
- /player-setup
- /quiz
- /results
- - (not found fallback)

This means login/signup/dashboard/profile are not in the primary frontend route surface for Level 1.

### Core user journeys currently active

- Solo quiz: Home -> Quiz -> Results
- Local group quiz: Player Setup -> Quiz -> Results

### Level 1 constraints currently enforced

- Categories allowlisted by backend config (`LEVEL1_ALLOWED_CATEGORIES`), currently Science, History, Geography
- Difficulty allowlist: Easy, Medium, Quiz Genius
- Group players constrained to 2-6 (frontend and backend validation)

### Runtime reliability behavior

- Axios retry strategy for transient failures (429/503/network/timeouts)
- JWT refresh handling with queued request retry
- Guest session header injection (`X-Guest-Session-ID`) when present for gameplay mutation paths
- Django cache-backed response reuse for key read-heavy paths (Redis optional and disabled by default in Level 1)
- Explicit backend CORS allow-header support for `x-guest-session-id`
- Guest save-session endpoint supports unauthenticated Level 1 flow
- Shared score computation utility is used by both quiz state updates and results rendering
- Question loading avoids DB random sort (`order_by('?')`) via random ID sampling and joined hydration

---

## 2) Confirmed Architecture

### Frontend

- React + TypeScript SPA
- Redux Toolkit slices for auth, quiz, group quiz, user, and UI state
- API calls through centralized Axios client (`services/apiClient.ts`)

### Backend

- Django + DRF API
- Primary app module: `apps/quiz`
- URL entrypoint: `core/urls.py` -> `apps/quiz/urls.py`

### Data and cache

- Development DB: SQLite
- Production DB target: PostgreSQL
- Cache utility abstraction in `core/redis_utils.py` with Redis optional and disabled by default for Level 1
- Canonical Level 1 seed source: `letsquiz_backend/data/questions.json`
- Seed sync command: `apps/quiz/management/commands/seed_questions.py`
- Current verified seeded DB scope: 244 total seeded questions across 3 categories (Science 85, History 84, Geography 75)

---

## 3) API Surface in Code

### Public/mixed gameplay endpoints

- GET /categories/
- GET /questions/
- POST /sessions/
- GET /sessions/<id>/
- POST /sessions/<id>/answer/
- GET /sessions/<id>/results/
- POST /quiz-sessions/

### Auth and user endpoints (present in backend)

- POST /auth/signup/
- POST /auth/login/
- POST /auth/logout/
- POST /auth/verify-account/
- POST /auth/refresh/ (registered in `core/urls.py`)
- GET /users/<id>/
- GET /users/<id>/sessions/
- GET /users/<id>/stats/
- DELETE /quiz-sessions/<id>/

### Guest session endpoints

- POST /guest/session/
- GET /guest/session/<session_id>/

---

## 4) Domain Model Snapshot

Core models currently defined:

- User
- Category
- DifficultyLevel
- Question
- QuizSession
- QuizSessionQuestion
- GroupPlayer
- LLMGenerationTask (scaffold for future levels)

Important model-level notes:

- `QuizSession` is the primary lifecycle entity for solo and group attempts.
- `GroupPlayer` is attached to `QuizSession` for group scoring and answer tracking.
- `LLMGenerationTask` exists but is not active in Level 1 runtime flow.

---

## 5) Guest vs Authenticated Behavior

### Guest behavior

- Guest identifier is stored locally by frontend auth service.
- Frontend includes guest header for gameplay mutation requests when guest identity exists.
- Frontend intentionally skips guest custom header on read-only public requests (`/categories/`, `/questions/`) to avoid avoidable preflight noise.
- Guest progress and counters are encrypted in local storage.

### Authenticated behavior

- Access token used as Bearer auth header for protected endpoints.
- Refresh token flow is handled through centralized API client and auth service.
- Session warning/expiry behavior exists in frontend session management components.

---

## 6) Cache Behavior Snapshot

Cached payload classes currently include:

- Questions
- Categories
- Session results (completed sessions)
- User profile
- User stats
- User sessions list

Invalidation utilities exist in `apps/quiz/cache_utils.py` and are called on user/session mutation paths.

---

## 7) Active vs Dormant Capability Matrix

### Active for Level 1 runtime

- Public gameplay route surface
- Solo and local group gameplay
- Level 1 category/difficulty constraints
- Session creation, answering, and results
- Config-driven seeded question scope with idempotent JSON sync workflow

### Present in code but outside Level 1 primary runtime path

- Login/signup frontend components and backend auth endpoints
- Dashboard/profile data endpoints and UI modules
- Account verification endpoint
- LLM generation task model scaffold

---

## 8) Known Gaps and Risks (From Code Audit)

The following observations should be reviewed before promoting Level 2+:

- Some auth verification logic references fields that are not visible on the current User model definition and may require implementation alignment.
- Production settings import path should be re-validated for deployment correctness.
- Legacy difficulty row `Quiz_genius` can remain as an empty DB record after cleanup; it does not affect runtime because difficulty matching is normalized, but the row can be removed in a later maintenance slice.
- Seeded question changes should not be made directly in SQLite; use the seed sync command to avoid drift and duplicate reintroduction.

These are documented here to prevent hidden regressions when reactivating dormant features.

---

## 9) Relationship to Other Docs

- Scope and roadmap decisions: `PROJECT_PLAN.md`
- Executed Level 1 implementation trail: `Project_lvl_1.md`
- Stable architecture/tech rationale: `SYSTEM_FOUNDATION.md`
- End-to-end user and data flows: `USER_AND_DATA_FLOWS.md`
- Runbook and restart protocol: `OPERATIONS_AND_CONTINUITY.md`
- Long-lived decision history: `DECISIONS_LOG.md`
