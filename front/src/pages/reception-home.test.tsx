import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReceptionSummary } from "@/lib/api/reports";
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
const SUMMARY_URL = "/api/reports/reception-summary";

const summary = (overrides: Partial<ReceptionSummary> = {}): ReceptionSummary => ({
  date: "2026-10-25",
  shift: { id: 1, openedAt: "2026-10-25T08:40:00", receivedTotal: 12_840_000 },
  queue: { waiting: 7, inProgress: 3 },
  doctors: [
    { employeeId: 1, shortName: "Серикова А.И.", office: "Кабинет 3", inProgress: true, waiting: 2 },
    { employeeId: 2, shortName: "Нурланов Б.С.", office: "Кабинет 7", inProgress: false, waiting: 0 },
  ],
  invoices: {
    unpaidCount: 4,
    awaitingApprovalCount: 1,
    awaitingPayment: [
      { id: 21, number: "2026-000421", patientId: 1, patientName: "Ли В.", total: 900_000, paidAmount: 0, status: "draft", awaitingApproval: true },
      { id: 18, number: "2026-000418", patientId: 2, patientName: "Ким Л.", total: 1_200_000, paidAmount: 0, status: "unpaid", awaitingApproval: false },
      { id: 19, number: "2026-000419", patientId: 3, patientName: "Оспанов Т.", total: 1_000_000, paidAmount: 150_000, status: "partial", awaitingApproval: false },
    ],
  },
  ...overrides,
});

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe("«Стойка регистратуры»: шапка и метрики", () => {
  it("заголовок, дата и состояние смены; без врачебных блоков", async () => {
    mockBackend(reception, { [SUMMARY_URL]: summary() });

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Стойка регистратуры" })).toBeInTheDocument();
    expect(await screen.findByText(/Смена открыта в 08:40/)).toBeInTheDocument();
    for (const gone of ["Текущий приём", "Ближайшие", "Приёмы на сегодня"]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
    expect(screen.queryByText("Главная")).toBeNull();
  });

  it("четыре метрики; «В кассе» — принято за смену", async () => {
    mockBackend(reception, { [SUMMARY_URL]: summary() });

    renderApp("/");

    await screen.findByText(/Смена открыта/);
    expect(valueOf("Ждут приёма")).toBe("7");
    expect(valueOf("На приёме")).toBe("3");
    expect(valueOf("Не оплачено")).toBe("4");
    expect(valueOf("В кассе")).toMatch(/128\s400\s₸/);
    // смена открыта — карточка зелёная
    expect(screen.getByText("В кассе").parentElement).toHaveClass("bg-emerald-50");
  });

  it("смена не открыта: ссылка «Открыть» на кассу, «В кассе» — «—» и нейтральная", async () => {
    mockBackend(reception, { [SUMMARY_URL]: summary({ shift: null }) });

    renderApp("/");

    expect(await screen.findByText(/Смена не открыта/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть" })).toHaveAttribute("href", "/cash-register");
    expect(valueOf("В кассе")).toBe("—");
    expect(screen.getByText("В кассе").parentElement).not.toHaveClass("bg-emerald-50");
  });
});

describe("«Врачи сейчас» и «Ждут оплаты»", () => {
  it("врачи: занят/свободен, кабинет, сколько ждёт; строка ведёт в приёмы", async () => {
    mockBackend(reception, { [SUMMARY_URL]: summary() });

    renderApp("/");

    const busy = (await screen.findByText(/Серикова А\.И\./)).closest("a")!;
    expect(busy).toHaveAttribute("href", "/appointments");
    expect(busy).toHaveTextContent("каб. 3");
    expect(busy).toHaveTextContent("на приёме · 2 ждут");
    const free = screen.getByText(/Нурланов Б\.С\./).closest("a")!;
    expect(free).toHaveTextContent("свободен");
    expect(free).not.toHaveTextContent("ждут");
  });

  it("счета: короткий номер, остаток к оплате, «ждёт главврача» вместо суммы", async () => {
    mockBackend(reception, { [SUMMARY_URL]: summary() });

    renderApp("/");

    const draft = (await screen.findByText(/№421/)).closest("a")!;
    expect(draft).toHaveAttribute("href", "/invoices/21");
    expect(draft).toHaveTextContent("ждёт главврача");
    expect(draft).not.toHaveTextContent("₸");

    expect(screen.getByText(/№418/).closest("a")).toHaveTextContent(/12\s000\s₸/);
    // partial: показывается остаток (10 000 − 1 500 = 8 500 ₸), а не сумма счёта
    const partial = screen.getByText(/№419/).closest("a")!;
    expect(partial).toHaveTextContent(/8\s500\s₸/);
  });

  it("не больше 3 строк, остальное — ссылкой на вкладку «Счета»", async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: 100 + i, number: `2026-0005${i}0`, patientId: 1, patientName: `Пациент ${i}`,
      total: 100_000, paidAmount: 0, status: "unpaid" as const, awaitingApproval: false,
    }));
    mockBackend(reception, {
      [SUMMARY_URL]: summary({
        invoices: { unpaidCount: 12, awaitingApprovalCount: 0, awaitingPayment: many },
      }),
    });

    renderApp("/");

    await screen.findByText(/Пациент 0/);
    expect(screen.queryByText(/Пациент 3/)).toBeNull();
    expect(screen.getByRole("link", { name: /и ещё 9/ })).toHaveAttribute("href", "/cash-register/invoices");
  });

  it("пустые состояния: врачи не принимают, все счета оплачены", async () => {
    mockBackend(reception, {
      [SUMMARY_URL]: summary({
        doctors: [],
        invoices: { unpaidCount: 0, awaitingApprovalCount: 0, awaitingPayment: [] },
      }),
    });

    renderApp("/");

    expect(await screen.findByText("Врачи сегодня не принимают")).toBeInTheDocument();
    expect(screen.getByText("Все счета оплачены")).toBeInTheDocument();
  });

  it("сводка недоступна (403): страница жива, блоки показывают своё состояние, поиск работает", async () => {
    mockBackend(reception, { [SUMMARY_URL]: () => json(403, { detail: "Недостаточно прав" }) });

    renderApp("/");

    // «Врачи сейчас», «Ждут оплаты» и «Вышли от врача» (его запрос тоже не замокан)
    await vi.waitFor(() => expect(screen.getAllByText(/Не удалось загрузить/)).toHaveLength(3));
    expect(screen.getByRole("heading", { name: "Стойка регистратуры" })).toBeInTheDocument();
    expect(screen.getByLabelText("ИИН или фамилия пациента")).toBeEnabled();
    expect(valueOf("Ждут приёма")).toBe("—");
  });
});

