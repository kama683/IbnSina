import { notFound } from "next/navigation";
import PatientProfileView from "@/components/patients/profile/PatientProfileView";
import { ApiError } from "@/lib/api/api";
import {
  getPatient,
  getPatientHealthMetrics,
  getPatientHistory,
  getPatientVaccinations,
} from "@/lib/api/patients";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PatientPage({ params }: Props) {
  const { id } = await params;

  try {
    const [patient, history, healthMetrics, vaccinations] = await Promise.all([
      getPatient(id),
      getPatientHistory(id),
      getPatientHealthMetrics(id),
      getPatientVaccinations(id),
    ]);

    return (
      <PatientProfileView
        patient={patient}
        history={history}
        healthMetrics={healthMetrics}
        vaccinations={vaccinations}
      />
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
