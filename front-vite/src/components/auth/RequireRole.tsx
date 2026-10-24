import { Outlet } from "react-router-dom";
import Forbidden from "@/components/ui/Forbidden";
import type { EmployeeRole } from "@/lib/api/employees";
import { useEmployee } from "@/lib/auth/employee-context";
import { isRoleAllowed } from "@/lib/roles";

/** Гвард группы маршрутов по роли (см. lib/roles.ts). Только UX: без него
 * недоступная роль увидела бы страницу с ошибкой 403 от бэкенда — с ним
 * сразу понятное «Нет доступа». Права всё равно проверяет бэкенд. */
export default function RequireRole({ allow }: { allow: EmployeeRole[] | "all" }) {
  const employee = useEmployee();
  return isRoleAllowed(employee.role, allow) ? <Outlet /> : <Forbidden />;
}
