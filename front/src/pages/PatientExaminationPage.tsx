import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import PatientExaminationView from "@/components/patients/PatientExaminationView";
import QueryBoundary from "@/components/ui/QueryBoundary";
import {
  getPatient,
  getPatientExamination,
  getPatientVisitHistory,
} from "@/lib/api/patients";

export default function PatientExaminationPage() {
  const { id = "" } = useParams();

  const patient = useQuery({
    queryKey: ["patients", "detail", id],
    queryFn: () => getPatient(id),
  });
  const examination = useQuery({
    queryKey: ["patients", id, "examination"],
    queryFn: () => getPatientExamination(id),
  });
  const history = useQuery({
    queryKey: ["patients", id, "visit-history"],
    queryFn: () => getPatientVisitHistory(id),
  });

  return (
    <QueryBoundary
      queries={[patient, examination, history]}
      notFoundMessage="Пациент или активный приём не найден."
    >
      {patient.data && examination.data && history.data && (
        <PatientExaminationView
          patient={patient.data}
          examination={examination.data}
          history={history.data}
        />
      )}
    </QueryBoundary>
  );
}
