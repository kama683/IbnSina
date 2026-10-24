import { screen } from "@testing-library/react";
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

describe("возвраты", () => {
  it("главврач видит заявку и кнопки решения", async () => {
    mockBackend(headDoctor, { "/api/refund-requests": [pending] });

    renderApp("/refunds");

    expect(await screen.findByText(/Услуга не оказана/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Одобрить" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отклонить" })).toBeInTheDocument();
  });

  it("ресепшен: очередь решений недоступна (его заявки — вкладка в кассе)", async () => {
    mockBackend(reception, { "/api/refund-requests": [pending] });

    renderApp("/refunds");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(requested()).not.toContain("/api/refund-requests");
  });

  it("врач: «Нет доступа»", async () => {
    mockBackend(makeEmployee("doctor"));

    renderApp("/refunds");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(requested()).not.toContain("/api/refund-requests");
  });
});

describe("отчёт за день", () => {
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
      renderApp("/reports/daily");
      expect(await screen.findByRole("heading", { name: "Отчёт за день" })).toBeInTheDocument();
      await vi.waitFor(() => {
        expect(requested()).toContain("/api/reports/daily?date=2026-10-24");
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("ресепшен: «Нет доступа» (только главврач)", async () => {
    mockBackend(reception);

    renderApp("/reports/daily");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(requested().some((url) => url.startsWith("/api/reports"))).toBe(false);
  });
});
