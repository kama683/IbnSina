import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@/lib/types";
import { calendarStatusStyles, type CalendarWeek } from "@/lib/calendar-utils";

type Props = {
  appointments: Appointment[];
  week: CalendarWeek;
  doctorShortName: string;
  doctorOffice: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

function appointmentsOfDay(appointments: Appointment[], date: string) {
  return appointments
    .filter((a) => a.date === date)
    .sort((x, y) => x.queueNumber - y.queueNumber);
}

export default function AppointmentsCalendar({
  appointments,
  week,
  doctorShortName,
  doctorOffice,
  onPrevWeek,
  onNextWeek,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevWeek}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Предыдущая неделя"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            {week.period}
          </span>
          <button
            type="button"
            onClick={onNextWeek}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Следующая неделя"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {doctorShortName}
          {doctorOffice ? ` — ${doctorOffice}` : ""}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[900px]"
          style={{ gridTemplateColumns: `repeat(${week.days.length}, minmax(0, 1fr))` }}
        >
          {week.days.map((day) => (
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

          {week.days.map((day) => (
            <div
              key={`${day.key}-list`}
              className="min-h-[160px] space-y-1.5 border-r border-gray-100 p-1.5 last:border-r-0"
            >
              {appointmentsOfDay(appointments, day.date).map((appointment) => {
                const styles = calendarStatusStyles[appointment.status];
                return (
                  <div
                    key={appointment.id}
                    className={`rounded-md border-l-[3px] px-2 py-1.5 ${styles.bg} ${styles.border}`}
                  >
                    <p className={`text-[11px] font-semibold leading-tight ${styles.patient}`}>
                      №{appointment.queueNumber} · {appointment.patient}
                    </p>
                    <p className={`mt-0.5 line-clamp-2 text-[10px] leading-tight ${styles.text}`}>
                      {appointment.complaint}
                    </p>
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
