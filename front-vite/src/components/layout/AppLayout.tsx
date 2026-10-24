import { Outlet } from "react-router-dom";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { useEmployee } from "@/lib/auth/employee-context";

/** Оболочка авторизованной части (бывший app/(doctors)/layout.tsx).
 * Сотрудник приходит из <RequireAuth>, отдельной загрузки здесь нет. */
export default function AppLayout() {
  const employee = useEmployee();

  return (
    <div className="min-h-screen bg-[#f4f6f5] print:bg-white">
      {/* Sidebar фиксирован — не скроллится; на печати (Этап 2, коммит 12) не нужен */}
      <Sidebar employee={employee} className="print:hidden" />

      {/* Контент сдвинут на ширину sidebar (256px = w-64); при печати — во всю ширину */}
      <div className="flex min-h-screen flex-col md:pl-64 print:pl-0">
        {/* Header sticky — прилипает к верху при скролле; скрыт при печати */}
        <Header employee={employee} className="print:hidden" />
        <main className="flex-1 px-6 py-5 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
