import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AwaitingPayment from "@/components/dashboard/reception/AwaitingPayment";
import DoctorsNow from "@/components/dashboard/reception/DoctorsNow";
import FrontDesk from "@/components/dashboard/reception/FrontDesk";
import MetricsRow from "@/components/dashboard/reception/MetricsRow";
import RecentlyCompleted from "@/components/dashboard/reception/RecentlyCompleted";
import { formatClock, formatLongDate } from "@/components/dashboard/reception/format";
import { getReceptionSummary } from "@/lib/api/reports";

const EMPTY_INVOICES = { unpaidCount: 0, awaitingApprovalCount: 0, awaitingPayment: [] };

/** «Стойка регистратуры» — рабочее место регистратора (роль reception).
 * Все цифры блоков приходят одним запросом /api/reports/reception-summary;
 * поиск пациента от него не зависит и доступен сразу. Ошибка сводки не роняет
 * страницу: блоки показывают своё состояние, поиск продолжает работать. */
export default function ReceptionHome() {
  const summary = useQuery({
    queryKey: ["reports", "reception-summary"],
    queryFn: getReceptionSummary,
    // Экран открыт весь день — очередь и счета должны обновляться сами.
    refetchInterval: 30_000,
  });

  const data = summary.data;
  const state = summary.isError ? "error" : summary.isLoading ? "loading" : "ready";
  const retry = () => void summary.refetch();

  return (
    <div className="mx-auto max-w-[1400px] space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="text-[22px] font-medium tracking-tight text-gray-900">
          Стойка регистратуры
        </h1>
        <p className="text-xs text-gray-500">
          {formatLongDate()}
          {" · "}
          {data?.shift ? (
            <>Смена открыта в {formatClock(data.shift.openedAt)}</>
          ) : data ? (
            <>
              Смена не открыта{" "}
              <Link to="/cash-register" className="text-[#1a5c3a] hover:underline">
                Открыть
              </Link>
            </>
          ) : (
            "…"
          )}
        </p>
      </div>

      <FrontDesk />

      <RecentlyCompleted />

      <MetricsRow summary={data} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DoctorsNow doctors={data?.doctors ?? []} state={state} onRetry={retry} />
        <AwaitingPayment invoices={data?.invoices ?? EMPTY_INVOICES} state={state} onRetry={retry} />
      </div>
    </div>
  );
}
