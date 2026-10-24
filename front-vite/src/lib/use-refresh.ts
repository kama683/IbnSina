import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EMPLOYEE_QUERY_KEY } from "@/lib/auth/employee-context";

/** Замена `router.refresh()` из Next: после мутации перезапрашивает данные
 * текущей страницы. Next при refresh перерисовывал всё серверное дерево, так
 * что и здесь инвалидируем все запросы, кроме сессии (текущий сотрудник от
 * мутаций не меняется). Активные запросы перезагружаются сразу, остальные
 * помечаются устаревшими и подтянутся при следующем заходе на страницу. */
export function useRefresh(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== EMPLOYEE_QUERY_KEY[0],
      }),
    [queryClient],
  );
}
