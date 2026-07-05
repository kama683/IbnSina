import { apiPatch } from "./api";
import type {
  Diagnosis,
  PatientExamination,
  Prescription,
} from "@/lib/mock-data";
import type { AppointmentStatus } from "@/lib/mock-data";

export type ExaminationUpdatePayload = {
  complaints: string;
  objectiveStatus: string;
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
  status?: AppointmentStatus;
};

/** Сохранить осмотр (черновик или завершение приёма). */
export function updateExamination(
  appointmentId: string,
  payload: ExaminationUpdatePayload,
): Promise<PatientExamination> {
  return apiPatch<PatientExamination>(
    `/api/appointments/${appointmentId}`,
    payload,
  );
}
