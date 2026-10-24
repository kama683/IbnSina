import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import {
  formatVisitDate,
  initialsOf,
  isFullIin,
  patientSummaryLine,
} from "@/components/dashboard/reception/format";
import { getPatientHistory, getPatients } from "@/lib/api/patients";
import type { Patient } from "@/lib/types";

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

/** «Кто у стойки» — главный блок рабочего места регистратуры: один поле
 * ввода (ИИН или фамилия), результат — мини-карточка пациента. */
export default function FrontDesk() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "idle" });

  const selected = mode.kind === "found" ? mode.patient : null;
  const lastVisit = useLastVisit(selected);

  /** Конец сценария: поле очищается, фокус возвращается в него. */
  function reset() {
    setValue("");
    setMode({ kind: "idle" });
    inputRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim().replace(/\s+/g, " ");
    if (!query) return;

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
          </div>
          <div className="flex shrink-0 gap-2">
            {/* Модалка записи — следующий шаг работ (см. docs): до тех пор кнопка неактивна */}
            <button
              type="button"
              disabled
              title="Запись прямо отсюда появится на следующем шаге"
              className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Записать
            </button>
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
            disabled
            title="Создание и запись одним потоком появятся на следующем шаге"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Завести карточку
          </button>
        </div>
      )}
    </section>
  );
}
