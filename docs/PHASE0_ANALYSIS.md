# Фаза 1 — Анализ перед Этапом 0

Код — источник истины. Ниже сверка `docs/SYSTEM_OVERVIEW.md` и `IBNSINA_DEVELOPMENT_PLAN.md`
с фактическим репозиторием на момент анализа (после того как в текущей ветке уже добавлена
полноценная JWT-авторизация — она в `SYSTEM_OVERVIEW.md` ещё не описана как «Фаза 1»-плана база
данных для сверки, но это то, что реально в коде сейчас).

> **Оговорка по источникам.** `IBNSINA_DEVELOPMENT_PLAN.md` в репозитории на момент первой версии
> этого анализа лежал с повреждённой кодировкой — я прочитал план по смыслу (все идентификаторы
> схемы, имена таблиц, enum-значения и API-пути в документе на ASCII и не пострадали), но точные
> формулировки русских описаний восстановить не мог. Владелец проекта заменит файл на чистую
> UTF-8 версию — **до тех пор Фаза 2 не начинается** (см. решение по вопросу 7 в разделе 8).
> Как только файл заменят, я перечитаю его дословно и сверю со своей реконструкцией здесь.

> **Статус:** решения по всем вопросам раздела 8 получены (2026-08-07) и учтены в разделах 3, 6, 7.
> Жду только чистой версии `IBNSINA_DEVELOPMENT_PLAN.md`, прежде чем писать код.

## 1. Карта репозитория

```
back/
  app/
    main.py            — сборка FastAPI-приложения, регистрация роутеров, CORS
    config.py           — pydantic-settings (DATABASE_URL, SECRET_KEY, CORS_ORIGINS, ...)
    database.py          — engine/SessionLocal/Base, get_db()
    security.py           — bcrypt-хеширование, создание/проверка JWT
    deps.py                 — get_current_user() (JWT из Authorization: Bearer)
    models/                   — SQLAlchemy-модели, по одному файлу на сущность
      doctor.py, doctor_education.py, schedule.py   — врач и его профиль
      patient.py, patient_diseases.py, patient_allergies.py, vaccination.py,
      hospitalization.py, health_metric.py            — пациент и мед. данные
      appointment.py, prescription.py                  — приём и назначения
      user.py                                            — логин/пароль/роль (User)
      __init__.py                                          — общий экспорт моделей
    schemas/                — pydantic-схемы входных payload'ов (Doctor, Patient, Appointment)
    routers/                 — auth, doctors, patients, appointments, search, icd10
    data/icd10_common.json    — локальный справочник МКБ-10
  alembic/                     — миграции, versions/ — 12 ревизий, одна линейная цепочка
  seed.py                        — наполняет БД одним врачом + пациентами/приёмами
  requirements.txt, .env(.example) — зависимости и конфиг
  venv/, .venv/                    — ДВЕ параллельные virtualenv (см. риски, п.6)

front/
  app/
    (doctors)/            — защищённая оболочка: layout.tsx (Sidebar+Header), page.tsx (дашборд),
                             appointments/, patients/, patients/[id]/, patients/[id]/examination/,
                             profile/, queue/, settings/
    login/                 — публичная страница входа (вне group (doctors))
    layout.tsx               — корневой layout (только html/body, без Sidebar)
  components/
    appointments/, dashboard/, patients/, patients/profile/, profile/, queue/, layout/, auth/, ui/
  lib/
    api/                     — api.ts (fetch-обёртка + токен + 401-хендлинг), token.ts (cookie),
                                auth.ts, doctors.ts, patients.ts, appointments.ts, search.ts,
                                icd10.ts, examinations.ts
    types.ts, calendar-utils.ts
  proxy.ts                    — аналог middleware.ts в Next 16, гвардия по наличию cookie

docs/
  SYSTEM_OVERVIEW.md            — описание текущей реализации (актуально)
  PHASE0_ANALYSIS.md              — этот файл

IBNSINA_DEVELOPMENT_PLAN.md — план (в репо, кодировка повреждена, см. выше)
```

## 2. Расхождения документации и кода

