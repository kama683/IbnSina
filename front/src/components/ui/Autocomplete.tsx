import { useEffect, useRef, useState } from "react";

type Props<T> = {
  items: T[];
  value: T | null;
  onChange: (item: T | null) => void;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string;
  getKey: (item: T) => string | number;
  placeholder?: string;
  disabled?: boolean;
};

/** Этап 1, коммит 7 (docs/PHASE1_ANALYSIS.md §6 п.9) — замена <select> на
 * поиск-по-мере-набора для формы записи (выбор врача/пациента). Фильтрация
 * на клиенте: списки, для которых это применяется (врачи клиники, страница
 * пациентов), не настолько велики, чтобы требовать server-side поиск здесь
 * отдельно от уже существующего GET /api/search. */
export default function Autocomplete<T>({
  items,
  value,
  onChange,
  getLabel,
  getSubLabel,
  getKey,
  placeholder,
  disabled,
}: Props<T>) {
  const [query, setQuery] = useState(value ? getLabel(value) : "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value ? getLabel(value) : "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value ? getLabel(value) : "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, getLabel]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? items.filter((item) => getLabel(item).toLowerCase().includes(normalizedQuery))
    : items;

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.map((item) => (
            <li key={getKey(item)}>
              <button
                type="button"
                onClick={() => {
                  onChange(item);
                  setQuery(getLabel(item));
                  setOpen(false);
                }}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="text-gray-900">{getLabel(item)}</span>
                {getSubLabel && (
                  <span className="text-xs text-gray-500">{getSubLabel(item)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg">
          Ничего не найдено
        </div>
      )}
    </div>
  );
}
