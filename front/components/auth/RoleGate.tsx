import type { EmployeeRole } from "@/lib/api/employees";
import { isRoleAllowed } from "@/lib/roles";

type Props = {
  role: EmployeeRole;
  allow: EmployeeRole[] | "all";
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/** Условный рендер по роли — только UX (см. lib/roles.ts): скрывает то, что
 * бэкенд всё равно не отдал бы (403). Серверный компонент, можно использовать
 * прямо в RSC-дереве без "use client". */
export default function RoleGate({ role, allow, children, fallback = null }: Props) {
  return isRoleAllowed(role, allow) ? <>{children}</> : <>{fallback}</>;
}
