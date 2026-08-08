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

// = _VIEW_VITALS в patients.py (GET .../health-metrics, .../vaccinations) —
// reception и accountant вне доступа. Этап 1, коммит 12: карточка пациента
// раньше звала эти эндпоинты безусловно для любой роли и 500-илась для
// reception (403 из Promise.all не отлавливался) — теперь фронт сам не
// запрашивает то, что бэкенд всё равно не отдаст.
export const VIEW_VITALS_ROLES: EmployeeRole[] = ["doctor", "nurse", "head_doctor"];

// = _ANY_STAFF в patients.py/search.py — все, кроме admin.
export const ANY_STAFF_ROLES: EmployeeRole[] = [
  "reception",
  "doctor",
  "nurse",
  "accountant",
  "head_doctor",
];

// Этап 1, коммит 9 (docs/PHASE1_ANALYSIS.md §6 п.3) — кто может отменить/
// перенести ЛЮБОЙ приём (не только свой). Назначенный врач тоже может, но
// только свой — это отдельная проверка по appointment.employeeId, не по
// одной лишь роли, см. AppointmentActions.tsx.
export const MANAGE_ANY_APPOINTMENT_ROLES: EmployeeRole[] = ["reception", "head_doctor"];

// Этап 1, коммит 10 (docs/PHASE1_ANALYSIS.md §6 п.2, решение по §5.2) — чек-ин
// на живой очереди ("Начать"/"Завершить"). = _MANAGE_EXAMINATION в
// appointments.py — права не расширяем, reception/nurse только смотрят.
export const CHECK_IN_ROLES: EmployeeRole[] = ["doctor", "head_doctor"];

// Этап 2, коммит 1 (docs/PHASE2_ANALYSIS.md §6, решение A) — прейскурант:
// accountant вне доступа даже на чтение (= _VIEW_SERVICES в services.py).
export const VIEW_SERVICES_ROLES: EmployeeRole[] = [
  "reception",
  "doctor",
  "nurse",
  "head_doctor",
];
export const MANAGE_SERVICES_ROLES: EmployeeRole[] = ["head_doctor"];

// Этап 2, коммиты 3-6 — касса/счета/возвраты: reception и head_doctor
// (= _MANAGE_INVOICE/_MANAGE_SHIFT/_REQUEST_REFUND в back/app/routers/*.py).
export const MANAGE_CASH_ROLES: EmployeeRole[] = ["reception", "head_doctor"];
export const APPROVE_DISCOUNT_ROLES: EmployeeRole[] = ["head_doctor"];
export const DECIDE_REFUND_ROLES: EmployeeRole[] = ["head_doctor"];
export const VIEW_DAILY_REPORT_ROLES: EmployeeRole[] = ["head_doctor"];

export type NavItemConfig = {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "calendar"
    | "queue"
    | "patients"
    | "profile"
    | "settings"
    | "services"
    | "cash"
    | "refund";
  roles: EmployeeRole[] | "all";
};

export const NAV_ITEMS: NavItemConfig[] = [
  { href: "/", label: "Дашборд", icon: "dashboard", roles: "all" },
  { href: "/appointments", label: "Приёмы", icon: "calendar", roles: VIEW_SCHEDULE_ROLES },
  { href: "/queue", label: "Живая очередь", icon: "queue", roles: VIEW_SCHEDULE_ROLES },
  { href: "/patients", label: "Пациенты", icon: "patients", roles: ANY_STAFF_ROLES },
  { href: "/services", label: "Услуги", icon: "services", roles: VIEW_SERVICES_ROLES },
  { href: "/profile", label: "Профиль", icon: "profile", roles: HAS_DOCTOR_PROFILE_ROLES },
  { href: "/settings", label: "Настройки", icon: "settings", roles: "all" },
];

export function isRoleAllowed(role: EmployeeRole, allowed: EmployeeRole[] | "all"): boolean {
  return allowed === "all" || allowed.includes(role);
}

export function navItemsForRole(role: EmployeeRole): NavItemConfig[] {
  return NAV_ITEMS.filter((item) => isRoleAllowed(role, item.roles));
}