| В `SYSTEM_OVERVIEW.md` написано | Что реально в коде | Существенность |
|---|---|---|
| «Аутентификации нет вообще... `/api/auth/me` — заглушка» (это было верно на момент написания раздела «известные ограничения») | В текущей ветке уже реализован полноценный JWT-логин: `POST /api/auth/login`, `GET /api/auth/me`, все роутеры кроме auth защищены `Depends(get_current_user)` на уровне `main.py`. Пароли — bcrypt. | **Высокая.** Документ описывает более раннее состояние; план Фазы 0 тоже пишет так, будто auth ещё не существует («жёсткая привязка к первому врачу» и т.п.) — это тоже уже не так: `doctors.py`/`appointments.py` резолвят врача через `current_user.doctor_id`, а не `db.query(Doctor).first()`. |
| «Department... удалена как мёртвый код» (в моей переписке, не в файле) | Модель `Department` физически удалена, миграция `a7b8c9d0e1f2` дропает таблицу и колонку `doctors.department_id`. | Согласовано, разночтений нет. |
| Раздел 7 «Известные ограничения»: «Многодокторская запись — форма записи всегда пишет на текущего авторизованного врача» | Подтверждено кодом: `appointments.py::create_appointment` резолвит `doctor = db.query(Doctor).filter(Doctor.id == current_user.doctor_id)`, `doctor_id` в теле запроса не принимается. | Соответствует плану (Этап 1, задача 3) — это ожидаемо и будет меняться не в Этапе 0. |
| Не упомянуто в `SYSTEM_OVERVIEW.md` | `back/venv` и `back/.venv` — два независимых virtualenv существуют одновременно (см. риски). | Дока промолчала, стоит знать до начала работы. |
| План, раздел 0.3: «Токен в JS-доступной cookie → httpOnly + refresh» — этот пункт написан как констатация уже существующего состояния | Верно, соответствует коду: `front/lib/api/token.ts` кладёт токен в обычный (не httpOnly) cookie `auth_token`, читает и через `document.cookie`, и через `next/headers`. | Разночтений с планом нет — план верно описывает текущее состояние как отправную точку. |
| План не упоминает, что `main.py` включает `get_current_user` глобально одним блоком (`dependencies=_auth_required` на `include_router`) | Именно так и реализовано — это ровно то, что задача 3 Этапа 0 требует убрать («Убрать глобальное подключение... Каждый эндпоинт объявляет роли явно»). | Само по себе не расхождение — план корректно ставит задачу на существующий код, просто в тексте плана это неявно. Фиксирую для точности реализации. |

Других содержательных расхождений между `SYSTEM_OVERVIEW.md` и кодом не нашёл — документ, судя по всему,
писался с этого же среза кода и по бизнес-логике приёмов/пациентов/осмотра совпадает 1:1.

### 2.1 Что уже закрыто текущей веткой (не переделываем — правило B)

Часть задач Этапа 0 фактически уже сделана до начала Фазы 2 (за эту же рабочую сессию, до плана).
В реализации нужна только **разница**:

| Пункт Этапа 0 из плана | Статус | Что осталось |
|---|---|---|
| Выпуск и проверка JWT | ✅ Готово (`security.py`, `deps.py`) | Заменить один access-токен на пару access(15 мин)/refresh(30 дней), см. коммит 7 |
| Хеширование паролей (bcrypt) | ✅ Готово (`security.py::hash_password/verify_password`) | Без изменений |
| Логин-эндпоинт | ✅ Готово (`POST /api/auth/login`) | Переключить ответ с JSON-токена на `Set-Cookie`, см. коммит 7 |
| Снятие «жёсткой привязки к первому врачу» | ✅ Готово — `doctors.py`/`appointments.py` уже резолвят через `current_user.doctor_id`, а не `.first()` | При переходе на `Employee` менять `doctor_id` → `employee_id`, сам паттern резолва через текущего пользователя менять не нужно |
| Защита роутов на бэкенде | ⚠️ Частично — есть блокетная `Depends(get_current_user)` на всех роутерах, но ролей нет вообще | Заменить на `get_current_employee()` + explicit-роли по эндпоинтам (коммит 6) |
| Защита страниц на фронте | ⚠️ Частично — `proxy.ts` проверяет только наличие cookie, не роль | Добавить карту «префикс → роли» (коммит 9) |
| `seed.py` с известными кредами | ⚠️ Частично — один врач, пароль выводится в консоль | Расширить до 6 сотрудников (коммит 3) |
| RBAC-модель, `Employee`, роли, httpOnly, `AuditLog`, тесты | ❌ Не начато | Весь объём — см. §7 |

Это не меняет последовательность коммитов из §7, но означает, что коммиты 1–3 в основном про
*добавление* новой модели данных поверх уже рабочей аутентификации, а не про построение auth с нуля.

## 3. Точки, затрагиваемые рефакторингом Doctor → Employee

### Backend — модели

