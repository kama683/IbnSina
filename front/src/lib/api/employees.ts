import { apiGet } from "./api";

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
