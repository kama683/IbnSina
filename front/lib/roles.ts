/**
 * Этап 0, коммит 9: единая точка правды по ролям на фронте — зеркалит
 * матрицу §2.2 плана (docs/PHASE0_ANALYSIS.md) и её backend-реализацию в
 * back/app/routers/*.py (require_roles(...) рядом с каждым эндпоинтом).
 *
 * Это только UX-слой (что показать в меню, какой виджет отрисовать) —
 * реальное разграничение прав всегда на бэкенде. Если тут где-то ошибиться
 * и показать пункт меню недоступной роли, API всё равно ответит 403.
 */
import type { EmployeeRole } from "@/lib/api/employees";

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  reception: "Регистратура",
  doctor: "Врач",
  nurse: "Медсестра",
  accountant: "Бухгалтерия",
  head_doctor: "Главный врач",
  admin: "Администратор",
};

// = require_roles(reception, doctor, nurse, head_doctor) в appointments.py/patients.py
export const VIEW_SCHEDULE_ROLES: EmployeeRole[] = [
  "reception",
  "doctor",
  "nurse",
  "head_doctor",
];

// = require_roles(doctor, head_doctor) — доступ к /api/employees/me/profile
// (есть doctor_profile) и к разделу «Профиль врача».
export const HAS_DOCTOR_PROFILE_ROLES: EmployeeRole[] = ["doctor", "head_doctor"];

// = require_roles(doctor, head_doctor) в appointments.py::get_week_stats —
// уже, чем VIEW_SCHEDULE_ROLES: reception/nurse видят расписание, но не
// управленческую статистику за неделю.
export const VIEW_STATS_ROLES: EmployeeRole[] = ["doctor", "head_doctor"];

// = _ANY_STAFF в patients.py/search.py — все, кроме admin.
export const ANY_STAFF_ROLES: EmployeeRole[] = [
  "reception",
  "doctor",
  "nurse",
  "accountant",
  "head_doctor",
];

export type NavItemConfig = {
  href: string;
  label: string;
  icon: "dashboard" | "calendar" | "queue" | "patients" | "profile" | "settings";
  roles: EmployeeRole[] | "all";
};

export const NAV_ITEMS: NavItemConfig[] = [
  { href: "/", label: "Дашборд", icon: "dashboard", roles: "all" },
  { href: "/appointments", label: "Приёмы", icon: "calendar", roles: VIEW_SCHEDULE_ROLES },
  { href: "/queue", label: "Живая очередь", icon: "queue", roles: VIEW_SCHEDULE_ROLES },
  { href: "/patients", label: "Пациенты", icon: "patients", roles: ANY_STAFF_ROLES },
  { href: "/profile", label: "Профиль", icon: "profile", roles: HAS_DOCTOR_PROFILE_ROLES },
  { href: "/settings", label: "Настройки", icon: "settings", roles: "all" },
];

export function isRoleAllowed(role: EmployeeRole, allowed: EmployeeRole[] | "all"): boolean {
  return allowed === "all" || allowed.includes(role);
}

export function navItemsForRole(role: EmployeeRole): NavItemConfig[] {
  return NAV_ITEMS.filter((item) => isRoleAllowed(role, item.roles));
}