| Файл | Что там сейчас | Что делать |
|---|---|---|
| `app/models/doctor.py` | `class Doctor` — и «сотрудник» (`full_name`, `role`, `area`, `phone`, `email`...), и «профиль врача» (`specialty`, `license_*`, `certificate_*`, `experience_years`) в одной таблице | Разбить: базовые поля → `Employee`, профессиональные → `DoctorProfile` (1:1 к `Employee`) |
| `app/models/user.py` | `doctor_id: Mapped[int \| None]` FK на `doctors.id`, `unique=True`; `doctor = relationship(...)` | `doctor_id` → `employee_id` (FK на `employees.id`); переименовать relationship (`employee`); добавить `must_change_password`, `last_login_at`, `is_active`; `role` из `User` убрать (единственный источник — `Employee.role`) |
| `app/models/appointment.py` | `doctor_id: Mapped[int]` FK `doctors.id`, `doctor = relationship("Doctor", back_populates="appointments")` | **Только** FK → `employees.id`. `created_by_id`, `cancelled_reason`, `cancelled_by_id`, `service_id` — решено не заводить в Этапе 0 (решение по вопросу 8): первые три относятся к Этапу 1 (ресепшен), `service_id` — к Этапу 2 (прайс-лист) |
| `app/models/hospitalization.py` | `doctor_id` FK, `doctor = relationship("Doctor", back_populates="hospitalizations")` | Аналогично → `employee_id`/`employee` |
| `app/models/schedule.py` | `doctor_id` FK `doctors.id` | → `employee_id` (подтверждено решением по вопросу 3 — график нужен всем ролям) |
| `app/models/doctor_education.py` | `doctor_id` FK `doctors.id` | → **`doctor_profile_id`**, не `employee_id` (решение по вопросу 3: это неточность плана, медобразование принадлежит `DoctorProfile`) |
| `app/models/__init__.py` | `from app.models.doctor import Doctor`, `"Doctor"` в `__all__` | Заменить на `Employee`, `DoctorProfile` |
| — (новые файлы) | — | `app/models/employee.py`, `app/models/doctor_profile.py`, `app/models/refresh_token.py`, `app/models/audit_log.py` |

### Backend — роутеры и сервисы

| Файл | Использование | Действие |
|---|---|---|
| `app/routers/doctors.py` | Весь роутер построен вокруг `Doctor`: `_get_doctor_or_404(db, doctor_id)`, `_build_badges`, `_build_metrics`, `_serialize_schedule`, `_serialize_education`, `_serialize_profile`, `_sync_schedules`; эндпоинты `GET /me`, `GET /me/profile`, `PATCH /me` резолвят через `current_user.doctor_id` | Переписать под `Employee` + `DoctorProfile`, логика переезжает в новый `routers/employees.py` под `/api/employees/me`, `/api/employees/me/profile` (404, если у сотрудника нет `DoctorProfile`). **Решение по вопросу 1:** `/api/doctors/me[/profile]` остаются тонкими алиасами до конца Этапа 0, снимаются отдельным коммитом после перевода фронта (см. §7, коммит 9.5) |
| `app/routers/appointments.py` | `create_appointment`: `from app.models.doctor import Doctor`, `db.query(Doctor).filter(Doctor.id == current_user.doctor_id)`; фильтры `Appointment.doctor_id == doctor.id` (создание), `Appointment.doctor_id == appointment.doctor_id` (эксклюзивность «один активный приём на врача» в `update_appointment`) | Заменить модель и все ORM-фильтры на `Employee`/`employee_id`. Это критичное место — если пропустить одно из двух вхождений `doctor_id ==`, эксклюзивность «один активный приём» тихо сломается (SQLAlchemy не даст ошибку компиляции, просто перестанет фильтровать правильно) |
| `app/routers/patients.py` | `hospitalization.doctor.short_name` (сериализация `attendingDoctor`) | `.doctor` → `.employee` (или как назовём relationship) |
| `app/routers/auth.py` | `_serialize_user`: `"doctorId": user.doctor_id` в ответе `/login` и `/me` | `user.doctor_id` → `user.employee_id`; JSON-ответ содержит **оба** ключа — `employeeId` (основной) и `doctorId` (deprecated-алиас, то же значение) до конца Этапа 0 (решение по вопросу 2), затем `doctorId` снимается вместе с алиасами `/api/doctors/*` |
| `app/deps.py` | `get_current_user()` — только декодирует JWT и находит `User`, роли не проверяет вообще | Добавить `get_current_employee()` (возвращает `User`+`Employee` вместе, проверяет `Employee.status != fired` и `User.is_active`), `require_roles(*roles)`, `require_self_or_roles()` |
| `app/main.py` | `_auth_required = [Depends(get_current_user)]`, подключено разом ко всем роутерам кроме `auth` | Убрать блок, вернуть `dependencies=[]` на `include_router`, роли объявлять на каждом эндпоинте отдельно |
| `alembic/env.py` | `from app.models import (Appointment, Doctor, ...)` — импорт для автогенерации/metadata | `Doctor` → `Employee, DoctorProfile` |
| `seed.py` | `DOCTOR_DATA`, `DOCTOR_PROFILE_EXTRA`, `USER_DATA`, `SCHEDULES_DATA`, `EDUCATION_DATA`, `_get_or_create_doctor()`, `_sync_user()` — заводит одного врача | Полная переработка: по одному `Employee` на каждую из 6 ролей, `DoctorProfile` только для doctor/head_doctor, вывод логинов/паролей в консоль |

