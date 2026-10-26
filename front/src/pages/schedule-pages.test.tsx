import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { greeting } from "@/components/dashboard/doctor/DoctorDashboard";
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

beforeEach(setupHarness);
afterEach(() => vi.unstubAllGlobals());

const doctor = makeEmployee("doctor");
const reception = makeEmployee("reception", { id: 2 });

const doctorProfile = { ...doctor, office: "Каб. 12" };

const GREETING = /^(Доброе утро|Добрый день|Добрый вечер|Доброй ночи), /;

const weekStats = {
  period: "20–25 окт",
  total: 12,
  completed: 7,
  cancelled: 1,
  newPatients: 3,
  dispensary: 2,
  avgMinutes: 18,
};

/** Приёмы дня врача: №1 проведён, №2 записан (он же следующий), №3 записан, №4 отменён. */
const myDay = [
  makeAppointment({ id: "1", queueNumber: 1, status: "completed", patient: "Первый П.П.", employeeId: "1" }),
  makeAppointment({ id: "2", queueNumber: 2, status: "scheduled", patient: "Второй В.В.", complaint: "Кашель", employeeId: "1" }),
  makeAppointment({ id: "3", queueNumber: 3, status: "scheduled", patient: "Третий Т.Т.", employeeId: "1" }),
  makeAppointment({ id: "4", queueNumber: 4, status: "cancelled", patient: "Четвёртый Ч.Ч.", employeeId: "1" }),
];

/** Тот же день, но №2 уже на приёме. */
const dayWithCurrent = myDay.map((a) => (a.id === "2" ? { ...a, status: "in_progress" as const } : a));

const dashboardBackend = (extra: Record<string, unknown> = {}) => ({
  "/api/employees/me/profile": doctorProfile,
  "/api/appointments?from=*": myDay,
  "/api/appointments/stats/week": weekStats,
  ...extra,
});

/** Строка списка по имени пациента. */
const rowOf = (name: string) =>
  screen
    .getAllByText(name)
    .map((el) => el.closest("div[class*='cursor-pointer']"))
    .find(Boolean) as HTMLElement;

describe("приветствие по времени суток", () => {
  it("05–12 утро, 12–18 день, 18–23 вечер, 23–05 ночь", () => {
    expect(greeting(23)).toBe("Доброй ночи");
    expect(greeting(0)).toBe("Доброй ночи");
    expect(greeting(4)).toBe("Доброй ночи");
    expect(greeting(5)).toBe("Доброе утро");
    expect(greeting(11)).toBe("Доброе утро");
    expect(greeting(12)).toBe("Добрый день");
    expect(greeting(17)).toBe("Добрый день");
    expect(greeting(18)).toBe("Добрый вечер");
    expect(greeting(22)).toBe("Добрый вечер");
  });
});

