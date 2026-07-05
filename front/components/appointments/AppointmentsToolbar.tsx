"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createAppointment } from "@/lib/api/appointments";
import type { Patient } from "@/lib/types";

export type ViewMode = "list" | "calendar";

type Props = {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  doctorName: string;
  listDate: string;
  onListDateChange: (value: string) => void;
  patients: Patient[];
  onAppointmentCreated: () => void;
};

export default function AppointmentsToolbar({
  view,
  onViewChange,
  doctorName,
  listDate,
  onListDateChange,
  patients,
  onAppointmentCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    patientId: "",
    date: listDate,
    time: "09:00",
    complaint: "",
  });

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      await createAppointment(form);
      setOpen(false);
      onAppointmentCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось записать пациента");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            disabled
            value={doctorName}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option>{doctorName}</option>
          </select>
          {view === "list" && (
            <input
              type="date"
              value={listDate}
              onChange={(e) => onListDateChange(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => onViewChange("list")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-[#e8f5ee] text-[#1a5c3a]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Список
            </button>
            <button
              type="button"
              onClick={() => onViewChange("calendar")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "calendar"
                  ? "bg-[#e8f5ee] text-[#1a5c3a]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Календарь
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({ ...prev, date: listDate }));
              setOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
          >
            <Plus className="h-4 w-4" />
            Записать пациента
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Запись на приём
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Пациент</span>
                <select
                  value={form.patientId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, patientId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="">Выберите пациента</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Дата</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Время</span>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, time: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  />
                </label>
              </div>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Жалоба</span>
                <textarea
                  value={form.complaint}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, complaint: e.target.value }))
                  }
                  rows={3}
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
                disabled={saving || !form.patientId}
                onClick={handleCreate}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Записать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
