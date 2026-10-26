import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  pickDoctor,
  fetchMock,
  json,
  makeAppointment,
  makeEmployee,
  makePatient,
  mockBackend,
  renderApp,
  setupHarness,
} from "@/test/app-harness";

// «Сейчас» зафиксировано: форма не предлагает прошедшие слоты за сегодня, и
// тесты не должны зависеть от времени суток.
beforeEach(() => {
  setupHarness();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 25, 6, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const reception = makeEmployee("reception", { id: 2 });
const patient = makePatient({ id: "5", fullName: "Абдрахманов Мурат Серикович", iin: "870514300123" });
const doctors = [
  { id: 11, shortName: "Серикова А.И.", specialty: "Терапевт" },
  { id: 12, shortName: "Нурланов Б.С.", specialty: "Терапевт" },
];
const summary = {
  date: "2026-10-25", shift: null, queue: { waiting: 0, inProgress: 0 }, doctors: [],
  invoices: { unpaidCount: 0, awaitingApprovalCount: 0, awaitingPayment: [] },
};

const upcoming = makeAppointment({
  id: "31", patientId: "5", employeeId: "11", date: "26.10.2026", queueNumber: 2,
  doctor: "Серикова А.И.", patient: "Абдрахманов М.С.", status: "scheduled", office: "Кабинет 3",
});

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

function bodies(method: string, url: string): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(([u, init]) => String(u) === url && init?.method === method)
    .map(([, init]) => JSON.parse(String(init!.body)));
}

/** Стойка: пациент найден по ИИН; /api/appointments отдаёт ближайшие приёмы
 * пациента или завершённые за 2 часа — по параметрам запроса. */
function standBackend(options: { upcoming?: unknown[]; recent?: unknown[]; extra?: Record<string, unknown> } = {}) {
  const { upcoming: mine = [upcoming], recent = [], extra = {} } = options;
  mockBackend(reception, {
    "/api/reports/reception-summary": summary,
    "/api/patients?*": { items: [patient], total: 1, page: 1, limit: 5 },
    "/api/patients/5": patient,
    "/api/patients/5/history": [],
    "/api/appointments?*": (url: string) => json(200, url.includes("completedWithin") ? recent : mine),
    "/api/employees?role=doctor": doctors,
    "/api/appointments/queue-info?*": { works: true, waiting: 1, nextNumber: 2 },
    "/api/invoices?*": [],
    ...extra,
  });
}

async function findOnStand(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "870514300123{Enter}");
  await screen.findByText("Абдрахманов Мурат Серикович");
}

