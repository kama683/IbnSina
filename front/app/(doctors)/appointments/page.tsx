import Link from "next/link";
import AppointmentsContent from "@/components/appointments/AppointmentsContent";
import { todayAppointments, weekAppointments } from "@/lib/mock-data";

export default function AppointmentsPage() {
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
        listAppointments={todayAppointments}
        calendarAppointments={weekAppointments}
      />
    </div>
  );
}
