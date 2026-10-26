/** Причина отмены приёма — справочник вместо свободного текста
 * (= CancellationReasonCode в back/app/models/appointment.py). Текст хранится
 * только для «Другое». */
export type CancellationReasonCode =
  | "patient_cancelled"
  | "patient_no_contact"
  | "doctor_unavailable"
  | "rescheduled"
  | "other";

export const CANCELLATION_REASONS: { code: CancellationReasonCode; label: string }[] = [
  { code: "patient_cancelled", label: "Пациент отменил" },
  { code: "patient_no_contact", label: "Не дозвонились" },
  { code: "doctor_unavailable", label: "Врач не принимает" },
  { code: "rescheduled", label: "Перенос" },
  { code: "other", label: "Другое" },
];

/** Подпись причины для списков: код → название; для «Другое» — введённый текст. */
export function cancellationLabel(
  code: CancellationReasonCode | null | undefined,
  text: string | null | undefined,
): string {
  if (!code) return text ?? "";
  if (code === "other") return text ? `Другое: ${text}` : "Другое";
  return CANCELLATION_REASONS.find((reason) => reason.code === code)?.label ?? code;
}
