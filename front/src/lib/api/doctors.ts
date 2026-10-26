import { apiGet, apiPatch } from "./api";
import type { Employee } from "@/lib/api/employees";
import type { DoctorBadge, WorkDaySchedule } from "@/lib/types";

/** Профиль врача — есть только у сотрудников с ролью doctor/head_doctor
 * (см. HAS_DOCTOR_PROFILE_ROLES в lib/roles.ts). GET на этот эндпоинт для
 * сотрудника без doctor_profile вернёт 404. */
export interface DoctorProfile extends Employee {
  office: string;
  badges: DoctorBadge[];
  contacts: {
    phone: string;
    email: string;
  };
  metrics: {
    appointmentsInMay: number;
    experienceYears: number;
  };
  professional: {
    specialty: string;
    licenseNumber: string;
    licenseValidUntil: string;
    certificateNumber: string;
    certificateValidUntil: string;
    about: string;
  };
  schedule: WorkDaySchedule[];
}

export type DoctorProfileUpdate = {
  about?: string;
  phone?: string;
  email?: string;
  schedule?: WorkDaySchedule[];
};

// Этап 0, коммит 9: переключено на канонические employees-эндпоинты
// (см. docs/PHASE0_ANALYSIS.md) — deprecated alias-роутер снят в коммите 11.
export function getDoctorProfile(): Promise<DoctorProfile> {
  return apiGet<DoctorProfile>("/api/employees/me/profile");
}

export function updateDoctorProfile(
  payload: DoctorProfileUpdate,
): Promise<DoctorProfile> {
  return apiPatch<DoctorProfile>("/api/employees/me", payload);
}
