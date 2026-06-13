import type { AppointmentStatus } from "@/lib/mock-data";

const statusConfig: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  completed: {
    label: "Завершён",
    className: "bg-emerald-50 text-emerald-700",
  },
  in_progress: {
    label: "На приёме",
    className: "bg-amber-50 text-amber-700",
  },
  scheduled: {
    label: "Записан",
    className: "bg-sky-50 text-sky-700",
  },
  cancelled: {
    label: "Отменён",
    className: "bg-red-50 text-red-600",
  },
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium leading-4 ${config.className}`}
    >
      {config.label}
    </span>
  );
}
