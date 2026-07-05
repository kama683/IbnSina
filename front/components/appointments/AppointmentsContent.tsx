"use client";

import { useState } from "react";
import AppointmentsToolbar from "@/components/appointments/AppointmentsToolbar";
import AppointmentsTable from "@/components/appointments/AppointmentsTable";
import AppointmentsCalendar from "@/components/appointments/AppointmentsCalendar";
import type { Appointment } from "@/lib/mock-data";
import type { CalendarWeek } from "@/lib/calendar-utils";

type Props = {
  listAppointments: Appointment[];
  calendarAppointments: Appointment[];
  calendarWeek: CalendarWeek;
  doctorShortName: string;
};

export default function AppointmentsContent({
  listAppointments,
  calendarAppointments,
  calendarWeek,
  doctorShortName,
}: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <>
      <AppointmentsToolbar view={view} onViewChange={setView} />
      {view === "list" ? (
        <AppointmentsTable appointments={listAppointments} />
      ) : (
        <AppointmentsCalendar
          appointments={calendarAppointments}
          week={calendarWeek}
          doctorShortName={doctorShortName}
        />
      )}
    </>
  );
}
