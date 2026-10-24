import { useId, useState } from "react";

type Props = {
  value: string;
  onChange: (time: string) => void;
  /** Свободные слоты врача на выбранную дату — быстрый выбор. */
  slots: string[];
  loading?: boolean;
  disabled?: boolean;
  /** Подпись пустого пункта списка («Выберите время», «Нет свободных слотов»…). */
  placeholder?: string;
  /** Родителю важно знать, что время введено вручную: оно не из списка, и
   * «слот перестал быть свободным» к нему не относится. */
  onCustomChange?: (custom: boolean) => void;
};

const CUSTOM = "__custom__";
const FIELD = "w-full rounded-lg border border-gray-200 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400";

/** Выбор времени приёма: список свободных слотов + «Другое время…» — ручной
 * ввод любого времени. Сетка слотов (30 минут) — подсказка, а не ограничение:
 * бэкенд принимает любое время внутри рабочих часов врача, если оно не занято,
 * и сам скажет, если нет. Используется везде, где выбирается время приёма. */
export default function TimePicker({
  value,
  onChange,
  slots,
  loading = false,
  disabled = false,
  placeholder = "Выберите время",
  onCustomChange,
}: Props) {
  const id = useId();
  const [custom, setCustomState] = useState(false);

  function setCustom(next: boolean) {
    setCustomState(next);
    onCustomChange?.(next);
  }

  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1 block text-gray-600">
        Время
      </label>

      {custom ? (
        <>
          <div className="flex items-center gap-2">
            <input
              id={id}
              type="time"
              step={300}
              autoFocus
              value={value}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
              className={FIELD}
            />
            <button
              type="button"
              onClick={() => {
                setCustom(false);
                onChange("");
              }}
              className="shrink-0 text-xs font-medium text-[#1a5c3a] hover:underline"
            >
              К списку
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Любое время в рабочие часы врача; если оно занято или вне графика, система предупредит.
          </p>
        </>
      ) : (
        <select
          id={id}
          value={value}
          disabled={disabled || loading}
          onChange={(event) => {
            if (event.target.value === CUSTOM) {
              setCustom(true);
              onChange("");
            } else {
              onChange(event.target.value);
            }
          }}
          className={FIELD}
        >
          <option value="">{loading ? "Загрузка…" : placeholder}</option>
          {slots.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
          <option value={CUSTOM}>Другое время…</option>
        </select>
      )}
    </div>
  );
}
