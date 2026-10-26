import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";
import DoctorDateFields from "@/components/appointments/DoctorDateFields";
import { formatVisitDate } from "@/components/dashboard/reception/format";
import PatientSearchSelect from "@/components/ui/PatientSearchSelect";
import { createAppointment } from "@/lib/api/appointments";
import { getDoctors, type DoctorListItem } from "@/lib/api/employees";
import { todayIso } from "@/lib/dates";
import type { Appointment, Patient } from "@/lib/types";

type Props = {
  open: boolean;
  /** Закрыть окно («Готово», «Отмена», Esc). После записи тоже вызывается
   * только по нажатию «Готово» — окно остаётся, чтобы записать ещё одного. */
  onClose: () => void;
  /** Пациент подставлен и не редактируется (стойка, карточка пациента). Без
   * него в форме поиск пациента (страница /appointments). */
  patient?: Patient | null;
  /** Врач по умолчанию (например, «записать повторно» — к тому же врачу);
   * без него врача выбирают вручную. */
  defaultDoctorId?: number;
  /** Дата по умолчанию, YYYY-MM-DD; без неё — сегодня. */
  defaultDate?: string;
  /** Запись создана — вызывающий обновляет свои данные и запоминает результат. */
  onBooked?: (appointment: Appointment) => void;
};

const FIELD = "w-full rounded-lg border border-gray-200 px-3 py-2";

/** Запись пациента на приём — одна форма на все места: стойка регистратуры,
 * блок «Вышли от врача», карточка пациента, страница /appointments. Врач по
 * умолчанию — не выбран (подставляется только заданный вызывающим), время —
 * из свободных слотов врача или введённое вручную, жалоба обязательна. После записи окно
 * предлагает «Записать ещё одного» — сброс пациента и жалобы при сохранённых
 * враче и дате (мать и двое детей к одному врачу). */
export default function AppointmentBookingModal({
  open,
  onClose,
  patient = null,
  defaultDoctorId,
  defaultDate,
  onBooked,
}: Props) {
  const [chosenPatient, setChosenPatient] = useState<Patient | null>(patient);
  const [patientFixed, setPatientFixed] = useState(patient !== null);
  const [doctor, setDoctor] = useState<DoctorListItem | null>(null);
  const [date, setDate] = useState(defaultDate ?? todayIso());
  const [complaint, setComplaint] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);
  // Врача по умолчанию подставляем один раз за открытие: иначе стоило бы
  // начать стирать имя — оно тут же возвращалось бы.
  const doctorPicked = useRef(false);
  const [openCount, setOpenCount] = useState(0);

  const doctors = useQuery({
    queryKey: ["employees", "doctors"],
    queryFn: getDoctors,
    enabled: open,
  });

  // Каждое открытие — чистая форма (компонент не размонтируется между открытиями).
  useEffect(() => {
    if (!open) return;
    setChosenPatient(patient);
    setPatientFixed(patient !== null);
    setDoctor(null);
    doctorPicked.current = false;
    setDate(defaultDate ?? todayIso());
    setComplaint("");
    setError(null);
    setBooked(null);
    setOpenCount((count) => count + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient?.id, defaultDoctorId, defaultDate]);

  // Врач по умолчанию — только заданный вызывающим.
  useEffect(() => {
    if (!open || doctorPicked.current || !doctors.data) return;
    if (defaultDoctorId === undefined) return;
    doctorPicked.current = true;
    setDoctor(doctors.data.find((item) => item.id === defaultDoctorId) ?? null);
  }, [open, doctors.data, defaultDoctorId]);

  // Escape закрывает окно.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit =
    !saving && chosenPatient !== null && doctor !== null && date !== "" && complaint.trim() !== "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !chosenPatient || !doctor) return;
    setSaving(true);
    setError(null);
    try {
      const appointment = await createAppointment({
        patientId: chosenPatient.id,
        employeeId: String(doctor.id),
        date,
        complaint: complaint.trim(),
      });
      setBooked(appointment);
      onBooked?.(appointment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось записать пациента");
    } finally {
      setSaving(false);
    }
  }

  function bookAnother() {
    setBooked(null);
    setChosenPatient(null);
    setPatientFixed(false);
    setComplaint("");
    setError(null);
    doctorPicked.current = true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Запись на приём"
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Запись на приём</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {booked ? (
          <>
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {booked.patient}: пациент №{booked.queueNumber}, {formatVisitDate(booked.date)} ·{" "}
                {booked.doctor}
              </span>
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={bookAnother}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Записать ещё одного
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white hover:bg-[#14472e]"
              >
                Готово
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3">
              <div className="text-sm">
                <span className="mb-1 block text-gray-600">Пациент</span>
                {patientFixed && chosenPatient ? (
                  <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-900">
                    <span className="font-medium">{chosenPatient.fullName}</span>
                    <span className="text-gray-500"> · ИИН {chosenPatient.iin}</span>
                  </p>
                ) : (
                  <PatientSearchSelect
                    value={chosenPatient}
                    autoFocus={openCount > 0 && !chosenPatient}
                    onChange={setChosenPatient}
                  />
                )}
              </div>

              <DoctorDateFields
                open={open}
                doctors={doctors.data ?? []}
                doctor={doctor}
                onDoctorChange={(next) => {
                  doctorPicked.current = true; // выбор регистратора важнее подстановки
                  setDoctor(next);
                }}
                date={date}
                onDateChange={setDate}
              />

              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Жалоба</span>
                <textarea
                  value={complaint}
                  onChange={(event) => setComplaint(event.target.value)}
                  rows={3}
                  required
                  placeholder="С чем пациент пришёл"
                  className={FIELD}
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Записываем…" : "Записать"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
