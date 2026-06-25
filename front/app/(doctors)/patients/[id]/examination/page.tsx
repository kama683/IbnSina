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

export default async function PatientExaminationPage({ params }: Props) {
  const { id } = await params;
  const patient = getPatientById(id);

  if (!patient) {
    notFound();
  }

  return (
    <PatientExaminationView
      patient={patient}
      examination={getPatientExamination(id)}
      history={getPatientVisitHistory(id)}
    />
  );
}
