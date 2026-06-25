"use client";

import { useState } from "react";
import type {
  HealthMetric,
  Patient,
  PatientMedicalHistoryEntry,
  Vaccination,
} from "@/lib/mock-data";
import PatientProfileGeneralTab from "@/components/patients/profile/PatientProfileGeneralTab";
import PatientProfileHealthPassportTab from "@/components/patients/profile/PatientProfileHealthPassportTab";
import PatientProfileHistoryTab from "@/components/patients/profile/PatientProfileHistoryTab";
import PatientProfileVaccinationsTab from "@/components/patients/profile/PatientProfileVaccinationsTab";

const tabs = [
  { id: "general", label: "Основное" },
  { id: "history", label: "История болезни" },
  { id: "passport", label: "Паспорт здоровья" },
  { id: "vaccinations", label: "Прививки" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type Props = {
  patient: Patient;
  history: PatientMedicalHistoryEntry[];
  healthMetrics: HealthMetric[];
  vaccinations: Vaccination[];
};

export default function PatientProfileContent({
  patient,
  history,
  healthMetrics,
  vaccinations,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#1a5c3a] text-[#1a5c3a]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-5">
        {activeTab === "general" && (
          <PatientProfileGeneralTab patient={patient} />
        )}
        {activeTab === "history" && (
          <PatientProfileHistoryTab history={history} />
        )}
        {activeTab === "passport" && (
          <PatientProfileHealthPassportTab
            metrics={healthMetrics}
            lastMeasurement={patient.lastAppointment}
          />
        )}
        {activeTab === "vaccinations" && (
          <PatientProfileVaccinationsTab vaccinations={vaccinations} />
        )}
      </div>
    </div>
  );
}