### Frontend

| Файл | Использование | Действие |
|---|---|---|
| `lib/api/doctors.ts` | Типы `Doctor`, `DoctorProfile`, `DoctorProfileUpdate`; функции `getCurrentDoctor()`, `getDoctorProfile()`, `updateDoctorProfile()` → `/api/doctors/me`, `/api/doctors/me/profile` | Переезжает на `/api/employees/me[/profile]` (вопрос 1). Имена типов/функций можно оставить как есть (описывают роль doctor локально), меняются только вызываемые пути |
| `lib/api/auth.ts` | `AuthUser.doctorId: number \| null` | Добавить `employeeId`, `doctorId` оставить как deprecated-поле до конца Этапа 0 (вопрос 2) |
| `app/(doctors)/layout.tsx` | **Безусловно** вызывает `getCurrentDoctor()` для Sidebar/Header — это единственная точка входа для ЛЮБОГО залогиненного пользователя | Это блокер для Этапа 0: ресепшен/бухгалтер при входе получит 404/500 на этом вызове, а не «свой экран». Нужен role-агностичный вызов (`/api/auth/me` уже возвращает роль — на его основе решать, что рендерить) |
| `app/(doctors)/page.tsx`, `app/(doctors)/appointments/page.tsx` | Тоже дёргают `getCurrentDoctor()` напрямую (для приветствия/тулбара) | То же самое — привязаны к тому, что залогинен именно врач |
| `components/layout/Header.tsx`, `components/layout/Sidebar.tsx` | `doctor: Doctor` как обязательный проп | Обобщить на `Employee`-подобный тип (имя, инициалы, роль, участок — не все поля есть у всех ролей) |
| `components/profile/*` (`ProfileSummaryCard`, `ProfileMetricsCard`, `ProfileProfessionalCard`, `ProfileContent`) | Полностью завязаны на форму `DoctorProfile` (specialty, license, schedule, education) | Ок оставить как «вид профиля для роли doctor/head_doctor», но `ProfileView.tsx` должен сначала проверить роль/наличие `DoctorProfile`, прежде чем звать `getDoctorProfile()` — иначе у ресепшена `/profile` упадёт |
| `app/(doctors)/` (имя папки) | Route group `(doctors)` — не влияет на URL, но семантически теперь неверно называется, раз в нём будут все роли | **Не трогаем в Этапе 0** — отложено до Этапа 6 (решение по вопросу 5), чтобы не зашумлять диф |

### Не обнаружено, но стоит перепроверить в момент реализации

`grep` не нашёл использований `doctor`/`Doctor` вне перечисленного (кроме совпадений имени папки `(doctors)`
и слова «доктор» в русских UI-строках, которые не трогаем). Полный список файлов с любым вхождением
`Doctor|doctor_id` — 19 в `back/`, 23 в `front/` (часть — просто русский текст/имя роута, не код).

## 4. Текущее состояние аутентификации

**Выпуск токена.** `back/app/security.py::create_access_token(subject=user.email)` — JWT HS256,
`sub`=email, `exp` = now + `settings.access_token_expire_minutes` (сейчас 10080 мин = 7 дней,
единственный тип токена, «access» и «refresh» не разделены).

**Логин.** `back/app/routers/auth.py::POST /login` — сверяет bcrypt-хеш, возвращает JSON
`{accessToken, tokenType, user}` в теле ответа (не через `Set-Cookie`).

**Хранение на клиенте.** `front/lib/api/token.ts` — токен кладётся в **обычный, не httpOnly**
cookie `auth_token` (`document.cookie = ...`) из `components/auth/LoginForm.tsx` после успешного
логина. Читается той же функцией `getAuthToken()`:
- на сервере (RSC) — через `next/headers` `cookies()` (динамический `import`, чтобы не тянуть
  `next/headers` в клиентский бандл);
- в браузере — через `document.cookie` (regex-парсинг).

**Прикрепление к запросам.** `front/lib/api/api.ts` — `authHeaders()` вызывается в `apiGet`,
`apiPatch`, `apiPost`, добавляет `Authorization: Bearer <token>`.

**Обработка 401.** `handleUnauthorized()` внутри `parseApiError()` — **срабатывает только
на клиенте** (`if (typeof window === "undefined") return;`). На сервере (RSC) 401 просто
всплывает как `ApiError` и падает в error boundary Next.js — не редиректит и не чистит cookie.
Это разрыв, актуальный уже сейчас (не только после перехода на refresh-токены).

