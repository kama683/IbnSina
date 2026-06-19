import { GraduationCap } from "lucide-react";
import { doctorProfile } from "@/lib/mock-data";

export default function ProfileEducationCard() {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
        <GraduationCap className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">
          Образование и квалификация
        </h2>
      </div>

      <div className="px-5 py-5">
        <ol className="space-y-6">
          {doctorProfile.education.map((entry, index) => (
            <li key={entry.year} className="relative flex gap-4">
              {index < doctorProfile.education.length - 1 && (
                <span className="absolute left-[5px] top-3 h-[calc(100%+12px)] w-px bg-gray-200" />
              )}

              <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1a5c3a]" />

              <div className="min-w-0 pb-1">
                <p className="text-xs font-medium text-[#1a5c3a]">
                  {entry.year}
                </p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">
                  {entry.title}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {entry.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
