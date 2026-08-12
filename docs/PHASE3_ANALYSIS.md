PHASE 3 — СКЛАД ПРЕПАРАТОВ

§1. Контекст и краткое резюме

Этап 3 — внедрение системы складского учета препаратов в клинике. Система должна хранить каталог препаратов, приходные документы, партии (с учётом срока годности), движения (приход, отпуск/dispense, списание, инвентаризация) и быть единственным источником остатка. Дальнейшая интеграция с бухгалтерией (Expense) и уведомлениями планируется в более поздних этапах.

§2. Роли и права (предложение)

- reception — ввод приходов (StockReceipt), списание брака/просрочки.
- nurse — dispense (выдача препаратов), инвентаризация/учёт в рамках своих прав.
- doctor — dispense (через форму осмотра), просмотр каталога и инициирование запросов на отпуск.
- head_doctor — полный доступ к складу, утверждение инвентаризации, обзор и правки.
- accountant — не имеет прав на склад в Этапе 3 (просмотр и действия запрещены).

(Эта таблица основана на аналогичной модели из Этапа 2; если хотите иное распределение прав — скажите.)

§3. Открытые вопросы (перечень, как в исходном черновике)

1) (КРИТИЧНЫЙ) Expense/«расход»: создавать ли модель Expense в Этапе 3 или отложить на Этап 4? (варианты a/b/c)
2) (КРИТИЧНЫЙ) Как связать списание billable‑препарата со Invoice, учитывая, что InvoiceItem.service_id был NOT NULL? (варианты a/b/c)
3) (КРИТИЧНЫЙ) Интеграция Prescription: делать FK на Medication и автосоздание движения или оставить отдельным документом? (варианты a/b/c)
4) Кто оформляет приход/приёмку товара (Receipt)? Нужно ли утверждение приходов?
5) Единицы измерения: свободная строка или ENUM + конверсии?
6) FEFO: автоматический выбор партии системой или подсказка пользователю?
7) Кто утверждает списание брака/инвентаризаций — нужен ли workflow (заявка→утверждение) или достаточно ролевого ограничения?
8) Порог «мало»: глобальный или per‑medication? Оповещения?
9) Бывает ли списание без привязки к приёму/пациенту? Нужно ли разрешать?

§4. Решения (записано дословно по вашему входу)

1. Expense (критично): вариант (b). Expense в Этапе 3 не создаём. StockReceipt.total_cost рассчитывается и хранится (сумма StockBatch.purchase_price * quantity_received). Этап 4 задним числом пройдётся по истории StockReceipt и создаст Expense при необходимости. Обоснование: нет окончательного анализа бухгалтерии; проектировать Expense заранее дорого.

2. Billable‑препарат → Invoice (критично): вариант (a). Вносим миграцию: InvoiceItem.service_id становится NULLABLE; добавляется medication_id (FK -> Medication, NULLABLE). Вводится CHECK‑constraint: заполнено ровно одно из двух (service_id IS NOT NULL XOR medication_id IS NOT NULL). name_snapshot/price_snapshot/discount_amount/line_total остаются универсальными и переиспользуются. Миграция аддитивна и не ломает существующие счета.

3. Prescription vs StockMovement (критично): вариант (c), гибрид. Prescription остаётся свободным текстом; добавляем необязательное поле medication_id (nullable FK) и необязательную ссылку на связанный StockMovement, если выдача происходила сразу. Отдельно реализуется действие "отпустить со склада" (StockMovement.type = 'dispense') в UI, которое создаёт списание по выбранному Medication. Это позволяет покрыть и случаи "рецепт на аптеку снаружи", и случаи выдачи из склада клиники.

4. Кто оформляет приход: reception + head_doctor. Отдельного утверждения прихода нет — приход считается фактом (накладная поставщика).

5. Единицы измерения: свободная строка Medication.unit, без конверсий на этом этапе.

6. FEFO: автоматический выбор партии системой (партию с ближайшим сроком годности). Запрещено списывать из просроченной партии. Списание проверяет остаток партии и выполняется в транзакции с блокировкой строки партии.

