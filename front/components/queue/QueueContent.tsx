"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  getQueueAppointments,
  updateAppointmentStatus,
} from "@/lib/api/appointments";
import type { Appointment } from "@/lib/mock-data";

type Props = {
  initialAppointments: Appointment[];
};

export default function QueueContent({ initialAppointments }: Props) {
  const router = useRouter();
  const [appointments, setAppointments] = useState(initialAppointments);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshQueue() {
    const data = await getQueueAppointments();
    setAppointments(data);
  }

  async function handleStatusChange(
    appointment: Appointment,
    status: Appointment["status"],
  ) {
    setLoadingId(appointment.id);
    setError(null);

    try {
      await updateAppointmentStatus(appointment.id, status);
      await refreshQueue();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось обновить статус",
      );
    } finally {
      setLoadingId(null);
    }
  }

  const current = appointments.find((item) => item.status === "in_progress");

  return (
    <div className="space-y-5">
      {current && (
        <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-5 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
            Сейчас на приёме
          </p>
          <p className="mt-1 text-base font-semibold text-gray-900">
            {current.patient} · {current.time}
          </p>
          <p className="mt-0.5 text-sm text-gray-600">{current.complaint}</p>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Очередь на сегодня
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {appointments.length}{" "}
            {appointments.length === 1 ? "пациент" : "пациентов"} в очереди
          </p>
        </div>

        {appointments.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            Очередь пуста — нет записанных приёмов на сегодня
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5">Время</th>
                  <th className="px-5 py-2.5">Пациент</th>
                  <th className="px-5 py-2.5">Жалоба</th>
                  <th className="px-5 py-2.5">Статус</th>
                  <th className="px-5 py-2.5">Действия</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/80"
                  >
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">
                      {appointment.time}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">
                      {appointment.patient}
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-3 text-sm text-gray-500">
                      {appointment.complaint}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={appointment.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        {appointment.status === "scheduled" && (
                          <button
                            type="button"
                            disabled={loadingId === appointment.id}
                            onClick={() =>
                              handleStatusChange(appointment, "in_progress")
                            }
                            className="rounded-lg bg-[#1a5c3a] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#14472e] disabled:opacity-50"
                          >
                            Начать
                          </button>
                        )}
                        {appointment.status === "in_progress" && (
                          <>
                            <Link
                              href={`/patients/${appointment.patientId}/examination`}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              Осмотр
                            </Link>
                            <button
                              type="button"
                              disabled={loadingId === appointment.id}
                              onClick={() =>
                                handleStatusChange(appointment, "completed")
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Завершить
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
