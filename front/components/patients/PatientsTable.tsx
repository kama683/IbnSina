"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import DiseaseTag from "@/components/ui/DiseaseTag";
import type { Patient } from "@/lib/mock-data";
import { ChevronRight } from "lucide-react";

type Props = {
  patients: Patient[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

function formatIin(iin: string) {
  return `${iin.slice(0, 6)} ${iin.slice(6)}`;
}

function formatBirthDate(birthDate: string, ageLabel: string) {
  const age = ageLabel.match(/\d+/)?.[0];
  return age ? `${birthDate}  ${age} л.` : birthDate;
}

export default function PatientsTable({
  patients,
  total,
  page,
  pageSize,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              <th className="px-5 py-2.5">ФИО</th>
              <th className="px-5 py-2.5">ИИН</th>
              <th className="px-5 py-2.5">Дата рождения</th>
              <th className="px-5 py-2.5">Участок</th>
              <th className="px-5 py-2.5">Последний приём</th>
              <th className="px-5 py-2.5">Заболевания</th>
              <th className="px-5 py-2.5">Действия</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr
                key={patient.id}
                className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/80"
              >
                <td className="px-5 py-3 text-sm font-medium text-gray-900">
                  {patient.fullName}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {formatIin(patient.iin)}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {formatBirthDate(patient.birthDate, patient.ageLabel)}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {patient.area}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {patient.lastAppointment ?? "—"}
                </td>
                <td className="px-5 py-3">
                  {patient.diseases.length > 0 ? (
                    <div className="flex max-w-[220px] flex-wrap gap-1.5">
                      {patient.diseases.map((disease) => (
                        <DiseaseTag
                          key={disease.label}
                          label={disease.label}
                          variant={disease.variant}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                  >
                    Открыть
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
        <p className="text-sm text-gray-500">
          Показано {from}–{to} из {total}
        </p>

        <div className="flex items-center gap-1">
          <PaginationButton
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </PaginationButton>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <PaginationButton
              key={pageNum}
              active={pageNum === page}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </PaginationButton>
          ))}

          <PaginationButton
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </PaginationButton>
        </div>
      </div>
    </section>
  );
}

function PaginationButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        active
          ? "bg-[#1a5c3a] text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
