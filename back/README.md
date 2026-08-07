# IbnSina API

FastAPI + PostgreSQL backend for the IbnSina polyclinic system.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

cp .env.example .env          # then fill in DATABASE_URL and SECRET_KEY
# generate a secret key:
python -c "import secrets; print(secrets.token_hex(32))"

alembic upgrade head
python seed.py
```

`seed.py` creates one doctor/user and prints the login credentials it created
(default: `sharipov@poliklinika12.kz` / `doctor123`).

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

The frontend expects the API at `http://localhost:8000` by default
(`NEXT_PUBLIC_API_URL` in `front/.env.local`).

## Auth

All routers except `/api/auth/login` require a `Authorization: Bearer <token>`
header. Get a token via:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sharipov@poliklinika12.kz","password":"doctor123"}'
```

## Migrations

```bash
alembic revision -m "description"   # new migration
alembic upgrade head                # apply
```
