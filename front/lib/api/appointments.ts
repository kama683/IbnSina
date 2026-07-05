import { apiGet, apiPatch } from "./api";
import type { Appointment } from "@/lib/mock-data";

/** Приёмы на сегодня (GET /api/appointments/today). */
export function getTodayAppointments(): Promise<Appointment[]> {
  return apiGet<Appointment[]>("/api/appointments/today");
}

/** Приёмы за текущую неделю, пн–сб (GET /api/appointments/week). */
export function getWeekAppointments(): Promise<Appointment[]> {
  return apiGet<Appointment[]>("/api/appointments/week");
}

/** Приёмы за произвольный период (GET /api/appointments?from=&to=). */
export function getAppointmentsInRange(
  from: string,
  to: string,
): Promise<Appointment[]> {
  const params = new URLSearchParams({ from, to });
  return apiGet<Appointment[]>(`/api/appointments?${params}`);
}

/** Текущий приём со статусом in_progress; null — если никто не на приёме. */
export function getCurrentAppointment(): Promise<Appointment | null> {
  return apiGet<Appointment | null>("/api/appointments/current");
}

/** Очередь на сегодня: scheduled + in_progress. */
export function getQueueAppointments(): Promise<Appointment[]> {
  return apiGet<Appointment[]>("/api/appointments/queue");
}

/** Смена статуса приёма (начать / завершить / отменить). */
export function updateAppointmentStatus(
  id: string,
  status: Appointment["status"],
): Promise<Appointment> {
  return apiPatch<Appointment>(`/api/appointments/${id}`, { status });
}
