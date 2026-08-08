"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  cancelAppointment,
  getAvailableSlots,
  rescheduleAppointment,
} from "@/lib/api/appointments";
import type { EmployeeRole } from "@/lib/api/employees";
import { MANAGE_ANY_APPOINTMENT_ROLES } from "@/lib/roles";
import type { Appointment } from "@/lib/types";

type Props = {
  appointment: Appointment;
  currentEmployeeId: number;
  currentEmployeeRole: EmployeeRole;
  onChanged: () => void;
};

/** Этап 1, коммит 9 (docs/PHASE1_ANALYSIS.md §6 п.3) — отмена/перенос
 * приёма. Видимость кнопок здесь — только UX (см. lib/roles.ts): совпадает
 * с матрицей прав PATCH /appointments/{id} из коммита 5, но реальную
 * проверку всегда делает бэкенд. */
export default function AppointmentActions({
  appointment,
  currentEmployeeId,
  currentEmployeeRole,
  onChanged,
}: Props) {
  const [mode, setMode] = useState<"none" | "cancel" | "reschedule">("none");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(appointment.date.split(".").reverse().join("-"));
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwn = appointment.employeeId === String(currentEmployeeId);
  const canManage =
    MANAGE_ANY_APPOINTMENT_ROLES.includes(currentEmployeeRole) ||
    (currentEmployeeRole === "doctor" && isOwn);
  const isFinal = appointment.status === "cancelled" || appointment.status === "completed";

  if (!canManage || isFinal) return null;

  function openReschedule() {
    setMode("reschedule");
    setError(null);
    setSlotsLoading(true);
    setTime("");
    getAvailableSlots(appointment.employeeId ?? "", date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }

  function changeDate(value: string) {
    setDate(value);
    setTime("");
    setSlotsLoading(true);
    getAvailableSlots(appointment.employeeId ?? "", value)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }

  async function handleCancel() {
    setSaving(true);
    setError(null);
    try {
      await cancelAppointment(appointment.id, reason);
      setMode("none");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить приём");
    } finally {
      setSaving(false);
    }
  }

  async function handleReschedule() {
    if (!time) return;
    setSaving(true);
    setError(null);
    try {
      await rescheduleAppointment(appointment.id, date, time);
      setMode("none");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось перенести приём");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setMode("cancel");
            setError(null);
          }}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          Отменить
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            openReschedule();
          }}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Перенести
        </button>
      </div>

      {mode !== "none" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {mode === "cancel" ? "Отменить приём" : "Перенести приём"}
              </h2>
              <button
                type="button"
                onClick={() => setMode("none")}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {mode === "cancel" ? (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Причина отмены</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Необязательно"
                />
              </label>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Дата</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => changeDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-gray-600">Время</span>
                  <select
                    value={time}
                    disabled={slotsLoading}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 disabled:bg-gray-50"
                  >
                    <option value="">
                      {slotsLoading
                        ? "Загрузка…"
                        : slots.length === 0
                          ? "Нет свободных слотов"
                          : "Выберите время"}
                    </option>
                    {slots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode("none")}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
              >
                Закрыть
              </button>
              <button
                type="button"
                disabled={saving || (mode === "reschedule" && !time)}
                onClick={mode === "cancel" ? handleCancel : handleReschedule}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {mode === "cancel" ? "Отменить приём" : "Перенести"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
