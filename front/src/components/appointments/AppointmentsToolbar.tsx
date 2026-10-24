import { useState } from "react";
import { Plus } from "lucide-react";
import AppointmentBookingModal from "@/components/appointments/AppointmentBookingModal";
import type { Patient } from "@/lib/types";

export type ViewMode = "list" | "calendar";

type Props = {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  listDate: string;
  onListDateChange: (value: string) => void;
  patients: Patient[];
  onAppointmentCreated: () => void;
  /** Кнопка записи только тем, кому бэкенд разрешает записывать (BOOK_APPOINTMENT_ROLES):
   * у медсестры POST /appointments и available-slots отвечают 403. */
  canBook: boolean;
};

export default function AppointmentsToolbar({
  view,
  onViewChange,
  listDate,
  onListDateChange,
  patients,
  onAppointmentCreated,
  canBook,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {view === "list" && (
            <input
              type="date"
              value={listDate}
              onChange={(e) => onListDateChange(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
            />
          )}
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

          {canBook && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
            >
              <Plus className="h-4 w-4" />
              Записать пациента
            </button>
          )}
        </div>
      </div>

      {canBook && (
        <AppointmentBookingModal
          open={open}
          onClose={() => setOpen(false)}
          patients={patients}
          defaultDate={listDate}
          onBooked={() => {
            setOpen(false);
            onAppointmentCreated();
          }}
        />
      )}
    </>
  );
}
