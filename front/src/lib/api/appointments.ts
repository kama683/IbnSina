import { apiGet, apiPatch, apiPost } from "./api";
import type { CancellationReasonCode } from "@/lib/cancellation";
import type { Appointment } from "@/lib/types";

export interface WeekStats {
  period: string;
  total: number;
  completed: number;
  cancelled: number;
  newPatients: number;
  dispensary: number;
  avgMinutes: number;
}

/** Приёмы на сегодня (GET /api/appointments/today). */
export function getTodayAppointments(): Promise<Appointment[]> {
  return apiGet<Appointment[]>("/api/appointments/today");
}

/** Приёмы за текущую неделю, пн–сб (GET /api/appointments/week). */
export function getWeekAppointments(): Promise<Appointment[]> {
  return apiGet<Appointment[]>("/api/appointments/week");
}

/** Статистика за текущую неделю (GET /api/appointments/stats/week). */
export function getWeekStats(): Promise<WeekStats> {
  return apiGet<WeekStats>("/api/appointments/stats/week");
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

/** Смена статуса приёма (начать / завершить). */
export function updateAppointmentStatus(
  id: string,
  status: Appointment["status"],
): Promise<Appointment> {
  return apiPatch<Appointment>(`/api/appointments/${id}`, { status });
}

/** Отмена приёма. Причина обязательна: код из справочника, для «Другое» —
 * ещё и текст. Права проверяет бэкенд (reception/head_doctor — любой приём,
 * врач — только свой), отменить можно только запланированный приём. */
export function cancelAppointment(
  id: string,
  reason: { code: CancellationReasonCode; text?: string },
): Promise<Appointment> {
  return apiPatch<Appointment>(`/api/appointments/${id}`, {
    status: "cancelled",
    cancellationReasonCode: reason.code,
    cancellationReason: reason.code === "other" ? reason.text?.trim() : undefined,
  });
}

/** Перенос приёма — правка даты (и, при необходимости, врача) той же записи,
 * не отмена+создание: бэкенд проверяет рабочий день и ставит пациента в конец
 * очереди нового дня. */
export function rescheduleAppointment(
  id: string,
  target: { date: string; employeeId?: string },
): Promise<Appointment> {
  return apiPatch<Appointment>(`/api/appointments/${id}`, {
    date: target.date,
    employeeId: target.employeeId ? Number(target.employeeId) : undefined,
  });
}

export type AppointmentsQuery = {
  from?: string;
  to?: string;
  patientId?: string;
  status?: Appointment["status"][];
  /** Завершённые за последние N минут (по часам БД), новые первыми. */
  completedWithin?: number;
};

/** Приёмы по пациенту, статусам, периоду или «завершены за N минут»
 * (GET /api/appointments). Нужен хотя бы один из: from/to, patientId,
 * completedWithin — журнал всей клиники бэкенд не отдаёт. */
export function getAppointments(query: AppointmentsQuery): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.patientId) params.set("patientId", query.patientId);
  if (query.status?.length) params.set("status", query.status.join(","));
  if (query.completedWithin) params.set("completedWithin", String(query.completedWithin));
  return apiGet<Appointment[]>(`/api/appointments?${params}`);
}

export type QueueInfo = {
  /** Врач принимает в этот день по графику. */
  works: boolean;
  /** Сколько пациентов уже ждёт (записаны или на приёме). */
  waiting: number;
  /** Номер, который получит новый пациент. */
  nextNumber: number;
};

/** Подсказка для формы записи: работает ли врач в этот день и какой номер в
 * очереди получит пациент. Не источник истины — номер ставит бэкенд при
 * создании. */
export function getQueueInfo(employeeId: string, date: string): Promise<QueueInfo> {
  const params = new URLSearchParams({ employeeId, date });
  return apiGet<QueueInfo>(`/api/appointments/queue-info?${params}`);
}

export type AppointmentCreatePayload = {
  patientId: string;
  employeeId: string;
  date: string;
  complaint: string;
};

/** Записать пациента на приём (POST /api/appointments). Этап 1, коммит 3 —
 * employeeId теперь обязателен, сервер сам перепроверяет, что это активный
 * клиницист (docs/PHASE1_ANALYSIS.md §6). */
export function createAppointment(
  payload: AppointmentCreatePayload,
): Promise<Appointment> {
  return apiPost<Appointment>("/api/appointments", {
    patientId: Number(payload.patientId),
    employeeId: Number(payload.employeeId),
    date: payload.date,
    complaint: payload.complaint,
  });
}
