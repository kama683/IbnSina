import type { Appointment } from "@/lib/types";

/** Приёмы, которые ещё предстоят: записан или уже на приёме. */
export const isPending = (appointment: Appointment): boolean =>
  appointment.status === "scheduled" || appointment.status === "in_progress";

/** Следующий пациент — записанный (не начатый) с наименьшим номером в очереди. */
export function nextPatient(appointments: Appointment[]): Appointment | undefined {
  return appointments
    .filter((appointment) => appointment.status === "scheduled")
    .sort((a, b) => a.queueNumber - b.queueNumber)[0];
}

/** Порядок списка: активные (на приёме, записан) по номеру, затем проведённые,
 * отменённые всегда в конце. */
export function sortForList(appointments: Appointment[]): Appointment[] {
  const group = (appointment: Appointment) =>
    appointment.status === "cancelled" ? 2 : appointment.status === "completed" ? 1 : 0;
  return [...appointments].sort((a, b) => group(a) - group(b) || a.queueNumber - b.queueNumber);
}

export type AppointmentTab = "all" | "next" | "done" | "cancelled";

export type TabCounts = Record<AppointmentTab, number>;

/** Приёмы вкладки. «Далее» — предстоящие без следующего пациента, если он
 * вынесен в отдельную карточку над списком. */
export function filterByTab(
  appointments: Appointment[],
  tab: AppointmentTab,
  excludeId?: string,
): Appointment[] {
  switch (tab) {
    case "all":
      return appointments;
    case "next":
      return appointments.filter((a) => isPending(a) && a.id !== excludeId);
    case "done":
      return appointments.filter((a) => a.status === "completed");
    case "cancelled":
      return appointments.filter((a) => a.status === "cancelled");
  }
}

export function tabCounts(appointments: Appointment[], excludeId?: string): TabCounts {
  return {
    all: appointments.length,
    next: filterByTab(appointments, "next", excludeId).length,
    done: filterByTab(appointments, "done").length,
    cancelled: filterByTab(appointments, "cancelled").length,
  };
}
