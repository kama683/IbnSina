import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import DoctorDateFields from "@/components/appointments/DoctorDateFields";
import { rescheduleAppointment } from "@/lib/api/appointments";
import { getDoctors, type DoctorListItem } from "@/lib/api/employees";
import { ruToIso, shortRuDate } from "@/lib/dates";
import type { Appointment } from "@/lib/types";

type Props = {
  /** null — окно закрыто. */
  appointment: Appointment | null;
  onClose: () => void;
  onRescheduled?: (appointment: Appointment) => void;
};

/** Перенос приёма: новая дата — у того же врача или другого (выбор врача
 * подставлен текущим). Один компонент на стойку, очередь, список приёмов и
 * карточку пациента. Пациент встаёт в конец очереди нового дня. Перенести можно только
 * запланированный приём (бэкенд). */
export default function RescheduleAppointmentModal({ appointment, onClose, onRescheduled }: Props) {
  const [doctor, setDoctor] = useState<DoctorListItem | null>(null);
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Текущего врача подставляем один раз за открытие — иначе, стоит начать
  // стирать имя, чтобы выбрать другого, оно тут же возвращалось бы.
  const doctorInit = useRef(false);

  const doctors = useQuery({
    queryKey: ["employees", "doctors"],
    queryFn: getDoctors,
    enabled: appointment !== null,
  });

  // Открытие: дата и врач — текущие.
  useEffect(() => {
    if (!appointment) return;
    setDate(ruToIso(appointment.date));
    setError(null);
    setDoctor(null);
    doctorInit.current = false;
  }, [appointment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!appointment || doctorInit.current || !doctors.data) return;
    doctorInit.current = true;
    setDoctor(doctors.data.find((item) => String(item.id) === appointment.employeeId) ?? null);
  }, [appointment, doctors.data]);

  useEffect(() => {
    if (!appointment) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appointment, onClose]);

  if (!appointment) return null;

  const canSubmit = !saving && doctor !== null && date !== "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !appointment || !doctor) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await rescheduleAppointment(appointment.id, {
        date,
        employeeId: String(doctor.id),
      });
      onRescheduled?.(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось перенести приём");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(event) => event.stopPropagation()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Перенос приёма"
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Перенести приём</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <span className="font-medium text-gray-900">{appointment.patient}</span>
          {" · сейчас "}
          {shortRuDate(appointment.date)}, №{appointment.queueNumber} · {appointment.doctor}
        </p>

        <div className="grid gap-3">
          <DoctorDateFields
            open
            doctors={doctors.data ?? []}
            doctor={doctor}
            onDoctorChange={setDoctor}
            date={date}
            onDateChange={setDate}
          />
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">
            Закрыть
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Переносим…" : "Перенести"}
          </button>
        </div>
      </form>
    </div>
  );
}
