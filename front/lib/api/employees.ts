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
