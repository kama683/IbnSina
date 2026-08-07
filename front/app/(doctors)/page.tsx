import CurrentAppointment from "@/components/dashboard/CurrentAppointment";
import TodayAppointments from "@/components/dashboard/TodayAppointments";
import UpcomingWidget from "@/components/dashboard/UpcomingWidget";
import WeekStats from "@/components/dashboard/WeekStats";
import { getDoctorProfile } from "@/lib/api/doctors";
import { getCurrentEmployee } from "@/lib/api/employees";
import {
  getCurrentAppointment,
  getTodayAppointments,
  getWeekStats,
} from "@/lib/api/appointments";
import { formatTodayLabel } from "@/lib/calendar-utils";
import {
  HAS_DOCTOR_PROFILE_ROLES,
  VIEW_SCHEDULE_ROLES,
  VIEW_STATS_ROLES,
} from "@/lib/roles";

export default async function DashboardPage() {
  const employee = await getCurrentEmployee();

  const canViewSchedule = VIEW_SCHEDULE_ROLES.includes(employee.role);
  const canViewStats = VIEW_STATS_ROLES.includes(employee.role);
  const hasDoctorProfile = HAS_DOCTOR_PROFILE_ROLES.includes(employee.role);

  const [office, currentAppointment, todayAppointments, weekStats] =
    await Promise.all([
      hasDoctorProfile ? getDoctorProfile().then((p) => p.office) : null,
      canViewSchedule ? getCurrentAppointment() : null,
      canViewSchedule ? getTodayAppointments() : null,
      canViewStats ? getWeekStats() : null,
    ]);

  const todaySubtitle = [formatTodayLabel(), office].filter(Boolean).join(" — ");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">Главная</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Добрый день, {employee.firstNamePatronymic}
        </h1>
      </div>

      {canViewSchedule ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            {currentAppointment && (
              <CurrentAppointment appointment={currentAppointment} />
            )}
            <TodayAppointments
              appointments={todayAppointments ?? []}
              subtitle={todaySubtitle}
            />
          </div>

          <div className="space-y-5">
            <UpcomingWidget appointments={todayAppointments ?? []} />
            {canViewStats && weekStats && <WeekStats stats={weekStats} />}
          </div>
        </div>
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
