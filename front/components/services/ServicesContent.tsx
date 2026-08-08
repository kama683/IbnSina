"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import RoleGate from "@/components/auth/RoleGate";
import {
  createService,
  updateService,
  type Service,
  type ServiceCategory,
} from "@/lib/api/services";
import type { EmployeeRole } from "@/lib/api/employees";
import { MANAGE_SERVICES_ROLES } from "@/lib/roles";
import { formatTiyn, tengeInputToTiyn } from "@/lib/currency";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  consultation: "Консультация",
  procedure: "Процедура",
  analysis: "Анализ",
  other: "Прочее",
};

type Props = {
  initialServices: Service[];
  currentEmployeeRole: EmployeeRole;
};

type FormState = {
  code: string;
  name: string;
  category: ServiceCategory;
  price: string;
  durationMinutes: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  category: "consultation",
  price: "",
  durationMinutes: "",
};

/** Этап 2, коммит 7 (docs/PHASE2_ANALYSIS.md) — прейскурант. Чтение — всем
 * допущенным ролям, создание/правка/деактивация — только head_doctor
 * (RoleGate, зеркалит _MANAGE_SERVICES в back/app/routers/services.py). */
export default function ServicesContent({ initialServices, currentEmployeeRole }: Props) {
  const [services, setServices] = useState(initialServices);
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setCreating(true);
  }

  function openEdit(service: Service) {
    setForm({
      code: service.code,
      name: service.name,
      category: service.category,
      price: String(service.price / 100),
      durationMinutes: service.durationMinutes ? String(service.durationMinutes) : "",
    });
    setError(null);
    setEditing(service);
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        category: form.category,
        price: tengeInputToTiyn(form.price),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      };
      if (editing) {
        const updated = await updateService(editing.id, payload);
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createService(payload);
        setServices((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить услугу");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service: Service) {
    try {
      const updated = await updateService(service.id, { isActive: !service.isActive });
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      // Тихо игнорируем — статус в таблице просто не поменяется, пользователь увидит и повторит.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RoleGate role={currentEmployeeRole} allow={MANAGE_SERVICES_ROLES}>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
          >
            <Plus className="h-4 w-4" />
            Добавить услугу
          </button>
        </RoleGate>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                <th className="px-5 py-2.5">Код</th>
                <th className="px-5 py-2.5">Название</th>
                <th className="px-5 py-2.5">Категория</th>
                <th className="px-5 py-2.5">Цена</th>
                <th className="px-5 py-2.5">Статус</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr
                  key={service.id}
                  className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/80"
                >
                  <td className="px-5 py-3 text-sm text-gray-500">{service.code}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{service.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {CATEGORY_LABELS[service.category]}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900">{formatTiyn(service.price)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        service.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {service.isActive ? "Активна" : "Отключена"}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <RoleGate role={currentEmployeeRole} allow={MANAGE_SERVICES_ROLES}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(service)}
                          className="text-gray-400 hover:text-gray-700"
                          aria-label={`Редактировать ${service.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(service)}
                          className="text-xs text-gray-500 hover:text-gray-800"
                        >
                          {service.isActive ? "Отключить" : "Включить"}
                        </button>
                      </div>
                    </RoleGate>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    Прейскурант пуст
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editing ? "Редактировать услугу" : "Новая услуга"}
            </h2>
            <div className="grid gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Код</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Название</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Категория</span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value as ServiceCategory,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Цена, ₸</span>
                  <input
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Длительность, мин</span>
                  <input
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  />
                </label>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
