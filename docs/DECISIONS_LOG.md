# DECISIONS_LOG

This file records high-impact project decisions for long-term continuity.

Format:

- ID
- Date
- Decision
- Context
- Consequences
- Follow-up

---

## D-001

- Date: 2026-04-25
- Decision: Adopt level-based rollout model (Level 1 to Level 5) with strict release gates.
- Context: Needed predictable delivery and anti-bloat sequencing.
- Consequences: Scope must be controlled per level; features may remain dormant intentionally.
- Follow-up: Keep PROJECT_PLAN.md as single planning source.

## D-002

- Date: 2026-04-25
- Decision: Level 1 runtime path is gameplay-first and authentication-optional.
- Context: Reduce onboarding friction and ship playable MVP quickly.
- Consequences: Auth-first screens are not in primary route table for Level 1.
- Follow-up: Re-introduce auth route surface in Level 2 with reliability checks.

## D-003

- Date: 2026-04-25
- Decision: Restrict Level 1 categories to Science, History, Geography.
- Context: Control quality and reliability of public MVP.
- Consequences: Category allowlist is enforced in frontend flow.
- Follow-up: Expand category scope in later levels only with validation coverage.

## D-004

- Date: 2026-04-25
- Decision: Enforce group player count cap at 2-6 for Level 1.
- Context: Stabilize local group gameplay and avoid unvalidated edge-case complexity.
- Consequences: Frontend and backend both enforce player bounds.
- Follow-up: Any expansion requires synchronized contract changes.

## D-005

- Date: 2026-04-25
- Decision: Keep Redis cache-aside as the primary performance strategy.
- Context: Reduce repetitive DB reads and improve response time consistency.
- Consequences: Cache invalidation paths are required when mutable data changes.
- Follow-up: Re-validate cache key patterns and TTL strategy before Level 4 hardening.

## D-006

- Date: 2026-04-25
- Decision: Keep dormant foundations (auth/leaderboard/premium/LLM scaffolding) in codebase but out of Level 1 runtime path.
- Context: Future levels need these foundations; immediate runtime should stay simple.
- Consequences: Documentation must clearly distinguish active vs dormant behavior.
- Follow-up: Promote feature paths level-by-level with explicit release-gate validation.

## D-007

- Date: 2026-04-25
- Decision: Defer non-critical complexity simplifications to Level 2+ while fixing only Level 1 runtime blockers immediately.
- Context: Level 1 release gate is gameplay reliability; broader refactors increase change surface with limited short-term value.
- Consequences: A simplification backlog is tracked in OPERATIONS_AND_CONTINUITY.md for future execution.
- Follow-up: Prioritize simplifications that reduce maintenance risk and keep behavior unchanged for active user flows.

## D-008

- Date: 2026-04-25
- Decision: Apply a targeted Level 1 stabilization patchset focused on guest reliability, score correctness, and avoiding redundant network traffic.
- Context: Post-release validation exposed runtime issues (guest CORS/auth friction, score inconsistency, and duplicate/inefficient fetch behavior) that impacted the Level 1 experience.
- Consequences: Guest gameplay is now resilient end-to-end, score calculation has a single source of truth, and group/question retrieval paths avoid unnecessary requests.
- Follow-up: Keep these constraints as baseline invariants for Level 2 work and regression-check guest solo/group flows after any auth or routing changes.

## D-009

- Date: 2026-04-25
- Decision: Keep Level 1 runtime Redis-free by default and optimize question selection directly at the ORM layer.
- Context: Main objective is fast quiz start with low infra cost and minimal operational complexity.
- Consequences: Cache still exists via Django cache backend, but Redis is optional; question fetch/start flows avoid expensive `order_by('?')` random sorting.
- Follow-up: Re-evaluate dedicated Redis only when measured traffic or p95 latency indicates database pressure.

## D-010

- Date: 2026-04-25
- Decision: Remove all auth-dependent and group-session-dependent API calls from the Level 1 active gameplay path. Strip unused interface params and dead branching code from QuizSession, QuizActions, and QuizComponent.
- Context: Level 1 is auth-free. Session save, history fetch, upgrade modal triggers, and groupSession/playerCorrectness params were still wired into the completion path from earlier development, creating unnecessary complexity and potential runtime noise.
- Consequences: Solo quiz completion is now three Redux dispatches only (updateScore, setSavedSessionId(null)) — zero network calls post-question-fetch. Results hydration fallback via savedSessionId is permanently disabled in Level 1 because setSavedSessionId(null) is always set. Dead code (groupSession/playerCorrectness selectors in QuizComponent, unused interface params in HandleNextParams) is removed.
- Follow-up: When re-introducing auth in Level 2, restore saveQuizSessionThunk call in QuizSession and add fetchQuizHistoryThunk back to post-completion path. Extend HandleNextParams and SaveQuizSessionParams interfaces as needed.

## D-011

- Date: 2026-04-25
- Decision: Add frontend state-recovery and loading timeout safeguards for the Quiz route in Level 1.
- Context: Runtime checks confirmed backend question endpoints were healthy while some users still hit `Loading Quiz...` loops or `Quiz setup is missing` after refresh/direct route entry.
- Consequences: Quiz initialization now restores setup from session storage when Redux state is empty, and loading has a timeout fallback with actionable error UI rather than indefinite spinner behavior.
- Follow-up: Keep setup persistence and timeout safeguards as Level 1 reliability invariants; if Level 2 rewires routing/auth bootstrap, re-verify direct `/quiz` and refresh behavior.
