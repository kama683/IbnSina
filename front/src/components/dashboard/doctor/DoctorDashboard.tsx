import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import AppointmentBookingModal from "@/components/appointments/AppointmentBookingModal";
import AppointmentsCalendar from "@/components/appointments/AppointmentsCalendar";
import CurrentPatientCard from "@/components/dashboard/doctor/CurrentPatientCard";
import DayAppointmentsCard from "@/components/dashboard/doctor/DayAppointmentsCard";
import NextPatientPanel from "@/components/dashboard/doctor/NextPatientPanel";
import WeekStats from "@/components/dashboard/doctor/WeekStats";
import PageHeader from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/buttonStyles";
import ErrorState from "@/components/ui/ErrorState";
import SegmentedControl from "@/components/ui/SegmentedControl";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { getAppointmentsInRange, getWeekStats } from "@/lib/api/appointments";
import { getDoctorProfile } from "@/lib/api/doctors";
import { useEmployee } from "@/lib/auth/employee-context";
import {
  buildCalendarWeek,
  getCurrentWeekIsoRange,
  getDateForWeekOffset,
} from "@/lib/calendar-utils";
import { formatDayMonth, todayIso } from "@/lib/dates";
import { nextPatient, type AppointmentTab } from "@/lib/queue";
import { BOOK_APPOINTMENT_ROLES, CHECK_IN_ROLES, HAS_DOCTOR_PROFILE_ROLES, VIEW_STATS_ROLES } from "@/lib/roles";
import { useRefresh } from "@/lib/use-refresh";
import { useStartAppointment } from "@/lib/use-start-appointment";

