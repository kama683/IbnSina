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

The frontend (Vite, `front/`) proxies `/api` to `http://localhost:8000` in dev,
so no CORS or API URL setup is needed (`VITE_DEV_API_TARGET` overrides the target).

## Demo data

`seed_demo.py` fills the dev database with a large, internally consistent data
set for manual testing (~800 patients, ~5.8k appointments over -45/+14 days,
~3.4k invoices in every status, payments, cash shifts, refund requests, 12 demo
doctors, nurses, receptionists). Demo logins are `reception1@demo.ibnsina.local`,
`doctor1@demo.ibnsina.local`, ... with password `demo123`.

```bash
python seed_demo.py              # add demo data (refuses to run twice)
python seed_demo.py --reset      # delete demo data and recreate it
python seed_demo.py --reset-only # delete demo data only
```

Only demo rows are touched (employees `@demo.ibnsina.local`, patients created by
the seeder); the original `seed.py` accounts and data stay as they are.

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
