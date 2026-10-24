import { Link } from "react-router-dom";
import { shortOffice } from "@/components/dashboard/reception/format";
import type { ReceptionSummary } from "@/lib/api/reports";
import { pluralizeWaiting } from "@/components/dashboard/reception/waiting";

const MAX_ROWS = 3;

type Props = {
  doctors: ReceptionSummary["doctors"];
  state: "loading" | "error" | "ready";
  onRetry: () => void;
};

/** «Врачи сейчас»: врач, кабинет, занят или свободен, сколько ждёт. Клик по
 * строке — в живую очередь. Показываем MAX_ROWS строк, чтобы экран не
 * превышал высоту ноутбука; остальные — ссылкой «ещё N». */
export default function DoctorsNow({ doctors, state, onRetry }: Props) {
  const shown = doctors.slice(0, MAX_ROWS);
  const hidden = doctors.length - shown.length;

  return (
    <section className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-gray-900">Врачи сейчас</h2>

      {state === "loading" ? (
        <p className="mt-3 text-[13px] text-gray-400">Загрузка…</p>
      ) : state === "error" ? (
        <p className="mt-3 text-[13px] text-gray-500">
          Не удалось загрузить.{" "}
          <button type="button" onClick={onRetry} className="text-[#1a5c3a] hover:underline">
            Повторить
          </button>
        </p>
      ) : doctors.length === 0 ? (
        <p className="mt-3 text-[13px] text-gray-500">Врачи сегодня не принимают</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-50">
          {shown.map((doctor) => (
            <li key={doctor.employeeId}>
              <Link
                to="/queue"
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-gray-50"
              >
                <span className="truncate text-gray-700">
                  {doctor.shortName}
                  {doctor.office && <span className="text-gray-400"> · {shortOffice(doctor.office)}</span>}
                </span>
                {doctor.inProgress ? (
                  <span className="shrink-0 text-gray-900">
                    на приёме · {pluralizeWaiting(doctor.waiting)}
                  </span>
                ) : (
                  <span className="shrink-0 text-emerald-700">
                    свободен{doctor.waiting > 0 && ` · ${pluralizeWaiting(doctor.waiting)}`}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {hidden > 0 && (
            <li className="pt-1.5 text-xs text-gray-400">
              <Link to="/queue" className="hover:text-gray-600">
                и ещё {hidden} в очереди →
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
