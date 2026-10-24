# План: миграция фронтенда с Next.js на Vite + React + TypeScript

**Статус:** черновик плана, код не тронут. Как и на предыдущих этапах,
реализация начинается после того, как вы проверите план и ответите на
вопросы §9.

Бэкенд (FastAPI, Postgres, 102 теста) **не меняется** — это замена только
оболочки фронтенда. Нужна одна проверка конфигурации (§4.2).

## 1. Что сейчас (по факту из кода)

| Параметр | Значение |
|---|---|
| Стек | Next.js 16.2.9 (App Router), React 19.2, Tailwind v4, TS, lucide-react |
| Объём | ~8 000 строк, 70 `.tsx`, 17 файлов `lib/` |
| Страниц | 15 (14 в группе `(doctors)` + `/login`) |
| Серверные страницы (RSC) | **все 14** страниц `(doctors)` — каждая сама зовёт API на сервере (`await getX()`), без `"use client"` |
| Клиентских компонентов | 28 из 70 |
| Зависимости от Next | `next/link` (~25 мест), `useRouter` (~17), `usePathname`, `useSearchParams`, `notFound()` (4), `next/font` (Geist), `proxy.ts`, `searchParams`/`params` как Promise в страницах, `metadata` |
| `router.refresh()` | 15 вызовов — перезапрос серверных данных после мутаций |
| Авторизация | httpOnly-cookie `access_token` (`path=/`) и `refresh_token` (`path=/api/auth`), `SameSite=Lax`, ставит бэкенд |
| Гвардия входа | `proxy.ts` — редирект на `/login`, если нет cookie |
| Серверное чтение cookie | `lib/api/server-auth.ts` — RSC читает cookie через `next/headers` и шлёт `Authorization: Bearer` |
| Тесты фронта | нет |

Главное следствие: **это не «поменять сборщик», а перенос получения данных
с сервера на клиент.** Каждая из 14 страниц сейчас приходит с готовыми
данными, а в SPA они должны загружаться в браузере (loading/error-состояния
появляются там, где их раньше не было).

### Найденная проблема, которую миграция заодно закрывает

Бэкенд выдаёт access-токен на 15 минут и умеет `POST /api/auth/refresh`,
но **фронтенд `/auth/refresh` нигде не вызывает** (grep по `lib/`,
`components/`, `app/` — только `logout`). Значит, через 15 минут cookie
протухает, `proxy.ts` выбрасывает на `/login`. В SPA клиент нужно писать с
одноразовым «401 → refresh → повтор запроса» (§4.3).

## 2. Целевой стек

| Задача | Решение | Почему |
|---|---|---|
| Сборка | Vite + `@vitejs/plugin-react` | запрошено |
| Роутинг | React Router v7 (library mode) | ближе всего к файловой структуре App Router, вложенные layout'ы через `<Outlet/>`, `useSearchParams`, `useParams`, `Link` — почти 1:1 с текущим кодом |
| Данные | TanStack Query | заменяет RSC-fetch и `router.refresh()` (`invalidateQueries`), даёт кэш, loading/error, `Promise.all` → параллельные `useQuery` |
| Стили | Tailwind v4 через `@tailwindcss/vite` | `globals.css` переезжает как есть, меняется только плагин вместо PostCSS |
| Шрифты | `@fontsource-variable/geist` и `geist-mono` | замена `next/font/google` |
| Иконки | lucide-react | без изменений |
| Тесты | Vitest + Testing Library (минимум) | у фронта сейчас 0 тестов, см. §6 |
| Линт | ESLint 9 + `typescript-eslint` + `eslint-plugin-react-hooks` | убрать `eslint-config-next` |

Альтернатива роутеру — TanStack Router (строже типизирован, но другая
модель и больше переписывания). Рекомендую React Router.

## 3. Стратегия: новое приложение рядом, затем подмена

`front/` остаётся рабочим на всём протяжении миграции — по принципу плана
«каждый этап заканчивается рабочим состоянием». Новое приложение строится
в `front-vite/`, в конце `front/` удаляется, `front-vite/` переименовывается
в `front/`.

Почему не на месте: Next и Vite не сосуществуют в одном `package.json`/
`tsconfig` без полусломанных промежуточных коммитов.

Что **переносится без изменений** (чистый TS, ~40% кода): `lib/types.ts`,
`lib/roles.ts`, `lib/currency.ts`, `lib/calendar-utils.ts`, `lib/api/*.ts`
(кроме `api.ts` и `server-auth.ts`), `components/ui/*`, весь Tailwind-CSS.
Меняются в основном импорты `next/*`.

