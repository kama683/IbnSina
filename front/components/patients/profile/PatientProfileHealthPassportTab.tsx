import type { HealthMetric } from "@/lib/mock-data";

type Props = {
  metrics: HealthMetric[];
  lastMeasurement: string | null;
};

export default function PatientProfileHealthPassportTab({
  metrics,
  lastMeasurement,
}: Props) {
  if (metrics.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200/80 bg-white px-5 py-10 text-center shadow-sm">
        <p className="text-sm text-gray-400">Нет данных паспорта здоровья</p>
      </section>
    );
  }

  return (
    <div>
      {lastMeasurement && (
        <p className="mb-4 text-sm text-gray-500">
          Последнее измерение:{" "}
          <span className="font-medium text-gray-700">{lastMeasurement}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm"
          >
            <div className="border-b border-gray-50 px-4 py-2.5">
              <h4 className="text-xs font-medium text-gray-400">{metric.label}</h4>
            </div>
            <div className="px-4 py-4">
              <p className="text-xl font-semibold text-gray-900">
                {metric.value}
                {metric.note && (
                  <span className="ml-1.5 text-sm font-normal text-amber-600">
                    ({metric.note})
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-gray-400">{metric.date}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
