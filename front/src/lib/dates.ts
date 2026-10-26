/** Даты в формате YYYY-MM-DD в локальном часовом поясе (toISOString даёт UTC,
 * и ночью «сегодня» оказывалось вчерашним днём). */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return toIsoDate(new Date(year, month - 1, day + days));
}

/** «26.10.2026» (так бэкенд отдаёт даты приёмов) → «2026-10-26». */
export function ruToIso(ddmmyyyy: string): string {
  return ddmmyyyy.split(".").reverse().join("-");
}

/** «пн, 26 окт.» */
export function dayLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/** «26.10.2026» → «26 окт». */
export function shortRuDate(ddmmyyyy: string): string {
  const [day, month] = ddmmyyyy.split(".").map(Number);
  if (!day || !month) return ddmmyyyy;
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** «2026-10-26» → «26 октября». */
export function formatDayMonth(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS_GENITIVE[month - 1]}`;
}

/** «2026-10-26» → «26.10.2026». */
export function isoToRu(iso: string): string {
  return iso.split("-").reverse().join(".");
}

/** «2026-10-26T12:05:00» → «12:05» (локальное время БД, без пересчёта часового пояса). */
export function clockOf(iso: string): string {
  return iso.slice(11, 16);
}

/** Фактическое время приёма: «12:05–12:31», «с 12:05» пока идёт, пусто — если не начинался. */
export function visitTimeRange(startedAt?: string | null, completedAt?: string | null): string {
  if (!startedAt) return completedAt ? clockOf(completedAt) : "";
  if (!completedAt) return `с ${clockOf(startedAt)}`;
  return `${clockOf(startedAt)}–${clockOf(completedAt)}`;
}
