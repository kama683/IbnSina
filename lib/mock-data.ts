// Тип статуса — только эти 4 значения допустимы (TypeScript подскажет ошибку)
export type AppointmentStatus =
  | "completed"      // Завершён
  | "in_progress"   // На приёме
  | "scheduled"     // Записан
  | "cancelled";    // Отменён

// Описываем форму одного приёма — переиспользуем везде
export interface Appointment {
  id: string;
  time: string;       // "09:00"
  patient: string;    // "Ахметова А.С."
  complaint: string;  // жалоба пациента
  status: AppointmentStatus;
}

// Данные врача — позже придут из авторизации
export const doctor = {
  fullName: "Алибеков Серик Маратович",
  firstNamePatronymic: "Серик Маратович",
  shortName: "Алибеков С.М.",
  initials: "AC",
  role: "Терапевт",
  area: "Участок №3",
};

// Текущий приём — тот, что идёт прямо сейчас
export const currentAppointment: Appointment = {
  id: "current",
  time: "09:00",
  patient: "Ахметова А.С.",
  complaint: "Повышенное давление, gоловная боль",
  status: "in_progress",
};

// Список приёмов на сегодня — для таблицы (сделаем на следующем шаге)
export const todayAppointments: Appointment[] = [
    {
      id: "1",
      time: "08:30",
      patient: "Нурмаганбетов Д.Е.",
      complaint: "Боль в горле, температура",
      status: "completed",
    },
    {
      id: "2",
      time: "09:00",
      patient: "Ахметова А.С.",
      complaint: "Повышенное давление, головная боль",
      status: "in_progress",
    },
    {
      id: "3",
      time: "09:30",
      patient: "Касымова Г.Р.",
      complaint: "Кашель, насморк",
      status: "scheduled",
    },
    {
      id: "4",
      time: "10:00",
      patient: "Жумабеков А.Т.",
      complaint: "Боль в спине",
      status: "scheduled",
    },
    {
      id: "5",
      time: "10:30",
      patient: "Ибраева М.С.",
      complaint: "Плановый осмотр",
      status: "scheduled",
    },
    {
      id: "6",
      time: "11:00",
      patient: "Садыков Е.Н.",
      complaint: "Аллергическая реакция",
      status: "cancelled",
    },
    {
      id: "7",
      time: "11:30",
      patient: "Тлеубергенова А.К.",
      complaint: "Головокружение",
      status: "scheduled",
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