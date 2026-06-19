"use client";

import { Plus, Search } from "lucide-react";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  area: string;
  onAreaChange: (value: string) => void;
  areas: string[];
};

export default function PatientsToolbar({
  search,
  onSearchChange,
  area,
  onAreaChange,
  areas,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по ФИО или ИИН"
            className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
          />
        </div>

        <select
          value={area}
          onChange={(e) => onAreaChange(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
        >
          <option value="all">Все участки</option>
          {areas.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="flex items-center gap-2 rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
      >
        <Plus className="h-4 w-4" />
        Добавить пациента
      </button>
    </div>
  );
}
