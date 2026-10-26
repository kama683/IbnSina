import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import AppointmentBookingModal from "@/components/appointments/AppointmentBookingModal";
import AppointmentsCalendar from "@/components/appointments/AppointmentsCalendar";
import AppointmentsFilters from "@/components/appointments/AppointmentsFilters";
import AppointmentsTable from "@/components/appointments/AppointmentsTable";
import PageHeader from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/buttonStyles";
import ErrorState from "@/components/ui/ErrorState";
import SegmentedControl from "@/components/ui/SegmentedControl";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { TABLE_CARD } from "@/components/ui/tableStyles";
import { getAppointmentsInRange } from "@/lib/api/appointments";
import type { EmployeeRole } from "@/lib/api/employees";
import { buildCalendarWeek, getCurrentWeekIsoRange, getDateForWeekOffset } from "@/lib/calendar-utils";
import { formatDayMonth, todayIso } from "@/lib/dates";
import { filterByTab, tabCounts, type AppointmentTab } from "@/lib/queue";
import { BOOK_APPOINTMENT_ROLES } from "@/lib/roles";
import { useRefresh } from "@/lib/use-refresh";

type Props = {
  currentEmployeeId: number;
  currentEmployeeRole: EmployeeRole;
};

const EMPTY_TEXT: Record<AppointmentTab, string> = {
  all: "Нет приёмов на этот день",
  next: "Нет предстоящих приёмов на этот день",
  done: "Нет проведённых приёмов",
  cancelled: "Нет отменённых приёмов",
};

/** «Приёмы» регистратуры: приёмы всех врачей за день (колонка «Врач») и
 * календарь недели. У врача, главврача и медсестры приёмы живут на дашборде
 * (dashboard/doctor/DoctorDashboard); вместо времени везде номер в очереди. */
export default function AppointmentsContent({ currentEmployeeId, currentEmployeeRole }: Props) {
  const refresh = useRefresh();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [listDate, setListDate] = useState(todayIso());
  const [tab, setTab] = useState<AppointmentTab>("next");
  const [bookingOpen, setBookingOpen] = useState(false);

  // Неделя календаря — в URL (?week=N): ссылкой можно поделиться.
  const weekOffset = Number.parseInt(searchParams.get("week") ?? "0", 10) || 0;
  const { from, to, calendarWeek } = useMemo(() => {
    const weekDate = getDateForWeekOffset(weekOffset);
    return { ...getCurrentWeekIsoRange(weekDate), calendarWeek: buildCalendarWeek(weekDate) };
  }, [weekOffset]);

  const canBook = BOOK_APPOINTMENT_ROLES.includes(currentEmployeeRole);

  // Список и календарь грузятся отдельно от страницы: смена даты/недели не
  // сносит панель фильтров — прошлые данные остаются до прихода новых.
  const list = useQuery({
    queryKey: ["appointments", "range", listDate, listDate],
    queryFn: () => getAppointmentsInRange(listDate, listDate),
    placeholderData: keepPreviousData,
  });
  const calendar = useQuery({
    queryKey: ["appointments", "range", from, to],
    queryFn: () => getAppointmentsInRange(from, to),
    placeholderData: keepPreviousData,
    enabled: view === "calendar",
  });

  const all = list.data ?? [];
  const counts = tabCounts(all);
  const rows = filterByTab(all, tab);

  function navigateWeek(delta: number) {
    const nextOffset = weekOffset + delta;
    setSearchParams(nextOffset === 0 ? {} : { week: String(nextOffset) });
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <PageHeader
        title="Приёмы"
        subtitle={`Приёмы на ${formatDayMonth(listDate)}`}
        actions={
          <>
            <SegmentedControl
              ariaLabel="Режим просмотра"
              value={view}
              onChange={setView}
              options={[
                { value: "list", label: "Сегодня" },
                { value: "calendar", label: "Календарь" },
              ]}
            />
            {canBook && (
              <button type="button" onClick={() => setBookingOpen(true)} className={buttonClass("primary", "md")}>
                <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
                Записать пациента
              </button>
            )}
          </>
        }
      />

      {view === "list" ? (
        <>
          <AppointmentsFilters
            date={listDate}
            onDateChange={setListDate}
            tab={tab}
            onTabChange={setTab}
            counts={counts}
          />

          {list.isError ? (
            <ErrorState
              title="Не удалось загрузить приёмы"
              message={list.error.message}
              onRetry={() => void list.refetch()}
            />
          ) : list.data ? (
            <AppointmentsTable
              // при смене даты/вкладки список снова сворачивается до первых строк
              key={`${listDate}-${tab}`}
              appointments={rows}
              showDoctor
              currentEmployeeId={currentEmployeeId}
              currentEmployeeRole={currentEmployeeRole}
              startingId={null}
              onStart={() => undefined}
              onChanged={() => void refresh()}
              emptyText={EMPTY_TEXT[tab]}
            />
          ) : (
            <section className={TABLE_CARD}>
              <TableSkeleton />
            </section>
          )}
        </>
      ) : calendar.isError ? (
        <ErrorState
          title="Не удалось загрузить календарь"
          message={calendar.error.message}
          onRetry={() => void calendar.refetch()}
        />
      ) : calendar.data ? (
        <AppointmentsCalendar
          appointments={calendar.data}
          week={calendarWeek}
          doctorShortName=""
          doctorOffice=""
          onPrevWeek={() => navigateWeek(-1)}
          onNextWeek={() => navigateWeek(1)}
        />
      ) : (
        <section className={TABLE_CARD}>
          <TableSkeleton />
        </section>
      )}

      {canBook && (
        <AppointmentBookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          defaultDate={listDate}
          // окно остаётся открытым («Записать ещё одного»), список обновляем сразу
          onBooked={() => void refresh()}
        />
      )}
    </div>
  );
}
