import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Search, UserPlus } from "lucide-react";
import AppointmentBookingModal from "@/components/appointments/AppointmentBookingModal";
import CancelAppointmentModal from "@/components/appointments/CancelAppointmentModal";
import RescheduleAppointmentModal from "@/components/appointments/RescheduleAppointmentModal";
import PatientCreateModal from "@/components/patients/PatientCreateModal";
import {
  formatVisitDate,
  initialsOf,
  isFullIin,
  patientSummaryLine,
  shortOffice,
} from "@/components/dashboard/reception/format";
import { getAppointments } from "@/lib/api/appointments";
import { getPatientHistory, getPatients } from "@/lib/api/patients";
import { shortRuDate, todayIso } from "@/lib/dates";
import { useRefresh } from "@/lib/use-refresh";
import type { Appointment, Patient } from "@/lib/types";

type Mode =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "list"; items: Patient[] }
  | { kind: "found"; patient: Patient }
  | { kind: "not-found"; query: string }
  | { kind: "error"; message: string };

/** Подпись последнего визита: берём первый ЗАВЕРШЁННЫЙ приём из истории
 * (в ней есть и будущие, и отменённые — они «визитом» не считаются). Склонять
 * фамилию врача («у Сериковой А.») не берёмся — формат «дата · врач». */
function useLastVisit(patient: Patient | null): string {
  const history = useQuery({
    queryKey: ["patients", patient?.id, "history"],
    queryFn: () => getPatientHistory(patient!.id),
    enabled: patient !== null,
  });
  if (!patient) return "";
  if (history.isLoading) return "…";
  if (history.isError || !history.data) return "";
  const visit = history.data.find((entry) => entry.status === "completed");
  return visit ? `был ${formatVisitDate(visit.date)} · ${visit.doctor}` : "визитов не было";
}

/** Ближайший неотменённый приём пациента (сегодня или позже): по нему
 * регистратор переносит или отменяет запись, не уходя со стойки. */
function useUpcomingAppointment(patient: Patient | null): Appointment | null {
  const upcoming = useQuery({
    queryKey: ["appointments", "upcoming", patient?.id],
    queryFn: () =>
      getAppointments({
        patientId: patient!.id,
        status: ["scheduled", "in_progress"],
        from: todayIso(),
      }),
    enabled: patient !== null,
  });
  return upcoming.data?.[0] ?? null;
}

/** «Кто у стойки» — главный блок рабочего места регистратуры: один поле
 * ввода (ИИН или фамилия), результат — мини-карточка пациента. */
