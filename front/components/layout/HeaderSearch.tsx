"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { globalSearch } from "@/lib/api/search";

export default function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Awaited<ReturnType<typeof globalSearch>> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await globalSearch(trimmed);
        setResults(data);
        setOpen(true);
      } catch {
        setResults({ patients: [], appointments: [] });
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const hasResults =
    results && (results.patients.length > 0 || results.appointments.length > 0);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="Поиск пациентов, приёмов..."
        className="w-full rounded-full border border-gray-200 bg-gray-50/80 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-500">Поиск...</p>
          ) : hasResults ? (
            <div className="max-h-80 overflow-y-auto py-1">
              {results!.patients.length > 0 && (
                <div className="px-3 py-2">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Пациенты
                  </p>
                  <ul>
                    {results!.patients.map((patient) => (
                      <li key={patient.id}>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="block rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                        >
                          <span className="font-medium text-gray-900">
                            {patient.fullName}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-500">
                            ИИН {patient.iin}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results!.appointments.length > 0 && (
                <div className="border-t border-gray-100 px-3 py-2">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Приёмы
                  </p>
                  <ul>
                    {results!.appointments.map((appointment) => (
                      <li key={appointment.id}>
                        <Link
                          href={`/patients/${appointment.patientId}`}
                          className="block rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                        >
                          <span className="font-medium text-gray-900">
                            {appointment.patient} · {appointment.date}{" "}
                            {appointment.time}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {appointment.complaint}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="px-4 py-3 text-sm text-gray-500">Ничего не найдено</p>
          )}
        </div>
      )}
    </div>
  );
}
