import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { getCurrentDoctor } from "@/lib/api/doctors";

export default async function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Один запрос к API на весь layout — данные уйдут и в Header, и в Sidebar
  const doctor = await getCurrentDoctor();

  return (
    <div className="min-h-screen bg-[#f4f6f5]">
      {/* Sidebar фиксирован — не скроллится */}
      <Sidebar doctor={doctor} />

      {/* Контент сдвинут на ширину sidebar (256px = w-64) */}
      <div className="flex min-h-screen flex-col md:pl-64">
        {/* Header sticky — прилипает к верху при скролле */}
        <Header doctor={doctor} />
        <main className="flex-1 px-6 py-5">{children}</main>
      </div>
    </div>
  );
}