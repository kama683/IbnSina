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