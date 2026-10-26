import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InvoiceListRow } from "@/lib/api/invoices";
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

const reception = makeEmployee("reception", { id: 2 });

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

const row = (overrides: Partial<InvoiceListRow> = {}): InvoiceListRow => ({
  id: 18,
  invoiceNumber: "2026-000418",
  patientId: 5,
  appointmentId: null,
  status: "unpaid",
  subtotal: 1_200_000,
  discountTotal: 0,
  total: 1_200_000,
  discountApprovedBy: null,
  discountApprovedAt: null,
  createdBy: "Регистратор Р.",
  createdAt: "2026-10-25T10:15:00",
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  items: [],
  patientName: "Ким Л.",
  paidAmount: 0,
  awaitingApproval: false,
  ...overrides,
});

const shiftMocks = { "/api/cash-shifts/current": null, "/api/cash-shifts": [] };

describe("касса: вкладки", () => {
  it("по умолчанию «Смена»; регистратору — «Смена», «Счета», «Мои заявки» (без «Возвратов» и отчёта)", async () => {
    mockBackend(reception, shiftMocks);

    renderApp("/cash-register");

    expect(await screen.findByRole("link", { name: "Смена" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Счета/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Мои заявки" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Возвраты/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Отчёт за день" })).toBeNull();
    await vi.waitFor(() => expect(requested()).toContain("/api/cash-shifts/current"));
  });

  it("/cash-register/invoices открывает «Счета»: по умолчанию неоплаченные, страницами по 25", async () => {
    mockBackend(reception, {
      "/api/invoices?*": [
        row(),
        row({ id: 19, invoiceNumber: "2026-000419", status: "partial", patientName: "Оспанов Т.", paidAmount: 150_000, total: 1_000_000 }),
        row({ id: 21, invoiceNumber: "2026-000421", status: "draft", patientName: "Ли В.", awaitingApproval: true }),
      ],
    });

    renderApp("/cash-register/invoices");

    expect(await screen.findByText("Ким Л.")).toBeInTheDocument();
    const url = requested().find((u) => u.startsWith("/api/invoices"))!;
    const query = new URLSearchParams(url.split("?")[1]);
    expect(query.get("status")).toBe("unpaid,partial");
    expect(query.get("limit")).toBe("26"); // 25 + 1, чтобы узнать, есть ли следующая страница
    expect(screen.getByRole("link", { name: "№418" })).toHaveAttribute("href", "/invoices/18");
    expect(screen.getByText("Ждёт главврача")).toBeInTheDocument();
    expect(screen.getByText("Оплачен частично")).toBeInTheDocument();
  });

  it("«Показать ещё» только когда есть следующая страница", async () => {
    const page = Array.from({ length: 26 }, (_, i) => row({ id: 200 + i, invoiceNumber: `2026-00${300 + i}`, patientName: `П${i}` }));
    mockBackend(reception, { "/api/invoices?*": page });
    const user = userEvent.setup();

    renderApp("/cash-register/invoices");

    await screen.findByText("П0");
    expect(screen.queryByText("П25")).toBeNull(); // 26-я строка лишь маркер продолжения
    await user.click(screen.getByRole("button", { name: "Показать ещё" }));
    await vi.waitFor(() => {
      expect(requested().some((u) => u.includes("limit=51"))).toBe(true);
    });
  });

  it("смена фильтра перезапрашивает счета с нужными статусами", async () => {
    mockBackend(reception, { "/api/invoices?*": [] });
    const user = userEvent.setup();

    renderApp("/cash-register/invoices");
    await screen.findByText("Счетов по выбранным условиям нет");
    await user.click(screen.getByRole("button", { name: "Возвраты и отмены" }));

    await vi.waitFor(() => {
      expect(requested().some((u) => decodeURIComponent(u).includes("status=refunded,cancelled"))).toBe(true);
    });
  });

  it("«Мои заявки»: запрашивает только свои заявки (mine=true)", async () => {
    const mine: RefundRequest = {
      id: 3, invoiceId: 7, paymentId: 4, amount: 500_000, reason: "Услуга не оказана",
      requestedBy: "Регистратор Р.", status: "pending", createdAt: "2026-10-25T11:00:00",
      decidedBy: null, decidedAt: null, resultingPaymentId: null,
    };
    mockBackend(reception, { "/api/refund-requests?mine=true": [mine] });

    renderApp("/cash-register/requests");

    expect(await screen.findByText("Услуга не оказана")).toBeInTheDocument();
    expect(screen.getByText("На рассмотрении")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть счёт" })).toHaveAttribute("href", "/invoices/7");
    expect(requested()).toContain("/api/refund-requests?mine=true");
  });

  it("«Мои заявки»: пустое состояние", async () => {
    mockBackend(reception, { "/api/refund-requests?mine=true": [] });

    renderApp("/cash-register/requests");

    expect(await screen.findByText(/Вы ещё не создавали заявок/)).toBeInTheDocument();
  });

  it("переключение вкладки меняет URL", async () => {
    mockBackend(reception, { ...shiftMocks, "/api/invoices?*": [] });
    const user = userEvent.setup();

    const { router } = renderApp("/cash-register");
    await user.click(await screen.findByRole("link", { name: /Счета/ }));

    expect(router.state.location.pathname).toBe("/cash-register/invoices");
    expect(screen.getByRole("link", { name: /Счета/ })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("link", { name: "Смена" }));
    expect(router.state.location.pathname).toBe("/cash-register");
  });
});
