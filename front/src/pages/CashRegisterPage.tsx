import { useSearchParams } from "react-router-dom";
import CashDashboard from "@/components/cash/CashDashboard";
import InvoicesTab from "@/components/cash/InvoicesTab";
import MyRefundRequestsTab from "@/components/cash/MyRefundRequestsTab";
import ShiftTab from "@/components/cash/ShiftTab";
import PageHeader from "@/components/layout/PageHeader";

const TABS = [
  { id: "shift", label: "Смена" },
  { id: "invoices", label: "Счета" },
  { id: "requests", label: "Мои заявки" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Доступ по роли (MANAGE_CASH_ROLES) проверяет <RequireRole> в router.tsx.
// Вкладка — в URL (?tab=invoices): на неё ведут ссылки с главной («все счета»).
export default function CashRegisterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab: TabId = TABS.some((item) => item.id === requested) ? (requested as TabId) : "shift";

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <PageHeader title="Касса" />

      <CashDashboard />

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Разделы кассы">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSearchParams(item.id === "shift" ? {} : { tab: item.id })}
              aria-current={tab === item.id ? "page" : undefined}
              className={`shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === item.id
                  ? "border-[#1a5c3a] text-[#1a5c3a]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "shift" && <ShiftTab />}
      {tab === "invoices" && <InvoicesTab />}
      {tab === "requests" && <MyRefundRequestsTab />}
    </div>
  );
}
