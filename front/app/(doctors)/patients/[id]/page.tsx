import { notFound } from "next/navigation";
import PatientExaminationView from "@/components/patients/PatientExaminationView";
import {
  getPatientById,
  getPatientExamination,
  getPatientVisitHistory,
} from "@/lib/mock-data";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PatientPage({ params }: Props) {
  const { id } = await params;
  const patient = getPatientById(id);

  if (!patient) {
    notFound();
  }

  const examination = getPatientExamination(id);
  const history = getPatientVisitHistory(id);

  return (
    <PatientExaminationView
      patient={patient}
      examination={examination}
      history={history}
    />
  );
}
