import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyReport } from "@/lib/api/reports";
import type { RefundRequest } from "@/lib/api/refund-requests";
import {
  fetchMock,
  makeEmployee,
  mockBackend,
  renderApp,
  setupHarness,
} from "@/test/app-harness";

beforeEach(setupHarness);
afterEach(() => vi.unstubAllGlobals());

const headDoctor = makeEmployee("head_doctor", { id: 9 });
const reception = makeEmployee("reception", { id: 2 });

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

const pending: RefundRequest = {
  id: 1,
  invoiceId: 7,
  paymentId: 3,
  amount: 500_000,
  reason: "Услуга не оказана",
  requestedBy: "Ресепшенов И.П.",
  status: "pending",
  createdAt: "2026-10-24T10:00:00Z",
  decidedBy: null,
  decidedAt: null,
  resultingPaymentId: null,
};

describe("возвраты: вкладка кассы", () => {
  it("главврач видит заявку и кнопки решения", async () => {
    mockBackend(headDoctor, { "/api/refund-requests": [pending] });

    renderApp("/cash-register/refunds");

    expect(await screen.findByText(/Услуга не оказана/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Одобрить" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отклонить" })).toBeInTheDocument();
  });

  it("ресепшен: очередь решений недоступна (его заявки — вкладка в кассе)", async () => {
    mockBackend(reception, { "/api/refund-requests": [pending] });

    renderApp("/cash-register/refunds");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(requested()).not.toContain("/api/refund-requests");
  });

  it("врач: «Нет доступа»", async () => {
    mockBackend(makeEmployee("doctor"));

    renderApp("/cash-register/refunds");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(requested()).not.toContain("/api/refund-requests");
  });
});

describe("старые адреса", () => {
  it("/refunds ведёт на вкладку «Возвраты»", async () => {
    mockBackend(headDoctor, { "/api/refund-requests": [pending] });

    const { router } = renderApp("/refunds");

    expect(await screen.findByText(/Услуга не оказана/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/cash-register/refunds");
    expect(screen.getByRole("link", { name: /Возвраты/ })).toHaveAttribute("aria-current", "page");
  });

  it("/reports/daily ведёт на вкладку «Отчёт за день»", async () => {
    mockBackend(headDoctor, { "/api/reports/daily?*": { date: "2026-10-24", cashTotal: 0, cardTotal: 0, transferTotal: 0, total: 0, refundsTotal: 0, paymentsCount: 0, invoicesTouchedCount: 0 } });

    const { router } = renderApp("/reports/daily");

    expect(await screen.findByText("Итого принято")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/cash-register/report");
  });

  it("?tab=invoices со старых закладок ведёт на /cash-register/invoices", async () => {
    mockBackend(reception, { "/api/invoices?*": [] });

    const { router } = renderApp("/cash-register?tab=invoices");

    expect(await screen.findByText("Счетов по выбранным условиям нет")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/cash-register/invoices");
  });
});

describe("касса: вкладки главврача", () => {
  it("пять вкладок в порядке Смена · Счета · Возвраты · Отчёт за день · Мои заявки", async () => {
    mockBackend(headDoctor, { "/api/cash-shifts/current": null, "/api/cash-shifts": [] });

    renderApp("/cash-register");

    const nav = within(await screen.findByRole("navigation", { name: "Разделы кассы" }));
    const names = nav.getAllByRole("link").map((link) => link.textContent);
    expect(names).toEqual(["Смена", "Счета", "Возвраты", "Отчёт за день", "Мои заявки"]);
  });

  it("решение по возврату обновляет счётчик на вкладке", async () => {
    let decided = false;
    mockBackend(headDoctor, {
      "/api/refund-requests?status=pending": () =>
        Response.json(decided ? [] : [pending]),
      "/api/refund-requests": [pending],
      "POST /api/refund-requests/1/reject": () => {
        decided = true;
        return Response.json({ ...pending, status: "rejected" });
      },
    });
    const user = userEvent.setup();

    renderApp("/cash-register/refunds");
    const tab = await screen.findByRole("link", { name: /Возвраты/ });
    await vi.waitFor(() => expect(tab).toHaveTextContent("1"));
    await user.click(await screen.findByRole("button", { name: "Отклонить" }));

    await vi.waitFor(() => expect(tab).not.toHaveTextContent("1"));
  });
});

describe("отчёт за день: вкладка кассы", () => {
  const report: DailyReport = {
    date: "2026-10-24",
    cashTotal: 1_000_000,
    cardTotal: 500_000,
    transferTotal: 0,
    total: 1_500_000,
    refundsTotal: 0,
    paymentsCount: 3,
    invoicesTouchedCount: 2,
  };

  it("главврач: запрашивается сегодняшняя дата в локальном часовом поясе", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 01:30 по локальному времени: UTC-дата ещё может быть вчерашней
    vi.setSystemTime(new Date(2026, 9, 24, 1, 30));
    mockBackend(headDoctor, { "/api/reports/daily?date=2026-10-24": report });

    try {
      renderApp("/cash-register/report");
      expect(await screen.findByText("Итого принято")).toBeInTheDocument();
      await vi.waitFor(() => {
        expect(requested()).toContain("/api/reports/daily?date=2026-10-24");
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("ресепшен: «Нет доступа» (только главврач)", async () => {
    mockBackend(reception);

    renderApp("/cash-register/report");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(requested().some((url) => url.startsWith("/api/reports/daily"))).toBe(false);
  });
});
