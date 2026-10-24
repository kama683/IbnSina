import { screen, within } from "@testing-library/react";
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
const year = new Date().getFullYear();

const patient = makePatient({
  id: "5", fullName: "Абдрахманов Мурат Серикович", iin: "870514300123", ageLabel: "39 лет", area: "Участок №4",
});
const doctors = [
  { id: 11, shortName: "Серикова А.И.", area: "Участок №4", specialty: "Терапевт" },
  { id: 12, shortName: "Нурланов Б.С.", area: "Участок №1", specialty: "Терапевт" },
];
const summary = {
  date: `${year}-10-25`, shift: null, queue: { waiting: 0, inProgress: 0 }, doctors: [],
  invoices: { unpaidCount: 0, awaitingApprovalCount: 0, awaitingPayment: [] },
};
const booked = makeAppointment({ id: "77", time: "09:30", date: `27.10.${year}`, doctor: "Серикова А.И.", patientId: "5" });

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

function postBodies(url: string): unknown[] {
  return fetchMock.mock.calls
    .filter(([u, init]) => String(u) === url && init?.method === "POST")
    .map(([, init]) => JSON.parse(String(init!.body)));
}

function standBackend(extra: Record<string, unknown> = {}) {
  mockBackend(reception, {
    "/api/reports/reception-summary": summary,
    "/api/patients?*": { items: [patient], total: 1, page: 1, limit: 5, areas: [] },
    "/api/patients/5/history": [],
    "/api/employees?role=doctor": doctors,
    "/api/appointments/available-slots?*": ["09:00", "09:30", "10:00"],
    "POST /api/appointments": booked,
    ...extra,
  });
}

async function findPatientOnStand(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "870514300123{Enter}");
  await screen.findByText("Абдрахманов Мурат Серикович");
}