## 4. Архитектурные решения

### 4.1 Таблица замен

| Next.js | Vite / React Router |
|---|---|
| `app/**/page.tsx` | `src/pages/**` + таблица маршрутов в `src/router.tsx` |
| `app/(doctors)/layout.tsx` (async, грузит employee) | `AppLayout` с `<Outlet/>`; employee из `AuthProvider` |
| `app/layout.tsx` | `index.html` + `main.tsx` |
| `next/link` | `Link` из `react-router-dom` (`href` → `to`) |
| `useRouter().push/replace` | `useNavigate()` |
| `useRouter().refresh()` | `queryClient.invalidateQueries(...)` |
| `usePathname` | `useLocation().pathname` |
| `useSearchParams` | `useSearchParams` из react-router (другой API: возвращает `[params, setParams]`) |
| `params: Promise<{id}>` | `useParams()` |
| `searchParams: Promise<...>` в странице | `useSearchParams()` |
| `notFound()` | `<NotFound/>` / `errorElement` по `ApiError.status === 404` |
| `proxy.ts` | `<RequireAuth>` в роутере + обработка 401 в API-клиенте |
| `serverAuthHeader()` / `next/headers` | удаляется — на клиенте браузер сам шлёт cookie |
| `next/font` | `@fontsource-variable/*` |
| `export const metadata` | `<title>` в `index.html` + `document.title` на страницах (по необходимости) |
| `process.env.NEXT_PUBLIC_API_URL` | `import.meta.env.VITE_API_URL` |
| `RoleGate` (RSC) | обычный компонент, код не меняется |

### 4.2 Адрес API и cookie (развилка — вопрос 2 в §9)

Вариант A (рекомендую): **Vite dev-proxy** `/api → http://localhost:8000`,
клиент ходит на относительный `/api/...`. Всё same-origin: CORS не нужен,
`SameSite=Lax`-cookie работают, `refresh_token` с `path=/api/auth` тоже.
В проде — тот же принцип: статический `dist/` и reverse proxy `/api`
на FastAPI (nginx/Caddy). Бэкенд не трогаем. Для прода только
`secure=True` для cookie при HTTPS (сейчас `secure=False`,
`back/app/routers/auth.py:50` — это уже было открытым пунктом Этапа 0).

Вариант B: клиент ходит напрямую на `http://localhost:8000` с
`credentials: "include"`. Придётся добавить `http://localhost:5173` в
`CORS_ORIGINS` (`back/.env`). `localhost:5173` и `localhost:8000` — один
site, `Lax`-cookie пройдут, но в проде нужен общий родительский домен.

### 4.3 API-клиент (`src/lib/api/client.ts`)

Заменяет `api.ts` + `server-auth.ts`. Остаются `apiGet/apiPost/apiPatch`
и `ApiError` с теми же сигнатурами — файлы `lib/api/*.ts` не меняются.
Новое поведение:

1. Всегда `credentials: "include"`, никакого `Authorization` на клиенте.
2. На 401: один раз вызвать `POST /api/auth/refresh`; при успехе повторить
   исходный запрос; при провале — `logout` и переход на `/login?next=...`.
3. **Один общий in-flight refresh** (промис в модульной переменной), иначе
   пять параллельных запросов с протухшим токеном сделают пять refresh'ей
   и ротация refresh-токена (Этап 0, коммит 7) отзовёт токен у остальных.
4. `/login` и `/auth/refresh` не уходят в цикл refresh.

### 4.4 Авторизация и гварды

- `AuthProvider` на старте зовёт `GET /api/auth/me` (кэш TanStack Query),
  отдаёт `employee`/`role`. Пока грузится — экран загрузки (замена
  оптимистичной проверки cookie в `proxy.ts`).
- `<RequireAuth>`: нет сессии → `/login?next=<path>`; сессия есть и
  открыт `/login` → `/`.
- `mustChangePassword` (есть в `AuthUser`) — отдельный редирект на смену
  пароля. Сейчас экрана смены пароля на фронте нет; **в рамках миграции не
  добавляем**, но оставляем место в `RequireAuth`.
- Ролевые гварды по маршрутам: `<RequireRole allow={...}>` на основе
  существующего `lib/roles.ts`. Сейчас прямой заход ресепшена на
  `/reports/daily` защищён только 403 бэкенда и скрытым пунктом меню — это
  по-прежнему «только UX», реальная защита на бэкенде (инвариант 9).

### 4.5 Данные

