import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import PatientProfileView from "@/components/patients/profile/PatientProfileView";
import QueryBoundary from "@/components/ui/QueryBoundary";
import {
  getPatient,
  getPatientHealthMetrics,
  getPatientHistory,
  getPatientVaccinations,
} from "@/lib/api/patients";
import { useEmployee } from "@/lib/auth/employee-context";
import { VIEW_MEDICAL_ROLES, VIEW_VITALS_ROLES } from "@/lib/roles";

export default function PatientProfilePage() {
  const { id = "" } = useParams();
  const employee = useEmployee();
  // Показатели и прививки бэкенд отдаёт не всем ролям (reception — 403), поэтому
  // для них эти запросы не отправляем вовсе.
  const canViewVitals = VIEW_VITALS_ROLES.includes(employee.role);
  const canViewMedical = VIEW_MEDICAL_ROLES.includes(employee.role);

  const patient = useQuery({
    queryKey: ["patients", "detail", id],
    queryFn: () => getPatient(id),
  });
  const history = useQuery({
    queryKey: ["patients", id, "history"],
    queryFn: () => getPatientHistory(id),
    enabled: canViewMedical,
  });
  const healthMetrics = useQuery({
    queryKey: ["patients", id, "health-metrics"],
    queryFn: () => getPatientHealthMetrics(id),
    enabled: canViewVitals,
  });
  const vaccinations = useQuery({
    queryKey: ["patients", id, "vaccinations"],
    queryFn: () => getPatientVaccinations(id),
    enabled: canViewVitals,
  });

  return (
    <QueryBoundary
      queries={[patient, history, healthMetrics, vaccinations]}
      notFoundMessage="Пациент не найден."
    >
      {patient.data && (
        <PatientProfileView
          patient={patient.data}
          history={history.data ?? []}
          healthMetrics={healthMetrics.data ?? []}
          vaccinations={vaccinations.data ?? []}
          currentEmployeeRole={employee.role}
        />
      )}
    </QueryBoundary>
  );
}
