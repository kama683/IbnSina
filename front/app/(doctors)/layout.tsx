import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { getCurrentEmployee } from "@/lib/api/employees";

export default async function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Этап 0, коммит 9: getCurrentEmployee() вместо getCurrentDoctor() —
  // последний 404-ился для сотрудников без doctor_profile (все, кроме
  // doctor/head_doctor), так что layout ломался для 4 из 6 ролей.
  const employee = await getCurrentEmployee();

  return (
    <div className="min-h-screen bg-[#f4f6f5] print:bg-white">
      {/* Sidebar фиксирован — не скроллится; на печати (Этап 2, коммит 12) не нужен */}
      <Sidebar employee={employee} className="print:hidden" />

      {/* Контент сдвинут на ширину sidebar (256px = w-64); при печати — во всю ширину */}
      <div className="flex min-h-screen flex-col md:pl-64 print:pl-0">
        {/* Header sticky — прилипает к верху при скролле; скрыт при печати */}
        <Header employee={employee} className="print:hidden" />
        <main className="flex-1 px-6 py-5 print:p-0">{children}</main>
      </div>
    </div>
  );
}