- Один хук на запрос, ключи по сущностям (`['patients', id]`,
  `['appointments','today']`, …). Мутации инвалидируют связанные ключи —
  каждому из 15 `router.refresh()` соответствует явный `invalidateQueries`.
- Страница вроде карточки пациента (4 параллельных запроса +
  условные по роли) → 4 `useQuery`, у условных `enabled: canViewVitals`.
  Это сохраняет исправление Этапа 1, коммит 12 (не звать эндпоинты, которые
  бэкенд всё равно не отдаст).
- `QueueContent` уже клиентский и обновляет очередь вручную
  (`refreshQueue`) — переводится на `useQuery` + `invalidateQueries`,
  попутно можно добавить `refetchInterval` для «живой» очереди (отдельное
  решение, по умолчанию не включаем).

### 4.6 Печать квитанции

`/invoices/:id/receipt` печатается `window.print()`; в `layout` и
`ReceiptContent` используются `print:*` классы Tailwind. Это не зависит от
Next и переносится как есть, но **входит в проверку по §6** (печатный вид).

## 5. План по коммитам

Нумерация — как на прошлых этапах (атомарные коммиты, каждый оставляет
репозиторий рабочим; `front/` не трогается до коммита 11).

| # | Коммит | Что делаем | Проверка |
|---|---|---|---|
| 0 | `chore: scaffold front-vite` | Vite + React + TS strict, Tailwind v4 (`@tailwindcss/vite`), ESLint, алиас `@/*`, `.env.example` (`VITE_API_URL`), dev-proxy `/api`, Vitest | `npm run dev/build/lint` проходят, пустая страница |
| 1 | `feat: перенос lib/ и ui-компонентов` | копия `lib/types|roles|currency|calendar-utils`, `lib/api/*` (без `api.ts`/`server-auth.ts`), `components/ui/*`, `globals.css`, шрифты | `tsc --noEmit` без ошибок |
| 2 | `feat: API-клиент с refresh` | `client.ts`: credentials, 401→refresh→повтор, общий in-flight refresh, `ApiError`; unit-тесты (Vitest + мок `fetch`) | тесты: 401 → один refresh → повтор; 5 параллельных 401 → ровно 1 refresh; провал refresh → логаут |
| 3 | `feat: auth shell` | `AuthProvider`, `RequireAuth`, `RequireRole`, `/login` (+ `?next=`), роутер, `QueryClientProvider`, `AppLayout` (Sidebar/Header/Outlet, `print:hidden`), `NotFound` | вход всеми 6 ролями, редиректы, меню по роли |
| 4 | `feat: дашборд, очередь, приёмы` | `/`, `/queue`, `/appointments` (+ `?week=`), `AppointmentActions`, календарь, `ReceptionQuickSearch` | вручную как врач и ресепшен |
| 5 | `feat: пациенты` | `/patients` (поиск/участок/страница в URL), `/patients/:id` (4 вкладки), `/patients/:id/examination`, модалки создания/редактирования | карточка у reception не падает без vitals; 404 → NotFound |
| 6 | `feat: услуги и профиль` | `/services`, `/profile`, `/settings` | head_doctor правит прейскурант; профиль врача |
| 7 | `feat: касса и счета` | `/cash-register`, `/invoices/:id`, платежи, скидка, отмена | полная цепочка: смена → счёт → оплата → закрытие |
| 8 | `feat: квитанция, возвраты, отчёт` | `/invoices/:id/receipt` (печать), `/refunds`, `/reports/daily` | печатный вид; очередь возвратов под head_doctor |
| 9 | `feat: глобальный поиск и шапка` | `HeaderSearch` (debounce), логаут в Sidebar | поиск из любой страницы |
| 10 | `test: паритет с Next` | чеклист по ролям (§6), Vitest на `roles.ts` и фильтрацию меню, `vite build` + `vite preview` | все пункты чеклиста |
| 11 | `chore!: удалить Next.js` | удалить `front/`, переименовать `front-vite/` → `front/`, убрать `proxy.ts`/`next.config.ts`/`next-env.d.ts`/`nextdev.log`, обновить `.gitignore`, переписать `AGENTS.md`/`CLAUDE.md` (сейчас в них Next-специфичные правила), обновить `back/README.md` и `docs/SYSTEM_OVERVIEW.md` | чистый `npm ci && npm run build`, backend-тесты 102/102 |

Порядок страниц (4–8) идёт от простых к сложным и повторяет
зависимости: касса опирается на пациентов и услуги.

## 6. Тестирование и критерий паритета

