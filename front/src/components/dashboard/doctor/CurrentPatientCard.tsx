import { Link } from "react-router-dom";
import { buttonClass } from "@/components/ui/buttonStyles";
import type { Appointment } from "@/lib/types";

/** «Сейчас на приёме» — показывается, пока сегодня есть приём «На приёме». */
export default function CurrentPatientCard({ appointment }: { appointment: Appointment }) {
  return (
    <section
      aria-label="Сейчас на приёме"
      className="flex flex-col gap-3 rounded-[14px] border-2 border-brand bg-white px-[22px] py-5"
    >
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-brand">
        Сейчас на приёме · №{appointment.queueNumber}
      </p>
      <p className="text-[22px] font-bold leading-tight text-ink">{appointment.patient}</p>
      <p className="text-sm text-ink-2">{appointment.complaint}</p>
      <Link
        to={`/patients/${appointment.patientId}/examination`}
        className={buttonClass("primary", "md", "h-11 w-full text-[15px] font-bold")}
      >
        Открыть осмотр
      </Link>
    </section>
  );
}
