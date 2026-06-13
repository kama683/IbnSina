import { Search, Bell } from "lucide-react";
import { doctor } from "@/lib/mock-data";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-gray-200/80 bg-white px-6">
      <div className="grid w-full grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-4">
        <div />

        {/* Поиск — pill-форма как в эталоне */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Поиск пациентов, приёмов..."
            className="w-full rounded-full border border-gray-200 bg-gray-50/80 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Уведомления"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f5ee] text-xs font-semibold text-[#1a5c3a]">
              {doctor.initials}
            </div>
            <div className="hidden text-left lg:block">
              <p className="text-sm font-medium leading-tight text-gray-900">
                {doctor.shortName}
              </p>
              <p className="text-[11px] leading-tight text-gray-500">
                {doctor.role}, {doctor.area}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
