import { apiDelete, apiGet, apiPutFile } from "./api";

export type EmployeeRole =
  | "reception"
  | "doctor"
  | "nurse"
  | "accountant"
  | "head_doctor"
  | "admin";

export type EmployeeStatus = "active" | "on_leave" | "fired";

export interface Employee {
  id: number;
  fullName: string;
  firstNamePatronymic: string;
  shortName: string;
  initials: string;
  role: EmployeeRole;
  positionTitle: string;
  status: EmployeeStatus;
  /** URL аватарки (`?v=` меняется при каждой загрузке) или null, если не задана. */
  avatarUrl: string | null;
}

/** Текущий сотрудник — единая точка входа для layout/Sidebar/Header,
 * работает для любой роли (GET /api/employees/me). Заменяет
 * getCurrentDoctor(), который 404-ился для сотрудников без doctor_profile. */
export function getCurrentEmployee(): Promise<Employee> {
  return apiGet<Employee>("/api/employees/me");
}

/** Этап 1, коммит 7 — список для селектора врача в форме записи. */
export interface DoctorListItem {
  id: number;
  shortName: string;
  specialty: string;
}

/** GET /api/employees?role=doctor — активные клиницисты (включая
 * head_doctor, у него тоже есть doctor_profile, см. docs/PHASE1_ANALYSIS.md
 * §6.1 решение A). */
export function getDoctors(): Promise<DoctorListItem[]> {
  return apiGet<DoctorListItem[]>("/api/employees?role=doctor");
}

/** PUT /api/employees/me/avatar — JPEG/PNG/WebP до 5 МБ. */
export function uploadMyAvatar(file: Blob): Promise<{ avatarUrl: string | null }> {
  return apiPutFile<{ avatarUrl: string | null }>("/api/employees/me/avatar", file);
}

export function deleteMyAvatar(): Promise<{ avatarUrl: string | null }> {
  return apiDelete<{ avatarUrl: string | null }>("/api/employees/me/avatar");
}
