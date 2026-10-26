import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { todayIso } from "@/lib/dates";
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
const doctor = makeEmployee("doctor");

const page = (items = [makePatient()]) => ({
  items,
  total: items.length,
  page: 1,
  limit: 8,
});

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

describe("список пациентов", () => {
  it("читает страницу и поиск из URL", async () => {
    mockBackend(reception, {
      "/api/patients?*": page(),
    });

    renderApp("/patients?page=2&search=Иван");

    expect(await screen.findByText("Иванов Иван Иванович")).toBeInTheDocument();
    const call = requested().find((url) => url.startsWith("/api/patients?"))!;
    const query = new URLSearchParams(call.split("?")[1]);
    expect(Object.fromEntries(query)).toMatchObject({
      page: "2",
      limit: "8",
      search: "Иван",
    });
  });

  it("ввод в поиск обновляет URL и не теряет поле ввода", async () => {
    mockBackend(reception, { "/api/patients?*": page() });
    const user = userEvent.setup();

    const { router } = renderApp("/patients");
    const input = await screen.findByPlaceholderText("Поиск по ФИО или ИИН");
    await user.type(input, "Пет");

    await vi.waitFor(() => {
      expect(router.state.location.search).toBe("?search=%D0%9F%D0%B5%D1%82");
    });
    // поле осталось в DOM и в фокусе (не было подменено лоадером)
    expect(screen.getByPlaceholderText("Поиск по ФИО или ИИН")).toHaveFocus();
    expect(screen.getByPlaceholderText("Поиск по ФИО или ИИН")).toHaveValue("Пет");
  });

  it("строка пациента: ФИО, ИИН 6+6, возраст с датой рождения, приём с подписью, до двух тегов и «+N»; вся строка — ссылка", async () => {
    const today = todayIso().split("-").reverse().join(".");
    const tags = ["ИБС", "Гастрит", "ХОБЛ"].map((label) => ({ label, variant: "green" as const }));
    mockBackend(doctor, {
      "/api/patients?*": {
        ...page([
          makePatient({ id: "1", fullName: "Будущий Б.Б.", iin: "700413383669", lastAppointment: "01.01.2099", diseases: tags }),
          makePatient({ id: "2", fullName: "Прошлый П.П.", lastAppointment: "01.01.2020" }),
          makePatient({ id: "3", fullName: "Сегодняшний С.С.", lastAppointment: today }),
          makePatient({ id: "4", fullName: "Без приёмов Б.П.", lastAppointment: null }),
        ]),
        total: 809,
      },
    });

    renderApp("/patients");

    const row = (await screen.findByText("Будущий Б.Б.")).closest("a")!;
    expect(row).toHaveAttribute("href", "/patients/1");
    expect(within(row).getByText("ИИН 700413 383669")).toBeInTheDocument();
    expect(within(row).getByText("36 лет")).toBeInTheDocument();
    expect(within(row).getByText("Запись")).toBeInTheDocument();
    expect(within(row).getByText("01.01.2099")).toBeInTheDocument();
    expect(within(row).getByText("ИБС")).toBeInTheDocument();
    expect(within(row).getByText("Гастрит")).toBeInTheDocument();
    expect(within(row).queryByText("ХОБЛ")).toBeNull();
    expect(within(row).getByText("+1")).toBeInTheDocument();
    expect(within(screen.getByText("Прошлый П.П.").closest("a")!).getByText("Был")).toBeInTheDocument();
    expect(within(screen.getByText("Сегодняшний С.С.").closest("a")!).getByText("Сегодня")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Открыть" })).toBeNull();
    expect(screen.getByText("809 пациентов в базе")).toBeInTheDocument();
  });

  it("вкладки фильтруют на сервере и живут в URL; «Мои пациенты» только у тех, кто принимает", async () => {
    mockBackend(doctor, { "/api/patients?*": page() });
    const user = userEvent.setup();

    const { router } = renderApp("/patients");
    await user.click(await screen.findByRole("tab", { name: "Диспансерные" }));

    await vi.waitFor(() => expect(router.state.location.search).toBe("?filter=dispensary"));
    await vi.waitFor(() => {
      expect(requested().some((url) => url.startsWith("/api/patients?") && url.includes("filter=dispensary"))).toBe(true);
    });
    expect(screen.getByRole("tab", { name: "Диспансерные" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Мои пациенты" })).toBeInTheDocument();
  });

  it("у регистратора нет вкладки «Мои пациенты»", async () => {
    mockBackend(reception, { "/api/patients?*": page() });

    renderApp("/patients");

    await screen.findByText("Иванов Иван Иванович");
    expect(screen.queryByRole("tab", { name: "Мои пациенты" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Новые" })).toBeInTheDocument();
  });

  it("пагинация с многоточием: 1 2 3 … последняя; смена страницы пишет ?page=", async () => {
    mockBackend(doctor, { "/api/patients?*": { ...page(), total: 809 } });
    const user = userEvent.setup();

    const { router } = renderApp("/patients");
    await screen.findByText("Иванов Иван Иванович");

    const pages = within(screen.getByRole("navigation", { name: "Страницы" }));
    expect(pages.getByRole("button", { name: "Страница 102" })).toBeInTheDocument();
    expect(pages.getByRole("button", { name: "Страница 3" })).toBeInTheDocument();
    expect(pages.queryByRole("button", { name: "Страница 4" })).toBeNull();
    expect(screen.getByText("Показано 1–8 из 809")).toBeInTheDocument();

    await user.click(pages.getByRole("button", { name: "Страница 2" }));
    await vi.waitFor(() => expect(router.state.location.search).toBe("?page=2"));
  });

  it("ничего не найдено — «Пациенты не найдены»", async () => {
    mockBackend(doctor, { "/api/patients?*": { items: [], total: 0, page: 1, limit: 8 } });

    renderApp("/patients");

    expect(await screen.findByText("Пациенты не найдены")).toBeInTheDocument();
  });

  it("admin (вне ANY_STAFF_ROLES) — «Нет доступа» без запроса списка", async () => {
    mockBackend(makeEmployee("admin"));

    renderApp("/patients");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
    expect(requested().some((url) => url.startsWith("/api/patients"))).toBe(false);
  });
});

describe("карточка пациента", () => {
  const profile = {
    "/api/patients/5": makePatient(),
    "/api/patients/5/history": [],
    "/api/patients/5/health-metrics": [],
    "/api/patients/5/vaccinations": [],
  };

  it("врач: грузятся показатели и прививки", async () => {
    mockBackend(doctor, profile);

    renderApp("/patients/5");

    expect((await screen.findAllByText("Иванов Иван Иванович")).length).toBeGreaterThan(0);
    expect(requested()).toContain("/api/patients/5/health-metrics");
    expect(requested()).toContain("/api/patients/5/vaccinations");
  });

  it("история болезни: время приёма видно только у начатых — фактическое «с–до»", async () => {
    mockBackend(reception, {
      ...profile,
      "/api/patients/5/history": [
        { id: "1", patientId: "5", date: "26.10.2026", queueNumber: 1, startedAt: "2026-10-26T12:05:00", completedAt: "2026-10-26T12:31:00", doctor: "Серикова А.И.", status: "completed", complaint: "Кашель", diagnosis: null },
        { id: "2", patientId: "5", date: "27.10.2026", queueNumber: 2, startedAt: null, completedAt: null, doctor: "Серикова А.И.", status: "scheduled", complaint: "Контроль", diagnosis: null },
      ],
    });
    const user = userEvent.setup();

    renderApp("/patients/5");
    await user.click(await screen.findByRole("button", { name: "История болезни" }));

    expect(await screen.findByText("12:05–12:31")).toBeInTheDocument();
    expect(screen.queryByText(/№2/)).toBeNull();
    expect(screen.getByText("Контроль")).toBeInTheDocument();
  });

  it("ресепшен: карточка открывается, но показатели не запрашиваются (иначе 403)", async () => {
    mockBackend(reception, profile);

    renderApp("/patients/5");

    expect((await screen.findAllByText("Иванов Иван Иванович")).length).toBeGreaterThan(0);
    expect(requested()).not.toContain("/api/patients/5/health-metrics");
    expect(requested()).not.toContain("/api/patients/5/vaccinations");
  });

  it("бухгалтер: карточка открывается, история болезни (403 на бэкенде) не запрашивается", async () => {
    mockBackend(makeEmployee("accountant"), { "/api/patients/5": makePatient() });

    renderApp("/patients/5");

    expect((await screen.findAllByText("Иванов Иван Иванович")).length).toBeGreaterThan(0);
    expect(requested()).not.toContain("/api/patients/5/history");
    expect(requested()).not.toContain("/api/patients/5/health-metrics");
  });

  it("несуществующий пациент (404) → «Пациент не найден»", async () => {
    mockBackend(reception, {
      "/api/patients/999": () => json(404, { detail: "Пациент не найден" }),
      "/api/patients/999/history": () => json(404, { detail: "Пациент не найден" }),
    });

    renderApp("/patients/999");

    expect(await screen.findByText("Пациент не найден.")).toBeInTheDocument();
  });
});

describe("осмотр", () => {
  it("нет активного приёма (404) → «не найден», а не белый экран", async () => {
    mockBackend(doctor, {
      "/api/patients/5": makePatient(),
      "/api/patients/5/visit-history": [],
      "/api/patients/5/examination": () =>
        json(404, { detail: "Активный приём не найден" }),
    });

    renderApp("/patients/5/examination");

    expect(
      await screen.findByText("Пациент или активный приём не найден."),
    ).toBeInTheDocument();
  });

  it("завершённый приём — экран «Приём завершён» с итогом и ссылкой в приёмы", async () => {
    mockBackend(doctor, {
      "/api/patients/5": makePatient(),
      "/api/patients/5/visit-history": [],
      "/api/patients/5/examination": {
        patientId: "5",
        appointmentId: "9",
        status: "completed",
        complaints: "Головная боль",
        objectiveStatus: "АД 120/80",
        diagnoses: [{ code: "I10", name: "Гипертензия" }],
        prescriptions: [{ id: "1", medication: "Лизиноприл", dosage: "10 мг", duration: "30 дней" }],
        completedAt: "2026-10-26T12:30:00",
      },
    });

    renderApp("/patients/5/examination");

    expect(await screen.findByText("Приём завершён")).toBeInTheDocument();
    expect(screen.getByText("Гипертензия", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Лизиноприл/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К приёмам" })).toHaveAttribute("href", "/appointments");
    expect(screen.queryByRole("button", { name: "Завершить приём" })).toBeNull();
  });
});
