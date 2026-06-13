import { weekStats as weekStatsData } from "@/lib/mock-data";

type Stats = typeof weekStatsData;

type Props = {
  stats: Stats;
};

const rows: { key: keyof Omit<Stats, "period">; label: string }[] = [
  { key: "total", label: "Всего приёмов" },
  { key: "completed", label: "Завершённых" },
  { key: "cancelled", label: "Отменённых" },
  { key: "newPatients", label: "Новых пациентов" },
  { key: "dispensary", label: "Диспансерных" },
  { key: "avgMinutes", label: "Среднее время" },
];

export default function WeekStats({ stats }: Props) {
  return (
    <section className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">
        Статистика за неделю
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">{stats.period}</p>

      <dl className="mt-3 space-y-2.5">
        {rows.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between text-sm"
          >
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-semibold tabular-nums text-gray-900">
              {key === "avgMinutes" ? `${stats[key]} мин` : stats[key]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
