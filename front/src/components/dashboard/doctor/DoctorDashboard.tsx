import { useQuery } from "@tanstack/react-query";
import CurrentAppointment from "@/components/dashboard/doctor/CurrentAppointment";
import TodayAppointments from "@/components/dashboard/doctor/TodayAppointments";
import UpcomingWidget from "@/components/dashboard/doctor/UpcomingWidget";
import WeekStats from "@/components/dashboard/doctor/WeekStats";
import QueryBoundary from "@/components/ui/QueryBoundary";
import {
  getCurrentAppointment,
  getTodayAppointments,
  getWeekStats,
} from "@/lib/api/appointments";
import { getDoctorProfile } from "@/lib/api/doctors";
import { useEmployee } from "@/lib/auth/employee-context";
import { formatTodayLabel } from "@/lib/calendar-utils";
import {
  HAS_DOCTOR_PROFILE_ROLES,
  VIEW_SCHEDULE_ROLES,
  VIEW_STATS_ROLES,
} from "@/lib/roles";

/** Рабочее место врача (doctor, head_doctor, nurse): текущий приём, приёмы на
 * сегодня, ближайшие, статистика недели. Регистратура — отдельный экран
 * (dashboard/reception/ReceptionHome). */
export default function DoctorDashboard() {
  const employee = useEmployee();

  const canViewSchedule = VIEW_SCHEDULE_ROLES.includes(employee.role);
  const canViewStats = VIEW_STATS_ROLES.includes(employee.role);
  const hasDoctorProfile = HAS_DOCTOR_PROFILE_ROLES.includes(employee.role);

  // Запросы по роли: то, что бэкенд всё равно не отдаст (403), не запрашиваем.
  const office = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: getDoctorProfile,
    enabled: hasDoctorProfile,
    select: (profile) => profile.office,
  });
  const currentAppointment = useQuery({
    queryKey: ["appointments", "current"],
    queryFn: getCurrentAppointment,
    enabled: canViewSchedule,
  });
  const todayAppointments = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: getTodayAppointments,
    enabled: canViewSchedule,
  });
  const weekStats = useQuery({
    queryKey: ["appointments", "stats", "week"],
    queryFn: getWeekStats,
    enabled: canViewStats,
  });

  const todaySubtitle = [formatTodayLabel(), office.data]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">Главная</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Добрый день, {employee.firstNamePatronymic}
        </h1>
      </div>

      <QueryBoundary
        queries={[office, currentAppointment, todayAppointments, weekStats]}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            {currentAppointment.data && (
              <CurrentAppointment appointment={currentAppointment.data} />
            )}
            <TodayAppointments
              appointments={todayAppointments.data ?? []}
              subtitle={todaySubtitle}
            />
          </div>

          <div className="space-y-5">
            <UpcomingWidget appointments={todayAppointments.data ?? []} />
            {canViewStats && weekStats.data && (
              <WeekStats stats={weekStats.data} />
            )}
          </div>
        </div>
      </QueryBoundary>
    </div>
  );
}
