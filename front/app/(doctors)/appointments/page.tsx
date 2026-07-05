import Link from "next/link";
import AppointmentsContent from "@/components/appointments/AppointmentsContent";
import {
  getTodayAppointments,
  getWeekAppointments,
} from "@/lib/api/appointments";
import { getCurrentDoctor } from "@/lib/api/doctors";
import { buildCalendarWeek } from "@/lib/calendar-utils";

export default async function AppointmentsPage() {
  const [listAppointments, calendarAppointments, doctor] = await Promise.all([
    getTodayAppointments(),
    getWeekAppointments(),
    getCurrentDoctor(),
  ]);

  const calendarWeek = buildCalendarWeek();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <span className="text-gray-600">Приёмы</span>
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Приёмы
        </h1>
      </div>

      <AppointmentsContent
        listAppointments={listAppointments}
        calendarAppointments={calendarAppointments}
        calendarWeek={calendarWeek}
        doctorShortName={doctor.shortName}
      />
    </div>
  );
}
