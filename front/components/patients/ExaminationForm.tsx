"use client";

import { useState, type ReactNode } from "react";
import { Plus, Search, X } from "lucide-react";
import type {
  Diagnosis,
  PatientExamination,
  Prescription,
} from "@/lib/mock-data";

type Props = {
  examination: PatientExamination;
};

function createPrescription(): Prescription {
  return {
    id: crypto.randomUUID(),
    medication: "",
    dosage: "",
    duration: "",
  };
}

export default function ExaminationForm({ examination }: Props) {
  const [complaints, setComplaints] = useState(examination.complaints);
  const [objectiveStatus, setObjectiveStatus] = useState(
    examination.objectiveStatus,
  );
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(
    examination.diagnoses,
  );
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(
    examination.prescriptions.length > 0
      ? examination.prescriptions
      : [createPrescription()],
  );
  const [diagnosisQuery, setDiagnosisQuery] = useState("");

  function removeDiagnosis(code: string) {
    setDiagnoses((items) => items.filter((item) => item.code !== code));
  }

  function addPrescription() {
    setPrescriptions((items) => [...items, createPrescription()]);
  }

  function removePrescription(id: string) {
    setPrescriptions((items) =>
      items.length === 1 ? items : items.filter((item) => item.id !== id),
    );
  }

  function updatePrescription(
    id: string,
    field: keyof Omit<Prescription, "id">,
    value: string,
  ) {
    setPrescriptions((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Осмотр</h2>
      </div>

      <div className="space-y-5 px-5 py-5">
        <Field label="Жалобы">
          <textarea
            value={complaints}
            onChange={(e) => setComplaints(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
          />
        </Field>

        <Field label="Объективный статус">
          <textarea
            value={objectiveStatus}
            onChange={(e) => setObjectiveStatus(e.target.value)}
            rows={4}
            placeholder={"АД: , ЧСС: , ЧДД: , Т: °C\nСостояние: удовлетворительное"}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
          />
        </Field>

        <Field label="Диагноз (МКБ-10)">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={diagnosisQuery}
              onChange={(e) => setDiagnosisQuery(e.target.value)}
              placeholder="Поиск по коду или названию..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
            />
          </div>

          {diagnoses.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {diagnoses.map((diagnosis) => (
                <span
                  key={diagnosis.code}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8f5ee] px-2.5 py-1 text-sm text-[#1a5c3a]"
                >
                  <span className="font-medium">{diagnosis.code}</span>
                  <span>{diagnosis.name}</span>
                  <button
                    type="button"
                    onClick={() => removeDiagnosis(diagnosis.code)}
                    className="rounded p-0.5 text-[#1a5c3a]/60 transition-colors hover:bg-[#1a5c3a]/10 hover:text-[#1a5c3a]"
                    aria-label="Удалить диагноз"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Назначения</p>
            <button
              type="button"
              onClick={addPrescription}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#1a5c3a] transition-colors hover:text-[#14472e]"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>

          <div className="space-y-2">
            {prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  value={prescription.medication}
                  onChange={(e) =>
                    updatePrescription(
                      prescription.id,
                      "medication",
                      e.target.value,
                    )
                  }
                  placeholder="Препарат"
                  className="min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
                />
                <input
                  type="text"
                  value={prescription.dosage}
                  onChange={(e) =>
                    updatePrescription(
                      prescription.id,
                      "dosage",
                      e.target.value,
                    )
                  }
                  placeholder="Дозировка"
                  className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
                />
                <input
                  type="text"
                  value={prescription.duration}
                  onChange={(e) =>
                    updatePrescription(
                      prescription.id,
                      "duration",
                      e.target.value,
                    )
                  }
                  placeholder="Длительность"
                  className="w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
                />
                <button
                  type="button"
                  onClick={() => removePrescription(prescription.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Удалить назначение"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 px-5 py-4">
        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Сохранить черновик
        </button>
        <button
          type="button"
          className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e]"
        >
          Завершить приём
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}
