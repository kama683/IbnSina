import type { Vaccination } from "@/lib/mock-data";

type Props = {
  vaccinations: Vaccination[];
};

export default function PatientProfileVaccinationsTab({ vaccinations }: Props) {
  if (vaccinations.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200/80 bg-white px-5 py-10 text-center shadow-sm">
        <p className="text-sm text-gray-400">Нет данных о прививках</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              <th className="px-5 py-2.5">Дата</th>
              <th className="px-5 py-2.5">Прививка</th>
              <th className="px-5 py-2.5">Препарат</th>
              <th className="px-5 py-2.5">Серия</th>
              <th className="px-5 py-2.5">Примечания</th>
            </tr>
          </thead>
          <tbody>
            {vaccinations.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/80"
              >
                <td className="px-5 py-3 text-sm text-gray-500">{item.date}</td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-5 py-3 text-sm text-gray-600">{item.drug}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{item.series}</td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {item.notes ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