describe("запись прямо со стойки", () => {
  it("«Записать» открывает модалку с подставленным пациентом и врачом участка; запись → подтверждение, поле очищено и в фокусе", async () => {
    standBackend();
    const user = userEvent.setup();

    renderApp("/");
    await findPatientOnStand(user);
    await user.click(screen.getByRole("button", { name: "Записать" }));

    const dialog = await screen.findByRole("dialog", { name: "Запись на приём" });
    // пациент подставлен и не редактируется: это текст, а не поле выбора
    expect(within(dialog).getByText(/Абдрахманов Мурат Серикович/)).toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText("Начните вводить ФИО или ИИН")).toBeNull();
    // врач участка пациента выбран по умолчанию (участок №4 → Серикова)
    expect(await within(dialog).findByDisplayValue("Серикова А.И.")).toBeInTheDocument();

    // жалоба обязательна: без неё «Записать» неактивна
    const submit = within(dialog).getByRole("button", { name: "Записать" });
    await user.selectOptions(await within(dialog).findByLabelText("Время"), "09:30");
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByLabelText("Жалоба"), "Головная боль");
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent(`Записан на 09:30, 27 октября · Серикова А.И.`);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(postBodies("/api/appointments")).toEqual([
      expect.objectContaining({ patientId: 5, employeeId: 11, time: "09:30", complaint: "Головная боль" }),
    ]);
    // сценарий завершён: поле пустое, фокус в нём, карточка пациента убрана
    const input = screen.getByLabelText("ИИН или фамилия пациента");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.queryByText("Абдрахманов Мурат Серикович")).toBeNull();
    // счётчики и «врачи сейчас» обновлены
    await vi.waitFor(() => {
      expect(requested().filter((u) => u === "/api/reports/reception-summary").length).toBeGreaterThan(1);
    });
  });

  it("врача можно сменить: слоты запрашиваются у выбранного врача", async () => {
    standBackend();
    const user = userEvent.setup();

    renderApp("/");
    await findPatientOnStand(user);
    await user.click(screen.getByRole("button", { name: "Записать" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByDisplayValue("Серикова А.И.");
    await vi.waitFor(() => expect(requested().some((u) => u.includes("employeeId=11"))).toBe(true));

    const doctor = within(dialog).getByDisplayValue("Серикова А.И.");
    await user.clear(doctor);
    await user.type(doctor, "Нурл");
    await user.click(await within(dialog).findByText("Нурланов Б.С."));

    await vi.waitFor(() => expect(requested().some((u) => u.includes("employeeId=12"))).toBe(true));
  });

  it("слот заняли, пока форма была открыта (409): ошибка в окне, форма остаётся", async () => {
    standBackend({ "POST /api/appointments": () => json(409, { detail: "На это время уже есть приём" }) });
    const user = userEvent.setup();

    renderApp("/");
    await findPatientOnStand(user);
    await user.click(screen.getByRole("button", { name: "Записать" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(await within(dialog).findByLabelText("Время"), "09:00");
    await user.type(within(dialog).getByLabelText("Жалоба"), "Кашель");
    await user.click(within(dialog).getByRole("button", { name: "Записать" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("На это время уже есть приём");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("«Отмена» закрывает модалку, пациент остаётся на стойке", async () => {
    standBackend();
    const user = userEvent.setup();

    renderApp("/");
    await findPatientOnStand(user);
    await user.click(screen.getByRole("button", { name: "Записать" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Отмена" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Абдрахманов Мурат Серикович")).toBeInTheDocument();
  });
});

describe("«не найден» → завести карточку → сразу запись", () => {
  const created = makePatient({ id: "99", fullName: "Новый Пациент Тестович", iin: "990101300999", area: "Участок №1" });

  it("создание подставляет введённый ИИН и ведёт сразу в запись, без перехода на карточку", async () => {
    standBackend({
      "/api/patients?*": { items: [], total: 0, page: 1, limit: 5, areas: [] },
      "POST /api/patients": created,
      "/api/patients/99/history": [],
    });
    const user = userEvent.setup();

    const { router } = renderApp("/");
    await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "990101300999{Enter}");
    await user.click(await screen.findByRole("button", { name: /Завести карточку/ }));

    // ИИН подставлен в форму (второе такое значение — само поле поиска на стойке)
    expect(await screen.findAllByDisplayValue("990101300999")).toHaveLength(2);
    await user.type(screen.getByLabelText("ФИО"), "Новый Пациент Тестович");
    await user.click(screen.getByRole("button", { name: "Создать" }));

    // сразу открылась запись с этим пациентом; страница не менялась
    const dialog = await screen.findByRole("dialog", { name: "Запись на приём" });
    expect(within(dialog).getByText(/Новый Пациент Тестович/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(postBodies("/api/patients")).toEqual([expect.objectContaining({ iin: "990101300999" })]);
    // врач участка нового пациента (участок №1 → Нурланов)
    expect(await within(dialog).findByDisplayValue("Нурланов Б.С.")).toBeInTheDocument();
  });

  it("если запись отменили, созданный пациент остаётся на стойке с кнопкой «Записать»", async () => {
    standBackend({
      "/api/patients?*": { items: [], total: 0, page: 1, limit: 5, areas: [] },
      "POST /api/patients": created,
      "/api/patients/99/history": [],
    });
    const user = userEvent.setup();

    renderApp("/");
    await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "990101300999{Enter}");
    await user.click(await screen.findByRole("button", { name: /Завести карточку/ }));
    await user.type(screen.getByLabelText("ФИО"), "Новый Пациент Тестович");
    await user.click(screen.getByRole("button", { name: "Создать" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Запись на приём" })).getByRole("button", { name: "Отмена" }));

    expect(await screen.findByText("Новый Пациент Тестович")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записать" })).toBeEnabled();
  });

  it("поиск по фамилии: она подставляется в ФИО новой карточки", async () => {
    standBackend({ "/api/patients?*": { items: [], total: 0, page: 1, limit: 5, areas: [] } });
    const user = userEvent.setup();

    renderApp("/");
    await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "Несуществующий{Enter}");
    await user.click(await screen.findByRole("button", { name: /Завести карточку/ }));

    expect(await screen.findByLabelText("ФИО")).toHaveValue("Несуществующий");
  });
});

describe("шапка карточки пациента", () => {
  const card = {
    "/api/patients/5": patient,
    "/api/patients/5/history": [],
    "/api/patients/5/health-metrics": [],
    "/api/patients/5/vaccinations": [],
    "/api/employees?role=doctor": doctors,
    "/api/appointments/available-slots?*": ["09:00"],
    "POST /api/appointments": booked,
  };

  it("регистратор: «Записать на приём» открывает модалку, а не форму осмотра", async () => {
    mockBackend(reception, card);
    const user = userEvent.setup();

    const { router } = renderApp("/patients/5");
    await user.click(await screen.findByRole("button", { name: "Записать на приём" }));

    expect(await screen.findByRole("dialog", { name: "Запись на приём" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/patients/5");
    expect(screen.queryByRole("link", { name: /осмотр/i })).toBeNull();
  });

  it("запись из карточки: подтверждение под шапкой, данные карточки перезапрошены", async () => {
    mockBackend(reception, card);
    const user = userEvent.setup();

    renderApp("/patients/5");
    await user.click(await screen.findByRole("button", { name: "Записать на приём" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(await within(dialog).findByLabelText("Время"), "09:00");
    await user.type(within(dialog).getByLabelText("Жалоба"), "Плановый осмотр");
    await user.click(within(dialog).getByRole("button", { name: "Записать" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Записан на 09:30/);
    await vi.waitFor(() => {
      expect(requested().filter((u) => u === "/api/patients/5").length).toBeGreaterThan(1);
    });
  });

  it("врач: «Открыть осмотр» со ссылкой на форму осмотра, кнопки записи нет", async () => {
    mockBackend(makeEmployee("doctor"), card);

    renderApp("/patients/5");

    expect(await screen.findByRole("link", { name: "Открыть осмотр" })).toHaveAttribute(
      "href", "/patients/5/examination",
    );
    expect(screen.queryByRole("button", { name: "Записать на приём" })).toBeNull();
  });

  it("главврач: запись (по ТЗ), без кнопки осмотра", async () => {
    mockBackend(makeEmployee("head_doctor"), card);

    renderApp("/patients/5");

    expect(await screen.findByRole("button", { name: "Записать на приём" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Открыть осмотр" })).toBeNull();
  });

  it("медсестра: ни записи, ни осмотра", async () => {
    mockBackend(makeEmployee("nurse"), card);

    renderApp("/patients/5");

    await screen.findAllByText("Абдрахманов Мурат Серикович");
    expect(screen.queryByRole("button", { name: "Записать на приём" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Открыть осмотр" })).toBeNull();
  });

  it("у регистратора нет вкладок «Паспорт здоровья» и «Прививки» (бэкенд даёт 403)", async () => {
    mockBackend(reception, card);

    renderApp("/patients/5");

    await screen.findByRole("button", { name: "История болезни" });
    expect(screen.queryByRole("button", { name: "Паспорт здоровья" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Прививки" })).toBeNull();
  });
});

describe("страница /appointments", () => {
  const page = {
    "/api/employees/me/profile": { office: "Каб. 1" },
    "/api/patients?*": { items: [patient], total: 1, page: 1, limit: 100, areas: [] },
    "/api/appointments?from=*": [],
    "/api/employees?role=doctor": doctors,
    "/api/appointments/available-slots?*": ["09:00"],
  };

  it("регистратор: «Записать пациента» открывает общую форму с выбором пациента", async () => {
    mockBackend(reception, page);
    const user = userEvent.setup();

    renderApp("/appointments");
    await user.click(await screen.findByRole("button", { name: "Записать пациента" }));

    const dialog = await screen.findByRole("dialog", { name: "Запись на приём" });
    expect(within(dialog).getByPlaceholderText("Начните вводить ФИО или ИИН")).toBeInTheDocument();
  });

  it("медсестра: формы записи нет и список пациентов для неё не запрашивается", async () => {
    mockBackend(makeEmployee("nurse"), page);

    renderApp("/appointments");

    await screen.findByRole("button", { name: "Список" });
    expect(screen.queryByRole("button", { name: "Записать пациента" })).toBeNull();
    expect(requested().some((u) => u.startsWith("/api/patients"))).toBe(false);
    expect(requested().some((u) => u.includes("role=doctor"))).toBe(false);
  });
});
