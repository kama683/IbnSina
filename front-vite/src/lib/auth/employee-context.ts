import { createContext, useContext } from "react";
import type { Employee } from "@/lib/api/employees";

/** Ключ кэша текущего сотрудника — он же признак живой сессии. */
export const EMPLOYEE_QUERY_KEY = ["employee", "me"] as const;

export const EmployeeContext = createContext<Employee | null>(null);

/** Текущий сотрудник. Работает только внутри <RequireAuth> — там сессия уже
 * подтверждена, поэтому null здесь означает ошибку в дереве компонентов. */
export function useEmployee(): Employee {
  const employee = useContext(EmployeeContext);
  if (!employee) {
    throw new Error("useEmployee() вызван вне <RequireAuth>");
  }
  return employee;
}
