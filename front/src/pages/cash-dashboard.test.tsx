import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShiftReport } from "@/lib/api/cash-shifts";
import type { ReceptionSummary } from "@/lib/api/reports";
import {
  fetchMock,
  makeEmployee,
  mockBackend,
  renderApp,
  setupHarness,
} from "@/test/app-harness";

beforeEach(setupHarness);
afterEach(() => vi.unstubAllGlobals());

const reception = makeEmployee("reception", { id: 2 });

const summary = (shift: ReceptionSummary["shift"]): ReceptionSummary => ({
  date: "2026-10-25",
  shift,
  queue: { waiting: 0, inProgress: 0 },
  doctors: [],
  invoices: { unpaidCount: 12, awaitingApprovalCount: 2, awaitingPayment: [] },
});

const report: ShiftReport = {
  shift: {
    id: 1, cashierEmployeeId: 2, cashierName: "Регистратор Р.", openedAt: "2026-10-25T08:00:00",
    openingBalance: 500_000, closedAt: null, actualCash: null, status: "open",
  },
  cashTotal: 6_000_000,   // 60 000 ₸
  cardTotal: 3_000_000,   // 30 000 ₸
  transferTotal: 1_000_000, // 10 000 ₸
  refundsTotal: 200_000,
  paymentsCount: 14,
  expectedCash: 6_500_000,
  discrepancy: null,
};

const shiftMocks = { "/api/cash-shifts/current": null, "/api/cash-shifts": [] };

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

const card = (label: string) => screen.getByText(label).closest("div")!;

