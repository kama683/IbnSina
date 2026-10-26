import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  LayoutDashboard,
  Calendar,
  Users,
  LogOut,
  UserRound,
  Tag,
  Wallet,
  RotateCcw,
  BarChart3,
  IdCard,
  Banknote,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import type { Employee } from "@/lib/api/employees";
import { ROLE_LABELS, navSectionsForRole, type NavIcon } from "@/lib/roles";

type SidebarProps = {
  employee: Employee;
  className?: string;
};

const ICONS: Record<NavIcon, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  desk: Users,
  id: IdCard,
  banknote: Banknote,
  dashboard: LayoutDashboard,
  calendar: Calendar,
  patients: Users,
  profile: UserRound,
  services: Tag,
  cash: Wallet,
  refund: RotateCcw,
  reports: BarChart3,
};

export default function Sidebar({ employee, className = "" }: SidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    // httpOnly-cookie нельзя стереть из JS — только бэкенд может (заодно
    // отзовёт refresh-токен). Если сам запрос не удался (например, сеть
    // отвалилась) — всё равно уходим на /login, терять пользователя тут
    // хуже, чем не отозвать токен идеально.
    try {
      await logout();
    } finally {
      // Кэш запросов принадлежит ушедшему пользователю — не оставляем его
      // следующему, кто войдёт в этой же вкладке.
      queryClient.clear();
      navigate("/login");
    }
  }

  const sections = navSectionsForRole(employee.role);

  return (
    <aside
      className={`flex w-full flex-col gap-4 border-b border-line bg-white px-3.5 py-4 md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-[248px] md:gap-6 md:border-b-0 md:border-r md:py-5 ${className}`}
    >
      {/* Логотип IbnSina + иконка пульса */}
      <div className="flex items-center gap-3 px-1.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand">
          <Activity className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
        </div>
        <span className="text-lg font-bold tracking-tight text-ink">IbnSina</span>
      </div>

      <nav aria-label="Основное меню" className="md:flex-1 md:overflow-y-auto">
        {sections.map((section) => (
          <NavGroup key={section.title} title={section.title}>
            {section.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={ICONS[item.icon]}
                label={item.label}
                pathname={pathname}
              />
            ))}
          </NavGroup>
        ))}
      </nav>

      {/* Сотрудник внизу — данные приходят из сессии (RequireAuth) */}
      <div className="border-t border-line pt-4">
        <div className="flex items-center gap-3 px-1.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
            {employee.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{employee.shortName}</p>
            <p className="truncate text-xs text-ink-3">
              {employee.positionTitle || ROLE_LABELS[employee.role]}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-ink-3 transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.8} aria-hidden />
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
    <div className="mb-4 last:mb-0">
      {/* Одна секция «Меню» без заголовка; у регистратуры секции подписаны */}
      {title !== "Меню" && (
        <p className="mb-1 px-3 text-xs font-medium text-ink-3">{title}</p>
      )}
      <ul className="flex flex-wrap gap-1 md:block md:space-y-1">{children}</ul>
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
        to={href}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          isActive
            ? "bg-brand-soft font-semibold text-brand"
            : "font-medium text-ink-2 hover:bg-subtle hover:text-ink"
        }`}
      >
        <Icon size={20} strokeWidth={1.8} />
        {label}
      </Link>
    </li>
  );
}
