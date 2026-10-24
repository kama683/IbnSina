import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { updatePatient } from "@/lib/api/patients";
import type { Patient } from "@/lib/types";

type Props = {
  patient: Patient;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

/** Этап 1, коммит 12 (docs/PHASE1_ANALYSIS.md §6 п.7) — только
 * демографические поля, медданные (аллергии/диагнозы) сюда не входят. */
export default function PatientEditModal({ patient, open, onClose, onUpdated }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: patient.fullName,
    iin: patient.iin,
    birthDate: "",
    gender: patient.gender,
    phone: patient.phone,
    address: patient.address,
    area: patient.area,
    bloodType: patient.bloodType,
  });

  useEffect(() => {
    if (open) {
      setForm({
        fullName: patient.fullName,
        iin: patient.iin,
        birthDate: patient.birthDate.split(".").reverse().join("-"),
        gender: patient.gender,
        phone: patient.phone,
        address: patient.address,
        area: patient.area,
        bloodType: patient.bloodType,
      });
      setError(null);
    }
  }, [open, patient]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updatePatient(patient.id, form);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Редактировать пациента</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm">
            <span className="mb-1 block text-gray-600">ФИО</span>
            <input
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">ИИН</span>
            <input
              value={form.iin}
              onChange={(e) => setForm((prev) => ({ ...prev, iin: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Дата рождения</span>
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Пол</span>
            <select
              value={form.gender}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, gender: e.target.value as "М" | "Ж" }))
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
              onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Телефон</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Группа крови</span>
            <input
              value={form.bloodType}
              onChange={(e) => setForm((prev) => ({ ...prev, bloodType: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="sm:col-span-2 text-sm">
            <span className="mb-1 block text-gray-600">Адрес</span>
            <input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
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
  );
}
