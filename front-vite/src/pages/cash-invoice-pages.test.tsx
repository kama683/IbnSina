import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice, Payment } from "@/lib/api/invoices";
import type { CashShift } from "@/lib/api/cash-shifts";
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

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

const invoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 7,
  invoiceNumber: "2026-000007",
  patientId: 5,
  appointmentId: null,
  status: "draft",
  subtotal: 1_000_000,
  discountTotal: 0,
  total: 1_000_000,
  discountApprovedBy: null,
  discountApprovedAt: null,
  createdBy: "Ресепшенов И.П.",
  createdAt: "2026-10-24T09:00:00Z",
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  items: [
    {
      id: 1,
      serviceId: 1,
      serviceName: "Консультация терапевта",
      priceSnapshot: 1_000_000,
      quantity: 1,
      discountAmount: 0,
      lineTotal: 1_000_000,
      performerEmployeeId: null,
    },
  ],
  ...overrides,
});

const payment: Payment = {
  id: 1,
  invoiceId: 7,
  amount: 1_000_000,
  method: "cash",
  cashShiftId: 3,
  createdBy: "Ресепшенов И.П.",
  createdAt: "2026-10-24T09:30:00Z",
  reversalOfPaymentId: null,
  refundReason: null,
  approvedBy: null,
};

const shift = (overrides: Partial<CashShift> = {}): CashShift => ({
  id: 3,
  cashierEmployeeId: 2,
  cashierName: "Ресепшенов И.П.",
  openedAt: "2026-10-24T08:00:00Z",
  openingBalance: 0,
  closedAt: null,
  actualCash: null,
  status: "open",
  ...overrides,
});

describe("касса", () => {
  it("ресепшен: текущая смена и история без дубля текущей", async () => {
    mockBackend(reception, {
      "/api/cash-shifts/current": shift(),
      "/api/cash-shifts": [
        shift(),
        shift({ id: 2, status: "closed", closedAt: "2026-10-23T18:00:00Z", actualCash: 0 }),
      ],
    });

    renderApp("/cash-register");

    expect(await screen.findByRole("heading", { name: "Касса" })).toBeInTheDocument();
    expect(requested()).toEqual(
      expect.arrayContaining(["/api/cash-shifts/current", "/api/cash-shifts"]),
    );
  });

  it("врач: «Нет доступа», касса не запрашивается", async () => {
    mockBackend(makeEmployee("doctor"));

    renderApp("/cash-register");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(requested().some((url) => url.startsWith("/api/cash-shifts"))).toBe(false);
  });
});

describe("счёт", () => {
  it("черновик: не запрашивает платежи и заявки на возврат; «Выставить» перезапрашивает счёт", async () => {
    let issued = false;
    mockBackend(reception, {
      "/api/invoices/7": () => json(200, invoice({ status: issued ? "unpaid" : "draft" })),
      "/api/patients/5": makePatient(),
      "/api/invoices/7/payments": [],
      "/api/refund-requests": [],
      "POST /api/invoices/7/issue": () => {
        issued = true;
        return json(200, invoice({ status: "unpaid" }));
      },
    });
    const user = userEvent.setup();

    renderApp("/invoices/7");

    const issueButton = await screen.findByRole("button", { name: "Выставить" });
    expect(requested()).not.toContain("/api/invoices/7/payments");
    expect(requested()).not.toContain("/api/refund-requests");

    await user.click(issueButton);

    // после выставления счёт перечитан, и теперь нужны платежи и возвраты
    await vi.waitFor(() => {
      expect(requested()).toContain("/api/invoices/7/payments");
    });
    expect(await screen.findByText("Оплата")).toBeInTheDocument();
    expect(requested().filter((url) => url === "/api/invoices/7")).toHaveLength(2);
  });

  it("выставленный: платежи и заявки на возврат только по этому счёту", async () => {
    mockBackend(reception, {
      "/api/invoices/7": invoice({ status: "paid" }),
      "/api/patients/5": makePatient(),
      "/api/invoices/7/payments": [payment],
      "/api/refund-requests": [],
    });

    renderApp("/invoices/7");

    expect(await screen.findByText("Оплата")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Квитанция/ })).toHaveAttribute(
      "href",
      "/invoices/7/receipt",
    );
  });

  it("несуществующий счёт (404) → «Счёт не найден»", async () => {
    mockBackend(reception, {
      "/api/invoices/999": () => json(404, { detail: "Счёт не найден" }),
    });

    renderApp("/invoices/999");

    expect(await screen.findByText("Счёт не найден.")).toBeInTheDocument();
  });
});

describe("квитанция", () => {
  it("показывает номер, пациента и оплаты", async () => {
    mockBackend(reception, {
      "/api/invoices/7": invoice({ status: "paid" }),
      "/api/patients/5": makePatient(),
      "/api/invoices/7/payments": [payment],
    });

    renderApp("/invoices/7/receipt");

    expect(await screen.findByText(/Квитанция № 2026-000007/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Печать/ })).toBeInTheDocument();
  });
});
