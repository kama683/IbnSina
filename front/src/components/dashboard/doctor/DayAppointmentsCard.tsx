import { useNavigate } from "react-router-dom";
import AppointmentRowActions from "@/components/appointments/AppointmentRowActions";
import DateSwitcher from "@/components/ui/DateSwitcher";
import PillTabs from "@/components/ui/PillTabs";
import StatusChip from "@/components/ui/StatusChip";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ErrorState from "@/components/ui/ErrorState";
import type { EmployeeRole } from "@/lib/api/employees";
import { filterByTab, sortForList, tabCounts, type AppointmentTab } from "@/lib/queue";
import type { Appointment } from "@/lib/types";

const COLUMNS = "grid-cols-[72px_minmax(0,1fr)_130px_150px]";

type Props = {
  /** Приёмы выбранного дня (уже ограничены текущим врачом); undefined — загрузка. */
  appointments: Appointment[] | undefined;
  error?: Error | null;
  onRetry: () => void;
  date: string;
  onDateChange: (date: string) => void;
  /** Выбран сегодняшний день: только тогда можно начинать приём. */
  isToday: boolean;
  nextId?: string;
  /** Кто-то уже «На приёме» — «Начать» неактивна. */
  startBlocked: boolean;
  tab: AppointmentTab;
  onTabChange: (tab: AppointmentTab) => void;
  /** Подпись фильтра в футере, например «фильтр «Только мои»». */
  filterNote?: string;
  currentEmployeeId: number;
  currentEmployeeRole: EmployeeRole;
  startingId: string | null;
  onStart: (appointment: Appointment) => void;
  onChanged: () => void;
  onBook?: () => void;
};

/** Большая карточка дашборда: дата, вкладки со счётчиками и очередь дня по
 * номерам. Время приёма не показывается — только «№». */
export default function DayAppointmentsCard({
  appointments,
  error,
  onRetry,
  date,
  onDateChange,
  isToday,
  nextId,
  startBlocked,
  tab,
  onTabChange,
  filterNote,
  currentEmployeeId,
  currentEmployeeRole,
  startingId,
  onStart,
  onChanged,
  onBook,
}: Props) {
  const navigate = useNavigate();
  const all = appointments ?? [];
  const counts = tabCounts(all);
  const rows = sortForList(filterByTab(all, tab));

  return (
    <section className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-[14px] border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <DateSwitcher date={date} onChange={onDateChange} />
        <PillTabs
          compact
          ariaLabel="Приёмы по статусу"
          value={tab}
          onChange={onTabChange}
          tabs={[
            { value: "all", label: "Все", count: counts.all },
            { value: "next", label: "Осталось", count: counts.next },
            { value: "done", label: "Проведены", count: counts.done },
            { value: "cancelled", label: "Отменены", count: counts.cancelled },
          ]}
        />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div
            className={`grid h-11 items-center gap-4 border-t border-row-line bg-subtle px-5 text-xs font-semibold uppercase tracking-[0.04em] text-ink-3 ${COLUMNS}`}
          >
            <span>Очередь</span>
            <span>Пациент и жалоба</span>
            <span>Статус</span>
            <span className="text-right">Действие</span>
          </div>

          {error ? (
            <ErrorState
              title="Не удалось загрузить приёмы"
              message={error.message}
              onRetry={onRetry}
            />
          ) : appointments === undefined ? (
            <TableSkeleton rows={4} />
          ) : all.length === 0 ? (
            <div className="border-t border-row-line px-5 py-12 text-center">
              <p className="text-sm text-ink-3">На этот день приёмов нет</p>
              {onBook && (
                <button
                  type="button"
                  onClick={onBook}
                  className="mt-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Записать пациента
                </button>
              )}
            </div>
          ) : rows.length === 0 ? (
            <p className="border-t border-row-line px-5 py-12 text-center text-sm text-ink-3">
              Нет приёмов в этой категории
            </p>
          ) : (
            rows.map((appointment) => {
              const status = appointment.status;
              const current = status === "in_progress";
              const done = status === "completed";
              const cancelled = status === "cancelled";
              return (
                <div
                  key={appointment.id}
                  onClick={() => navigate(`/patients/${appointment.patientId}`)}
                  className={`grid cursor-pointer items-center gap-4 border-t border-row-line px-5 transition-colors hover:bg-subtle ${COLUMNS} ${
                    cancelled ? "min-h-[60px] opacity-90" : "min-h-[68px]"
                  } ${current ? "bg-brand-tint" : ""}`}
                >
                  <span
                    className={`text-base ${
                      current ? "font-bold text-brand" : done || cancelled ? "font-semibold text-ink-3" : "font-semibold text-ink"
                    }`}
                  >
                    №{appointment.queueNumber}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-sm ${
                        current
                          ? "font-bold text-ink"
                          : cancelled
                            ? "font-semibold text-ink-3 line-through"
                            : done
                              ? "font-semibold text-ink-2"
                              : "font-semibold text-ink"
                      }`}
                      title={appointment.patient}
                    >
                      {appointment.patient}
                    </span>
                    <span className="block truncate text-[13px] text-ink-3" title={appointment.complaint}>
                      {appointment.complaint}
                    </span>
                  </span>
                  <span>
                    <StatusChip kind={appointment.id === nextId && isToday ? "next" : status} />
                  </span>
                  {/* клики внутри (кнопки, меню, окна отмены/переноса) не открывают карточку */}
                  <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                    <AppointmentRowActions
                      appointment={appointment}
                      currentEmployeeId={currentEmployeeId}
                      currentEmployeeRole={currentEmployeeRole}
                      starting={startingId === appointment.id}
                      startBlocked={startBlocked}
                      hideStart={!isToday}
                      onStart={onStart}
                      onChanged={onChanged}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex min-h-[52px] items-center border-t border-row-line bg-subtle px-5 py-3 text-[13px] text-ink-3">
        Показано {rows.length} из {all.length} приёмов{filterNote ? ` · ${filterNote}` : ""}
      </div>
    </section>
  );
}
