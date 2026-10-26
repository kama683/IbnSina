import { START_BLOCKED_HINT } from "@/components/appointments/AppointmentRowActions";
import type { Appointment } from "@/lib/types";

type Props = {
  appointment: Appointment;
  /** Кнопка «Начать приём» — только тем, кто принимает. */
  canStart: boolean;
  /** Кто-то уже «На приёме»: кнопка неактивна. */
  blocked: boolean;
  starting: boolean;
  onStart: (appointment: Appointment) => void;
};

/** Зелёная карточка «Следующий». */
export default function NextPatientPanel({ appointment, canStart, blocked, starting, onStart }: Props) {
  return (
    <section aria-label="Следующий пациент" className="flex flex-col gap-3 rounded-[14px] bg-brand px-[22px] py-5 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-brand-line">
        Следующий · №{appointment.queueNumber}
      </p>
      <p className="text-[22px] font-bold leading-tight">{appointment.patient}</p>
      <p className="text-sm text-brand-text-on-dark">{appointment.complaint}</p>

      {canStart && (
        <button
          type="button"
          disabled={blocked || starting}
          title={blocked ? START_BLOCKED_HINT : undefined}
          onClick={() => onStart(appointment)}
          className="h-11 w-full rounded-[10px] bg-white text-[15px] font-bold text-brand transition-colors hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Начать приём
        </button>
      )}
    </section>
  );
}
