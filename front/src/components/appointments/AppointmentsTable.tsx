import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppointmentRowActions from "@/components/appointments/AppointmentRowActions";
import StatusChip from "@/components/ui/StatusChip";
import { TABLE_CARD, TABLE_FOOT, TABLE_HEAD, TABLE_ROW } from "@/components/ui/tableStyles";
import type { EmployeeRole } from "@/lib/api/employees";
import type { Appointment } from "@/lib/types";

/** Сколько строк показываем, пока не нажали «Показать все». */
const PREVIEW_ROWS = 6;

type Props = {
  appointments: Appointment[];
  /** Колонка «Врач» — когда видны приёмы нескольких врачей. */
  showDoctor: boolean;
  currentEmployeeId: number;
  currentEmployeeRole: EmployeeRole;
  startingId: string | null;
  onStart: (appointment: Appointment) => void;
  onChanged: () => void;
  emptyText: string;
};

export default function AppointmentsTable({
  appointments,
  showDoctor,
  currentEmployeeId,
  currentEmployeeRole,
  startingId,
  onStart,
  onChanged,
  emptyText,
}: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? appointments : appointments.slice(0, PREVIEW_ROWS);
  const columns = showDoctor
    ? "grid-cols-[96px_minmax(0,1fr)_160px_140px_190px]"
    : "grid-cols-[96px_minmax(0,1fr)_140px_190px]";

  return (
    <section className={TABLE_CARD}>
      <div className="overflow-x-auto">
        <div className={showDoctor ? "min-w-[860px]" : "min-w-[700px]"}>
          <div className={`${TABLE_HEAD} ${columns}`}>
            <span>Очередь</span>
            <span>Пациент и жалоба</span>
            {showDoctor && <span>Врач</span>}
            <span>Статус</span>
            <span className="text-right">Действие</span>
          </div>

          {appointments.length === 0 ? (
            <p className="border-t border-row-line px-6 py-12 text-center text-sm text-ink-3">{emptyText}</p>
          ) : (
            visible.map((appointment) => (
              <div
                key={appointment.id}
                onClick={() => navigate(`/patients/${appointment.patientId}`)}
                className={`${TABLE_ROW} ${columns} cursor-pointer`}
              >
                <span className="text-base font-semibold text-ink">№{appointment.queueNumber}</span>
                <Link
                  to={`/patients/${appointment.patientId}`}
                  className="min-w-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="block truncate text-sm font-semibold text-ink">{appointment.patient}</span>
                  <span className="block truncate text-[13px] text-ink-3" title={appointment.complaint}>
                    {appointment.complaint}
                  </span>
                </Link>
                {showDoctor && <span className="truncate text-sm text-ink-2">{appointment.doctor}</span>}
                <span>
                  <StatusChip kind={appointment.status} />
                </span>
                {/* клики внутри (кнопки, меню, окна отмены/переноса) не открывают карточку */}
                <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                  <AppointmentRowActions
                    appointment={appointment}
                    currentEmployeeId={currentEmployeeId}
                    currentEmployeeRole={currentEmployeeRole}
                    starting={startingId === appointment.id}
                    onStart={onStart}
                    onChanged={onChanged}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {appointments.length > 0 && (
        <div className={TABLE_FOOT}>
          <span>
            Показано {visible.length} из {appointments.length}
          </span>
          {appointments.length > PREVIEW_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {expanded ? "Свернуть" : "Показать все"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
