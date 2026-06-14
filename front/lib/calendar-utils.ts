import type { AppointmentStatus } from "@/lib/mock-data";

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

export const CALENDAR_WEEK = {
  period: "22–28 мая 2026",
  days: [
    { key: "mon", label: "Пн", date: "25.05.2026", title: "25 мая" },
    { key: "tue", label: "Вт", date: "26.05.2026", title: "26 мая" },
    { key: "wed", label: "Ср", date: "27.05.2026", title: "27 мая" },
    { key: "thu", label: "Чт", date: "28.05.2026", title: "28 мая" },
    { key: "fri", label: "Пт", date: "29.05.2026", title: "29 мая" },
    { key: "sat", label: "Сб", date: "30.05.2026", title: "30 мая" },
  ],
} as const;

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