**Проверка на бэкенде.** `back/app/deps.py::get_current_user` — `HTTPBearer(auto_error=False)`,
декодирует JWT, ищет `User` по email из `sub`. Ролей не проверяет вообще — только «токен валиден /
не валиден». Подключён ко всем роутерам кроме `auth` разом через `main.py`.

**Защита страниц.** `front/proxy.ts` — проверяет только *наличие* cookie `auth_token`, не её
валидность и не роль. Если cookie есть — пускает; если её нет — редирект на `/login?next=...`.

**Выход.** `components/layout/Sidebar.tsx::handleLogout` — чистит cookie (`clearAuthToken()`),
редиректит на `/login`.

### Файлы, которые придётся менять для перехода на httpOnly + refresh

Важный архитектурный момент, которого в плане нет явно: `httpOnly` **не блокирует** чтение cookie
на сервере (`next/headers` спокойно читает httpOnly-cookie — ограничение только на `document.cookie`
в браузере). Значит:
- **Клиентские** запросы к бэкенду смогут просто полагаться на `credentials: "include"` — браузер
  сам приложит httpOnly-cookie к cross-origin запросу (CORS уже настроен на `allow_credentials=True`
  и точный `origin`, а не `*`, так что это будет работать). Ручной `Authorization`-заголовок на
  клиенте становится не нужен.
- **Серверные** (RSC) запросы идут напрямую из Node-процесса Next.js к FastAPI, минуя браузер —
  значит серверный код по-прежнему должен явно прочитать cookie (`next/headers`, это не блокируется
  httpOnly) и переслать её значение бэкенду (либо как `Cookie`, либо как `Authorization`).

Значит бэкенду нужно уметь принимать токен и как `Authorization: Bearer`, и как `Cookie` — сейчас
`deps.py` понимает только `HTTPBearer`.

Список файлов: `back/app/routers/auth.py` (Set-Cookie вместо JSON-токена, `/refresh`, `/logout`,
`/change-password`), `back/app/deps.py` (чтение из cookie), `back/app/security.py` (короткий access +
отдельный refresh с хешированием и ротацией), новая модель `RefreshToken` + миграция,
`front/lib/api/token.ts` (упраздняется client-side логика получения токена), `front/lib/api/api.ts`
(убрать `authHeaders()`, добавить `credentials: "include"`, серверную ветку — переслать cookie),
`front/components/auth/LoginForm.tsx` (больше не сохраняет токен вручную — сервер сам ставит cookie).

## 5. Существующие миграции

Линейная цепочка, один head, ветвлений нет:

```
19c64c905e4d (initial tables)
 → a1b2c3d4e5f6 (expand patients table)
 → b2c3d4e5f6a7 (expand appointments table)
 → 501cf0cf9151 (add patient diseases)
 → 290f3b051835 (add patient allergies)
 → 7bbc5b3e4129 (add vaccinations and hospitalizations)
 → 95c1f7da17f6 (add prescriptions and schedules)
 → 3529d996965e (add health metrics)
 → d4e5f6a7b8c9 (add departments, users, expand doctors)
 → e5f6a7b8c9d0 (expand doctor certificate/education/appointment duration)
 → f1a2b3c4d5e6 (add password_hash to users)
 → a7b8c9d0e1f2 (drop departments) — HEAD
```

**Ручных правок схемы мимо миграций не найдено** — но при подготовке к Этапу 0 я обнаружил и
починил баг в исторической миграции `501cf0cf9151`: она безусловно дропала индекс
`ix_patients_iin`, которого на чистой БД не существует (тот индекс появлялся только на очень
старых БД, где `iin` создавался с `unique=True` на колонке напрямую). Без этой правки
`alembic upgrade head` с нуля падал. Миграция теперь идемпотентна (проверяет наличие индекса
перед дропом). Это единственное отклонение «миграции ≠ реальная история» — зафиксировано и
исправлено в рамках текущей ветки (не относится к Этапу 0, но важно, что вся цепочка сейчас
проверена «с нуля» и рабочая — я лично прогонял `alembic upgrade head` на свежей локальной БД
перед этим анализом).

## 6. Риски конкретно этого репозитория

1. **Два virtualenv одновременно.** `back/venv/` и `back/.venv/` оба существуют с разным
   временем изменения. Установка новых зависимостей (`pyjwt`, `bcrypt` уже стоят в обоих — я
   ставил в оба в этой сессии) должна повторяться в оба, либо один из них нужно явно объявить
   мёртвым и удалить, иначе кто-то однажды запустит миграцию/тест не тем интерпретатором и
   получит `ModuleNotFoundError` или расхождение версий пакетов. **Решено:** схлопнуть в одно
   окружение первым же шагом Фазы 2, до любого кода (см. §7, коммит 0).
