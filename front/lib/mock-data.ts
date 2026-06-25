// Тип статуса — только эти 4 значения допустимы (TypeScript подскажет ошибку)
export type AppointmentStatus =
  | "completed"   // Завершён
  | "in_progress" // На приёме
  | "scheduled"   // Записан
  | "cancelled";  // Отменён

// Описываем форму одного приёма — переиспользуем везде
export interface Appointment {
  id: string;
  date: string; // "28.05.2026"
  time: string;
  patient: string;
  complaint: string;
  diagnosis: string | null; // "J02.9 Острый фарингит" или null
  doctor: string;           // "Шарипов М.Ю."
  status: AppointmentStatus;
}

// Данные врача — позже придут из авторизации
export const doctor = {
  fullName: "Шарипов Муслим Юнусалиевич",
  firstNamePatronymic: "Шарипов Муслим",
  shortName: "Шарипов М.Ю.",
  initials: "МЮ",
  role: "Эндокринолог",
  area: "Участок №3",
};

export interface DoctorBadge {
  label: string;
  variant: "green" | "blue";
}

export interface WorkDaySchedule {
  id: string;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
}

export interface EducationEntry {
  year: string;
  title: string;
  description: string;
}

export const doctorProfile = {
  title: "Врач-эндокринолог",
  office: "Кабинет 214",
  badges: [
    { label: "Высшая категория", variant: "green" as const },
    { label: "КМО активен", variant: "blue" as const },
  ],
  contacts: {
    phone: "+7 (701) 234-56-78",
    email: "sharipov@poliklinika12.kz",
    workplace: "Городская поликлиника №12, г. Астана, ул. Туран 24",
  },
  metrics: {
    patientsInArea: 1248,
    appointmentsInMay: 163,
    dispensary: 84,
    experienceYears: 14,
  },
  professional: {
    specialty: "Эндокринолог (04.02.001)",
    qualificationCategory: "Высшая",
    licenseNumber: "0023847-МД",
    licenseValidUntil: "31.12.2027",
    certificateNumber: "№ СС-2022-00418",
    certificateValidUntil: "15.09.2027",
    about:
      "Врач-эндокринолог с 14-летним стажем. Специализируюсь на диагностике и лечении сахарного диабета, заболеваний щитовидной железы и метаболических нарушений. Работаю по принципам доказательной медицины.",
  },
  schedule: [
    { id: "mon", label: "Понедельник", enabled: true, start: "08:00", end: "14:00" },
    { id: "tue", label: "Вторник", enabled: true, start: "08:00", end: "14:00" },
    { id: "wed", label: "Среда", enabled: true, start: "08:00", end: "14:00" },
    { id: "thu", label: "Четверг", enabled: true, start: "08:00", end: "14:00" },
    { id: "fri", label: "Пятница", enabled: true, start: "08:00", end: "14:00" },
    { id: "sat", label: "Суббота", enabled: false, start: "08:00", end: "14:00" },
    { id: "sun", label: "Воскресенье", enabled: false, start: "08:00", end: "14:00" },
  ] satisfies WorkDaySchedule[],
  education: [
    {
      year: "2008",
      title: "АО «Медицинский университет Астана»",
      description: "Специальность: Общая медицина, диплом с отличием",
    },
    {
      year: "2010",
      title: "Клиническая ординатура — Эндокринология",
      description: "НАО «Казахский национальный медицинский университет»",
    },
    {
      year: "2018",
      title: "Повышение квалификации — Диабетология",
      description: "Удостоверение КМО, 144 часа",
    },
    {
      year: "2023",
      title: "Повышение квалификации — Цифровое здравоохранение",
      description: "Дистанционный курс, 72 часа",
    },
  ] satisfies EducationEntry[],
};

