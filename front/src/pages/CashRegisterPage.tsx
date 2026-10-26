import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useCashSummary } from "@/components/cash/useCashOverview";
import type { EmployeeRole } from "@/lib/api/employees";
import { useEmployee } from "@/lib/auth/employee-context";
import { todayIso } from "@/lib/dates";
import { DECIDE_REFUND_ROLES, isRoleAllowed, VIEW_DAILY_REPORT_ROLES } from "@/lib/roles";

/** Что вкладки получают от оболочки через <Outlet context>. */
export type CashOutletContext = { date: string };

const REPORT_PATH = "/cash-register/report";

type TabConfig = {
  to: string;
  label: string;
  end?: boolean;
  /** Роли, которым вкладка показывается (как и сам маршрут в router.tsx). */
  roles: EmployeeRole[] | "all";
  badge?: "unpaid" | "refunds";
};

const TABS: TabConfig[] = [
  { to: "/cash-register", label: "Смена", end: true, roles: "all" },
  { to: "/cash-register/invoices", label: "Счета", roles: "all", badge: "unpaid" },
  { to: "/cash-register/refunds", label: "Возвраты", roles: DECIDE_REFUND_ROLES, badge: "refunds" },
  { to: REPORT_PATH, label: "Отчёт за день", roles: VIEW_DAILY_REPORT_ROLES },
  { to: "/cash-register/requests", label: "Мои заявки", roles: "all" },
];

// Доступ к разделу (MANAGE_CASH_ROLES) проверяет <RequireRole> в router.tsx,
// вкладки «Возвраты» и «Отчёт за день» — вложенные <RequireRole> там же.
// Вкладка определяется адресом, так что работают «Назад» и прямые ссылки.
export default function CashRegisterPage() {
  const employee = useEmployee();
  const { pathname } = useLocation();
  const { summary, pending } = useCashSummary();
  const [date, setDate] = useState(todayIso);

  const shiftOpen = Boolean(summary.data?.shift);
  const counts = {
    unpaid: summary.data?.invoices.unpaidCount ?? 0,
    refunds: pending.data?.length ?? 0,
  };
  const context: CashOutletContext = { date };

  return (
    // Одна ширина на все вкладки, чтобы контент не прыгал при переключении.
    <div className="mx-auto w-full max-w-[1120px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-ink">Касса</h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${
              shiftOpen ? "bg-brand-soft text-brand" : "bg-chip-gray text-ink-3"
            }`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${shiftOpen ? "bg-brand" : "bg-chevron"}`} />
            {shiftOpen ? "Смена открыта" : "Смена закрыта"}
          </span>
        </div>

        {/* Дата нужна только отчёту за день */}
        {pathname === REPORT_PATH && (
          <label className="flex h-[42px] items-center gap-2 rounded-[10px] border border-btn-line bg-white px-3.5 text-sm text-ink">
            <CalendarDays aria-hidden className="h-4 w-4 text-ink-3" />
            <span className="sr-only">Дата отчёта</span>
            <input
              type="date"
              value={date}
              onChange={(event) => event.target.value && setDate(event.target.value)}
              className="bg-transparent text-sm text-ink outline-none"
            />
          </label>
        )}
      </div>

      <nav aria-label="Разделы кассы" className="overflow-x-auto border-b border-line">
        <ul className="-mb-px flex min-w-max gap-7">
          {TABS.filter((tab) => isRoleAllowed(employee.role, tab.roles)).map((tab) => {
            const count = tab.badge ? counts[tab.badge] : 0;
            return (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-2 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                      isActive
                        ? "border-brand font-semibold text-brand"
                        : "border-transparent font-medium text-ink-3 hover:text-ink"
                    }`
                  }
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="rounded-full bg-warn-soft px-2 text-xs font-semibold leading-5 text-warn-ink">
                      {count}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <Outlet context={context} />
    </div>
  );
}
