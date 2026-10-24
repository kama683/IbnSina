import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMock,
  json,
  makeEmployee,
  makePatient,
  mockBackend,
  renderApp,
  setupHarness,
} from "@/test/app-harness";

beforeEach(setupHarness);
afterEach(() => vi.unstubAllGlobals());

const reception = makeEmployee("reception", { id: 2 });
const doctor = makeEmployee("doctor");

const page = (items = [makePatient()]) => ({
  items,
  total: items.length,
  page: 1,
  limit: 8,
  areas: ["Участок №3"],
});

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

describe("список пациентов", () => {
  it("читает страницу, поиск и участок из URL", async () => {
    mockBackend(reception, {
      "/api/patients?*": page(),
    });

    renderApp("/patients?page=2&search=Иван&area=Участок%20№3");

    expect(await screen.findByText("Иванов Иван Иванович")).toBeInTheDocument();
    const call = requested().find((url) => url.startsWith("/api/patients?"))!;
    const query = new URLSearchParams(call.split("?")[1]);
    expect(Object.fromEntries(query)).toMatchObject({
      page: "2",
      limit: "8",
      search: "Иван",
      area: "Участок №3",
    });
  });

  it("ввод в поиск обновляет URL и не теряет поле ввода", async () => {
    mockBackend(reception, { "/api/patients?*": page() });
    const user = userEvent.setup();

    const { router } = renderApp("/patients");
    const input = await screen.findByPlaceholderText("Поиск по ФИО или ИИН");
    await user.type(input, "Пет");

    await vi.waitFor(() => {
      expect(router.state.location.search).toBe("?search=%D0%9F%D0%B5%D1%82");
    });
    // поле осталось в DOM и в фокусе (не было подменено лоадером)
    expect(screen.getByPlaceholderText("Поиск по ФИО или ИИН")).toHaveFocus();
    expect(screen.getByPlaceholderText("Поиск по ФИО или ИИН")).toHaveValue("Пет");
  });

  it("admin (вне ANY_STAFF_ROLES) — «Нет доступа» без запроса списка", async () => {
    mockBackend(makeEmployee("admin"));

    renderApp("/patients");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(requested().some((url) => url.startsWith("/api/patients"))).toBe(false);
  });
});

describe("карточка пациента", () => {
  const profile = {
    "/api/patients/5": makePatient(),
    "/api/patients/5/history": [],
    "/api/patients/5/health-metrics": [],
    "/api/patients/5/vaccinations": [],
  };

  it("врач: грузятся показатели и прививки", async () => {
    mockBackend(doctor, profile);

    renderApp("/patients/5");

    expect((await screen.findAllByText("Иванов Иван Иванович")).length).toBeGreaterThan(0);
    expect(requested()).toContain("/api/patients/5/health-metrics");
    expect(requested()).toContain("/api/patients/5/vaccinations");
  });

  it("ресепшен: карточка открывается, но показатели не запрашиваются (иначе 403)", async () => {
    mockBackend(reception, profile);

    renderApp("/patients/5");

    expect((await screen.findAllByText("Иванов Иван Иванович")).length).toBeGreaterThan(0);
    expect(requested()).not.toContain("/api/patients/5/health-metrics");
    expect(requested()).not.toContain("/api/patients/5/vaccinations");
  });

  it("бухгалтер: карточка открывается, история болезни (403 на бэкенде) не запрашивается", async () => {
    mockBackend(makeEmployee("accountant"), { "/api/patients/5": makePatient() });

    renderApp("/patients/5");

    expect((await screen.findAllByText("Иванов Иван Иванович")).length).toBeGreaterThan(0);
    expect(requested()).not.toContain("/api/patients/5/history");
    expect(requested()).not.toContain("/api/patients/5/health-metrics");
  });

  it("несуществующий пациент (404) → «Пациент не найден»", async () => {
    mockBackend(reception, {
      "/api/patients/999": () => json(404, { detail: "Пациент не найден" }),
      "/api/patients/999/history": () => json(404, { detail: "Пациент не найден" }),
    });

    renderApp("/patients/999");

    expect(await screen.findByText("Пациент не найден.")).toBeInTheDocument();
  });
});

describe("осмотр", () => {
  it("нет активного приёма (404) → «не найден», а не белый экран", async () => {
    mockBackend(doctor, {
      "/api/patients/5": makePatient(),
      "/api/patients/5/visit-history": [],
      "/api/patients/5/examination": () =>
        json(404, { detail: "Активный приём не найден" }),
    });

    renderApp("/patients/5/examination");

    expect(
      await screen.findByText("Пациент или активный приём не найден."),
    ).toBeInTheDocument();
  });
});
