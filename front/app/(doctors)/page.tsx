import CurrentAppointment from "@/components/dashboard/CurrentAppointment";
import TodayAppointments from "@/components/dashboard/TodayAppointments";
import UpcomingWidget from "@/components/dashboard/UpcomingWidget";
import WeekStats from "@/components/dashboard/WeekStats";
import {
  currentAppointment,
  doctor,
  todayAppointments,
  weekStats,
} from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* Хлебные крошки + приветствие как в эталоне */}
      <div>
        <p className="text-xs text-gray-400">Главная</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Добрый день, {doctor.firstNamePatronymic}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
        {/* Левая колонка: текущий приём + таблица — одинаковая ширина */}
        <div className="space-y-5">
          <CurrentAppointment appointment={currentAppointment} />
          <TodayAppointments appointments={todayAppointments} />
        </div>

        {/* Правая колонка: виджеты */}
        <div className="space-y-5">
          <UpcomingWidget appointments={todayAppointments} />
          <WeekStats stats={weekStats} />
        </div>
      </div>
    </div>
  );
}