7. Утверждение брака/инвентаризации:
   - Инвентаризация (inventory_adjust): требует причины и обязательного утверждения head_doctor (workflow pending → approved/declined), по аналогии с RefundRequest.
   - Списание брака/просрочки (write_off_defect/write_off_expired): требует причины, но выполняется немедленно без отдельного шага утверждения. Каждое движение логируется в AuditLog.

8. Порог «мало»: глобальный дефолт через .env (DEFAULT_LOW_STOCK_THRESHOLD) + поле Medication.min_stock_level (nullable) для переопределения. Оповещений в Этапе 3 не делаем — только визуальный бейдж на дашборде.

9. Списание без привязки к приёму/пациенту: разрешаем. StockMovement содержит nullable patient_id и appointment_id; movement_type описывает семантику списания.

§4.1. Решения, принятые самостоятельно (требуют вашего ok)

Ниже перечислены технические допущения/реализации, которые технически необходимы для реализации модели и не были явно решены в плане — прошу подтвердить или отклонить.

A. Источник правды по остаткам: единственным источником правды по остаткам является регистр движений — таблица StockMovement. Остатки партий и медикаментов не хранятся в отдельной колонке; текущий остаток партии вычисляется как SUM(quantity) по StockMovement WHERE batch_id = X. Это согласуется с политикой проекта (docs/IBNSINA_DEVELOPMENT_PLAN (1).md §5 п.3) — "Остаток склада — производная от регистра движений". Для скорости будет создан индекс на StockMovement.batch_id.

B. StockBatch структура: каждая приходная позиция генерирует одну или несколько StockBatch (включая purchase_price, quantity_received, expiry_date, supplier_lot). StockReceipt хранит шапку прихода и список позиций (отдельная таблица StockReceiptItem).

C. При выдаче (dispense) система в транзакции выбирает партии по FEFO (expiry_date ASC) и создаёт соответствующие StockMovement строки, блокируя выбранные партии (SELECT FOR UPDATE) для предотвращения race conditions. Остатки не уменьшаются в отдельном поле, а отражаются суммой движений.

D. Для упрощения миграций и тестирования: частичные/условные индексы и ограничения, которые будут созданы в миграциях, также будут отражены в SQLAlchemy моделях (__table_args__), чтобы pytest при Base.metadata.create_all() увидел их.

E. No unit conversions: полагаемся на единицу в Medication.unit и не поддерживаем атрибутивные конверсии (вроде 1 коробка = 10 блистеров) в этом этапе.

F. Audit: каждая запись StockMovement и любые операции, влияющие на остатки, вызывают record_audit() согласно существующему контракту проекта.

G. RBAC (требует вашего подтверждения): в соответствии с замечанием пользователя — уточнения по правам и назначению ролей:
  - accountant: в Этапе 3 не имеет прав на склад (ни просмотр, ни действия).
  - admin: в Этапе 3 не включается в бизнес‑функции склада; администрация приложения остаётся вне этого предметного поля (техническое администрирование отдельно).
  - dispense: операции dispense выполняют только doctor (форма осмотра) и nurse (карточка процедур). Reception не выполняет dispense.
  - reception: отвечает за ввод приходов (StockReceipt) и за списание брака/просрочки.

Пожалуйста, подтвердите A–G (по всем разом или по пунктам отдельно), либо укажите правки.

§5. Финализированная модель данных (предложение)

1) Medication
- id: PK
- code: string, nullable/unique (опционально внешняя номенклатура)
- name: string, not null
- unit: string, nullable (напр., 'таб', 'мл', 'флакон')
- manufacturer: string, nullable
- min_stock_level: integer, nullable
- is_controlled: boolean, default false (опционально для списаний)
- created_at, updated_at

2) StockReceipt (шапка прихода)
- id: PK
- supplier_name: string
- invoice_number: string, nullable
- received_by_id: FK -> Employee (тот, кто ввёл приход)
- received_at: timestamp
- total_cost_tiyn: BigInteger (сумма в тиынах)
- created_at, updated_at

3) StockReceiptItem
- id: PK
- stock_receipt_id: FK -> StockReceipt
- medication_id: FK -> Medication
- supplier_lot: string, nullable
- purchase_price_tiyn: BigInteger (цена за единицу в тиынах)
- quantity_received: integer
- expiry_date: date, nullable
- created_at, updated_at

