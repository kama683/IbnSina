# IbnSina — бизнес-логика системы

Документ описывает **только то, что реально есть в коде** на момент написания (ветка `main`, backend `back/`, frontend `front/`). Источники: модели, роутеры, зависимости, тесты (`back/tests/`), страницы и компоненты Next.js. Всё, что задумано в планах (`IBNSINA_DEVELOPMENT_PLAN.md`, `docs/PHASE*_ANALYSIS.md`), но не реализовано, вынесено в раздел 9.

Условные обозначения:
- Роли в коде (`EmployeeRole`): `reception` (в UI «Регистратура»), `doctor` («Врач»), `nurse` («Медсестра»), `accountant` («Бухгалтерия»), `head_doctor` («Главный врач»), `admin` («Администратор»).
- Деньги везде хранятся и передаются в **тиынах** (`BigInteger`; 100 тиын = 1 ₸). Форматирование в тенге — только на фронте (`front/lib/currency.ts`).
- «Нет в коде» означает, что соответствующих моделей/эндпоинтов/страниц в репозитории нет.

---

## 1. Обзор системы

### 1.1 Назначение

Информационная система поликлиники («IbnSina»). Реализованная часть — рабочее место клиники из пяти направлений:

1. картотека пациентов и поиск;
2. запись на приём к нескольким врачам, расписание, живая очередь на день;
3. осмотр врачом (жалобы, объективный статус, диагноз из справочника МКБ-10, назначения);
4. касса: прейскурант услуг, счета, оплаты, скидки с подтверждением, возвраты с подтверждением, кассовые смены, отчёты по смене и за день, печатная квитанция;
5. аутентификация, ролевая модель и журнал аудита (запись; интерфейса просмотра нет).

Склад препаратов, бухгалтерия (расходы, расчёт и выплата зарплат), админ-панель главврача (найм/увольнение) **не реализованы** — см. раздел 9.

### 1.2 Стек

| Слой | Технологии |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.x (`Mapped`-стиль), Alembic, Pydantic v2 / pydantic-settings, PyJWT (HS256), bcrypt, PostgreSQL 16 (`docker-compose.yml`, сервис `db`) |
| Frontend (рабочий) | Next.js 16 (App Router, RSC), React 19, TypeScript, Tailwind v4, lucide-react (`front/`) |
| Frontend (каркас миграции) | Vite + React + TS в `front-vite/` — scaffold (коммит `0a2b4fa`), бизнес-логики сверх копии `lib/` и `ui/` нет; план — `docs/VITE_MIGRATION_PLAN.md` (в git не добавлен) |
| Тесты | pytest (`back/tests/`, 15 файлов); тестов фронтенда нет |

Конфигурация backend (`back/app/config.py`, `.env`): `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` (по умолчанию `http://localhost:3000`), `ACCESS_TOKEN_EXPIRE_MINUTES=15`, `REFRESH_TOKEN_EXPIRE_DAYS=30`, `DEFAULT_DISCOUNT_THRESHOLD_PERCENT=10`.

### 1.3 Backend

Точка входа — `back/app/main.py`. CORS: `allow_origins` из `CORS_ORIGINS`, `allow_credentials=True`. Общего (блокетного) auth-middleware нет — **каждый эндпоинт сам объявляет** `Depends(get_current_employee)` или `Depends(require_roles(...))` («default-deny», проверяется `tests/test_default_deny.py`).

| Роутер (`app/routers/`) | Префикс | Назначение |
|---|---|---|
| `auth.py` | `/api/auth` | вход, refresh, выход, смена пароля, текущий пользователь |
| `employees.py` | `/api/employees` | список врачей для записи, «я» (`/me`), профиль врача, правка своего профиля |
| `appointments.py` | `/api/appointments` | расписание, очередь, номера пациентов, запись, осмотр, отмена/перенос, статистика недели |
| `patients.py` | `/api/patients` | список/создание/правка пациентов, история, витальные, прививки, осмотр |
| `search.py` | `/api/search` | глобальный поиск пациентов и приёмов |
| `icd10.py` | `/api/icd10` | справочник МКБ-10 (локальный JSON `app/data/icd10_common.json`) |
| `services.py` | `/api/services` | прейскурант |
| `cash_shifts.py` | `/api/cash-shifts` | кассовые смены и отчёт по смене |
| `invoices.py` | `/api/invoices` | счета, позиции, скидки, оплаты |
| `refund_requests.py` | `/api/refund-requests` | заявки на возврат |
| `reports.py` | `/api/reports` | дневной отчёт по клинике |
| (в `main.py`) | `/health` | публичный healthcheck |

Прочее: `app/deps.py` — зависимости авторизации; `app/security.py` — хеши/токены; `app/services/audit.py` — `record_audit()`; `app/schemas/*` — Pydantic-схемы входа; `app/models/*` — 22 таблицы; `back/seed.py` — демо-данные (по одному сотруднику каждой роли, пациенты, приёмы); `back/alembic/` — миграции.

### 1.4 Frontend (`front/`)

Next.js App Router. Серверные страницы (RSC) сами вызывают API (`lib/api/*`), клиентские компоненты — для форм и действий. Все страницы под группой `app/(doctors)/` оборачиваются `layout.tsx` (Sidebar + Header, данные текущего сотрудника из `GET /api/employees/me`).

| Маршрут | Файл | Содержимое |
|---|---|---|
| `/login` | `app/login/page.tsx` | форма входа (`LoginForm`) |
| `/` | `app/(doctors)/page.tsx` | дашборд: текущий приём, приёмы на сегодня, «ближайшие», статистика недели (врач/главврач), быстрый поиск по ИИН (ресепшен) |
| `/appointments` | `appointments/page.tsx` | список на день + календарь недели, форма записи |
| `/queue` | `queue/page.tsx` | живая очередь на сегодня |
| `/patients` | `patients/page.tsx` | список пациентов (поиск, пагинация по 8) |
| `/patients/[id]` | `patients/[id]/page.tsx` | карточка пациента: вкладки «Общее», «История», «Паспорт здоровья», «Прививки» |
| `/patients/[id]/examination` | `patients/[id]/examination/page.tsx` | форма осмотра |
| `/services` | `services/page.tsx` | прейскурант |
| `/cash-register` | `cash-register/page.tsx` | кассовая смена, история смен, отчёт по смене |
| `/invoices/[id]` | `invoices/[id]/page.tsx` | карточка счёта, оплата, заявки на возврат |
| `/invoices/[id]/receipt` | `invoices/[id]/receipt/page.tsx` | печатная квитанция |
| `/refunds` | `refunds/page.tsx` | очередь заявок на возврат |
| `/reports/daily` | `reports/daily/page.tsx` | отчёт за день |
| `/profile` | `profile/page.tsx` | профиль врача (редактирование о себе, контактов, графика) |
| `/settings` | — | редирект на `/profile`: «Настройки» слиты с «Профилем» (см. раздел 9) |

Единые точки фронтенда: `lib/api/api.ts` (`apiGet/apiPost/apiPatch`, `credentials: "include"`, `ApiError`), `lib/api/server-auth.ts` (RSC читает cookie `access_token` и шлёт `Authorization: Bearer`), `lib/roles.ts` (матрица ролей на фронте, `NAV_ITEMS`), `components/auth/RoleGate.tsx`, `proxy.ts` (Next.js proxy/middleware).

---

## 2. Аутентификация и авторизация

### 2.1 Вход (`POST /api/auth/login`, публичный)

1. Принимает `{email, password}`. Ищет `User` по `email`, проверяет пароль `bcrypt.checkpw`.
2. Неверная пара → `401 «Неверный email или пароль»`. Сотрудник со статусом `fired` → `401 «Учётная запись деактивирована»`. Статус `on_leave` вход **не блокирует**.
3. Создаётся access-токен (JWT HS256, `sub = email`, `exp = now + 15 мин`; роль в токен **не** кладётся) и refresh-токен (случайная строка `secrets.token_urlsafe(48)`; в БД хранится только `sha256`-хеш в `refresh_tokens`, вместе с `user_agent`, `ip`, `expires_at = now + 30 дней`).
4. Пишется `audit_log` (`entity_type=user`, `action=login`). Неудачные попытки входа не аудируются.
5. Ответ ставит две httpOnly-cookie (`SameSite=Lax`, `secure=False` — dev-режим):
   - `access_token`, `path=/`, `max_age=15 мин`;
   - `refresh_token`, `path=/api/auth`, `max_age=30 дней`.
   В теле ответа дополнительно возвращаются `accessToken` (помечен deprecated в коде), `tokenType`, `user` (`id, email, fullName, role, employeeId, mustChangePassword`).

### 2.2 Проверка токена на каждом запросе (`app/deps.py`)

`get_current_user`: берёт токен из заголовка `Authorization: Bearer ...`, а если его нет — из cookie `access_token`. Нет токена → `401 «Не авторизован»`; невалидный/просроченный → `401`; пользователь не найден → `401`.

`get_current_employee` (корень ролевой проверки): берёт `user.employee`; нет сотрудника → `401`; `status == fired` → `401 «Учётная запись деактивирована»` (уволенный отсекается, даже если JWT ещё действителен).

`require_roles(*roles)`: фабрика зависимости поверх `get_current_employee`; роль не из списка → `403 «Недостаточно прав»`.

`require_self_or_roles(id_param, *roles)`: определена, но **ни одним эндпоинтом не используется**.

Особенность: `GET /api/auth/me` и `POST /api/auth/change-password` используют только `get_current_user` (без проверки `fired`) — действуют до истечения access-токена.

### 2.3 Refresh (`POST /api/auth/refresh`, публичный — работает по refresh-cookie)

1. Читает cookie `refresh_token`; нет → `401`.
2. Находит запись по `sha256`-хешу; не найдена / `revoked_at` задан / `expires_at` прошёл → `401 «Недействительный refresh-токен»`.
3. Пользователь/сотрудник отсутствует или `fired` → `401`.
4. **Ротация:** предъявленный токен получает `revoked_at = now`, выдаётся новая пара access+refresh, cookie перезаписываются. Повторное предъявление уже отозванного токена даёт `401`.
5. Аудит refresh не пишет.

### 2.4 Выход (`POST /api/auth/logout`, публичный)

Не требует access-токена (должен работать и с истёкшим). Если в cookie есть непросроченно-неотозванный refresh — ставит `revoked_at`, пишет аудит `logout`. В любом случае стирает обе cookie. Отзывается только предъявленный токен, не все токены пользователя.

