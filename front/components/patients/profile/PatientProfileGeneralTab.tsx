import { AlertCircle, Droplets } from "lucide-react";
import DiseaseTag from "@/components/ui/DiseaseTag";
import type { Patient } from "@/lib/mock-data";

type Props = {
  patient: Patient;
};

export default function PatientProfileGeneralTab({ patient }: Props) {
  const isInpatient = patient.careType === "inpatient" && patient.inpatient;

  const personalFields = [
    { label: "ФИО", value: patient.fullName },
    { label: "Дата рождения", value: patient.birthDate },
    { label: "Пол", value: patient.gender === "Ж" ? "Женский" : "Мужской" },
    { label: "ИИН", value: patient.iin },
    { label: "Телефон", value: patient.phone },
    { label: "Адрес", value: patient.address },
    { label: "Участок", value: patient.area },
  ];

  const inpatientFields = isInpatient
    ? [
        { label: "Отделение", value: patient.inpatient!.department },
        { label: "Палата", value: patient.inpatient!.ward },
        { label: "Койка", value: patient.inpatient!.bed },
        { label: "Дата поступления", value: patient.inpatient!.admittedAt },
        { label: "Лечащий врач", value: patient.inpatient!.attendingDoctor },
        {
          label: "Диагноз при поступлении",
          value: patient.inpatient!.primaryDiagnosis,
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Личные данные
            </h3>
          </div>
          <dl className="grid grid-cols-1 gap-px bg-gray-50 sm:grid-cols-2">
            {personalFields.map((field) => (
              <div key={field.label} className="bg-white px-5 py-3.5">
                <dt className="text-xs text-gray-400">{field.label}</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {inpatientFields.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-sky-100 bg-sky-50/30 shadow-sm">
            <div className="border-b border-sky-100 px-5 py-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">
                Стационарное лечение
              </h3>
            </div>
            <dl className="grid grid-cols-1 gap-px bg-sky-50/50 sm:grid-cols-2">
              {inpatientFields.map((field) => (
                <div key={field.label} className="bg-white/80 px-5 py-3.5">
                  <dt className="text-xs text-gray-400">{field.label}</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {patient.diseases.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Диспансерные диагнозы
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 px-5 py-4">
              {patient.diseases.map((item) => (
                <DiseaseTag
                  key={item.label}
                  label={item.label}
                  variant={item.variant}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="space-y-5">
        {patient.allergies.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-red-100 bg-red-50/60 shadow-sm">
            <div className="flex items-center gap-2 border-b border-red-100 px-5 py-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-red-700">Аллергии</h3>
            </div>
            <div className="flex flex-wrap gap-2 px-5 py-4">
              {patient.allergies.map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex rounded-md border border-red-200 bg-white px-2.5 py-1 text-sm font-medium text-red-700"
                >
                  {allergy}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-slate-50/50 shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
            <Droplets className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-gray-900">Группа крови</h3>
          </div>
          <p className="px-5 py-4 text-2xl font-semibold text-gray-900">
            {patient.bloodType}
          </p>
        </section>

        {patient.chronicDiseases.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-slate-50/50 shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Хронические заболевания
              </h3>
            </div>
            <ul className="space-y-2.5 px-5 py-4">
              {patient.chronicDiseases.map((disease) => (
                <li
                  key={disease}
                  className="flex items-center gap-2.5 text-sm text-gray-700"
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                  {disease}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
