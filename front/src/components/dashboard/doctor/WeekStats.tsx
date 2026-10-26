import type { WeekStats as WeekStatsData } from "@/lib/api/appointments";

type Props = {
  stats: WeekStatsData;
};

/** Компактная статистика за неделю; без данных — «—». */
export default function WeekStats({ stats }: Props) {
  const rows = [
    { label: "Новых пациентов", value: String(stats.newPatients) },
    { label: "Диспансерных на учёте", value: String(stats.dispensary) },
    { label: "Среднее время приёма", value: stats.avgMinutes > 0 ? `${stats.avgMinutes} мин` : "—" },
  ];

  return (
    <section className="rounded-[14px] border border-line bg-white px-[22px] py-[18px]">
      <h2 className="text-base font-bold text-ink">Неделя</h2>
      <p className="mt-0.5 text-[13px] text-ink-3">{stats.period}</p>
      <dl className="mt-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 border-t border-row-line py-2.5 first:mt-1">
            <dt className="text-sm text-ink-2">{row.label}</dt>
            <dd className="text-sm font-semibold text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
