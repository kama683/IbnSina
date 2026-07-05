import { notFound } from "next/navigation";
import PatientExaminationView from "@/components/patients/PatientExaminationView";
import { ApiError } from "@/lib/api/api";
import { getPatient, getPatientExamination, getPatientVisitHistory } from "@/lib/api/patients";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PatientExaminationPage({ params }: Props) {
  const { id } = await params;

  try {
    const [patient, examination, history] = await Promise.all([
      getPatient(id),
      getPatientExamination(id),
      getPatientVisitHistory(id),
    ]);

    return (
      <PatientExaminationView
        patient={patient}
        examination={examination}
        history={history}
      />
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
