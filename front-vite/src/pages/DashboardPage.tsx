import { useQuery } from "@tanstack/react-query";
import CurrentAppointment from "@/components/dashboard/CurrentAppointment";
import ReceptionQuickSearch from "@/components/dashboard/ReceptionQuickSearch";
import TodayAppointments from "@/components/dashboard/TodayAppointments";
import UpcomingWidget from "@/components/dashboard/UpcomingWidget";
import WeekStats from "@/components/dashboard/WeekStats";
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

export default function DashboardPage() {
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

      {canViewSchedule ? (
        <QueryBoundary
          queries={[office, currentAppointment, todayAppointments, weekStats]}
        >
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              {employee.role === "reception" && <ReceptionQuickSearch />}
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
      ) : (
        // Этап 0: для accountant/admin рабочих виджетов ещё нет — появятся
        // на следующих этапах (финансы/учёт, соответственно).
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
          Рабочее пространство для вашей роли появится на следующих этапах.
        </div>
      )}
    </div>
  );
}