### 2.5 Смена пароля (`POST /api/auth/change-password`)

Любой авторизованный пользователь: `{current_password, new_password}`. Неверный текущий → `400 «Текущий пароль неверен»`. Устанавливает новый bcrypt-хеш, `must_change_password = false`, пишет аудит `change_password`. Требований к сложности нового пароля в коде нет. Остальные refresh-токены не отзываются.

### 2.6 Проверка ролей на backend

Паттерн: в каждом роутере вверху объявлены именованные зависимости (`_VIEW_SCHEDULE`, `_MANAGE_INVOICE` и т. п.) и подключаются либо через `dependencies=[Depends(...)]`, либо параметром `current_employee: Employee = Depends(...)`. Часть прав разбирается **в теле хендлера** (владение приёмом, владение сменой, различие осмотр/отмена/перенос в `PATCH /appointments/{id}`). Соответствие таблице ролей проверяется параметризованным тестом `tests/test_rbac_matrix.py` (403 = роль отвергнута; любой другой код = пропущена).

Публичные маршруты (whitelist в `test_default_deny.py`): `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, а также `GET /health` (вне `/api`).

### 2.7 Проверка на frontend

Уровни (все — UX; настоящее разграничение — backend):

1. `front/proxy.ts` — если нет cookie `access_token` и путь не `/login` → редирект на `/login?next=<путь>`; если cookie есть и путь `/login` → редирект на `/`. Роль и валидность токена не проверяет. Access-cookie живёт 15 минут, поэтому по истечении `proxy.ts` отправляет на `/login`.
2. `app/(doctors)/layout.tsx` — загружает `GET /api/employees/me`; без валидной сессии запрос падает с 401.
3. `lib/api/api.ts` — при 401 в браузере вызывает `POST /api/auth/logout` и переходит на `/login` (на сервере RSC этого нет).
4. `lib/roles.ts` — наборы ролей (`VIEW_SCHEDULE_ROLES`, `ANY_STAFF_ROLES`, `MANAGE_CASH_ROLES` и др.) и `NAV_ITEMS`; `Sidebar` показывает только разрешённые пункты.
5. Страницы проверяют роль на входе и вместо контента показывают сообщение «… недоступно для вашей роли» (редиректа нет): `/appointments`, `/queue`, `/patients`, `/services`, `/cash-register`, `/refunds`, `/reports/daily`, `/profile`.
6. `RoleGate` скрывает кнопки внутри страниц.
7. **Вызова `POST /api/auth/refresh` на фронте нет**, экрана смены пароля нет, поле `mustChangePassword` не используется — фактическая сессия в UI ≈ 15 минут.

---

## 3. Роли

Общее для всех ролей: `GET /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/employees/me`, страницы `/` и `/profile` («Профиль» и «Настройки» — одна страница; `/settings` перенаправляет на неё).
`GET /api/employees/me/profile` и `PATCH /api/employees/me` формально пускают любую роль, но для сотрудника без `doctor_profile` отвечают `404 «Профиль врача не найден»` — по факту работают только для `doctor` и `head_doctor`.

В пунктах «Нельзя» перечислено то, что явно закрыто (403) или не существует в коде.

### 3.1 reception — Регистратура

**Кто и за что отвечает.** Регистрирует пациентов, записывает к любому врачу, отменяет/переносит любые приёмы, ведёт кассу: открывает/закрывает свою смену, выставляет счета, принимает оплаты, создаёт заявки на возврат.

**Страницы.** `/` («Стойка регистратуры», см. 6.1а), `/appointments`, `/queue`, `/patients`, `/patients/[id]`, `/services` (в меню «Прейскурант»), `/cash-register` (вкладки «Смена», «Счета», «Мои заявки»; над ними сводка кассы), `/invoices/[id]`, `/invoices/[id]/receipt`, `/profile`. Страница `/refunds` (очередь решений по возвратам) регистратору закрыта («Нет доступа») — её заявки он видит вкладкой «Мои заявки». На `/profile` у регистратора — карточка учётной записи и блок настроек (профиля врача нет).

**API.**

| Метод и путь | Что делает |
|---|---|
| `GET /api/appointments?from=&to=&patientId=&status=&completedWithin=`, `/week`, `/today`, `/queue`, `/current` | расписание и очередь (все врачи). Фильтры: `patientId` (приёмы пациента), `status` (несколько: `scheduled,in_progress` или повтором), `completedWithin` (минуты: завершённые за последние N минут по часам БД, новые первыми). Нужен хотя бы один из `from`/`to`, `patientId`, `completedWithin` — иначе 422 |
| `GET /api/appointments/queue-info?employeeId=&date=` | подсказка для записи: работает ли врач в этот день, сколько ждёт, какой номер получит новый пациент |
| `POST /api/appointments` | запись пациента к врачу |
| `PATCH /api/appointments/{id}` | **только** отмена (`status=cancelled` + обязательный `cancellationReasonCode`, для `other` ещё `cancellationReason` текстом) и перенос (`date`/`time`/`employeeId` — можно сменить врача) любого **запланированного** приёма |
| `GET /api/employees?role=doctor` | список врачей для формы записи |
| `GET /api/patients`, `GET /api/patients/{id}` | список и карточка |
| `POST /api/patients` | создание пациента |
| `PATCH /api/patients/{id}` | правка демографии |
| `GET /api/patients/{id}/history`, `/visit-history` | история приёмов (включая жалобы и диагноз) |
| `GET /api/search?q=` | глобальный поиск |
| `GET /api/services` | прейскурант |
| `POST /api/cash-shifts`, `GET /api/cash-shifts`, `GET /api/cash-shifts/current`, `POST /api/cash-shifts/{id}/close`, `GET /api/cash-shifts/{id}/report` | свои смены (`GET /api/cash-shifts` отдаёт только смены этого кассира; `close` и `report` чужой смены → 403) |
| `GET /api/invoices`, `GET /api/invoices/{id}`, `POST /api/invoices`, `PATCH /api/invoices/{id}/items`, `POST /api/invoices/{id}/issue`, `POST /api/invoices/{id}/cancel` | счета. Список: фильтры `status` (несколько), `appointmentId` (несколько), `from`/`to`, `limit`/`offset`; в строках добавлены `patientName`, `paidAmount`, `awaitingApproval` (черновик со скидкой выше порога без подтверждения). `POST` с `appointmentId` проверяет, что приём существует (404) и принадлежит этому пациенту (400) |
| `GET /api/reports/reception-summary` | сводка стойки одним запросом: открытая смена и принято за неё, ждущие/идущие приёмы, врачи сегодня с кабинетом, счета к оплате и черновики, ждущие подтверждения скидки (reception, head_doctor) |
| `GET/POST /api/invoices/{id}/payments` | список и приём оплат |
| `GET/POST /api/refund-requests` | список и создание заявок на возврат; `?mine=true` — только заявки текущего сотрудника (вкладка «Мои заявки») |

**Может.** Создавать пациентов; читать пациентов, историю, прейскурант; создавать приёмы; читать расписание; отменять/переносить любые приёмы; править ФИО, ИИН, дату рождения, пол, телефон, адрес, группу крови пациента; создавать и выставлять счета, отменять счета в статусах `draft`/`unpaid`; принимать оплату; создавать заявки на возврат; открывать/закрывать свою смену и смотреть отчёт по ней.

**Нельзя (403 или отсутствует).** Начинать/завершать приём и заполнять осмотр (`status`, жалобы, объективный статус, диагноз, назначения → 403); читать витальные показатели и прививки (`/health-metrics`, `/vaccinations`) и форму осмотра (`/examination`); МКБ-10; статистику недели; создавать/править услуги; подтверждать скидку; решать по возврату; чужие смены и их отчёты; дневной отчёт; править профиль врача (404). Удалять что-либо нельзя нигде.

### 3.2 doctor — Врач

**Кто и за что отвечает.** Ведёт приём: начинает и завершает приём, заполняет осмотр, ставит диагноз по МКБ-10, назначает препараты (свободным текстом), отменяет/переносит **свои** приёмы, ведёт свой профиль и график.

**Страницы.** `/`, `/appointments`, `/queue`, `/patients`, `/patients/[id]` (все 4 вкладки), `/patients/[id]/examination`, `/profile`. На дашборде — виджеты расписания и «Статистика недели».

**API.**

| Метод и путь | Что делает |
|---|---|
| `GET /api/appointments*` (список, week, today, queue, current) | расписание и очередь |
| `GET /api/appointments/stats/week` | статистика недели (только `doctor`/`head_doctor`) |
| `GET /api/appointments/queue-info`, `POST /api/appointments` | подсказка очереди и запись (к любому врачу) |
| `PATCH /api/appointments/{id}` | осмотр (жалобы, объективный статус, диагнозы, назначения, `durationMinutes`), смена статуса (`in_progress`/`completed`/…); отмена/перенос — только свой приём |
| `GET /api/employees?role=doctor` | список врачей |
| `GET /api/employees/me/profile`, `PATCH /api/employees/me` | свой профиль: `about`, `phone`, `email`, график |
| `GET /api/patients`, `POST /api/patients`, `GET /api/patients/{id}` | картотека, создание |
| `GET /api/patients/{id}/history`, `/visit-history`, `/health-metrics`, `/vaccinations`, `/examination` | медицинские данные пациента |
| `GET /api/icd10?q=` | поиск диагноза |
| `GET /api/search?q=` | поиск |

**Может.** Создавать пациентов и приёмы; заполнять осмотр **любого** приёма (проверки «приём назначен этому врачу» для осмотра/смены статуса в коде нет); отменять/переносить только приёмы, где `appointment.employee_id == свой id`; править свой профиль.

**Нельзя.** Править демографию пациента (`PATCH /patients/{id}` → 403); отменять/переносить чужие приёмы; счета, оплаты, смены, возвраты, отчёты (403); создавать услуги.

### 3.3 nurse — Медсестра

**Кто и за что отвечает.** Клинический персонал с доступом на чтение; в реализованном коде никаких операций записи, кроме общих (смена пароля), у роли нет. Работа со складом/процедурами (по планам) не реализована.

**Страницы.** `/`, `/appointments` (просмотр), `/queue` (просмотр), `/patients`, `/patients/[id]` (все 4 вкладки), `/profile`. Форма записи на `/appointments` в UI не скрыта, но её запросы (`/employees?role=doctor`, `POST /appointments`) вернут 403.

**API.** `GET /api/appointments`, `/week`, `/today`, `/queue`, `/current`; `GET /api/patients`, `/patients/{id}`, `/patients/{id}/history`, `/visit-history`, `/health-metrics`, `/vaccinations`; `POST /api/patients`; `GET /api/search`; `GET /api/services`.

**Может.** Читать расписание, очередь, карточки пациентов, историю, витальные показатели, прививки; создавать пациентов.

**Нельзя.** Записывать на приём (403); `PATCH /appointments/{id}` (403); осмотр, МКБ-10, статистика недели; правка демографии; счета/оплаты/смены/возвраты/отчёты; управление услугами.

### 3.4 accountant — Бухгалтер

**Кто и за что отвечает.** Роль объявлена в `EmployeeRole`, но **бухгалтерского функционала в коде нет** (раздел 9). Фактически у роли только доступ к картотеке.

**Страницы.** В меню: «Дашборд» (заглушка «Рабочее пространство для вашей роли появится на следующих этапах»), «Пациенты», «Профиль». Открыв `/patients/[id]`, страница дополнительно запрашивает `GET /patients/{id}/history`, который для `accountant` возвращает 403, поэтому по коду карточка пациента для этой роли завершается ошибкой (отлавливается только 404).

**API.** `GET /api/patients`, `POST /api/patients`, `GET /api/patients/{id}`, `GET /api/search`.

**Может.** Искать пациентов, читать список/карточку, создавать пациента. Ответ `GET /patients*` включает аллергии и хронические диагнозы (это поля общей сериализации, ограничения для роли на них нет).

**Нельзя.** Всё остальное: приёмы, история, витальные, прейскурант (`/services` → 403), счета, оплаты, смены, возвраты, отчёты, МКБ-10. Расходов, зарплат, склада, поступлений, выплат — не существует.

### 3.5 head_doctor — Главный врач

**Кто и за что отвечает.** Врач + руководитель: объединение прав врача и регистратуры + исключительные права утверждения (скидки, возвраты), управление прейскурантом, дневной отчёт, все кассовые смены. Имеет `doctor_profile`, ведёт приём.

**Страницы.** Все пункты меню: `/`, `/appointments`, `/queue`, `/patients`, `/patients/[id]`, `/patients/[id]/examination`, `/services`, `/cash-register`, `/refunds`, `/reports/daily`, `/profile`, а также `/invoices/[id]`, `/invoices/[id]/receipt`.

**API.** Все эндпоинты `reception` и `doctor`, плюс:

| Метод и путь | Что делает |
|---|---|
| `POST /api/services`, `PATCH /api/services/{id}` | создание/правка услуги (в т. ч. `isActive`) |
| `POST /api/invoices/{id}/approve-discount` | подтверждение скидки выше порога (только draft) |
| `POST /api/refund-requests/{id}/approve`, `/reject` | решение по заявке на возврат |
| `GET /api/reports/daily?date=` | дневной отчёт клиники |
| `GET /api/cash-shifts` (все смены), `POST /api/cash-shifts/{id}/close`, `GET /api/cash-shifts/{id}/report` | любые смены |
| `PATCH /api/appointments/{id}` | осмотр + отмена/перенос **любого** приёма |
| `PATCH /api/patients/{id}` | правка демографии |

**Может.** Всё перечисленное выше; создавать счета и оплаты наравне с регистратурой.

**Нельзя.** Сотрудников создавать/увольнять/редактировать (эндпоинтов нет); читать журнал аудита (эндпоинта нет); склад/зарплаты/расходы (нет в коде). Запрета «подтверждать скидку/возврат, созданные тобой же» в коде нет (проверки `approver != creator` отсутствуют).

### 3.6 admin — Администратор

**Кто.** Роль есть в enum и в `seed.py`. Единственный бизнес-доступ — прейскурант: `admin` читает и ведёт услуги (`/api/services`), остальные бизнес-эндпоинты её не допускают. Может войти, получить `/auth/me`, `/employees/me`, сменить пароль.

**Страницы.** `/` (заглушка), `/services` (создание и правка услуг), `/profile`. Все остальные страницы показывают «недоступно для вашей роли». `/patients` для `admin` недоступен (не входит в `ANY_STAFF_ROLES`).

**Нельзя.** Любые операции с пациентами, приёмами, деньгами. Функций администрирования (пользователи, миграции, отладка) в коде нет.

---

## 4. Матрица доступов

Обозначения: **C**reate, **R**ead, **U**pdate, **D**elete; «—» нет доступа; в скобках — условие. Удаления (D) в системе не реализованы ни для одной сущности — деактивация/отмена выполняется сменой статуса.

| Сущность / действие | reception | doctor | nurse | accountant | head_doctor | admin |
|---|---|---|---|---|---|---|
| **Пациенты** — демография (`/patients`) | C R U | C R | C R | C R | C R U | — |
| Пациенты — аллергии, хронические диагнозы (поля в ответе `GET /patients*`) | R | R | R | R | R | — |
| Пациенты — история приёмов (`/history`, `/visit-history`) | R | R | R | — | R | — |
| Пациенты — витальные, прививки (`/health-metrics`, `/vaccinations`) | — | R | R | — | R | — |
| Пациенты — запись медданных (аллергии, прививки, витальные, госпитализации) | нет эндпоинтов | нет | нет | нет | нет | нет |
| Глобальный поиск (`/search`) | R | R | R | R | R | — |
| **Приёмы** — расписание/очередь | R | R | R | — | R | — |
| Приёмы — создание | C | C | — | — | C | — |
| Приёмы — перенос/отмена | U (любые) | U (свои) | — | — | U (любые) | — |
| Приёмы — смена статуса, осмотр | — | U (любые приёмы) | — | — | U (любые) | — |
| Приёмы — статистика недели | — | R | — | — | R | — |
| **Осмотры** (форма, назначения) | — | R U | — | — | R U | — |
| МКБ-10 (справочник) | — | R | — | — | R | — |
| **Препараты / склад** | нет сущностей | нет | нет | нет | нет | нет |
| Назначения (`prescriptions`, свободный текст) | — | C R U D (полная замена списка внутри осмотра) | — | — | C R U D (то же) | — |
| **Услуги** (прейскурант) | R | — | — | — | C R U (D = `isActive=false`) | C R U (D = `isActive=false`) |
| **Счета** | C R U (позиции draft, выставить, отмена) | — | — | — | C R U + подтверждение скидки | — |
| **Платежи** | C R (append-only: U/D нет) | — | — | — | C R | — |
| **Заявки на возврат** | C R | — | — | — | C R + решение (approve/reject) | — |
| **Кассовые смены** | C U R (свои) | — | — | — | C U R (все) | — |
| **Отчёты** — по смене | R (своя) | — | — | — | R (любая) | — |
| Отчёты — дневной по клинике | — | — | — | — | R | — |
| **Зарплаты** (расчёт, выплата) | нет эндпоинтов | нет | нет | нет | нет | нет |
| **Сотрудники** — список врачей для записи | R | R | — | — | R | — |
| Сотрудники — собственная карточка | R | R | R | R | R | R |
| Сотрудники — собственный профиль врача, график | — | R U | — | — | R U | — |
| Сотрудники — найм/увольнение/правка чужих | нет эндпоинтов | нет | нет | нет | нет | нет |
| Журнал аудита (просмотр) | нет эндпоинта | нет | нет | нет | нет | нет |

Подробно по эндпоинтам (источник — `tests/test_rbac_matrix.py` и роутеры):

| Эндпоинт | Роли |
|---|---|
| `GET /api/appointments` (в т.ч. `?patientId=&status=&completedWithin=`), `/week`, `/queue`, `/today`, `/current` | reception, doctor, nurse, head_doctor |
| `GET /api/appointments/stats/week` | doctor, head_doctor |
| `GET /api/appointments/queue-info`, `POST /api/appointments` | reception, doctor, head_doctor |
| `PATCH /api/appointments/{id}` | reception, doctor, head_doctor (+ проверки в теле, см. 6.2) |
| `GET /api/patients`, `POST /api/patients`, `GET /api/patients/{id}`, `GET /api/search` | reception, doctor, nurse, accountant, head_doctor |
| `PATCH /api/patients/{id}` | reception, head_doctor |
| `GET /api/patients/{id}/history`, `/visit-history` | reception, doctor, nurse, head_doctor |
| `GET /api/patients/{id}/health-metrics`, `/vaccinations` | doctor, nurse, head_doctor |
| `GET /api/patients/{id}/examination`, `GET /api/icd10` | doctor, head_doctor |
| `GET /api/employees?role=doctor` | reception, doctor, head_doctor |
| `GET /api/employees/me`, `/me/profile`, `PATCH /api/employees/me` | любая активная роль (профиль — 404 без `doctor_profile`) |
| `GET /api/services` | reception, head_doctor, admin |
| `POST /api/services`, `PATCH /api/services/{id}` | head_doctor, admin |
| `GET/POST /api/cash-shifts`, `/current`, `POST /{id}/close` | reception, head_doctor (чужая смена — только head_doctor) |
| `GET /api/cash-shifts/{id}/report` | reception (своя смена), head_doctor |
| `GET/POST /api/invoices` (список с фильтрами `status`, `appointmentId`, `from`/`to`, `limit`/`offset`), `GET /{id}`, `PATCH /{id}/items`, `POST /{id}/issue`, `/cancel`, `GET/POST /{id}/payments` | reception, head_doctor |
| `POST /api/invoices/{id}/approve-discount` | head_doctor |
| `GET/POST /api/refund-requests` (`?mine=true`) | reception, head_doctor |
| `POST /api/refund-requests/{id}/approve`, `/reject` | head_doctor |
| `GET /api/reports/daily` | head_doctor |
| `GET /api/reports/reception-summary` | reception, head_doctor |

---

## 5. Модели данных

Всего 22 таблицы (PostgreSQL). Миграции — `back/alembic/versions/`. Внешние ключи на уровне БД без `ON DELETE`; каскады — только ORM (`cascade="all, delete-orphan"`), но удаляющих эндпоинтов нет (кроме замены назначений в приёме). CHECK-ограничений и триггеров в миграциях нет.

### 5.1 Персонал и доступ

**`employees`** — сотрудник (единая сущность для всех ролей)
| Поле | Тип | Ограничения |
|---|---|---|
| id | int PK | |
| full_name | varchar(200) | NOT NULL |
| first_name_patronymic | varchar(100) | NOT NULL (для приветствия на дашборде) |
| short_name | varchar(50) | NOT NULL |
| initials | varchar(10) | NOT NULL |
| role | enum `employee_role` | NOT NULL: reception, doctor, nurse, accountant, head_doctor, admin |
| position_title | varchar(100) | NULL |
| phone | varchar(20) | NULL |
| email | varchar(100) | NULL |
| hired_at | date | NOT NULL |
| fired_at | date | NULL |
| status | enum `employee_status` | NOT NULL, default `active`: active, on_leave, fired |
| salary_type | enum `salary_type` | NOT NULL, default `fixed`: fixed, percent, fixed_plus_percent |
| base_salary | int | NULL |
| revenue_percent | numeric(5,2) | NULL |
| branch_id | int | NULL, **без FK** (задел) |

**`users`** — учётная запись
| id PK | email varchar(200) UNIQUE NOT NULL | full_name varchar(200) NOT NULL | password_hash varchar(200) NOT NULL (bcrypt) | employee_id FK→employees.id UNIQUE NOT NULL | must_change_password bool NOT NULL default false |

**`refresh_tokens`** — id PK; user_id FK→users.id NOT NULL; token_hash varchar(255) UNIQUE NOT NULL (sha256); expires_at timestamp NOT NULL; revoked_at timestamp NULL; user_agent varchar(300) NULL; ip varchar(64) NULL; created_at timestamp default now().

**`audit_log`** — id PK; actor_user_id FK→users.id NULL; entity_type varchar(50) NOT NULL; entity_id int NULL; action varchar(50) NOT NULL; changes JSONB NULL; ip varchar(64) NULL; created_at default now().

**`doctor_profiles`** — id PK; employee_id FK→employees.id UNIQUE NOT NULL; specialty, qualification_category, office, workplace, license_number, license_valid_until, certificate_number, certificate_valid_until, about (до 1000), experience_years (int) — все NULL.

**`doctor_education`** — id PK; doctor_profile_id FK→doctor_profiles.id (index); year varchar(4); title varchar(300); description varchar(500).

**`schedules`** — график врача по дням: id PK; employee_id FK→employees.id (index); day_id varchar(10) (`mon`…`sun`); label varchar(100); enabled bool; start, end varchar(10) (`HH:MM`).

### 5.2 Пациенты и медицинские данные

**`patients`** — id PK; iin varchar(12) **UNIQUE** NOT NULL; full_name varchar(200); birth_date date; gender varchar(1) (значения «М»/«Ж» в данных); phone varchar(20) NULL; short_name varchar(50) NOT NULL (генерируется бэкендом: «Фамилия И.О.»); address varchar(300) NULL; blood_type varchar(20) NULL; dispensary bool default false; updated_at timestamp NULL; updated_by_id FK→employees.id NULL.

**`patient_diseases`** — id PK; patient_id FK→patients.id (index); label varchar(100); variant enum `disease_tag_variant` (green, purple, red, blue, yellow, orange — цвет тега).

**`patient_allergies`** — id PK; patient_id FK→patients.id (index); name varchar(100).

**`vaccinations`** — id PK; patient_id FK (index); name varchar(200); date date; dose varchar(50) NULL (в данных хранится «препарат, серия N»; сериализатор разбивает по `", серия "`); notes varchar(300) NULL.

**`hospitalizations`** — id PK; patient_id FK (index); employee_id FK→employees.id (index); department varchar(200); ward varchar(100) NULL; bed varchar(50) NULL; admitted_at date; primary_diagnosis varchar(300) NULL. Наличие записи переключает `careType` пациента в `inpatient`.

**`health_metrics`** — id PK; patient_id FK (index); label varchar(100) («Рост», «Вес»); value varchar(100) («168 см»); date date; note varchar(200) NULL.

### 5.3 Приёмы

**`appointments`** — id PK; date date (index); queue_number int NOT NULL (номер пациента у врача на день, UNIQUE с employee_id+date); time varchar(5) NULL (устарело, не используется); started_at timestamp NULL (когда врач нажал «Начать»); complaint text; status enum `appointment_status` default `scheduled`; diagnosis_code varchar(20) NULL; diagnosis_name varchar(200) NULL; objective_status text NULL; duration_minutes int NULL; patient_id FK→patients.id; employee_id FK→employees.id (лечащий врач); created_by_id FK→employees.id NULL; cancelled_at timestamp NULL; cancelled_by_id FK→employees.id NULL; cancellation_reason varchar(300) NULL (текст — только для кода `other`); cancellation_reason_code enum `cancellation_reason_code` NULL (patient_cancelled, patient_no_contact, doctor_unavailable, rescheduled, other; у отменённых до появления справочника проставлен `other`, новые отмены без кода API отвергает); completed_at timestamp NULL (момент завершения приёма; для старых завершённых заполнен как «дата + время + длительность»). **Уникальности (врач, дата, время) в БД нет** — конфликт проверяется кодом.

**`prescriptions`** — id PK; appointment_id FK→appointments.id (index); medication varchar(200); dosage varchar(200); frequency varchar(200) (в API называется `duration`). Свободный текст, связи с каким-либо справочником препаратов нет.

### 5.4 Касса

**`services`** — id PK; code varchar(50) UNIQUE; name varchar(300); category enum `service_category` (consultation, procedure, analysis, other); price bigint (тиыны); duration_minutes int NULL; is_active bool default true.

**`cash_shifts`** — id PK; cashier_employee_id FK→employees.id; opened_at timestamp default now(); opening_balance bigint; closed_at NULL; actual_cash bigint NULL; status enum `cash_shift_status` (open, closed) default open. **Частичный уникальный индекс** `ix_cash_shifts_one_open_per_cashier` (по `cashier_employee_id` где `status='open'`): одна открытая смена на кассира. Ожидаемая касса и расхождение не хранятся — считаются в отчёте.

**`invoice_number_counters`** — year int PK; last_number int. Атомарный годовой счётчик номеров (`INSERT … ON CONFLICT … RETURNING` в той же транзакции, что и создание счёта).

**`invoices`** — id PK; invoice_number varchar(20) UNIQUE (формат `YYYY-NNNNNN`); patient_id FK→patients.id NOT NULL; appointment_id FK→appointments.id NULL; status enum `invoice_status` (draft, unpaid, partial, paid, refunded, cancelled) default draft; subtotal, discount_total, total bigint default 0; discount_approved_by_id FK→employees.id NULL; discount_approved_at NULL; created_by_id FK→employees.id NOT NULL; created_at default now(); cancelled_at NULL; cancelled_by_id FK→employees.id NULL; cancellation_reason varchar(300) NULL.

**`invoice_items`** — id PK; invoice_id FK→invoices.id NOT NULL; service_id FK→services.id NOT NULL; name_snapshot varchar(300); price_snapshot bigint (замороженные название и цена); quantity int default 1; discount_amount bigint default 0; line_total bigint; performer_employee_id FK→employees.id NULL (в коде нигде не заполняется).

**`payments`** — id PK; invoice_id FK→invoices.id NOT NULL; amount bigint (**отрицательная = возврат**); method enum `payment_method` (cash, card, transfer); cash_shift_id FK→cash_shifts.id NULL (заполняется только у наличных); created_by_id FK→employees.id NOT NULL; created_at default now(); reversal_of_payment_id FK→payments.id NULL (самоссылка, у возврата — на исходный платёж); refund_reason varchar(300) NULL; approved_by_id FK→employees.id NULL. Таблица «append-only» обеспечена отсутствием маршрутов PATCH/DELETE, а не триггером БД.

**`refund_requests`** — id PK; invoice_id FK→invoices.id; payment_id FK→payments.id; amount bigint; reason varchar(300) NOT NULL; requested_by_id FK→employees.id; status enum `refund_request_status` (pending, approved, rejected) default pending; created_at default now(); decided_by_id FK→employees.id NULL; decided_at NULL; resulting_payment_id FK→payments.id NULL (созданный отрицательный платёж).

### 5.5 Связи между сущностями (словами)

- Пользователь (`User`) 1—1 сотрудник (`Employee`); у пользователя 1—N refresh-токенов; пользователь 1—N записей аудита (как исполнитель).
- Сотрудник 1—0..1 профиль врача (`DoctorProfile`); профиль врача 1—N записей образования; сотрудник 1—N строк графика (`Schedule`).
- Пациент 1—N приёмы; 1—N хронические заболевания; 1—N аллергии; 1—N прививки; 1—N госпитализации; 1—N витальные показатели; 1—N счета.
- Сотрудник (врач) 1—N приёмы (как лечащий); сотрудник 1—N приёмы (как создавший); сотрудник 1—N приёмы (как отменивший); сотрудник 1—N госпитализации (лечащий).
- Приём 1—N назначения (`Prescription`); приём 0..1—N счета (связь `Invoice.appointment_id` опциональна; при создании счёта по приёму бэкенд проверяет, что приём принадлежит тому же пациенту).
- Счёт 1—N позиции (`InvoiceItem`); позиция N—1 услуга (`Service`); позиция N—0..1 исполнитель (поле не используется).
- Счёт 1—N платежи; платёж N—0..1 кассовая смена; платёж 0..1—1 исходный платёж (сторно, самоссылка).
- Счёт 1—N заявки на возврат; заявка N—1 платёж; заявка 0..1—1 результирующий платёж.
- Кассовая смена N—1 сотрудник-кассир.
- Счёт: создавший, подтвердивший скидку, отменивший — три ссылки на сотрудника; платёж: создавший и подтвердивший возврат; заявка: запросивший и решивший.
- Пациент N—0..1 сотрудник (кто последним правил демографию, `updated_by_id`).

---

## 6. Бизнес-процессы

### 6.1 Регистрация пациента и запись на приём

| Шаг | Роль | Действие | Эндпоинт |
|---|---|---|---|
| 1 | reception (также любая из doctor, nurse, accountant, head_doctor) | Ищет пациента по ИИН/ФИО. На дашборде регистратуры форма «ИИН»: запрашивается список с `search=ИИН`, точное совпадение по ИИН среди первых 5 результатов → показывается пациент со ссылкой на карточку | `GET /api/patients?search=&limit=5` |
| 2 | то же | Не найден → модалка создания с подставленным ИИН: ФИО, ИИН, дата рождения, пол, телефон, адрес, группа крови, «диспансерный учёт» | `POST /api/patients` |
| 3 | backend | Дубликат ИИН → `409 «Пациент с таким ИИН уже существует»`; `short_name` строится из ФИО («Фамилия И.О.»). Формат ИИН не валидируется (только уникальность и длина колонки 12) | |
| 4 | reception / doctor / head_doctor | Форма записи (одна на стойку, карточку пациента, блок «Вышли от врача» и `/appointments`): пациент (подставлен или поиск **на сервере** по ФИО/ИИН от 2 символов, `limit=8`), врач (по умолчанию врач с тем же `area`, при «Записать повторно» — врач прежнего приёма; можно сменить), дата, время — свободный слот **или введённое вручную** («Другое время…»), жалоба (обязательна). Если на выбранную дату слотов нет, дата по умолчанию сама сдвигается на ближайший день со слотами (выбранную вручную не трогает), ближайшие дни показаны кнопками; уже прошедшие слоты за сегодня не предлагаются. После записи окно остаётся: «Записать ещё одного» (пациент и жалоба сброшены, врач и дата сохранены) или «Готово» | `GET /api/employees?role=doctor`, `GET /api/patients?search=`, `GET /api/appointments/available-slots`, `POST /api/appointments` |
| 5 | backend | Проверки при создании: пациент существует (404); врач существует, `status=active` и имеет `doctor_profile` (404 «Врач не найден»); в этот день недели у врача включён график и время `start <= time < end` (иначе 400); нет другого **неотменённого** приёма у врача на ту же дату/время (409 «На это время уже есть приём»); создаётся приём `scheduled`, `created_by_id` = текущий сотрудник | |
| 6 | reception, head_doctor (врач — свои) | Перенос (окно «Перенос приёма» — одно на стойку, очередь, список): новая `date`/`time` и, при необходимости, **другой врач** (`employeeId`: активный клиницист, его график и конфликт проверяются заново; приём сам себе конфликтом не считается). Только для приёма в статусе `scheduled` (иначе 409) | `PATCH /api/appointments/{id}` |
| 7 | reception, head_doctor (врач — свои) | Отмена (окно «Отмена приёма»): подтверждение и **обязательная причина из справочника** — `patient_cancelled` пациент отменил, `patient_no_contact` не дозвонились, `doctor_unavailable` врач не принимает, `rescheduled` перенос, `other` другое (тогда обязателен текст до 300 символов). Без кода — 422. Текст сохраняется только для `other`. Только из `scheduled` (иначе 409). Пишутся `cancelled_at`, `cancelled_by_id` | `PATCH /api/appointments/{id}` |

*(Устарело: время слотов заменено номером в очереди — см. раздел «Изменения: номер в очереди вместо времени».)* Слоты: сетка с шагом 30 минут по графику врача на день недели; из неё исключаются времена, занятые приёмами, **кроме отменённых** — и запись, и перенос теперь тоже не считают отменённый приём конфликтом (раньше слот предлагался, а сервер отвечал 409). Если график на этот день не включён — пустой список. Время вручную («Другое время…») не обязано лежать на сетке: бэкенд проверяет только рабочие часы врача и занятость.

### 6.1а Стойка регистратуры (`/`, роль reception)

Один экран, сводка приходит одним запросом `GET /api/reports/reception-summary`, обновляется каждые 30 секунд.

1. **«Кто у стойки».** Поле ИИН или фамилии (автофокус, Enter, Esc очищает): 12 цифр — точный поиск по ИИН, иначе поиск по ФИО (до 5 совпадений списком). Найденный пациент: возраст, последний *завершённый* визит (дата · врач; из `/history`), **ближайший приём** — первый неотменённый приём пациента с сегодняшней даты (`GET /api/appointments?patientId=&status=scheduled,in_progress&from=сегодня`): «Записан на 26 окт, 09:00 · врач · каб. 3». Кнопки: «Записать», «Перенести» и «Отменить» (только если ближайший приём `scheduled`), «Карточка». Не найден — «Завести карточку»: создание пациента и сразу запись, без перехода на карточку.
2. **«Вышли от врача».** Приёмы, завершённые за последние 2 часа, по всем врачам (`completedWithin=120`; момент завершения — `completed_at`, при его отсутствии — начало + длительность). В строке: время завершения, пациент, врач; «Записать повторно» (тот же врач, дата через неделю) и «Выставить счёт» (создаёт счёт с `appointment_id` этого приёма) либо ссылка «Счёт №…», если неотменённый счёт по приёму уже есть. Пусто — «Пока никто не завершил приём». Показывается 3 строки, остальное — «и ещё N».
3. **Метрики:** ждут приёма (`scheduled` сегодня), на приёме, не оплачено (`unpaid`+`partial`), «В кассе» — принято за открытую смену всеми способами (возвраты вычтены); без открытой смены — «—».
4. **«Врачи сейчас»** (врач, кабинет, на приёме/свободен, сколько ждут) и **«Ждут оплаты»** (счета `unpaid`/`partial` с остатком; черновики со скидкой выше порога, ждущие главврача, помечены «ждёт главврача» — выставить такой счёт нельзя, поэтому это бывает только у черновика).

### 6.2 Живая очередь и ход приёма

1. **Очередь** (`/queue`, `GET /api/appointments/queue`): все приёмы **на сегодня** по всем врачам со статусами `scheduled` и `in_progress`, сортировка по времени. Видят reception, doctor, nurse, head_doctor.
2. **«Начать»** (`doctor`, `head_doctor`): `PATCH /api/appointments/{id}` `{status: "in_progress"}`. Побочный эффект: прочие приёмы **того же врача на ту же дату** со статусом `in_progress` автоматически возвращаются в `scheduled`.
3. **«Осмотр»**: ссылка на `/patients/{patientId}/examination` (см. 6.3).
4. **«Завершить»** (`doctor`, `head_doctor`): `PATCH {status: "completed"}`; если у приёма не задана `duration_minutes`, ставится значение из тела запроса, а если его нет — **18 минут**; проставляется `completed_at` (часы БД).
5. **Отмена/перенос** прямо в очереди и в списке приёмов — `AppointmentActions`, который открывает те же окна «Отмена приёма» и «Перенос приёма», что и стойка (кнопки показываются для `reception`/`head_doctor` и для `doctor` на своём приёме и **только у запланированных приёмов**; у `in_progress`, `completed`, `cancelled` скрыты).
6. Дашборд: «Текущий приём» — первый приём **за сегодня** со статусом `in_progress` среди всех врачей (`GET /api/appointments/current`).

Допустимые переходы статусов приёма — в разделе 7.1.

### 6.3 Осмотр врачом (МКБ-10, назначения, заключение)

| Шаг | Роль | Действие | Эндпоинт |
|---|---|---|---|
| 1 | doctor, head_doctor | Открывает `/patients/{id}/examination`. Backend ищет «активный приём» пациента: сначала самый поздний `in_progress` (по дате/времени), иначе сегодняшний `scheduled`; нет → 404 «Активный приём не найден» | `GET /api/patients/{id}/examination` |
| 2 | doctor, head_doctor | Заполняет «Жалобы», «Объективный статус» | |
| 3 | doctor, head_doctor | Диагноз: поиск по коду или названию (с 2 символов, задержка 250 мс) в локальном справочнике, максимум 10 результатов; можно добавить несколько (без дублей по коду) | `GET /api/icd10?q=` |
| 4 | doctor, head_doctor | Назначения: строки «Препарат / Дозировка / Длительность» (текст) | |
| 5 | doctor, head_doctor | «Сохранить черновик» → `status=in_progress`; «Завершить приём» → `status=completed` | `PATCH /api/appointments/{id}` |

Что делает backend при сохранении осмотра:
- в приём записывается **только первый диагноз** из списка (`diagnosis_code`, `diagnosis_name`); остальные теряются; пустой список очищает диагноз;
- список назначений **полностью заменяется** (старые удаляются, строки с пустым названием препарата пропускаются), поле «Длительность» сохраняется в колонку `frequency`;
- при `completed` без длительности ставится 18 минут; `PATCH` с полями осмотра разрешён только `doctor`/`head_doctor` (иначе 403), при этом проверки, что приём принадлежит именно этому врачу, нет;
- «Сохранить черновик» (`in_progress`) на ещё `scheduled` приёме переводит его в `in_progress` и сбрасывает другие `in_progress` того же врача на этот день.

В карточке осмотра справа: сведения о пациенте и последние 5 визитов (`GET /api/patients/{id}/visit-history`, роли reception/doctor/nurse/head_doctor).

### 6.4 Выставление счёта и оплата

| Шаг | Роль | Действие | Эндпоинт |
|---|---|---|---|
| 1 | reception, head_doctor | В карточке пациента «Выставить счёт»: выбор активных услуг и количества, общая скидка (в ₸) | `GET /api/services`, `POST /api/invoices` |
| 2 | backend | Создаётся счёт `draft` с номером `YYYY-NNNNNN` (годовой счётчик); позиции берут `name_snapshot`/`price_snapshot` из прейскуранта; пересчёт `subtotal`, `discount_total`, `total` на сервере, клиентским итогам не доверяет. Ошибки: услуга неактивна/не найдена → 404; скидка на строку > её суммы → 400; общая скидка > суммы → 400 | |
| 3 | reception, head_doctor | «Выставить» | `POST /api/invoices/{id}/issue` |
| 4 | backend | Только из `draft`; без позиций → 400; если суммарная скидка (построчные + общая) от полной цены **строго больше** порога (по умолчанию 10 %) и скидка не подтверждена → `403 «Скидка выше порога — нужно подтверждение главврача»`; иначе `draft → unpaid` | |
| 4a | head_doctor | Подтверждает скидку (кнопка появляется у заблокированного счёта) | `POST /api/invoices/{id}/approve-discount` |
| 5 | reception, head_doctor | Принимает оплату: сумма (₸ → тиыны), способ (нал / карта / перевод). Несколько последовательных платежей на один счёт допустимы (частичная оплата). Форма смешанного платежа отсутствует | `POST /api/invoices/{id}/payments` |
| 6 | backend | Счёт должен быть `unpaid` или `partial` (иначе 409); `уже оплачено + сумма > total` → `409 «Сумма оплаты превышает остаток по счёту»`; для способа `cash` нужна **открытая смена этого же кассира** (иначе 409 «Нет открытой кассовой смены»), платёж привязывается к смене; затем статус счёта пересчитывается из суммы всех платежей | |
| 7 | reception, head_doctor | Печать квитанции `/invoices/{id}/receipt` (кнопка «Квитанция» для всех счетов, кроме draft; `window.print()`) | `GET /api/invoices/{id}`, `GET /api/invoices/{id}/payments` |
| 8 | reception, head_doctor | Отмена счёта (только `draft`/`unpaid`) с причиной (поле в API необязательно) | `POST /api/invoices/{id}/cancel` |

Редактирование позиций существующего черновика есть в API (`PATCH /api/invoices/{id}/items`, только в `draft`, сбрасывает подтверждение скидки), но в UI кнопки нет: из интерфейса черновик можно только выставить или отменить. Список счетов (`GET /api/invoices`) в UI тоже не используется — счёт открывается по ссылке после создания.

### 6.5 Возврат денег

| Шаг | Роль | Действие | Эндпоинт |
|---|---|---|---|
| 1 | reception, head_doctor | В карточке счёта у платежа (amount > 0) «Заявка на возврат»: сумма и причина | `POST /api/refund-requests` |
| 2 | backend | Платёж должен существовать и быть положительным (иначе 404); `сумма одобренных возвратов по платежу + новая сумма > сумма платежа` → 400. Создаётся заявка `pending` | |
| 3 | head_doctor | Очередь `/refunds` (по умолчанию фильтр «Только на рассмотрении») | `GET /api/refund-requests?status=` |
| 4a | head_doctor | Одобрить | `POST /api/refund-requests/{id}/approve` |
| 4b | head_doctor | Отклонить | `POST /api/refund-requests/{id}/reject` |

При одобрении: заявка должна быть `pending` (иначе 409). Для возврата **наличных** нужна открытая смена **у одобряющего** (т. е. у head_doctor), иначе 409. Создаётся новый отрицательный `Payment` (`amount = −сумма заявки`, тот же способ, что у исходного, `reversal_of_payment_id`, `refund_reason`, `approved_by_id`), статус счёта пересчитывается, заявка получает `approved`, `decided_by_id/at`, `resulting_payment_id`. Исходный платёж не меняется. Отклонение лишь ставит `rejected` и данные решения, платежей не создаёт.

### 6.6 Кассовая смена и отчёты

1. **Открытие** (`reception`, `head_doctor`): `POST /api/cash-shifts {openingBalance ≥ 0}`; вторая открытая смена у того же кассира → `409 «У вас уже есть открытая смена»` (ограничение — частичный уникальный индекс).
2. **Работа:** наличные платежи привязываются к открытой смене кассира.
3. **Закрытие:** `POST /api/cash-shifts/{id}/close {actualCash ≥ 0}`. Закрыть может владелец смены или `head_doctor`; уже закрытая → 409. Время закрытия берётся из часов БД.
4. **Отчёт по смене** `GET /api/cash-shifts/{id}/report` (владелец или head_doctor): учитываются платежи, созданные **кассиром смены** в интервале `[opened_at; closed_at или сейчас]` (все способы оплаты, не только привязанные по `cash_shift_id`). Выдаёт `cashTotal`, `cardTotal`, `transferTotal` (суммы с учётом отрицательных возвратов), `refundsTotal` (модуль возвратов), `paymentsCount`, `expectedCash = openingBalance + cashTotal`, `discrepancy = actualCash − expectedCash` (если смена закрыта).
5. **История смен** (`/cash-register`): reception видит свои, head_doctor — все; клик по смене показывает её отчёт.
6. **Дневной отчёт** `GET /api/reports/daily?date=` (только head_doctor, страница `/reports/daily`): все платежи за календарный день → суммы по способам, `total = cash + card + transfer` (с учётом возвратов), `refundsTotal`, `paymentsCount`, число затронутых счетов.

### 6.7 Прейскурант

`head_doctor` создаёт (`POST /api/services`: `code` уникален, `price > 0` в тиынах, категория, длительность) и правит (`PATCH`) услуги, включая переключение `isActive`. Удаления нет: неактивные услуги не попадают в выбор при создании счёта (`GET /api/services` по умолчанию возвращает активные; параметр `includeInactive=true` backend отдаёт любой роли, допущенной к чтению, а UI запрашивает его только для head_doctor). Изменение цены не влияет на уже выставленные позиции (снимок цены).

### 6.8 Профиль врача

`doctor`/`head_doctor` на `/profile` редактируют «О себе», телефон, email и график (включено/время по дням) — `PATCH /api/employees/me`; запись аудита `update_profile`. Метрики профиля считаются на лету: приёмы с начала месяца (ключ ответа исторически `appointmentsInMay`), стаж.

### 6.9 Поиск

`GET /api/search?q=` (все роли кроме admin): до 5 пациентов (по ФИО, краткому имени, ИИН) и до 5 приёмов (по ФИО пациента или тексту жалобы). `HeaderSearch` в шапке.

### 6.10 Процессы, которых в коде нет

Приход препаратов, списание препаратов на пациента, инвентаризация, учёт поступлений и выплат, расчёт и выплата зарплат, найм/увольнение сотрудников, админ-панель главврача — **не реализованы**, см. раздел 9.

---

## 7. Статусы и жизненные циклы

### 7.1 `AppointmentStatus`: scheduled, in_progress, completed, cancelled

Полной машины состояний на backend пока нет (в планах, раздел 9): `PATCH` принимает любое значение `status`, **кроме** отмены и переноса — они разрешены только из `scheduled` (иначе 409 «Отменить или перенести можно только запланированный приём»). Ниже — переходы, которые выполняет интерфейс.

| Из → в | Кто | Условия и побочные эффекты |
|---|---|---|
| (создание) → `scheduled` | reception, doctor, head_doctor | график врача, нет конфликта |
| `scheduled` → `in_progress` | doctor, head_doctor | «Начать» или «Сохранить черновик» осмотра; остальные `in_progress` этого врача на эту дату возвращаются в `scheduled` |
| `in_progress` → `completed` | doctor, head_doctor | «Завершить» или «Завершить приём»; длительность по умолчанию 18 мин; проставляется `completed_at` |
| `scheduled` → `cancelled` | reception, head_doctor (любой); doctor (свой) | обязателен код причины (для `other` — текст); пишутся `cancelled_at/by`, `cancellation_reason_code` |
| `scheduled` → `scheduled` (перенос) | reception, head_doctor (любой); doctor (свой) | новые `date`/`time`, возможно другой врач; проверка графика и конфликта (отменённые приёмы слот не держат) |

Отмена и перенос приёма в любом другом статусе (`in_progress`, `completed`, `cancelled`) — 409 и на backend, и кнопки в UI скрыты.

### 7.2 `InvoiceStatus`: draft, unpaid, partial, paid, refunded, cancelled

| Из → в | Триггер |
|---|---|
| (создание) → `draft` | `POST /invoices` |
| `draft` → `unpaid` | `issue` (если скидка выше порога — только при подтверждении head_doctor) |
| `draft`/`unpaid` → `cancelled` | `cancel` |
| `unpaid`/`partial` → `partial` | платёж меньше остатка |
| `unpaid`/`partial` → `paid` | суммарно оплачено ≥ `total` (больше `total` принять нельзя) |
| `partial`/`paid` → `refunded` | одобренный возврат, после которого чистая сумма платежей ≤ 0 |
| `paid` → `partial` | частичный одобренный возврат (чистая сумма > 0, но < `total`); после этого оплата снова принимается |

Статус после платежа/возврата всегда **пересчитывается** из суммы всех `Payment` счёта: ≤ 0 → `refunded`; < `total` → `partial`; иначе `paid`. Из `partial`/`paid` прямой отмены нет (409 «только через возврат»). Из `refunded` и `cancelled` оплата не принимается.

### 7.3 `RefundRequestStatus`: pending, approved, rejected

`pending` → `approved` (создаёт отрицательный платёж) или `rejected`; из конечных статусов переходов нет (409 «Заявка уже рассмотрена»).

### 7.4 `CashShiftStatus`: open, closed

`open` → `closed` (через `close`); обратно не открывается. Не более одной `open` на кассира.

### 7.5 `EmployeeStatus`: active, on_leave, fired

Переходов в коде нет (нет эндпоинтов изменения). Влияние значения: `fired` — запрещает вход, refresh и любые вызовы `get_current_employee`; `active` — обязателен, чтобы врача можно было выбрать для записи и увидеть в `GET /employees?role=doctor`; `on_leave` — отдельно нигде не обрабатывается (врач с `on_leave` не попадает в список для записи, вход разрешён).

### 7.6 Прочие перечисления

- `EmployeeRole`: reception, doctor, nurse, accountant, head_doctor, admin.
- `SalaryType`: fixed, percent, fixed_plus_percent (хранится у сотрудника; расчётов нет).
- `PaymentMethod`: cash, card, transfer.
- `ServiceCategory`: consultation, procedure, analysis, other.
- `DiseaseTagVariant`: green, purple, red, blue, yellow, orange (цвет тега заболевания).
- `Service.is_active`: true ⇄ false правит head_doctor (удаления нет).
- Refresh-токен: активен → `revoked_at` (при ротации или logout) либо истёк по `expires_at`.
- Скидка счёта: не подтверждена → подтверждена (`approve-discount`, только в `draft`) → сбрасывается при любой правке позиций (`PATCH .../items`).

---

## 8. Бизнес-правила и валидации

### 8.1 Деньги и счета
- Все суммы — целые тиыны. `price > 0` (услуга), `amount > 0` (платёж и заявка), `openingBalance ≥ 0`, `actualCash ≥ 0`, `quantity ≥ 1`, `discountAmount ≥ 0`, `discountTotal ≥ 0`.
- Итоги счёта считает сервер: `line_total = price × quantity − discount_amount` (≥ 0); `subtotal = Σ line_total`; `total = subtotal − discount_total` (≥ 0).
- Порог скидки: `(Σ discount_amount строк + discount_total) / Σ(price_snapshot × quantity) × 100 > DEFAULT_DISCOUNT_THRESHOLD_PERCENT` (10) — для выставления нужно подтверждение head_doctor. Порог — env-переменная, правка требует перезапуска.
- Любая правка позиций обнуляет `discount_approved_by/at`.
- Нумерация счетов `YYYY-NNNNNN` по году выставления, счётчик откатывается вместе с транзакцией.
- Цена и название позиции замораживаются в момент добавления (`price_snapshot`, `name_snapshot`).
- Платежи только добавляются: PATCH/DELETE у платежей нет; исправление — отрицательный платёж со ссылкой на исходный.
- Оплата сверх остатка запрещена; наличная оплата и наличный возврат требуют открытой смены текущего сотрудника.
- Возврат: нарастающим итогом по платежу не более его суммы (учитываются только **одобренные** возвраты; одновременно висящие `pending` заявки между собой не проверяются, при одобрении лимит повторно не проверяется).
- Разделение полномочий реализовано ролями (reception создаёт → head_doctor решает), но запрета «создал и сам же утвердил» для head_doctor нет.

### 8.2 Приёмы и расписание
- Врач для записи: `status=active` и есть `doctor_profile` (так head_doctor тоже попадает в список).
- *(Устарело, см. раздел «Изменения: номер в очереди вместо времени».)* Время приёма — строка `HH:MM`; проверка: график врача на день недели включён и `start <= time < end`. Принадлежность времени 30-минутной сетке при создании/переносе не проверяется (слоты предлагает только сетка).
- Конфликт: один врач — одна пара (дата, время), без учёта статуса; на уровне БД уникальности нет.
- Права внутри `PATCH /appointments/{id}`: поля осмотра и любой `status`, кроме `cancelled` → только doctor/head_doctor; отмена или перенос → reception, head_doctor или назначенный врач (и только из статуса `scheduled`); перенос к другому врачу (`employeeId`) — те же права, целевой врач должен быть активным клиницистом.
- При завершении без длительности — 18 минут (захардкожено).
- Статистика недели (`/stats/week`): неделя пн–сб; всего / завершено / отменено, новые пациенты (первый приём пациента попал на эту неделю), диспансерные (неотменённые приёмы диспансерных пациентов), средняя длительность завершённых.

### 8.3 Пациенты
- ИИН уникален (создание и правка, 409); `short_name` автоматически пересобирается при смене ФИО.
- `PATCH /patients/{id}` (reception, head_doctor) меняет только демографию и проставляет `updated_at`, `updated_by_id`. Поле `dispensary` в `PatientUpdateIn` отсутствует — после создания через API не меняется.
- «Тип помощи» (`careType`): `inpatient`, если у пациента есть запись `hospitalizations`, иначе `ambulatory`.
- Список пациентов: поиск по ФИО (подстрока, без учёта регистра) или ИИН; сортировка по ФИО; `limit` до 100.

### 8.4 Аутентификация
- Access-токен 15 минут, refresh 30 дней с ротацией; в БД только хеш refresh; уволенный сотрудник отсекается на каждом запросе.
- Пароли — bcrypt.

### 8.5 Аудит (`audit_log`)
Записываются: `login`, `logout`, `change_password`; `update_profile` (сотрудник); `service create/update`; `cash_shift open/close`; `invoice create/update_items/approve_discount/issue/cancel`; `payment create`; `refund_request create/approve/reject`. **Не аудируются**: создание/правка пациентов, создание/изменение/отмена приёмов, осмотр, неудачные входы, refresh. Читающего интерфейса (API или UI) для журнала нет.

### 8.6 Побочные эффекты и расчёты (сводка)
- Старт приёма → сброс прочих `in_progress` врача на этот день в `scheduled`.
- Сохранение осмотра → замена всех назначений; запись только первого диагноза.
- Платёж/одобренный возврат → пересчёт статуса счёта.
- Одобренный возврат → новый отрицательный платёж; заявка связывается с ним.
- Выставление счёта → блокировка при превышении порога без подтверждения.
- Закрытие смены → отчёт считает ожидаемую наличность и расхождение «на лету» (в БД не хранятся).
- Склад, зарплаты: побочных эффектов нет, т. к. функциональности нет.

---

## 9. Не реализовано / планируется

### 9.1 Планируется (в планах и аналитических документах), в коде отсутствует

Источники: `IBNSINA_DEVELOPMENT_PLAN.md` (этапы 3–6), `docs/PHASE3_ANALYSIS.md` (черновик, без кода).

| Область | Что описано в планах | Состояние в коде |
|---|---|---|
| **Склад препаратов (Этап 3)** | `Medication`, `StockReceipt`, `StockBatch`, `StockMovement`; приход, списание на пациента (FEFO), инвентаризация, брак/просрочка, алерты, история движений | **Ни моделей, ни эндпоинтов, ни страниц.** Единственное близкое — `Prescription` со свободным текстом, со складом не связана |
| **Бухгалтерия (Этап 4)** | `Expense`, `Payroll`, атрибуция выручки, расчёт зарплат по трём моделям, утверждение и выплата, отчёты P&L / по врачам / по услугам / дебиторка / расходы, экспорт XLSX | **Нет.** Роль `accountant` есть, эндпоинтов и страниц для неё нет |
| **Панель главврача (Этап 5)** | список сотрудников, найм (создание Employee + User + временный пароль), увольнение, правка условий оплаты, очередь утверждений (возвраты, скидки, инвентаризация, зарплаты), KPI врачей, сводный дашборд, просмотр аудита | **Нет.** Эндпоинтов `POST /api/employees`, `.../terminate`, `.../compensation`, `/api/audit` нет. Реализованы лишь два утверждения: скидка и возврат |
| **Этап 6 (долги)** | `AppointmentDiagnosis` (несколько диагнозов), машина состояний приёма на бэке, настройки клиники (длительность по умолчанию, порог скидки, рабочие часы), уведомления, реальный раздел настроек | **Нет.** Сейчас: один диагноз, любые переходы статуса, 18 минут и порог 10 % — константы/env |
| Мультифилиальность | `branch_id` | Колонка `employees.branch_id` без FK, нигде не используется |
| Типы плательщиков | `payer_type` (self_pay/insurance/osms) | Поля нет |
| Исполнитель услуги | `InvoiceItem.performer_employee_id` для процента от выручки | Колонка есть; ни схема входа, ни UI её не заполняют |

### 9.2 Есть в моделях/коде, но не доведено

- **Роль `admin`:** есть в enum и `seed.py`; ни один бизнес-эндпоинт её не допускает, функций администрирования нет.
- **`must_change_password`:** поле читается и сбрасывается при смене пароля, но нигде не выставляется в `true`; фронтенд его не использует, экрана смены пароля нет.
- **Refresh на фронте:** бэкенд умеет `POST /api/auth/refresh`, фронт его не вызывает → сессия в UI ≈ 15 минут.
- **`require_self_or_roles`** (`app/deps.py`) — не используется.
- **Поля зарплаты** `salary_type`, `base_salary`, `revenue_percent` в `employees` — хранятся, ни один эндпоинт их не читает и не пишет.
- **Запись медицинских данных:** для аллергий, хронических заболеваний, прививок, витальных показателей и госпитализаций есть только чтение; эндпоинтов создания/правки нет, данные приходят из `seed.py`.
- **Многодиагнозность:** UI позволяет выбрать несколько диагнозов, backend сохраняет только первый.
- **`Invoice.appointment_id`:** теперь проверяется (приём существует и принадлежит пациенту) и передаётся из блока «Вышли от врача»; со страницы пациента счёт по-прежнему выставляется без привязки к приёму. Бэкенд не запрещает несколько неотменённых счетов на один приём — от дублей защищает только интерфейс (ссылка «Счёт №…» вместо кнопки).
- **`PATCH /api/invoices/{id}/items` и `GET /api/appointments/week`:** эндпоинты есть, в UI не используются (`updateInvoiceItems`, `getWeekAppointments` определены в `lib/api`, но не вызываются из компонентов). `GET /api/invoices` используется вкладкой «Счета» кассы и блоком «Вышли от врача».
- **Блок настроек на `/profile`:** карточки «Уведомления» и «Оформление» — текст «в разработке»; «О системе» показывает «Версия 1.0.0».
- **Дашборд для `accountant`/`admin`:** текст-заглушка «Рабочее пространство для вашей роли появится на следующих этапах».
- **`/profile` для ролей без врачебного профиля:** карточка учётной записи (ФИО, должность) и блок настроек.
- **Кнопка «Записать на приём»** в шапке карточки пациента (`PatientProfileHeader`) ведёт на `/patients/{id}/examination` (форма осмотра), а не на форму записи.
- **Форма записи на `/appointments`** не скрыта для `nurse`, хотя её запросы вернут 403.
- **Карточка пациента для `accountant`:** страница запрашивает `GET /patients/{id}/history` (403 для роли) и не обрабатывает эту ошибку.
- **Журнал аудита:** пишется, читать негде.
- **Миграция на Vite:** `front-vite/` — scaffold; `docs/PHASE3_ANALYSIS.md` и `docs/VITE_MIGRATION_PLAN.md` в git не добавлены.

---

## Связи для графа

### Роль → действие → сущность

```
reception → создаёт → Patient
reception → читает → Patient
reception → редактирует (демография) → Patient
reception → читает → Appointment
reception → создаёт → Appointment
reception → переносит (любой) → Appointment
reception → отменяет (любой) → Appointment
reception → читает → Service
reception → открывает / закрывает (свою) → CashShift
reception → читает отчёт (своей смены) → CashShift
reception → создаёт → Invoice
reception → редактирует позиции (draft, только API) → Invoice
reception → выставляет (issue) → Invoice
reception → отменяет (draft/unpaid) → Invoice
reception → читает → Invoice
reception → принимает оплату → Payment
reception → читает → Payment
reception → создаёт заявку → RefundRequest
reception → читает → RefundRequest
reception → читает историю → Appointment (history, visit-history)

