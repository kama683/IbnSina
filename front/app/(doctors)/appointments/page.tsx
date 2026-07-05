import Link from "next/link";
import AppointmentsContent from "@/components/appointments/AppointmentsContent";
import {
  getAppointmentsInRange,
  getTodayAppointments,
} from "@/lib/api/appointments";
import { getCurrentDoctor } from "@/lib/api/doctors";
import { getPatients } from "@/lib/api/patients";
import {
  buildCalendarWeek,
  getCurrentWeekIsoRange,
  getDateForWeekOffset,
} from "@/lib/calendar-utils";

type Props = {
  searchParams: Promise<{ week?: string }>;
};

export default async function AppointmentsPage({ searchParams }: Props) {
  const { week } = await searchParams;
  const weekOffset = Number.parseInt(week ?? "0", 10) || 0;
  const weekDate = getDateForWeekOffset(weekOffset);
  const { from, to } = getCurrentWeekIsoRange(weekDate);
  const calendarWeek = buildCalendarWeek(weekDate);

  const [listAppointments, calendarAppointments, doctor, patientsPage] =
    await Promise.all([
      getTodayAppointments(),
      getAppointmentsInRange(from, to),
      getCurrentDoctor(),
      getPatients({ page: 1, limit: 100 }),
    ]);

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
        initialListAppointments={listAppointments}
        calendarAppointments={calendarAppointments}
        calendarWeek={calendarWeek}
        doctorShortName={doctor.shortName}
        doctorOffice={doctor.office}
        doctorFullName={doctor.fullName}
        weekOffset={weekOffset}
        patients={patientsPage.items}
      />
    </div>
  );
}
