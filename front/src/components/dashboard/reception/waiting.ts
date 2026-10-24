/** «ждёт» / «ждут» по числу: 1 ждёт, 2–4 ждут, 5+ ждут (11–14 — ждут). */
export function pluralizeWaiting(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  const verb = last === 1 && lastTwo !== 11 ? "ждёт" : "ждут";
  return `${count} ${verb}`;
}
