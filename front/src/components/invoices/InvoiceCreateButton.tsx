import { useState } from "react";
import { Receipt } from "lucide-react";
import RoleGate from "@/components/auth/RoleGate";
import InvoiceCreateModal from "@/components/invoices/InvoiceCreateModal";
import type { EmployeeRole } from "@/lib/api/employees";
import { MANAGE_CASH_ROLES } from "@/lib/roles";

type Props = {
  patientId: number;
  currentEmployeeRole: EmployeeRole;
};

/** Этап 2, коммит 8 (docs/PHASE2_ANALYSIS.md) — выставление счёта с карточки
 * пациента. Сама форма — InvoiceCreateModal (её же использует блок «Вышли от
 * врача» на стойке). */
export default function InvoiceCreateButton({ patientId, currentEmployeeRole }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <RoleGate role={currentEmployeeRole} allow={MANAGE_CASH_ROLES}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Receipt className="h-4 w-4" />
        Выставить счёт
      </button>

      <InvoiceCreateModal open={open} onClose={() => setOpen(false)} patientId={patientId} />
    </RoleGate>
  );
}