doctor → создаёт → Patient
doctor → читает → Patient
doctor → создаёт → Appointment
doctor → читает → Appointment
doctor → начинает / завершает → Appointment
doctor → заполняет осмотр → Appointment
doctor → задаёт диагноз (МКБ-10) → Appointment
doctor → заменяет назначения → Prescription
doctor → отменяет / переносит (свои) → Appointment
doctor → читает → HealthMetric
doctor → читает → Vaccination
doctor → читает → Service
doctor → редактирует свой профиль и график → DoctorProfile
doctor → редактирует свой график → Schedule
doctor → читает статистику недели → Appointment

nurse → создаёт → Patient
nurse → читает → Patient
nurse → читает → Appointment
nurse → читает → HealthMetric
nurse → читает → Vaccination
nurse → читает → Service

accountant → создаёт → Patient
accountant → читает → Patient

head_doctor → (все действия reception и doctor, см. выше)
head_doctor → создаёт / редактирует → Service
head_doctor → деактивирует (is_active=false) → Service
head_doctor → подтверждает скидку → Invoice
head_doctor → одобряет → RefundRequest
head_doctor → отклоняет → RefundRequest
head_doctor → создаёт отрицательный платёж (через approve) → Payment
head_doctor → открывает / закрывает (любую) → CashShift
head_doctor → читает отчёт (любой смены) → CashShift
head_doctor → читает дневной отчёт → Payment (агрегат за день)
head_doctor → отменяет / переносит (любой) → Appointment
head_doctor → редактирует (демография) → Patient

