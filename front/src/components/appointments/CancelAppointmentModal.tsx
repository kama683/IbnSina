import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { shortRuDate } from "@/lib/dates";
import { cancelAppointment } from "@/lib/api/appointments";
import { CANCELLATION_REASONS, type CancellationReasonCode } from "@/lib/cancellation";
import type { Appointment } from "@/lib/types";

type Props = {
  /** null — окно закрыто. */
  appointment: Appointment | null;
  onClose: () => void;
  onCancelled?: (appointment: Appointment) => void;
};

/** Отмена приёма: подтверждение + обязательная причина из справочника; для
 * «Другое» — ещё и текст. Одно окно на стойку, очередь, список приёмов и
 * карточку пациента. Отменить можно только запланированный приём (бэкенд). */
export default function CancelAppointmentModal({ appointment, onClose, onCancelled }: Props) {
  const [code, setCode] = useState<CancellationReasonCode | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCode(null);
    setText("");
    setError(null);
  }, [appointment?.id]);

  useEffect(() => {
    if (!appointment) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appointment, onClose]);

  if (!appointment) return null;

  const canSubmit = !saving && code !== null && (code !== "other" || text.trim() !== "");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !code || !appointment) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await cancelAppointment(appointment.id, { code, text });
      onCancelled?.(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить приём");
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
        aria-label="Отмена приёма"
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Отменить приём?</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <span className="font-medium text-gray-900">{appointment.patient}</span>
          {" · "}
          {shortRuDate(appointment.date)}, №{appointment.queueNumber} · {appointment.doctor}
        </p>

        <fieldset className="mt-4">
          <legend className="mb-1.5 text-sm text-gray-600">Причина отмены</legend>
          <div className="space-y-1">
            {CANCELLATION_REASONS.map((reason) => (
              <label
                key={reason.code}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="cancellation-reason"
                  value={reason.code}
                  checked={code === reason.code}
                  onChange={() => setCode(reason.code)}
                  className="h-4 w-4 accent-[#1a5c3a]"
                />
                {reason.label}
              </label>
            ))}
          </div>
        </fieldset>

        {code === "other" && (
          <label className="mt-2 block text-sm">
            <span className="mb-1 block text-gray-600">Опишите причину</span>
            <textarea
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              maxLength={300}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">
            Не отменять
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Отменяем…" : "Отменить приём"}
          </button>
        </div>
      </form>
    </div>
  );
}
