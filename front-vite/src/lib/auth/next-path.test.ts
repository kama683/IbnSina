import { describe, expect, it } from "vitest";
import { loginUrl, safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("пропускает внутренние пути вместе с query", () => {
    expect(safeNextPath("/patients/5")).toBe("/patients/5");
    expect(safeNextPath("/appointments?week=2")).toBe("/appointments?week=2");
  });

  it("пустое значение → главная", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("не даёт увести на внешний сайт", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("не возвращает на саму страницу входа", () => {
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/login?next=/x")).toBe("/");
  });
});

describe("loginUrl", () => {
  it("кодирует путь возврата", () => {
    expect(loginUrl("/appointments?week=2")).toBe(
      "/login?next=%2Fappointments%3Fweek%3D2",
    );
  });

  it("с главной возвращаться незачем", () => {
    expect(loginUrl("/")).toBe("/login");
  });
});
