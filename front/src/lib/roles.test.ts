import { describe, expect, it } from "vitest";
import type { EmployeeRole } from "@/lib/api/employees";
import { isRoleAllowed, navItemsForRole, navSectionsForRole } from "@/lib/roles";

const labels = (role: EmployeeRole) => navItemsForRole(role).map((item) => item.label);

// Зеркало матрицы §2.2 плана и require_roles(...) в back/app/routers/*.py:
// если бэкенд меняет права, этот тест напоминает обновить lib/roles.ts.
describe("меню по ролям", () => {
  it("ресепшен: «Стойка», касса, прейскурант; без возвратов, отчёта и профиля врача", () => {
    expect(labels("reception")).toEqual([
      "Стойка", "Приёмы", "Живая очередь", "Пациенты", "Прейскурант", "Касса", "Настройки",
    ]);
  });

  it("врач: расписание и профиль, без кассы", () => {
    expect(labels("doctor")).toEqual([
      "Дашборд", "Приёмы", "Живая очередь", "Пациенты", "Услуги", "Профиль", "Настройки",
    ]);
  });

  it("медсестра: как врач, но без профиля", () => {
    expect(labels("nurse")).toEqual([
      "Дашборд", "Приёмы", "Живая очередь", "Пациенты", "Услуги", "Настройки",
    ]);
  });

  it("бухгалтер: пациенты, но не расписание и не прейскурант", () => {
    expect(labels("accountant")).toEqual(["Дашборд", "Пациенты", "Настройки"]);
  });

  it("главврач видит всё, включая очередь возвратов", () => {
    expect(labels("head_doctor")).toHaveLength(10);
    expect(labels("head_doctor")).toContain("Возвраты");
    expect(labels("head_doctor")).toContain("Отчёт за день");
  });

  it("admin — не бизнес-роль: только дашборд и настройки", () => {
    expect(labels("admin")).toEqual(["Дашборд", "Настройки"]);
  });
});

describe("isRoleAllowed", () => {
  it('"all" пускает любую роль', () => {
    expect(isRoleAllowed("admin", "all")).toBe(true);
  });

  it("список пускает только перечисленных", () => {
    expect(isRoleAllowed("doctor", ["head_doctor"])).toBe(false);
    expect(isRoleAllowed("head_doctor", ["head_doctor"])).toBe(true);
  });
});

describe("секции меню", () => {
  const sections = (role: EmployeeRole) =>
    navSectionsForRole(role).map((s) => [s.title, s.items.map((i) => i.label)]);

  it("регистратура: три секции по сценарию работы", () => {
    expect(sections("reception")).toEqual([
      ["Приём пациентов", ["Стойка", "Приёмы", "Живая очередь", "Пациенты"]],
      ["Деньги", ["Касса", "Прейскурант"]],
      ["Прочее", ["Настройки"]],
    ]);
  });

  it("иконки регистратуры: users, clock, id, banknote", () => {
    const icons = Object.fromEntries(
      navSectionsForRole("reception").flatMap((s) => s.items.map((i) => [i.href, i.icon])),
    );
    expect(icons).toMatchObject({
      "/": "desk", "/appointments": "calendar", "/queue": "clock", "/patients": "id",
      "/cash-register": "banknote", "/services": "services", "/settings": "settings",
    });
  });

  it("остальные роли — одна секция «Меню», подписи прежние", () => {
    for (const role of ["doctor", "nurse", "head_doctor", "accountant", "admin"] as const) {
      const result = navSectionsForRole(role);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Меню");
      expect(result[0].items.map((i) => i.label)).toEqual(labels(role));
    }
    expect(labels("doctor")).toContain("Дашборд");
    expect(labels("doctor")).toContain("Услуги");
  });

  it("пустых секций не бывает ни у одной роли", () => {
    for (const role of ["reception", "doctor", "nurse", "accountant", "head_doctor", "admin"] as const) {
      for (const section of navSectionsForRole(role)) {
        expect(section.items.length).toBeGreaterThan(0);
      }
    }
  });
});
