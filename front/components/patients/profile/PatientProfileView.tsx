import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PatientProfileContent from "@/components/patients/profile/PatientProfileContent";
import PatientProfileHeader from "@/components/patients/profile/PatientProfileHeader";
import type {
  HealthMetric,
  Patient,
  PatientMedicalHistoryEntry,
  Vaccination,
} from "@/lib/mock-data";

type Props = {
  patient: Patient;
  history: PatientMedicalHistoryEntry[];
  healthMetrics: HealthMetric[];
  vaccinations: Vaccination[];
};

export default function PatientProfileView({
  patient,
  history,
  healthMetrics,
  vaccinations,
}: Props) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <Link href="/patients" className="hover:text-gray-600">
            Пациенты
          </Link>
          {" / "}
          <span className="text-gray-600">{patient.fullName}</span>
        </p>

        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          {patient.fullName}
        </h1>

        <Link
          href="/patients"
          className="mt-2 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Назад к списку
        </Link>
      </div>

      <PatientProfileHeader patient={patient} />

      <PatientProfileContent
        patient={patient}
        history={history}
        healthMetrics={healthMetrics}
        vaccinations={vaccinations}
      />
    </div>
  );
}
