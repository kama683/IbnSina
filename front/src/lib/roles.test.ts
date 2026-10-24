import { describe, expect, it } from "vitest";
import type { EmployeeRole } from "@/lib/api/employees";
import { isRoleAllowed, navItemsForRole } from "@/lib/roles";

const labels = (role: EmployeeRole) => navItemsForRole(role).map((item) => item.label);

// Зеркало матрицы §2.2 плана и require_roles(...) в back/app/routers/*.py:
// если бэкенд меняет права, этот тест напоминает обновить lib/roles.ts.
describe("меню по ролям", () => {
  it("ресепшен: расписание, пациенты, касса, но не отчёт и не профиль врача", () => {
    expect(labels("reception")).toEqual([
      "Дашборд", "Приёмы", "Живая очередь", "Пациенты", "Услуги", "Касса", "Возвраты", "Настройки",
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

  it("главврач видит всё", () => {
    expect(labels("head_doctor")).toHaveLength(10);
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
