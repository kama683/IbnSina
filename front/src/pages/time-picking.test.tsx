import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMock,
  json,
  makeAppointment,
  makeEmployee,
  makePatient,
  mockBackend,
  renderApp,
  setupHarness,
} from "@/test/app-harness";


// Форма записи не предлагает уже прошедшие слоты «на сегодня», поэтому исход
// тестов не должен зависеть от реального времени суток: фиксируем «сейчас».
function freezeClock() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 25, 6, 0));
}

beforeEach(() => {
  setupHarness();
  freezeClock();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const reception = makeEmployee("reception", { id: 2 });
const patient = makePatient({ id: "5", fullName: "Абдрахманов Мурат Серикович", iin: "870514300123", area: "Участок №4" });
const doctors = [{ id: 11, shortName: "Серикова А.И.", area: "Участок №4", specialty: "Терапевт" }];
const summary = {
  date: "2026-10-25", shift: null, queue: { waiting: 0, inProgress: 0 }, doctors: [],
  invoices: { unpaidCount: 0, awaitingApprovalCount: 0, awaitingPayment: [] },
};
const booked = makeAppointment({ time: "12:10", date: "26.10.2026", doctor: "Серикова А.И.", patientId: "5" });

function iso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Слоты по дате: { "2026-10-27": ["10:00"] }, остальные даты пустые. */
function slotsByDate(map: Record<string, string[]>) {
  return (url: string) => {
    const date = new URL(url, "http://x").searchParams.get("date") ?? "";
    return json(200, map[date] ?? []);
  };
}

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

function bookingBackend(slots: unknown, extra: Record<string, unknown> = {}) {
  mockBackend(reception, {
    "/api/reports/reception-summary": summary,
    "/api/patients?*": { items: [patient], total: 1, page: 1, limit: 5, areas: [] },
    "/api/patients/5/history": [],
    "/api/employees?role=doctor": doctors,
    "/api/appointments/available-slots?*": slots,
    "POST /api/appointments": booked,
    ...extra,
  });
}

async function openBooking(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "870514300123{Enter}");
  await user.click(await screen.findByRole("button", { name: "Записать" }));
  const dialog = await screen.findByRole("dialog", { name: "Запись на приём" });
  await within(dialog).findByDisplayValue("Серикова А.И.");
  return dialog;
}

describe("время приёма: можно выбрать самому", () => {
  it("«Другое время…» открывает ввод времени, запись уходит с введённым временем", async () => {
    bookingBackend(["09:00", "09:30"]);
    const user = userEvent.setup();

    renderApp("/");
    const dialog = await openBooking(user);
    await user.selectOptions(await within(dialog).findByLabelText("Время"), "Другое время…");

    const input = within(dialog).getByLabelText("Время") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "time");
    fireEvent.change(input, { target: { value: "12:10" } });
    await user.type(within(dialog).getByLabelText("Жалоба"), "Консультация");
    await user.click(within(dialog).getByRole("button", { name: "Записать" }));

    await vi.waitFor(() => {
      const post = fetchMock.mock.calls.find(([u, init]) => String(u) === "/api/appointments" && init?.method === "POST");
      expect(JSON.parse(String(post![1]!.body))).toMatchObject({ time: "12:10", employeeId: 11 });
    });
  });

  it("введённое вручную время не сбрасывается, когда обновляются слоты", async () => {
    bookingBackend(["09:00"]);
    const user = userEvent.setup();

    renderApp("/");
    const dialog = await openBooking(user);
    await user.selectOptions(await within(dialog).findByLabelText("Время"), "Другое время…");
    fireEvent.change(within(dialog).getByLabelText("Время"), { target: { value: "12:10" } });
    // слоты перезапрашиваются (например, после ошибки записи) — время остаётся
    await user.type(within(dialog).getByLabelText("Жалоба"), "Жалоба");

    expect(within(dialog).getByLabelText("Время")).toHaveValue("12:10");
    expect(within(dialog).getByRole("button", { name: "Записать" })).toBeEnabled();
  });

  it("«К списку» возвращает выбор из свободных слотов", async () => {
    bookingBackend(["09:00", "09:30"]);
    const user = userEvent.setup();

    renderApp("/");
    const dialog = await openBooking(user);
    await user.selectOptions(await within(dialog).findByLabelText("Время"), "Другое время…");
    await user.click(within(dialog).getByRole("button", { name: "К списку" }));

    const select = within(dialog).getByLabelText("Время");
    expect(select.tagName).toBe("SELECT");
    expect(within(select).getByRole("option", { name: "09:30" })).toBeInTheDocument();
  });

  it("ручное время вне графика: ошибка бэкенда показана, форма остаётся", async () => {
    bookingBackend(["09:00"], {
      "POST /api/appointments": () => json(400, { detail: "Время вне рабочих часов врача (08:00–14:00)" }),
    });
    const user = userEvent.setup();

    renderApp("/");
    const dialog = await openBooking(user);
    await user.selectOptions(await within(dialog).findByLabelText("Время"), "Другое время…");
    fireEvent.change(within(dialog).getByLabelText("Время"), { target: { value: "23:00" } });
    await user.type(within(dialog).getByLabelText("Жалоба"), "Ночью");
    await user.click(within(dialog).getByRole("button", { name: "Записать" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("вне рабочих часов");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("время приёма: нет слотов на дату", () => {
  it("дата по умолчанию без слотов — форма сама переходит на ближайший день со свободным временем", async () => {
    bookingBackend(slotsByDate({ [iso(2)]: ["10:00", "11:00"] }));
    const user = userEvent.setup();

    renderApp("/");
    const dialog = await openBooking(user);

    await vi.waitFor(() => {
      expect((dialog.querySelector('input[type="date"]') as HTMLInputElement).value).toBe(iso(2));
    });
    const select = await within(dialog).findByLabelText("Время");
    expect(within(select).getByRole("option", { name: "10:00" })).toBeInTheDocument();
    expect(within(dialog).queryByText(/Ближайшие дни/)).toBeNull();
  });

  it("дату, выбранную вручную, не трогаем — предлагаем ближайшие дни кнопками", async () => {
    bookingBackend(slotsByDate({ [iso(0)]: ["10:00"], [iso(5)]: ["09:00", "09:30", "10:00"] }));
    const user = userEvent.setup();

    renderApp("/");
    const dialog = await openBooking(user);
    await within(dialog).findByRole("option", { name: "10:00" }); // сегодня есть слоты

    const dateInput = dialog.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: iso(1) } }); // завтра слотов нет

    expect(await within(dialog).findByText(/Ближайшие дни/)).toBeInTheDocument();
    expect(dateInput.value).toBe(iso(1)); // осталась выбранной вручную
    const suggestion = await within(dialog).findByRole("button", { name: /3 слота/ });
    await user.click(suggestion);

    expect(dateInput.value).toBe(iso(5));
    expect(await within(dialog).findByRole("option", { name: "09:30" })).toBeInTheDocument();
  });

  it("нигде в ближайшие 2 недели: подсказка выбрать другого врача, ручной ввод остаётся", async () => {
    bookingBackend(slotsByDate({}));
    const user = userEvent.setup();

    renderApp("/");
    const dialog = await openBooking(user);

    expect(await within(dialog).findByText(/в ближайшие 14 дней нет — выберите другого врача/)).toBeInTheDocument();
    // но записать вручную всё равно можно
    expect(within(dialog).getByRole("option", { name: "Другое время…" })).toBeInTheDocument();
  });

  it("прошедшее время сегодня не предлагается", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 26, 12, 0));
    bookingBackend(slotsByDate({ "2026-10-26": ["09:00", "11:30", "12:30", "15:00"] }));
    const user = userEvent.setup({ advanceTimers: () => {} });

    renderApp("/");
    const dialog = await openBooking(user);

    const select = await within(dialog).findByLabelText("Время");
    const options = within(select).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(expect.arrayContaining(["12:30", "15:00"]));
    expect(options).not.toContain("09:00");
    expect(options).not.toContain("11:30");
  });
});

describe("перенос приёма", () => {
  const row = makeAppointment({ id: "31", employeeId: "11", date: "26.10.2026", time: "09:00" });

  function appointmentsBackend() {
    mockBackend(reception, {
      "/api/employees/me/profile": { office: "Каб. 1" },
      "/api/patients?*": { items: [patient], total: 1, page: 1, limit: 100, areas: [] },
      "/api/appointments?from=*": [row],
      "/api/appointments/available-slots?*": ["10:00", "10:30"],
      "PATCH /api/appointments/31": { ...row, time: "12:10" },
    });
  }

  it("в «Перенести» тоже есть «Другое время…»: уходит введённое время", async () => {
    appointmentsBackend();
    const user = userEvent.setup();

    renderApp("/appointments");
    await user.click(await screen.findByRole("button", { name: "Перенести" }));
    const dialog = await screen.findByText("Перенести приём");
    expect(dialog).toBeInTheDocument();

    const modal = dialog.closest("div")!.parentElement!.parentElement!;
    await user.selectOptions(await within(modal).findByLabelText("Время"), "Другое время…");
    fireEvent.change(within(modal).getByLabelText("Время"), { target: { value: "12:10" } });
    await user.click(within(modal).getByRole("button", { name: "Перенести" }));

    await vi.waitFor(() => {
      const patch = fetchMock.mock.calls.find(([u, init]) => String(u) === "/api/appointments/31" && init?.method === "PATCH");
      expect(JSON.parse(String(patch![1]!.body))).toMatchObject({ time: "12:10" });
    });
    expect(requested().some((u) => u.startsWith("/api/appointments/available-slots"))).toBe(true);
  });
});
