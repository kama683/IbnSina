import Link from "next/link";
import { BedDouble, CalendarPlus, User } from "lucide-react";
import type { Patient } from "@/lib/mock-data";

type Props = {
  patient: Patient;
};

function formatIin(iin: string) {
  return iin.replace(/(\d{6})(\d{6})/, "$1 $2");
}

export default function PatientProfileHeader({ patient }: Props) {
  const isInpatient = patient.careType === "inpatient" && patient.inpatient;

  const stats = isInpatient
    ? [
        { label: "Дата рождения", value: patient.birthDate },
        { label: "Группа крови", value: patient.bloodType },
        { label: "Отделение", value: patient.inpatient!.department },
        { label: "Дата поступления", value: patient.inpatient!.admittedAt },
      ]
    : [
        { label: "Дата рождения", value: patient.birthDate },
        { label: "Группа крови", value: patient.bloodType },
        { label: "Участок", value: patient.area },
        { label: "Последний приём", value: patient.lastAppointment ?? "—" },
      ];

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400">
            <User className="h-9 w-9" strokeWidth={1.5} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {patient.fullName}
              </h2>
              {isInpatient && (
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  <BedDouble className="h-3 w-3" />
                  На стационаре
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span>ИИН {formatIin(patient.iin)}</span>
              <span className="text-gray-300">·</span>
              <span>
                {patient.ageLabel} · {patient.gender}
              </span>
              {patient.dispensary && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex rounded-md border border-[#1a5c3a]/30 bg-[#e8f5ee]/50 px-2 py-0.5 text-[11px] font-medium text-[#1a5c3a]">
                    Диспансерный учёт
                  </span>
                </>
              )}
            </div>

            {isInpatient && (
              <p className="mt-2 text-sm text-gray-600">
                {patient.inpatient!.ward} · {patient.inpatient!.bed} ·{" "}
                {patient.inpatient!.attendingDoctor}
              </p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {stats.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs text-gray-400">{item.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-gray-900">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <Link
          href={`/patients/${patient.id}/examination`}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-[#1a5c3a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
        >
          <CalendarPlus className="h-4 w-4" />
          {isInpatient ? "Открыть приём" : "Записать на приём"}
        </Link>
      </div>
    </section>
  );
}