4) StockBatch
- id: PK
- medication_id: FK -> Medication
- receipt_item_id: FK -> StockReceiptItem (nullable?) — рекомендуется связать
- supplier_lot: string, nullable
- purchase_price_tiyn: BigInteger
- quantity_received: integer
- expiry_date: date, nullable
- created_at, updated_at

Примечание: Поле quantity_remaining НЕ хранится (см. §4.1.A). Текущий остаток партии рассчитывается как SUM(StockMovement.quantity) WHERE batch_id = this.id; для ускорения запросов будет создан индекс на StockMovement.batch_id.

5) StockMovement
- id: PK
- medication_id: FK -> Medication
- batch_id: FK -> StockBatch, nullable (для перемещений, не привязанных к конкретной партии — может быть NULL для inventory_adjust)
- movement_type: enum/string (values: 'receipt', 'dispense', 'transfer', 'write_off_defect', 'write_off_expired', 'inventory_adjust')
- quantity: integer (положительное число для приходов, отрицательное для расхода? — предлагаем хранить sign-aware quantity: positive for in, negative for out)
- unit_price_tiyn: BigInteger, nullable (ценовой снимок для приходов/списаний)
- patient_id: FK -> Patient, nullable
- appointment_id: FK -> Appointment, nullable
- created_by_id: FK -> Employee
- reason: text, nullable
- created_at: timestamp

Индексы/ограничения:
- Индекс на StockMovement.batch_id (остаток партии = SUM(quantity) по этому индексу).
- Индекс на StockMovement.medication_id (остаток по медикаменту в целом — для дашборда «мало»/«истекает»/«просрочено», агрегируется по всем партиям медикамента).

- Изменения в InvoiceItem (миграция по вопросу 2 — обязательно):
  - Поле service_id делается NULLABLE (ALTER COLUMN SET NULL).
  - Добавляется поле medication_id: nullable FK -> Medication.
  - Добавляется CHECK‑constraint, гарантирующий, что заполнено ровно одно из двух полей (service_id IS NOT NULL) != (medication_id IS NOT NULL). Пример SQL:

    ALTER TABLE invoice_item ADD COLUMN medication_id bigint NULL REFERENCES medication(id);
    ALTER TABLE invoice_item ALTER COLUMN service_id DROP NOT NULL;
    ALTER TABLE invoice_item ADD CONSTRAINT invoice_item_service_or_medication_chk CHECK (
      (service_id IS NOT NULL)::int + (medication_id IS NOT NULL)::int = 1
    );

  - Тесты миграции: удостовериться, что миграция обратима (downgrade удаляет medication_id и возвращает service_id NOT NULL), что существующие invoices остаются валидными, и что new rows удовлетворяют CHECK.
  - Обновление SQLAlchemy модели: back/app/models/invoice_item.py получает новое поле medication_id = mapped_column(ForeignKey('medication.id'), nullable=True) и __table_args__ включает аналогичный CHECK‑constraint, чтобы Base.metadata.create_all() в pytest видел ограничение.

- ENUM‑типы создаются идемпотентно в миграциях, как в других этапах (использовать DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;). 

Примечание: Остатки вычисляются исключительно по сумме StockMovement (единственный источник истины, §4.1.A) — никакого хранимого/кэшируемого поля остатка нигде в модели нет, ни на StockBatch, ни на Medication.

§6. План коммитов (высокоуровнево) — backend сначала, тесты рядом, frontend поверх готового API

Перед началом реализации — подтвердите документ и технические допущения §4.1.

Предлагаемый набор коммитов (каждый коммит сопровождается миграцией/тестами/smoke):

Commit 1 — Создать модели базового каталога
- Файлы: back/app/models/medication.py, back/app/schemas/medication.py, back/app/crud/medication.py
- Модель Medication + миграция создания таблицы
- Тесты: unit tests для CRUD Medication (pytest)
- Проверки: pytest, миграция upgrade/downgrade, smoke (создать medication через API)

