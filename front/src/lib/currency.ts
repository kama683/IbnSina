/** Этап 2, коммит 7 (docs/PHASE2_ANALYSIS.md, решение 9) — деньги везде в
 * БД и API — тиыны (BigInteger), 100 тиын = 1 тенге. Единственное место
 * форматирования в тенге на фронте. */
export function formatTiyn(tiyn: number): string {
  const tenge = tiyn / 100;
  return `${tenge.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₸`;
}

/** Обратное — из ввода в тенге (строка из <input>) в тиыны для отправки на бэкенд. */
export function tengeInputToTiyn(value: string): number {
  const tenge = Number.parseFloat(value.replace(",", "."));
  if (Number.isNaN(tenge)) return 0;
  return Math.round(tenge * 100);
}
