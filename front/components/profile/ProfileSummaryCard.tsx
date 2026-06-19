import { Camera } from "lucide-react";
import { doctor, doctorProfile } from "@/lib/mock-data";

const badgeStyles = {
  green: "bg-[#e8f5ee] text-[#1a5c3a]",
  blue: "bg-sky-50 text-sky-700",
};

export default function ProfileSummaryCard() {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex flex-col items-center px-5 py-6 text-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e8f5ee] text-2xl font-semibold text-[#1a5c3a]">
            {doctor.initials}
          </div>
          <button
            type="button"
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
            aria-label="Изменить фото"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>

        <h2 className="mt-4 text-base font-semibold text-gray-900">
          {doctor.fullName}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{doctorProfile.title}</p>
        <p className="mt-0.5 text-sm text-gray-500">
          {doctor.area} · {doctorProfile.office}
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {doctorProfile.badges.map((badge) => (
            <span
              key={badge.label}
              className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-medium ${badgeStyles[badge.variant]}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
