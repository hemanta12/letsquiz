# OPERATIONS_AND_CONTINUITY

Last verified: 2026-04-25

## 1) Purpose

This runbook exists so a solo maintainer can pause and resume the project after a long gap with minimal context loss.

## 2) Local Environment Boot

From repository root:

1. Start Redis

```bash
docker-compose -f docker-compose.dev.yml up -d redis
```

2. Start backend

```bash
cd letsquiz_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

3. Start frontend in another terminal

```bash
cd letsquiz_frontend
npm install
npm start
```

## 3) Required Configuration

### Backend env file

Path: letsquiz_backend/core/.env

Required minimum:

```env
SECRET_KEY=replace-with-local-secret
DEBUG=True
```

### Frontend env file (optional but recommended)

Path: letsquiz_frontend/.env

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8000
REACT_APP_ENCRYPTION_KEY=replace-with-local-key
```

## 4) Health Checks

- Backend base API responds and logs requests
- Frontend loads at localhost:3000
- Redis is reachable (manage.py test_redis)
- Level 1 route flow works: home -> quiz -> results and player-setup -> quiz -> results

Useful backend commands:

```bash
python manage.py test_redis
python manage.py manage_cache --action=stats
python manage.py seed_questions
```

## 5) Resume After Long Gap (Checklist)

1. Read docs/README.md for map.
2. Read PROJECT_PLAN.md for current target level and release gates.
3. Read PROJECT_INTELLIGENCE.md for verified current implementation state.
4. Read DECISIONS_LOG.md for non-obvious architecture decisions.
5. Validate local boot and run Level 1 smoke flow.
6. Confirm no doc/code drift before starting new changes.

## 6) Documentation Maintenance Protocol

Update docs in the same change when any of the following happen:

- Route surface changes
- API contract changes
- Data model changes
- Auth/session behavior changes
- Cache key/TTL/invalidation behavior changes
- Level scope or release-gate criteria changes

## 7) Release Readiness Baseline (Per Level)

- In-scope flows pass manually and by available tests.
- Out-of-scope features are not accidentally active in primary flow.
- API calls in visible UI map to existing endpoints.
- Error states produce actionable user feedback.
- Docs for changed behavior are updated.

## 8) Continuity Risks to Monitor

- Divergence between implementation and PROJECT_INTELLIGENCE snapshot.
- Dormant features reactivated without complete contract checks.
- Env/config assumptions changing without runbook updates.

## 9) Single-Maintainer Operating Pattern

For each work cycle:

1. Pick level-scope tasks from PROJECT_PLAN.md.
2. Execute in small slices with verification after each slice.
3. Record key architectural/product decisions in DECISIONS_LOG.md.
4. Refresh PROJECT_INTELLIGENCE.md when system behavior changes.

## 10) Simplification Backlog (Defer to Level 2+)

These items were intentionally deferred because they are not release-gate blockers for Level 1.

1. Reduce redundant frontend caching where backend Redis already provides the primary performance benefit.
2. Complete or disable dormant auth verification flow until model + token path are fully aligned.
3. Rework cache invalidation patterns away from broad Redis key scans and hardcoded environment prefixes.
4. Either fully implement request queueing for token refresh concurrency, or simplify to a smaller single-flight pattern.
5. Re-validate and normalize production settings import/config paths before higher-level hardening.

Execution note:

- Reassess each item when opening Level 2 planning, and only implement changes that clearly improve reliability or maintainability without expanding runtime risk.
