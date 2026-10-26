import { useEffect, useState } from "react";

/** Значение, которое обновляется через `delay` мс после последнего изменения —
 * чтобы поиск не уходил на сервер на каждую набранную букву. */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
