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

export interface Patient {
  id: string;
  fullName: string;
  shortName: string;
  iin: string;
  birthDate: string;
  ageLabel: string;
  area: string;
  lastAppointment: string | null;
  dispensary: boolean;
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
    iin: "950412301234",
    birthDate: "12.04.1985",
    ageLabel: "41 год",
    area: "Участок №3",
    lastAppointment: "10.05.2026",
    dispensary: true,
  },
  {
    id: "2",
    fullName: "Нурмаганбетов Дулат Ерланович",
    shortName: "Нурмаганбетов Д.Е.",
    iin: "880623502345",
    birthDate: "23.06.1988",
    ageLabel: "37 лет",
    area: "Участок №3",
    lastAppointment: "08.05.2026",
    dispensary: false,
  },
  {
    id: "3",
    fullName: "Касымова Гульнара Рахимовна",
    shortName: "Касымова Г.Р.",
    iin: "900715603456",
    birthDate: "15.07.1990",
    ageLabel: "35 лет",
    area: "Участок №3",
    lastAppointment: "05.05.2026",
    dispensary: true,
  },
  {
    id: "4",
    fullName: "Жумабеков Асылхан Турлыбекович",
    shortName: "Жумабеков А.Т.",
    iin: "851209704567",
    birthDate: "09.12.1985",
    ageLabel: "40 лет",
    area: "Участок №3",
    lastAppointment: "28.04.2026",
    dispensary: false,
  },
  {
    id: "5",
    fullName: "Ибраева Мария Сериккызы",
    shortName: "Ибраева М.С.",
    iin: "920331805678",
    birthDate: "31.03.1992",
    ageLabel: "34 года",
    area: "Участок №3",
    lastAppointment: "20.04.2026",
    dispensary: false,
  },
  {
    id: "6",
    fullName: "Садыков Ержан Нурланович",
    shortName: "Садыков Е.Н.",
    iin: "870522906789",
    birthDate: "22.05.1987",
    ageLabel: "38 лет",
    area: "Участок №3",
    lastAppointment: "15.04.2026",
    dispensary: true,
  },
  {
    id: "7",
    fullName: "Тлеубергенова Айжан Кайратовна",
    shortName: "Тлеубергенова А.К.",
    iin: "910814107890",
    birthDate: "14.08.1991",
    ageLabel: "34 года",
    area: "Участок №3",
    lastAppointment: "12.04.2026",
    dispensary: false,
  },
  {
    id: "8",
    fullName: "Оспанова Жанар Рустемовна",
    shortName: "Оспанова Ж.Р.",
    iin: "930627218901",
    birthDate: "27.06.1993",
    ageLabel: "32 года",
    area: "Участок №2",
    lastAppointment: "10.04.2026",
    dispensary: false,
  },
  {
    id: "9",
    fullName: "Сейткали Марат Болатович",
    shortName: "Сейткали М.Б.",
    iin: "891103319012",
    birthDate: "03.11.1989",
    ageLabel: "36 лет",
    area: "Участок №3",
    lastAppointment: "02.04.2026",
    dispensary: true,
  },
  {
    id: "10",
    fullName: "Тастанов Руслан Серикович",
    shortName: "Тастанов Р.С.",
    iin: "860418420123",
    birthDate: "18.04.1986",
    ageLabel: "40 лет",
    area: "Участок №1",
    lastAppointment: "25.03.2026",
    dispensary: false,
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