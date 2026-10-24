import { createContext, useContext } from "react";
import { getCurrentEmployee, type Employee } from "@/lib/api/employees";

/** Ключ кэша текущего сотрудника — он же признак живой сессии. */
export const EMPLOYEE_QUERY_KEY = ["employee", "me"] as const;

/** Запрос сессии. Живёт дольше страниц (gcTime), иначе переход /login →
 * приложение пересоздавал бы его с нуля; при выходе кэш чистится явно. */
export const employeeQueryOptions = {
  queryKey: EMPLOYEE_QUERY_KEY,
  queryFn: getCurrentEmployee,
  staleTime: 5 * 60_000,
  gcTime: 5 * 60_000,
};

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
