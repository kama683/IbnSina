import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import ErrorState from "@/components/ui/ErrorState";
import Forbidden from "@/components/ui/Forbidden";
import NotFound from "@/components/ui/NotFound";
import PageLoader from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/api";

type Props = {
  queries: UseQueryResult<unknown>[];
  children: ReactNode;
  /** Текст для 404 (например «Пациент не найден»). */
  notFoundMessage?: string;
};

/** Состояния загрузки/ошибки страницы, которая раньше собиралась на сервере
 * целиком (RSC): пока хоть один запрос грузится — лоадер, любая ошибка —
 * экран ошибки вместо половины страницы. 404 → NotFound (как notFound() в
 * Next), 403 → Forbidden.
 *
 * Отключённые запросы (`enabled: false`, например vitals для роли без прав)
 * не считаются загрузкой — их data просто undefined. */
export default function QueryBoundary({
  queries,
  children,
  notFoundMessage,
}: Props) {
  const failed = queries.find((query) => query.isError);

  if (failed) {
    const error = failed.error;
    if (error instanceof ApiError) {
      if (error.status === 404) return <NotFound message={notFoundMessage} />;
      if (error.status === 403) return <Forbidden />;
    }
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => {
          for (const query of queries) {
            if (query.isError) void query.refetch();
          }
        }}
      />
    );
  }

  if (queries.some((query) => query.isLoading)) return <PageLoader />;

  return <>{children}</>;
}
