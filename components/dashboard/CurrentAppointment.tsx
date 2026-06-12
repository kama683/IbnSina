import { Clock, ChevronRight } from "lucide-react";
import type { Appointment } from "@/lib/mock-data";

type Props = {
  appointment: Appointment;
};

export default function CurrentAppointment({ appointment }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-l-4 border-amber-400 px-5 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-amber-700">Текущий приём</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">
              {appointment.patient}
            </p>
            <p className="mt-0.5 truncate text-sm text-gray-500">
              {appointment.complaint}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
        >
          Открыть
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
