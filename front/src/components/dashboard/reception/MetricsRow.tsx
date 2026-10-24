import { formatTiyn } from "@/lib/currency";
import type { ReceptionSummary } from "@/lib/api/reports";

type Props = {
  /** undefined — данные ещё грузятся или недоступны: числа показываются как «—». */
  summary: ReceptionSummary | undefined;
};

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success";
}) {
  const colors =
    tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-gray-200/50 text-gray-900";
  const labelColor = tone === "success" ? "text-emerald-700" : "text-gray-500";
  return (
    <div className={`rounded-xl px-4 py-2 ${colors}`}>
      <p className={`text-[13px] ${labelColor}`}>{label}</p>
      <p className="mt-0.5 text-2xl font-medium leading-8">{value}</p>
    </div>
  );
}

/** Четыре компактные метрики. «В кассе» — принято за открытую смену (все
 * способы оплаты); зелёная, пока смена открыта, нейтральная и «—» — если нет. */
export default function MetricsRow({ summary }: Props) {
  const shift = summary?.shift ?? null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Ждут приёма" value={summary ? String(summary.queue.waiting) : "—"} />
      <Metric label="На приёме" value={summary ? String(summary.queue.inProgress) : "—"} />
      <Metric label="Не оплачено" value={summary ? String(summary.invoices.unpaidCount) : "—"} />
      <Metric
        label="В кассе"
        value={shift ? formatTiyn(shift.receivedTotal) : "—"}
        tone={shift ? "success" : "neutral"}
      />
    </div>
  );
}
