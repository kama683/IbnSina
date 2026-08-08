import { notFound } from "next/navigation";
import PatientProfileView from "@/components/patients/profile/PatientProfileView";
import { ApiError } from "@/lib/api/api";
import { getCurrentEmployee } from "@/lib/api/employees";
import {
  getPatient,
  getPatientHealthMetrics,
  getPatientHistory,
  getPatientVaccinations,
} from "@/lib/api/patients";
import { VIEW_VITALS_ROLES } from "@/lib/roles";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PatientPage({ params }: Props) {
  const { id } = await params;

  try {
    const employee = await getCurrentEmployee();
    const canViewVitals = VIEW_VITALS_ROLES.includes(employee.role);

    const [patient, history, healthMetrics, vaccinations] = await Promise.all([
      getPatient(id),
      getPatientHistory(id),
      canViewVitals ? getPatientHealthMetrics(id) : Promise.resolve([]),
      canViewVitals ? getPatientVaccinations(id) : Promise.resolve([]),
    ]);

    return (
      <PatientProfileView
        patient={patient}
        history={history}
        healthMetrics={healthMetrics}
        vaccinations={vaccinations}
        currentEmployeeRole={employee.role}
      />
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
