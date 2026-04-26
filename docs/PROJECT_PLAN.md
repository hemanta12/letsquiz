# PROJECT_PLAN

> Practical 5-level rollout plan for LetsQuiz based on current implementation and the current state documented in PROJECT_INTELLIGENCE.md.
> Goal: ship fast, keep each level usable, and reduce bloat without breaking forward evolution.

---

## Planning Principles

- Level 1 must be fully usable by real users.
- Prefer disable/hide over hard delete for code that will be needed in upcoming levels.
- Hard-delete only dead, disconnected, or misleading code paths.
- Keep API contracts stable when possible so later levels do not require rewrites.
- Use a release gate for each level: if gate fails, do not promote.

---

## Level 1: Public Gameplay MVP (Launch First)

### Product Goal

Users can open the app and play complete quizzes immediately without account creation.

### In Scope

- Public landing and quiz setup.
- Solo mode end-to-end.
- Local group mode end-to-end (2 to 6 players for this level).
- Category subset (3 categories only).
- Difficulty selection using currently stable levels.
- Clear results screen for both solo and group.
- Basic API reliability (retry and user-facing error handling).

### Out of Scope

- Login/signup requirement.
- Dashboard/profile for normal user flow.
- Leaderboards.
- Premium logic.
- LLM/Celery-based content generation.
- Real-time multiplayer.

### Keep (Needed for Level 1)

- Core quiz models and APIs for sessions/questions/answers/results.
- Group player and group scoring core logic.
- Redis cache-aside for questions/categories/results.
- Existing frontend architecture (Redux slices and route structure).
- Guest session support.

### Remove or Disable (If Present)

- Remove UI entry points to auth-only features (dashboard/profile/login/signup) from primary navigation.
- Disable leaderboard UI calls and any unreachable leaderboard fetch path.
- Disable account verification and password reset user-facing flow.
- Disable premium labels/gates in UI to avoid user confusion.
- Hide non-Level-1 categories from selection UI.

### Optimization Notes

- Keep auth backend code in repository but out of runtime path for Level 1.
- Keep Celery/LLM scaffolding isolated and inactive; do not route traffic through it.

### Release Gate

- New user can complete solo quiz from home to results.
- New user can complete group quiz from setup to results.
- Group scoring remains correct across full round.
- No auth-related blocker appears in primary gameplay flow.

---

## Level 2: Account and Retention Foundation

### Product Goal

Add identity and retention primitives once gameplay is stable.

### In Scope

- Signup/login/logout hardening.
- Auth route visibility and routing polish.
- Dashboard essentials: recent sessions and basic user stats.
- Profile basic info.
- Session warning and token-refresh flow reliability.

### Out of Scope

- Leaderboards.
- Premium monetization.
- LLM generation pipeline.
- Real-time multiplayer.

### Keep (Needed for Level 2)

- JWT and refresh queue architecture.
- User stats/session APIs and cache invalidation paths.
- ProtectedRoute structure.
- Redis-backed profile/session caching.

### Remove or Disable (If Present)

- Remove mock or dead auth branches that conflict with current user model behavior.
- Disable partial verification flow until token lifecycle is correctly implemented.
- Remove stale client-side password reset placeholders if backend is not yet ready.

### Optimization Notes

- Keep guest mode available, but make auth value proposition clear (history/progress).
- Do not add premium branching yet; keep auth simple.

### Release Gate

- Authenticated users can sign in, play, and see session history.
- Token refresh failures degrade gracefully (forced logout, no app dead state).
- Dashboard/profile data loads with acceptable latency and no broken API calls.

---

## Level 3: Social Expansion and Competitive Loop

### Product Goal

Increase engagement via shared play outcomes and ranking surfaces.

### In Scope

- Leaderboard v1 (solo first, then group if stable).
- Group mode polish (player management UX, tie handling, result clarity).
- Optional Mix Up decision: either fully support or remove from UI.

### Out of Scope

- Paid tier enforcement.
- LLM/Celery generation pipeline.
- Real-time remote multiplayer.

### Keep (Needed for Level 3)

- Group mode domain model and scoring pipeline.
- User stats aggregation for ranking calculations.
- Existing cache utilities and invalidation logic.

