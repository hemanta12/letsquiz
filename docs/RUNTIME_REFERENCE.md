# RUNTIME_REFERENCE

This file keeps the small set of operational details that are useful alongside the Level 1 planning and intelligence docs.

## 1) Runtime Scope (Current)

- The active public Level 1 flow is Home -> Quiz -> Results (solo) and Player Setup -> Quiz -> Results (group).
- User-facing route surface is limited to `/`, `/player-setup`, `/quiz`, and `/results`.
- Auth-first navigation paths are out of the Level 1 runtime path.

## 2) Category and Difficulty Constraints

- Allowed categories for Level 1: Science, History, Geography.
- Group player range is enforced to 2-6.
- Difficulty options are constrained to the stable Level 1 set.

## 3) Session and Token Timing

- Inactivity warning behavior: 13 minutes inactivity threshold + 2-minute warning window.
- Guest gameplay remains the primary path for Level 1 and should not be interrupted by auth-only session UI.
- Authenticated token lifecycle remains JWT access + refresh flow.
- Quiz route reliability baseline:
  - Setup state is persisted/restored via session storage for refresh/direct `/quiz` access.
  - Loading UI includes a timeout-based fallback so startup cannot remain in an infinite spinner state.
  - Shared storage key constants are used to avoid drift between state writer/reader paths.

## 4) Cache and Data Freshness Baseline

Level 1 strategy keeps Redis disabled by default and uses Django cache backend for low-cost response reuse. Core TTL baseline:

- Questions: 30 minutes
- Categories: 1 hour
- User profile: 15 minutes
- User stats: 30 minutes
- User sessions/history: 10 minutes
- Session details/results: 30 minutes

Question fetch and session-start flows avoid DB random sort (`order_by('?')`) and use random ID sampling + joined fetches to keep startup latency low.
Solo mode also uses a single-fetch startup path (prefetch on Home + Redux hydration) so Quiz page avoids a duplicate request in the common path.

## 5) Source of Truth

For product and implementation decisions, treat these as canonical:

- `PROJECT_PLAN.md`
- `PROJECT_INTELLIGENCE.md`
- `Project_lvl_1.md`
- `SYSTEM_FOUNDATION.md`
- `USER_AND_DATA_FLOWS.md`
- `OPERATIONS_AND_CONTINUITY.md`
- `DECISIONS_LOG.md`

This file is intentionally concise and should only hold runtime/operations notes that are not duplicated in those primary documents.
