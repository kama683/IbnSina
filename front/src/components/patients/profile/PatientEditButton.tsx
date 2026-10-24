import { useState } from "react";
import { Pencil } from "lucide-react";
import { useRefresh } from "@/lib/use-refresh";
import RoleGate from "@/components/auth/RoleGate";
import PatientEditModal from "@/components/patients/profile/PatientEditModal";
import type { EmployeeRole } from "@/lib/api/employees";
import { MANAGE_ANY_APPOINTMENT_ROLES } from "@/lib/roles";
import type { Patient } from "@/lib/types";

type Props = {
  patient: Patient;
  currentEmployeeRole: EmployeeRole;
};

/** Этап 1, коммит 12 (docs/PHASE1_ANALYSIS.md §6 п.7) — видимость кнопки
 * зеркалит матрицу прав PATCH /api/patients/{id} (коммит 6): reception,
 * head_doctor. Это тот же набор ролей, что "отменить любой приём" — не
 * совпадение, обе операции — административная правка данных, не мед. */
export default function PatientEditButton({ patient, currentEmployeeRole }: Props) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);

  return (
    <RoleGate role={currentEmployeeRole} allow={MANAGE_ANY_APPOINTMENT_ROLES}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Pencil className="h-4 w-4" />
        Редактировать
      </button>
      <PatientEditModal
        patient={patient}
        open={open}
        onClose={() => setOpen(false)}
        onUpdated={() => {
          setOpen(false);
          void refresh();
        }}
      />
    </RoleGate>
  );
}
