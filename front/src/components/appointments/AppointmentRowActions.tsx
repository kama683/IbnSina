import { useState } from "react";
import { Link } from "react-router-dom";
import CancelAppointmentModal from "@/components/appointments/CancelAppointmentModal";
import RescheduleAppointmentModal from "@/components/appointments/RescheduleAppointmentModal";
import { buttonClass } from "@/components/ui/buttonStyles";
import RowMenu, { type RowMenuItem } from "@/components/ui/RowMenu";
import type { EmployeeRole } from "@/lib/api/employees";
import { todayIso } from "@/lib/dates";
import { CHECK_IN_ROLES, MANAGE_ANY_APPOINTMENT_ROLES } from "@/lib/roles";
import type { Appointment } from "@/lib/types";

/** Подсказка у «Начать», пока кто-то уже на приёме. */
export const START_BLOCKED_HINT = "Сначала завершите текущий приём";

type Props = {
  appointment: Appointment;
  currentEmployeeId: number;
  currentEmployeeRole: EmployeeRole;
  starting?: boolean;
  /** «Начать» неактивна: кто-то уже «На приёме». */
  startBlocked?: boolean;
  /** «Начать» не показываем (не сегодняшний день). */
  hideStart?: boolean;
  onStart: (appointment: Appointment) => void;
  /** После отмены/переноса — обновить данные страницы. */
  onChanged: () => void;
};

/** Действия строки списка приёмов: «Начать» + «⋯» (записан), «Осмотр» (на
 * приёме), «Протокол» (проведён), только «⋯» (отменён). Видимость — только UX и
 * совпадает с матрицей прав PATCH /appointments/{id} (reception и head_doctor —
 * любой приём, врач — свой); реальную проверку делает бэкенд. */
export default function AppointmentRowActions({
  appointment,
  currentEmployeeId,
  currentEmployeeRole,
  starting = false,
  startBlocked = false,
  hideStart = false,
  onStart,
  onChanged,
}: Props) {
  const [target, setTarget] = useState<"cancel" | "reschedule" | null>(null);

  const canStart = CHECK_IN_ROLES.includes(currentEmployeeRole);
  const isOwn = appointment.employeeId === String(currentEmployeeId);
  const canManage =
    MANAGE_ANY_APPOINTMENT_ROLES.includes(currentEmployeeRole) ||
    (currentEmployeeRole === "doctor" && isOwn);

  if (appointment.status === "completed") {
    // протокол сегодняшнего приёма — экран осмотра, прошлых — карточка пациента
    const isToday = appointment.date.split(".").reverse().join("-") === todayIso();
    return (
      <Link
        to={isToday ? `/patients/${appointment.patientId}/examination` : `/patients/${appointment.patientId}`}
        className="text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Протокол
      </Link>
    );
  }

  if (appointment.status === "in_progress") {
    return canStart ? (
      <Link
        to={`/patients/${appointment.patientId}/examination`}
        className={buttonClass("primary", "sm", "px-4")}
      >
        Осмотр
      </Link>
    ) : null;
  }

  const cancelled = appointment.status === "cancelled";
  if (!canManage && !(canStart && !cancelled && !hideStart)) return null;

  // у отменённого приёма перенос и отмена недоступны (бэкенд ответил бы 409)
  const items: RowMenuItem[] = canManage
    ? [
        { label: "Перенести", onSelect: () => setTarget("reschedule"), disabled: cancelled },
        { label: "Отменить", onSelect: () => setTarget("cancel"), danger: true, disabled: cancelled },
      ]
    : [];

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {canStart && !cancelled && !hideStart && (
          <button
            type="button"
            disabled={starting || startBlocked}
            title={startBlocked ? START_BLOCKED_HINT : undefined}
            onClick={() => onStart(appointment)}
            className={buttonClass("secondaryGreen", "sm")}
          >
            Начать
          </button>
        )}
        {items.length > 0 && <RowMenu items={items} ariaLabel="Ещё: перенести или отменить" />}
      </div>

      <CancelAppointmentModal
        appointment={target === "cancel" ? appointment : null}
        onClose={() => setTarget(null)}
        onCancelled={onChanged}
      />
      <RescheduleAppointmentModal
        appointment={target === "reschedule" ? appointment : null}
        onClose={() => setTarget(null)}
        onRescheduled={onChanged}
      />
    </>
  );
}
