import { apiGet, apiPatch } from "./api";
import type {
  DoctorBadge,
  EducationEntry,
  WorkDaySchedule,
} from "@/lib/types";

export interface Doctor {
  id: number;
  fullName: string;
  firstNamePatronymic: string;
  shortName: string;
  initials: string;
  role: string;
  area: string;
  office: string;
}

export interface DoctorProfile extends Doctor {
  title: string;
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

export function getCurrentDoctor(): Promise<Doctor> {
  return apiGet<Doctor>("/api/doctors/me");
}

export function getDoctorProfile(): Promise<DoctorProfile> {
  return apiGet<DoctorProfile>("/api/doctors/me/profile");
}

export function updateDoctorProfile(
  payload: DoctorProfileUpdate,
): Promise<DoctorProfile> {
  return apiPatch<DoctorProfile>("/api/doctors/me", payload);
}
