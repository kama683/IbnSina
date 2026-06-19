import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ExaminationForm from "@/components/patients/ExaminationForm";
import PatientSidebar from "@/components/patients/PatientSidebar";
import StatusBadge from "@/components/ui/StatusBadge";
import type {
  Patient,
  PatientExamination,
  PatientVisitHistory,
} from "@/lib/mock-data";

type Props = {
  patient: Patient;
  examination: PatientExamination;
  history: PatientVisitHistory[];
};

export default function PatientExaminationView({
  patient,
  examination,
  history,
}: Props) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Назад к списку
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">
            Приём — {patient.shortName}
          </h1>
          <StatusBadge status={examination.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        <ExaminationForm examination={examination} />
        <PatientSidebar patient={patient} history={history} />
      </div>
    </div>
  );
}
