import type { AppointmentStatus } from "@/lib/types";

export type ChipKind = AppointmentStatus | "next";

const CHIPS: Record<ChipKind, { label: string; className: string; dot: string | null }> = {
  scheduled: { label: "Записан", className: "bg-info-soft text-info", dot: "bg-info" },
  in_progress: { label: "На приёме", className: "bg-[#d8f0e3] text-[#0b5b3a]", dot: "bg-[#0b5b3a]" },
  completed: { label: "Проведён", className: "bg-chip-gray text-ink-2", dot: "bg-ink-2" },
  cancelled: { label: "Отменён", className: "bg-danger-soft text-danger", dot: "bg-danger" },
  next: { label: "Следующий", className: "bg-brand text-white", dot: null },
};

/** Чип статуса приёма. Цвет всегда дублируется текстом. */
export default function StatusChip({ kind }: { kind: ChipKind }) {
  const chip = CHIPS[kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-semibold ${chip.className}`}
    >
      {chip.dot && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />}
      {chip.label}
    </span>
  );
}
