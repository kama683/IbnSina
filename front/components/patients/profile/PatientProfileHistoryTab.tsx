import StatusBadge from "@/components/ui/StatusBadge";
import type { PatientMedicalHistoryEntry } from "@/lib/mock-data";

type Props = {
  history: PatientMedicalHistoryEntry[];
};

function getDayLabel(date: string) {
  return date.split(".")[0] ?? date;
}

export default function PatientProfileHistoryTab({ history }: Props) {
  if (history.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200/80 bg-white px-5 py-10 text-center shadow-sm">
        <p className="text-sm text-gray-400">История приёмов пуста</p>
      </section>
    );
  }

  return (
    <div className="relative">
      {history.map((entry, index) => (
        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < history.length - 1 && (
            <span className="absolute left-[15px] top-10 h-[calc(100%-16px)] w-px bg-gray-200" />
          )}

          <div className="relative z-10 flex w-8 shrink-0 flex-col items-center pt-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 shadow-sm">
              {getDayLabel(entry.date)}
            </span>
          </div>

          <article className="min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-50 px-5 py-3">
              <p className="text-sm font-medium text-gray-900">
                {entry.date}{" "}
                <span className="font-normal text-gray-500">{entry.time}</span>
                <span className="text-gray-300"> — </span>
                {entry.doctor}
              </p>
              <StatusBadge status={entry.status} />
            </div>

            <div className="space-y-2 px-5 py-4">
              <p className="text-sm text-gray-600">{entry.complaint}</p>
              {entry.diagnosis && (
                <p className="text-sm font-medium text-[#1a5c3a]">
                  {entry.diagnosis}
                </p>
              )}
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}