admin → (бизнес-действий нет) → —

все роли → меняют пароль → User
все роли → входят / выходят → RefreshToken
```

### Сущность → связь → Сущность

```
User → 1—1 (employee_id) → Employee
User → 1—N → RefreshToken
User → 1—N (actor_user_id) → AuditLog
Employee → 1—0..1 → DoctorProfile
Employee → 1—N → Schedule
DoctorProfile → 1—N → DoctorEducation
Employee → 1—N (employee_id, лечащий врач) → Appointment
Employee → 1—N (created_by_id) → Appointment
Employee → 1—N (cancelled_by_id) → Appointment
Employee → 1—N (employee_id) → Hospitalization
Employee → 1—N (updated_by_id) → Patient
Employee → 1—N (cashier_employee_id) → CashShift
Employee → 1—N (created_by_id) → Invoice
Employee → 1—N (discount_approved_by_id) → Invoice
Employee → 1—N (cancelled_by_id) → Invoice
Employee → 1—N (created_by_id) → Payment
Employee → 1—N (approved_by_id) → Payment
Employee → 1—N (requested_by_id) → RefundRequest
Employee → 1—N (decided_by_id) → RefundRequest
Employee → 0..1—N (performer_employee_id, не заполняется) → InvoiceItem
Patient → 1—N → Appointment
Patient → 1—N → PatientDisease
Patient → 1—N → PatientAllergy
Patient → 1—N → Vaccination
Patient → 1—N → Hospitalization
Patient → 1—N → HealthMetric
Patient → 1—N → Invoice
Appointment → 1—N → Prescription
Appointment → 0..1—N (appointment_id, опционально) → Invoice
Invoice → 1—N → InvoiceItem
Invoice → 1—N → Payment
Invoice → 1—N → RefundRequest
Service → 1—N → InvoiceItem
CashShift → 1—N (cash_shift_id, только наличные) → Payment
Payment → 0..1—1 (reversal_of_payment_id) → Payment
Payment → 1—N → RefundRequest (payment_id)
RefundRequest → 0..1—1 (resulting_payment_id) → Payment
InvoiceNumberCounter → выдаёт номер года → Invoice
```

### Статусные переходы (для графа состояний)

```
Appointment: (создание) → scheduled
Appointment: scheduled → in_progress   [doctor, head_doctor]
Appointment: in_progress → completed   [doctor, head_doctor]
Appointment: scheduled | in_progress → cancelled   [reception, head_doctor, doctor(свой)]
Invoice: (создание) → draft
Invoice: draft → unpaid   [issue; скидка > порога → нужен head_doctor]
Invoice: draft | unpaid → cancelled
Invoice: unpaid | partial → partial | paid   [платёж]
Invoice: paid | partial → refunded | partial   [одобренный возврат]
RefundRequest: pending → approved | rejected   [head_doctor]
CashShift: open → closed
```


## Изменения: участок убран, «Профиль» и «Настройки» объединены

- **Участок удалён полностью:** колонки `patients.area` и `doctor_profiles.area` (миграция `b4c5d6e7f8a9`), поле в API, фильтр «Все участки», колонка в списке пациентов, поле в формах создания/правки пациента, показ в профиле врача. Метрики профиля «Пациентов на участке» и «Диспансерных» убраны. В форме записи врач по умолчанию больше не подбирается по участку пациента: он подставляется только при «Записать повторно»/переносе, иначе выбирается вручную.
- **Профиль врача:** убраны блок «Образование», поле «Категория квалификации» с бейджем категории и строка места работы в контактах (таблицы `doctor_education` и колонки `qualification_category`, `workplace` в БД остаются).
- **«Профиль» = «Настройки»:** один пункт меню «Профиль» и одна страница `/profile` для всех ролей; `/settings` перенаправляет на неё. Врачу/главврачу — профиль и ниже блок настроек, остальным ролям — карточка учётной записи и блок настроек.
- **Услуги (прейскурант):** врачам и медсёстрам вкладка и `GET /api/services` закрыты (403, «Нет доступа»). Читает регистратор (цены нужны для счетов), создают и правят — `head_doctor` и `admin`.
- **Приёмы врача:** `doctor` видит в приёмах только свои (`GET /api/appointments`, `/week`, `/today`, `/queue`, `/current`, `/stats/week` фильтруются по `employee_id`); `head_doctor`, `reception` и `nurse` видят все приёмы клиники.

## Изменения: номер в очереди вместо времени приёма

- **Время записи не назначается.** Регистратор не знает, сколько врач будет принимать пациента, поэтому при записи выбираются врач и дата, а пациент получает порядковый номер у этого врача на день («пациент №1, №2, №3…»). Номер присваивает бэкенд (`POST /api/appointments`), он уникален для пары врач+день и не переиспользуется: у отменённого приёма номер остаётся за ним. Подсказка в форме — `GET /api/appointments/queue-info` (работает ли врач в этот день, сколько ждёт, какой номер будет). Запись возможна только на день, когда врач принимает по графику; часы работы и конфликт слотов не проверяются, `available-slots` удалён.
- **Перенос** (`PATCH` с `date` и/или `employeeId`) ставит пациента в конец очереди нового дня/врача (новый номер); поле `time` из запроса убрано.
- **Время видно только фактическое.** «Начать» ставит `started_at`, «Завершить» — `completed_at` и реальную `duration_minutes` (если не передана). В карточке пациента (история болезни) у начатых приёмов показывается «с–до» (например, 12:05–12:31); у ненчатых времени нет. Во всех списках приёмов, очереди, календаре и на стойке вместо времени — «№N». Календарь недели — колонки по дням, внутри пациенты по номерам.
- **Миграция `c5d6e7f8a9b0`:** старые приёмы пронумерованы по прежнему времени слота (внутри врача и дня), для начатых/завершённых `started_at` взят из слота, колонка `time` оставлена (nullable) и не используется.
- Порядок приёмов в API: дата → врач → номер. `seed.py`/`seed_demo.py` создают приёмы с номерами; слоты из сетки в демо-данных нужны только чтобы правдоподобно задать фактическое время.

## Изменения: редизайн рабочего места врача

- **«Живая очередь» объединена с «Приёмами».** Пункта меню и страницы нет, `/queue` перенаправляет на `/appointments`. На «Приёмах» сверху карточка «Следующий пациент» (наименьший номер среди записанных, только у тех, кто сам принимает, и только по своей очереди), ниже список дня с вкладками «Все / Далее / Проведены / Отменены» (по умолчанию «Далее» — без следующего пациента) и настоящими счётчиками. Колонки: «Очередь» (№N), «Пациент и жалоба», «Статус», «Действие» (+ «Врач», если видны приёмы нескольких врачей). «Начать» меняет статус на «на приёме» и открывает осмотр; меню «⋯»: «Вызвать вне очереди», «Перенести», «Отменить» (с окном причины). У проведённых вместо «Начать» — «Протокол». `doctor` всегда видит только свои приёмы; `head_doctor` — «Только мои» по умолчанию и «Все врачи»; `reception`/`nurse` — приёмы всех врачей с колонкой «Врач».
- **Дашборд врача** (`doctor`, `head_doctor`, `nurse`): приветствие по времени суток, четыре числа дня («Приёмов сегодня» — все, включая отменённые; «Проведено»; «Осталось принять»; «Отменено»), «Расписание на сегодня» (по номерам, без отменённых, до 7 строк), зелёная карточка «Следующий», «Неделя» (новые пациенты, диспансерные, среднее время приёма). У `head_doctor` числа дня — по его собственным приёмам.
- **Пациенты:** вкладки «Все / Мои пациенты / Диспансерные / Новые» — параметр `filter` у `GET /api/patients` (`mine` — были приёмы у текущего сотрудника, `dispensary`, `new` — ещё нет завершённых приёмов; другое значение → 422). «Мои пациенты» показывается только врачам. Колонки: пациент (ФИО, ИИН), возраст (+дата рождения), приём («Запись»/«Был»/«Сегодня» + дата), заболевания (до двух тегов и «+N»); вся строка — ссылка на карточку; пагинация с многоточием.
- **Каркас:** сайдбар 248px, шрифт Inter, дизайн-токены в `front/src/index.css`, шапка без имени сотрудника, без хлебных крошек.

## Изменения: «Дашборд» и «Приёмы» объединены (врач, главврач, медсестра)

- На `/` у `doctor`/`head_doctor`/`nurse` одна страница: слева карточка со списком приёмов выбранного дня (выбор даты, вкладки «Все / Осталось / Проведены / Отменены» со счётчиками, по умолчанию «Все»), справа «Сейчас на приёме» (если сегодня есть приём в работе), «Следующий» (сегодня, наименьший номер среди записанных) и «Неделя». Четырёх плиток с цифрами нет. Переключатель «Сегодня / Календарь» в шапке показывает недельный календарь вместо списка (справа остаётся только «Неделя»).
- Порядок списка: активные (на приёме, записан) по номеру, затем проведённые, отменённые всегда в конце (приглушены, ФИО зачёркнуто). Время приёма нигде не показывается — только «№N». Дата списка (`?date=`) и неделя календаря (`?week=`) хранятся в адресе.
- Пока кто-то «На приёме», «Начать» в строках и «Начать приём» неактивны («Сначала завершите текущий приём»). Для другого дня «Начать» и карточки справа не показываются. Меню «⋯»: «Перенести», «Отменить» (у отменённого приёма — недоступны).
- «Приёмы» убраны из меню врача, главврача и медсестры; `/appointments` перенаправляет на `/` с сохранением параметров. Главврач видит в списке только свои приёмы (режима «Все врачи» больше нет). У регистратуры остаётся отдельная страница `/appointments` (приёмы всех врачей, колонка «Врач»).
- Приветствие: 05:00–11:59 «Доброе утро», 12:00–17:59 «Добрый день», 18:00–22:59 «Добрый вечер», 23:00–04:59 «Доброй ночи». «Среднее время приёма» без данных — «—».

