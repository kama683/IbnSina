import { doctorProfile } from "@/lib/mock-data";

const metrics = [
  { label: "Пациентов на участке", value: doctorProfile.metrics.patientsInArea },
  { label: "Приёмов в мае", value: doctorProfile.metrics.appointmentsInMay },
  { label: "Диспансерных", value: doctorProfile.metrics.dispensary },
  { label: "Лет стажа", value: doctorProfile.metrics.experienceYears },
];

function formatValue(value: number) {
  return value.toLocaleString("ru-RU");
}

export default function ProfileMetricsCard() {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Показатели</h2>
      </div>

      <dl className="divide-y divide-gray-50">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between px-5 py-3"
          >
            <dt className="text-sm text-gray-500">{metric.label}</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {formatValue(metric.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