2. **Порт бэкенда не задокументирован единообразно.** `back/.env` (реально используемый) и
   `back/.env.example` в разное время расходились по порту БД и порту самого API
   (`front/.env.local` указывал на 8001, реальный бэкенд поднимался на 8000) — уже находил и
   чинил один раз в этой сессии. При добавлении `/api/auth/refresh` и смене cookie-стратегии
   легко снова рассинхронизировать `NEXT_PUBLIC_API_URL` и реальный порт uvicorn.
3. **`tests/` нет вообще — ни каталога, ни `pytest.ini`/`conftest.py`, ни паттерна тестовой БД.**
   Задача 2.8 плана формулируется как «написать тесты», но по факту первый коммит с тестами — это
   ещё и создание всей инфраструктуры (фикстура БД: отдельная тестовая Postgres-схема или SQLite,
   фабрики тестовых `Employee`/`User`, клиент `TestClient`/`httpx.AsyncClient`). Это отдельная,
   более объёмная задача, чем кажется по названию. **Решено:** каталог `tests/` с базовой
   инфраструктурой (без содержательных тестов ещё) заводится первым коммитом Фазы 2 (§7,
   коммит 0), а не в конце — далее каждый функциональный коммит добавляет к нему свои тесты.
4. **Единственный источник данных для data-миграции — 1 врач, 1 пользователь, 7 пациентов.**
   Объём небольшой, миграция низкорискованна с точки зрения производительности, но именно
   поэтому **легко не заметить забытый `doctor_id`**, если тестировать только «на глаз» — при
   таком объёме почти любая забытая колонка молча даст `NULL`, а не заметную ошибку. Нужна
   именно программная проверка «нет `NULL` в `employee_id`» (пункт 2.8 плана это и требует —
   подтверждаю, что это не опционально для этого репозитория).
5. **`main.py`: снятие бланкетной `dependencies=_auth_required`.** Сейчас это единственная
   линия защиты для *всех* эндпоинтов разом. Как только она снимается, а роли — расставляются
   по одному эндпоинту за раз, есть окно, где забытый эндпоинт становится **полностью
   публичным**, а не «сломанным» — то есть ошибка тихая и небезопасная, не просто баг. **Решено
   (правило A):** default-deny — явный публичный whitelist (только `/auth/login`, `/auth/refresh`),
   всё остальное обязано объявить роль; плюс тест, который проходит по всем зарегистрированным
   маршрутам приложения (`app.routes`) и падает, если маршрут не в whitelist и не имеет
   auth-зависимости. Непокрытый маршрут = красный тест в CI, а не тихо публичный эндпоинт в проде.
   Это часть коммита 6 (§7) и обязательное условие для его мержа.
6. **`Appointment.doctor_id == appointment.doctor_id`** (эксклюзивность «один активный приём») —
   два похожих, но разных по смыслу вхождения `doctor_id` в одной функции
   (`update_appointment`): одно — фильтр по врачу *нового* приёма, другое — сравнение с врачом
   *текущего* приёма. При механическом find-replace `doctor_id` → `employee_id` синтаксически
   всё скомпилируется в обоих случаях даже если по ошибке переименовать не то — SQLAlchemy не
   даст статической проверки. Нужен ручной построчный обзор этого файла, не автозамена.
7. **Frontend не проверяет форму JSON-ответа в рантайме.** Если бэкенд переименует
   `doctorId` → `employeeId` (вопрос 2), а какой-то компонент забыли обновить — TypeScript
   этого **не поймёт** (ответ типизирован вручную через generic `apiGet<T>`, а не через runtime-
   валидацию), будет тихий `undefined` в проде, а не ошибка сборки. Нужен ручной grep, не
   надежда на `tsc`.
8. **`(doctors)/layout.tsx` — общая точка входа.** Это единственное место, которое рендерится
   для абсолютно любой аутентифицированной страницы (Sidebar/Header). Если в Этапе 0 роль-
   зависимый рендеринг сделан неаккуратно, это одна точка отказа для всего фронтенда сразу —
   имеет смысл делать эту правку отдельным, тщательно проверяемым коммитом (см. §7, коммит 9),
   а не смешивать с рефакторингом бэкенда.

## 7. Предлагаемая последовательность коммитов

Каждый коммит — рабочее состояние: бэкенд стартует, `alembic upgrade head` проходит,
`npm run build` собирается.

0. **Подготовка (без бизнес-логики).** Схлопнуть `back/venv/` и `back/.venv/` в одно окружение
   (удалить второе, зафиксировать, каким пользоваться). Завести `back/tests/` с базовой
   инфраструктурой: `pytest.ini`/`pyproject` секция, `conftest.py` с фикстурой тестовой БД и
   `TestClient`, ноль содержательных тестов пока — только один тривиальный smoke-тест
   (`GET /health` → 200), чтобы инфраструктура была проверяемо рабочей с первого коммита.
   *Проверка:* `pytest` зелёный (1 тест), `uvicorn app.main:app` стартует как раньше.

