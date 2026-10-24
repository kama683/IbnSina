import { Bell, Monitor, Moon } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader title="Настройки" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f5ee]">
              <Bell className="h-4 w-4 text-[#1a5c3a]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Уведомления</h2>
              <p className="text-xs text-gray-500">
                Напоминания о приёмах и очереди
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Раздел в разработке. Скоро можно будет настроить push и email-уведомления.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f5ee]">
              <Moon className="h-4 w-4 text-[#1a5c3a]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Оформление</h2>
              <p className="text-xs text-gray-500">Тема и плотность интерфейса</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Тёмная тема и настройки отображения появятся в следующих версиях.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f5ee]">
              <Monitor className="h-4 w-4 text-[#1a5c3a]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">О системе</h2>
              <p className="text-xs text-gray-500">IbnSina — информационная система поликлиники</p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Версия</dt>
              <dd className="font-medium text-gray-900">1.0.0</dd>
            </div>
            <div>
              <dt className="text-gray-500">API</dt>
              <dd className="font-medium text-gray-900">FastAPI + PostgreSQL</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
