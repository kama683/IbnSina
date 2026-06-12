import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f6f5]">
      {/* Sidebar фиксирован — не скроллится */}
      <Sidebar />

      {/* Контент сдвинут на ширину sidebar (256px = w-64) */}
      <div className="flex min-h-screen flex-col md:pl-64">
        {/* Header sticky — прилипает к верху при скролле */}
        <Header />
        <main className="flex-1 px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
