# Frontend (Vite + React + TypeScript)

SPA без SSR. Раньше был Next.js (App Router, RSC), миграция описана в
`docs/VITE_MIGRATION_PLAN.md`. Если в коде или в памяти всплывает что-то из
Next (`next/link`, `useRouter().refresh()`, серверные компоненты,
`proxy.ts`, `notFound()`) — этого здесь нет.

## Стек

Vite 8, React 19, TypeScript (strict), React Router 7 (`createBrowserRouter`),
TanStack Query 5, Tailwind v4 (`@tailwindcss/vite`), Vitest + Testing Library.

## Команды

- `npm run dev` — dev-сервер на :5173, `/api` проксируется на бэкенд :8000
  (`VITE_DEV_API_TARGET` меняет адрес). Same-origin: CORS не нужен, httpOnly-cookie
  работают как есть.
- `npm run build` — `tsc -b` + `vite build` (статика в `dist/`; в проде нужен
  SPA-fallback на `index.html` и reverse proxy `/api` → FastAPI).
- `npm test` — Vitest. `npm run lint` — ESLint.

## Устройство

- `src/router.tsx` — все маршруты. Ролевые группы: `<RequireRole allow={...}>`
  с константами из `src/lib/roles.ts`. Это только UX, права проверяет бэкенд.
- `src/pages/` — страницы: берут данные через `useQuery`, оборачивают в
  `<QueryBoundary>` (лоадер / ошибка / 404 / 403).
- `src/components/` — по доменам. Часть компонентов копирует props в `useState`
  один раз (формы, `ServicesContent`, `CashRegisterContent`).
- `src/lib/api/` — функции вызова API. Всё идёт через `api.ts` (`apiGet/apiPost/apiPatch`).
- `src/lib/auth/` — сессия: `RequireAuth` проверяет её через `/api/employees/me`,
  `useEmployee()` отдаёт текущего сотрудника.

## Правила, которые легко нарушить

- **`queryFn` с параметрами — только через стрелку:** `queryFn: () => getX(id)`.
  `queryFn: getX` передаст в функцию контекст запроса вместо аргумента.
- **Запрос, который бэкенд роли всё равно не отдаст (403), не отправляем:**
  `enabled: canView…` (`VIEW_VITALS_ROLES`, `VIEW_MEDICAL_ROLES`, …).
- **После мутации — `useRefresh()`** (замена `router.refresh()`): инвалидирует все
  запросы, кроме сессии. Не оставляйте мутацию без обновления данных.
- **`gcTime: 0` в `lib/query-client.ts` — намеренно:** каждый заход на страницу
  грузит данные заново. Не включайте кэш, пока компоненты с
  `useState(initialProps)` не переведены на данные из запроса.
- **Ввод, который меняет запрос (поиск), не должен прятать себя за лоадером:**
  `placeholderData: keepPreviousData`.
- **Сессия:** access-токен живёт 15 минут. `api.ts` на 401 один раз зовёт
  `/auth/refresh` (общий на все параллельные запросы — бэкенд ротирует токен) и
  повторяет запрос; не вызывайте `/auth/refresh` вручную.
- Деньги — целые числа в тиынах (`lib/currency.ts`), никаких float.