Commit 2 — StockReceipt и StockReceiptItem + StockBatch
- Файлы: back/app/models/stock_receipt.py, stock_receipt_item.py, stock_batch.py, миграция создания таблиц
- API: POST /stock/receipts (shallow) для создания прихода с позициями
- Тесты: создание прихода, проверка total_cost_tiyn, создание batch записей
- Проверки: pytest, миграции upgrade/downgrade, smoke (curl создать приход)

Commit 3 — StockMovement + логика приёма
- Файлы: back/app/models/stock_movement.py, services/stock_service.py
- Логика: при создании StockReceiptItem создаётся соответствующий StockBatch и StockMovement (type=receipt). Остатки отражаются через регистр движений (StockMovement), никакое поле quantity_remaining не хранится.
- Тесты: целостность остатков (проверка сумм движений), audit запись
- Проверки: pytest, миграции, smoke

Commit 4 — Dispense (выдача) + FEFO автоматический выбор партий
- Файлы: back/app/api/stock_dispense.py, services/dispense.py, миграции если нужны
- Логика: endpoint для dispense — выбирает партии FEFO, создаёт соответствующие StockMovement(type=dispense) записи и блокирует партии (SELECT FOR UPDATE). Остатки не хранятся в партии, они вычисляются суммированием движений.
- Тесты: dispense создаёт корректные StockMovement записи; запрещено списание из просроченной партии; конкурентные сценарии (simple race) проверяются.
- Проверки: pytest (включая конкурентный тест), миграции, smoke (реальный login по роли doctor/nurse и dispense)

Commit 5 — InvoiceItem миграция + интеграционная логика
- Файлы: alembic migration (make service_id nullable + add medication_id + CHECK), back/app/models/invoice_item.py обновление модели
- Тесты: миграция обратима; создание invoice с medication_id; проверка CHECK
- Проверки: миграции upgrade/downgrade (реверсивность), pytest

Commit 6 — Prescription расширение (medication_id, optional link to movement)
- Файлы: back/app/models/prescription.py модификация, миграция, API изменения
- Логика: поле medication_id nullable, поле stock_movement_id nullable
- Тесты: связь prescription→movement когда выдано
- Проверки: pytest, миграции

Commit 7 — Инвентаризация и workflow approval
- Файлы: back/app/models/inventory_adjustment.py (или reuse StockMovement + отдельный workflow), API endpoints для creating request и head_doctor approval
- Тесты: pending→approved flow, влияние на остатки
- Проверки: pytest, миграции, smoke (approval под head_doctor)

Commit 8 — Пороги и UI‑флаги (backend support)
- Файлы: back/app/config, medication миграция, API для чтения low stock
- Тесты: override per‑medication, fallback на .env
- Проверки: pytest, smoke (dashboard badge)

Commit 9 — Дополнительные тесты, документация, финальная проверка
- Файлы: тесты e2e, обновление docs/PHASE3_ANALYSIS.md (плюс CHANGELOG)
- Все проверки: полная цепочка миграций от нуля (upgrade head → downgrade base → upgrade head), полный pytest, живой smoke по ролям (login + дисконтные сценарии)

§7. Детали проверки и требования к каждому коммиту

Каждый коммит сопровождается:
- Alembic migration(s): писать вручную, убедиться в идемпотентных ENUM и корректных DROP при downgrade
- Проверкой миграций: upgrade → downgrade → upgrade (на scratch DB)
- Запуском полного pytest набора
- Живым smoke‑тестом против dev‑БД: curl + реальные login/роль (reception/head_doctor), проверка netstat/listening если запускается локальный сервер
- Подробным сообщением коммита на русском с перечислением: что сделано, почему, какие тесты выполнены и результаты (скриншоты/логи/таблицы), список затронутых файлов

§8. Следующие шаги

1. Подтвердите, пожалуйста, раздел §4.1 (технические допущения A–G). Если что-то из A–G не устраивает — укажите, что изменить.
2. Если подтверждаете — ответьте "продолжай" и я начну реализацию commit‑by‑commit, начиная с Commit 1 (модель Medication). В противном случае укажите правки.

----

Файл подготовлен автоматически на основании вашего входа и стандартного проектного процесса. Ожидаю вашего подтверждения по §4.1 и общее "продолжай" для старта реализации.