describe("стойка: ближайший приём пациента", () => {
  it("показывает ближайший приём с врачом и кабинетом и кнопки «Перенести» и «Отменить»", async () => {
    standBackend();
    const user = userEvent.setup();

    renderApp("/");
    await findOnStand(user);

    expect(await screen.findByText(/Записан 26 окт, №2 · Серикова А\.И\. · каб\. 3/)).toBeInTheDocument();
    for (const name of ["Записать", "Перенести", "Отменить"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Карточка" })).toBeInTheDocument();
    expect(requested().some((u) => u.includes("patientId=5") && u.includes("status=scheduled%2Cin_progress") && u.includes("from=2026-10-25"))).toBe(true);
  });

  it("будущих приёмов нет — строки и кнопок «Перенести»/«Отменить» нет", async () => {
    standBackend({ upcoming: [] });
    const user = userEvent.setup();

    renderApp("/");
    await findOnStand(user);

    await vi.waitFor(() => expect(requested().some((u) => u.includes("patientId=5"))).toBe(true));
    expect(screen.queryByText(/Записан 26 окт/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Перенести" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Отменить" })).toBeNull();
    expect(screen.getByRole("button", { name: "Записать" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Карточка" })).toBeInTheDocument();
  });

  it("приём уже идёт — «Сейчас на приёме», перенос и отмена недоступны", async () => {
    standBackend({ upcoming: [{ ...upcoming, status: "in_progress", date: "25.10.2026" }] });
    const user = userEvent.setup();

    renderApp("/");
    await findOnStand(user);

    expect(await screen.findByText(/Сейчас на приёме 25 окт/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Перенести" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Отменить" })).toBeNull();
  });

  it("отмена: причина обязательна, «Другое» требует текст; уходит код; подтверждение и обновление", async () => {
    standBackend({ extra: { "PATCH /api/appointments/31": { ...upcoming, status: "cancelled" } } });
    const user = userEvent.setup();

    renderApp("/");
    await findOnStand(user);
    await user.click(await screen.findByRole("button", { name: "Отменить" }));

    const dialog = await screen.findByRole("dialog", { name: "Отмена приёма" });
    const submit = within(dialog).getByRole("button", { name: "Отменить приём" });
    expect(submit).toBeDisabled(); // причина не выбрана
    expect(within(dialog).getAllByRole("radio")).toHaveLength(5);
    expect(within(dialog).queryByLabelText("Опишите причину")).toBeNull();

    await user.click(within(dialog).getByRole("radio", { name: "Другое" }));
    expect(submit).toBeDisabled(); // «Другое» без текста
    await user.type(within(dialog).getByLabelText("Опишите причину"), "Уехал");
    await user.click(within(dialog).getByRole("radio", { name: "Не дозвонились" }));
    expect(within(dialog).queryByLabelText("Опишите причину")).toBeNull();
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent("Приём на 26 окт, №2 отменён");
    expect(bodies("PATCH", "/api/appointments/31")).toEqual([
      expect.objectContaining({ status: "cancelled", cancellationReasonCode: "patient_no_contact" }),
    ]);
    expect(bodies("PATCH", "/api/appointments/31")[0]).not.toHaveProperty("cancellationReason");
    await vi.waitFor(() => {
      expect(requested().filter((u) => u.includes("patientId=5")).length).toBeGreaterThan(1);
    });
  });

  it("причина «Другое» уходит с текстом", async () => {
    standBackend({ extra: { "PATCH /api/appointments/31": { ...upcoming, status: "cancelled" } } });
    const user = userEvent.setup();

    renderApp("/");
    await findOnStand(user);
    await user.click(await screen.findByRole("button", { name: "Отменить" }));
    const dialog = await screen.findByRole("dialog", { name: "Отмена приёма" });
    await user.click(within(dialog).getByRole("radio", { name: "Другое" }));
    await user.type(within(dialog).getByLabelText("Опишите причину"), " Уехал в отпуск ");
    await user.click(within(dialog).getByRole("button", { name: "Отменить приём" }));

    await vi.waitFor(() => {
      expect(bodies("PATCH", "/api/appointments/31")[0]).toMatchObject({
        cancellationReasonCode: "other", cancellationReason: "Уехал в отпуск",
      });
    });
  });

  it("ошибка отмены (приём уже начался, 409) — в окне, окно остаётся", async () => {
    standBackend({
      extra: { "PATCH /api/appointments/31": () => json(409, { detail: "Отменить или перенести можно только запланированный приём" }) },
    });
    const user = userEvent.setup();

    renderApp("/");
    await findOnStand(user);
    await user.click(await screen.findByRole("button", { name: "Отменить" }));
    const dialog = await screen.findByRole("dialog", { name: "Отмена приёма" });
    await user.click(within(dialog).getByRole("radio", { name: "Пациент отменил" }));
    await user.click(within(dialog).getByRole("button", { name: "Отменить приём" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("только запланированный");
    expect(screen.getByRole("dialog", { name: "Отмена приёма" })).toBeInTheDocument();
  });

  it("перенос: врач подставлен, можно сменить; уходят дата, время и врач", async () => {
    standBackend({
      extra: { "PATCH /api/appointments/31": { ...upcoming, queueNumber: 4, employeeId: "12", doctor: "Нурланов Б.С.", date: "26.10.2026" } },
    });
    const user = userEvent.setup();

    renderApp("/");
    await findOnStand(user);
    await user.click(await screen.findByRole("button", { name: "Перенести" }));

    const dialog = await screen.findByRole("dialog", { name: "Перенос приёма" });
    const doctorField = await within(dialog).findByDisplayValue("Серикова А.И.");
    await user.clear(doctorField);
    await user.type(doctorField, "Нурл");
    await user.click(await within(dialog).findByText("Нурланов Б.С."));
    await vi.waitFor(() => expect(requested().some((u) => u.includes("employeeId=12"))).toBe(true));
    await user.click(within(dialog).getByRole("button", { name: "Перенести" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Приём перенесён на 26 окт, №4 · Нурланов Б.С.");
    expect(bodies("PATCH", "/api/appointments/31")).toEqual([
      expect.objectContaining({ date: "2026-10-26", employeeId: 12 }),
    ]);
  });
});

describe("/appointments: действия только у запланированных приёмов", () => {
  it("меню «⋯» (перенести, отменить) активно у scheduled; у completed — «Протокол», у cancelled меню недоступно", async () => {
    const done = makeAppointment({ id: "40", status: "completed", queueNumber: 1, employeeId: "11" });
    const cancelled = makeAppointment({ id: "41", status: "cancelled", queueNumber: 2, employeeId: "11" });
    const planned = makeAppointment({ id: "42", status: "scheduled", queueNumber: 3, employeeId: "11" });
    mockBackend(reception, {
      "/api/appointments?from=*": [done, cancelled, planned],
    });
    const user = userEvent.setup();

    renderApp("/appointments");

    await user.click(await screen.findByRole("tab", { name: /^Все/ }));
    const menus = await screen.findAllByRole("button", { name: /Ещё: перенести или отменить/ });
    // у записанного и у отменённого (там пункты недоступны)
    expect(menus).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Протокол" })).toHaveLength(1);
    // регистратору «Начать» не показываем — приём ведёт врач
    expect(screen.queryByRole("button", { name: "Начать" })).toBeNull();

    await user.click(menus[1]);
    expect(await screen.findByRole("menuitem", { name: "Перенести" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Отменить" })).toBeEnabled();
    expect(screen.queryByRole("menuitem", { name: "Вызвать вне очереди" })).toBeNull();
  });
});

describe("«Вышли от врача»", () => {
  const done = makeAppointment({
    id: "31", patientId: "5", employeeId: "11", status: "completed", patient: "Абдрахманов М.С.",
    doctor: "Серикова А.И.", date: "25.10.2026", queueNumber: 1, completedAt: "2026-10-25T05:50:00",
  });
  const other = makeAppointment({
    id: "32", patientId: "6", employeeId: "12", status: "completed", patient: "Ким Л.Д.",
    doctor: "Нурланов Б.С.", date: "25.10.2026", queueNumber: 2, completedAt: "2026-10-25T05:40:00",
  });
  const invoiceFor31 = {
    id: 418, invoiceNumber: "2026-000418", appointmentId: 31, status: "unpaid", patientName: "Абдрахманов М.С.",
  };

  it("запрашивает завершённые за 2 часа; у приёма со счётом — ссылка «Счёт №…», иначе «Выставить счёт»", async () => {
    standBackend({
      recent: [done, other],
      extra: { "/api/invoices?*": [invoiceFor31, { ...invoiceFor31, id: 500, appointmentId: 32, status: "cancelled" }] },
    });

    renderApp("/");

    const first = (await screen.findByText("Абдрахманов М.С.")).closest("li")!;
    expect(first).toHaveTextContent("Серикова А.И.");
    expect(within(first).getByRole("link", { name: "Счёт №418" })).toHaveAttribute("href", "/invoices/418");
    expect(within(first).queryByRole("button", { name: "Выставить счёт" })).toBeNull();
    // у второго счёт отменён — по приёму можно выставить новый
    const second = screen.getByText("Ким Л.Д.").closest("li")!;
    expect(within(second).getByRole("button", { name: "Выставить счёт" })).toBeInTheDocument();
    expect(within(second).getByRole("button", { name: "Записать повторно" })).toBeInTheDocument();
    expect(requested().some((u) => u.includes("completedWithin=120"))).toBe(true);
    expect(requested().some((u) => u.startsWith("/api/invoices") && decodeURIComponent(u).includes("appointmentId=31,32"))).toBe(true);
  });

  it("пусто — «Пока никто не завершил приём»", async () => {
    standBackend({ recent: [] });

    renderApp("/");

    expect(await screen.findByText("Пока никто не завершил приём")).toBeInTheDocument();
    expect(requested().some((u) => u.startsWith("/api/invoices"))).toBe(false);
  });

  it("«Записать повторно»: тот же врач и пациент, дата — через неделю", async () => {
    standBackend({ recent: [done] });
    const user = userEvent.setup();

    renderApp("/");
    await user.click(await screen.findByRole("button", { name: "Записать повторно" }));

    const dialog = await screen.findByRole("dialog", { name: "Запись на приём" });
    expect(within(dialog).getByText(/Абдрахманов Мурат Серикович/)).toBeInTheDocument();
    // врач — тот же (11); проверяем и дату
    expect(await within(dialog).findByDisplayValue("Серикова А.И.")).toBeInTheDocument();
    expect((dialog.querySelector('input[type="date"]') as HTMLInputElement).value).toBe("2026-11-01");
  });

  it("«Записать повторно» берёт врача прошлого приёма", async () => {
    standBackend({ recent: [{ ...done, employeeId: "12", doctor: "Нурланов Б.С." }] });
    const user = userEvent.setup();

    renderApp("/");
    await user.click(await screen.findByRole("button", { name: "Записать повторно" }));

    const dialog = await screen.findByRole("dialog", { name: "Запись на приём" });
    expect(await within(dialog).findByDisplayValue("Нурланов Б.С.")).toBeInTheDocument();
  });

  it("«Выставить счёт»: счёт создаётся с привязкой к приёму и открывается", async () => {
    standBackend({
      recent: [done],
      extra: {
        "/api/services": [{ id: 3, code: "CONS", name: "Приём терапевта", category: "consultation", price: 600000, durationMinutes: 30, isActive: true }],
        "POST /api/invoices": { id: 77 },
      },
    });
    const user = userEvent.setup();

    const { router } = renderApp("/");
    await user.click(await screen.findByRole("button", { name: "Выставить счёт" }));
    const dialog = await screen.findByRole("dialog", { name: "Новый счёт" });
    await user.type(within(dialog).getByPlaceholderText("Выберите услугу"), "Приём");
    await user.click(await within(dialog).findByText("Приём терапевта"));
    await user.click(within(dialog).getByRole("button", { name: "Добавить услугу" }));
    await user.click(within(dialog).getByRole("button", { name: "Создать черновик" }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/invoices/77"));
    expect(bodies("POST", "/api/invoices")).toEqual([
      expect.objectContaining({ patientId: 5, appointmentId: 31, items: [{ serviceId: 3, quantity: 1 }] }),
    ]);
  });

  it("не больше 3 строк, остальное — «и ещё N»", async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...done, id: String(100 + i), patient: `Пациент ${i}` }));
    standBackend({ recent: many });

    renderApp("/");

    await screen.findByText("Пациент 0");
    expect(screen.queryByText("Пациент 3")).toBeNull();
    expect(screen.getByText("и ещё 2")).toBeInTheDocument();
  });

  it("ошибка загрузки блока не роняет стойку", async () => {
    standBackend({ extra: { "/api/appointments?*": (url: string) => (url.includes("completedWithin") ? json(500, { detail: "БД недоступна" }) : json(200, [])) } });

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Стойка регистратуры" })).toBeInTheDocument();
    await vi.waitFor(() => {
      const block = screen.getByText("Вышли от врача").closest("section")!;
      expect(block).toHaveTextContent("Не удалось загрузить");
    });
  });
});

describe("запись: «Записать ещё одного»", () => {
  const mother = patient;
  const child = makePatient({ id: "9", fullName: "Абдрахманова Аружан Муратовна", iin: "150101600111" });
  const booked = (who: string, queueNumber: number) =>
    makeAppointment({ queueNumber, date: "26.10.2026", doctor: "Серикова А.И.", patient: who, patientId: "5" });

  it("после записи окно остаётся; «ещё одного» сбрасывает пациента и жалобу, но сохраняет врача и дату", async () => {
    let n = 0;
    standBackend({
      extra: {
        "/api/patients?*": (url: string) =>
          json(200, { items: url.includes("search=%D0%90%D1%80%D1%83") ? [child] : [mother], total: 1, page: 1, limit: 8 }),
        "/api/patients/9/history": [],
        "POST /api/appointments": () => json(200, booked(n++ === 0 ? "Абдрахманов М.С." : "Абдрахманова А.М.", n === 1 ? 1 : 2)),
      },
    });
    const user = userEvent.setup();

    renderApp("/");
    await findOnStand(user);
    await user.click(screen.getByRole("button", { name: "Записать" }));
    const dialog = await screen.findByRole("dialog", { name: "Запись на приём" });
    await pickDoctor(user, dialog, "Серикова А.И.");
    fireEvent.change(dialog.querySelector('input[type="date"]')!, { target: { value: "2026-10-26" } });
    await user.type(within(dialog).getByLabelText("Жалоба"), "Кашель у мамы");
    await user.click(within(dialog).getByRole("button", { name: "Записать" }));

    expect(await within(dialog).findByRole("status")).toHaveTextContent("Абдрахманов М.С.: пациент №1");
    await user.click(within(dialog).getByRole("button", { name: "Записать ещё одного" }));

    // пациент и жалоба сброшены, врач и дата остались
    const search = within(dialog).getByPlaceholderText("Начните вводить ФИО или ИИН");
    expect(search).toHaveValue("");
    expect(within(dialog).getByLabelText("Жалоба")).toHaveValue("");
    expect(within(dialog).getByDisplayValue("Серикова А.И.")).toBeInTheDocument();
    expect((dialog.querySelector('input[type="date"]') as HTMLInputElement).value).toBe("2026-10-26");

    // второй пациент находится серверным поиском
    await user.type(search, "Аружан");
    await user.click(await within(dialog).findByRole("button", { name: /Абдрахманова Аружан Муратовна/ }));
    await user.type(within(dialog).getByLabelText("Жалоба"), "Кашель у ребёнка");
    await user.click(within(dialog).getByRole("button", { name: "Записать" }));

    await within(dialog).findByRole("status");
    expect(bodies("POST", "/api/appointments")).toEqual([
      expect.objectContaining({ patientId: 5, employeeId: 11, date: "2026-10-26" }),
      expect.objectContaining({ patientId: 9, employeeId: 11, date: "2026-10-26", complaint: "Кашель у ребёнка" }),
    ]);

    await user.click(within(dialog).getByRole("button", { name: "Готово" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // сценарий завершён — поле поиска стойки очищено
    expect(screen.getByLabelText("ИИН или фамилия пациента")).toHaveValue("");
  });
});

describe("поиск пациента в форме записи на /appointments", () => {
  it("ищет на сервере по набранному тексту; список из 100 пациентов не загружается", async () => {
    mockBackend(reception, {
      "/api/employees/me/profile": { office: "Каб. 1" },
      "/api/appointments?from=*": [],
      "/api/employees?role=doctor": doctors,
      "/api/appointments/queue-info?*": { works: true, waiting: 0, nextNumber: 1 },
      "/api/patients?*": { items: [patient], total: 1, page: 1, limit: 8 },
    });
    const user = userEvent.setup();

    renderApp("/appointments");
    await user.click(await screen.findByRole("button", { name: "Записать пациента" }));
    const dialog = await screen.findByRole("dialog", { name: "Запись на приём" });
    await user.type(within(dialog).getByPlaceholderText("Начните вводить ФИО или ИИН"), "Абд");

    await user.click(await within(dialog).findByRole("button", { name: /Абдрахманов Мурат Серикович/ }));

    expect(requested().some((u) => u.startsWith("/api/patients") && u.includes("limit=100"))).toBe(false);
    expect(requested().some((u) => u.startsWith("/api/patients") && u.includes("limit=8") && u.includes("search="))).toBe(true);
    // врач сам не подставляется
    expect(within(dialog).getByPlaceholderText("Начните вводить фамилию врача")).toHaveValue("");
  });

  it("слишком короткий запрос на сервер не уходит", async () => {
    mockBackend(reception, {
      "/api/employees/me/profile": { office: "Каб. 1" },
      "/api/appointments?from=*": [],
      "/api/employees?role=doctor": doctors,
    });
    const user = userEvent.setup();

    renderApp("/appointments");
    await user.click(await screen.findByRole("button", { name: "Записать пациента" }));
    const dialog = await screen.findByRole("dialog", { name: "Запись на приём" });
    await user.type(within(dialog).getByPlaceholderText("Начните вводить ФИО или ИИН"), "А");

    expect(requested().some((u) => u.startsWith("/api/patients"))).toBe(false);
  });
});
