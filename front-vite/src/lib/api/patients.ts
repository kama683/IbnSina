import { apiGet, apiPatch, apiPost } from "./api";
import type { Patient } from "@/lib/types";

export type PatientsPage = {
  items: Patient[];
  total: number;
  page: number;
  limit: number;
  areas: string[];
};

export type PatientCreatePayload = {
  fullName: string;
  iin: string;
  birthDate: string;
  gender: "М" | "Ж";
  phone?: string;
  address?: string;
  area: string;
  bloodType?: string;
  dispensary?: boolean;
};

type PatientsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  area?: string;
};

/** Список пациентов с пагинацией (GET /api/patients). */
export function getPatients(query: PatientsQuery = {}): Promise<PatientsPage> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.area && query.area !== "all") params.set("area", query.area);

  const suffix = params.toString();
  return apiGet<PatientsPage>(`/api/patients${suffix ? `?${suffix}` : ""}`);
}

/** Один пациент по id (GET /api/patients/{id}). */
export function getPatient(id: string): Promise<Patient> {
  return apiGet<Patient>(`/api/patients/${id}`);
}

/** Создать пациента (POST /api/patients). */
export function createPatient(payload: PatientCreatePayload): Promise<Patient> {
  return apiPost<Patient>("/api/patients", payload);
}

export type PatientUpdatePayload = Partial<{
  fullName: string;
  iin: string;
  birthDate: string;
  gender: "М" | "Ж";
  phone: string;
  address: string;
  area: string;
  bloodType: string;
}>;

/** Этап 1, коммит 12 (docs/PHASE1_ANALYSIS.md §6 п.7) — правка
 * демографических данных (PATCH /api/patients/{id}); медданные сюда не
 * входят, у них свои эндпоинты. */
export function updatePatient(
  id: string,
  payload: PatientUpdatePayload,
): Promise<Patient> {
  return apiPatch<Patient>(`/api/patients/${id}`, payload);
}

/** История приёмов пациента. */
export function getPatientHistory(
  id: string,
): Promise<import("@/lib/types").PatientMedicalHistoryEntry[]> {
  return apiGet(`/api/patients/${id}/history`);
}

/** Метрики здоровья (паспорт здоровья). */
export function getPatientHealthMetrics(
  id: string,
): Promise<import("@/lib/types").HealthMetric[]> {
  return apiGet(`/api/patients/${id}/health-metrics`);
}

/** Прививки пациента. */
export function getPatientVaccinations(
  id: string,
): Promise<import("@/lib/types").Vaccination[]> {
  return apiGet(`/api/patients/${id}/vaccinations`);
}

/** Данные текущего осмотра (активный приём). */
export function getPatientExamination(
  id: string,
): Promise<import("@/lib/types").PatientExamination> {
  return apiGet(`/api/patients/${id}/examination`);
}

/** Краткая история визитов для боковой панели осмотра. */
export function getPatientVisitHistory(
  id: string,
): Promise<import("@/lib/types").PatientVisitHistory[]> {
  return apiGet(`/api/patients/${id}/visit-history`);
}
