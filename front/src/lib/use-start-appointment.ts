import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateAppointmentStatus } from "@/lib/api/appointments";
import type { Appointment } from "@/lib/types";

/** «Начать приём»: статус → «на приёме» и сразу страница осмотра. */
export function useStartAppointment() {
  const navigate = useNavigate();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(appointment: Appointment) {
    setStartingId(appointment.id);
    setError(null);
    try {
      await updateAppointmentStatus(appointment.id, "in_progress");
      navigate(`/patients/${appointment.patientId}/examination`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось начать приём");
    } finally {
      setStartingId(null);
    }
  }

  return { start, startingId, error, clearError: () => setError(null) };
}
