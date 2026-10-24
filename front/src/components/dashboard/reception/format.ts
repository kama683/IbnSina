import type { Patient } from "@/lib/types";

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** «воскресенье, 25 октября» */
export function formatLongDate(date = new Date()): string {
  return date.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

/** «08:06» из локального ISO без часового пояса («2026-10-25T08:06:00»). */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

/** «12.03.2026» (так бэкенд отдаёт даты приёмов) → «12 марта»; год — только
 * если визит не в этом году. */
export function formatVisitDate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split(".").map(Number);
  if (!day || !month || !year) return ddmmyyyy;
  const base = `${day} ${MONTHS_GENITIVE[month - 1]}`;
  return year === new Date().getFullYear() ? base : `${base} ${year}`;
}

/** Номер счёта для списков: «2026-000418» → «№418». */
export function shortInvoiceNumber(number: string): string {
  const serial = Number.parseInt(number.split("-").pop() ?? "", 10);
  return Number.isNaN(serial) ? number : `№${serial}`;
}

/** «Кабинет 203» → «каб. 203». */
export function shortOffice(office: string): string {
  const trimmed = office.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^кабинет\s*/i, "каб. ");
}

/** «Участок №4» → «участок 4»; голое «1» (так участок заведён у части
 * пациентов) → «участок 1»; всё остальное — как есть. */
export function areaLabel(area: string): string {
  const trimmed = area.trim();
  if (/^\d+$/.test(trimmed)) return `участок ${trimmed}`;
  return trimmed.replace(/^участок\s*№?\s*/i, "участок ").toLowerCase();
}

/** Инициалы для кружка: «Иванов Иван Иванович» → «ИИ». */
export function initialsOf(fullName: string): string {
  const [surname = "", name = ""] = fullName.trim().split(/\s+/);
  return `${surname[0] ?? ""}${name[0] ?? ""}`.toUpperCase();
}

export function isFullIin(value: string): boolean {
  return /^\d{12}$/.test(value);
}

export function patientSummaryLine(patient: Patient, lastVisit: string): string {
  return [patient.ageLabel, areaLabel(patient.area), lastVisit].filter(Boolean).join(" · ");
}