export default function FrontDesk() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  // Запись и создание карточки — модалки поверх стойки: регистратор не уходит
  // с экрана. Созданный пациент сразу попадает в запись (один поток).
  const [bookingPatient, setBookingPatient] = useState<Patient | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const refresh = useRefresh();
  // Перенос и отмена ближайшего приёма — те же окна, что в очереди и списке.
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  // Была ли запись в открытом окне: по «Готово» сценарий завершён и поле очищается.
  const justBooked = useRef(false);

  const selected = mode.kind === "found" ? mode.patient : null;
  const lastVisit = useLastVisit(selected);
  const upcoming = useUpcomingAppointment(selected);

  /** Конец сценария: поле очищается, фокус возвращается в него. */
  function reset() {
    setValue("");
    setMode({ kind: "idle" });
    inputRef.current?.focus();
  }

  function handleBooked(appointment: Appointment) {
    // Окно остаётся открытым (можно записать ещё одного) — закрывается по «Готово».
    justBooked.current = true;
    setConfirmation(
      `Записан: №${appointment.queueNumber}, ${formatVisitDate(appointment.date)} · ${appointment.doctor}`,
    );
    void refresh(); // очередь, счётчики и «врачи сейчас» на стойке
  }

  function closeBooking() {
    setBookingPatient(null);
    if (justBooked.current) {
      justBooked.current = false;
      reset(); // сценарий завершён: поле очищено, фокус в нём
    }
  }

  function handleChanged(message: string) {
    setConfirmation(message);
    void refresh();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim().replace(/\s+/g, " ");
    if (!query) return;
    setConfirmation(null);

    // Ровно 12 цифр — точный поиск по ИИН (пробелы внутри не мешают).
    const iin = query.replace(/\s/g, "");
    const exact = isFullIin(iin);
    if (!exact && query.length < 2) {
      setMode({ kind: "error", message: "Введите ИИН (12 цифр) или хотя бы 2 буквы фамилии" });
      return;
    }

    setMode({ kind: "loading" });
    try {
      const page = await getPatients({ search: exact ? iin : query, limit: 5 });
      const items = exact ? page.items.filter((item) => item.iin === iin) : page.items;
      if (items.length === 0) setMode({ kind: "not-found", query: exact ? iin : query });
      else if (items.length === 1) setMode({ kind: "found", patient: items[0] });
      else setMode({ kind: "list", items });
    } catch (error) {
      setMode({
        kind: "error",
        message: error instanceof Error ? error.message : "Не удалось выполнить поиск",
      });
    }
  }

  return (
    <section className="rounded-xl border border-[#1a5c3a]/40 bg-white p-4 shadow-sm ring-1 ring-[#1a5c3a]/10">
      <form onSubmit={handleSubmit}>
        <label htmlFor="front-desk-query" className="block text-[13px] text-gray-500">
          ИИН или фамилия пациента
        </label>
        <div className="mt-2 flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="front-desk-query"
              ref={inputRef}
              autoFocus
              autoComplete="off"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setConfirmation(null);
                if (mode.kind !== "idle" && mode.kind !== "loading") setMode({ kind: "idle" });
              }}
              onKeyDown={(event) => event.key === "Escape" && reset()}
              placeholder="870514300123 или Абдрахманов"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-3 text-base text-gray-900 placeholder:text-gray-300 focus:border-[#1a5c3a]/50 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/15"
            />
          </div>
          <button
            type="submit"
            disabled={mode.kind === "loading" || !value.trim()}
            className="h-11 rounded-lg bg-[#1a5c3a] px-7 text-sm font-medium text-white transition-colors hover:bg-[#14472e] disabled:opacity-50"
          >
            {mode.kind === "loading" ? "Ищем…" : "Найти"}
          </button>
        </div>
      </form>

      {mode.kind === "error" && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {mode.message}
        </p>
      )}

      {/* Совпадения по фамилии — выпадающий список поверх блоков ниже: он не
          раздвигает страницу, и экран остаётся без вертикального скролла. */}
      {mode.kind === "list" && (
        <div className="relative">
          <ul
            role="listbox"
            aria-label="Совпадения"
            className="absolute inset-x-0 top-2 z-20 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            {mode.items.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  onClick={() => setMode({ kind: "found", patient })}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-900">{patient.fullName}</span>
                  <span className="text-xs text-gray-500">
                    ИИН {patient.iin} · {patient.ageLabel}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode.kind === "found" && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200/80 bg-gray-50 px-4 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f5ee] text-sm font-semibold text-[#1a5c3a]">
            {initialsOf(mode.patient.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{mode.patient.fullName}</p>
            <p className="truncate text-xs text-gray-500">
              {patientSummaryLine(mode.patient, lastVisit)}
            </p>
            {upcoming && (
              <p className="truncate text-xs font-medium text-[#1a5c3a]">
                {upcoming.status === "in_progress" ? "Сейчас на приёме" : "Записан"}{" "}
                {shortRuDate(upcoming.date)}, №{upcoming.queueNumber} · {upcoming.doctor}
                {upcoming.office ? ` · ${shortOffice(upcoming.office)}` : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setBookingPatient(mode.patient)}
              className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
            >
              Записать
            </button>
            {upcoming?.status === "scheduled" && (
              <>
                <button
                  type="button"
                  onClick={() => setRescheduleTarget(upcoming)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Перенести
                </button>
                <button
                  type="button"
                  onClick={() => setCancelTarget(upcoming)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  Отменить
                </button>
              </>
            )}
            <Link
              to={`/patients/${mode.patient.id}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Карточка
            </Link>
          </div>
        </div>
      )}

      {mode.kind === "not-found" && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-2.5">
          <div>
            <p className="text-sm font-medium text-gray-900">Пациент не найден</p>
            <p className="text-xs text-gray-500">Завести карточку и сразу записать</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <UserPlus className="h-4 w-4" />
            Завести карточку
          </button>
        </div>
      )}

      {confirmation && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {confirmation}
        </p>
      )}

      <AppointmentBookingModal
        open={bookingPatient !== null}
        patient={bookingPatient}
        onClose={closeBooking}
        onBooked={handleBooked}
      />

      <RescheduleAppointmentModal
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onRescheduled={(appointment) =>
          handleChanged(
            `Приём перенесён на ${shortRuDate(appointment.date)}, №${appointment.queueNumber} · ${appointment.doctor}`,
          )
        }
      />

      <CancelAppointmentModal
        appointment={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={(appointment) =>
          handleChanged(`Приём на ${shortRuDate(appointment.date)}, №${appointment.queueNumber} отменён`)
        }
      />

      <PatientCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        prefilledIin={mode.kind === "not-found" && isFullIin(mode.query) ? mode.query : ""}
        prefilledFullName={mode.kind === "not-found" && !isFullIin(mode.query) ? mode.query : ""}
        onCreated={(patient) => {
          // Без перехода на карточку: создание и запись — один поток. Если
          // запись отменят, пациент остаётся на стойке с кнопкой «Записать».
          setCreateOpen(false);
          setMode({ kind: "found", patient });
          justBooked.current = false;
          setBookingPatient(patient);
        }}
      />
    </section>
  );
}
