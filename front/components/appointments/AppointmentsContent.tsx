"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppointmentsToolbar from "@/components/appointments/AppointmentsToolbar";
import AppointmentsTable from "@/components/appointments/AppointmentsTable";
import AppointmentsCalendar from "@/components/appointments/AppointmentsCalendar";
import { getAppointmentsInRange } from "@/lib/api/appointments";
import type { Appointment, Patient } from "@/lib/types";
import type { CalendarWeek } from "@/lib/calendar-utils";

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type Props = {
  initialListAppointments: Appointment[];
  calendarAppointments: Appointment[];
  calendarWeek: CalendarWeek;
  doctorShortName: string;
  doctorOffice: string;
  doctorFullName: string;
  weekOffset: number;
  patients: Patient[];
};

export default function AppointmentsContent({
  initialListAppointments,
  calendarAppointments,
  calendarWeek,
  doctorShortName,
  doctorOffice,
  doctorFullName,
  weekOffset,
  patients,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [listDate, setListDate] = useState(toIsoDate(new Date()));
  const [listAppointments, setListAppointments] = useState(initialListAppointments);

  useEffect(() => {
    getAppointmentsInRange(listDate, listDate)
      .then(setListAppointments)
      .catch(() => setListAppointments([]));
  }, [listDate]);

  const filteredList = useMemo(() => listAppointments, [listAppointments]);

  function navigateWeek(delta: number) {
    const nextOffset = weekOffset + delta;
    if (nextOffset === 0) {
      router.push("/appointments");
      return;
    }
    router.push(`/appointments?week=${nextOffset}`);
  }

  return (
    <>
      <AppointmentsToolbar
        view={view}
        onViewChange={setView}
        doctorName={doctorFullName}
        listDate={listDate}
        onListDateChange={setListDate}
        patients={patients}
        onAppointmentCreated={() => router.refresh()}
      />
      {view === "list" ? (
        <AppointmentsTable appointments={filteredList} />
      ) : (
        <AppointmentsCalendar
          appointments={calendarAppointments}
          week={calendarWeek}
          doctorShortName={doctorShortName}
          doctorOffice={doctorOffice}
          onPrevWeek={() => navigateWeek(-1)}
          onNextWeek={() => navigateWeek(1)}
        />
      )}
    </>
  );
}