describe("дашборд (вместе с бывшими «Приёмами»)", () => {
  it("врач: приветствие, кабинет, список по номерам с вкладками, «Следующий», «Неделя»; плиток с цифрами нет", async () => {
    mockBackend(doctor, dashboardBackend());

    renderApp("/");

    expect(await screen.findByText("Третий Т.Т.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: GREETING })).toHaveTextContent("Тест");
    expect(screen.getByText(/Каб\. 12/)).toBeInTheDocument();
    for (const gone of ["Приёмов сегодня", "Осталось принять", "Расписание на сегодня"]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
    // счётчики вкладок
    expect(screen.getByRole("tab", { name: /^Все/ })).toHaveTextContent("4");
    expect(screen.getByRole("tab", { name: /^Все/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Осталось/ })).toHaveTextContent("2");
    expect(screen.getByRole("tab", { name: /^Проведены/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /^Отменены/ })).toHaveTextContent("1");
    // порядок: активные по номеру, потом проведённые, отменённые в конце; вместо времени — №
    const numbers = screen.getAllByText(/^№\d$/).map((el) => el.textContent);
    expect(numbers.slice(0, 4)).toEqual(["№2", "№3", "№1", "№4"]);
    expect(within(rowOf("Второй В.В.")).getByText("Следующий")).toBeInTheDocument();
    expect(within(rowOf("Третий Т.Т.")).getByText("Записан")).toBeInTheDocument();
    expect(within(rowOf("Первый П.П.")).getByRole("link", { name: "Протокол" })).toBeInTheDocument();
    expect(screen.getByText("Четвёртый Ч.Ч.")).toHaveClass("line-through");
    expect(screen.getByText("Показано 4 из 4 приёмов · фильтр «Только мои»")).toBeInTheDocument();
    // колонка времени и старая колонка «Врач» не показываются
    expect(screen.queryByText("Время")).toBeNull();
    // правая колонка
    expect(screen.getByText(/Следующий · №2/)).toBeInTheDocument();
    expect(screen.queryByText(/Сейчас на приёме/)).toBeNull();
    const week = screen.getByRole("heading", { name: "Неделя" }).closest("section")!;
    expect(within(week).getByText("18 мин")).toBeInTheDocument();
    expect(within(week).getByText("Диспансерных на учёте")).toBeInTheDocument();
  });

  it("«Среднее время приёма» без данных — «—»", async () => {
    mockBackend(doctor, dashboardBackend({ "/api/appointments/stats/week": { ...weekStats, avgMinutes: 0 } }));

    renderApp("/");

    const week = (await screen.findByRole("heading", { name: "Неделя" })).closest("section")!;
    expect(within(week).getByText("—")).toBeInTheDocument();
    expect(within(week).queryByText(/мин/)).toBeNull();
  });

  it("вкладки переключают список; «Осталось» = на приёме + записан + следующий", async () => {
    mockBackend(doctor, dashboardBackend({ "/api/appointments?from=*": dayWithCurrent }));
    const user = userEvent.setup();

    renderApp("/");
    await screen.findByText("Первый П.П.");

    await user.click(screen.getByRole("tab", { name: /^Осталось/ }));
    expect(within(rowOf("Второй В.В.")).getByText("На приёме")).toBeInTheDocument();
    expect(within(rowOf("Третий Т.Т.")).getByText("Следующий")).toBeInTheDocument();
    expect(screen.queryByText("Первый П.П.")).toBeNull();

    await user.click(screen.getByRole("tab", { name: /^Отменены/ }));
    expect(screen.getByText("Четвёртый Ч.Ч.")).toBeInTheDocument();
    // в списке записанного уже нет (в карточке «Следующий» справа он остаётся)
    expect(screen.queryAllByText("Третий Т.Т.").some((el) => el.closest("div[class*='cursor-pointer']"))).toBe(false);
    expect(screen.getByText("Показано 1 из 4 приёмов · фильтр «Только мои»")).toBeInTheDocument();
  });

  it("есть пациент «На приёме»: карточка «Сейчас на приёме», «Осмотр» в строке, «Начать» и «Начать приём» неактивны", async () => {
    mockBackend(doctor, dashboardBackend({ "/api/appointments?from=*": dayWithCurrent }));

    renderApp("/");

    const current = await screen.findByRole("region", { name: "Сейчас на приёме" });
    expect(within(current).getByText("Второй В.В.")).toBeInTheDocument();
    expect(within(current).getByText(/Сейчас на приёме · №2/)).toBeInTheDocument();
    expect(within(current).getByRole("link", { name: "Открыть осмотр" })).toHaveAttribute("href", "/patients/5/examination");
    expect(within(rowOf("Второй В.В.")).getByText("На приёме")).toBeInTheDocument();
    expect(within(rowOf("Второй В.В.")).getByRole("link", { name: "Осмотр" })).toBeInTheDocument();
    // следующий теперь №3
    const next = screen.getByRole("region", { name: "Следующий пациент" });
    expect(within(next).getByText(/Следующий · №3/)).toBeInTheDocument();
    const startButtons = [
      within(next).getByRole("button", { name: "Начать приём" }),
      within(rowOf("Третий Т.Т.")).getByRole("button", { name: "Начать" }),
    ];
    for (const button of startButtons) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "Сначала завершите текущий приём");
    }
  });

  it("«Начать приём» меняет статус и открывает осмотр", async () => {
    let patched = false;
    mockBackend(doctor, dashboardBackend({
      "PATCH /api/appointments/2": () => {
        patched = true;
        return json(200, {});
      },
      "/api/patients/5": makePatient(),
      "/api/patients/5/visit-history": [],
      "/api/patients/5/examination": () => json(404, { detail: "Активный приём не найден" }),
    }));
    const user = userEvent.setup();

    renderApp("/");
    await user.click(await screen.findByRole("button", { name: "Начать приём" }));

    expect(await screen.findByText("Пациент или активный приём не найден.")).toBeInTheDocument();
    expect(patched).toBe(true);
  });

  it("«Начать» в строке и меню «⋯» (перенести, отменить); у отменённого меню недоступно", async () => {
    mockBackend(doctor, dashboardBackend());
    const user = userEvent.setup();

    renderApp("/");
    await screen.findByText("Третий Т.Т.");

    expect(within(rowOf("Третий Т.Т.")).getByRole("button", { name: "Начать" })).toBeEnabled();
    await user.click(within(rowOf("Третий Т.Т.")).getByRole("button", { name: /Ещё: перенести или отменить/ }));
    expect(await screen.findByRole("menuitem", { name: "Перенести" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Отменить" })).toBeEnabled();
    expect(screen.queryByRole("menuitem", { name: "Вызвать вне очереди" })).toBeNull();

    // отменённый: только «⋯», без «Начать», пункты меню недоступны
    const cancelledRow = rowOf("Четвёртый Ч.Ч.");
    expect(within(cancelledRow).queryByRole("button", { name: "Начать" })).toBeNull();
    await user.click(within(cancelledRow).getByRole("button", { name: /Ещё: перенести или отменить/ }));
    const menus = await screen.findAllByRole("menuitem", { name: "Перенести" });
    expect(menus.some((item) => (item as HTMLButtonElement).disabled)).toBe(true);
  });

  it("другая дата (?date=): список за эту дату, без «Следующий», «Сейчас на приёме» и «Начать»", async () => {
    mockBackend(doctor, dashboardBackend({ "/api/appointments?from=*": dayWithCurrent }));

    renderApp("/?date=2026-10-20");

    await screen.findByText("Третий Т.Т.");
    expect(screen.getByText("20.10.2026")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("from=2026-10-20&to=2026-10-20"))).toBe(true);
    expect(screen.queryByRole("region", { name: "Сейчас на приёме" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Следующий пациент" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Начать" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Начать приём" })).toBeNull();
    // у проведённого остаётся «Протокол», а у записанного — меню «⋯»
    expect(within(rowOf("Первый П.П.")).getByRole("link", { name: "Протокол" })).toBeInTheDocument();
    expect(within(rowOf("Третий Т.Т.")).getByRole("button", { name: /Ещё: перенести или отменить/ })).toBeInTheDocument();
  });

  it("стрелки даты листают дни и пишут ?date= в адрес", async () => {
    mockBackend(doctor, dashboardBackend());
    const user = userEvent.setup();

    const { router } = renderApp("/");
    await user.click(await screen.findByRole("button", { name: "Следующий день" }));

    await vi.waitFor(() => expect(router.state.location.search).toMatch(/^\?date=\d{4}-\d{2}-\d{2}$/));
    expect(screen.queryByRole("region", { name: "Следующий пациент" })).toBeNull();
  });

  it("пустой день: «На этот день приёмов нет» и ссылка «Записать пациента», карточек справа нет", async () => {
    mockBackend(doctor, dashboardBackend({ "/api/appointments?from=*": [] }));

    renderApp("/");

    expect(await screen.findByText("На этот день приёмов нет")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Записать пациента" })).toHaveLength(2);
    expect(screen.queryByRole("region", { name: "Следующий пациент" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Сейчас на приёме" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Неделя" })).toBeInTheDocument();
  });

  it("главврачу в списке — только его приёмы, остальных врачей нет", async () => {
    mockBackend(makeEmployee("head_doctor"), dashboardBackend({
      "/api/appointments?from=*": [
        ...myDay,
        makeAppointment({ id: "9", queueNumber: 1, employeeId: "2", patient: "Чужой Ч.Ч." }),
      ],
    }));

    renderApp("/");

    await screen.findByText("Третий Т.Т.");
    expect(screen.queryByText("Чужой Ч.Ч.")).toBeNull();
    expect(screen.getByRole("tab", { name: /^Все/ })).toHaveTextContent("4");
  });

  it("медсестра: очередь клиники без кнопок записи и начала приёма, без «Только мои»", async () => {
    mockBackend(makeEmployee("nurse"), {
      "/api/appointments?from=*": myDay,
    });

    renderApp("/");

    expect(await screen.findByText("Третий Т.Т.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Начать приём" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Начать" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Записать пациента" })).toBeNull();
    expect(screen.queryByText(/Только мои/)).toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => String(url)).some((u) => u.includes("role=doctor"))).toBe(false);
  });

  it("календарь: вместо списка недельный календарь, справа только «Неделя»; «Сегодня» возвращает список", async () => {
    mockBackend(doctor, dashboardBackend());
    const user = userEvent.setup();

    renderApp("/");
    await screen.findByText("Третий Т.Т.");
    await user.click(screen.getByRole("button", { name: "Календарь" }));

    expect(await screen.findByRole("button", { name: "Следующая неделя" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Следующий пациент" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Неделя" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Сегодня" }));
    expect(await screen.findByRole("tab", { name: /^Все/ })).toBeInTheDocument();
  });

  it("календарь запрашивает неделю, заданную в ?week=", async () => {
    mockBackend(doctor, dashboardBackend({ "/api/appointments?from=*": [] }));
    const user = userEvent.setup();

    const { router } = renderApp("/?week=2");
    await user.click(await screen.findByRole("button", { name: "Календарь" }));

    await vi.waitFor(() => {
      const ranges = fetchMock.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.startsWith("/api/appointments?from="));
      // список за день (одна дата) + календарь за неделю (разные from/to)
      expect(ranges.some((url) => {
        const q = new URLSearchParams(url.split("?")[1]);
        return q.get("from") !== q.get("to");
      })).toBe(true);
    });
    expect(router.state.location.search).toBe("?week=2");
  });

  it("ошибка бэкенда — сообщение и «Повторить», а не белый экран", async () => {
    mockBackend(doctor, dashboardBackend({
      "/api/appointments?from=*": () => json(500, { detail: "БД недоступна" }),
    }));

    renderApp("/");

    expect(await screen.findByText("БД недоступна")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
  });

  it("ресепшен видит «Стойку», а не врачебные виджеты", async () => {
    mockBackend(reception, {
      "/api/reports/reception-summary": {
        date: "2026-10-25",
        shift: null,
        queue: { waiting: 0, inProgress: 0 },
        doctors: [],
        invoices: { unpaidCount: 0, awaitingApprovalCount: 0, awaitingPayment: [] },
      },
    });

    renderApp("/");

    expect(await screen.findByText("Стойка регистратуры")).toBeInTheDocument();
    for (const gone of ["Следующий пациент", "Неделя", "Быстрый поиск пациента"]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
    expect(screen.queryByText(GREETING)).toBeNull();
    const requested = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requested).toContain("/api/reports/reception-summary");
    expect(requested).not.toContain("/api/appointments/stats/week");
    expect(requested.some((url) => url.includes("profile"))).toBe(false);
  });

  it("бухгалтеру — заглушка без запросов расписания", async () => {
    mockBackend(makeEmployee("accountant"));

    renderApp("/");

    expect(
      await screen.findByText(/Рабочее пространство для вашей роли/),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "/api/employees/me",
    ]);
  });
});

describe("/appointments", () => {
  it("врач, главврач, медсестра: перенаправление на «/» с сохранением параметров (дата)", async () => {
    for (const role of ["doctor", "head_doctor", "nurse"] as const) {
      mockBackend(makeEmployee(role), dashboardBackend());

      const { router, unmount } = renderApp("/appointments?date=2026-10-20");

      await vi.waitFor(() => expect(router.state.location.pathname).toBe("/"));
      expect(router.state.location.search).toBe("?date=2026-10-20");
      unmount();
    }
  });

  it("/queue перенаправляет на «/appointments», а дальше на дашборд; пунктов «Приёмы» и «Живая очередь» в меню врача нет", async () => {
    mockBackend(doctor, dashboardBackend());

    const { router } = renderApp("/queue");

    await screen.findByText("Третий Т.Т.");
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByRole("link", { name: "Живая очередь" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Приёмы" })).toBeNull();
    expect(screen.getByRole("link", { name: "Пациенты" })).toBeInTheDocument();
  });

  it("регистратура: отдельная страница приёмов всех врачей с колонкой «Врач», без «Начать»", async () => {
    mockBackend(reception, {
      "/api/appointments?from=*": myDay,
    });

    const { router } = renderApp("/appointments");

    expect(await screen.findByText("Третий Т.Т.")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/appointments");
    expect(screen.getByText("Врач", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Начать" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Следующий пациент" })).toBeNull();
  });

  it("роль без доступа к расписанию (бухгалтер) получает «Нет доступа»", async () => {
    mockBackend(makeEmployee("accountant"));

    renderApp("/appointments");

    expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
  });
});