1. **Backend: новые модели, аддитивная миграция №1.** `Employee`, `DoctorProfile`,
   `RefreshToken`, `AuditLog` — новые таблицы; `employee_id` (nullable) добавляется рядом со
   старыми `doctor_id` на `Appointment`, `Hospitalization`, `Schedule`, `User`;
   `doctor_profile_id` (nullable) добавляется на `DoctorEducation` (не `employee_id` — решение по
   вопросу 3). Старый код не тронут и продолжает работать через `doctor_id`.
   *Проверка:* `alembic upgrade head`, приложение стартует, все текущие эндпоинты отвечают как
   раньше.

2. **Backend: data-миграция №2.** Для существующего `Doctor` создать `Employee`(role=doctor) +
   `DoctorProfile`; проставить `employee_id` во всех связанных таблицах. Assert на «нет NULL».
   *Проверка:* прогон на копии текущей БД, `SELECT COUNT(*) FROM appointments WHERE employee_id
   IS NULL` = 0 (и так по всем таблицам).

3. **Backend: расширение `UserRole` до 6 значений, обновление `seed.py`.** По одному сотруднику
   на роль, вывод логинов/паролей в консоль. *Проверка:* `python seed.py`, ручной логин под
   каждой ролью через `/api/auth/login`.

4. **Backend: переключение ORM/роутеров на `Employee`/`employee_id`.** Новый
   `routers/employees.py` с `GET/PATCH /api/employees/me[/profile]` (логика бывшего
   `doctors.py`, 404 без `DoctorProfile`); `doctors.py` превращается в тонкий алиас, вызывающий
   те же функции; `appointments.py` (внимательно — риск §6.6), `patients.py`, `auth.py`
   (добавить `employeeId` в ответ, `doctorId` — deprecated-дубликат), `models/__init__.py`,
   `alembic/env.py`. Старая таблица `doctors` физически ещё жива, но код её не читает.
   *Проверка:* полный ручной smoke всех текущих эндпоинтов (curl/httpie) — логин, профиль врача
   по старому и новому пути, приёмы, пациенты, поиск, МКБ-10.

5. **Backend: миграция №3 — снос старого.** Дроп `doctors`, `doctor_id`-колонок,
   `employee_id` → NOT NULL. *Проверка:* `alembic upgrade head` + `alembic downgrade -1` +
   `alembic upgrade head` ещё раз на свежей БД — доказать обратимость.

6. **Backend: RBAC-зависимости и explicit-роли на каждом эндпоинте.** `get_current_employee()`,
   `require_roles()`, `require_self_or_roles()`; убрать блокетную wiring из `main.py`; расставить
   роли по матрице §2.2 плана на каждый существующий эндпоинт; явный публичный whitelist
   (`/auth/login`, `/auth/refresh`). **Обязательно** включает тест «default-deny» — обход всех
   `app.routes`, падает на любом маршруте без роли и вне whitelist (правило A) — плюс
   параметризованный тест «роль × эндпоинт» по матрице. *Проверка:* оба теста зелёные; без
   зелёного default-deny-теста коммит не мержится (риск §6.5).