describe("«Кто у стойки»", () => {
  const patient = makePatient({ id: "5", fullName: "Абдрахманов Мурат Серикович", iin: "870514300123", ageLabel: "39 лет" });
  const year = new Date().getFullYear();
  const history = [
    { id: "9", patientId: "5", date: `01.12.${year + 1}`, queueNumber: 1, doctor: "Будущая Б.Б.", status: "scheduled", complaint: "", diagnosis: null },
    { id: "8", patientId: "5", date: `12.03.${year}`, queueNumber: 2, doctor: "Серикова А.И.", status: "completed", complaint: "", diagnosis: null },
  ];

  function backend(extra: Record<string, unknown> = {}) {
    mockBackend(reception, { [SUMMARY_URL]: summary(), "/api/patients/5/history": history, ...extra });
  }

  it("поле в фокусе при открытии", async () => {
    backend();

    renderApp("/");

    expect(await screen.findByLabelText("ИИН или фамилия пациента")).toHaveFocus();
  });

  it("12 цифр — точный поиск по ИИН; найден: карточка, последний ЗАВЕРШЁННЫЙ визит, кнопки", async () => {
    backend({ "/api/patients?*": { items: [patient], total: 1, page: 1, limit: 5 } });
    const user = userEvent.setup();

    renderApp("/");
    await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "870514300123{Enter}");

    expect(await screen.findByText("Абдрахманов Мурат Серикович")).toBeInTheDocument();
    expect(requested().some((url) => url.includes("search=870514300123") && url.includes("limit=5"))).toBe(true);
    // будущий приём не считается визитом; врач без склонения
    expect(await screen.findByText(/39 лет · был 12 марта · Серикова А\.И\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Карточка" })).toHaveAttribute("href", "/patients/5");
    expect(screen.getByRole("button", { name: "Записать" })).toBeInTheDocument();
    expect(screen.getByText("АМ")).toBeInTheDocument();
  });

  it("если по ИИН вернулся не тот пациент — это «не найден»", async () => {
    backend({
      "/api/patients?*": { items: [makePatient({ id: "6", iin: "870514300999" })], total: 1, page: 1, limit: 5 },
    });
    const user = userEvent.setup();

    renderApp("/");
    await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "870514300123{Enter}");

    expect(await screen.findByText("Пациент не найден")).toBeInTheDocument();
  });

  it("не найден: пунктирный блок и кнопка «Завести карточку»", async () => {
    backend({ "/api/patients?*": { items: [], total: 0, page: 1, limit: 5 } });
    const user = userEvent.setup();

    renderApp("/");
    await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "Несуществующий{Enter}");

    const notFound = (await screen.findByText("Пациент не найден")).closest("div")!.parentElement!;
    expect(notFound).toHaveClass("border-dashed");
    expect(within(notFound).getByText("Завести карточку и сразу записать")).toBeInTheDocument();
    expect(within(notFound).getByRole("button", { name: /Завести карточку/ })).toBeInTheDocument();
  });

  it("поиск по фамилии: несколько совпадений — список, выбор подставляет пациента", async () => {
    const other = makePatient({ id: "7", fullName: "Абдрахманова Мадина Ермековна", iin: "900101400111" });
    backend({
      "/api/patients?*": { items: [patient, other], total: 2, page: 1, limit: 5 },
      "/api/patients/7/history": [],
    });
    const user = userEvent.setup();

    renderApp("/");
    await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "Абдрахманов{Enter}");

    await user.click(await screen.findByRole("button", { name: /Абдрахманова Мадина Ермековна/ }));

    expect(await screen.findByText(/визитов не было/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Карточка" })).toHaveAttribute("href", "/patients/7");
  });

  it("слишком короткий запрос не уходит на сервер", async () => {
    backend();
    const user = userEvent.setup();

    renderApp("/");
    await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "а{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(/хотя бы 2 буквы/);
    expect(requested().some((url) => url.startsWith("/api/patients"))).toBe(false);
  });

  it("ошибка поиска не роняет страницу", async () => {
    backend({ "/api/patients?*": () => json(403, { detail: "Недостаточно прав" }) });
    const user = userEvent.setup();

    renderApp("/");
    await user.type(await screen.findByLabelText("ИИН или фамилия пациента"), "Иванов{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Недостаточно прав");
    expect(screen.getByRole("heading", { name: "Стойка регистратуры" })).toBeInTheDocument();
  });

  it("Escape очищает поле и возвращает в него фокус", async () => {
    backend({ "/api/patients?*": { items: [patient], total: 1, page: 1, limit: 5 } });
    const user = userEvent.setup();

    renderApp("/");
    const input = await screen.findByLabelText("ИИН или фамилия пациента");
    await user.type(input, "870514300123{Enter}");
    await screen.findByText("Абдрахманов Мурат Серикович");
    await user.click(screen.getByRole("link", { name: "Карточка" }).closest("div")!); // уводим фокус
    await user.click(input);
    await user.keyboard("{Escape}");

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.queryByText("Абдрахманов Мурат Серикович")).toBeNull();
  });
});

