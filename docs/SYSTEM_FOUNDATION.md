# SYSTEM_FOUNDATION

Last verified: 2026-04-25

## 1) Product Overview

LetsQuiz is an interactive quiz platform centered on fast gameplay loops for solo and local group sessions.

Current shipped product state is Level 1 public gameplay MVP:

- Solo flow: Home -> Quiz -> Results
- Group flow: Player Setup -> Quiz -> Results
- Authentication-first experience is not in the primary runtime path

## 2) Product Principles

These principles should remain stable across future levels:

- Gameplay-first: users can start quickly with low friction.
- Scope isolation by level: each level is independently shippable.
- Preserve core contracts: question -> answer -> scoring -> results.
- Favor disable/hide over hard deletion when features are planned soon.
- Reliability over novelty for active runtime paths.

## 3) Chosen Tech Stack and Why

### Frontend

- React 18 + TypeScript
- Redux Toolkit for state coordination
- React Router for route surface and guarded flows
- Axios with centralized interceptors for auth/retry behavior

Rationale:

- Predictable state updates for quiz/session complexity
- Type safety for API contracts and UI state
- Centralized network error handling and token refresh logic

### Backend

- Django 4.2 + Django REST Framework
- SimpleJWT for token-based auth
- Django ORM for domain models and query composition

Rationale:

- Strong CRUD and relational modeling for session/question data
- Mature auth and admin ecosystem
- Straightforward service evolution by level

### Data and Caching

- SQLite in development
- PostgreSQL in production environments
- Django cache-backed response reuse (Redis optional for later levels)

Rationale:

- Fast local dev setup with SQLite
- Scalable relational store in production
- Reduced read pressure and improved latency via query shaping and cache reuse

## 4) System Architecture (Stable View)

- Frontend SPA sends HTTP requests to Django REST endpoints.
- API entrypoint routes are defined in backend URL configuration.
- Domain behavior is implemented in serializers + views + model logic.
- Cache-aside pattern serves frequently requested data before DB fallback.
- Question fetch/start flows avoid DB random sort and use random ID sampling.

High-level shape:

- Browser SPA
- API service layer (Django/DRF)
- Persistence (SQLite/Postgres)
- Cache layer (Django cache backend; Redis optional)

## 5) Core Domain Model

Core entities expected to remain foundational:

- User: identity, premium flag, authentication context
- Category: question grouping
- DifficultyLevel: quiz difficulty taxonomy
- Question: seeded/fallback quiz content
- QuizSession: one gameplay attempt (solo or group)
- QuizSessionQuestion: per-session question answer state
- GroupPlayer: per-player group-session scoring state
- LLMGenerationTask: future pipeline scaffold (not active in Level 1 runtime path)

## 6) Stable Architectural Decisions

- Guest and authenticated users can both traverse core gameplay path.
- Group gameplay is modeled as a first-class session mode.
- Results are derived from session-question state, not ephemeral UI only.
- Cache invalidation is explicit for user/session/profile stats paths.
- Level-specific product constraints are implemented in frontend and backend validation.

## 7) Compatibility and Evolution Boundaries

Changes in these areas require careful migration and docs updates:

- API contract for session start/answer/results
- Domain schema changes to QuizSession, GroupPlayer, QuizSessionQuestion
- Difficulty/category canonical IDs and labels
- Authentication and token lifecycle behavior
- Caching key strategy and invalidation triggers

## 8) Non-Goals for Level 1 Runtime

The following are intentionally not active in the primary path for Level 1:

- Login/signup/dashboard/profile-first flow
- Leaderboards
- Premium runtime gating
- LLM/Celery generated question runtime dependency
- Real-time remote multiplayer

## 9) Where to Update What

- Scope and release gates: PROJECT_PLAN.md
- Current implementation truth: PROJECT_INTELLIGENCE.md
- Step-by-step level execution notes: Project_lvl_1.md
- Operational baseline and continuity: OPERATIONS_AND_CONTINUITY.md
- Architecture decision changes: DECISIONS_LOG.md
