"""Большой набор демо-данных для ручного тестирования (dev-БД).

    python seed_demo.py             # добавить демо-данные (если их ещё нет)
    python seed_demo.py --reset     # удалить прежние демо-данные и создать заново
    python seed_demo.py --reset-only

Что создаётся: врачи/медсестры/регистраторы/бухгалтер с графиками и логинами,
прейскурант, ~800 пациентов с медданными, ~8 тыс. приёмов за период
[-DAYS_BACK; +DAYS_FWD] дней, счета во всех статусах, платежи, кассовые смены
(в т.ч. одна открытая сегодня), заявки на возврат, черновики со скидкой,
ждущей подтверждения.

Принципы:
  * Данные согласованы с инвариантами приложения: деньги — тиыны (int),
    платежи append-only (возврат = отрицательная запись с reversal_of),
    статус счёта выводится из платежей так же, как в routers/invoices.py,
    наличные привязаны к смене, одна открытая смена на кассира, один приём
    «идёт сейчас» на врача, слот врача не занят дважды.
  * Скрипт детерминирован (фиксированный seed) — повторный запуск после
    --reset даёт тот же набор.
  * Демо-записи помечены: сотрудники — email @demo.ibnsina.local, пациенты —
    updated_by = служебный сотрудник seeder@demo.ibnsina.local. --reset удаляет
    только их (и всё, что к ним привязано, включая записи, созданные вручную
    для демо-пациентов). Ваши настоящие данные не затрагиваются.
  * «Сегодня» наполняется как рабочий день независимо от реального времени:
    виртуальные часы = реальное время, но не раньше 13:30 и не позже 19:30.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from pathlib import Path

from sqlalchemy import text

from app.database import SessionLocal
from app.models import (
    Appointment,
    AppointmentStatus,
    CashShift,
    CashShiftStatus,
    DiseaseTagVariant,
    DoctorEducation,
    DoctorProfile,
    Employee,
    EmployeeRole,
    EmployeeStatus,
    HealthMetric,
    Hospitalization,
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    Patient,
    PatientAllergy,
    PatientDisease,
    Payment,
    PaymentMethod,
    Prescription,
    RefundRequest,
    RefundRequestStatus,
    Schedule,
    SalaryType,
    Service,
    ServiceCategory,
    User,
    Vaccination,
)
from app.security import hash_password

# ----------------------------------------------------------------- параметры

N_PATIENTS = 800
DAYS_BACK = 45
DAYS_FWD = 14

DEMO_PASSWORD = "demo123"
DEMO_DOMAIN = "demo.ibnsina.local"
MARKER_EMAIL = f"seeder@{DEMO_DOMAIN}"
CLINIC = "Городская поликлиника №12, г. Астана, ул. Туран 24"

RNG = random.Random(20261025)
TODAY = date.today()


def _virtual_clock() -> datetime:
    now = datetime.now().replace(microsecond=0)
    floor = datetime.combine(TODAY, time(13, 30))
    ceil = datetime.combine(TODAY, time(19, 30))
    return min(max(now, floor), ceil)


CLOCK = _virtual_clock()
DAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_LABELS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]


def at(d: date, hhmm: str) -> datetime:
    h, m = hhmm.split(":")
    return datetime.combine(d, time(int(h), int(m)))


def tiyn(tenge: int) -> int:
    return tenge * 100


# ------------------------------------------------------------ справочники ФИО

MALE_NAMES = [
    "Нурлан", "Ерлан", "Айдар", "Данияр", "Руслан", "Асхат", "Бауыржан", "Алишер",
    "Тимур", "Марат", "Сергей", "Андрей", "Дмитрий", "Алексей", "Игорь", "Виктор",
    "Олег", "Максим", "Артём", "Ильяс", "Арман", "Ержан", "Серик", "Кайрат",
    "Талгат", "Бекзат", "Азамат", "Мейрам", "Дастан", "Санжар",
]
FEMALE_NAMES = [
    "Айгерим", "Динара", "Гульнара", "Асель", "Мадина", "Айжан", "Салтанат", "Алия",
    "Жанар", "Сауле", "Анна", "Елена", "Ольга", "Наталья", "Марина", "Татьяна",
    "Ирина", "Светлана", "Екатерина", "Юлия", "Мария", "Камила", "Томирис", "Аружан",
    "Назгуль", "Зарина", "Дана", "Карина", "Лаура", "Ляззат",
]
SURNAMES = [
    "Ахметов", "Касымов", "Жумабеков", "Садыков", "Ибраев", "Нурпеисов", "Омаров",
    "Серикбаев", "Тулеуов", "Байжанов", "Абдрахманов", "Бектурганов", "Даулетов",
    "Ермеков", "Жаксыбеков", "Искаков", "Кенжебаев", "Мукашев", "Нургалиев", "Оспанов",
    "Рахимов", "Сабитов", "Темиргалиев", "Утебаев", "Хасенов", "Шаяхметов",
    "Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев",
    "Соколов", "Михайлов", "Новиков", "Фёдоров", "Морозов", "Волков", "Алексеев",
    "Лебедев", "Семёнов", "Егоров", "Павлов", "Козлов", "Степанов", "Николаев",
    "Орлов", "Андреев", "Макаров", "Никитин", "Ким", "Пак", "Цой",
]
GENDERLESS_SURNAMES = {"Ким", "Пак", "Цой"}
STREETS = [
    "пр. Республики", "ул. Сарыарка", "ул. Кенесары", "ул. Бейбитшилик", "ул. Туран",
    "пр. Абая", "ул. Достык", "ул. Иманова", "ул. Сыганак", "пр. Кабанбай батыра",
    "ул. Мангилик Ел", "ул. Керей и Жанибек хандар",
]
AREAS = [f"Участок №{i}" for i in range(1, 9)]
BLOOD = ["O(I)", "A(II)", "B(III)", "AB(IV)"]
MINUS = "−"  # в seed.py резус-минус записан именно этим знаком


def patronymic(father: str, female: bool) -> str:
    if father.endswith(("й", "ь")):
        stem = father[:-1]
        return stem + ("евна" if female else "евич")
    return father + ("овна" if female else "ович")


def surname_for(base: str, female: bool) -> str:
    if female and base not in GENDERLESS_SURNAMES:
        return base + "а"
    return base


def person(female: bool) -> tuple[str, str, str, str]:
    """-> (ФИО, «Фамилия И.О.», имя, отчество)."""
    surname = surname_for(RNG.choice(SURNAMES), female)
    name = RNG.choice(FEMALE_NAMES if female else MALE_NAMES)
    patr = patronymic(RNG.choice(MALE_NAMES), female)
    full = f"{surname} {name} {patr}"
    short = f"{surname} {name[0]}.{patr[0]}."
    return full, short, name, patr


def phone() -> str:
    return (
        f"+7 ({RNG.choice(['701', '702', '705', '707', '747', '775', '777', '778'])}) "
        f"{RNG.randint(100, 999)}-{RNG.randint(10, 99)}-{RNG.randint(10, 99)}"
    )


def iin_checksum(first11: list[int]) -> int | None:
    s = sum(d * w for d, w in zip(first11, range(1, 12))) % 11
    if s == 10:
        s = sum(d * w for d, w in zip(first11, [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2])) % 11
        if s == 10:
            return None
    return s


def make_iin(birth: date, female: bool, used: set[str]) -> str:
    century_digit = {
        (1900, False): 3, (1900, True): 4, (2000, False): 5, (2000, True): 6,
    }[((birth.year // 100) * 100, female)]
    while True:
        digits = [int(c) for c in birth.strftime("%y%m%d")] + [century_digit]
        digits += [RNG.randint(0, 9) for _ in range(4)]
        check = iin_checksum(digits)
        if check is None:
            continue
        iin = "".join(map(str, digits + [check]))
        if iin not in used:
            used.add(iin)
            return iin


# --------------------------------------------------------------- прейскурант

# code, name, category, цена в тенге, длительность, активна
SERVICES = [
    ("CONS-THER", "Приём терапевта", "consultation", 6000, 30, True),
    ("CONS-PED", "Приём педиатра", "consultation", 6000, 30, True),
    ("CONS-CARD", "Приём кардиолога", "consultation", 9000, 30, True),
    ("CONS-NEU", "Приём невролога", "consultation", 9000, 30, True),
    ("CONS-LOR", "Приём оториноларинголога", "consultation", 8000, 30, True),
    ("CONS-OPH", "Приём офтальмолога", "consultation", 8000, 30, True),
    ("CONS-END", "Приём эндокринолога", "consultation", 9000, 30, True),
    ("CONS-GYN", "Приём гинеколога", "consultation", 9000, 30, True),
    ("CONS-SUR", "Приём хирурга", "consultation", 8500, 30, True),
    ("CONS-REPEAT", "Повторный приём (в течение 14 дней)", "consultation", 4000, 20, True),
    ("LAB-OAK", "Общий анализ крови", "analysis", 1800, None, True),
    ("LAB-OAM", "Общий анализ мочи", "analysis", 1200, None, True),
    ("LAB-GLU", "Глюкоза крови", "analysis", 1000, None, True),
    ("LAB-CHOL", "Холестерин общий", "analysis", 1500, None, True),
    ("LAB-TTG", "ТТГ (тиреотропный гормон)", "analysis", 3500, None, True),
    ("LAB-HBA1C", "Гликированный гемоглобин HbA1c", "analysis", 5000, None, True),
    ("LAB-CRP", "С-реактивный белок", "analysis", 1800, None, True),
    ("LAB-COAG", "Коагулограмма", "analysis", 4000, None, True),
    ("LAB-VITD", "Витамин D (25-OH)", "analysis", 8500, None, True),
    ("LAB-FERR", "Ферритин", "analysis", 3500, None, True),
    ("LAB-SMEAR", "Мазок на флору", "analysis", 2500, None, True),
    ("LAB-PSA", "ПСА общий", "analysis", 4500, None, False),
    ("PROC-ECG", "ЭКГ с расшифровкой", "procedure", 3500, 20, True),
    ("PROC-HOLTER", "Холтеровское мониторирование ЭКГ", "procedure", 15000, 30, True),
    ("PROC-USG-ABD", "УЗИ органов брюшной полости", "procedure", 8000, 30, True),
    ("PROC-USG-THY", "УЗИ щитовидной железы", "procedure", 5500, 20, True),
    ("PROC-USG-HEART", "УЗИ сердца (ЭхоКГ)", "procedure", 10000, 30, True),
    ("PROC-USG-PELV", "УЗИ органов малого таза", "procedure", 7000, 30, True),
    ("PROC-EEG", "ЭЭГ", "procedure", 9000, 40, True),
    ("PROC-SPIRO", "Спирометрия", "procedure", 4500, 20, True),
    ("PROC-XRAY", "Рентген грудной клетки", "procedure", 5000, 15, True),
    ("PROC-INJ", "Внутримышечная инъекция", "procedure", 1000, 10, True),
    ("PROC-DRIP", "Внутривенная капельница", "procedure", 4500, 60, True),
    ("PROC-DRESS", "Перевязка", "procedure", 2000, 15, True),
    ("PROC-SUTURE", "Снятие швов", "procedure", 2500, 15, True),
    ("PROC-EAR", "Промывание уха", "procedure", 3000, 20, True),
    ("PROC-VISION", "Проверка остроты зрения", "procedure", 1500, 15, True),
    ("PROC-VACC", "Введение вакцины", "procedure", 2000, 10, True),
    ("OTHER-CERT", "Справка (форма 086/у)", "other", 3000, 15, True),
    ("OTHER-POOL", "Справка в бассейн", "other", 2500, 15, True),
    ("OTHER-SICK", "Оформление больничного листа", "other", 2000, 10, True),
    ("OTHER-COPY", "Копия медицинской карты", "other", 1500, 10, False),
]
EXTRAS = {
    "ther": ["LAB-OAK", "LAB-OAM", "PROC-ECG", "LAB-GLU", "PROC-INJ", "OTHER-SICK", "LAB-CRP"],
    "ped": ["LAB-OAK", "LAB-OAM", "PROC-VACC", "OTHER-POOL", "OTHER-CERT"],
    "card": ["PROC-ECG", "PROC-HOLTER", "PROC-USG-HEART", "LAB-CHOL", "LAB-COAG"],
    "neu": ["PROC-EEG", "LAB-VITD", "PROC-INJ"],
    "lor": ["PROC-EAR", "LAB-OAK", "LAB-CRP"],
    "oph": ["PROC-VISION", "OTHER-CERT"],
    "end": ["LAB-TTG", "LAB-HBA1C", "PROC-USG-THY", "LAB-GLU", "LAB-CHOL", "LAB-VITD"],
    "gyn": ["PROC-USG-PELV", "LAB-SMEAR", "LAB-FERR"],
    "sur": ["PROC-DRESS", "PROC-SUTURE", "PROC-USG-ABD"],
}
GENERAL_EXTRAS = ["LAB-OAK", "LAB-OAM", "PROC-ECG", "LAB-GLU", "LAB-CHOL", "PROC-USG-ABD",
                  "PROC-XRAY", "PROC-SPIRO", "PROC-DRIP", "LAB-VITD"]

# ------------------------------------------------------------------- персонал

# ключ, ФИО целиком (имя/отчество выводятся), специальность, должность, участок,
# кабинет, график, статус
DOCTORS = [
    ("ther", "Нурланов Берик Серикович", "Терапевт (04.01.001)", "Врач-терапевт", "Участок №1", "Кабинет 102", "allweek", "active"),
    ("ther", "Омарова Динара Кайратовна", "Терапевт (04.01.001)", "Врач-терапевт", "Участок №2", "Кабинет 104", "morning", "active"),
    ("ther", "Ким Елена Владимировна", "Терапевт (04.01.001)", "Врач-терапевт", "Участок №4", "Кабинет 106", "evening", "active"),
    ("ther", "Токтаров Ержан Маратович", "Терапевт (04.01.001)", "Врач-терапевт", "Участок №5", "Кабинет 108", "full", "active"),
    ("ther", "Сейтказина Айжан Нурлановна", "Терапевт (04.01.001)", "Врач-терапевт", "Участок №6", "Кабинет 110", "allweek", "active"),
    ("ped", "Петрова Ольга Сергеевна", "Педиатр (04.03.001)", "Врач-педиатр", "Участок №7", "Кабинет 112", "morning", "active"),
    ("card", "Абдрахманов Данияр Асханович", "Кардиолог (04.05.002)", "Врач-кардиолог", None, "Кабинет 201", "full", "active"),
    ("neu", "Жанибекова Салтанат Мейрамовна", "Невролог (04.06.001)", "Врач-невролог", None, "Кабинет 203", "allweek", "active"),
    ("lor", "Волков Андрей Игоревич", "Оториноларинголог (04.07.001)", "Врач-ЛОР", None, "Кабинет 205", "evening", "active"),
    ("oph", "Мусина Лаура Тимуровна", "Офтальмолог (04.08.001)", "Врач-офтальмолог", None, "Кабинет 207", "morning", "active"),
    ("sur", "Рахимов Тимур Алишерович", "Хирург (04.09.001)", "Врач-хирург", None, "Кабинет 209", "full", "on_leave"),
    ("gyn", "Иванова Марина Павловна", "Акушер-гинеколог (04.10.001)", "Врач-гинеколог", None, "Кабинет 211", "full", "fired"),
]
SCHEDULE_KINDS = {
    "morning": {d: ("08:00", "14:00") for d in range(6)},
    "evening": {d: ("14:00", "20:00") for d in range(5)},
    "full": {d: ("09:00", "18:00") for d in range(5)},
    "allweek": {d: ("08:00", "16:00") for d in range(7)},
}
# существующие врачи из seed.py: ключ специальности для них
EXISTING_DOCTOR_KEYS = {"sharipov@poliklinika12.kz": "end", "head_doctor@ibnsina.local": "ther"}

NURSES = ["Касымова Гульнара Рахимовна", "Белова Татьяна Андреевна", "Нургалиева Сауле Маратовна"]
RECEPTION = ["Алимова Жанар Ермековна", "Смагулова Аружан Бауыржановна", "Кузьмина Наталья Олеговна"]
ACCOUNTANT = "Темирбекова Асель Нурлановна"

EDUCATION_POOL = [
    ("НАО «Медицинский университет Астана»", "Специальность: Общая медицина"),
    ("НАО «Казахский национальный медицинский университет»", "Интернатура / клиническая ординатура"),
    ("РГП «Национальный научный центр развития здравоохранения»", "Повышение квалификации, 144 часа"),
    ("Курсы повышения квалификации по цифровому здравоохранению", "Дистанционный курс, 72 часа"),
]


def split_person(full: str) -> tuple[str, str, str, str]:
    surname, name, patr = full.split()
    return full, f"{surname} {name[0]}.{patr[0]}.", f"{name} {patr}", f"{surname[0]}{name[0]}"


# ------------------------------------------------------------ медицинские списки

COMPLAINTS = {
    "ther": ["Повышение температуры, кашель", "Головная боль, слабость", "Боль в горле", "Повышение артериального давления",
             "Боли в пояснице", "Одышка при нагрузке", "Заложенность носа, насморк", "Плановый осмотр, продление рецепта",
             "Головокружение", "Боль в животе после еды", "Справка для работы", "Кашель более недели"],
    "ped": ["Температура у ребёнка, насморк", "Кашель, осиплость голоса", "Плановый осмотр, прививка", "Сыпь на коже",
            "Боль в ушке", "Справка в школу/садик", "Нарушение стула", "Профилактический осмотр"],
    "card": ["Боли за грудиной", "Перебои в работе сердца", "Повышенное АД, головные боли", "Одышка, отёки на ногах",
             "Контроль после лечения", "Плановое наблюдение, ИБС"],
    "neu": ["Частые головные боли", "Головокружение, шум в ушах", "Боли в шее и плечах", "Онемение рук", "Нарушение сна",
            "Контроль после лечения"],
    "lor": ["Боль в ухе", "Заложенность носа", "Боль в горле при глотании", "Снижение слуха", "Кровотечения из носа"],
    "oph": ["Снижение остроты зрения", "Покраснение и зуд глаз", "Подбор очков", "Плановый осмотр глазного дна"],
    "end": ["Контроль сахара крови", "Увеличение щитовидной железы", "Прибавка веса", "Слабость, жажда",
            "Плановое наблюдение, диабет 2 типа", "Контроль гормонов щитовидной железы"],
    "gyn": ["Плановый осмотр", "Нарушение цикла", "Боли внизу живота", "Консультация по контрацепции"],
    "sur": ["Боль в колене", "Травма кисти", "Рана, нужна перевязка", "Снятие швов", "Узелок под кожей"],
}
CANCEL_REASONS = ["Пациент перенёс приём", "Не явился на приём", "Заболел врач", "Пациент отказался", "Ошибка записи",
                  "Не дозвонились для подтверждения"]
MEDICATIONS = [
    ("Парацетамол", "500 мг", "по 1 таб. при температуре, не более 4 раз в сутки"),
    ("Амоксициллин", "500 мг", "по 1 капс. 3 раза в день, 7 дней"),
    ("Ибупрофен", "400 мг", "по 1 таб. 2–3 раза в день после еды, 5 дней"),
    ("Лозартан", "50 мг", "по 1 таб. 1 раз в день утром, постоянно"),
    ("Амлодипин", "5 мг", "по 1 таб. 1 раз в день"),
    ("Метформин", "850 мг", "по 1 таб. 2 раза в день во время еды"),
    ("Омепразол", "20 мг", "по 1 капс. утром натощак, 14 дней"),
    ("Цетиризин", "10 мг", "по 1 таб. на ночь, 10 дней"),
    ("Аторвастатин", "20 мг", "по 1 таб. вечером, постоянно"),
    ("Левотироксин", "50 мкг", "по 1 таб. утром натощак"),
    ("Ацетилцистеин", "600 мг", "по 1 пакетику 1 раз в день, 7 дней"),
    ("Витамин D3", "2000 МЕ", "по 1 капле ежедневно, 2 месяца"),
    ("Назальный спрей (морская вода)", "—", "по 2 впрыскивания в каждую ноздрю 3–4 раза в день"),
    ("Диклофенак гель", "1%", "наносить на область боли 2–3 раза в день"),
]
ALLERGIES = ["Пенициллин", "Аспирин", "Лактоза", "Пыльца", "Орехи", "Цитрусовые", "Шерсть животных", "Пыль", "Йод", "Латекс"]
DISEASES = [
    ("Гипертония", DiseaseTagVariant.green), ("Ожирение", DiseaseTagVariant.purple),
    ("Астма", DiseaseTagVariant.blue), ("ХОБЛ", DiseaseTagVariant.yellow), ("ИБС", DiseaseTagVariant.red),
    ("Сахарный диабет 2 типа", DiseaseTagVariant.orange), ("Гипотиреоз", DiseaseTagVariant.blue),
    ("Гастрит", DiseaseTagVariant.yellow), ("Остеохондроз", DiseaseTagVariant.green),
]
VACCINES = [
    ("Грипп (сезонная)", "Гриппол Плюс, серия ГФ-2025-01"), ("Пневмококк", "Пневмовакс 23, серия ПВ-1022"),
    ("АКДС", "Инфанрикс, серия АК-5521"), ("Гепатит B", "Энджерикс B, серия ГB-3310"),
    ("Корь-краснуха-паротит", "Приорикс, серия КК-7710"), ("COVID-19", "Спутник Лайт, серия СЛ-0912"),
    ("Столбняк", "АС-анатоксин, серия АС-1180"), ("БЦЖ", "БЦЖ, серия БЦ-0207"),
]
DEPARTMENTS = ["Терапевтическое отделение", "Кардиологическое отделение", "Неврологическое отделение", "Хирургическое отделение"]


def weighted(options: list[tuple[object, float]]):
    return RNG.choices([o for o, _ in options], weights=[w for _, w in options])[0]


# ============================================================ сброс демо-данных

def reset_demo(db) -> None:
    """Удаляет только демо-данные (см. маркеры в docstring)."""
    marker = db.execute(text("select id from employees where email = :e"), {"e": MARKER_EMAIL}).scalar()
    demo_emp = "select id from employees where email like :d"
    p = {"d": f"%@{DEMO_DOMAIN}"}
    if marker is None:
        print("демо-данных нет — удалять нечего")
        return
    pats = "select id from patients where updated_by_id = :m"
    pm = {"m": marker}
    # счета демо-пациентов и счета, выставленные демо-кассирами (в т.ч. прежним пациентам)
    invs = f"select id from invoices where patient_id in ({pats}) or created_by_id in ({demo_emp})"
    demo_shifts = f"select id from cash_shifts where cashier_employee_id in ({demo_emp})"
    pay_ids = f"select id from payments where invoice_id in ({invs}) or cash_shift_id in ({demo_shifts})"
    steps = [
        (f"delete from refund_requests where invoice_id in ({invs}) or payment_id in ({pay_ids})", pm | p),
        (f"delete from payments where id in ({pay_ids})", pm | p),
        (f"delete from invoice_items where invoice_id in ({invs})", pm | p),
        (f"delete from invoices where id in ({invs})", pm | p),
        (f"delete from prescriptions where appointment_id in (select id from appointments where patient_id in ({pats}))", pm),
        (f"delete from appointments where patient_id in ({pats})", pm),
        (f"delete from health_metrics where patient_id in ({pats})", pm),
        (f"delete from vaccinations where patient_id in ({pats})", pm),
        (f"delete from patient_allergies where patient_id in ({pats})", pm),
        (f"delete from patient_diseases where patient_id in ({pats})", pm),
        (f"delete from hospitalizations where patient_id in ({pats})", pm),
        (f"delete from patients where updated_by_id = :m", pm),
        # смены демо-кассиров (платежи на них уже удалены)
        (f"delete from cash_shifts where cashier_employee_id in ({demo_emp})", p),
        (f"delete from prescriptions where appointment_id in (select id from appointments where employee_id in ({demo_emp}))", p),
        (f"update appointments set created_by_id = null where created_by_id in ({demo_emp})", p),
        (f"update appointments set cancelled_by_id = null where cancelled_by_id in ({demo_emp})", p),
        (f"delete from appointments where employee_id in ({demo_emp})", p),
        (f"delete from hospitalizations where employee_id in ({demo_emp})", p),
        (f"delete from schedules where employee_id in ({demo_emp})", p),
        (f"delete from doctor_education where doctor_profile_id in (select id from doctor_profiles where employee_id in ({demo_emp}))", p),
        (f"delete from doctor_profiles where employee_id in ({demo_emp})", p),
        (f"delete from audit_log where actor_user_id in (select id from users where employee_id in ({demo_emp}))", p),
        (f"delete from refresh_tokens where user_id in (select id from users where employee_id in ({demo_emp}))", p),
        (f"delete from users where employee_id in ({demo_emp})", p),
        (f"delete from employees where email like :d", p),
    ]
    for sql, params in steps:
        res = db.execute(text(sql), params)
        if res.rowcount:
            print(f"  - {sql.split(' where')[0].replace('delete from ', '')}: {res.rowcount}")
    codes = [s[0] for s in SERVICES]
    db.execute(
        text("delete from services where code = any(:c) and id not in (select service_id from invoice_items)"),
        {"c": codes},
    )
    db.execute(text("update services set is_active = false where code = any(:c)"), {"c": codes})
    # номера счетов не должны «расти» от пересоздания демо-данных: возвращаем
    # счётчик к максимальному из оставшихся счетов (нумерация погодовая)
    db.execute(text(
        "update invoice_number_counters c set last_number = coalesce(("
        "select max(cast(split_part(invoice_number, '-', 2) as int)) from invoices "
        "where invoice_number like c.year::text || '-%'), 0)"))
    db.commit()
    print("демо-данные удалены")


# ===================================================================== генерация

class Ctx:
    """Общее состояние генерации."""

    def __init__(self, db):
        self.db = db
        self.marker: Employee | None = None
        self.head_doctor: Employee | None = None
        self.doctors: list[dict] = []          # {emp, key, area, sched, until, from_}
        self.nurses: list[Employee] = []
        self.reception: list[Employee] = []
        self.services: dict[str, Service] = {}
        self.patients: list[Patient] = []
        self.patients_by_area: dict[str, list[Patient]] = defaultdict(list)
        self.appts: list[Appointment] = []


def create_people(ctx: Ctx) -> None:
    db = ctx.db
    pw_hash = hash_password(DEMO_PASSWORD)

    def make_employee(full, role, position, email, status="active", fired=None, hired_days=None):
        full_name, short, fnp, initials = split_person(full)
        emp = Employee(
            full_name=full_name, first_name_patronymic=fnp, short_name=short, initials=initials,
            role=role, position_title=position, phone=phone(), email=email,
            hired_at=TODAY - timedelta(days=hired_days or RNG.randint(200, 3000)),
            fired_at=fired, status=EmployeeStatus(status),
            salary_type=weighted([(SalaryType.fixed, 5), (SalaryType.percent, 2), (SalaryType.fixed_plus_percent, 3)])
            if role == EmployeeRole.doctor else SalaryType.fixed,
            base_salary=tiyn(RNG.choice([250000, 300000, 350000, 400000, 450000])),
        )
        emp.revenue_percent = RNG.choice([20, 25, 30, 35]) if emp.salary_type != SalaryType.fixed else None
        db.add(emp)
        db.flush()
        if email != MARKER_EMAIL:
            db.add(User(email=email, full_name=full_name, password_hash=pw_hash, employee_id=emp.id))
        return emp

    # служебный сотрудник-маркер (без учётной записи)
    marker = Employee(
        full_name="Служебный Демо Загрузчик", first_name_patronymic="Демо Загрузчик",
        short_name="Загрузчик Д.З.", initials="ЗД", role=EmployeeRole.admin,
        position_title="Служебный (демо-данные)", email=MARKER_EMAIL, hired_at=TODAY,
        status=EmployeeStatus.active, salary_type=SalaryType.fixed,
    )
    db.add(marker)
    db.flush()
    ctx.marker = marker

    ctx.head_doctor = db.query(Employee).filter(Employee.role == EmployeeRole.head_doctor).first()

    for i, (key, full, specialty, position, area, office, sched_kind, status) in enumerate(DOCTORS, 1):
        fired = TODAY - timedelta(days=25) if status == "fired" else None
        emp = make_employee(full, EmployeeRole.doctor, position, f"doctor{i}@{DEMO_DOMAIN}", status, fired)
        profile = DoctorProfile(
            employee_id=emp.id, specialty=specialty, qualification_category=RNG.choice(["Высшая", "Первая", "Вторая"]),
            area=area, office=office, workplace=CLINIC,
            license_number=f"{RNG.randint(10000, 99999)}-МД", license_valid_until=f"31.12.{RNG.randint(2027, 2030)}",
            certificate_number=f"№ СС-{RNG.randint(2020, 2025)}-{RNG.randint(100, 999):05d}",
            certificate_valid_until=f"15.09.{RNG.randint(2027, 2030)}",
            about=f"{position} с опытом работы {RNG.randint(3, 25)} лет. Приём ведёт в {office.lower()}.",
            experience_years=RNG.randint(3, 25),
        )
        db.add(profile)
        db.flush()
        for year, (title, desc) in zip(["2005", "2008", "2019", "2023"], RNG.sample(EDUCATION_POOL, 3)):
            db.add(DoctorEducation(doctor_profile_id=profile.id, year=str(int(year) + RNG.randint(0, 6)), title=title, description=desc))
        sched = SCHEDULE_KINDS[sched_kind]
        for d in range(7):
            on = d in sched
            start, end = sched.get(d, ("08:00", "14:00"))
            db.add(Schedule(employee_id=emp.id, day_id=DAY_IDS[d], label=DAY_LABELS[d], enabled=on, start=start, end=end))
        ctx.doctors.append({
            "emp": emp, "key": key, "area": area, "sched": {d: v for d, v in sched.items()},
            "from": None, "until": None if status == "active" else
            (fired if fired else TODAY - timedelta(days=10)),
            "load": 1.0,
        })

    # уже существующие врачи (seed.py): тоже принимают, но их график не трогаем
    for email, key in EXISTING_DOCTOR_KEYS.items():
        emp = db.query(Employee).filter(Employee.email == email).first()
        if emp is None:
            continue
        rows = db.query(Schedule).filter(Schedule.employee_id == emp.id, Schedule.enabled.is_(True)).all()
        sched = {DAY_IDS.index(r.day_id): (r.start, r.end) for r in rows}
        profile = db.query(DoctorProfile).filter(DoctorProfile.employee_id == emp.id).first()
        if not sched:  # у главврача из seed.py графика нет — даём обычный
            sched = SCHEDULE_KINDS["full"]
            for d in range(7):
                start, end = sched.get(d, ("09:00", "18:00"))
                db.add(Schedule(employee_id=emp.id, day_id=DAY_IDS[d], label=DAY_LABELS[d], enabled=d in sched, start=start, end=end))
        ctx.doctors.append({
            "emp": emp, "key": key, "area": profile.area if profile else None, "sched": sched,
            "from": None, "until": None, "load": 0.45 if emp.role == EmployeeRole.head_doctor else 1.0,
        })

    for i, full in enumerate(NURSES, 1):
        ctx.nurses.append(make_employee(full, EmployeeRole.nurse, "Медицинская сестра", f"nurse{i}@{DEMO_DOMAIN}"))
    for i, full in enumerate(RECEPTION, 1):
        ctx.reception.append(make_employee(full, EmployeeRole.reception, "Администратор регистратуры", f"reception{i}@{DEMO_DOMAIN}"))
    make_employee(ACCOUNTANT, EmployeeRole.accountant, "Бухгалтер", f"accountant1@{DEMO_DOMAIN}")
    db.flush()


def create_services(ctx: Ctx) -> None:
    db = ctx.db
    existing = {s.code: s for s in db.query(Service).all()}
    for code, name, cat, price, dur, active in SERVICES:
        svc = existing.get(code)
        if svc is None:
            svc = Service(code=code, name=name, category=ServiceCategory(cat), price=tiyn(price),
                          duration_minutes=dur, is_active=active)
            db.add(svc)
        ctx.services[code] = svc
    db.flush()


def create_patients(ctx: Ctx) -> None:
    db = ctx.db
    used = {row[0] for row in db.execute(text("select iin from patients")).all()}
    now = datetime.now().replace(microsecond=0)
    new: list[Patient] = []
    for _ in range(N_PATIENTS):
        female = RNG.random() < 0.55
        full, short, _n, _p = person(female)
        group = weighted([("child", 12), ("adult", 68), ("senior", 20)])
        years = {"child": RNG.randint(0, 17), "adult": RNG.randint(18, 64), "senior": RNG.randint(65, 92)}[group]
        birth = TODAY - timedelta(days=years * 365 + RNG.randint(0, 364))
        area = RNG.choice(AREAS)
        patient = Patient(
            iin=make_iin(birth, female, used), full_name=full, short_name=short, birth_date=birth,
            gender="Ж" if female else "М", phone=phone() if group != "child" or RNG.random() < 0.7 else None,
            area=area, address=f"г. Астана, {RNG.choice(STREETS)} {RNG.randint(1, 120)}, кв. {RNG.randint(1, 240)}",
            blood_type=f"{RNG.choice(BLOOD)} Rh{RNG.choice(['+', '+', '+', MINUS])}",
            dispensary=group != "child" and RNG.random() < (0.12 if group == "adult" else 0.45),
            updated_at=now, updated_by_id=ctx.marker.id,
        )
        new.append(patient)
    db.add_all(new)
    db.flush()

    metrics: list[HealthMetric] = []
    for patient in new:
        age = (TODAY - patient.birth_date).days // 365
        # аллергии
        if RNG.random() < 0.25:
            for name in RNG.sample(ALLERGIES, RNG.randint(1, 2)):
                db.add(PatientAllergy(patient_id=patient.id, name=name))
        # диагнозы-теги (диспансерным — обязательно)
        if patient.dispensary or (age > 40 and RNG.random() < 0.25):
            for label, variant in RNG.sample(DISEASES, RNG.randint(1, 3)):
                db.add(PatientDisease(patient_id=patient.id, label=label, variant=variant))
        # прививки
        if RNG.random() < 0.7:
            for name, dose in RNG.sample(VACCINES, RNG.randint(1, 4)):
                db.add(Vaccination(patient_id=patient.id, name=name, dose=dose,
                                   date=TODAY - timedelta(days=RNG.randint(20, 2500)),
                                   notes=RNG.choice(["Без реакций", "Без реакций", "Лёгкая местная реакция", None])))
        # показатели
        if RNG.random() < 0.55:
            d = TODAY - timedelta(days=RNG.randint(3, 120))
            height = RNG.randint(150, 192) if age >= 18 else RNG.randint(80, 170)
            weight = round(height * height / 10000 * RNG.uniform(18.5, 34), 0)
            bmi = round(weight / (height / 100) ** 2, 1)
            note = "дефицит" if bmi < 18.5 else "норма" if bmi < 25 else "избыточный" if bmi < 30 else "ожирение"
            sys_bp = RNG.randint(105, 165 if age > 40 else 135)
            rows = [
                ("Рост", f"{height} см", None), ("Вес", f"{int(weight)} кг", None), ("ИМТ", f"{bmi}", note),
                ("АД (систол.)", f"{sys_bp} мм рт.ст.", "повышено" if sys_bp >= 140 else None),
                ("АД (диастол.)", f"{sys_bp - RNG.randint(35, 55)} мм рт.ст.", None),
                ("ЧСС", f"{RNG.randint(58, 98)} уд/мин", None), ("Сатурация", f"{RNG.randint(94, 99)}%", None),
            ]
            if RNG.random() < 0.4:
                gl = round(RNG.uniform(4.2, 8.4), 1)
                rows += [("Глюкоза крови", f"{gl} ммоль/л", "повышена" if gl > 6.1 else None),
                         ("Холестерин", f"{round(RNG.uniform(3.8, 7.0), 1)} ммоль/л", None)]
            metrics += [HealthMetric(patient_id=patient.id, label=l, value=v, note=n, date=d) for l, v, n in rows]
    db.add_all(metrics)

    # стационар: несколько пациентов
    therapists = [d["emp"] for d in ctx.doctors if d["key"] in ("ther", "card", "neu")]
    for patient in RNG.sample([p for p in new if (TODAY - p.birth_date).days // 365 > 30], 14):
        db.add(Hospitalization(
            patient_id=patient.id, employee_id=RNG.choice(therapists).id, department=RNG.choice(DEPARTMENTS),
            ward=f"Палата {RNG.randint(201, 230)}", bed=f"Койка {RNG.randint(1, 4)}",
            admitted_at=TODAY - timedelta(days=RNG.randint(1, 30)),
            primary_diagnosis=RNG.choice(["I10 Эссенциальная гипертензия", "J45.0 Бронхиальная астма",
                                          "E11.9 Сахарный диабет 2 типа", "K29.7 Гастрит"]),
        ))
    db.flush()

    ctx.patients = list(db.query(Patient).all())  # + 9 прежних пациентов
    for patient in ctx.patients:
        ctx.patients_by_area[patient.area].append(patient)


def grid(start: str, end: str) -> list[str]:
    (sh, sm), (eh, em) = (map(int, start.split(":")), map(int, end.split(":")))
    cur, stop, out = sh * 60 + sm, eh * 60 + em, []
    while cur < stop:
        out.append(f"{cur // 60:02d}:{cur % 60:02d}")
        cur += 30
    return out


def create_appointments(ctx: Ctx) -> list[dict]:
    """Приёмы + назначения. Возвращает спецификации завершённых приёмов (для счетов)."""
    db = ctx.db
    icd = json.loads((Path(__file__).parent / "app" / "data" / "icd10_common.json").read_text(encoding="utf-8"))
    busy_doctor = {(r[0], r[1], r[2]) for r in db.execute(text("select employee_id, date, time from appointments")).all()}
    busy_patient: set[tuple[int, date, str]] = set()
    staff_creators = [r.id for r in ctx.reception] + [d["emp"].id for d in ctx.doctors if d["emp"].status == EmployeeStatus.active]
    completed_specs: list[dict] = []
    rows: list[tuple[Appointment, list[tuple[str, str, str]]]] = []

    for d in ctx.doctors:
        emp, key = d["emp"], d["key"]
        for delta in range(-DAYS_BACK, DAYS_FWD + 1):
            day = TODAY + timedelta(days=delta)
            sched = d["sched"].get(day.weekday())
            if sched is None or (d["until"] and day > d["until"]):
                continue
            if delta == 0:
                fill = 0.7
            elif delta < 0:
                fill = RNG.uniform(0.5, 0.9)
            else:
                # будущее заполнено слабее прошлого, чтобы при записи было из
                # чего выбирать: завтра ~45%, через две недели ~10%
                fill = max(0.10, 0.45 - 0.025 * delta)
            fill *= d["load"]
            for slot in grid(*sched):
                if RNG.random() > fill or (emp.id, day, slot) in busy_doctor:
                    continue
                start_dt = at(day, slot)
                end_dt = start_dt + timedelta(minutes=30)
                # пациент: терапевту/педиатру — чаще с участка, остальным любой
                pool = ctx.patients_by_area.get(d["area"]) if d["area"] and RNG.random() < 0.8 else None
                patient = None
                for _ in range(8):
                    cand = RNG.choice(pool or ctx.patients)
                    if (cand.id, day, slot) not in busy_patient:
                        patient = cand
                        break
                if patient is None:
                    continue
                busy_doctor.add((emp.id, day, slot))
                busy_patient.add((patient.id, day, slot))

                # статус
                if delta < 0:
                    status = weighted([(AppointmentStatus.completed, 84), (AppointmentStatus.cancelled, 16)])
                elif delta == 0:
                    if end_dt <= CLOCK:
                        status = weighted([(AppointmentStatus.completed, 92), (AppointmentStatus.cancelled, 8)])
                    elif start_dt <= CLOCK:
                        status = AppointmentStatus.in_progress
                    else:
                        status = weighted([(AppointmentStatus.scheduled, 93), (AppointmentStatus.cancelled, 7)])
                else:
                    status = weighted([(AppointmentStatus.scheduled, 94), (AppointmentStatus.cancelled, 6)])

                appt = Appointment(
                    date=day, time=slot, complaint=RNG.choice(COMPLAINTS[key]), status=status,
                    patient_id=patient.id, employee_id=emp.id, created_by_id=RNG.choice(staff_creators),
                )
                rx: list[tuple[str, str, str]] = []
                if status == AppointmentStatus.completed:
                    appt.duration_minutes = RNG.randint(10, 35)
                    if RNG.random() < 0.92:
                        dx = RNG.choice(icd)
                        appt.diagnosis_code, appt.diagnosis_name = dx["code"], dx["name"]
                    bp = RNG.randint(105, 160)
                    appt.objective_status = (
                        f"Состояние удовлетворительное. АД {bp}/{bp - RNG.randint(35, 55)} мм рт.ст., "
                        f"ЧСС {RNG.randint(60, 96)} уд/мин, T {RNG.choice(['36.5', '36.6', '36.8', '37.2', '38.1'])}°C."
                    )
                    if RNG.random() < 0.65:
                        rx = RNG.sample(MEDICATIONS, RNG.randint(1, 3))
                elif status == AppointmentStatus.cancelled:
                    appt.cancelled_at = start_dt - timedelta(hours=RNG.randint(1, 72)) if delta >= 0 else start_dt - timedelta(hours=RNG.randint(1, 48))
                    appt.cancelled_at = min(appt.cancelled_at, CLOCK)
                    appt.cancelled_by_id = RNG.choice(staff_creators)
                    appt.cancellation_reason = RNG.choice(CANCEL_REASONS)
                rows.append((appt, rx))
                if status == AppointmentStatus.completed:
                    completed_specs.append({"appt": appt, "key": key, "end": end_dt - timedelta(minutes=RNG.randint(0, 12)),
                                            "patient_id": patient.id, "doctor_id": emp.id})

    db.add_all([a for a, _ in rows])
    db.flush()
    db.add_all([
        Prescription(appointment_id=a.id, medication=m, dosage=dose, frequency=freq)
        for a, rx in rows for (m, dose, freq) in rx
    ])
    db.flush()
    ctx.appts = [a for a, _ in rows]
    return completed_specs


# ----------------------------------------------------------- счета, платежи, смены

def create_billing(ctx: Ctx, completed: list[dict]) -> dict:
    db = ctx.db
    svc = ctx.services
    hd = ctx.head_doctor
    R = ctx.reception
    assert hd is not None
    cur = db.execute(text("select coalesce(max(last_number),0) from invoice_number_counters where year = :y"), {"y": TODAY.year}).scalar()
    next_number = [cur + 1]
    # на случай уже существующих счетов других лет/ручных — берём максимум по номерам
    existing_max = db.execute(text("select coalesce(max(cast(split_part(invoice_number,'-',2) as int)),0) from invoices where invoice_number like :p"),
                              {"p": f"{TODAY.year}-%"}).scalar()
    next_number[0] = max(next_number[0], existing_max + 1)

    # --- кассиры по сменам: (дата, 'am'|'pm') -> сотрудник
    shift_cashier: dict[tuple[date, str], Employee] = {}
    for delta in range(-DAYS_BACK, 1):
        day = TODAY + timedelta(days=delta)
        if delta == 0:
            shift_cashier[(day, "am")] = R[0]            # открыта весь день
            shift_cashier[(day, "pm")] = R[0]
        else:
            a, b = RNG.sample(R, 2)
            shift_cashier[(day, "am")], shift_cashier[(day, "pm")] = a, b

    def bucket(ts: datetime) -> str:
        return "am" if ts.hour < 14 or ts.date() == TODAY else "pm"

    # --- спецификации счетов
    specs: list[dict] = []

    def consult_code(key: str) -> str:
        return {"ther": "CONS-THER", "ped": "CONS-PED", "card": "CONS-CARD", "neu": "CONS-NEU", "lor": "CONS-LOR",
                "oph": "CONS-OPH", "end": "CONS-END", "gyn": "CONS-GYN", "sur": "CONS-SUR"}[key]

    def items_for(key: str | None, with_consult: bool) -> list[tuple[Service, int, int | None]]:
        out: list[tuple[Service, int, int | None]] = []
        if with_consult and key:
            code = "CONS-REPEAT" if RNG.random() < 0.2 else consult_code(key)
            out.append((svc[code], 1, None))
        pool = [c for c in (EXTRAS.get(key or "", []) or GENERAL_EXTRAS) if svc[c].is_active]
        n_extra = weighted([(0, 60), (1, 28), (2, 12)]) if with_consult else weighted([(1, 55), (2, 35), (3, 10)])
        for code in RNG.sample(pool, min(n_extra, len(pool))):
            out.append((svc[code], 1, None))
        return out

    for c in completed:
        if RNG.random() > 0.78:
            continue
        specs.append({"appt": c["appt"], "patient_id": c["patient_id"], "created": c["end"], "key": c["key"],
                      "doctor_id": c["doctor_id"], "with_consult": True})
    patient_ids = [p.id for p in ctx.patients]
    for _ in range(160):
        day = TODAY - timedelta(days=RNG.randint(0, DAYS_BACK))
        created = at(day, "09:00") + timedelta(minutes=RNG.randint(0, 9 * 60))
        specs.append({"appt": None, "patient_id": RNG.choice(patient_ids), "created": min(created, CLOCK - timedelta(minutes=5)),
                      "key": None, "doctor_id": None, "with_consult": False})
    specs.sort(key=lambda s: s["created"])

    cashier_of = lambda ts: shift_cashier[(ts.date(), bucket(ts))]  # noqa: E731

    drafts_needing_approval = 0
    approved_big = 0
    for s in specs:
        s["items"] = items_for(s["key"], s["with_consult"])
        full = sum(it[0].price * it[1] for it in s["items"])
        age_days = (TODAY - s["created"].date()).days
        if age_days == 0:
            status = weighted([("paid", 55), ("partial", 10), ("unpaid", 20), ("draft", 10), ("cancelled", 5)])
        elif age_days <= 2:
            status = weighted([("paid", 38), ("partial", 12), ("unpaid", 30), ("draft", 15), ("cancelled", 5)])
        else:
            status = weighted([("paid", 90), ("partial", 4), ("unpaid", 3), ("cancelled", 3)])
        # скидка
        pct = 0
        approved = False
        r = RNG.random()
        if r < 0.06:
            pct = RNG.choice([3, 5, 7, 10])
        elif r < 0.085 and status not in ("draft",):
            pct = RNG.choice([12, 15, 20, 25])
            approved = True
            approved_big += 1
        if status == "draft" and drafts_needing_approval < 8 and RNG.random() < 0.7:
            pct, approved = RNG.choice([15, 20, 30]), False   # ждёт подтверждения главврача
            drafts_needing_approval += 1
        s.update(full=full, status=status, discount=(full * pct // 100 // 100) * 100, approved=approved, pct=pct)
        s["total"] = full - s["discount"]
        s["cashier"] = cashier_of(s["created"])

    # --- платежи (спецификации)
    pay_specs: list[dict] = []

    def clamp_pay(ts: datetime, created: datetime) -> datetime:
        limit = CLOCK if ts.date() == TODAY else at(ts.date(), "19:55")
        ts = max(min(ts, limit), created)
        return ts

    for s in specs:
        s["pays"] = []
        if s["status"] in ("draft", "cancelled", "unpaid"):
            continue
        total = s["total"]
        if s["status"] == "partial":
            parts = [max(100, (total * RNG.randint(30, 70) // 100 // 100) * 100)]
            if parts[0] >= total:
                parts = [total - 100]
        elif RNG.random() < 0.78:
            parts = [total]
        else:
            first = max(100, (total * RNG.randint(40, 70) // 100 // 100) * 100)
            parts = [first, total - first] if 0 < first < total else [total]
        ts = s["created"] + timedelta(minutes=RNG.randint(2, 25))
        for amount in parts:
            ts = clamp_pay(ts, s["created"])
            # сегодня наличных больше: в открытой смене должна быть видна выручка
            cash_w = 60 if ts.date() == TODAY else 42
            method = weighted([(PaymentMethod.cash, cash_w), (PaymentMethod.card, 90 - cash_w), (PaymentMethod.transfer, 10)])
            pay = {"invoice": s, "amount": amount, "method": method, "ts": ts, "reversal_of": None,
                   "reason": None, "approved_by": None, "created_by": None, "shift_key": None}
            s["pays"].append(pay)
            pay_specs.append(pay)
            ts = ts + timedelta(minutes=RNG.randint(5, 40))
    for p in pay_specs:
        key = (p["ts"].date(), bucket(p["ts"]))
        p["created_by"] = shift_cashier[key]
        p["shift_key"] = key if p["method"] == PaymentMethod.cash else None

    # --- смены
    shift_cash_sum: dict[tuple[date, str], int] = defaultdict(int)
    for p in pay_specs:
        if p["shift_key"]:
            shift_cash_sum[p["shift_key"]] += p["amount"]
    shifts: dict[tuple[date, str], CashShift] = {}
    for (day, b), cashier in sorted(shift_cashier.items()):
        if day == TODAY:
            if b == "pm":
                continue
            opened, closed, status = at(day, "08:00") + timedelta(minutes=RNG.randint(0, 9)), None, CashShiftStatus.open
            actual = None
            opening = tiyn(5000)
        else:
            opened = at(day, "08:00" if b == "am" else "14:00") + timedelta(minutes=RNG.randint(0, 9))
            closed = at(day, "14:05" if b == "am" else "20:05") + timedelta(minutes=RNG.randint(0, 14))
            status = CashShiftStatus.closed
            opening = RNG.choice([0, tiyn(5000), tiyn(10000)])
            delta_cash = weighted([(0, 70), (tiyn(RNG.randint(1, 50)) * RNG.choice([-1, 1]), 22),
                                   (tiyn(RNG.randint(100, 1500)) * RNG.choice([-1, 1]), 8)])
            actual = opening + shift_cash_sum[(day, b)] + delta_cash
        sh = CashShift(cashier_employee_id=cashier.id, opened_at=opened, closed_at=closed,
                       opening_balance=opening, actual_cash=actual, status=status)
        shifts[(day, b)] = sh
    db.add_all(shifts.values())
    db.flush()
    # утренняя смена сегодня обслуживает и «pm»
    shifts[(TODAY, "pm")] = shifts[(TODAY, "am")]

    # --- возвраты: берём оплаченные карточные платежи старше 2 дней
    refund_candidates = [s for s in specs if s["status"] == "paid" and len(s["pays"]) == 1
                         and s["pays"][0]["method"] == PaymentMethod.card and (TODAY - s["created"].date()).days >= 3
                         and s["pays"][0]["amount"] >= tiyn(3000)]
    RNG.shuffle(refund_candidates)
    refund_reqs: list[dict] = []
    plan = [("approved_full", 28), ("approved_partial", 22), ("rejected", 12), ("pending", 10)]
    idx = 0
    for kind, count in plan:
        for _ in range(count):
            if idx >= len(refund_candidates):
                break
            s = refund_candidates[idx]; idx += 1
            pay = s["pays"][0]
            amount = pay["amount"] if kind == "approved_full" else max(100, (pay["amount"] // 2 // 100) * 100)
            requested = pay["ts"] + timedelta(hours=RNG.randint(2, 40))
            requested = min(requested, CLOCK - timedelta(hours=2))
            req = {"invoice": s, "payment": pay, "amount": amount, "kind": kind, "requested": requested,
                   "decided": min(requested + timedelta(hours=RNG.randint(1, 20)), CLOCK - timedelta(minutes=30)),
                   "reason": RNG.choice(["Услуга не оказана", "Дублирование оплаты", "Пациент отказался от процедуры",
                                         "Ошибка в счёте", "Врач отменил назначение"]),
                   "by": RNG.choice(R)}
            refund_reqs.append(req)
            if kind.startswith("approved"):
                rp = {"invoice": s, "amount": -amount, "method": pay["method"], "ts": req["decided"], "reversal_of": pay,
                      "reason": req["reason"], "approved_by": hd, "created_by": hd, "shift_key": None}
                s["pays"].append(rp)
                pay_specs.append(rp)
                req["refund_pay"] = rp

    # --- итоговые статусы по платежам (как _recompute_invoice_status_from_payments)
    for s in specs:
        if s["status"] in ("draft", "cancelled", "unpaid"):
            continue
        net = sum(p["amount"] for p in s["pays"])
        s["final"] = "refunded" if net <= 0 else "partial" if net < s["total"] else "paid"
    for s in specs:
        s.setdefault("final", s["status"])

    # --- вставка счетов
    inv_rows: list[Invoice] = []
    for s in specs:
        number = f"{s['created'].year}-{next_number[0]:06d}"
        next_number[0] += 1
        inv = Invoice(
            invoice_number=number, patient_id=s["patient_id"], appointment_id=s["appt"].id if s["appt"] else None,
            status=InvoiceStatus(s["final"]), subtotal=s["full"], discount_total=s["discount"], total=s["total"],
            created_by_id=s["cashier"].id, created_at=s["created"],
        )
        if s["approved"]:
            inv.discount_approved_by_id = hd.id
            inv.discount_approved_at = s["created"] + timedelta(minutes=RNG.randint(3, 40))
        if s["status"] == "cancelled":
            inv.cancelled_at = s["created"] + timedelta(hours=RNG.randint(1, 20))
            inv.cancelled_at = min(inv.cancelled_at, CLOCK)
            inv.cancelled_by_id = s["cashier"].id
            inv.cancellation_reason = RNG.choice(["Ошибка в позициях", "Пациент отказался", "Выставлен повторно"])
        s["row"] = inv
        inv_rows.append(inv)
    db.add_all(inv_rows)
    db.flush()
    db.add_all([
        InvoiceItem(invoice_id=s["row"].id, service_id=sv.id, name_snapshot=sv.name, price_snapshot=sv.price,
                    quantity=qty, discount_amount=0, line_total=sv.price * qty,
                    performer_employee_id=s["doctor_id"] if sv.category == ServiceCategory.consultation else None)
        for s in specs for (sv, qty, _p) in s["items"]
    ])
    db.flush()

    # --- вставка платежей (исходные раньше возвратов)
    originals = [p for p in pay_specs if p["reversal_of"] is None]
    for p in originals:
        row = Payment(invoice_id=p["invoice"]["row"].id, amount=p["amount"], method=p["method"],
                      cash_shift_id=shifts[p["shift_key"]].id if p["shift_key"] else None,
                      created_by_id=p["created_by"].id, created_at=p["ts"])
        p["row"] = row
    db.add_all([p["row"] for p in originals])
    db.flush()
    reversals = [p for p in pay_specs if p["reversal_of"] is not None]
    for p in reversals:
        p["row"] = Payment(invoice_id=p["invoice"]["row"].id, amount=p["amount"], method=p["method"],
                           cash_shift_id=None, created_by_id=p["created_by"].id, created_at=p["ts"],
                           reversal_of_payment_id=p["reversal_of"]["row"].id, refund_reason=p["reason"],
                           approved_by_id=p["approved_by"].id)
    db.add_all([p["row"] for p in reversals])
    db.flush()

    # --- заявки на возврат
    kinds = {"approved_full": RefundRequestStatus.approved, "approved_partial": RefundRequestStatus.approved,
             "rejected": RefundRequestStatus.rejected, "pending": RefundRequestStatus.pending}
    for r in refund_reqs:
        decided = r["kind"] != "pending"
        db.add(RefundRequest(
            invoice_id=r["invoice"]["row"].id, payment_id=r["payment"]["row"].id, amount=r["amount"],
            reason=r["reason"], requested_by_id=r["by"].id, status=kinds[r["kind"]], created_at=r["requested"],
            decided_by_id=hd.id if decided else None, decided_at=r["decided"] if decided else None,
            resulting_payment_id=r["refund_pay"]["row"].id if r["kind"].startswith("approved") else None,
        ))
    db.flush()

    # --- счётчик номеров
    db.execute(text(
        "insert into invoice_number_counters (year, last_number) values (:y, :n) "
        "on conflict (year) do update set last_number = greatest(invoice_number_counters.last_number, excluded.last_number)"),
        {"y": TODAY.year, "n": next_number[0] - 1})
    return {"invoices": len(specs), "payments": len(pay_specs), "shifts": len(shifts) - 1,
            "refund_requests": len(refund_reqs), "drafts_waiting_approval": drafts_needing_approval,
            "discounts_over_threshold_approved": approved_big}


# ===================================================================== запуск

def seed(db) -> None:
    ctx = Ctx(db)
    print("сотрудники…")
    create_people(ctx)
    print("прейскурант…")
    create_services(ctx)
    print(f"пациенты ({N_PATIENTS}) и медданные…")
    create_patients(ctx)
    print("приёмы и назначения…")
    completed = create_appointments(ctx)
    print("счета, платежи, смены, возвраты…")
    billing = create_billing(ctx, completed)
    db.commit()

    by_status: dict[str, int] = defaultdict(int)
    for a in ctx.appts:
        by_status[a.status.value] += 1
    print("\nГОТОВО")
    print(f"  врачей (демо): {len(DOCTORS)} (+2 прежних), медсестёр: {len(NURSES)}, регистраторов: {len(RECEPTION)}, бухгалтер: 1")
    print(f"  пациентов (демо): {N_PATIENTS}, приёмов: {len(ctx.appts)} {dict(by_status)}")
    print("  биллинг:", billing)
    print(f"  «сейчас» в данных за сегодня: {CLOCK:%H:%M} (реальное время {datetime.now():%H:%M})")
    print(f"\nЛогины (пароль у всех демо-учёток: {DEMO_PASSWORD}):")
    print(f"  регистратура: reception1..{len(RECEPTION)}@{DEMO_DOMAIN}  (reception1 — смена открыта сегодня)")
    print(f"  врачи:        doctor1..{len(DOCTORS)}@{DEMO_DOMAIN}  (doctor11 в отпуске, doctor12 уволена)")
    print(f"  медсёстры:    nurse1..{len(NURSES)}@{DEMO_DOMAIN}")
    print(f"  бухгалтер:    accountant1@{DEMO_DOMAIN}")
    print("  прежние учётки (reception@ibnsina.local и др.) не менялись")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true", help="удалить прежние демо-данные и создать заново")
    ap.add_argument("--reset-only", action="store_true", help="только удалить демо-данные")
    args = ap.parse_args()

    db = SessionLocal()
    try:
        if args.reset or args.reset_only:
            print("удаляю прежние демо-данные…")
            reset_demo(db)
            if args.reset_only:
                return
        elif db.execute(text("select 1 from employees where email = :e"), {"e": MARKER_EMAIL}).first():
            print("Демо-данные уже есть. Запустите с --reset, чтобы пересоздать.")
            return
        seed(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
