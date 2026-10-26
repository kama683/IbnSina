import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { TABLE_CARD, TABLE_FOOT, TABLE_HEAD, TABLE_ROW } from "@/components/ui/tableStyles";
import { todayIso } from "@/lib/dates";
import type { Patient } from "@/lib/types";

type Props = {
  /** undefined — идёт первая загрузка. */
  patients: Patient[] | undefined;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

const COLUMNS = "grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.7fr)_20px]";
const MAX_TAGS = 2;

/** «700413383669» → «700413 383669». */
function formatIin(iin: string) {
  return `${iin.slice(0, 6)} ${iin.slice(6)}`;
}

type VisitKind = "upcoming" | "today" | "past";

/** Дата приёма «ДД.ММ.ГГГГ» → «Запись» (впереди), «Сегодня» или «Был». */
function visitKind(lastAppointment: string): VisitKind {
  const iso = lastAppointment.split(".").reverse().join("-");
  const today = todayIso();
  if (iso === today) return "today";
  return iso > today ? "upcoming" : "past";
}

const VISIT_LABEL: Record<VisitKind, string> = { upcoming: "Запись", today: "Сегодня", past: "Был" };

/** Номера страниц с многоточием: 1 2 3 … 102. */
function pageItems(current: number, last: number): (number | "gap-left" | "gap-right")[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, "gap-right", last];
  if (current >= last - 2) return [1, "gap-left", last - 2, last - 1, last];
  return [1, "gap-left", current - 1, current, current + 1, "gap-right", last];
}

export default function PatientsTable({ patients, total, page, pageSize, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <section className={TABLE_CARD}>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className={`${TABLE_HEAD} ${COLUMNS}`}>
            <span>Пациент</span>
            <span>Возраст</span>
            <span>Приём</span>
            <span>Заболевания</span>
            <span />
          </div>

          {patients === undefined ? (
            <TableSkeleton rows={pageSize} />
          ) : patients.length === 0 ? (
            <p className="border-t border-row-line px-6 py-12 text-center text-sm text-ink-3">
              Пациенты не найдены
            </p>
          ) : (
            patients.map((patient) => {
              const kind = patient.lastAppointment ? visitKind(patient.lastAppointment) : null;
              const today = kind === "today";
              const hidden = patient.diseases.length - MAX_TAGS;
              return (
                <Link
                  key={patient.id}
                  to={`/patients/${patient.id}`}
                  className={`${TABLE_ROW} ${COLUMNS} focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand ${
                    today ? "bg-brand-tint" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink" title={patient.fullName}>
                      {patient.fullName}
                    </span>
                    <span className="block text-[13px] text-ink-3">ИИН {formatIin(patient.iin)}</span>
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">{patient.ageLabel}</span>
                    <span className="block text-[13px] text-ink-3">{patient.birthDate}</span>
                  </span>
                  <span>
                    {kind && patient.lastAppointment ? (
                      <>
                        <span className={`block text-xs ${today ? "font-semibold text-brand" : "text-ink-3"}`}>
                          {VISIT_LABEL[kind]}
                        </span>
                        <span className={`block text-sm ${today ? "font-semibold text-brand" : "font-medium text-ink"}`}>
                          {patient.lastAppointment}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-ink-3">—</span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {patient.diseases.length > 0 ? (
                      <>
                        {patient.diseases.slice(0, MAX_TAGS).map((disease) => (
                          <span
                            key={disease.label}
                            className="max-w-full truncate rounded-full bg-chip-gray px-2.5 py-[3px] text-xs font-semibold text-ink-2"
                          >
                            {disease.label}
                          </span>
                        ))}
                        {hidden > 0 && <span className="text-xs font-semibold text-ink-3">+{hidden}</span>}
                      </>
                    ) : (
                      <span className="text-sm text-ink-3">—</span>
                    )}
                  </span>
                  <ChevronRight
                    className={`h-5 w-5 ${today ? "text-brand" : "text-chevron"}`}
                    strokeWidth={1.8}
                    aria-hidden
                  />
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className={TABLE_FOOT}>
        <span>{total === 0 ? "Нет пациентов" : `Показано ${from}–${to} из ${total}`}</span>
        {totalPages > 1 && (
          <nav aria-label="Страницы" className="flex items-center gap-1.5">
            <PageButton label="Предыдущая страница" bordered disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            </PageButton>
            {pageItems(page, totalPages).map((item) =>
              typeof item === "number" ? (
                <PageButton
                  key={item}
                  label={`Страница ${item}`}
                  active={item === page}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </PageButton>
              ) : (
                <span key={item} aria-hidden className="px-1 text-ink-3">
                  …
                </span>
              ),
            )}
            <PageButton label="Следующая страница" bordered disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            </PageButton>
          </nav>
        )}
      </div>
    </section>
  );
}

function PageButton({
  children,
  label,
  active,
  bordered,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  /** Стрелки — в рамке, номера — без. */
  bordered?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-[34px] min-w-[34px] items-center justify-center rounded-[9px] px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-40 ${
        active
          ? "bg-brand text-white"
          : `${bordered ? "border border-field-line bg-white" : ""} text-ink-2 hover:text-ink`
      }`}
    >
      {children}
    </button>
  );
}