describe("касса: вкладка «Смена»", () => {
  it("смена открыта: принято, наличные в кассе, платежи и возвраты по смене", async () => {
    mockBackend(reception, {
      ...shiftMocks,
      "/api/cash-shifts/current": report.shift,
      "/api/reports/reception-summary": summary({ id: 1, openedAt: "2026-10-25T08:00:00", receivedTotal: 10_000_000 }),
      "/api/cash-shifts/1/report": report,
      "/api/refund-requests?status=pending&mine=true": [{ id: 1 }, { id: 2 }, { id: 3 }],
    });

    renderApp("/cash-register");

    await screen.findByText("Принято за смену");
    await vi.waitFor(() => expect(card("Принято за смену")).toHaveTextContent(/100\s000\s₸/));
    expect(card("Принято за смену")).toHaveTextContent("платежей: 14");
    expect(card("Наличных в кассе")).toHaveTextContent(/65\s000\s₸/);
    expect(card("Наличных в кассе")).toHaveTextContent(/стартовый остаток 5\s000\s₸/);
    expect(card("Платежей за смену")).toHaveTextContent("14");
    await vi.waitFor(() => expect(card("Возвраты за смену")).toHaveTextContent("ждут решения: 3"));
    expect(card("Возвраты за смену")).toHaveTextContent(/2\s000\s₸/);
    // смена открыта: карточка превращается в «Закрыть смену», шапка показывает статус
    expect(await screen.findByRole("heading", { name: "Закрыть смену" })).toBeInTheDocument();
    expect(screen.getByText("Смена открыта")).toBeInTheDocument();
  });

  it("счётчики вкладок: неоплаченные счета; без «Возвратов» у регистратора", async () => {
    mockBackend(reception, {
      ...shiftMocks,
      "/api/reports/reception-summary": summary(null),
      "/api/refund-requests?status=pending&mine=true": [{ id: 1 }],
    });

    renderApp("/cash-register");

    const invoices = await screen.findByRole("link", { name: /Счета/ });
    await vi.waitFor(() => expect(invoices).toHaveTextContent("12"));
    expect(screen.queryByRole("link", { name: /Возвраты/ })).toBeNull();
  });

  it("разбивка по способам оплаты: суммы и доли шкалы", async () => {
    mockBackend(reception, {
      ...shiftMocks,
      "/api/reports/reception-summary": summary({ id: 1, openedAt: "2026-10-25T08:00:00", receivedTotal: 10_000_000 }),
      "/api/cash-shifts/1/report": report,
      "/api/refund-requests?status=pending&mine=true": [],
    });

    renderApp("/cash-register");

    const heading = await screen.findByRole("heading", { name: "Способы оплаты за смену" });
    const section = heading.closest("section")!;
    await vi.waitFor(() => expect(within(section).getByText("Наличные").closest("li")).toHaveTextContent(/60\s000\s₸/));
    expect(within(section).getByText("Карта").closest("li")).toHaveTextContent(/30\s000\s₸/);
    expect(within(section).getByText("Перевод").closest("li")).toHaveTextContent(/10\s000\s₸/);
    expect(screen.getByRole("img", { name: "Доли способов оплаты" })).toBeInTheDocument();
  });

  it("смена не открыта: прочерки и подсказка, отчёт смены не запрашивается", async () => {
    mockBackend(reception, {
      ...shiftMocks,
      "/api/reports/reception-summary": summary(null),
      "/api/refund-requests?status=pending&mine=true": [],
    });

    renderApp("/cash-register");

    expect(await screen.findByText("Разбивка обновится после открытия смены")).toBeInTheDocument();
    expect(card("Принято за смену")).toHaveTextContent("—");
    expect(card("Принято за смену")).toHaveTextContent("смена не открыта");
    expect(screen.getByText("Смена закрыта", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Открыть смену" })).toBeInTheDocument();
    expect(requested().some((u) => /\/cash-shifts\/\d+\/report/.test(u))).toBe(false);
  });

  it("сводка недоступна (500): страница жива, цифры — прочерки", async () => {
    mockBackend(reception, { ...shiftMocks, "/api/refund-requests?status=pending&mine=true": [] });

    renderApp("/cash-register");

    expect(await screen.findByRole("heading", { name: "Касса" })).toBeInTheDocument();
    expect(card("Принято за смену")).toHaveTextContent("—");
    expect(screen.getByRole("link", { name: "Смена" })).toBeInTheDocument();
  });

  it("регистратору не запрашивается дневной отчёт клиники", async () => {
    mockBackend(reception, {
      ...shiftMocks,
      "/api/reports/reception-summary": summary(null),
      "/api/refund-requests?status=pending&mine=true": [],
    });

    renderApp("/cash-register");

    await screen.findByText("Принято за смену");
    expect(screen.queryByText("Клиника сегодня")).toBeNull();
    expect(requested().some((u) => u.startsWith("/api/reports/daily"))).toBe(false);
  });

  it("главврач: «Клиника сегодня», «Возвраты сегодня» и заявки, ждущие его решения (все, не только свои)", async () => {
    mockBackend(makeEmployee("head_doctor", { id: 9 }), {
      ...shiftMocks,
      "/api/reports/reception-summary": summary(null),
      "/api/refund-requests?status=pending": [{ id: 1 }, { id: 2 }],
      "/api/reports/daily?*": {
        date: "2026-10-25", cashTotal: 5_000_000, cardTotal: 2_000_000, transferTotal: 500_000,
        total: 7_500_000, refundsTotal: 300_000, paymentsCount: 21, invoicesTouchedCount: 18,
      },
    });

    renderApp("/cash-register");

    await vi.waitFor(() => expect(card("Клиника сегодня")).toHaveTextContent(/75\s000\s₸/));
    expect(card("Клиника сегодня")).toHaveTextContent("платежей: 21");
    expect(card("Возвраты сегодня")).toHaveTextContent(/3\s000\s₸/);
    await vi.waitFor(() => expect(card("Возвраты сегодня")).toHaveTextContent("ждут решения: 2"));
    expect(requested()).toContain("/api/refund-requests?status=pending");
    // счётчик на вкладке «Возвраты»
    await vi.waitFor(() => expect(screen.getByRole("link", { name: /Возвраты/ })).toHaveTextContent("2"));
  });
});
