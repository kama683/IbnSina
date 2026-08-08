"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Calendar,
  MonitorCheck,
  Users,
  Settings,
  LogOut,
  UserRound,
  Tag,
  Wallet,
  RotateCcw,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import type { Employee } from "@/lib/api/employees";
import { NAV_ITEMS, ROLE_LABELS, isRoleAllowed, type NavItemConfig } from "@/lib/roles";

type SidebarProps = {
  employee: Employee;
};

const ICONS: Record<NavItemConfig["icon"], React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  queue: MonitorCheck,
  patients: Users,
  profile: UserRound,
  settings: Settings,
  services: Tag,
  cash: Wallet,
  refund: RotateCcw,
};

export default function Sidebar({ employee }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    // httpOnly-cookie нельзя стереть из JS — только бэкенд может (заодно
    // отзовёт refresh-токен). Если сам запрос не удался (например, сеть
    // отвалилась) — всё равно уходим на /login, терять пользователя тут
    // хуже, чем не отозвать токен идеально.
    try {
      await logout();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const items = NAV_ITEMS.filter((item) => isRoleAllowed(employee.role, item.roles));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-200/80 bg-white md:flex">
      {/* Логотип IbnSina + иконка пульса */}
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a5c3a]">
          <Activity className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">
          IbnSina
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-2">
        <NavGroup title="Меню">
          {items.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={ICONS[item.icon]}
              label={item.label}
              pathname={pathname}
            />
          ))}
        </NavGroup>
      </nav>

      {/* Профиль сотрудника внизу — данные приходят с сервера через layout */}
      <div className="border-t border-gray-200/80 p-4">
        <p className="text-sm font-medium text-gray-900">{employee.fullName}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {employee.positionTitle || ROLE_LABELS[employee.role]}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  pathname,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  pathname: string;
}) {
  const isActive =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-[#e8f5ee] font-medium text-[#1a5c3a]"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Icon size={18} strokeWidth={isActive ? 2.25 : 2} />
        {label}
      </Link>
    </li>
  );
}
