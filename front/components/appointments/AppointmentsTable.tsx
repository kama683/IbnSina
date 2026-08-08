"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import AppointmentActions from "@/components/appointments/AppointmentActions";
import type { EmployeeRole } from "@/lib/api/employees";
import type { Appointment } from "@/lib/types";
import { ChevronRight } from "lucide-react";

type Props = {
  appointments: Appointment[];
  currentEmployeeId: number;
  currentEmployeeRole: EmployeeRole;
};

export default function AppointmentsTable({
  appointments,
  currentEmployeeId,
  currentEmployeeRole,
}: Props) {
  const router = useRouter();
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              <th className="px-5 py-2.5">Дата</th>
              <th className="px-5 py-2.5">Время</th>
              <th className="px-5 py-2.5">Пациент</th>
              <th className="px-5 py-2.5">Жалоба</th>
              <th className="px-5 py-2.5">Диагноз</th>
              <th className="px-5 py-2.5">Врач</th>
              <th className="px-5 py-2.5">Статус</th>
              <th className="px-5 py-2.5">Действия</th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr
                key={appointment.id}
                className="group relative border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/80"
              >
                <td className="px-5 py-3 text-sm text-gray-500">
                  {appointment.date}
                </td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">
                  {appointment.time}
                </td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">
                  {appointment.patient}
                </td>
                <td className="max-w-[180px] truncate px-5 py-3 text-sm text-gray-500">
                  {appointment.complaint}
                </td>
                <td className="max-w-[180px] truncate px-5 py-3 text-sm text-gray-500">
                  {appointment.diagnosis ?? "—"}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {appointment.doctor}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={appointment.status} />
                </td>
                <td className="relative z-10 px-5 py-3">
                  <AppointmentActions
                    appointment={appointment}
                    currentEmployeeId={currentEmployeeId}
                    currentEmployeeRole={currentEmployeeRole}
                    onChanged={() => router.refresh()}
                  />
                </td>
                <td className="px-2 py-3 text-gray-300 group-hover:text-gray-400">
                  <Link
                    href={`/patients/${appointment.patientId}`}
                    className="absolute inset-0"
                    aria-label={`Открыть карточку пациента ${appointment.patient}`}
                  />
                  <ChevronRight className="h-4 w-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
