# LetsQuiz

LetsQuiz is an interactive quiz platform with fast solo and local group gameplay.

Current release focus is a public gameplay MVP where users can start playing immediately without authentication blockers.

## Documentation Strategy

This documentation set is organized for long-term solo maintenance:

- Stable foundation files are detailed and should change rarely.
- Level and milestone files are intentionally lighter because product scope evolves.
- Every architectural or contract change must update the relevant stable file.

## What You Can Do Today

- Play solo quizzes end to end: Home -> Quiz -> Results
- Play local group quizzes end to end: Player Setup -> Quiz -> Results
- Use the Level 1 category set: Science, History, Geography
- Choose stable difficulty levels and complete sessions with clear results

## Current Product Scope

### In active runtime path (Level 1)

- Public gameplay flow
- Solo mode
- Local group mode (2 to 6 players)
- Guest-friendly quiz flow with resilient API behavior

### Intentionally out of primary runtime path

- Auth-first navigation (login/signup/dashboard/profile)
- Leaderboards
- Premium gating
- LLM/Celery generation pipeline
- Real-time multiplayer

## Tech Stack

- Frontend: React 18, TypeScript, Redux Toolkit, React Router, Axios
- Backend: Django 4.2, Django REST Framework, JWT auth
- Cache: Django cache backend (Redis optional; disabled by default in Level 1)
- Database: SQLite for development, PostgreSQL in production environments
- DevOps: Docker Compose (optional cache profile), Railway deployment behind Cloudflare

## Repository Structure

```text
letsquiz/
├── letsquiz_frontend/      # React + TypeScript SPA
├── letsquiz_backend/       # Django REST API
├── docs/                   # Canonical project documentation
└── docker-compose.dev.yml  # Optional local cache services
```

## Quick Start (Local Development)

### 1) Start Backend

```bash
cd letsquiz_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend runs at http://127.0.0.1:8000.

### 2) Start Frontend

In a new terminal:

```bash
cd letsquiz_frontend
npm install
npm start
```

Frontend runs at http://localhost:3000.

## Environment Variables

### Backend

Create a file at letsquiz_backend/core/.env with at least:

```env
SECRET_KEY=your-local-secret
DEBUG=True
```

### Frontend (optional)

Create letsquiz_frontend/.env if you want custom values:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8000
REACT_APP_ENCRYPTION_KEY=your-local-encryption-key
```

## API Surface (Core Gameplay)

- GET /categories/
- GET /questions/
- POST /sessions/
- POST /sessions/<id>/answer/
- GET /sessions/<id>/results/
- POST /quiz-sessions/

## Canonical Project Docs

### Stable and Detailed (change infrequently)

- [SYSTEM_FOUNDATION.md](SYSTEM_FOUNDATION.md): product overview, architecture, domain model, and enduring design decisions
- [USER_AND_DATA_FLOWS.md](USER_AND_DATA_FLOWS.md): end-to-end user and backend data flows
- [OPERATIONS_AND_CONTINUITY.md](OPERATIONS_AND_CONTINUITY.md): runbook, recovery, and resume-after-gap checklist
- [DECISIONS_LOG.md](DECISIONS_LOG.md): architectural and product decisions with rationale

### Current-State Snapshot (update when implementation changes)

- [PROJECT_INTELLIGENCE.md](PROJECT_INTELLIGENCE.md): verified implementation snapshot and known gaps
- [RUNTIME_REFERENCE.md](RUNTIME_REFERENCE.md): quick runtime constraints and operational baselines

### Evolving Planning and Execution (expected to change)

- [PROJECT_PLAN.md](PROJECT_PLAN.md): multi-level rollout plan and release gates
- [Project_lvl_1.md](Project_lvl_1.md): Level 1 tracker and completion notes

## Documentation Update Rules

1. Update stable files only for real architecture, data-contract, or operational changes.
2. Keep level trackers focused on scope, decisions, and validation status.
3. When implementation diverges from docs, fix docs in the same change set.
4. Add date stamps when key assumptions are re-verified against code.

## Contributing

1. Keep changes aligned with current level scope in [PROJECT_PLAN.md](PROJECT_PLAN.md).
2. Prefer minimal, testable changes.
3. Update canonical docs when behavior or scope changes.

## Contact

- GitHub: https://github.com/hemanta12
- Email: thapahemanta.dev@gmail.com
