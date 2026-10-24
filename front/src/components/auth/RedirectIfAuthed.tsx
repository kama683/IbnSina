import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router-dom";
import PageLoader from "@/components/ui/PageLoader";
import { employeeQueryOptions } from "@/lib/auth/employee-context";
import { safeNextPath } from "@/lib/auth/next-path";

/** Для /login: уже вошедшего не пускаем обратно на форму (то же делал
 * proxy.ts в Next). Ошибка запроса = сессии нет → показываем форму. */
export default function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const { data, isPending } = useQuery({ ...employeeQueryOptions, retry: false });

  if (isPending) return <PageLoader fullscreen />;
  if (data) {
    return <Navigate to={safeNextPath(searchParams.get("next"))} replace />;
  }
  return <>{children}</>;
}
