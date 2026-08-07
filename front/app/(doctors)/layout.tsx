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
    <div className="min-h-screen bg-[#f4f6f5]">
      {/* Sidebar фиксирован — не скроллится */}
      <Sidebar employee={employee} />

      {/* Контент сдвинут на ширину sidebar (256px = w-64) */}
      <div className="flex min-h-screen flex-col md:pl-64">
        {/* Header sticky — прилипает к верху при скролле */}
        <Header employee={employee} />
        <main className="flex-1 px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
