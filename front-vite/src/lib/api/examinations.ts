import { apiPatch } from "./api";
import type {
  Appointment,
  AppointmentStatus,
  Diagnosis,
  Prescription,
} from "@/lib/types";

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
): Promise<Appointment> {
  return apiPatch<Appointment>(`/api/appointments/${appointmentId}`, payload);
}
