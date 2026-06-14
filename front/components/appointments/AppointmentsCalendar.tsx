import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@/lib/mock-data";
import { doctor } from "@/lib/mock-data";
import {
  CALENDAR_WEEK,
  TIME_SLOTS,
  calendarStatusStyles,
} from "@/lib/calendar-utils";

type Props = {
  appointments: Appointment[];
};

function findAppointment(
  appointments: Appointment[],
  date: string,
  time: string,
) {
  return appointments.find((a) => a.date === date && a.time === time);
}

export default function AppointmentsCalendar({ appointments }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Предыдущая неделя"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            {CALENDAR_WEEK.period}
          </span>
          <button
            type="button"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Следующая неделя"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {doctor.shortName} — Кабинет 214
        </p>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[900px]"
          style={{
            gridTemplateColumns: `56px repeat(${CALENDAR_WEEK.days.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="border-b border-r border-gray-100 bg-gray-50/50" />
          {CALENDAR_WEEK.days.map((day) => (
            <div
              key={day.key}
              className="border-b border-r border-gray-100 bg-gray-50/50 px-2 py-2.5 text-center last:border-r-0"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                {day.label}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-gray-900">
                {day.title}
              </p>
            </div>
          ))}

          {TIME_SLOTS.map((time) => (
            <div key={time} className="contents">
              <div className="flex items-start justify-end border-b border-r border-gray-100 px-2 py-2 text-[11px] tabular-nums text-gray-400">
                {time}
              </div>
              {CALENDAR_WEEK.days.map((day) => {
                const appointment = findAppointment(
                  appointments,
                  day.date,
                  time,
                );
                const styles = appointment
                  ? calendarStatusStyles[appointment.status]
                  : null;

                return (
                  <div
                    key={`${day.key}-${time}`}
                    className="min-h-[52px] border-b border-r border-gray-100 p-1 last:border-r-0"
                  >
                    {appointment && styles && (
                      <div
                        className={`h-full rounded-md border-l-[3px] px-2 py-1.5 ${styles.bg} ${styles.border}`}
                      >
                        <p
                          className={`text-[11px] font-semibold leading-tight ${styles.patient}`}
                        >
                          {appointment.patient}
                        </p>
                        <p
                          className={`mt-0.5 line-clamp-2 text-[10px] leading-tight ${styles.text}`}
                        >
                          {appointment.complaint}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