Автотестов фронта нет, поэтому «ничего не сломали» нужно доказывать
руками по списку. Для каждой из 6 ролей (`reception`, `doctor`, `nurse`,
`accountant`, `head_doctor`, `admin`) из `back/seed.py`:

- логин, редирект на `?next=`, повторный заход на `/login` → `/`;
- пункты меню совпадают с `NAV_ITEMS` для роли;
- прямой заход на запрещённый URL (например ресепшен → `/reports/daily`)
  → понятное сообщение, а не белый экран;
- истечение access-токена посреди работы → сессия продлевается молча
  (то, чего нет сейчас);
- обновление страницы (F5) на глубоком URL, например
  `/invoices/12/receipt`, открывает именно её (**нужен SPA-fallback** на
  `index.html` — в dev Vite делает сам, в проде настраивается в nginx).

Сквозные сценарии: запись пациента → приём → осмотр → завершение;
открыть смену → счёт → оплата → квитанция → печать → возврат →
одобрение главврачом → закрыть смену; отчёт за день сходится с платежами.

Минимум автотестов: клиент с refresh (§5, коммит 2), `lib/roles.ts`.
Playwright e2e — опционально, отдельным решением (вопрос 5).

## 7. Риски

| Риск | Серьёзность | Смягчение |
|---|---|---|
| 15 `router.refresh()` не заменены на инвалидацию → UI показывает старые данные после мутации | высокая | в коммитах 4–8 каждый `refresh()` ищется grep'ом и заменяется явным ключом; в конце grep по `router.refresh` = 0 |
| Гонка refresh при параллельных 401 | средняя | один общий промис, unit-тест (§5, коммит 2) |
| Мигание/скелетоны там, где раньше был готовый HTML | низкая, но заметно | единый `<PageLoader/>`, `isPending` вместо пустой страницы |
| Потеря `SameSite`/cookie в проде при разных доменах | высокая для прода | вариант A (same-origin через proxy), `secure=True` при HTTPS |
| Расхождение `lib/roles.ts` с бэкендом при переносе | средняя | файл переносится 1:1, не переписывается |
| Печатная квитанция | средняя | отдельный пункт чеклиста, проверка в браузере |
| Параллельная работа над Этапом 3 порождает новые Next-страницы | высокая | см. вопрос 1: сначала миграция, потом склад |
| Неявная зависимость от SSR (например скрытые данные на сервере) | низкая | в коде нет `getServerSideProps`/server actions; все серверные вызовы — чистые `fetch` к FastAPI, проверено |

## 8. Объём

Грубо, по размеру: коммиты 0–3 — основание (средне), 4–8 — механический
перенос 14 страниц (основной объём, ~70% работы), 9–11 — добивка.
Ключевая сложность — в 2–3 (клиент, auth-shell), дальше работа
повторяющаяся.

## 9. Открытые вопросы

1. **Когда: до или после Этапа 3 (склад)?** Рекомендую **до**: Этап 3 —
   это ещё ~5–8 новых страниц (препараты, приход, остатки, инвентаризация,
   дашборд склада); написанные на Next, они потом придётся переносить
   второй раз. Цена — склад сдвигается на время миграции. Альтернатива —
   вести оба параллельно, но тогда каждую новую страницу придётся делать
   дважды.
2. **Адрес API:** вариант A (Vite-proxy / same-origin, рекомендую) или B
   (прямой URL + CORS)?
3. **Стратегия:** параллельная папка `front-vite/` с подменой в конце
   (рекомендую) или заменить `front/` сразу, без работающего приложения
   на время миграции?
4. **Роутер и данные:** React Router + TanStack Query (рекомендую) —
   устраивает? Или хотите TanStack Router, или без библиотеки данных
   (чистый `fetch` + `useEffect`, меньше зависимостей, но больше ручного
   кода и больше ошибок со stale-данными)?
5. **Тесты:** достаточно Vitest на клиент и роли (рекомендую) или сразу
   Playwright e2e по чеклисту §6?
6. **Прод-деплой:** куда и как будет выкладываться (nginx/Caddy/статика
   на CDN)? Сейчас в репозитории деплой-конфигурации нет (`docker-compose`
   поднимает только Postgres), поэтому я не планирую Dockerfile для фронта,
   пока вы не скажете, что он нужен.
7. **Экран смены пароля** (`mustChangePassword`): добавить в эту миграцию
   или оставить следующим этапом (по плану Этапа 5/6)? По умолчанию — не
   добавляем, чтобы миграция была чистым паритетом.
