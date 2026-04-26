# Start Here: Run LetsQuiz Level 1 in VS Code (Developer Mode)

This guide gets your Level 1 gameplay flow running locally:

- Home -> Quiz -> Results (solo)
- Player Setup -> Quiz -> Results (group)

## 1) Prerequisites

Install these first:

- Python 3.10+ (3.11 recommended)
- Node.js 18+ and npm
- Docker Desktop (optional, only if testing Redis profile)
- VS Code

## 2) Open the Project in VS Code

1. Open VS Code.
2. Open folder: `letsquiz` (the folder that contains `letsquiz_backend`, `letsquiz_frontend`, `docs`, and `docker-compose.dev.yml`).
3. Open 3 terminals in VS Code (`Terminal` -> `New Terminal`).

You will use:

- Terminal A: Backend (Django)
- Terminal B: Frontend (React)

## 3) Optional Redis Profile (Only if explicitly testing it)

From the `letsquiz` root:

```bash
docker compose -f docker-compose.dev.yml --profile optional-cache up -d redis
```

Optional check:

```bash
docker ps
```

You should see a container named `letsquiz-redis` running.

Skip this section for normal Level 1 development.

## 4) Backend Setup and Run (Terminal A)

### 4.1 Go to backend folder

```bash
cd letsquiz_backend
```

### 4.2 Create and activate virtual environment

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 4.3 Install dependencies

```bash
pip install -r requirements.txt
```

### 4.4 Create backend env file

Create this file:

- `letsquiz_backend/core/.env`

Add:

```env
SECRET_KEY=dev-secret-key-change-me
DEBUG=True
```

### 4.5 Run database migrations

```bash
python manage.py migrate
```

### 4.6 Start Django dev server

```bash
python manage.py runserver
```

Backend should now be available at:

- http://127.0.0.1:8000

Quick checks in browser:

- http://127.0.0.1:8000/categories/
- http://127.0.0.1:8000/questions/

## 5) Frontend Setup and Run (Terminal B)

### 5.1 Go to frontend folder

From project root:

```bash
cd letsquiz_frontend
```

### 5.2 Install dependencies

```bash
npm install
```

### 5.3 Optional frontend env file

Create `letsquiz_frontend/.env` (optional but recommended for clarity):

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8000
```

### 5.4 Start React dev server

```bash
npm start
```

Frontend should now be available at:

- http://localhost:3000

## 6) Validate Level 1 Runtime Flow

In browser at `http://localhost:3000`:

1. Confirm Home page loads.
2. Confirm Level 1 categories are visible (Science, History, Geography).
3. Start a solo quiz and finish it.
4. Confirm Results page loads and shows final score.
5. Go to Player Setup and start group mode (2-6 players).
6. Finish group quiz and verify group results/ranking appear.

If all of these work, Level 1 is running correctly in developer mode.

## 7) Common Fixes (If Something Fails)

### Backend fails at startup

- Ensure virtualenv is activated in Terminal B.
- Re-check `letsquiz_backend/core/.env` exists and includes `SECRET_KEY`.
- Re-run `python manage.py migrate`.

### Frontend cannot reach backend

- Confirm backend is running on `127.0.0.1:8000`.
- Confirm frontend `.env` points to `http://127.0.0.1:8000`.
- Restart frontend terminal after changing `.env`.

### Optional Redis profile issues

- Confirm Docker Desktop is running.
- Re-run:

```bash
docker compose -f docker-compose.dev.yml --profile optional-cache up -d redis
```

### Port already in use

- Backend alternate port:

```bash
python manage.py runserver 8001
```

- If using port 8001, update frontend env:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8001
```

## 8) Stop Everything

From project root:

```bash
docker-compose -f docker-compose.dev.yml down
```

Stop backend/frontend with `Ctrl + C` in their terminals.