### Remove or Disable (If Present)

- Remove leaderboard scaffold paths that have no backend endpoint once final endpoint is introduced.
- Remove inconsistent Mix Up half-state (wired but product-disabled) by choosing one direction:
  - Fully enable and validate, or
  - Fully remove from level UI and state.

### Optimization Notes

- Keep leaderboard scope narrow at first (clear ranking logic, predictable queries).
- Avoid introducing websocket complexity here.

### Release Gate

- Leaderboard endpoint and UI agree on contract and pagination/sorting.
- Group results remain accurate with leaderboard integration.
- No dead links or unreachable leaderboard code in frontend.

---

## Level 4: Reliability, Observability, and Content Resilience

### Product Goal

Prepare system for sustained production usage with stronger operational safety.

### In Scope

- Fallback question pool activation logic.
- Sentry integration (backend and frontend baseline).
- Cache behavior audit and correction for stale data edge cases.
- Password reset backend completion if still pending.
- Verification flow consistency fix (model, token, view, email flow).

### Out of Scope

- Full premium monetization.
- Full LLM auto-generation pipeline (unless already proven safe).
- Real-time multiplayer.

### Keep (Needed for Level 4)

- Redis utilities and signal-based invalidation architecture.
- API retry and error handling baseline.
- Existing deployment configuration and environment separation.

### Remove or Disable (If Present)

- Remove broken verification implementations that reference missing model fields.
- Remove stale docs/comments that claim features are live when they are not.
- Remove duplicate or contradictory settings values that increase operational ambiguity.

### Optimization Notes

- Prioritize correctness and observability over net-new features.
- Keep incident response simple: actionable errors, reproducible logs.

### Release Gate

- Error monitoring receives production exceptions.
- Fallback question logic works under simulated generation failure.
- Auth recovery flows complete end-to-end.

---

## Level 5: Advanced Intelligence and Monetization

### Product Goal

Deliver advanced differentiators after stable product-market foundation.

### In Scope

- LLM-based question generation pipeline.
- Double-verification logic for generated answers.
- Periodic question pool refresh (Celery beat jobs).
- Premium gating and paid-tier differentiation.
- Optional real-time remote multiplayer (websocket/channels) if still desired.

### Keep (Needed for Level 5)

- LLMGenerationTask domain model (or evolved replacement).
- Celery settings scaffold and Redis broker base.
- Feature-gate strategy for premium rollout.

### Remove or Disable (If Present)

- Remove inactive Celery scaffolding if this level is deferred long-term.
- Remove any premium flags not tied to enforceable backend policy.
- Remove experimental generation code that cannot be tested or monitored.

### Optimization Notes

- Build as independent modules with clear failure isolation.
- Preserve fallback paths so quiz delivery never depends on live LLM success.

### Release Gate

- Worker + beat processes are deployable and monitored.
- Generated content passes validation and fallback standards.
- Premium access is enforced server-side, not only in frontend UI.

---

## Keep vs Remove Strategy Across All Levels

### Always Keep

- Core quiz gameplay contract (questions, answers, sessions, results).
- Stable domain models used by live flows.
- Cache and retry infrastructure that improves reliability.

### Prefer Disable Over Delete

- Features planned for next 1 to 2 levels.
- Auth, leaderboard, and premium scaffolding when implementation is near-term.

### Safe to Delete

- Unreachable frontend calls to non-existent endpoints.
- Broken flows that cannot work with current model/schema.
- Dead feature flags with zero runtime consumers.
- Mock server logic if production backend is the sole source of truth.

---

## Execution Order Recommendation

1. Build and ship Level 1 with strict scope freeze.
2. Stabilize for a short cycle and collect user feedback.
3. Move to Level 2 only after Level 1 release gate remains green.
4. Continue sequentially to Levels 3 to 5, keeping each level independently releasable.

---

## Working Rule for New Chats

When implementing a level in a separate chat:

- Start from this file and PROJECT_INTELLIGENCE.md.
- Explicitly list in-scope and out-of-scope tasks before coding.
- For each changed module, decide one of: Keep, Disable, Remove.
- Validate level release gate before advancing to next level.
