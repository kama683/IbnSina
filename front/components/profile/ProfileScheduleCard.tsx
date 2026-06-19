"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import type { WorkDaySchedule } from "@/lib/mock-data";
import { doctorProfile } from "@/lib/mock-data";

export default function ProfileScheduleCard() {
  const [schedule, setSchedule] = useState<WorkDaySchedule[]>(
    doctorProfile.schedule,
  );

  function toggleDay(id: string) {
    setSchedule((days) =>
      days.map((day) =>
        day.id === id ? { ...day, enabled: !day.enabled } : day,
      ),
    );
  }

  function updateTime(
    id: string,
    field: "start" | "end",
    value: string,
  ) {
    setSchedule((days) =>
      days.map((day) => (day.id === id ? { ...day, [field]: value } : day)),
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
        <Clock className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">График работы</h2>
      </div>

      <ul className="divide-y divide-gray-50">
        {schedule.map((day) => (
          <li
            key={day.id}
            className="flex flex-wrap items-center gap-3 px-5 py-3"
          >
            <span className="w-28 shrink-0 text-sm text-gray-700">
              {day.label}
            </span>

            <ToggleSwitch
              enabled={day.enabled}
              onChange={() => toggleDay(day.id)}
            />

            {day.enabled ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={day.start}
                  onChange={(e) => updateTime(day.id, "start", e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
                />
                <span className="text-sm text-gray-400">—</span>
                <input
                  type="time"
                  value={day.end}
                  onChange={(e) => updateTime(day.id, "end", e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
                />
              </div>
            ) : (
              <span className="text-sm text-gray-400">Выходной</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        enabled ? "bg-[#1a5c3a]" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
