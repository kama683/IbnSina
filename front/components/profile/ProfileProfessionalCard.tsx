"use client";

import { useState } from "react";
import { doctorProfile } from "@/lib/mock-data";

const fields = [
  { label: "Специальность", value: doctorProfile.professional.specialty },
  {
    label: "Категория квалификации",
    value: doctorProfile.professional.qualificationCategory,
  },
  {
    label: "Номер лицензии",
    value: doctorProfile.professional.licenseNumber,
  },
  {
    label: "Лицензия действует до",
    value: doctorProfile.professional.licenseValidUntil,
  },
  {
    label: "Сертификат специалиста",
    value: doctorProfile.professional.certificateNumber,
  },
  {
    label: "Сертификат действует до",
    value: doctorProfile.professional.certificateValidUntil,
  },
];

export default function ProfileProfessionalCard() {
  const [about, setAbout] = useState(doctorProfile.professional.about);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Профессиональные данные
        </h2>
      </div>

      <div className="space-y-5 px-5 py-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-gray-400">{field.label}</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>

        <div>
          <label
            htmlFor="about"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            О себе
          </label>
          <textarea
            id="about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
          />
        </div>
      </div>
    </section>
  );
}
