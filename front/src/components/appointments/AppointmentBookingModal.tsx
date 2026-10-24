import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import Autocomplete from "@/components/ui/Autocomplete";
import { createAppointment, getAvailableSlots } from "@/lib/api/appointments";
import { getDoctors, type DoctorListItem } from "@/lib/api/employees";
import type { Appointment, Patient } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Пациент подставлен и не редактируется (стойка, карточка пациента). Без
   * него в форме выбор из `patients` (страница /appointments). */
  patient?: Patient | null;
  patients?: Patient[];
  /** Дата по умолчанию, YYYY-MM-DD; без неё — сегодня. */
  defaultDate?: string;
  /** Запись создана: модалку закрывает вызывающий, подтверждение показывает он же. */
  onBooked: (appointment: Appointment) => void;
};

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const FIELD = "w-full rounded-lg border border-gray-200 px-3 py-2";

/** Запись пациента на приём — одна форма на все места: стойка регистратуры,
 * карточка пациента, страница /appointments. Врач по умолчанию — врач участка
 * пациента (регистратор может выбрать другого), время — только из свободных
 * слотов выбранного врача на выбранную дату (бэкенд всё равно перепроверяет),
 * жалоба обязательна. */
export default function AppointmentBookingModal({
  open,
  onClose,
  patient = null,
  patients = [],
  defaultDate,
  onBooked,
}: Props) {
  const [chosenPatient, setChosenPatient] = useState<Patient | null>(patient);
  const [doctor, setDoctor] = useState<DoctorListItem | null>(null);
  const [date, setDate] = useState(defaultDate ?? todayIso());
  const [time, setTime] = useState("");
  const [complaint, setComplaint] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Врача участка подставляем один раз за открытие/выбор пациента. Если бы
  // подстановка срабатывала всякий раз, когда врач пуст, сменить его было бы
  // невозможно: стоит начать стирать имя — оно тут же возвращалось бы.
  const doctorPicked = useRef(false);

  const doctors = useQuery({
    queryKey: ["employees", "doctors"],
    queryFn: getDoctors,
    enabled: open,
  });
  const slots = useQuery({
    queryKey: ["appointments", "slots", doctor?.id, date],
    queryFn: () => getAvailableSlots(String(doctor!.id), date),
    enabled: open && doctor !== null && date !== "",
  });

  // Каждое открытие — чистая форма: компонент не размонтируется между
  // открытиями, поэтому состояние сбрасываем явно.
  useEffect(() => {
    if (!open) return;
    setChosenPatient(patient);
    setDoctor(null);
    doctorPicked.current = false;
    setDate(defaultDate ?? todayIso());
    setTime("");
    setComplaint("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient?.id]);

  // Врач по умолчанию — врач участка выбранного пациента.
  useEffect(() => {
    if (!open || doctorPicked.current || !chosenPatient || !doctors.data) return;
    doctorPicked.current = true;
    const areaDoctor = doctors.data.find((item) => item.area === chosenPatient.area);
    if (areaDoctor) setDoctor(areaDoctor);
  }, [open, chosenPatient, doctors.data]);

  // Выбранное время могло перестать быть свободным после смены врача/даты.
  useEffect(() => {
    if (time && slots.data && !slots.data.includes(time)) setTime("");
  }, [slots.data, time]);

  // Escape закрывает модалку.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit =
    !saving && chosenPatient !== null && doctor !== null && time !== "" && complaint.trim() !== "";

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
        time,
        complaint: complaint.trim(),
      });
      onBooked(appointment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось записать пациента");
      // Слот могли занять, пока форма была открыта — подтягиваем свежие.
      void slots.refetch();
    } finally {
      setSaving(false);
    }
  }

  const timePlaceholder = !doctor
    ? "Сначала выберите врача"
    : slots.isLoading
      ? "Загрузка…"
      : slots.isError
        ? "Не удалось загрузить слоты"
        : (slots.data ?? []).length === 0
          ? "Нет свободных слотов"
          : "Выберите время";

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

        <div className="grid gap-3">
          <div className="text-sm">
            <span className="mb-1 block text-gray-600">Пациент</span>
            {patient ? (
              <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-900">
                <span className="font-medium">{patient.fullName}</span>
                <span className="text-gray-500"> · ИИН {patient.iin}</span>
              </p>
            ) : (
              <Autocomplete
                items={patients}
                value={chosenPatient}
                onChange={(next) => {
                  setChosenPatient(next);
                  setDoctor(null);
                  doctorPicked.current = false; // врач участка подберётся заново
                }}
                getLabel={(item) => item.fullName}
                getSubLabel={(item) => `ИИН ${item.iin} · ${item.area}`}
                getKey={(item) => item.id}
                placeholder="Начните вводить ФИО или ИИН"
              />
            )}
          </div>

          <div className="text-sm">
            <span className="mb-1 block text-gray-600">Врач</span>
            <Autocomplete
              items={doctors.data ?? []}
              value={doctor}
              onChange={(next) => {
                doctorPicked.current = true; // выбор регистратора важнее подстановки
                setDoctor(next);
                setTime("");
              }}
              getLabel={(item) => item.shortName}
              getSubLabel={(item) => [item.specialty, item.area].filter(Boolean).join(" · ")}
              getKey={(item) => item.id}
              placeholder="Начните вводить фамилию врача"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">Дата</span>
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setTime("");
                }}
                className={FIELD}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">Время</span>
              <select
                value={time}
                disabled={!doctor || slots.isLoading}
                onChange={(event) => setTime(event.target.value)}
                className={`${FIELD} disabled:bg-gray-50 disabled:text-gray-400`}
              >
                <option value="">{timePlaceholder}</option>
                {(slots.data ?? []).map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
          </div>

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
      </form>
    </div>
  );
}
