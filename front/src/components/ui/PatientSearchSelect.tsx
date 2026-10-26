import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPatients } from "@/lib/api/patients";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Patient } from "@/lib/types";

type Props = {
  value: Patient | null;
  onChange: (patient: Patient | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

const MIN_CHARS = 2;
const LIMIT = 8;

/** Выбор пациента с поиском на сервере (ФИО или ИИН). Раньше формы записи
 * получали заранее загруженный список из 100 пациентов — в клинике с тысячами
 * карточек нужный пациент в него просто не попадал. */
export default function PatientSearchSelect({
  value,
  onChange,
  placeholder = "Начните вводить ФИО или ИИН",
  autoFocus = false,
}: Props) {
  const [text, setText] = useState(value?.fullName ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const term = useDebouncedValue(text.trim(), 250);
  const searching = open && !value && term.length >= MIN_CHARS;

  const results = useQuery({
    queryKey: ["patients", "search", term],
    queryFn: () => getPatients({ search: term, limit: LIMIT }),
    enabled: searching,
  });

  // Значение снаружи сменилось (сброс формы, «Записать ещё одного»).
  useEffect(() => {
    setText(value?.fullName ?? "");
  }, [value]);

  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const items = results.data?.items ?? [];

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={text}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          if (value) onChange(null); // правка текста снимает выбор
        }}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      {searching && (
        <ul
          role="listbox"
          aria-label="Найденные пациенты"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {results.isLoading || term !== text.trim() ? (
            <li className="px-3 py-2 text-sm text-gray-400">Поиск…</li>
          ) : results.isError ? (
            <li className="px-3 py-2 text-sm text-red-600">Не удалось выполнить поиск</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">Ничего не найдено</li>
          ) : (
            items.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(patient);
                    setText(patient.fullName);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="text-gray-900">{patient.fullName}</span>
                  <span className="text-xs text-gray-500">
                    ИИН {patient.iin} · {patient.ageLabel}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
