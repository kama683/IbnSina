import type { Patient, PatientVisitHistory } from "@/lib/mock-data";
import StatusBadge from "@/components/ui/StatusBadge";

type Props = {
  patient: Patient;
  history: PatientVisitHistory[];
};

function formatIin(iin: string) {
  return `${iin.slice(0, 6)} ${iin.slice(6)}`;
}

export default function PatientSidebar({ patient, history }: Props) {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Пациент</h2>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-base font-semibold text-gray-900">
            {patient.fullName}
          </p>

          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-400">Дата рождения</dt>
              <dd className="text-gray-700">
                {patient.birthDate}, {patient.ageLabel}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">ИИН</dt>
              <dd className="text-gray-700">{formatIin(patient.iin)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Участок</dt>
              <dd className="text-gray-700">{patient.area}</dd>
            </div>
          </dl>

          {patient.dispensary && (
            <span className="inline-flex rounded-md bg-[#e8f5ee] px-2.5 py-1 text-[11px] font-medium text-[#1a5c3a]">
              Диспансерный учёт
            </span>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Последние приёмы
          </h2>
        </div>

        <div className="divide-y divide-gray-50">
          {history.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Нет записей</p>
          ) : (
            history.map((visit) => (
              <div key={visit.id} className="space-y-1.5 px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {visit.date}
                  </span>
                  <StatusBadge status={visit.status} />
                </div>
                <p className="text-sm text-gray-500">{visit.summary}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