7. **Backend: httpOnly + refresh.** Set-Cookie вместо JSON-токена, `RefreshToken` с ротацией,
   `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `must_change_password`,
   `deps.py` понимает cookie. Новые env-переменные `ACCESS_TOKEN_EXPIRE_MINUTES=15` и
   `REFRESH_TOKEN_EXPIRE_DAYS=30`; старое значение `ACCESS_TOKEN_EXPIRE_MINUTES=10080` полностью
   выводится из употребления, имя не переиспользуется (решение по вопросу 6).
   *Проверка:* curl-сценарий логин → refresh → logout; в браузере `document.cookie` не содержит
   токена.

8. **Backend: `AuditLog`.** Сервисный слой записи, подключение к login/logout/change-password/
   Employee/User-мутациям. *Проверка:* выполнить каждое действие, проверить строки в таблице.

9. **Frontend: роль-агностичная оболочка.** Контекст текущего сотрудника, обобщение
   `(doctors)/layout.tsx` (не звать `getCurrentDoctor()` безусловно), role-aware Sidebar,
   стартовая страница по роли, `<RoleGate>`, гвардия по префиксам в `proxy.ts`.
   *Проверка:* `npm run build`; вход под каждой из 6 ролей, проверка стартового экрана и
   видимости пунктов меню.

10. **Frontend: httpOnly-cookie на клиенте.** Убрать client-side чтение/запись токена из
    `token.ts`, `credentials: "include"` в `api.ts`, серверная пересылка cookie в RSC-фетчах.
    *Проверка:* devtools → `document.cookie` не содержит `auth_token`; прямой curl под токеном
    ресепшена на эндпоинт врача → 403.

11. **Снятие deprecated-алиасов.** Теперь, когда фронт целиком на `/api/employees/*` и
    `employeeId`, удалить `/api/doctors/*`-алиасы из `doctors.py` и поле `doctorId` из ответов
    auth (решения по вопросам 1 и 2 — «снимается последним коммитом после перевода фронта»).
    *Проверка:* grep по репо `doctorId|/api/doctors` вне тестов/истории — пусто; `npm run build`;
    полный smoke.

12. **Тесты (добор).** Инфраструктура уже с коммита 0; здесь — содержательные тесты, которых не
    хватало по ходу: логин/refresh/ротация/logout, уволенный сотрудник не входит, проверка
    data-миграции на сиде (нет `NULL` в `employee_id`/`doctor_profile_id`). Матрица прав и
    default-deny уже покрыты в коммите 6. *Проверка:* `pytest` зелёный целиком, гоняется одной
    командой.

Всего 13 коммитов (0–12). Если это кажется мелко — коммиты 7+8 и 9+10 можно попарно объединить,
но 4 и 6 (§6.6, правило A) должны оставаться изолированными, чтобы откат при проблеме не задевал
остальное, а коммит 11 (снятие алиасов) обязан идти строго после 9 и 10 — иначе фронт временно
останется без рабочего эндпоинта.

## 8. Решения (получены 2026-08-07)

1. **Пути API.** Переезжаем на `/api/employees/me` и `/api/employees/me/profile`
   (`/me/profile` — 404 без `DoctorProfile`). `/api/doctors/me[/profile]` остаются тонкими
   алиасами до конца Этапа 0, снимаются последним коммитом (§7, коммит 11) после перевода фронта.
2. **Поле `doctorId`.** Переименовано в `employeeId`; `doctorId` возвращается рядом как
   deprecated-дубликат того же значения до конца Этапа 0, снимается вместе с алиасами (коммит 11).
3. **`Schedule`/`DoctorEducation`.** Признано неточностью плана. `Schedule` → `employee_id`
   (график нужен всем ролям). `DoctorEducation` → `doctor_profile_id` (медобразование —
   принадлежность профиля врача, не любого сотрудника).
4. **Данные seed-сотрудников.** Реальные правдоподобные казахские ФИО в стиле существующего
   врача (Шарипов М.Ю.), сгенерировать самостоятельно. Email — `<role>@ibnsina.local`. Пароли —
   известные, выводятся в консоль при выполнении `seed.py`.
5. **Переименование `(doctors)`.** Отложено до Этапа 6, в Этапе 0 не трогаем.
6. **Время жизни токенов.** Две новые переменные: `ACCESS_TOKEN_EXPIRE_MINUTES=15`,
   `REFRESH_TOKEN_EXPIRE_DAYS=30`. Старая `ACCESS_TOKEN_EXPIRE_MINUTES=10080` выводится из
   употребления полностью, имя не переиспользуется.
7. **`IBNSINA_DEVELOPMENT_PLAN.md`.** Владелец проекта заменит файл на чистую UTF-8 версию.
   После замены я перечитаю план дословно и сверю с реконструкцией в этом документе; о любых
   расхождениях — отдельным сообщением до начала кода. **Фаза 2 не начинается до этой сверки.**
8. **`Appointment.created_by_id`/`service_id`/`cancelled_reason`/`cancelled_by_id`.** Не заводим
   в Этапе 0. `service_id` — Этап 2 (прайс-лист), остальные три — Этап 1 (функции ресепшена).
   В Этапе 0 у `Appointment` меняется только `doctor_id` → `employee_id`, никаких новых полей.

### Общие правила, действующие во всех коммитах Этапа 0

- **Правило A — default-deny.** При снятии блокетной защиты в `main.py` ни один эндпоинт не
  должен молча стать публичным: явный whitelist (`/auth/login`, `/auth/refresh`), всё остальное
  обязано объявить роль явно; обязательный тест обхода `app.routes`, падающий на непокрытом
  маршруте (см. §6, риск 5; §7, коммит 6).
- **Правило B — код есть источник истины.** Auth уже реализован в текущей ветке, «привязка к
  первому врачу» уже снята — не переделывать готовое (см. §2.1, разница учтена в
  последовательности коммитов). Перед стартом: схлопнуть два venv в одно окружение и завести
  `tests/` первым коммитом (§7, коммит 0).

---

Дальше жду только чистую версию `IBNSINA_DEVELOPMENT_PLAN.md` в репозитории. Как только она
появится — перечитаю дословно, сверю со своей реконструкцией (особенно §§2–4 плана, где я
восстанавливал смысл по контексту), доложу о расхождениях, если найдутся, и только затем начну
Фазу 2 с коммита 0. Код в этой сессии по-прежнему не менялся.