// Текущий приём — тот, что идёт прямо сейчас
export const currentAppointment: Appointment = {
  id: "current",
  date: "28.05.2026",
  time: "09:00",
  patient: "Ахметова А.С.",
  complaint: "Повышенное давление, головная боль",
  diagnosis: null,
  doctor: "Шарипов М.Ю.",
  status: "in_progress",
};

// Список приёмов на сегодня — для таблицы
export const todayAppointments: Appointment[] = [
  {
    id: "1",
    date: "28.05.2026",
    time: "08:30",
    patient: "Нурмаганбетов Д.Е.",
    complaint: "Боль в горле, температура",
    diagnosis: "J02.9 Острый фарингит",
    doctor: "Шарипов М.Ю.",
    status: "completed",
  },
  {
    id: "2",
    date: "28.05.2026",
    time: "09:00",
    patient: "Ахметова А.С.",
    complaint: "Повышенное давление, головная боль",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "in_progress",
  },
  {
    id: "3",
    date: "28.05.2026",
    time: "09:30",
    patient: "Касымова Г.Р.",
    complaint: "Кашель, насморк",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
  {
    id: "4",
    date: "28.05.2026",
    time: "10:00",
    patient: "Жумабеков А.Т.",
    complaint: "Боль в спине",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
  {
    id: "5",
    date: "28.05.2026",
    time: "10:30",
    patient: "Ибраева М.С.",
    complaint: "Плановый осмотр",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
  {
    id: "6",
    date: "28.05.2026",
    time: "11:00",
    patient: "Садыков Е.Н.",
    complaint: "Аллергическая реакция",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "cancelled",
  },
  {
    id: "7",
    date: "28.05.2026",
    time: "11:30",
    patient: "Тлеубергенова А.К.",
    complaint: "Головокружение",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
];

// Приёмы на неделю — для календаря
export const weekAppointments: Appointment[] = [
  {
    id: "w1",
    date: "25.05.2026",
    time: "08:30",
    patient: "Нурмаганбетов Д.Е.",
    complaint: "Боль в горле, температура 37.8",
    diagnosis: "J02.9 Острый фарингит",
    doctor: "Шарипов М.Ю.",
    status: "completed",
  },
  {
    id: "w2",
    date: "25.05.2026",
    time: "09:00",
    patient: "Касымова Г.Р.",
    complaint: "Кашель, насморк",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "completed",
  },
  {
    id: "w3",
    date: "26.05.2026",
    time: "09:30",
    patient: "Ахметова А.С.",
    complaint: "Повышенное давление, головная боль",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "in_progress",
  },
  {
    id: "w4",
    date: "27.05.2026",
    time: "10:00",
    patient: "Оспанова Ж.Р.",
    complaint: "Боль в спине",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
  {
    id: "w5",
    date: "27.05.2026",
    time: "10:30",
    patient: "Сейткали М.Б.",
    complaint: "Контроль анализов",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
  {
    id: "w6",
    date: "28.05.2026",
    time: "08:30",
    patient: "Нурмаганбетов Д.Е.",
    complaint: "Боль в горле, температура",
    diagnosis: "J02.9 Острый фарингит",
    doctor: "Шарипов М.Ю.",
    status: "completed",
  },
  {
    id: "w7",
    date: "28.05.2026",
    time: "09:00",
    patient: "Ахметова А.С.",
    complaint: "Повышенное давление, головная боль",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "in_progress",
  },
  {
    id: "w8",
    date: "28.05.2026",
    time: "09:30",
    patient: "Касымова Г.Р.",
    complaint: "Кашель, насморк",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
  {
    id: "w9",
    date: "28.05.2026",
    time: "10:00",
    patient: "Жумабеков А.Т.",
    complaint: "Боль в спине",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
  {
    id: "w10",
    date: "28.05.2026",
    time: "10:30",
    patient: "Ибраева М.С.",
    complaint: "Плановый осмотр",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
  {
    id: "w11",
    date: "29.05.2026",
    time: "11:00",
    patient: "Садыков Е.Н.",
    complaint: "Аллергическая реакция",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "cancelled",
  },
  {
    id: "w12",
    date: "29.05.2026",
    time: "11:30",
    patient: "Тлеубергенова А.К.",
    complaint: "Головокружение",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "scheduled",
  },
  {
    id: "w13",
    date: "30.05.2026",
    time: "12:00",
    patient: "Тастанов Р.С.",
    complaint: "Боль в суставах",
    diagnosis: null,
    doctor: "Шарипов М.Ю.",
    status: "cancelled",
  },
];

export type PatientCareType = "ambulatory" | "inpatient";

export interface InpatientInfo {
  department: string;
  ward: string;
  bed: string;
  admittedAt: string;
  attendingDoctor: string;
  primaryDiagnosis: string;
}

export type DiseaseTagVariant =
  | "green"
  | "purple"
  | "orange"
  | "red"
  | "blue"
  | "yellow";

export interface PatientDisease {
  label: string;
  variant: DiseaseTagVariant;
}

export interface Patient {
  id: string;
  fullName: string;
  shortName: string;
  iin: string;
  birthDate: string;
  ageLabel: string;
  gender: "М" | "Ж";
  bloodType: string;
  phone: string;
  address: string;
  area: string;
  lastAppointment: string | null;
  dispensary: boolean;
  careType: PatientCareType;
  inpatient?: InpatientInfo;
  allergies: string[];
  chronicDiseases: string[];
  diseases: PatientDisease[];
}

export interface PatientMedicalHistoryEntry {
  id: string;
  patientId: string;
  date: string;
  time: string;
  doctor: string;
  status: AppointmentStatus;
  complaint: string;
  diagnosis: string | null;
}

export interface HealthMetric {
  label: string;
  value: string;
  date: string;
  note?: string;
}

export interface Vaccination {
  id: string;
  patientId: string;
  date: string;
  name: string;
  drug: string;
  series: string;
  notes: string | null;
}

export interface Diagnosis {
  code: string;
  name: string;
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  duration: string;
}

export interface PatientExamination {
  patientId: string;
  status: AppointmentStatus;
  complaints: string;
  objectiveStatus: string;
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
}

export interface PatientVisitHistory {
  id: string;
  patientId: string;
  date: string;
  status: AppointmentStatus;
  summary: string;
}

export const patients: Patient[] = [
  {
    id: "1",
    fullName: "Ахметова Айгерим Сериковна",
    shortName: "Ахметова А.С.",
    iin: "850412301234",
    birthDate: "12.04.1985",
    ageLabel: "41 лет",
    gender: "Ж",
    bloodType: "B(III) Rh+",
    phone: "+7 (701) 112-34-56",
    address: "г. Астана, ул. Сарыарка 14, кв. 28",
    area: "Участок №3",
    lastAppointment: "20.05.2026",
    dispensary: true,
    careType: "ambulatory",
    allergies: ["Пенициллин", "Аспирин"],
    chronicDiseases: ["Гипертония", "Ожирение"],
    diseases: [
      { label: "Гипертония", variant: "green" },
      { label: "Ожирение", variant: "purple" },
    ],
  },
  {
    id: "2",
    fullName: "Нурмаганбетов Дулат Ерланович",
    shortName: "Нурмаганбетов Д.Е.",
    iin: "880623502345",
    birthDate: "23.06.1988",
    ageLabel: "37 лет",
    gender: "М",
    bloodType: "A(II) Rh+",
    phone: "+7 (701) 223-45-67",
    address: "г. Астана, пр. Республики 12, кв. 45",
    area: "Участок №3",
    lastAppointment: "08.05.2026",
    dispensary: false,
    careType: "ambulatory",
    allergies: [],
    chronicDiseases: [],
    diseases: [],
  },
  {
    id: "3",
    fullName: "Касымова Гульнара Рахимовна",
    shortName: "Касымова Г.Р.",
    iin: "900715603456",
    birthDate: "15.07.1990",
    ageLabel: "35 лет",
    gender: "Ж",
    bloodType: "O(I) Rh+",
    phone: "+7 (701) 334-56-78",
    address: "г. Астана, ул. Кенесары 8, кв. 12",
    area: "Участок №3",
    lastAppointment: "05.05.2026",
    dispensary: true,
    careType: "inpatient",
    inpatient: {
      department: "Терапевтическое отделение",
      ward: "Палата 214",
      bed: "Койка 3",
      admittedAt: "22.05.2026",
      attendingDoctor: "Шарипов М.Ю.",
      primaryDiagnosis: "J45.0 Бронхиальная астма",
    },
    allergies: ["Лактоза"],
    chronicDiseases: ["Бронхиальная астма"],
    diseases: [{ label: "Астма", variant: "blue" }],
  },
  {
    id: "4",
    fullName: "Жумабеков Асылхан Турлыбекович",
    shortName: "Жумабеков А.Т.",
    iin: "851209704567",
    birthDate: "09.12.1985",
    ageLabel: "40 лет",
    gender: "М",
    bloodType: "AB(IV) Rh+",
    phone: "+7 (701) 445-67-89",
    address: "г. Астана, ул. Бейбитшилик 22, кв. 7",
    area: "Участок №3",
    lastAppointment: "28.04.2026",
    dispensary: false,
    careType: "ambulatory",
    allergies: [],
    chronicDiseases: ["Остеохондроз"],
    diseases: [{ label: "ХОБЛ", variant: "yellow" }],
  },
  {
    id: "5",
    fullName: "Ибраева Мария Сериккызы",
    shortName: "Ибраева М.С.",
    iin: "920331805678",
    birthDate: "31.03.1992",
    ageLabel: "34 года",
    gender: "Ж",
    bloodType: "A(II) Rh−",
    phone: "+7 (701) 556-78-90",
    address: "г. Астана, ул. Жансугурова 5, кв. 33",
    area: "Участок №3",
    lastAppointment: "20.04.2026",
    dispensary: false,
    careType: "ambulatory",
    allergies: [],
    chronicDiseases: [],
    diseases: [],
  },
  {
    id: "6",
    fullName: "Садыков Ержан Нурланович",
    shortName: "Садыков Е.Н.",
    iin: "870522906789",
    birthDate: "22.05.1987",
    ageLabel: "38 лет",
    gender: "М",
    bloodType: "B(III) Rh+",
    phone: "+7 (701) 667-89-01",
    address: "г. Астана, ул. Кабанбай батыра 18, кв. 56",
    area: "Участок №3",
    lastAppointment: "15.04.2026",
    dispensary: true,
    careType: "inpatient",
    inpatient: {
      department: "Терапевтическое отделение",
      ward: "Палата 208",
      bed: "Койка 1",
      admittedAt: "26.05.2026",
      attendingDoctor: "Шарипов М.Ю.",
      primaryDiagnosis: "J30.1 Аллергический ринит",
    },
    allergies: ["Пыльца"],
    chronicDiseases: ["Аллергический ринит"],
    diseases: [{ label: "ИБС", variant: "red" }],
  },
  {
    id: "7",
    fullName: "Тлеубергенова Айжан Кайратовна",
    shortName: "Тлеубергенова А.К.",
    iin: "910814107890",
    birthDate: "14.08.1991",
    ageLabel: "34 года",
    gender: "Ж",
    bloodType: "O(I) Rh+",
    phone: "+7 (701) 778-90-12",
    address: "г. Астана, ул. Сарайшык 3, кв. 19",
    area: "Участок №3",
    lastAppointment: "12.04.2026",
    dispensary: false,
    careType: "ambulatory",
    allergies: [],
    chronicDiseases: [],
    diseases: [],
  },
  {
    id: "8",
    fullName: "Оспанова Жанар Рустемовна",
    shortName: "Оспанова Ж.Р.",
    iin: "930627218901",
    birthDate: "27.06.1993",
    ageLabel: "32 года",
    gender: "Ж",
    bloodType: "A(II) Rh+",
    phone: "+7 (701) 889-01-23",
    address: "г. Астана, ул. Достык 41, кв. 8",
    area: "Участок №2",
    lastAppointment: "10.04.2026",
    dispensary: false,
    careType: "ambulatory",
    allergies: [],
    chronicDiseases: [],
    diseases: [],
  },
  {
    id: "9",
    fullName: "Сейткали Марат Болатович",
    shortName: "Сейткали М.Б.",
    iin: "891103319012",
    birthDate: "03.11.1989",
    ageLabel: "36 лет",
    gender: "М",
    bloodType: "B(III) Rh+",
    phone: "+7 (701) 990-12-34",
    address: "г. Астана, ул. Момышулы 9, кв. 24",
    area: "Участок №3",
    lastAppointment: "02.04.2026",
    dispensary: true,
    careType: "inpatient",
    inpatient: {
      department: "Эндокринологическое отделение",
      ward: "Палата 112",
      bed: "Койка 5",
      admittedAt: "24.05.2026",
      attendingDoctor: "Шарипов М.Ю.",
      primaryDiagnosis: "E11.9 Сахарный диабет 2 типа",
    },
    allergies: [],
    chronicDiseases: ["СД 2 типа"],
    diseases: [{ label: "Диабет 2 типа", variant: "orange" }],
  },
  {
    id: "10",
    fullName: "Тастанов Руслан Серикович",
    shortName: "Тастанов Р.С.",
    iin: "860418420123",
    birthDate: "18.04.1986",
    ageLabel: "40 лет",
    gender: "М",
    bloodType: "O(I) Rh+",
    phone: "+7 (701) 101-23-45",
    address: "г. Астана, ул. Туран 55, кв. 61",
    area: "Участок №1",
    lastAppointment: "25.03.2026",
    dispensary: false,
    careType: "ambulatory",
    allergies: [],
    chronicDiseases: ["Подагра"],
    diseases: [{ label: "Гипертония", variant: "green" }],
  },
];

export const patientMedicalHistory: PatientMedicalHistoryEntry[] = [
  {
    id: "mh1",
    patientId: "1",
    date: "28.05.2026",
    time: "09:30",
    doctor: "Шарипов М.Ю.",
    status: "in_progress",
    complaint: "Повышенное давление, головная боль",
    diagnosis: "I10 Эссенциальная гипертензия",
  },
  {
    id: "mh2",
    patientId: "1",
    date: "10.05.2026",
    time: "14:00",
    doctor: "Шарипов М.Ю.",
    status: "completed",
    complaint: "Плановый осмотр",
    diagnosis: "Z00.0",
  },
  {
    id: "mh3",
    patientId: "1",
    date: "15.04.2026",
    time: "11:15",
    doctor: "Шарипов М.Ю.",
    status: "completed",
    complaint: "Головная боль",
    diagnosis: "R51",
  },
  {
    id: "mh4",
    patientId: "3",
    date: "27.05.2026",
    time: "10:00",
    doctor: "Шарипов М.Ю.",
    status: "in_progress",
    complaint: "Усиление кашля, одышка",
    diagnosis: "J45.0 Бронхиальная астма",
  },
  {
    id: "mh5",
    patientId: "3",
    date: "22.05.2026",
    time: "08:30",
    doctor: "Шарипов М.Ю.",
    status: "completed",
    complaint: "Поступление на стационар",
    diagnosis: "J45.0 Бронхиальная астма",
  },
];

export const patientHealthMetrics: Record<string, HealthMetric[]> = {
  "1": [
    { label: "Рост", value: "168 см", date: "20.05.2026" },
    { label: "Вес", value: "82 кг", date: "20.05.2026" },
    { label: "ИМТ", value: "29.1", date: "20.05.2026", note: "избыточный" },
    { label: "АД (систол.)", value: "148 мм рт.ст.", date: "20.05.2026" },
    { label: "АД (диастол.)", value: "92 мм рт.ст.", date: "20.05.2026" },
    { label: "ЧСС", value: "78 уд/мин", date: "20.05.2026" },
    { label: "Сатурация", value: "97%", date: "20.05.2026" },
    { label: "Глюкоза крови", value: "5.6 ммоль/л", date: "10.07.2026" },
    { label: "Холестерин", value: "5.8 ммоль/л", date: "10.07.2026" },
  ],
};

export const patientVaccinations: Vaccination[] = [
  {
    id: "v1",
    patientId: "1",
    date: "15.03.2026",
    name: "Грипп (сезонная)",
    drug: "Гриппол Плюс",
    series: "ГФ-2025-01",
    notes: "Без реакций",
  },
  {
    id: "v2",
    patientId: "1",
    date: "12.09.2024",
    name: "Пневмококк",
    drug: "Пневмовакс 23",
    series: "ПВ-1022",
    notes: null,
  },
  {
    id: "v3",
    patientId: "1",
    date: "05.04.2022",
    name: "COVID-19 (бустер)",
    drug: "QazVac",
    series: "QV-0391",
    notes: "Лёгкая местная реакция",
  },
  {
    id: "v4",
    patientId: "1",
    date: "18.11.2021",
    name: "COVID-19 (2 доза)",
    drug: "QazVac",
    series: "QV-0218",
    notes: null,
  },
];

export const patientExaminations: Record<string, PatientExamination> = {
  "1": {
    patientId: "1",
    status: "in_progress",
    complaints: "Повышенное давление, головная боль",
    objectiveStatus:
      "АД: 150/95, ЧСС: 78, ЧДД: 18, Т: 36.6 °C\nСостояние: удовлетворительное",
    diagnoses: [{ code: "I10", name: "Эссенциальная гипертензия" }],
    prescriptions: [
      { id: "p1", medication: "", dosage: "", duration: "" },
    ],
  },
};

export const patientVisitHistory: PatientVisitHistory[] = [
  {
    id: "h1",
    patientId: "1",
    date: "28.05.2026",
    status: "in_progress",
    summary: "Повышенное давление, головная боль / I10 Эссенциальная гипертензия",
  },
  {
    id: "h2",
    patientId: "1",
    date: "10.05.2026",
    status: "completed",
    summary: "Плановый осмотр / Z00.0",
  },
  {
    id: "h3",
    patientId: "1",
    date: "15.04.2026",
    status: "completed",
    summary: "Головная боль / R51",
  },
];

export function getPatientMedicalHistory(patientId: string) {
  return patientMedicalHistory.filter((entry) => entry.patientId === patientId);
}

export function getPatientHealthMetrics(patientId: string): HealthMetric[] {
  return patientHealthMetrics[patientId] ?? [];
}

export function getPatientVaccinations(patientId: string) {
  return patientVaccinations.filter((v) => v.patientId === patientId);
}

export function getPatientById(id: string) {
  return patients.find((patient) => patient.id === id);
}

export function getPatientExamination(patientId: string): PatientExamination {
  return (
    patientExaminations[patientId] ?? {
      patientId,
      status: "scheduled",
      complaints: "",
      objectiveStatus: "",
      diagnoses: [],
      prescriptions: [{ id: "p1", medication: "", dosage: "", duration: "" }],
    }
  );
}

export function getPatientVisitHistory(patientId: string) {
  return patientVisitHistory.filter((visit) => visit.patientId === patientId);
}

// Статистика врача за неделю — позже придёт с API
export const weekStats = {
  period: "22–28 мая 2026",
  total: 41,
  completed: 38,
  cancelled: 3,
  newPatients: 7,
  dispensary: 12,
  avgMinutes: 18,
};