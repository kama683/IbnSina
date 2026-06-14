"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export type ViewMode = "list" | "calendar";

type Props = {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
};

export default function AppointmentsToolbar({ view, onViewChange }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10">
          <option>Все врачи</option>
        </select>
        <input
          type="text"
          placeholder="Дата (дд.мм.гггг)"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-[#e8f5ee] text-[#1a5c3a]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Список
          </button>
          <button
            type="button"
            onClick={() => onViewChange("calendar")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "calendar"
                ? "bg-[#e8f5ee] text-[#1a5c3a]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Календарь
          </button>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
        >
          <Plus className="h-4 w-4" />
          Записать пациента
        </button>
      </div>
    </div>
  );
}
