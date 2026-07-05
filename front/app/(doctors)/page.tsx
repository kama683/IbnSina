import CurrentAppointment from "@/components/dashboard/CurrentAppointment";
import TodayAppointments from "@/components/dashboard/TodayAppointments";
import UpcomingWidget from "@/components/dashboard/UpcomingWidget";
import WeekStats from "@/components/dashboard/WeekStats";
import { getCurrentDoctor } from "@/lib/api/doctors";
import {
  getCurrentAppointment,
  getTodayAppointments,
  getWeekStats,
} from "@/lib/api/appointments";
import { formatTodayLabel } from "@/lib/calendar-utils";

export default async function DashboardPage() {
  const [doctor, currentAppointment, todayAppointments, weekStats] =
    await Promise.all([
      getCurrentDoctor(),
      getCurrentAppointment(),
      getTodayAppointments(),
      getWeekStats(),
    ]);

  const todaySubtitle = [
    formatTodayLabel(),
    doctor.office ? doctor.office : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">Главная</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Добрый день, {doctor.firstNamePatronymic}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          {currentAppointment && (
            <CurrentAppointment appointment={currentAppointment} />
          )}
          <TodayAppointments
            appointments={todayAppointments}
            subtitle={todaySubtitle}
          />
        </div>

        <div className="space-y-5">
          <UpcomingWidget appointments={todayAppointments} />
          <WeekStats stats={weekStats} />
        </div>
      </div>
    </div>
  );
}
