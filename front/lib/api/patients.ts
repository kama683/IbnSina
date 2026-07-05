import { apiGet } from "./api";
import type {
  HealthMetric,
  Patient,
  PatientExamination,
  PatientMedicalHistoryEntry,
  PatientVisitHistory,
  Vaccination,
} from "@/lib/mock-data";

/** Список пациентов (GET /api/patients). */
export function getPatients(): Promise<Patient[]> {
  return apiGet<Patient[]>("/api/patients");
}

/** Один пациент по id (GET /api/patients/{id}). */
export function getPatient(id: string): Promise<Patient> {
  return apiGet<Patient>(`/api/patients/${id}`);
}

/** История приёмов пациента. */
export function getPatientHistory(
  id: string,
): Promise<PatientMedicalHistoryEntry[]> {
  return apiGet<PatientMedicalHistoryEntry[]>(`/api/patients/${id}/history`);
}

/** Метрики здоровья (паспорт здоровья). */
export function getPatientHealthMetrics(id: string): Promise<HealthMetric[]> {
  return apiGet<HealthMetric[]>(`/api/patients/${id}/health-metrics`);
}

/** Прививки пациента. */
export function getPatientVaccinations(id: string): Promise<Vaccination[]> {
  return apiGet<Vaccination[]>(`/api/patients/${id}/vaccinations`);
}

/** Данные текущего осмотра (активный приём). */
export function getPatientExamination(
  id: string,
): Promise<PatientExamination> {
  return apiGet<PatientExamination>(`/api/patients/${id}/examination`);
}

/** Краткая история визитов для боковой панели осмотра. */
export function getPatientVisitHistory(
  id: string,
): Promise<PatientVisitHistory[]> {
  return apiGet<PatientVisitHistory[]>(`/api/patients/${id}/visit-history`);
}
