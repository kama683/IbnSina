import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import AppointmentsToolbar from "@/components/appointments/AppointmentsToolbar";
import AppointmentsTable from "@/components/appointments/AppointmentsTable";
import AppointmentsCalendar from "@/components/appointments/AppointmentsCalendar";
import ErrorState from "@/components/ui/ErrorState";
import PageLoader from "@/components/ui/PageLoader";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getAppointmentsInRange } from "@/lib/api/appointments";
import { getDoctorProfile } from "@/lib/api/doctors";
import type { EmployeeRole } from "@/lib/api/employees";
import { getPatients } from "@/lib/api/patients";
import {
  buildCalendarWeek,
  getCurrentWeekIsoRange,
  getDateForWeekOffset,
} from "@/lib/calendar-utils";
import { HAS_DOCTOR_PROFILE_ROLES } from "@/lib/roles";
import { useRefresh } from "@/lib/use-refresh";

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type Props = {
  currentEmployeeId: number;
  currentEmployeeRole: EmployeeRole;
  doctorShortName: string;
};

export default function AppointmentsContent({
  currentEmployeeId,
  currentEmployeeRole,
  doctorShortName,
}: Props) {
  const refresh = useRefresh();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [listDate, setListDate] = useState(toIsoDate(new Date()));

  // Неделя календаря — в URL (?week=N), как и раньше: ссылкой можно поделиться.
  const weekOffset = Number.parseInt(searchParams.get("week") ?? "0", 10) || 0;
  const { from, to, calendarWeek } = useMemo(() => {
    const weekDate = getDateForWeekOffset(weekOffset);
    return {
      ...getCurrentWeekIsoRange(weekDate),
      calendarWeek: buildCalendarWeek(weekDate),
    };
  }, [weekOffset]);

  // Кабинет имеет смысл только для doctor/head_doctor (у остальных ролей нет
  // doctor_profile) — для reception/nurse остаётся пустая строка.
  const hasDoctorProfile = HAS_DOCTOR_PROFILE_ROLES.includes(currentEmployeeRole);
  const office = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: getDoctorProfile,
    enabled: hasDoctorProfile,
    select: (profile) => profile.office,
  });
  const patients = useQuery({
    queryKey: ["patients", "list", { page: 1, limit: 100 }],
    queryFn: () => getPatients({ page: 1, limit: 100 }),
  });

  // Список и календарь грузятся отдельно от страницы: смена даты/недели не
  // должна сносить тулбар — прошлые данные остаются на экране до прихода новых.
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

  function navigateWeek(delta: number) {
    const nextOffset = weekOffset + delta;
    setSearchParams(nextOffset === 0 ? {} : { week: String(nextOffset) });
  }

  return (
    <QueryBoundary queries={[office, patients]}>
      <AppointmentsToolbar
        view={view}
        onViewChange={setView}
        listDate={listDate}
        onListDateChange={setListDate}
        patients={patients.data?.items ?? []}
        onAppointmentCreated={() => void refresh()}
      />
      {view === "list" ? (
        list.isError ? (
          <ErrorState
            title="Не удалось загрузить приёмы"
            message={list.error.message}
            onRetry={() => void list.refetch()}
          />
        ) : list.data ? (
          <AppointmentsTable
            appointments={list.data}
            currentEmployeeId={currentEmployeeId}
            currentEmployeeRole={currentEmployeeRole}
          />
        ) : (
          <PageLoader />
        )
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
          doctorShortName={doctorShortName}
          doctorOffice={office.data ?? ""}
          onPrevWeek={() => navigateWeek(-1)}
          onNextWeek={() => navigateWeek(1)}
        />
      ) : (
        <PageLoader />
      )}
    </QueryBoundary>
  );
}
