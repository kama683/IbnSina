# IbnSina Frontend

Next.js (App Router) frontend for the IbnSina polyclinic system. Talks to the
FastAPI backend in `../back`.

## Setup

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, defaults to http://localhost:8000
npm run dev
```

The backend must be running first — see `../back/README.md`. Every page
except `/login` requires an authenticated session; `proxy.ts` redirects
unauthenticated requests to `/login`.

## Structure

- `app/` — routes (App Router). `(doctors)` is the authenticated shell with
  sidebar/header; `login/` is public.
- `components/` — UI components, grouped by feature.
- `lib/api/` — typed fetch wrappers per backend resource. All requests go
  through `lib/api/api.ts`, which attaches the auth token and redirects to
  `/login` on 401.

## Build

```bash
npm run build
npm run start
```