describe("меню регистратуры", () => {
  it("секции, переименованные пункты, без «Возвраты»", async () => {
    mockBackend(reception, { [SUMMARY_URL]: summary() });

    renderApp("/");

    const nav = within(await screen.findByRole("navigation"));
    for (const title of ["Приём пациентов", "Деньги", "Прочее"]) {
      expect(nav.getByText(title)).toBeInTheDocument();
    }
    for (const name of ["Стойка", "Приёмы", "Пациенты", "Касса", "Прейскурант", "Профиль"]) {
      expect(nav.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(nav.queryByRole("link", { name: "Возвраты" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Услуги" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Дашборд" })).toBeNull();
    // заголовок секции — не ссылка
    expect(nav.getByText("Деньги").closest("a")).toBeNull();
  });

  it("у главврача нет отдельных пунктов «Возвраты» и «Отчёт за день» — они в кассе", async () => {
    mockBackend(makeEmployee("head_doctor"), {
      "/api/appointments/current": null,
      "/api/appointments/today": [],
      "/api/appointments/stats/week": { period: "", total: 0, completed: 0, cancelled: 0, newPatients: 0, dispensary: 0, avgMinutes: 0 },
      "/api/employees/me/profile": { office: "Каб. 1" },
    });

    renderApp("/");

    const nav = within(await screen.findByRole("navigation"));
    expect(await nav.findByRole("link", { name: "Касса" })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: "Услуги" })).toBeInTheDocument();
    expect(nav.queryByRole("link", { name: "Возвраты" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Отчёт за день" })).toBeNull();
  });

  it("страница прейскуранта у регистратора так и называется", async () => {
    mockBackend(reception, { "/api/services": [] });

    renderApp("/services");

    expect(await screen.findByRole("heading", { name: "Прейскурант" })).toBeInTheDocument();
  });
});
