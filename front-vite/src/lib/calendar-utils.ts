import type { AppointmentStatus } from "@/lib/types";

export const calendarStatusStyles: Record<
  AppointmentStatus,
  { bg: string; border: string; text: string; patient: string }
> = {
  completed: {
    bg: "bg-emerald-50",
    border: "border-l-emerald-500",
    text: "text-emerald-700",
    patient: "text-emerald-900",
  },
  in_progress: {
    bg: "bg-amber-50",
    border: "border-l-amber-500",
    text: "text-amber-700",
    patient: "text-amber-900",
  },
  scheduled: {
    bg: "bg-sky-50",
    border: "border-l-sky-500",
    text: "text-sky-700",
    patient: "text-sky-900",
  },
  cancelled: {
    bg: "bg-red-50",
    border: "border-l-red-400",
    text: "text-red-600",
    patient: "text-red-900",
  },
};

export const TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
] as const;

export type CalendarWeekDay = {
  key: string;
  label: string;
  date: string;
  title: string;
};

export type CalendarWeek = {
  period: string;
  days: CalendarWeekDay[];
};

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

function formatApiDate(value: Date): string {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${value.getFullYear()}`;
}

/** Текущая рабочая неделя (пн–сб) для заголовка календаря и сопоставления с API. */
export function buildCalendarWeek(baseDate = new Date()): CalendarWeek {
  const monday = new Date(baseDate);
  const weekday = monday.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  monday.setDate(monday.getDate() - daysFromMonday);

  const days: CalendarWeekDay[] = [];
  for (let i = 0; i < 6; i += 1) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    days.push({
      key: WEEKDAY_KEYS[i],
      label: WEEKDAY_LABELS[i],
      date: formatApiDate(current),
      title: `${current.getDate()} ${MONTHS_GENITIVE[current.getMonth()]}`,
    });
  }

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  const year = monday.getFullYear();

  return {
    period: `${monday.getDate()}–${saturday.getDate()} ${MONTHS_GENITIVE[monday.getMonth()]} ${year}`,
    days,
  };
}

/** ISO-даты пн и сб текущей недели для запроса GET /api/appointments?from=&to= */
export function getCurrentWeekIsoRange(baseDate = new Date()): {
  from: string;
  to: string;
} {
  const monday = new Date(baseDate);
  const weekday = monday.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  monday.setDate(monday.getDate() - daysFromMonday);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const toIso = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return { from: toIso(monday), to: toIso(saturday) };
}

/** Дата со сдвигом на N недель от текущей (0 = эта неделя). */
export function getDateForWeekOffset(weekOffset: number): Date {
  const base = new Date();
  if (weekOffset !== 0) {
    base.setDate(base.getDate() + weekOffset * 7);
  }
  return base;
}

/** Подпись для «сегодня» в формате «5 июля 2026». */
export function formatTodayLabel(baseDate = new Date()): string {
  return `${baseDate.getDate()} ${MONTHS_GENITIVE[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
}
