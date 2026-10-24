import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx — ответ бэкенда по существу (нет прав, не найдено, не авторизован),
      // повторять бессмысленно; ретраим только сетевые сбои и 5xx.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      // Раньше (RSC) данные грузились при заходе на страницу, а не при
      // возврате во вкладку; не меняем поведение.
      refetchOnWindowFocus: false,
      // Кэш не переживает уход со страницы: каждый заход грузит данные заново,
      // как серверные компоненты. Это не прихоть — часть компонентов
      // (ServicesContent, CashRegisterContent, ProfileContent, ExaminationForm)
      // копирует данные из props в useState один раз; устаревший кэш на входе
      // показал бы им старый список и не обновил бы после фонового refetch.
      // Сессия (employee) кэшируется отдельно — см. employeeQueryOptions.
      gcTime: 0,
    },
  },
});
