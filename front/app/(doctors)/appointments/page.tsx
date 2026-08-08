import Link from "next/link";
import AppointmentsContent from "@/components/appointments/AppointmentsContent";
import {
  getAppointmentsInRange,
  getTodayAppointments,
} from "@/lib/api/appointments";
import { getDoctorProfile } from "@/lib/api/doctors";
import { getCurrentEmployee } from "@/lib/api/employees";
import { getPatients } from "@/lib/api/patients";
import {
  buildCalendarWeek,
  getCurrentWeekIsoRange,
  getDateForWeekOffset,
} from "@/lib/calendar-utils";
import { HAS_DOCTOR_PROFILE_ROLES, VIEW_SCHEDULE_ROLES } from "@/lib/roles";

type Props = {
  searchParams: Promise<{ week?: string }>;
};

export default async function AppointmentsPage({ searchParams }: Props) {
  const { week } = await searchParams;
  const weekOffset = Number.parseInt(week ?? "0", 10) || 0;
  const weekDate = getDateForWeekOffset(weekOffset);
  const { from, to } = getCurrentWeekIsoRange(weekDate);
  const calendarWeek = buildCalendarWeek(weekDate);

  const employee = await getCurrentEmployee();

  if (!VIEW_SCHEDULE_ROLES.includes(employee.role)) {
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
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
          Расписание приёмов недоступно для вашей роли.
        </div>
      </div>
    );
  }

  // office имеет смысл только для doctor/head_doctor (у остальных ролей нет
  // doctor_profile) — для reception/nurse оставляем пустую строку.
  const [listAppointments, calendarAppointments, office, patientsPage] =
    await Promise.all([
      getTodayAppointments(),
      getAppointmentsInRange(from, to),
      HAS_DOCTOR_PROFILE_ROLES.includes(employee.role)
        ? getDoctorProfile().then((p) => p.office)
        : Promise.resolve(""),
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
        doctorShortName={employee.shortName}
        doctorOffice={office}
        weekOffset={weekOffset}
        patients={patientsPage.items}
      />
    </div>
  );
}
