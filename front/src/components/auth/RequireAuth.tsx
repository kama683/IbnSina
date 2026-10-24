import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import ErrorState from "@/components/ui/ErrorState";
import PageLoader from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/api";
import { EmployeeContext, employeeQueryOptions } from "@/lib/auth/employee-context";
import { loginUrl } from "@/lib/auth/next-path";

/** Замена proxy.ts из Next: пускает дальше только при живой сессии.
 *
 * Сессию подтверждает сам бэкенд (GET /api/employees/me), а не наличие cookie
 * — cookie httpOnly, JS её не видит, да и «есть cookie» ≠ «токен валиден».
 * 401 после неудачной попытки refresh (см. lib/api/api.ts) → на /login с
 * возвратом на текущий путь. Реальные права по-прежнему проверяет бэкенд;
 * здесь только UX (инвариант 9 плана). */
export default function RequireAuth() {
  const location = useLocation();
  const {
    data: employee,
    error,
    isPending,
    refetch,
  } = useQuery(employeeQueryOptions);

  if (isPending) return <PageLoader fullscreen />;

  if (error) {
    if (error instanceof ApiError && error.status === 401) {
      return (
        <Navigate
          to={loginUrl(location.pathname + location.search)}
          replace
        />
      );
    }
    return (
      <ErrorState
        fullscreen
        title="Не удалось загрузить данные пользователя"
        message={error.message}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <EmployeeContext.Provider value={employee}>
      <Outlet />
    </EmployeeContext.Provider>
  );
}
