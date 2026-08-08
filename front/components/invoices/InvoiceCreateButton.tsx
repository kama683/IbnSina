"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Receipt, Trash2, X } from "lucide-react";
import Autocomplete from "@/components/ui/Autocomplete";
import RoleGate from "@/components/auth/RoleGate";
import { createInvoice } from "@/lib/api/invoices";
import { getServices, type Service } from "@/lib/api/services";
import type { EmployeeRole } from "@/lib/api/employees";
import { MANAGE_CASH_ROLES } from "@/lib/roles";
import { formatTiyn, tengeInputToTiyn } from "@/lib/currency";

type Line = {
  service: Service;
  quantity: number;
};

type Props = {
  patientId: number;
  currentEmployeeRole: EmployeeRole;
};

/** Этап 2, коммит 8 (docs/PHASE2_ANALYSIS.md) — выставление счёта с карточки
 * пациента. Только услуги (решение 1, §4 плана), препараты — Этап 3. */
export default function InvoiceCreateButton({ patientId, currentEmployeeRole }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [discountInput, setDiscountInput] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getServices()
      .then(setServices)
      .catch(() => setServices([]));
  }, [open]);

  const subtotal = lines.reduce((sum, line) => sum + line.service.price * line.quantity, 0);
  const discountTotal = tengeInputToTiyn(discountInput);
  const total = Math.max(subtotal - discountTotal, 0);

  function addLine() {
    if (!selectedService) return;
    setLines((prev) => [...prev, { service: selectedService, quantity: 1 }]);
    setSelectedService(null);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function changeQuantity(index: number, quantity: number) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, quantity: Math.max(1, quantity) } : line)),
    );
  }

  async function handleCreate() {
    if (lines.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const invoice = await createInvoice({
        patientId,
        items: lines.map((line) => ({
          serviceId: line.service.id,
          quantity: line.quantity,
        })),
        discountTotal,
      });
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выставить счёт");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate role={currentEmployeeRole} allow={MANAGE_CASH_ROLES}>
      <button
        type="button"
        onClick={() => {
          setLines([]);
          setDiscountInput("0");
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Receipt className="h-4 w-4" />
        Выставить счёт
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Новый счёт</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Autocomplete
                  items={services}
                  value={selectedService}
                  onChange={setSelectedService}
                  getLabel={(service) => service.name}
                  getSubLabel={(service) => formatTiyn(service.price)}
                  getKey={(service) => service.id}
                  placeholder="Выберите услугу"
                />
              </div>
              <button
                type="button"
                onClick={addLine}
                disabled={!selectedService}
                className="rounded-lg bg-[#1a5c3a] px-3 py-2 text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {lines.length > 0 && (
              <div className="mt-3 space-y-2">
                {lines.map((line, index) => (
                  <div
                    key={`${line.service.id}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <span className="flex-1 text-sm text-gray-900">{line.service.name}</span>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => changeQuantity(index, Number(e.target.value))}
                      className="w-14 rounded border border-gray-200 px-1.5 py-1 text-center text-sm"
                    />
                    <span className="w-24 text-right text-sm text-gray-600">
                      {formatTiyn(line.service.price * line.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Скидка, ₸</span>
                <input
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <div className="text-sm">
                <span className="mb-1 block text-gray-600">Итого</span>
                <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 font-medium text-gray-900">
                  {formatTiyn(total)}
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={saving || lines.length === 0}
                onClick={handleCreate}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Создать черновик
              </button>
            </div>
          </div>
        </div>
      )}
    </RoleGate>
  );
}