/** Приветствие по времени суток: 05–12 утро, 12–18 день, 18–23 вечер, 23–05 ночь. */
export function greeting(hour: number): string {
  if (hour >= 23 || hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

/** Имя из ФИО «Фамилия Имя Отчество». */
function firstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[1] ?? parts[0] ?? "";
}

function weekdayLabel(): string {
  const name = new Date().toLocaleDateString("ru-RU", { weekday: "long" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Рабочее место врача (doctor, head_doctor, nurse) — бывшие «Дашборд» и
 * «Приёмы» на одной странице: слева очередь дня, справа «Сейчас на приёме»,
 * «Следующий» и «Неделя». Регистратура — отдельный экран
 * (dashboard/reception/ReceptionHome). */
export default function DoctorDashboard() {
  const employee = useEmployee();
  const refresh = useRefresh();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [tab, setTab] = useState<AppointmentTab>("all");
  const [bookingOpen, setBookingOpen] = useState(false);
  const { start, startingId, error: startError } = useStartAppointment();

  // Дата списка и неделя календаря — в URL: ссылкой можно поделиться, а
  // перенаправление со старого /appointments не теряет параметры.
  const rawDate = searchParams.get("date");
  const listDate = rawDate && ISO_DATE.test(rawDate) ? rawDate : todayIso();
  const weekOffset = Number.parseInt(searchParams.get("week") ?? "0", 10) || 0;

  function setListDate(date: string) {
    const next = new URLSearchParams(searchParams);
    if (date === todayIso()) next.delete("date");
    else next.set("date", date);
    setSearchParams(next, { replace: true });
  }

  function navigateWeek(delta: number) {
    const next = new URLSearchParams(searchParams);
    const offset = weekOffset + delta;
    if (offset === 0) next.delete("week");
    else next.set("week", String(offset));
    setSearchParams(next);
  }

  const { from, to, calendarWeek } = useMemo(() => {
    const weekDate = getDateForWeekOffset(weekOffset);
    return { ...getCurrentWeekIsoRange(weekDate), calendarWeek: buildCalendarWeek(weekDate) };
  }, [weekOffset]);

  const canViewStats = VIEW_STATS_ROLES.includes(employee.role);
  const hasDoctorProfile = HAS_DOCTOR_PROFILE_ROLES.includes(employee.role);
  const canBook = BOOK_APPOINTMENT_ROLES.includes(employee.role);
  const canStart = CHECK_IN_ROLES.includes(employee.role);

  // Запросы по роли: то, что бэкенд всё равно не отдаст (403), не запрашиваем.
  const office = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: getDoctorProfile,
    enabled: hasDoctorProfile,
    select: (profile) => profile.office,
  });
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
  const weekStats = useQuery({
    queryKey: ["appointments", "stats", "week"],
    queryFn: getWeekStats,
    enabled: canViewStats,
  });

  // Врачу бэкенд отдаёт только его приёмы; главврачу — все, поэтому «мои» —
  // по своему employeeId. Медсестра видит очередь клиники целиком.
  const mine = useMemo(
    () =>
      list.data?.filter(
        (appointment) => !hasDoctorProfile || appointment.employeeId === String(employee.id),
      ),
    [list.data, hasDoctorProfile, employee.id],
  );

  const isToday = listDate === todayIso();
  const current = isToday ? mine?.find((appointment) => appointment.status === "in_progress") : undefined;
  const next = isToday && mine ? nextPatient(mine) : undefined;

  const subtitle = [`${weekdayLabel()}, ${formatDayMonth(todayIso())}`, office.data].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <PageHeader
        title={`${greeting(new Date().getHours())}, ${firstName(employee.fullName)}`}
        subtitle={subtitle}
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

      {startError && (
        <p role="alert" className="rounded-[10px] bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {startError}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        {view === "list" ? (
          <DayAppointmentsCard
            appointments={mine}
            error={list.isError ? list.error : null}
            onRetry={() => void list.refetch()}
            date={listDate}
            onDateChange={setListDate}
            isToday={isToday}
            nextId={next?.id}
            startBlocked={current !== undefined}
            tab={tab}
            onTabChange={setTab}
            filterNote={hasDoctorProfile ? "фильтр «Только мои»" : undefined}
            currentEmployeeId={employee.id}
            currentEmployeeRole={employee.role}
            startingId={startingId}
            onStart={(appointment) => void start(appointment)}
            onChanged={() => void refresh()}
            onBook={canBook ? () => setBookingOpen(true) : undefined}
          />
        ) : calendar.isError ? (
          <div className="min-w-0 flex-[999_1_560px]">
            <ErrorState
              title="Не удалось загрузить календарь"
              message={calendar.error.message}
              onRetry={() => void calendar.refetch()}
            />
          </div>
        ) : calendar.data ? (
          <div className="min-w-0 flex-[999_1_560px]">
            <AppointmentsCalendar
              appointments={calendar.data}
              week={calendarWeek}
              doctorShortName={employee.shortName}
              doctorOffice={office.data ?? ""}
              onPrevWeek={() => navigateWeek(-1)}
              onNextWeek={() => navigateWeek(1)}
            />
          </div>
        ) : (
          <section className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-[14px] border border-line bg-white">
            <TableSkeleton />
          </section>
        )}

        <div className="flex w-full min-w-0 flex-[1_1_320px] flex-col gap-5 lg:max-w-[400px]">
          {view === "list" && current && <CurrentPatientCard appointment={current} />}
          {view === "list" && next && (
            <NextPatientPanel
              appointment={next}
              canStart={canStart}
              blocked={current !== undefined}
              starting={startingId === next.id}
              onStart={(appointment) => void start(appointment)}
            />
          )}
          {canViewStats && weekStats.isError ? (
            <ErrorState
              title="Не удалось загрузить статистику"
              message={weekStats.error.message}
              onRetry={() => void weekStats.refetch()}
            />
          ) : canViewStats && weekStats.data ? (
            <WeekStats stats={weekStats.data} />
          ) : canViewStats ? (
            <div role="status" aria-label="Загрузка" className="h-[180px] animate-pulse rounded-[14px] border border-line bg-white" />
          ) : null}
        </div>
      </div>

      {canBook && (
        <AppointmentBookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          defaultDate={listDate}
          onBooked={() => void refresh()}
        />
      )}
    </div>
  );
}
