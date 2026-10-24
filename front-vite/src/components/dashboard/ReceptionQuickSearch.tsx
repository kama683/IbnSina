import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import PatientCreateModal from "@/components/patients/PatientCreateModal";
import { getPatients } from "@/lib/api/patients";
import type { Patient } from "@/lib/types";

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "found"; patient: Patient }
  | { status: "not-found" };

/** Этап 1, коммит 11 (docs/PHASE1_ANALYSIS.md §6 п.10) — обязательный
 * reception-flow: поиск по ИИН → найден → открыть карточку; не найден →
 * форма создания с предзаполненным ИИН. */
export default function ReceptionQuickSearch() {
  const navigate = useNavigate();
  const [iin, setIin] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [showCreate, setShowCreate] = useState(false);

  async function handleSearch() {
    const query = iin.trim();
    if (!query) return;
    setState({ status: "searching" });
    try {
      const page = await getPatients({ search: query, limit: 5 });
      const exact = page.items.find((item) => item.iin === query);
      setState(exact ? { status: "found", patient: exact } : { status: "not-found" });
    } catch {
      setState({ status: "not-found" });
    }
  }

  return (
    <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Быстрый поиск пациента</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Введите ИИН — откроем карточку или предложим завести нового пациента
      </p>

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={iin}
            onChange={(e) => {
              setIin(e.target.value);
              setState({ status: "idle" });
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="ИИН пациента"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={state.status === "searching" || !iin.trim()}
          className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14472e] disabled:opacity-50"
        >
          Найти
        </button>
      </div>

      {state.status === "found" && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{state.patient.fullName}</p>
            <p className="text-xs text-gray-500">
              ИИН {state.patient.iin} · {state.patient.area}
            </p>
          </div>
          <Link
            to={`/patients/${state.patient.id}`}
            className="rounded-lg bg-[#1a5c3a] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#14472e]"
          >
            Открыть карточку
          </Link>
        </div>
      )}

      {state.status === "not-found" && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">Пациент с таким ИИН не найден</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Создать пациента
          </button>
        </div>
      )}

      <PatientCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        prefilledIin={iin.trim()}
        onCreated={(patient) => {
          setShowCreate(false);
          navigate(`/patients/${patient.id}`);
        }}
      />
    </section>
  );
}
