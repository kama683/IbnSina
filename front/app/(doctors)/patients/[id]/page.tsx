import { notFound } from "next/navigation";
import PatientProfileView from "@/components/patients/profile/PatientProfileView";
import {
  getPatientById,
  getPatientHealthMetrics,
  getPatientMedicalHistory,
  getPatientVaccinations,
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

  return (
    <PatientProfileView
      patient={patient}
      history={getPatientMedicalHistory(id)}
      healthMetrics={getPatientHealthMetrics(id)}
      vaccinations={getPatientVaccinations(id)}
    />
  );
}
