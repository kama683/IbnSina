"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { createPatient } from "@/lib/api/patients";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  area: string;
  onAreaChange: (value: string) => void;
  areas: string[];
  defaultArea: string;
  onPatientCreated: () => void;
};

export default function PatientsToolbar({
  search,
  onSearchChange,
  area,
  onAreaChange,
  areas,
  defaultArea,
  onPatientCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    iin: "",
    birthDate: "",
    gender: "М" as "М" | "Ж",
    phone: "",
    address: "",
    area: defaultArea,
    bloodType: "",
    dispensary: false,
  });

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      await createPatient({
        fullName: form.fullName,
        iin: form.iin,
        birthDate: form.birthDate,
        gender: form.gender,
        phone: form.phone || undefined,
        address: form.address || undefined,
        area: form.area,
        bloodType: form.bloodType || undefined,
        dispensary: form.dispensary,
      });
      setOpen(false);
      onPatientCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать пациента");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск по ФИО или ИИН"
              className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
            />
          </div>

          <select
            value={area}
            onChange={(e) => onAreaChange(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
          >
            <option value="all">Все участки</option>
            {areas.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
        >
          <Plus className="h-4 w-4" />
          Добавить пациента
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Новый пациент
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm">
                <span className="mb-1 block text-gray-600">ФИО</span>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">ИИН</span>
                <input
                  value={form.iin}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, iin: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Дата рождения</span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, birthDate: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Пол</span>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      gender: e.target.value as "М" | "Ж",
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="М">М</option>
                  <option value="Ж">Ж</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Участок</span>
                <input
                  value={form.area}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, area: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Телефон</span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="sm:col-span-2 text-sm">
                <span className="mb-1 block text-gray-600">Адрес</span>
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
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
                disabled={saving}
                onClick={handleCreate}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
