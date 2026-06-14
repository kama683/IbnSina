"use client";

import { useState } from "react";
import AppointmentsToolbar from "@/components/appointments/AppointmentsToolbar";
import AppointmentsTable from "@/components/appointments/AppointmentsTable";
import AppointmentsCalendar from "@/components/appointments/AppointmentsCalendar";
import type { Appointment } from "@/lib/mock-data";

type Props = {
  listAppointments: Appointment[];
  calendarAppointments: Appointment[];
};

export default function AppointmentsContent({
  listAppointments,
  calendarAppointments,
}: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <>
      <AppointmentsToolbar view={view} onViewChange={setView} />
      {view === "list" ? (
        <AppointmentsTable appointments={listAppointments} />
      ) : (
        <AppointmentsCalendar appointments={calendarAppointments} />
      )}
    </>
  );
}
