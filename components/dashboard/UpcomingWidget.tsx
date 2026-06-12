import type { Appointment } from "@/lib/mock-data";

type Props = {
  appointments: Appointment[];
};

export default function UpcomingWidget({ appointments }: Props) {
  const upcoming = appointments
    .filter((a) => a.status === "scheduled")
    .slice(0, 3);

  return (
    <section className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Ближайшие</h2>

      <ul className="mt-3 divide-y divide-gray-100">
        {upcoming.length === 0 ? (
          <li className="py-3 text-xs text-gray-500">
            Нет запланированных приёмов
          </li>
        ) : (
          upcoming.map((appointment) => (
            <li key={appointment.id} className="py-3 first:pt-2 last:pb-0">
              <p className="text-sm font-semibold text-[#1a5c3a]">
                {appointment.time}
              </p>
              <p className="mt-0.5 text-sm font-medium text-gray-900">
                {appointment.patient}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {appointment.complaint}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
