import { apiGet, apiPatch } from "./api";
import type { Employee } from "@/lib/api/employees";
import type {
  DoctorBadge,
  EducationEntry,
  WorkDaySchedule,
} from "@/lib/types";

/** Профиль врача — есть только у сотрудников с ролью doctor/head_doctor
 * (см. HAS_DOCTOR_PROFILE_ROLES в lib/roles.ts). GET на этот эндпоинт для
 * сотрудника без doctor_profile вернёт 404. */
export interface DoctorProfile extends Employee {
  area: string;
  office: string;
  badges: DoctorBadge[];
  contacts: {
    phone: string;
    email: string;
    workplace: string;
  };
  metrics: {
    patientsInArea: number;
    appointmentsInMay: number;
    dispensary: number;
    experienceYears: number;
  };
  professional: {
    specialty: string;
    qualificationCategory: string;
    licenseNumber: string;
    licenseValidUntil: string;
    certificateNumber: string;
    certificateValidUntil: string;
    about: string;
  };
  schedule: WorkDaySchedule[];
  education: EducationEntry[];
}

export type DoctorProfileUpdate = {
  about?: string;
  phone?: string;
  email?: string;
  schedule?: WorkDaySchedule[];
};

// Этап 0, коммит 9: переключено с deprecated /api/doctors/* на канонические
// /api/employees/* — /api/doctors/* остаётся только как алиас для обратной
// совместимости до его снятия в коммите 11 (см. docs/PHASE0_ANALYSIS.md).
export function getDoctorProfile(): Promise<DoctorProfile> {
  return apiGet<DoctorProfile>("/api/employees/me/profile");
}

export function updateDoctorProfile(
  payload: DoctorProfileUpdate,
): Promise<DoctorProfile> {
  return apiPatch<DoctorProfile>("/api/employees/me", payload);
}
