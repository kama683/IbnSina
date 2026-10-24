import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMock,
  json,
  makeAppointment,
  makeEmployee,
  mockBackend,
  renderApp,
  setupHarness,
} from "@/test/app-harness";

beforeEach(setupHarness);
afterEach(() => vi.unstubAllGlobals());

const doctor = makeEmployee("doctor");
const reception = makeEmployee("reception", { id: 2 });

const doctorProfile = { ...doctor, office: "Каб. 12" };

describe("дашборд", () => {
  it("врач видит сегодняшние приёмы, статистику и кабинет", async () => {
    mockBackend(doctor, {
      "/api/employees/me/profile": doctorProfile,
      "/api/appointments/current": null,
      "/api/appointments/today": [makeAppointment()],
      "/api/appointments/stats/week": {
        period: "20–25 окт",
        total: 12,
        completed: 7,
        cancelled: 1,
        newPatients: 3,
        dispensary: 2,
        avgMinutes: 18,
      },
    });

    renderApp("/");

    expect(await screen.findByText("Приёмы на сегодня")).toBeInTheDocument();
    expect(screen.getAllByText("Иванов И.И.").length).toBeGreaterThan(0);
    expect(screen.getByText(/Каб\. 12/)).toBeInTheDocument();
  });

  it("ресепшен видит «Стойку», а не врачебные виджеты", async () => {
    mockBackend(reception, {
      "/api/reports/reception-summary": {
        date: "2026-10-25",
        shift: null,
        queue: { waiting: 0, inProgress: 0 },
        doctors: [],
        invoices: { unpaidCount: 0, awaitingApprovalCount: 0, awaitingPayment: [] },
      },
    });

    renderApp("/");

    expect(await screen.findByText("Стойка регистратуры")).toBeInTheDocument();
    for (const gone of ["Текущий приём", "Ближайшие", "Приёмы на сегодня", "Быстрый поиск пациента"]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
    expect(screen.queryByText(/Добрый день/)).toBeNull();
    const requested = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requested).toContain("/api/reports/reception-summary");
    expect(requested).not.toContain("/api/appointments/today");
    expect(requested).not.toContain("/api/appointments/stats/week");
    expect(requested.some((url) => url.includes("profile"))).toBe(false);
  });

  it("медсестра остаётся на врачебном дашборде", async () => {
    mockBackend(makeEmployee("nurse"), {
      "/api/appointments/current": null,
      "/api/appointments/today": [makeAppointment()],
    });

    renderApp("/");

    expect(await screen.findByText("Приёмы на сегодня")).toBeInTheDocument();
    expect(screen.getByText(/Добрый день/)).toBeInTheDocument();
  });

  it("бухгалтеру — заглушка без запросов расписания", async () => {
    mockBackend(makeEmployee("accountant"));

    renderApp("/");

    expect(
      await screen.findByText(/Рабочее пространство для вашей роли/),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "/api/employees/me",
    ]);
  });
});

describe("живая очередь", () => {
  const queue = [
    makeAppointment({ id: "1", status: "scheduled", patient: "Первый П.П." }),
    makeAppointment({ id: "2", status: "in_progress", patient: "Второй В.В.", time: "09:30" }),
  ];

  it("врач может начать приём; после действия очередь перезапрашивается", async () => {
    let patched = false;
    mockBackend(doctor, {
      "/api/appointments/queue": () =>
        json(200, patched ? [{ ...queue[0], status: "in_progress" }, queue[1]] : queue),
      "PATCH /api/appointments/1": () => {
        patched = true;
        return json(200, {});
      },
    });
    const user = userEvent.setup();

    renderApp("/queue");

    const row = (await screen.findByText("Первый П.П.")).closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Начать" }));

    // после PATCH приём стал «На приёме» → кнопки «Начать» у него больше нет
    await vi.waitFor(() => {
      expect(within(row).queryByRole("button", { name: "Начать" })).toBeNull();
    });
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url) === "/api/appointments/queue"),
    ).toHaveLength(2);
  });

  it("ресепшен видит очередь, но без кнопок чек-ина", async () => {
    mockBackend(reception, { "/api/appointments/queue": queue });

    renderApp("/queue");

    expect(await screen.findByText("Первый П.П.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Начать" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Завершить" })).toBeNull();
  });

  it("роль без доступа к расписанию (бухгалтер) получает «Нет доступа»", async () => {
    mockBackend(makeEmployee("accountant"));

    renderApp("/queue");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
  });

  it("ошибка бэкенда — экран ошибки с повтором, а не белый экран", async () => {
    mockBackend(doctor, {
      "/api/appointments/queue": () => json(500, { detail: "БД недоступна" }),
    });

    renderApp("/queue");

    expect(await screen.findByText("БД недоступна")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
  });
});

describe("приёмы", () => {
  it("врач видит список приёмов за выбранную дату", async () => {
    mockBackend(doctor, {
      "/api/employees/me/profile": doctorProfile,
      "/api/patients?*": { items: [], total: 0, page: 1, limit: 100 },
      "/api/appointments?from=*": [makeAppointment({ patient: "Из списка С.С." })],
    });

    renderApp("/appointments");

    expect(await screen.findByText("Из списка С.С.")).toBeInTheDocument();
  });

  it("календарь запрашивает неделю, заданную в ?week=", async () => {
    mockBackend(doctor, {
      "/api/employees/me/profile": doctorProfile,
      "/api/patients?*": { items: [], total: 0, page: 1, limit: 100 },
      "/api/appointments?from=*": [],
    });
    const user = userEvent.setup();

    const { router } = renderApp("/appointments?week=2");
    await user.click(await screen.findByRole("button", { name: /Календарь/ }));

    await vi.waitFor(() => {
      const ranges = fetchMock.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.startsWith("/api/appointments?from="));
      // список за день (одна дата) + календарь за неделю (разные from/to)
      expect(ranges.some((url) => {
        const q = new URLSearchParams(url.split("?")[1]);
        return q.get("from") !== q.get("to");
      })).toBe(true);
    });
    expect(router.state.location.search).toBe("?week=2");
  });
});
