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

describe("касса: дашборд", () => {
  it("смена открыта: принято, наличные в кассе, не оплачено, заявки", async () => {
    mockBackend(reception, {
      ...shiftMocks,
      "/api/reports/reception-summary": summary({ id: 1, openedAt: "2026-10-25T08:00:00", receivedTotal: 10_000_000 }),
      "/api/cash-shifts/1/report": report,
      "/api/refund-requests?status=pending&mine=true": [{ id: 1 }, { id: 2 }, { id: 3 }],
    });

    renderApp("/cash-register");

    const received = await screen.findByText("Принято за смену");
    await vi.waitFor(() => expect(card("Принято за смену")).toHaveTextContent(/100\s000\s₸/));
    expect(card("Принято за смену")).toHaveTextContent("платежей: 14");
    expect(received.closest("div")).toHaveClass("bg-emerald-50");
    expect(card("Наличных в кассе")).toHaveTextContent(/65\s000\s₸/);
    expect(card("Наличных в кассе")).toHaveTextContent(/стартовый остаток 5\s000\s₸/);
    expect(card("Не оплачено")).toHaveTextContent("12");
    expect(card("Не оплачено")).toHaveTextContent("скидок ждёт главврача: 2");
    await vi.waitFor(() => expect(card("Мои заявки на возврат")).toHaveTextContent("3"));
    expect(card("Мои заявки на возврат")).toHaveTextContent(/возвращено за смену 2\s000\s₸/);
  });

  it("разбивка по способам оплаты с долями", async () => {
    mockBackend(reception, {
      ...shiftMocks,
      "/api/reports/reception-summary": summary({ id: 1, openedAt: "2026-10-25T08:00:00", receivedTotal: 10_000_000 }),
      "/api/cash-shifts/1/report": report,
      "/api/refund-requests?status=pending&mine=true": [],
    });

    renderApp("/cash-register");

    const legend = (await screen.findByText(/Наличные:/)).closest("ul")!;
    expect(within(legend).getByText(/Наличные:/).closest("li")).toHaveTextContent("(60%)");
    expect(within(legend).getByText(/Карта:/).closest("li")).toHaveTextContent("(30%)");
    expect(within(legend).getByText(/Перевод:/).closest("li")).toHaveTextContent("(10%)");
    expect(screen.getByRole("img", { name: "Доли способов оплаты" })).toBeInTheDocument();
  });

  it("смена не открыта: прочерки и подсказка, отчёт смены не запрашивается", async () => {
    mockBackend(reception, {
      ...shiftMocks,
      "/api/reports/reception-summary": summary(null),
      "/api/refund-requests?status=pending&mine=true": [],
    });

    renderApp("/cash-register");

    expect(await screen.findByText(/Откройте смену — здесь появится разбивка/)).toBeInTheDocument();
    expect(card("Принято за смену")).toHaveTextContent("—");
    expect(card("Принято за смену")).toHaveTextContent("смена не открыта");
    expect(card("Принято за смену")).not.toHaveClass("bg-emerald-50");
    expect(requested().some((u) => /\/cash-shifts\/\d+\/report/.test(u))).toBe(false);
  });

  it("сводка недоступна (500): страница жива, цифры — прочерки", async () => {
    mockBackend(reception, { ...shiftMocks, "/api/refund-requests?status=pending&mine=true": [] });

    renderApp("/cash-register");

    expect(await screen.findByRole("heading", { name: "Касса" })).toBeInTheDocument();
    expect(card("Не оплачено")).toHaveTextContent("—");
    expect(screen.getByRole("button", { name: "Смена" })).toBeInTheDocument();
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

  it("главврач: заявки, ждущие его решения (все, не только свои), и выручка клиники за сегодня", async () => {
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
    expect(card("Карта и перевод")).toHaveTextContent(/25\s000\s₸/);
    expect(card("Возвраты сегодня")).toHaveTextContent(/3\s000\s₸/);
    await vi.waitFor(() => expect(card("Возвраты ждут решения")).toHaveTextContent("2"));
    expect(requested()).toContain("/api/refund-requests?status=pending");
  });
});
