import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import type { PatientExamination } from "@/lib/types";

type Props = {
  patientId: string | number;
  examination: PatientExamination;
};

function formatTime(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

/** Итог после «Завершить приём»: форма осмотра уже не редактируется (бэкенд
 * не отдаёт завершённый приём на правку), поэтому показываем сводку и куда
 * идти дальше. */
export default function ExaminationCompleted({ patientId, examination }: Props) {
  const completedTime = formatTime(examination.completedAt);
  const prescriptions = examination.prescriptions.filter((p) => p.medication.trim() !== "");

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-emerald-50/60 px-5 py-4">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Приём завершён</h2>
          {completedTime && (
            <p className="text-xs text-gray-500">Завершён в {completedTime}</p>
          )}
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        <SummaryBlock title="Жалобы">{examination.complaints || "—"}</SummaryBlock>
        <SummaryBlock title="Объективный статус">
          {examination.objectiveStatus || "—"}
        </SummaryBlock>
        <SummaryBlock title="Диагноз (МКБ-10)">
          {examination.diagnoses.length > 0 ? (
            <ul className="space-y-1">
              {examination.diagnoses.map((d) => (
                <li key={d.code}>
                  <span className="font-medium text-[#1a5c3a]">{d.code}</span> {d.name}
                </li>
              ))}
            </ul>
          ) : (
            "—"
          )}
        </SummaryBlock>
        <SummaryBlock title="Назначения">
          {prescriptions.length > 0 ? (
            <ul className="space-y-1">
              {prescriptions.map((p) => (
                <li key={p.id}>
                  {p.medication}
                  {p.dosage && ` · ${p.dosage}`}
                  {p.duration && ` · ${p.duration}`}
                </li>
              ))}
            </ul>
          ) : (
            "—"
          )}
        </SummaryBlock>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 px-5 py-4">
        <Link
          to={`/patients/${patientId}`}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Карточка пациента
        </Link>
        <Link
          to="/appointments"
          className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
        >
          К приёмам
        </Link>
      </div>
    </section>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">{title}</p>
      <div className="whitespace-pre-line text-sm text-gray-800">{children}</div>
    </div>
  );
}
