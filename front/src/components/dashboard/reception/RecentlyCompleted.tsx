import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppointmentBookingModal from "@/components/appointments/AppointmentBookingModal";
import {
  formatClock,
  formatVisitDate,
  shortInvoiceNumber,
} from "@/components/dashboard/reception/format";
import InvoiceCreateModal from "@/components/invoices/InvoiceCreateModal";
import { getAppointments } from "@/lib/api/appointments";
import { getInvoices } from "@/lib/api/invoices";
import { getPatient } from "@/lib/api/patients";
import { addDays, todayIso } from "@/lib/dates";
import { useRefresh } from "@/lib/use-refresh";
import type { Appointment, Patient } from "@/lib/types";

const WINDOW_MINUTES = 120;
const MAX_ROWS = 3;
/** «Записать повторно» — по умолчанию через неделю. */
const REBOOK_AFTER_DAYS = 7;

/** «Вышли от врача» — приёмы, завершённые за последние 2 часа, по всем врачам.
 * Отсюда регистратор записывает пациента повторно (к тому же врачу, через
 * неделю) и выставляет счёт по приёму (appointment_id) — или видит уже
 * выставленный счёт ссылкой. */
export default function RecentlyCompleted() {
  const refresh = useRefresh();
  const completed = useQuery({
    queryKey: ["appointments", "completed-recent", WINDOW_MINUTES],
    queryFn: () => getAppointments({ completedWithin: WINDOW_MINUTES }),
    refetchInterval: 60_000,
  });
  const rows = completed.data ?? [];
  const shown = rows.slice(0, MAX_ROWS);
  const appointmentIds = shown.map((row) => Number(row.id));

  const invoices = useQuery({
    queryKey: ["invoices", "by-appointment", appointmentIds.join(",")],
    queryFn: () => getInvoices({ appointmentIds }),
    enabled: appointmentIds.length > 0,
  });
  // Отменённый счёт не считается: по такому приёму можно выставить новый.
  const invoiceByAppointment = new Map<number, { id: number; number: string }>();
  for (const invoice of invoices.data ?? []) {
    if (invoice.appointmentId !== null && invoice.status !== "cancelled") {
      invoiceByAppointment.set(invoice.appointmentId, { id: invoice.id, number: invoice.invoiceNumber });
    }
  }

  const [rebook, setRebook] = useState<{ patient: Patient; doctorId: number } | null>(null);
  const [rebookLoading, setRebookLoading] = useState<string | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<Appointment | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const justBooked = useRef(false);

  async function startRebook(row: Appointment) {
    if (!row.patientId || !row.employeeId) return;
    setRebookLoading(row.id);
    setError(null);
    try {
      const patient = await getPatient(row.patientId);
      setRebook({ patient, doctorId: Number(row.employeeId) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть карточку пациента");
    } finally {
      setRebookLoading(null);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-gray-900">Вышли от врача</h2>
        <p className="text-xs text-gray-400">за последние 2 часа</p>
      </div>

      {message && (
        <p role="status" className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
          {error}
        </p>
      )}

      {completed.isLoading ? (
        <p className="mt-2 text-[13px] text-gray-400">Загрузка…</p>
      ) : completed.isError ? (
        <p className="mt-2 text-[13px] text-gray-500">
          Не удалось загрузить.{" "}
          <button type="button" onClick={() => void completed.refetch()} className="text-[#1a5c3a] hover:underline">
            Повторить
          </button>
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-gray-500">Пока никто не завершил приём</p>
      ) : (
        <ul className="mt-1 divide-y divide-gray-50">
          {shown.map((row) => {
            const invoice = invoiceByAppointment.get(Number(row.id));
            return (
              <li key={row.id} className="flex items-center gap-3 py-1.5 text-[13px]">
                <span className="w-11 shrink-0 text-gray-400">
                  {row.completedAt ? formatClock(row.completedAt) : `№${row.queueNumber}`}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-800">
                  {row.patient}
                  <span className="text-gray-400"> · {row.doctor}</span>
                </span>
                <button
                  type="button"
                  disabled={rebookLoading === row.id}
                  onClick={() => void startRebook(row)}
                  className="shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Записать повторно
                </button>
                {invoice ? (
                  <Link
                    to={`/invoices/${invoice.id}`}
                    className="shrink-0 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    Счёт {shortInvoiceNumber(invoice.number)}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setInvoiceFor(row)}
                    className="shrink-0 rounded-md bg-[#1a5c3a] px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-[#14472e]"
                  >
                    Выставить счёт
                  </button>
                )}
              </li>
            );
          })}
          {rows.length > shown.length && (
            <li className="pt-1.5 text-xs text-gray-400">и ещё {rows.length - shown.length}</li>
          )}
        </ul>
      )}

      <AppointmentBookingModal
        open={rebook !== null}
        patient={rebook?.patient ?? null}
        defaultDoctorId={rebook?.doctorId}
        defaultDate={addDays(todayIso(), REBOOK_AFTER_DAYS)}
        onClose={() => {
          setRebook(null);
          justBooked.current = false;
        }}
        onBooked={(appointment) => {
          justBooked.current = true;
          setMessage(
            `${appointment.patient}: №${appointment.queueNumber}, ${formatVisitDate(appointment.date)} · ${appointment.doctor}`,
          );
          void refresh();
        }}
      />

      <InvoiceCreateModal
        open={invoiceFor !== null}
        onClose={() => setInvoiceFor(null)}
        patientId={Number(invoiceFor?.patientId ?? 0)}
        appointmentId={invoiceFor ? Number(invoiceFor.id) : undefined}
      />
    </section>
  );
}
