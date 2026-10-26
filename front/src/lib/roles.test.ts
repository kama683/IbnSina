import { describe, expect, it } from "vitest";
import type { EmployeeRole } from "@/lib/api/employees";
import { isRoleAllowed, navItemsForRole, navSectionsForRole } from "@/lib/roles";

const labels = (role: EmployeeRole) => navItemsForRole(role).map((item) => item.label);

// Зеркало матрицы §2.2 плана и require_roles(...) в back/app/routers/*.py:
// если бэкенд меняет права, этот тест напоминает обновить lib/roles.ts.
describe("меню по ролям", () => {
  it("ресепшен: «Стойка», касса, прейскурант; без возвратов и отчёта", () => {
    expect(labels("reception")).toEqual([
      "Стойка", "Приёмы", "Пациенты", "Прейскурант", "Касса", "Профиль",
    ]);
  });

  it("врач: дашборд (приёмы живут на нём), пациенты и профиль; без кассы и услуг", () => {
    expect(labels("doctor")).toEqual([
      "Дашборд", "Пациенты", "Профиль",
    ]);
  });

  it("медсестра: как врач", () => {
    expect(labels("nurse")).toEqual([
      "Дашборд", "Пациенты", "Профиль",
    ]);
  });

  it("бухгалтер: пациенты, но не расписание и не прейскурант", () => {
    expect(labels("accountant")).toEqual(["Дашборд", "Пациенты", "Профиль"]);
  });

  it("главврач: «Возвраты» и «Отчёт за день» — вкладки кассы, не пункты меню", () => {
    expect(labels("head_doctor")).toEqual(["Дашборд", "Пациенты", "Услуги", "Касса", "Профиль"]);
  });

  it("admin: дашборд, услуги (управляет прейскурантом) и профиль", () => {
    expect(labels("admin")).toEqual(["Дашборд", "Услуги", "Профиль"]);
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
      ["Приём пациентов", ["Стойка", "Приёмы", "Пациенты"]],
      ["Деньги", ["Касса", "Прейскурант"]],
      ["Прочее", ["Профиль"]],
    ]);
  });

  it("иконки регистратуры: users, id, banknote", () => {
    const icons = Object.fromEntries(
      navSectionsForRole("reception").flatMap((s) => s.items.map((i) => [i.href, i.icon])),
    );
    expect(icons).toMatchObject({
      "/": "desk", "/appointments": "calendar", "/patients": "id",
      "/cash-register": "banknote", "/services": "services", "/profile": "profile",
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
    expect(labels("doctor")).not.toContain("Услуги");
    // «Живая очередь» объединена с «Приёмами» — отдельного пункта нет ни у кого
    for (const role of ["reception", "doctor", "nurse", "head_doctor"] as const) {
      expect(labels(role)).not.toContain("Живая очередь");
    }
  });

  it("пустых секций не бывает ни у одной роли", () => {
    for (const role of ["reception", "doctor", "nurse", "accountant", "head_doctor", "admin"] as const) {
      for (const section of navSectionsForRole(role)) {
        expect(section.items.length).toBeGreaterThan(0);
      }
    }
  });
});
